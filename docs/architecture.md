# 技术架构设计

> 版本：v1.0 | 日期：2026-05-16

## 1. 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                   Chrome Extension                       │
│                                                         │
│  ┌──────────────┐    ┌───────────────────────────────┐  │
│  │ Options Page │    │       Content Script          │  │
│  │  (React SPA) │    │   (learn.deeplearning.ai)     │  │
│  │              │    │                               │  │
│  │ • Base URL   │    │  ┌─────────────────────────┐  │  │
│  │ • API Key    │    │  │   SubtitleObserver       │  │  │
│  │ • Model      │    │  │   MutationObserver on    │  │  │
│  │ • Font size  │    │  │   .vds-captions          │  │  │
│  │ • Position   │    │  └──────────┬──────────────┘  │  │
│  └──────┬───────┘    │             │ subtitle text    │  │
│         │            │  ┌──────────▼──────────────┐  │  │
│  chrome.storage.sync │  │   TranslationCache       │  │  │
│         │            │  │   Map<cueId, translation> │  │  │
│         │            │  └──────────┬──────────────┘  │  │
│         │            │             │ cache miss        │  │
│         │            │  ┌──────────▼──────────────┐  │  │
│         │            │  │   MessageBus             │  │  │
│         │            │  │   sendMessage('translate')│  │  │
│         │            │  └──────────┬──────────────┘  │  │
│         │            │             │                  │  │
│         │            │  ┌──────────▼──────────────┐  │  │
│         │            │  │   TranslationOverlay     │  │  │
│         │            │  │   注入译文 DOM 节点       │  │  │
│         │            │  └─────────────────────────┘  │  │
│         │            │                               │  │
│         │            │  ┌─────────────────────────┐  │  │
│         │            │  │   ControlPanel           │  │  │
│         │            │  │   播放器内嵌悬浮面板      │  │  │
│         │            │  └─────────────────────────┘  │  │
│         │            └───────────────────────────────┘  │
│         │                          │                     │
│         │            ┌─────────────▼─────────────────┐  │
│         └───────────►│       Service Worker           │  │
│                      │                               │  │
│                      │  • 接收 translate 消息         │  │
│                      │  • 读取 chrome.storage.sync    │  │
│                      │  • 调用 OpenAI 兼容 API        │  │
│                      │  • 返回翻译结果                │  │
│                      └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  OpenAI-compatible  │
                    │  Translation API    │
                    │  (用户自有 BYOK)    │
                    └─────────────────────┘
```

## 2. 文件结构

```
dl-subtitles/
├── manifest.json                    # MV3 配置
├── src/
│   ├── background/
│   │   └── service-worker.js        # Service Worker：处理翻译 API 请求
│   │
│   ├── content/
│   │   ├── index.js                 # Content Script 入口，负责初始化和生命周期
│   │   ├── subtitle-observer.js     # MutationObserver 监听 .vds-captions 变化
│   │   ├── translation-overlay.js   # 译文 DOM 注入与更新
│   │   ├── control-panel.js         # 播放器内嵌控制面板（图标 + 悬浮设置）
│   │   └── translation-cache.js     # 内存缓存 Map<cueId+text, translation>
│   │
│   ├── options/
│   │   ├── index.html               # Options 页面入口
│   │   ├── options.js               # Options 页面逻辑
│   │   └── options.css              # Options 样式
│   │
│   └── shared/
│       ├── constants.js             # 全局常量（选择器、默认配置等）
│       ├── storage.js               # chrome.storage.sync 读写封装
│       └── messages.js              # Content Script <-> Service Worker 消息协议
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── tests/
│   ├── unit/                        # Jest 单元测试
│   │   ├── subtitle-observer.test.js
│   │   ├── translation-cache.test.js
│   │   ├── translation-overlay.test.js
│   │   └── storage.test.js
│   └── e2e/                         # Playwright e2e 测试
│       ├── subtitle-display.spec.js
│       └── options-page.spec.js
│
├── docs/                            # 项目文档（PRD、调研报告等）
│   ├── PRD.md
│   ├── research-report.md
│   ├── architecture.md
│   └── dev-plan.md
│
├── jest.config.js
├── playwright.config.js
├── package.json
└── README.md
```

## 3. manifest.json 设计

```json
{
  "manifest_version": 3,
  "name": "DL Subtitles - deeplearning.ai 字幕翻译",
  "version": "1.0.0",
  "description": "为 deeplearning.ai 视频添加中英双语字幕翻译",

  "permissions": [
    "storage",
    "scripting"
  ],

  "host_permissions": [
    "https://learn.deeplearning.ai/*"
  ],

  "background": {
    "service_worker": "src/background/service-worker.js"
  },

  "content_scripts": [
    {
      "matches": ["https://learn.deeplearning.ai/courses/*/lesson/*"],
      "js": ["src/content/index.js"],
      "run_at": "document_idle"
    }
  ],

  "options_ui": {
    "page": "src/options/index.html",
    "open_in_tab": true
  },

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## 4. 消息协议（Content Script ↔ Service Worker）

```javascript
// 翻译请求
{
  type: 'TRANSLATE',
  payload: {
    text: 'the popular ChatGPT Retrieval plugin',
    targetLang: 'zh-CN',    // 目标语言
    cueId: '11'             // 用于缓存 key
  }
}

// 翻译响应（成功）
{
  type: 'TRANSLATE_RESULT',
  payload: {
    translation: '流行的 ChatGPT 检索插件',
    cueId: '11'
  }
}

// 翻译响应（失败）
{
  type: 'TRANSLATE_ERROR',
  payload: {
    error: 'API key not configured',
    code: 'NO_API_KEY'  // NO_API_KEY | API_ERROR | TIMEOUT
  }
}
```

## 5. 存储结构（chrome.storage.sync）

```javascript
{
  // API 配置
  "apiConfig": {
    "baseUrl": "https://api.openai.com",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini"
  },

  // 显示偏好
  "displayConfig": {
    "enabled": true,            // 翻译总开关
    "fontSize": "medium",       // small | medium | large
    "position": "below",        // above | below
    "targetLang": "zh-CN"       // 目标语言
  }
}
```

## 6. 核心模块设计

### 6.1 SubtitleObserver

```
职责：监听 .vds-captions DOM 变化，提取字幕文本，触发翻译流程

关键逻辑：
1. 等待 .vds-captions 节点出现（页面初次加载时可能不存在）
2. 挂载 MutationObserver，监听 childList + subtree
3. 300ms 防抖：避免 Vidstack 多次 DOM 操作触发重复翻译
4. 提取 [data-part="cue"] 文本 + data-id
5. 检查缓存 → 命中则直接更新 Overlay → 未命中则发送翻译请求
```

### 6.2 TranslationOverlay

```
职责：在 .vds-captions 内注入并更新译文 DOM 节点

关键逻辑：
1. 初始化时创建 div.dlai-ext-translation 并插入 .vds-captions
2. 字幕消失时（.vds-captions 为空），隐藏译文节点
3. 译文位置：position=below 时在 cue-display 后；above 时在 cue-display 前
4. 字体大小通过 CSS 变量动态更新
```

### 6.3 ControlPanel

```
职责：在 Vidstack 控制栏注入图标，点击弹出设置面板

关键逻辑：
1. 等待 .vds-controls-group 出现后注入图标按钮
2. 点击图标：显示/隐藏悬浮设置面板
3. 面板内容：翻译开关、字体大小、译文位置、语言切换
4. 设置变更立即写入 chrome.storage.sync 并通知 Overlay 更新
```

### 6.4 Service Worker

```
职责：接收翻译请求，调用用户配置的 OpenAI 兼容 API

关键逻辑：
1. 监听 chrome.runtime.onMessage
2. 读取 apiConfig（baseUrl / apiKey / model）
3. 若未配置 apiKey，返回 NO_API_KEY 错误
4. 使用 system prompt 约束只返回译文，不添加解释
5. 超时 10s，失败静默处理
```

## 7. 翻译 Prompt 设计

```
System:
You are a professional subtitle translator. Translate the given English subtitle text to {targetLang}.
Rules:
- Output ONLY the translated text, nothing else
- Preserve line breaks if present
- Keep proper nouns (model names, library names) in English
- Be concise, suitable for subtitle display

User:
{subtitleText}
```

## 8. 防抖与缓存策略

```
缓存 Key:  cueId + text（防止同 id 但内容不同的边界情况）
缓存容量：最多 500 条（超出时清除最早的 100 条，LRU 简化版）
缓存生命周期：页面级（SPA 路由切换时清空，避免跨课程污染）
防抖时机：MutationObserver 回调后 300ms
```

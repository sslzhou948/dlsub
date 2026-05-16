# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目目的

**DL Subtitles** 是一个 Chrome 扩展（Manifest V3），为 `learn.deeplearning.ai` 的视频课程添加中英双语字幕翻译。

- **用户痛点**：deeplearning.ai 的视频只有英文字幕，中文用户理解困难
- **解决方案**：MutationObserver 实时监听字幕 DOM 变化，调用用户自有 API 翻译后叠加显示
- **商业模式**：BYOK（Bring Your Own Key）—— 用户自备 OpenAI 兼容 API，插件零运营成本
- **发布计划**：GitHub 开源 + Chrome Web Store 上架

---

## 新会话启动协议

**每次新会话，必须按此顺序操作：**

1. 阅读 `HANDOFF.md`，确认当前 Phase 和状态
2. 找到第一个 `⏳ 未开始` 的 Phase，打开 `docs/dev-plan.md` 查看该 Phase 的任务清单
3. 检出对应的开发分支（命名规范见下节）
4. 严格遵循 TDD 顺序：先写测试 → 测试失败确认 → 写实现 → 测试通过 → 提交
5. Phase 完成后更新 `HANDOFF.md` 状态，发起 PR

---

## 高质量开发方法论

### TDD 工作流（严格执行，不得跳过）

```
1. 写测试（测试应当失败）
   └─ npm test -- <module-name>  # 确认红灯

2. 写最小实现（让测试通过）
   └─ npm test -- <module-name>  # 确认绿灯

3. 提交这个模块（测试 + 实现一起提交）
```

**不允许**：先写实现再补测试。每个模块的测试用例在 `docs/dev-plan.md` 中已预先定义。

### 分支策略

```
main                    # 稳定分支，只接受 PR 合并，不直接提交
└─ phase/0-init         # 每个 Phase 一个分支
└─ phase/1-storage
└─ phase/2-messages
└─ phase/N-<name>       # 命名规则：phase/<编号>-<模块简称>
```

**分支操作：**
```bash
# 开始新 Phase 时
git checkout main && git pull
git checkout -b phase/N-<name>

# Phase 完成后，提交并发 PR
git push -u origin phase/N-<name>
gh pr create --title "Phase N: <模块名>" --body "..."
```

### PR 纪律

- 每个 Phase 对应一个 PR，不合并多个 Phase
- PR 描述需包含：实现的功能、测试覆盖点、验收标准
- PR 合并前确认：`npm test` 全部通过

### Commit Message 规范

```
feat: 实现 translation-cache LRU 缓存（Phase 3）
test: 添加 subtitle-observer 防抖测试用例
fix: 修复 SPA 路由切换时 observer 未清理的问题
chore: 配置 jest jsdom 环境
```

---

## 关键边界与规范

### v1.0 范围边界（不得擅自扩展）

| 不做 | 原因 |
|------|------|
| STT 语音转文字 | 留 v2.0 |
| 支持其他网站 | 仅 deeplearning.ai，权限最小化 |
| Popup 弹窗 | Options 页面 + 播放器内嵌面板，用户决策 |
| 用户账号 / 数据上报 | 零数据收集承诺 |

### MV3 合规红线

- **禁止 `eval`** 和任何动态代码执行
- **禁止远程加载脚本**（Remote Code Execution）
- 权限仅申请 `storage`、`scripting`
- host_permissions 仅 `https://learn.deeplearning.ai/*`
- **API 调用必须从 Service Worker 发出**（Content Script 受 CSP 限制无法跨域请求）

### CSS 命名规范

插件注入的所有 DOM 节点必须使用前缀 `dlai-ext-`，防止与 deeplearning.ai 原生样式冲突：

```
div.dlai-ext-translation      # 译文叠加层
div.dlai-ext-control-panel    # 悬浮控制面板
button.dlai-ext-toggle-btn    # 面板触发按钮
```

### 依赖规范

- **零运行时 npm 依赖**：插件本身不打包任何第三方库，减小包体积
- devDependencies 允许：Jest、Playwright、ESLint

### 缓存与防抖规范

| 参数 | 值 | 原因 |
|------|----|------|
| 防抖延迟 | 300ms | Vidstack 多次 DOM 操作，300ms 后字幕稳定 |
| 缓存上限 | 500 条 | 超出时清除最早 100 条（简化 LRU） |
| 缓存 Key | `cueId + text` | 防止同 id 但内容不同的边界情况 |
| 缓存生命周期 | 页面级 | SPA 路由切换时清空，防跨课程污染 |

---

## 开发命令

```bash
# 依赖安装
npm install

# 单元测试（全部）
npm test

# 单元测试（单个模块）
npm test -- storage
npm test -- translation-cache
npm test -- subtitle-observer

# 覆盖率报告
npm test -- --coverage

# E2E 测试
npx playwright test
npx playwright test tests/e2e/subtitle-display.spec.js

# Lint
npm run lint
```

在 Chrome 中加载扩展：`chrome://extensions/` → 开启开发者模式 → 加载已解压 → 选项目根目录

---

## 目录结构

```
/                                   # 项目根（当前仅文档，代码在 Phase 0 后创建）
├── CLAUDE.md                       # 本文件：Claude 会话指导
├── HANDOFF.md                      # ★ 当前开发状态（每次新会话必读）
├── README.md                       # 用户文档：本地加载、API 配置、发布 Checklist
├── manifest.json                   # MV3 配置（Phase 0 创建）
├── package.json                    # npm 配置（Phase 0 创建）
├── jest.config.js                  # Jest 配置（Phase 0 创建）
├── playwright.config.js            # Playwright 配置（Phase 0 创建）
├── .gitignore
│
├── src/
│   ├── background/
│   │   └── service-worker.js       # Phase 4：翻译 API 调用，唯一允许跨域请求的地方
│   ├── content/
│   │   ├── index.js                # Phase 8：模块串联，SPA 路由监听，生命周期管理
│   │   ├── subtitle-observer.js    # Phase 5：MutationObserver 监听 .vds-captions
│   │   ├── translation-overlay.js  # Phase 6：译文 DOM 注入与更新
│   │   ├── control-panel.js        # Phase 7：播放器内嵌控制面板
│   │   └── translation-cache.js    # Phase 3：内存 LRU 缓存
│   ├── options/
│   │   ├── index.html              # Phase 9：Options 页面
│   │   ├── options.js
│   │   └── options.css
│   └── shared/
│       ├── constants.js            # Phase 0：DOM 选择器、消息类型等常量
│       ├── storage.js              # Phase 1：chrome.storage.sync 读写封装
│       └── messages.js             # Phase 2：Content Script ↔ Service Worker 消息协议
│
├── icons/
│   ├── icon16.png                  # Phase 0 创建（占位图标）
│   ├── icon48.png
│   └── icon128.png
│
├── tests/
│   ├── unit/                       # Jest 单元测试（各 Phase 对应模块）
│   └── e2e/                        # Playwright E2E 测试（Phase 10）
│
└── docs/                           # 规划文档（只读，不修改）
    ├── PRD.md
    ├── research-report.md
    ├── architecture.md
    └── dev-plan.md
```

---

## 关键资料索引

| 文件 | 用途 | 何时读 |
|------|------|--------|
| `HANDOFF.md` | 当前 Phase 状态、关键决策记录、DOM 选择器速查 | **每次新会话必读** |
| `docs/dev-plan.md` | Phase 0-11 任务清单、预定义测试用例、验收标准 | 开始每个 Phase 前 |
| `docs/architecture.md` | 完整架构图、消息协议、存储结构、各模块 API 设计 | 实现新模块前 |
| `docs/research-report.md` | deeplearning.ai DOM 结构、Vidstack 行为分析、风险对策 | 遇到 DOM 相关问题时 |
| `docs/PRD.md` | v1.0 功能范围、异常处理规格、v2.0 规划 | 功能边界有疑问时 |

---

## 核心技术备忘

### 关键 DOM 选择器

```javascript
// Content Script 监听入口
'.vds-captions[data-part="captions"]'          // MutationObserver 挂载点

// 字幕文本提取
document.querySelector('.vds-captions [data-part="cue"]')
  ?.textContent?.trim().replace(/\n/g, ' ')

// 字幕 cueId（用于缓存 key）
document.querySelector('[data-part="cue"]')?.dataset.id

// 控制栏注入位置
'.vds-controls-group'

// Content Script URL 匹配规则
'https://learn.deeplearning.ai/courses/*/lesson/*'
```

### 消息协议（Content Script ↔ Service Worker）

```javascript
// 翻译请求
{ type: 'TRANSLATE', payload: { text, targetLang: 'zh-CN', cueId } }

// 成功响应
{ type: 'TRANSLATE_RESULT', payload: { translation, cueId } }

// 失败响应
{ type: 'TRANSLATE_ERROR', payload: { error, code } }
// code: 'NO_API_KEY' | 'API_ERROR' | 'TIMEOUT'
```

### Storage 结构（chrome.storage.sync）

```javascript
{
  apiConfig:     { baseUrl, apiKey, model },
  displayConfig: { enabled, fontSize, position, targetLang }
}
```

### 翻译 Prompt

```
System: You are a professional subtitle translator. Translate the given English
subtitle text to {targetLang}. Output ONLY the translated text. Keep proper nouns
(model names, library names) in English. Be concise for subtitle display.

User: {subtitleText}
```

# 技术调研报告：deeplearning.ai 视频播放器 DOM 分析

> 调研日期：2026-05-16 | 调研方式：Playwright 自动化 | 调研页面：ChatGPT Prompt Engineering for Developers

## 1. 页面技术栈

| 项目 | 结论 |
|------|------|
| 前端框架 | **Next.js + React** |
| 视频播放器 | **Vidstack Player**（CSS 类前缀 `vds-*`，属性 `data-media-provider`） |
| 视频格式 | **HLS 流**（`.m3u8`，CloudFront CDN） |
| 字幕格式 | **WebVTT via HLS**（VTT 通过 `.m3u8` playlist 分段加载） |
| 原生字幕语言 | English (en-US) · Japanese (ja-JP) · Korean (ko-KR) |

## 2. 完整 DOM 树结构

```
main
└── div.flex.flex-col.gap-y-5
    └── div.h-course-content.grid          ← 课程内容容器
        └── div.relative.has-panel-feature.video-controls-v2
            │
            ├── div.lesson-video-player  [aria-label="Video Player"]   ← 播放器容器
            │   │
            │   ├── div[data-media-provider]                           ← Vidstack 视频源
            │   │   └── <video> (src=blob:..., playsinline, aria-hidden)
            │   │       ├── <source src="https://dyckms5inbsqq.cloudfront.net/...master.m3u8"
            │   │       │          type="application/x-mpegurl">
            │   │       ├── <track id="hls-subtitles-0" srclang="en-US"
            │   │       │          kind="subtitles" label="English"
            │   │       │          src="...subtitle/en/.../..._en_vtt.m3u8">
            │   │       ├── <track id="hls-subtitles-1" srclang="ja-JP" ...>
            │   │       └── <track id="hls-subtitles-2" srclang="ko-KR" ...>
            │   │
            │   └── div.vds-video-layout.light                         ← Vidstack UI 层
            │       ├── div[data-media-announcer]  (无障碍播报)
            │       ├── div.vds-gestures            (手势区域)
            │       ├── div.vds-buffering-indicator (加载动画)
            │       ├── ★ div.vds-captions[data-part="captions"]      ← 字幕叠加层
            │       │     └── div[data-part="cue-display"]             ← 字幕位置容器
            │       │           └── div[data-part="cue"][data-id="N"] ← 当前字幕文本
            │       └── div.vds-controls
            │             ├── ...其他控件...
            │             └── button.vds-caption-button                ← CC 开关按钮
            │
            └── div#panel-portal.panel-open                            ← 转录面板挂载点
                └── div.card
                    ├── div.flex.justify-between  (面板头部)
                    │     ├── h3 "Transcript"
                    │     └── <select aria-label="Select transcript language">
                    │               <option value="en-US">English</option>
                    │               <option value="ja-JP">Japanese</option>
                    │               <option value="ko-KR">Korean</option>
                    │           </select>
                    └── div.flex-1.overflow-y-auto  (转录列表)
                          └── div.flex.p-2.gap-3.items-start  (每行)
                                ├── <button aria-label="Jump to 0:04">0:04</button>
                                └── <span class="rounded border ...">字幕文本</span>
```

## 3. 字幕节点关键信息

### 3.1 实时字幕 HTML（视频播放时）

```html
<!-- 字幕叠加容器：稳定存在于 DOM，无字幕时为空 -->
<div class="vds-captions"
     data-part="captions"
     aria-hidden="false"
     aria-live="off"
     aria-atomic="true"
     style="pointer-events: none;
            --overlay-width: 747px;
            --overlay-height: 271px;"
     data-dir="ltr"
     translate="yes">

  <!-- 字幕位置容器：由 Vidstack 动态创建/替换 -->
  <div data-part="cue-display"
       style="--cue-text-align: center;
              --cue-writing-mode: horizontal-tb;
              --cue-width: 100%;
              --cue-top: 83.53%;    ← 垂直位置（相对叠加层高度）
              --cue-left: 0%;
              --cue-right: 0%;
              --cue-bottom: 0.23%;">

    <!-- 字幕文本节点：data-id 为 VTT cue 序号 -->
    <div data-part="cue" data-id="11">
      the popular ChatGPT Retrieval
      plugin and a large
    </div>

  </div>
</div>
```

### 3.2 字幕更新机制

1. `<video>` 元素上挂载 `<track>` 节点，kind=`subtitles`
2. Vidstack 内部订阅 TextTrack 的 `cuechange` 事件
3. 新字幕激活时，Vidstack **替换** `.vds-captions` 内的 `div[data-part="cue-display"]` 子节点
4. `data-id` 为 VTT 文件中 cue 的顺序编号（可用于去重缓存）
5. 字幕消失时，`div[data-part="cue-display"]` 被移除，`.vds-captions` 变为空

### 3.3 MutationObserver 最佳监听方案

```javascript
// 监听目标：div.vds-captions（稳定存在，不被替换）
const captionsEl = document.querySelector('.vds-captions[data-part="captions"]');

let debounceTimer = null;

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const cueEl = captionsEl.querySelector('[data-part="cue"]');
    const text = cueEl?.textContent?.trim().replace(/\n/g, ' ');
    const cueId = cueEl?.dataset?.id;
    if (text && cueId) {
      handleNewSubtitle(text, cueId);  // 携带 id 用于缓存命中
    }
  }, 300);  // 300ms 防抖
});

observer.observe(captionsEl, { childList: true, subtree: true });
```

### 3.4 字幕文本提取

```javascript
// 获取当前显示字幕文本
const getCurrentSubtitle = () => {
  const cueEl = document.querySelector('.vds-captions [data-part="cue"]');
  return {
    text: cueEl?.textContent?.trim().replace(/\n/g, ' ') ?? '',
    id: cueEl?.dataset?.id ?? null
  };
};
```

## 4. 字幕文件 URL 规律

```
https://dyckms5inbsqq.cloudfront.net/
  {Org}/
  {CourseName}/
  {LessonId}/
  subtitle/{langCode}/{version}/{LessonId}_{langCode}_vtt.m3u8

示例：
  Org       = OpenAI
  CourseName= ChatGPT_Prompt_Engineering_for_Developer
  LessonId  = prompt_eng_01
  langCode  = en | jp | kr
  version   = 1776241534（时间戳）
```

> **注**：字幕为 HLS 分片 VTT，不建议直接请求 VTT 文件，从 DOM 实时读取更稳定。

## 5. 插件注入策略

### 推荐：在 `.vds-captions` 内追加译文节点

```html
<!-- 原生 Vidstack 字幕（不修改）-->
<div data-part="cue-display">
  <div data-part="cue">original english text</div>
</div>

<!-- 插件注入的译文节点 -->
<div class="dlai-ext-translation"
     style="text-align: center; color: #fff; font-size: 16px; ...">
  中文翻译文本
</div>
```

**优点**：
- 位置天然跟随字幕叠加层，无需额外定位计算
- 不修改 Vidstack 内部节点，不破坏播放器状态
- 字幕消失时，可同步隐藏译文节点

### 控制图标注入位置

```javascript
// 注入到 Vidstack 控制栏（CC 按钮旁）
const controls = document.querySelector('.vds-controls-group');
// 在 controls 末尾插入自定义图标按钮
```

## 6. 关键 CSS 选择器速查

| 用途 | 选择器 |
|------|--------|
| 播放器容器 | `[aria-label="Video Player"]` 或 `.lesson-video-player` |
| 字幕叠加层 | `.vds-captions[data-part="captions"]` |
| 当前字幕文本 | `.vds-captions [data-part="cue"]` |
| 字幕位置容器 | `.vds-captions [data-part="cue-display"]` |
| 视频元素 | `[aria-label="Video Player"] video` |
| 字幕轨道（英文） | `#hls-subtitles-0` |
| CC 按钮 | `.vds-caption-button` |
| 控制栏组 | `.vds-controls-group` |
| 转录面板 | `#panel-portal` |

## 7. 页面路由规律

```
URL 格式：
  https://learn.deeplearning.ai/courses/{courseSlug}/lesson/{lessonId}/{lessonName}

示例：
  https://learn.deeplearning.ai/courses/chatgpt-prompt-eng/lesson/dfbds/introduction

Content Script 匹配规则：
  "matches": ["https://learn.deeplearning.ai/courses/*/lesson/*"]
```

## 8. 潜在风险与对策

| 风险 | 对策 |
|------|------|
| Vidstack 版本升级，`vds-*` 选择器变更 | 多重降级：先 `[data-part="cue"]`，再 `.vds-captions > * > *` |
| 登录弹窗覆盖播放器 | Content Script 使用 MutationObserver 等待 `.vds-captions` 出现后再挂载 |
| CSP 限制 Content Script 发送跨域请求 | 翻译请求通过 `chrome.runtime.sendMessage` 转发到 Service Worker 发出 |
| 无字幕视频（`.vds-captions` 始终为空） | 监听超时（5s）后显示「未检测到字幕」提示 |
| HLS 字幕延迟加载导致 textTracks 为空 | 不依赖 textTracks API，直接监听 DOM 变化 |

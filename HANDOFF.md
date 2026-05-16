# HANDOFF — DL Subtitles 项目交接文档

> 最后更新：2026-05-16 | 当前阶段：Phase 7 ✅ 完成，Phase 8 待开始

---

## ★ 上次中断点

```
Phase:    Phase 8（下一阶段）
子任务:   8.1 写测试 tests/unit/content-index.test.js（SPA 路由切换逻辑）
分支:     phase/7-control-panel（当前），合并到 main 后创建 phase/8-content-index
状态:     Phase 7 全部完成，等待合并到 main
Git:      最新 commit：feat: Phase 7 完成 — control-panel.js（附测试）
```

> 下次会话：合并 phase/7-control-panel，git checkout -b phase/8-content-index，从 content-index.test.js 开始 TDD。

---

## 项目一句话描述

为 deeplearning.ai 视频添加中英双语字幕翻译的 Chrome 插件（MV3，BYOK 模式，开源上架）。

---

## 当前状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段一：用户访谈 + PRD | ✅ 完成 | PRD 已与用户确认 |
| 阶段二：技术调研 | ✅ 完成 | Playwright 调研 deeplearning.ai DOM，报告已输出 |
| 阶段三：开发规划 | ✅ 完成 | 架构设计 + 开发计划已确认 |
| 阶段四：TDD 开发 | ⏳ 进行中 | Phase 0-7 完成，Phase 8 待开始 |

---

## 关键决策记录

| 决策 | 结论 | 原因 |
|------|------|------|
| 翻译 API | BYOK，兼容 OpenAI 标准接口 | 用户自备密钥，插件零运营成本 |
| 字幕监听方式 | MutationObserver on `.vds-captions` | Vidstack 通过替换子节点更新字幕，不触发 textTrack events |
| 翻译请求发送方 | Service Worker | Content Script 受 CSP 限制，无法直接跨域请求 |
| 译文注入位置 | 在 `.vds-captions` 内追加兄弟节点 | 不破坏 Vidstack 内部状态，位置天然跟随字幕 |
| 防抖时间 | 300ms | Vidstack 可能多次 DOM 操作，300ms 后字幕稳定 |
| 缓存 Key | `cueId + text` | cueId 来自 VTT 文件序号，加 text 防边界情况 |
| Options 入口 | Chrome 扩展 Options 页面（非 Popup） | 用户明确选择 |
| STT | 不做，留 v2 | v1.0 范围裁剪 |

---

## 调研关键结论（开发必读）

```
播放器库：    Vidstack Player（CSS 前缀 vds-*）
页面框架：    Next.js + React（SPA，路由切换不刷页面）

字幕节点层级：
  div.vds-captions[data-part="captions"]          ← MutationObserver 挂载点
    └── div[data-part="cue-display"]              ← 字幕显示时动态创建/替换
          └── div[data-part="cue"][data-id="N"]  ← 字幕文本，换行用 \n

提取文本：
  document.querySelector('.vds-captions [data-part="cue"]')
    ?.textContent?.trim().replace(/\n/g, ' ')

播放器容器：  [aria-label="Video Player"]  或  .lesson-video-player
控制栏：      .vds-controls-group
CC 按钮：     .vds-caption-button
转录面板：    #panel-portal

Content Script 匹配规则：
  "https://learn.deeplearning.ai/courses/*/lesson/*"
```

---

## 文档索引

| 文件 | 用途 |
|------|------|
| `docs/PRD.md` | 产品需求，包含功能范围、异常处理、v1.0 裁剪列表 |
| `docs/research-report.md` | DOM 结构、字幕更新机制、选择器速查、风险对策 |
| `docs/architecture.md` | 文件结构、manifest 设计、消息协议、存储结构、各模块职责 |
| `docs/dev-plan.md` | Phase 0-11 开发顺序、每 Phase 的测试用例描述、命令速查 |
| `README.md` | 本地加载方式、API 配置说明、发布 Checklist |

---

## 开发任务进度

按 `docs/dev-plan.md` 执行，完成一个 Phase 后在此更新状态。

| Phase | 模块 | 状态 |
|-------|------|------|
| 0 | 项目初始化（npm, Jest, Playwright, manifest） | ✅ 完成 |
| 1 | `storage.js` | ✅ 完成 |
| 2 | `messages.js` | ✅ 完成 |
| 3 | `translation-cache.js` | ✅ 完成 |
| 4 | `service-worker.js` | ✅ 完成 |
| 5 | `subtitle-observer.js` | ✅ 完成 |
| 6 | `translation-overlay.js` | ✅ 完成 |
| 7 | `control-panel.js` | ✅ 完成 |
| 8 | `content/index.js`（模块串联） | ⏳ 未开始 |
| 9 | `options/` 页面 | ⏳ 未开始 |
| 10 | E2E 测试 | ⏳ 未开始 |
| 11 | 发布准备 | ⏳ 未开始 |

---

## 接手新会话的操作步骤

1. 阅读本文件，了解当前状态
2. 查看上表，找到第一个「⏳ 未开始」的 Phase
3. 打开 `docs/dev-plan.md`，找到对应 Phase 的任务清单
4. 严格遵循 **TDD 顺序**：先写测试，再写实现，测试通过后标记为完成
5. 完成 Phase 后，将本文件中的状态从 `⏳ 未开始` 改为 `✅ 完成`

---

## 用户偏好（访谈记录）

- 用户是目标用户本人，频繁使用 deeplearning.ai
- 目标：开源 + 上架 Chrome Web Store
- 不喜欢过度设计，v1.0 严格裁剪范围
- API 配置走 Options 页面，不用 Popup
- STT 是感兴趣的未来功能，但不在 v1.0

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目目的

**DL Subtitles**：Chrome 扩展（MV3），为 `learn.deeplearning.ai` 视频添加中英双语字幕翻译。  
BYOK 模式（用户自备 OpenAI 兼容 API），MutationObserver 实时监听字幕 DOM，Service Worker 发起翻译请求。

---

## 新会话启动协议

**每次新会话，必须按此顺序操作：**

1. 阅读 `HANDOFF.md` → 定位「上次中断点」，找到具体断在哪个 Phase / 子任务
2. 中断点在 Phase 中途 → `git checkout phase/N-name`，继续未完成子任务
3. 中断点是 Phase 完成待 PR → 发起 PR，再开下一个 Phase
4. 全新 Phase → `git checkout main && git checkout -b phase/N-name`，查看 `docs/dev-plan.md`
5. 严格遵循 TDD：先写测试 → 红灯确认 → 写实现 → 绿灯确认 → 提交

---

## Phase 结束协议

**每完成一个 Phase，必须按此清单操作，不得跳过：**

```
[ ] 1. npm test 全部绿灯（无跳过、无 skip）
[ ] 2. 更新 HANDOFF.md：Phase 状态改为 ✅，「上次中断点」更新为下一 Phase 首个子任务，更新日期
[ ] 3. git add + git commit（含 HANDOFF.md）
        commit message：feat: Phase N 完成 — <模块名>（附测试）
[ ] 4. git push -u origin phase/N-name
[ ] 5. gh pr create，PR 描述包含：实现了什么、测试覆盖哪些场景、验收标准是否满足
[ ] 6. 告知用户：Phase N 完成，PR 已发起，等待合并后继续 Phase N+1
```

**会话中途中断时：**

```
[ ] 1. 更新 HANDOFF.md「上次中断点」：Phase N / 任务 N.X / 状态（如：已写测试，待写实现）
[ ] 2. git add + git commit 当前进度（哪怕测试红灯）
        commit message：wip: Phase N.X <描述>（tests failing）
```

---

## 开发方法论

### TDD 工作流（严格执行，不得跳过）

```
1. 写测试 → npm test -- <module-name>   # 确认红灯
2. 写最小实现 → npm test -- <module-name>  # 确认绿灯
3. 提交（测试 + 实现一起提交）
```

**不允许**先写实现再补测试。测试用例在 `docs/dev-plan.md` 中已预先定义。

### 分支与 PR 规范

- 分支命名：`phase/<编号>-<模块简称>`，main 只接受 PR 合并，不直接提交
- 每个 Phase 对应一个 PR，不合并多个 Phase
- PR 合并前确认 `npm test` 全部通过

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
| Popup 弹窗 | Options 页面 + 播放器内嵌面板 |
| 用户账号 / 数据上报 | 零数据收集承诺 |

### MV3 合规红线

- **禁止 `eval`** 和任何动态代码执行；**禁止远程加载脚本**
- 权限仅申请 `storage`、`scripting`；host_permissions 仅 `https://learn.deeplearning.ai/*`
- **API 调用必须从 Service Worker 发出**（Content Script 受 CSP 限制无法跨域请求）

### CSS 命名规范

所有注入 DOM 节点必须使用前缀 `dlai-ext-`（防止与原生样式冲突）。

### 依赖规范

- **零运行时 npm 依赖**，devDependencies 仅允许：Jest、Playwright、ESLint

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
npm test                        # 全部单元测试
npm test -- <module-name>       # 单模块测试
npm test -- --coverage          # 覆盖率报告
npx playwright test             # E2E 测试
npm run lint
```

加载扩展：`chrome://extensions/` → 开发者模式 → 加载已解压 → 选项目根目录

---

## 关键资料索引

| 文件 | 用途 | 何时读 |
|------|------|--------|
| `HANDOFF.md` | 当前 Phase 状态、DOM 选择器、消息协议速查 | **每次新会话必读** |
| `REVIEW.md` | Code review 问题清单 | 每次 review 时 |
| `docs/dev-plan.md` | Phase 任务清单、预定义测试用例、验收标准 | 开始每个 Phase 前 |
| `docs/architecture.md` | 完整架构、消息协议、存储结构、模块 API | 实现新模块前 |
| `docs/research-report.md` | DOM 结构、Vidstack 行为分析、风险对策 | 遇到 DOM 问题时 |
| `docs/PRD.md` | v1.0 功能范围、异常处理规格 | 功能边界有疑问时 |

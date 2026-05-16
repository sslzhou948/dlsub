# Code Review 问题清单

> 记录各 Phase review 发现的问题，统一处理后打勾。

---

## Phase 1 — `storage.js`

- [x] **[已修复]** `setDisplayConfig` 全量覆盖而非 partial merge，Phase 7/9 单字段更新时会丢失其余字段
  - 修复：改为 read-then-merge 语义，补充 partial 更新测试
  - commit: `fix: 修复 code review 发现的两处问题`

---

## Phase 4 — `service-worker.js`

- [x] **[已修复]** `data.choices[0].message.content.trim()` 未防御 choices 为空，会抛 TypeError 而非有意义错误
  - 修复：改用可选链 + 空值判断，抛出明确 API_ERROR
  - commit: `fix: 修复 code review 发现的两处问题`

---

## Phase 5 — `subtitle-observer.js`

- [x] **[已修复]** 缺少测试用例：`start()` 时 `.vds-captions` 已存在且已有字幕内容，`_attachToCaptions` 立即触发路径（`subtitle-observer.js:60-62`）未被覆盖
  - 修复：`subtitle-observer.test.js` 新增 `describe('.vds-captions 已存在且已有字幕内容')`，实现本身无需修改

---

## Phase 6 — `translation-overlay.js`

✅ **无问题**。实现简洁，测试覆盖完整（初始化、setText、hide/show、setPosition、setFontSize）。

---

## Phase 7 — `control-panel.js`

- [x] **[已修复]** 面板初始 UI 与 storage 中的 displayConfig 不同步
  - 修复：`ControlPanel` 构造函数接受 `initialConfig` 参数；`_inject()` 去掉 HTML 硬编码的 checked/selected，改为程序化赋值；`content/index.js._startModules()` 中通过 `getDisplayConfig` 读取配置后传入
  - 补充测试：`control-panel.test.js` 新增 `describe('initialConfig')` 验证控件值反映传入配置

- [x] **[已修复]** 缺少测试：`destroy()` 移除 DOM 元素
  - 修复：在 `control-panel.test.js` 补充 `describe('destroy')` 测试用例

---

## Phase 8 — `content/index.js`

- [x] **[已修复]** `_onRouteChange()` 不销毁旧 ControlPanel，导致 DOM 泄漏
  - 修复：`_onRouteChange()` 中加入 `this._panel.destroy(); this._panel = null`
  - 补充测试：`content-index.test.js` 新增「路由切换时调用旧 ControlPanel 的 destroy()」

- [x] **[已修复]** `_onRouteChange()` 不移除旧 TranslationOverlay DOM 节点
  - 修复：为 `TranslationOverlay` 新增 `destroy()` 方法（调用 `this._el.remove()`）；`_onRouteChange()` 中加入 `this._overlay.destroy(); this._overlay = null`
  - 补充测试：`translation-overlay.test.js` 新增 `describe('destroy')`；`content-index.test.js` 新增「路由切换时调用旧 TranslationOverlay 的 destroy()」

- [x] **[已修复]** `_cleanup()` 方法从未被调用
  - 修复：在 `init()` 中挂载 `window.addEventListener('beforeunload', () => this._cleanup())`，页面卸载时自动清理 interval 和 observer

---

## Phase 9 — `options/`

✅ **无问题**。`isValidUrl` 校验正确，表单读写逻辑清晰，`apiKey` 允许空值为有意设计（用户可分次配置）。测试覆盖完整。

---

## Phase 10 — E2E 测试（发现的问题）

### 已修复（Phase 10 内完成）

- [x] **`dist/options.js` 缺失**：`package.json` 没有 `build:options` 脚本，导致 Options 页面在浏览器中加载时找不到 JS 文件（`<script src="../../dist/options.js">` 404）。
  - 修复：新增 `"build:options": "esbuild src/options/options.js --bundle --format=iife --outfile=dist/options.js"`，并将其加入 `"build"` 脚本。

- [x] **`dist/content.js` 为空 IIFE**：`build:content` 以 `src/content/index.js`（只导出 `App` 类，无副作用）为入口，导致打包产物为空的 `(() => {})();`，Content Script 加载后什么也不做。
  - 修复：新增 `src/content/main.js` 作为 esbuild 入口（内容：`new App().init()`），将 `build:content` 入口改为 `src/content/main.js`。

### 待处理（建议 Phase 11 前修复）

- [x] **[已修复]** Options 页面 URL 校验 UX 不一致
  - 根因：`<input type="url">` 浏览器原生校验拦截语法非法的 URL（`not-a-url`），阻止表单提交，JS 自定义错误从未执行；`ftp://` 这类"协议错误但语法合法"的 URL 才走 JS 路径，两条路径体验不一致。
  - 修复：`src/options/index.html` 将 `type="url"` 改为 `type="text"`，所有校验统一由 `isValidUrl()` 负责。
  - 补充 E2E 测试：新增 `not-a-url` 场景（现在通过 JS 校验路径）。

- [x] **[已修复]** 未配置 API Key 时无用户引导
  - 根因：`content/index.js` 在 `onSubtitle` 回调中检测到无 Key 后静默 `return`，用户看不到任何提示，不知道为何译文不出现。
  - 修复：
    1. `src/shared/constants.js` 新增 `NO_KEY_WARNING`、`NO_KEY_BADGE` 两个 CSS 类。
    2. `src/content/control-panel.js` 新增 `showNoKeyWarning(onAction)` 方法：面板顶部插入「⚠ 未配置 API Key — 前往设置」段落，切换按钮附加 `!` 徽标。
    3. `src/content/index.js` 在 `_startModules()` 创建面板后立即调用 `getApiConfig`，若 `apiKey` 为空则调用 `panel.showNoKeyWarning(() => chrome.runtime.openOptionsPage())`。
  - 补充单元测试：`control-panel.test.js` 新增 4 个 `showNoKeyWarning` 场景；`content-index.test.js` 新增 2 个 API Key 未配置场景。
  - 补充 E2E 测试：新增 3 个场景（警告文字、`!` 徽标、叠加层保持空白）。

---

## Phase 11 前置 — 阻塞"直接可用"的问题（需优先修复）

> 通过 curl 验证 API 管道、审查代码与研究报告后发现。这三个问题不影响测试，但影响真实用户场景下的功能完整性。

---

### 问题 A：SPA 导航盲区（严重）

**现象**：用户从 `learn.deeplearning.ai` 首页或课程列表页点击进入课时，扩展完全不工作；刷新页面后恢复正常。

**根因**：Chrome 的 content script 只在完整页面加载时注入（匹配 `matches` 规则）。deeplearning.ai 是 Next.js SPA，站内导航全部走 `pushState`，不触发页面重新加载，因此 content script 不会被重新注入。`_watchRoute()` 的 URL 轮询只能处理"content script 已注入后"的课时内切换，无法覆盖"从站外/首页首次进入课时"的场景。

**影响路径**：
```
用户首次打开 → 首页/课程列表 → 点击课时（pushState）→ 扩展无响应
用户直接输入/书签 → 课时 URL → 完整页面加载 → 扩展正常
```

**修复方案**：
- `manifest.json`：新增 `"tabs"` permission。
- `src/background/service-worker.js`：监听 `chrome.tabs.onUpdated`，当 URL 变为课时模式（`/courses/*/lesson/*`）时，调用 `chrome.scripting.executeScript` 主动注入 `dist/content.js`（及 CSS）。注入前检查是否已注入（避免重复），可通过注入一段探测脚本或维护已注入 tab 的 Set 来判断。

---

### 问题 B：CC 未开启时无提示（体验缺失）

**现象**：用户进入课时后等待译文，什么也看不到，不知道原因。

**根因**：deeplearning.ai 播放器默认不开启字幕（CC 按钮未激活），`.vds-captions` 节点存在但内部为空，MutationObserver 一直等待而不触发。用户必须手动点击播放器 CC 按钮开启英文字幕，扩展才能检测到字幕并翻译。当前实现对此完全无提示。

**修复方案**：
- 在 `SubtitleObserver` 或 `content/index.js` 中，检测 CC 按钮状态（`.vds-caption-button[aria-pressed="false"]` 或 `.vds-captions[aria-hidden="true"]`）。
- 若 CC 处于关闭状态，在 `TranslationOverlay` 或控制面板中显示一次性提示：「请先点击播放器 CC 按钮开启英文字幕」。
- 监听 CC 按钮点击事件，CC 开启后自动隐藏提示。

---

### 问题 C：`dist/` 未提交 + README 缺 build 步骤（分发问题）

**现象**：从 GitHub clone 后直接加载扩展，Chrome 报错"找不到 dist/content.js"，扩展无法启用。

**根因**：`.gitignore` 排除了 `dist/`，但 README 的安装步骤只有 `npm install`，没有 `npm run build`。本地已有 `dist/`（build 过），zip 打包时会包含，但 clone 后的用户没有。

**修复方案**（二选一）：
- **方案 1（推荐，适合非开发者用户）**：将 `dist/` 从 `.gitignore` 移除，提交构建产物。用户 clone 后可直接加载，无需安装 Node.js 环境。
- **方案 2（适合开发者项目）**：README 安装步骤中加入 `npm run build`，并考虑在 `package.json` 的 `prepare` 钩子中自动执行 build。

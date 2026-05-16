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

- [ ] **Options 页面 URL 校验 UX 不一致**（`options/index.html`）
  - 问题：`<input type="url">` 对语法完全错误的值（如 `not-a-url`）触发浏览器原生校验 UI，阻止表单提交，JS 自定义错误提示永远不显示；但对"协议错误"的 URL（如 `ftp://…`）则走 JS 自定义校验。两条路径错误体验不一致。
  - 建议修复：将 `id="baseUrl"` 的 input 改为 `type="text"`，完全依赖 JS 侧的 `isValidUrl()` 校验，删除浏览器原生校验的影响。

- [ ] **未配置 API Key 时无用户引导**（`content/index.js:56`）
  - 问题：`getApiConfig` 回调中，`if (!apiConfig.apiKey) return;` 静默跳过翻译，用户看不到任何提示，不知道为何译文不出现。开发计划 Phase 10 场景 4 要求出现「前往设置」引导提示，但当前未实现。
  - 建议修复：在 ControlPanel 中增加一个「未配置 API Key，请前往设置」提示区，或在 `onSubtitle` 回调中检测到无 Key 时触发面板提示。

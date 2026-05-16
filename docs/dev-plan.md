# 开发与测试计划

> 版本：v1.0 | 日期：2026-05-16 | 开发方式：TDD（Jest + Playwright）

## 开发原则

- **TDD**：每个模块先写测试，再写实现，测试通过后才进入下一模块
- **最小 PR 粒度**：每个功能模块对应一个 PR，禁止一次性提交所有代码
- **MV3 合规**：无 eval、无远程代码、权限最小化

---

## 阶段划分

### Phase 0：项目初始化（基础设施）

**任务清单：**

- [ ] 0.1 初始化 npm 项目，配置 `package.json`
- [ ] 0.2 配置 Jest（unit test，含 jsdom 环境）
- [ ] 0.3 配置 Playwright（e2e test）
- [ ] 0.4 创建 `manifest.json`（MV3，最小权限）
- [ ] 0.5 创建占位图标（16/48/128px）
- [ ] 0.6 创建 `src/shared/constants.js`（DOM 选择器、消息类型等常量）
- [ ] 0.7 配置 ESLint + Prettier

**验收标准：**
- `npm test` 可运行（即使无测试用例也不报错）
- 插件可在 Chrome 中以开发者模式加载，不报错

---

### Phase 1：存储模块（`storage.js`）

**TDD 顺序：**

1. 写测试：`tests/unit/storage.test.js`
   - 读取不存在的配置时返回默认值
   - 写入配置后可正确读回
   - `apiConfig` 和 `displayConfig` 分别独立读写

2. 写实现：`src/shared/storage.js`

**API 设计：**
```javascript
// 读取 API 配置
getApiConfig() → { baseUrl, apiKey, model }

// 写入 API 配置
setApiConfig({ baseUrl, apiKey, model }) → void

// 读取显示配置
getDisplayConfig() → { enabled, fontSize, position, targetLang }

// 写入显示配置
setDisplayConfig(partial) → void
```

**验收标准：** `npm test storage` 全部通过

---

### Phase 2：消息协议模块（`messages.js`）

**TDD 顺序：**

1. 写测试：验证消息结构的序列化/反序列化
2. 写实现：定义消息类型常量 + 消息构造器函数

**验收标准：** `npm test messages` 全部通过

---

### Phase 3：翻译缓存（`translation-cache.js`）

**TDD 顺序：**

1. 写测试：`tests/unit/translation-cache.test.js`
   - 未命中缓存返回 null
   - 命中缓存返回正确译文
   - 超过 500 条时自动清理最早的 100 条
   - `clear()` 方法清空所有缓存

2. 写实现：`src/content/translation-cache.js`

**验收标准：** `npm test translation-cache` 全部通过

---

### Phase 4：Service Worker（`service-worker.js`）

**TDD 顺序：**

1. 写测试：`tests/unit/service-worker.test.js`（mock `fetch` 和 `chrome.storage`）
   - 未配置 API Key → 返回 `NO_API_KEY` 错误
   - API 调用成功 → 返回翻译结果
   - API 超时（10s）→ 返回 `TIMEOUT` 错误
   - API 返回非 200 → 返回 `API_ERROR` 错误

2. 写实现：`src/background/service-worker.js`

**验收标准：** `npm test service-worker` 全部通过

---

### Phase 5：字幕监听（`subtitle-observer.js`）

**TDD 顺序：**

1. 写测试：`tests/unit/subtitle-observer.test.js`（jsdom 模拟 DOM）
   - `.vds-captions` 不存在时不报错，等待出现
   - 字幕节点出现时，300ms 后触发回调
   - 300ms 内多次 DOM 变化，只触发一次回调（防抖验证）
   - 字幕消失时（`.vds-captions` 清空）触发 `onSubtitleClear` 回调

2. 写实现：`src/content/subtitle-observer.js`

**API 设计：**
```javascript
class SubtitleObserver {
  constructor({ onSubtitle, onSubtitleClear })
  start()   // 开始监听（等待 .vds-captions 出现）
  stop()    // 停止监听，断开 observer
}
```

**验收标准：** `npm test subtitle-observer` 全部通过

---

### Phase 6：译文叠加层（`translation-overlay.js`）

**TDD 顺序：**

1. 写测试：`tests/unit/translation-overlay.test.js`（jsdom）
   - 初始化时在 `.vds-captions` 内创建 `div.dlai-ext-translation`
   - `setText(text)` 更新译文内容
   - `hide()` / `show()` 控制可见性
   - `setPosition('above')` 将译文移到 cue-display 上方
   - `setFontSize('large')` 更新字体大小 CSS 变量

2. 写实现：`src/content/translation-overlay.js`

**验收标准：** `npm test translation-overlay` 全部通过

---

### Phase 7：控制面板（`control-panel.js`）

**TDD 顺序：**

1. 写测试：`tests/unit/control-panel.test.js`（jsdom）
   - 等待 `.vds-controls-group` 出现后注入图标按钮
   - 点击图标显示/隐藏面板
   - 面板包含：翻译开关、字体大小选项、译文位置选项
   - 设置变更后调用 `onSettingsChange` 回调

2. 写实现：`src/content/control-panel.js`

**验收标准：** `npm test control-panel` 全部通过

---

### Phase 8：Content Script 入口（`index.js`）

**任务：** 将所有模块串联，处理 SPA 路由切换

1. 页面加载时初始化 `SubtitleObserver`、`TranslationOverlay`、`ControlPanel`
2. 监听 `chrome.storage.onChanged`，动态更新 Overlay 设置
3. 监听 SPA 路由变化（`popstate` / URL 轮询），切换课程时重置模块
4. 未配置 API Key 时，点击面板图标提示用户前往 Options 页面

**验收标准：** 在浏览器中手动加载插件，视频播放时能看到译文（即使 API 未配置，也能看到占位提示）

---

### Phase 9：Options 页面

**任务：**

1. 写测试：`tests/unit/options.test.js`
   - 页面加载时从 `storage` 读取现有配置并填充表单
   - 表单提交后写入 `storage`
   - API Key 字段有遮盖（`type="password"`）
   - Base URL 字段有合法性校验（必须是 http/https URL）

2. 写实现：`src/options/index.html` + `options.js`

**验收标准：** `npm test options` 通过；手动在浏览器 Options 页面配置 API，视频翻译正常工作

---

### Phase 10：E2E 测试

**测试用例：** `tests/e2e/`

#### `subtitle-display.spec.js`
```
场景 1：正常翻译流程
  - 导航到 deeplearning.ai 课程视频页
  - 播放视频，等待英文字幕出现
  - 断言：300ms 后出现 .dlai-ext-translation 节点
  - 断言：译文节点文本非空

场景 2：翻译开关
  - 点击控制面板图标
  - 关闭翻译开关
  - 断言：.dlai-ext-translation 不可见

场景 3：字体大小切换
  - 打开面板，切换字体大小为"大"
  - 断言：.dlai-ext-translation 的 font-size 变化

场景 4：未配置 API Key
  - 清空 storage 中的 apiConfig
  - 点击面板图标
  - 断言：出现"前往设置"引导提示
```

#### `options-page.spec.js`
```
场景 1：配置保存
  - 打开 Options 页面
  - 填写 Base URL、API Key、Model
  - 点击保存
  - 重新打开 Options 页面
  - 断言：字段值与填写的一致

场景 2：字段校验
  - Base URL 填写非法值（如 "not-a-url"）
  - 点击保存
  - 断言：出现错误提示，不写入 storage
```

**验收标准：** `npx playwright test` 全部通过

---

### Phase 11：发布准备

- [ ] 完善 `README.md`（本地加载方式、API 配置说明、发布 checklist）
- [ ] 创建 GitHub Pages 隐私政策页面
- [ ] 打包插件为 `.zip`
- [ ] Chrome Web Store 审核自查（权限说明、隐私政策 URL、截图）
- [ ] 提交 Chrome Web Store 审核

---

## 依赖清单

```json
{
  "devDependencies": {
    "jest": "^29.x",
    "jest-environment-jsdom": "^29.x",
    "@playwright/test": "^1.x",
    "eslint": "^8.x"
  }
}
```

> 无运行时依赖（插件本身零 npm 依赖，减小包体积）

---

## 命令速查

```bash
# 安装依赖
npm install

# 运行所有单元测试
npm test

# 运行单个模块测试
npm test -- subtitle-observer

# 运行 e2e 测试
npx playwright test

# 运行单个 e2e 测试文件
npx playwright test tests/e2e/subtitle-display.spec.js

# 查看测试覆盖率
npm test -- --coverage
```

---

## 开发顺序总结（按优先级）

```
Phase 0  项目初始化         → 基础设施就绪
Phase 1  storage            → 配置读写
Phase 2  messages           → 消息协议
Phase 3  translation-cache  → 缓存层
Phase 4  service-worker     → 翻译 API 调用
Phase 5  subtitle-observer  → 字幕监听 ★核心
Phase 6  translation-overlay→ 译文展示 ★核心
Phase 7  control-panel      → 用户交互
Phase 8  content index.js   → 模块串联
Phase 9  options page       → 配置页面
Phase 10 e2e tests          → 集成验证
Phase 11 发布准备            → 上线
```

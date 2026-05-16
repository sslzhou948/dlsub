# DL Subtitles

为 [learn.deeplearning.ai](https://learn.deeplearning.ai) 视频添加中英双语字幕翻译的 Chrome 插件。

> **BYOK（Bring Your Own Key）**：使用你自己的 OpenAI 兼容 API 密钥，插件本身免费开源，零数据收集。

---

## 功能

- 视频播放时自动检测字幕，实时翻译为中文（双语对照显示）
- 播放器内嵌控制面板：翻译开关、字体大小、译文位置
- 支持所有兼容 OpenAI `/v1/chat/completions` 接口的服务（OpenAI、DeepSeek、Moonshot 等）
- 翻译结果本地缓存，避免重复 API 调用
- 仅在 `learn.deeplearning.ai` 注入，权限最小化

---

## 安装

### 方式一：从 Chrome Web Store 安装（推荐）

> 即将上架，敬请期待。

### 方式二：本地加载开发版

1. 克隆仓库：
   ```bash
   git clone https://github.com/zhouyang-dl/dl-subtitles.git
   cd dl-subtitles
   ```

2. 打开 Chrome，访问 `chrome://extensions/`

3. 开启右上角「开发者模式」

4. 点击「加载已解压的扩展程序」，选择项目**根目录**（`dist/` 已包含在仓库中，无需额外构建）

5. 插件加载后，访问 `chrome://extensions/` → 找到 DL Subtitles → 点击「详细信息」→「扩展程序选项」，配置 API 信息

---

## API 配置

在「扩展程序选项」页面填写：

| 字段 | 说明 | 示例 |
|------|------|------|
| Base URL | API 根地址，结尾到 `/v1`，**不含** `/chat/completions` | `https://api.openai.com/v1` |
| API Key | 你的 API 密钥 | `sk-...` |
| 模型 | 使用的模型名称 | `gpt-4o-mini` |

**推荐配置：**
- [DeepSeek](https://platform.deepseek.com)：Base URL `https://api.deepseek.com/v1`，模型 `deepseek-chat`（性价比高）
- [OpenAI](https://platform.openai.com)：Base URL `https://api.openai.com/v1`，模型 `gpt-4o-mini`

> API Key 仅存储在本地（`chrome.storage.sync`），**不经过任何第三方服务器**。

---

## 使用说明

1. 打开 deeplearning.ai 课程视频页，点击播放器的 **CC（字幕）按钮**开启英文字幕
2. 约 300ms 后，中文译文将显示在英文字幕下方
3. 点击播放器右侧的控制面板图标（⚙️），可调整字体大小、关闭翻译

---

## 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 存储用户的 API 配置和翻译偏好设置 |
| `scripting` | 向 deeplearning.ai 页面注入字幕监听脚本 |
| `host_permissions: learn.deeplearning.ai/*` | 在课程页面注入 Content Script |
| `host_permissions: https://*/*` | Service Worker 向用户自配置的任意 API 端点发送翻译请求（BYOK 必需） |

---

## 隐私政策

本插件**零数据收集**：
- 不收集任何用户数据
- API Key 仅存储在用户本地设备（`chrome.storage.sync`）
- 翻译请求直接从用户浏览器发往用户自配置的 API 端点
- 不经过任何本插件的中间服务器

完整隐私政策：https://zhouyang-dl.github.io/dl-subtitles/privacy-policy.html

---

## 开发

### 环境要求

- Node.js 18+
- Chrome 最新版

### 命令

```bash
# 安装依赖
npm install

# 运行单元测试
npm test

# 运行单个模块测试
npm test -- subtitle-observer

# 测试覆盖率
npm test -- --coverage

# E2E 测试（需要已安装 Playwright 浏览器）
npx playwright install chromium
npx playwright test
```

### 修改源码后更新扩展

```bash
npm run build
# 然后在 chrome://extensions/ 点击插件的「刷新」按钮
```

### 打包发布

```bash
zip -r dl-subtitles.zip . \
  --exclude "*.git*" \
  --exclude "node_modules/*" \
  --exclude "tests/*" \
  --exclude "test-results/*" \
  --exclude "playwright-report/*" \
  --exclude "*.png" \
  --exclude "*.json" \
  --include "manifest.json" \
  --include "icons/*" \
  --include "dist/*" \
  --include "src/options/*" \
  --include "src/content/content.css"
```

---

## 发布 Checklist

- [ ] 所有单元测试通过（`npm test`）
- [ ] E2E 测试通过（`npx playwright test`）
- [ ] `manifest.json` 版本号已更新
- [ ] 隐私政策页面 URL 有效（`https://zhouyang-dl.github.io/dl-subtitles/privacy-policy.html`）
- [ ] Chrome Web Store 截图已准备（至少 1 张，推荐 1280×800）
- [ ] 权限说明文档已就绪（见上方「权限说明」）
- [ ] 无 `eval`、无远程代码执行
- [ ] `.zip` 打包完成，体积合理（< 10MB）

---

## 项目文档

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 产品需求文档 |
| [docs/research-report.md](docs/research-report.md) | deeplearning.ai DOM 调研报告 |
| [docs/architecture.md](docs/architecture.md) | 技术架构设计 |
| [docs/dev-plan.md](docs/dev-plan.md) | 开发与测试计划 |
| [docs/privacy-policy.html](docs/privacy-policy.html) | 隐私政策（GitHub Pages） |

---

## License

MIT

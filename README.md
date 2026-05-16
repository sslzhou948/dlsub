# DL Subtitles

为 [deeplearning.ai](https://learn.deeplearning.ai) 视频添加中英双语字幕翻译的 Chrome 插件。

## 功能

- 视频播放时自动检测字幕，实时翻译为中文（双语对照显示）
- 播放器内嵌控制面板：翻译开关、字体大小、译文位置
- BYOK 模式：使用你自己的 OpenAI 兼容 API（支持 OpenAI、DeepSeek 等）
- 翻译结果本地缓存，避免重复 API 调用
- 仅在 `learn.deeplearning.ai` 生效，权限最小化

## 本地加载方式

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/dl-subtitles.git
   cd dl-subtitles
   npm install
   ```

2. 打开 Chrome，访问 `chrome://extensions/`

3. 开启右上角「开发者模式」

4. 点击「加载已解压的扩展程序」，选择项目根目录

5. 插件加载后，右键扩展图标 → 「选项」，配置 API 信息

## API 配置说明

在 Options 页面填写：

| 字段 | 说明 | 示例 |
|------|------|------|
| Base URL | API 根地址，**结尾到 `/v1`**，不含 `/chat/completions` | `https://api.openai.com/v1` |
| API Key | 你的 API 密钥 | `sk-...` |
| 模型 | 使用的模型名称 | `gpt-4o-mini` |

> API Key 仅存储在本地（`chrome.storage.sync`），不经过任何第三方服务器。

支持所有兼容 OpenAI `/v1/chat/completions` 接口的服务，如 DeepSeek、Moonshot、自定义中转站等。

## 开发

```bash
# 运行单元测试
npm test

# 运行 e2e 测试（需要已配置 Playwright）
npx playwright test

# 测试覆盖率
npm test -- --coverage
```

## 发布 Checklist

- [ ] 所有单元测试通过（`npm test`）
- [ ] E2E 测试通过（`npx playwright test`）
- [ ] `manifest.json` 版本号已更新
- [ ] 隐私政策页面 URL 有效
- [ ] 插件描述、截图已准备（Chrome Web Store 要求）
- [ ] 权限说明文档已写明每项权限的用途
- [ ] 无 `eval`、无远程代码执行
- [ ] 打包为 `.zip`：`zip -r dl-subtitles.zip . --exclude "*.git*" --exclude "node_modules/*" --exclude "tests/*"`

## 项目文档

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 产品需求文档 |
| [docs/research-report.md](docs/research-report.md) | deeplearning.ai DOM 调研报告 |
| [docs/architecture.md](docs/architecture.md) | 技术架构设计 |
| [docs/dev-plan.md](docs/dev-plan.md) | 开发与测试计划 |

## License

MIT

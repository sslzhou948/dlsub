# PRD：deeplearning.ai 视频字幕翻译 Chrome 插件

> 版本：v1.0 | 状态：已确认 | 日期：2026-05-16

## 1. 产品概述

| 项目 | 内容 |
|------|------|
| 产品名称 | DL Subtitles（暂定） |
| 平台 | Chrome Extension，Manifest V3 |
| 发布方式 | Chrome Web Store 上架 + GitHub 开源 |
| 生效范围 | 仅 `learn.deeplearning.ai` 域名 |
| v1.0 成功标准 | 能在任意 deeplearning.ai 课程视频上看到双语字幕 |

## 2. 目标用户

- 主要用户：在 deeplearning.ai 上频繁学习的开发者 / AI 从业者，英文阅读存在一定障碍
- 使用场景：边看视频边对照中英双语字幕，降低学习障碍
- 发布形式：Chrome Web Store 上架 + GitHub 开源，面向全球用户

## 3. 核心功能（v1.0 范围）

### 3.1 字幕翻译显示

- 在视频播放器字幕下方（默认）叠加中文译文
- 双语对照：英文原文 + 中文翻译
- 翻译时机：字幕 DOM 变化后 **300ms 防抖**，稳定后触发翻译
- 翻译缓存：相同句子命中缓存直接显示，不重复调用 API

### 3.2 播放器内嵌控制面板

点击播放器内嵌图标，弹出快捷设置面板：

| 设置项 | 优先级 | 说明 |
|--------|--------|------|
| 翻译开关 | 必须 | 临时开启 / 关闭翻译 |
| 字体大小 | 必须 | 调整译文字体大小（小 / 中 / 大） |
| 译文位置 | 必须 | 原文上方 / 下方切换 |
| 目标语言 | 可选 | 默认中文，可切换其他语言 |

### 3.3 API 配置（Options 页面）

通过 Chrome 扩展 Options 页面配置：

- **Base URL**：兼容 OpenAI 标准接口（`/v1/chat/completions`）
- **API Key**：用户自有密钥
- **模型名称**：如 `gpt-4o-mini`、`deepseek-chat` 等

配置存储于 `chrome.storage.sync`，仅在用户本地。

### 3.4 异常处理

| 场景 | 处理方式 |
|------|----------|
| 视频无英文字幕 | 播放器内显示提示：「未检测到字幕，无法翻译」 |
| 未配置 API Key | 点击图标时引导用户前往 Options 页面配置 |
| API 调用失败 | 显示错误提示，不影响原生字幕正常显示 |
| 网络超时 | 3 秒超时后静默失败，不阻塞用户体验 |

## 4. 明确不做（v1.0 裁剪）

- 语音转文字（STT）—— 留 v2
- deeplearning.ai 以外的网站支持
- Popup 弹窗入口（仅 Options 页面 + 播放器内嵌面板）
- 用户账号体系、数据上报

## 5. UI / UX 期望

- 控制面板图标风格参考沉浸式翻译，嵌入播放器控制栏
- 译文样式：半透明黑底白字，与原生字幕视觉层级区分
- 面板动画：轻量淡入淡出，不抢夺注意力

## 6. 技术约束

- Manifest V3（符合 Chrome Web Store 规范）
- 权限最小化：仅申请 `storage`、`scripting`，host permission 仅 `learn.deeplearning.ai`
- 无远程代码执行（Remote Code Execution）
- BYOK 模式：插件本身不代理任何请求，API Key 仅存本地
- 翻译请求从 **Service Worker** 发出（规避 Content Script CSP 限制）

## 7. 隐私政策

- 插件不收集任何用户数据
- API Key 仅存储在 `chrome.storage.sync`（设备间同步，不经过我们服务器）
- 隐私政策页面：后续发布至 GitHub Pages

## 8. 版本规划

| 版本 | 目标 |
|------|------|
| v1.0 | 双语字幕翻译，上架 Chrome Web Store |
| v2.0 | STT 支持（无字幕视频）、更多语言对 |

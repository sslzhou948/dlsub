// DOM 选择器
export const SELECTORS = {
  CAPTIONS_ROOT: '.vds-captions[data-part="captions"]',
  CUE_DISPLAY: '[data-part="cue-display"]',
  CUE: '[data-part="cue"]',
  CONTROLS_GROUP: '.vds-controls-group',
  CAPTION_BUTTON: '.vds-caption-button',
};

// 插件注入的 CSS 类名前缀
export const CSS_PREFIX = 'dlai-ext-';

export const CSS_CLASSES = {
  TRANSLATION: 'dlai-ext-translation',
  CONTROL_PANEL: 'dlai-ext-control-panel',
  TOGGLE_BTN: 'dlai-ext-toggle-btn',
};

// 消息类型
export const MSG_TYPES = {
  TRANSLATE: 'TRANSLATE',
  TRANSLATE_RESULT: 'TRANSLATE_RESULT',
  TRANSLATE_ERROR: 'TRANSLATE_ERROR',
};

// 错误码
export const ERROR_CODES = {
  NO_API_KEY: 'NO_API_KEY',
  API_ERROR: 'API_ERROR',
  TIMEOUT: 'TIMEOUT',
};

// 防抖延迟（ms）
export const DEBOUNCE_DELAY = 300;

// 缓存配置
export const CACHE_MAX = 500;
export const CACHE_EVICT = 100;

// Storage 默认值
export const DEFAULT_API_CONFIG = {
  baseUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export const DEFAULT_DISPLAY_CONFIG = {
  enabled: true,
  fontSize: 'medium',
  position: 'below',
  targetLang: 'zh-CN',
};

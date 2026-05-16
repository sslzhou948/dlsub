'use strict';

// DOM 选择器
const SELECTORS = {
  CAPTIONS_ROOT: '.vds-captions[data-part="captions"]',
  CUE_DISPLAY: '[data-part="cue-display"]',
  CUE: '[data-part="cue"]',
  CONTROLS_GROUP: '.vds-controls-group',
  CAPTION_BUTTON: '.vds-caption-button',
};

// 插件注入的 CSS 类名前缀
const CSS_PREFIX = 'dlai-ext-';

const CSS_CLASSES = {
  TRANSLATION: 'dlai-ext-translation',
  CONTROL_PANEL: 'dlai-ext-control-panel',
  TOGGLE_BTN: 'dlai-ext-toggle-btn',
  NO_KEY_WARNING: 'dlai-ext-no-key-warning',
  NO_KEY_BADGE: 'dlai-ext-no-key-badge',
};

// 消息类型
const MSG_TYPES = {
  TRANSLATE: 'TRANSLATE',
  TRANSLATE_RESULT: 'TRANSLATE_RESULT',
  TRANSLATE_ERROR: 'TRANSLATE_ERROR',
};

// 错误码
const ERROR_CODES = {
  NO_API_KEY: 'NO_API_KEY',
  API_ERROR: 'API_ERROR',
  TIMEOUT: 'TIMEOUT',
};

// 防抖延迟（ms）
const DEBOUNCE_DELAY = 300;

// 缓存配置
const CACHE_MAX = 500;
const CACHE_EVICT = 100;

// Storage 默认值
const DEFAULT_API_CONFIG = {
  baseUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
};

const DEFAULT_DISPLAY_CONFIG = {
  enabled: true,
  fontSize: 'medium',
  position: 'below',
  targetLang: 'zh-CN',
};

module.exports = {
  SELECTORS,
  CSS_PREFIX,
  CSS_CLASSES,
  MSG_TYPES,
  ERROR_CODES,
  DEBOUNCE_DELAY,
  CACHE_MAX,
  CACHE_EVICT,
  DEFAULT_API_CONFIG,
  DEFAULT_DISPLAY_CONFIG,
};

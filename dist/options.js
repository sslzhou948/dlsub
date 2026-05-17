"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/constants.js
  var require_constants = __commonJS({
    "src/shared/constants.js"(exports, module) {
      "use strict";
      var SELECTORS = {
        CAPTIONS_ROOT: '.vds-captions[data-part="captions"]',
        CUE_DISPLAY: '[data-part="cue-display"]',
        CUE: '[data-part="cue"]',
        CONTROLS_GROUP: ".vds-controls-group",
        CAPTION_BUTTON: ".vds-caption-button"
      };
      var CSS_PREFIX = "dlai-ext-";
      var CSS_CLASSES = {
        TRANSLATION: "dlai-ext-translation",
        CONTROL_PANEL: "dlai-ext-control-panel",
        CONTROL_WRAPPER: "dlai-ext-control-wrapper",
        TOGGLE_BTN: "dlai-ext-toggle-btn",
        NO_KEY_WARNING: "dlai-ext-no-key-warning",
        NO_KEY_BADGE: "dlai-ext-no-key-badge"
      };
      var MSG_TYPES = {
        TRANSLATE: "TRANSLATE",
        TRANSLATE_RESULT: "TRANSLATE_RESULT",
        TRANSLATE_ERROR: "TRANSLATE_ERROR"
      };
      var ERROR_CODES = {
        NO_API_KEY: "NO_API_KEY",
        API_ERROR: "API_ERROR",
        TIMEOUT: "TIMEOUT"
      };
      var DEBOUNCE_DELAY = 300;
      var CACHE_MAX = 500;
      var CACHE_EVICT = 100;
      var DEFAULT_API_CONFIG2 = {
        baseUrl: "",
        apiKey: "",
        model: "gpt-4o-mini"
      };
      var DEFAULT_DISPLAY_CONFIG = {
        enabled: true,
        fontSize: "medium",
        position: "below",
        targetLang: "zh-CN"
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
        DEFAULT_API_CONFIG: DEFAULT_API_CONFIG2,
        DEFAULT_DISPLAY_CONFIG
      };
    }
  });

  // src/shared/storage.js
  var require_storage = __commonJS({
    "src/shared/storage.js"(exports, module) {
      "use strict";
      var { DEFAULT_API_CONFIG: DEFAULT_API_CONFIG2, DEFAULT_DISPLAY_CONFIG } = require_constants();
      function getApiConfig2(callback) {
        chrome.storage.sync.get({ apiConfig: DEFAULT_API_CONFIG2 }, (result) => {
          callback(result.apiConfig);
        });
      }
      function setApiConfig2(config, callback) {
        chrome.storage.sync.set({ apiConfig: config }, callback);
      }
      function getDisplayConfig(callback) {
        chrome.storage.sync.get({ displayConfig: DEFAULT_DISPLAY_CONFIG }, (result) => {
          callback(result.displayConfig);
        });
      }
      function setDisplayConfig(partial, callback) {
        getDisplayConfig((current) => {
          chrome.storage.sync.set({ displayConfig: { ...current, ...partial } }, callback);
        });
      }
      module.exports = { getApiConfig: getApiConfig2, setApiConfig: setApiConfig2, getDisplayConfig, setDisplayConfig };
    }
  });

  // src/options/options.js
  var { getApiConfig, setApiConfig } = require_storage();
  var { DEFAULT_API_CONFIG } = require_constants();
  function isValidUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const baseUrlEl = document.getElementById("baseUrl");
    const apiKeyEl = document.getElementById("apiKey");
    const modelEl = document.getElementById("model");
    const statusEl = document.getElementById("status");
    const form = document.getElementById("options-form");
    getApiConfig((config) => {
      baseUrlEl.value = config.baseUrl || DEFAULT_API_CONFIG.baseUrl;
      apiKeyEl.value = config.apiKey || DEFAULT_API_CONFIG.apiKey;
      modelEl.value = config.model || DEFAULT_API_CONFIG.model;
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      statusEl.textContent = "";
      const baseUrl = baseUrlEl.value.trim();
      const apiKey = apiKeyEl.value.trim();
      const model = modelEl.value.trim();
      if (!isValidUrl(baseUrl)) {
        statusEl.textContent = "Base URL \u683C\u5F0F\u4E0D\u6B63\u786E\uFF0C\u8BF7\u8F93\u5165 http/https \u5730\u5740";
        return;
      }
      setApiConfig({ baseUrl, apiKey, model }, () => {
        statusEl.textContent = "\u5DF2\u4FDD\u5B58";
      });
    });
  });
})();

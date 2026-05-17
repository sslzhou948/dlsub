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
      var MSG_TYPES2 = {
        TRANSLATE: "TRANSLATE",
        TRANSLATE_RESULT: "TRANSLATE_RESULT",
        TRANSLATE_ERROR: "TRANSLATE_ERROR",
        OPEN_OPTIONS: "OPEN_OPTIONS"
      };
      var ERROR_CODES2 = {
        NO_API_KEY: "NO_API_KEY",
        API_ERROR: "API_ERROR",
        TIMEOUT: "TIMEOUT"
      };
      var DEBOUNCE_DELAY = 300;
      var CACHE_MAX = 500;
      var CACHE_EVICT = 100;
      var DEFAULT_API_CONFIG = {
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
        MSG_TYPES: MSG_TYPES2,
        ERROR_CODES: ERROR_CODES2,
        DEBOUNCE_DELAY,
        CACHE_MAX,
        CACHE_EVICT,
        DEFAULT_API_CONFIG,
        DEFAULT_DISPLAY_CONFIG
      };
    }
  });

  // src/shared/storage.js
  var require_storage = __commonJS({
    "src/shared/storage.js"(exports, module) {
      "use strict";
      var { DEFAULT_API_CONFIG, DEFAULT_DISPLAY_CONFIG } = require_constants();
      function getApiConfig2(callback) {
        chrome.storage.sync.get({ apiConfig: DEFAULT_API_CONFIG }, (result) => {
          callback(result.apiConfig);
        });
      }
      function setApiConfig(config, callback) {
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
      module.exports = { getApiConfig: getApiConfig2, setApiConfig, getDisplayConfig, setDisplayConfig };
    }
  });

  // src/background/service-worker.js
  var { getApiConfig } = require_storage();
  var { MSG_TYPES, ERROR_CODES } = require_constants();
  var TIMEOUT_MS = 1e4;
  function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs);
      fetch(url, options).then((res) => {
        clearTimeout(timer);
        resolve(res);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
  async function translate({ text, targetLang, cueId }, apiConfig) {
    const { baseUrl, apiKey, model } = apiConfig;
    const body = JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `You are a professional subtitle translator. Translate the given English subtitle text to ${targetLang}. Output ONLY the translated text. Keep proper nouns (model names, library names) in English. Be concise for subtitle display.`
        },
        { role: "user", content: text }
      ]
    });
    const res = await fetchWithTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body
      },
      TIMEOUT_MS
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.code = ERROR_CODES.API_ERROR;
      throw err;
    }
    const data = await res.json();
    const translation = data.choices?.[0]?.message?.content?.trim();
    if (!translation) {
      const err = new Error("Empty response from API");
      err.code = ERROR_CODES.API_ERROR;
      throw err;
    }
    return { type: MSG_TYPES.TRANSLATE_RESULT, payload: { translation, cueId } };
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === MSG_TYPES.OPEN_OPTIONS) {
      chrome.runtime.openOptionsPage();
      return false;
    }
    if (message.type !== MSG_TYPES.TRANSLATE) return false;
    const { payload } = message;
    getApiConfig((apiConfig) => {
      if (!apiConfig.apiKey) {
        sendResponse({
          type: MSG_TYPES.TRANSLATE_ERROR,
          payload: { error: "No API key configured", code: ERROR_CODES.NO_API_KEY }
        });
        return;
      }
      translate(payload, apiConfig).then(sendResponse).catch((err) => {
        const code = err.message === "TIMEOUT" ? ERROR_CODES.TIMEOUT : err.code || ERROR_CODES.API_ERROR;
        sendResponse({
          type: MSG_TYPES.TRANSLATE_ERROR,
          payload: { error: err.message, code }
        });
      });
    });
    return true;
  });
})();

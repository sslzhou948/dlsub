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
        TRANSLATE_ERROR: "TRANSLATE_ERROR",
        OPEN_OPTIONS: "OPEN_OPTIONS"
      };
      var ERROR_CODES = {
        NO_API_KEY: "NO_API_KEY",
        API_ERROR: "API_ERROR",
        TIMEOUT: "TIMEOUT"
      };
      var DEBOUNCE_DELAY = 300;
      var CACHE_MAX = 500;
      var CACHE_EVICT = 100;
      var PREFETCH_LOOKAHEAD = 3;
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
        MSG_TYPES,
        ERROR_CODES,
        DEBOUNCE_DELAY,
        CACHE_MAX,
        CACHE_EVICT,
        PREFETCH_LOOKAHEAD,
        DEFAULT_API_CONFIG,
        DEFAULT_DISPLAY_CONFIG
      };
    }
  });

  // src/content/subtitle-observer.js
  var require_subtitle_observer = __commonJS({
    "src/content/subtitle-observer.js"(exports, module) {
      "use strict";
      var { SELECTORS, DEBOUNCE_DELAY } = require_constants();
      var SubtitleObserver = class {
        constructor({ onSubtitle, onSubtitleClear }) {
          this._onSubtitle = onSubtitle;
          this._onSubtitleClear = onSubtitleClear;
          this._captionsObserver = null;
          this._bodyObserver = null;
          this._debounceTimer = null;
        }
        start() {
          const captionsEl = document.querySelector(SELECTORS.CAPTIONS_ROOT);
          if (captionsEl) {
            this._attachToCaptions(captionsEl);
          } else {
            this._waitForCaptions();
          }
        }
        stop() {
          if (this._captionsObserver) {
            this._captionsObserver.disconnect();
            this._captionsObserver = null;
          }
          if (this._bodyObserver) {
            this._bodyObserver.disconnect();
            this._bodyObserver = null;
          }
          if (this._debounceTimer !== null) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
          }
        }
        // 等待 .vds-captions 节点出现（SPA 场景下可能延迟渲染）
        _waitForCaptions() {
          this._bodyObserver = new MutationObserver(() => {
            const captionsEl = document.querySelector(SELECTORS.CAPTIONS_ROOT);
            if (captionsEl) {
              this._bodyObserver.disconnect();
              this._bodyObserver = null;
              this._attachToCaptions(captionsEl);
            }
          });
          this._bodyObserver.observe(document.body, { childList: true, subtree: true });
        }
        // 挂载到 .vds-captions，监听内部 DOM 变化
        _attachToCaptions(captionsEl) {
          this._captionsObserver = new MutationObserver(() => {
            this._scheduleCallback(captionsEl);
          });
          this._captionsObserver.observe(captionsEl, { childList: true, subtree: true });
          if (captionsEl.querySelector('[data-part="cue"]')) {
            this._scheduleCallback(captionsEl);
          }
        }
        // 防抖：300ms 内的多次变化合并为一次回调
        _scheduleCallback(captionsEl) {
          if (this._debounceTimer !== null) {
            clearTimeout(this._debounceTimer);
          }
          this._debounceTimer = setTimeout(() => {
            this._debounceTimer = null;
            this._handleChange(captionsEl);
          }, DEBOUNCE_DELAY);
        }
        _handleChange(captionsEl) {
          const cueEl = captionsEl.querySelector('[data-part="cue"]');
          if (!cueEl) {
            this._onSubtitleClear();
            return;
          }
          const text = cueEl.textContent.trim().replace(/\n/g, " ");
          const cueId = cueEl.dataset.id || "";
          this._onSubtitle(text, cueId);
        }
      };
      module.exports = SubtitleObserver;
    }
  });

  // src/content/translation-overlay.js
  var require_translation_overlay = __commonJS({
    "src/content/translation-overlay.js"(exports, module) {
      "use strict";
      var { CSS_CLASSES, SELECTORS } = require_constants();
      var TranslationOverlay = class {
        constructor(captionsEl) {
          this._captionsEl = captionsEl;
          this._el = document.createElement("div");
          this._el.className = CSS_CLASSES.TRANSLATION;
          this._visible = true;
          this._errorTimer = null;
        }
        setText(text) {
          if (this._errorTimer) {
            clearTimeout(this._errorTimer);
            this._errorTimer = null;
          }
          this._el.classList.remove("dlai-ext-translation--error");
          this._el.textContent = text;
          if (!text) {
            this._el.remove();
            return;
          }
          if (!this._visible) {
            this._el.style.display = "none";
          }
          const cueDisplay = this._captionsEl.querySelector(SELECTORS.CUE_DISPLAY);
          if (cueDisplay && !cueDisplay.contains(this._el)) {
            cueDisplay.appendChild(this._el);
          }
        }
        setError(msg) {
          if (this._errorTimer) {
            clearTimeout(this._errorTimer);
          }
          this._el.textContent = msg;
          this._el.classList.add("dlai-ext-translation--error");
          if (!this._captionsEl.contains(this._el)) {
            this._captionsEl.appendChild(this._el);
          }
          this._errorTimer = setTimeout(() => {
            this._el.classList.remove("dlai-ext-translation--error");
            this._el.remove();
            this._errorTimer = null;
          }, 5e3);
        }
        hide() {
          this._visible = false;
          this._el.style.display = "none";
        }
        show() {
          this._visible = true;
          if (this._el.textContent) this._el.style.display = "";
        }
        setPosition(position) {
          this._el.classList.remove("dlai-ext-translation--above", "dlai-ext-translation--below");
          this._el.classList.add(`dlai-ext-translation--${position}`);
        }
        setFontSize(size) {
          this._el.style.setProperty("--dlai-font-size", size);
        }
        destroy() {
          if (this._errorTimer) {
            clearTimeout(this._errorTimer);
            this._errorTimer = null;
          }
          this._el.remove();
        }
      };
      module.exports = TranslationOverlay;
    }
  });

  // src/content/control-panel.js
  var require_control_panel = __commonJS({
    "src/content/control-panel.js"(exports, module) {
      "use strict";
      var { SELECTORS, CSS_CLASSES, DEFAULT_DISPLAY_CONFIG } = require_constants();
      var ControlPanel = class {
        constructor({ onSettingsChange, initialConfig = null }) {
          this._onSettingsChange = onSettingsChange;
          this._initialConfig = initialConfig || DEFAULT_DISPLAY_CONFIG;
          this._panelEl = null;
          this._btnEl = null;
          this._visible = false;
          this._bodyObserver = null;
        }
        init() {
          this._tryInject();
        }
        destroy() {
          if (this._bodyObserver) {
            this._bodyObserver.disconnect();
            this._bodyObserver = null;
          }
          if (this._wrapperEl) {
            this._wrapperEl.remove();
            this._wrapperEl = null;
          } else {
            if (this._btnEl) this._btnEl.remove();
            if (this._panelEl) this._panelEl.remove();
          }
          this._btnEl = null;
          this._panelEl = null;
        }
        // 找到包含 CC 按钮的 controls group（Vidstack 有多个 group，精准定位）
        _findControlsEl() {
          return document.querySelector(`${SELECTORS.CONTROLS_GROUP}:has(${SELECTORS.CAPTION_BUTTON})`) || document.querySelector(SELECTORS.CONTROLS_GROUP);
        }
        _tryInject() {
          const controlsEl = this._findControlsEl();
          if (controlsEl) {
            this._inject(controlsEl);
          } else {
            this._waitForControls();
          }
        }
        _waitForControls() {
          this._bodyObserver = new MutationObserver(() => {
            const controlsEl = this._findControlsEl();
            if (controlsEl) {
              this._bodyObserver.disconnect();
              this._bodyObserver = null;
              this._inject(controlsEl);
            }
          });
          this._bodyObserver.observe(document.body, { childList: true, subtree: true });
        }
        _inject(controlsEl) {
          this._wrapperEl = document.createElement("div");
          this._wrapperEl.className = CSS_CLASSES.CONTROL_WRAPPER;
          this._btnEl = document.createElement("button");
          this._btnEl.className = CSS_CLASSES.TOGGLE_BTN;
          this._btnEl.title = "\u53CC\u8BED\u5B57\u5E55";
          this._btnEl.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:3px">
        <path d="M4 6h16v2H4zm0 5h10v2H4zm0 5h12v2H4z"/>
      </svg>\u53CC\u8BED`;
          this._btnEl.addEventListener("click", () => this._toggle());
          this._wrapperEl.appendChild(this._btnEl);
          this._panelEl = document.createElement("div");
          this._panelEl.className = CSS_CLASSES.CONTROL_PANEL;
          this._panelEl.style.display = "none";
          this._panelEl.innerHTML = `
      <label>
        <input type="checkbox" data-setting="enabled" />
        \u7FFB\u8BD1
      </label>
      <label>
        \u5B57\u4F53
        <select data-setting="fontSize">
          <option value="small">\u5C0F</option>
          <option value="medium">\u4E2D</option>
          <option value="large">\u5927</option>
        </select>
      </label>
      <label>
        \u4F4D\u7F6E
        <select data-setting="position">
          <option value="below">\u4E0B\u65B9</option>
          <option value="above">\u4E0A\u65B9</option>
        </select>
      </label>
    `;
          this._panelEl.querySelector('[data-setting="enabled"]').checked = this._initialConfig.enabled;
          this._panelEl.querySelector('[data-setting="fontSize"]').value = this._initialConfig.fontSize;
          this._panelEl.querySelector('[data-setting="position"]').value = this._initialConfig.position;
          this._panelEl.addEventListener("change", () => {
            this._onSettingsChange(this._readSettings());
          });
          this._wrapperEl.appendChild(this._panelEl);
          controlsEl.appendChild(this._wrapperEl);
          if (this._noKeyWarningShown) this._renderNoKeyWarning();
        }
        _toggle() {
          this._visible = !this._visible;
          if (this._panelEl) {
            this._panelEl.style.display = this._visible ? "" : "none";
          }
        }
        /**
         * 当未配置 API Key 时调用，在面板顶部插入引导提示并在按钮上附加徽标。
         * 重复调用无副作用（幂等）。
         * @param {function} onAction - 点击"前往设置"时执行
         */
        showNoKeyWarning(onAction) {
          if (this._noKeyWarningShown) return;
          this._noKeyWarningShown = true;
          this._noKeyAction = onAction;
          if (this._panelEl) this._renderNoKeyWarning();
          if (this._btnEl) this._renderNoKeyBadge();
        }
        _renderNoKeyWarning() {
          const warning = document.createElement("p");
          warning.className = CSS_CLASSES.NO_KEY_WARNING;
          const settingsBtn = document.createElement("button");
          settingsBtn.textContent = "\u524D\u5F80\u8BBE\u7F6E";
          settingsBtn.addEventListener("click", () => {
            if (this._noKeyAction) this._noKeyAction();
          });
          warning.append("\u26A0 \u672A\u914D\u7F6E API Key \u2014 ", settingsBtn);
          this._panelEl.prepend(warning);
        }
        _renderNoKeyBadge() {
          const badge = document.createElement("span");
          badge.className = CSS_CLASSES.NO_KEY_BADGE;
          badge.textContent = "!";
          badge.setAttribute("aria-label", "\u672A\u914D\u7F6E API Key");
          this._btnEl.appendChild(badge);
        }
        _readSettings() {
          const enabled = this._panelEl.querySelector('[data-setting="enabled"]').checked;
          const fontSize = this._panelEl.querySelector('[data-setting="fontSize"]').value;
          const position = this._panelEl.querySelector('[data-setting="position"]').value;
          return { enabled, fontSize, position };
        }
      };
      module.exports = ControlPanel;
    }
  });

  // src/content/translation-cache.js
  var require_translation_cache = __commonJS({
    "src/content/translation-cache.js"(exports, module) {
      "use strict";
      var { CACHE_MAX, CACHE_EVICT } = require_constants();
      var TranslationCache = class {
        constructor() {
          this._map = /* @__PURE__ */ new Map();
        }
        /**
         * 生成缓存 key：cueId + text 组合，防止同 id 但内容不同的边界情况
         */
        _key(cueId, text) {
          return `${cueId}\0${text}`;
        }
        /**
         * 读取缓存。未命中返回 null。
         */
        get(cueId, text) {
          const value = this._map.get(this._key(cueId, text));
          return value !== void 0 ? value : null;
        }
        /**
         * 写入缓存。超出上限时清除最早的 CACHE_EVICT 条。
         */
        set(cueId, text, translation) {
          if (this._map.size >= CACHE_MAX) {
            let evicted = 0;
            for (const key of this._map.keys()) {
              this._map.delete(key);
              if (++evicted >= CACHE_EVICT) break;
            }
          }
          this._map.set(this._key(cueId, text), translation);
        }
        /**
         * 清空所有缓存（SPA 路由切换时调用）
         */
        clear() {
          this._map.clear();
        }
      };
      module.exports = TranslationCache;
    }
  });

  // src/content/prefetch-queue.js
  var require_prefetch_queue = __commonJS({
    "src/content/prefetch-queue.js"(exports, module) {
      "use strict";
      var { PREFETCH_LOOKAHEAD } = require_constants();
      var PrefetchQueue = class {
        /**
         * @param {object} opts
         * @param {object} opts.cache               - TranslationCache 实例（get / set）
         * @param {function} opts.requestTranslation - (text, cueId) => Promise<string>
         * @param {number} [opts.lookahead]          - 向后预取条数，默认 PREFETCH_LOOKAHEAD
         */
        constructor({ cache, requestTranslation, lookahead }) {
          this._cache = cache;
          this._requestTranslation = requestTranslation;
          this._lookahead = lookahead !== void 0 ? lookahead : PREFETCH_LOOKAHEAD;
          this._inFlight = /* @__PURE__ */ new Set();
        }
        /**
         * 触发预翻译。在当前字幕出现时调用。
         *
         * @param {string} currentCueId - 当前正在显示的 cue 的 id
         * @param {HTMLVideoElement|null} videoEl - video 元素
         */
        trigger(currentCueId, videoEl) {
          if (!videoEl) return;
          const track = this._selectTrack(videoEl);
          if (!track || !track.cues) return;
          const cues = Array.from(track.cues);
          const now = videoEl.currentTime;
          let currentIdx = cues.findIndex((c) => now >= c.startTime && now < c.endTime);
          if (currentIdx === -1 && currentCueId) {
            currentIdx = cues.findIndex((c) => String(c.id) === String(currentCueId));
          }
          if (currentIdx === -1) return;
          const upcoming = cues.slice(currentIdx + 1, currentIdx + 1 + this._lookahead);
          for (const cue of upcoming) {
            this._prefetchCue(cue);
          }
        }
        /**
         * VTT 加载完成时调用，从第一条 cue 开始预取 lookahead 条。
         * 解决：VTT 尚未加载完成时第一条字幕已出现，trigger() 找不到 cues 的竞态问题。
         *
         * @param {HTMLVideoElement} videoEl
         */
        triggerFromStart(videoEl) {
          if (!videoEl) return;
          const track = this._selectTrack(videoEl);
          if (!track || !track.cues || track.cues.length === 0) return;
          const cues = Array.from(track.cues);
          for (const cue of cues.slice(0, this._lookahead)) {
            this._prefetchCue(cue);
          }
        }
        /**
         * 清空 in-flight 状态（路由切换时调用）。
         * 不清空 cache，cache 生命周期由 App 统一管理。
         */
        clear() {
          this._inFlight.clear();
        }
        // --- 私有方法 ---
        /**
         * 从 video.textTracks 中选择字幕 track。
         * 优先 mode=showing，其次 kind=subtitles/captions 且 mode≠disabled。
         */
        _selectTrack(videoEl) {
          const tracks = Array.from(videoEl.textTracks);
          const showing = tracks.find((t) => t.mode === "showing");
          if (showing) return showing;
          return tracks.find(
            (t) => (t.kind === "subtitles" || t.kind === "captions") && t.mode !== "disabled"
          ) || null;
        }
        /**
         * 对单条 cue 发起预翻译（含去重、cache 检查）。
         */
        _prefetchCue(cue) {
          const text = this._stripVttTags(cue.text);
          if (!text) return;
          const cueId = String(cue.id);
          if (this._cache.get(cueId, text)) return;
          const key = `${cueId}\0${text}`;
          if (this._inFlight.has(key)) return;
          this._inFlight.add(key);
          this._requestTranslation(text, cueId).then(
            (translation) => {
              this._cache.set(cueId, text, translation);
              this._inFlight.delete(key);
            },
            () => {
              this._inFlight.delete(key);
            }
          );
        }
        /**
         * 剥离 WebVTT 内联标签（<c>、<v>、<b> 等），返回纯文本。
         */
        _stripVttTags(text) {
          return text.replace(/<[^>]*>/g, "").trim();
        }
      };
      module.exports = PrefetchQueue;
    }
  });

  // src/shared/storage.js
  var require_storage = __commonJS({
    "src/shared/storage.js"(exports, module) {
      "use strict";
      var { DEFAULT_API_CONFIG, DEFAULT_DISPLAY_CONFIG } = require_constants();
      function getApiConfig(callback) {
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
      module.exports = { getApiConfig, setApiConfig, getDisplayConfig, setDisplayConfig };
    }
  });

  // src/content/index.js
  var require_content = __commonJS({
    "src/content/index.js"(exports, module) {
      "use strict";
      var SubtitleObserver = require_subtitle_observer();
      var TranslationOverlay = require_translation_overlay();
      var ControlPanel = require_control_panel();
      var TranslationCache = require_translation_cache();
      var PrefetchQueue = require_prefetch_queue();
      var { getApiConfig, getDisplayConfig } = require_storage();
      var { SELECTORS, PREFETCH_LOOKAHEAD } = require_constants();
      var App2 = class {
        constructor() {
          this._observer = null;
          this._overlay = null;
          this._panel = null;
          this._cache = new TranslationCache();
          this._prefetch = null;
          this._lastUrl = location.href;
          this._routeCheckInterval = null;
          this._ccBtnListener = null;
          this._trackLoadObs = null;
          this._trackAddTrackListener = null;
        }
        init() {
          this._startModules();
          this._watchRoute();
          chrome.storage.onChanged.addListener(() => this._applyDisplayConfig());
          window.addEventListener("beforeunload", () => this._cleanup());
        }
        _startModules() {
          const captionsEl = document.querySelector(SELECTORS.CAPTIONS_ROOT);
          if (captionsEl) {
            this._overlay = new TranslationOverlay(captionsEl);
            this._checkCcStatus(captionsEl);
          }
          getDisplayConfig((displayConfig) => {
            this._panel = new ControlPanel({
              initialConfig: displayConfig,
              onSettingsChange: (settings) => {
                if (this._overlay) {
                  if (!settings.enabled) this._overlay.hide();
                  else this._overlay.show();
                  this._overlay.setPosition(settings.position);
                  this._overlay.setFontSize(settings.fontSize);
                }
              }
            });
            this._panel.init();
            getApiConfig((apiConfig) => {
              if (!apiConfig.apiKey && this._panel) {
                this._panel.showNoKeyWarning(() => {
                  chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
                });
              }
            });
          });
          const requestTranslation = (text, cueId) => new Promise((resolve, reject) => {
            getApiConfig((apiConfig) => {
              if (!apiConfig.apiKey) {
                reject(new Error("NO_API_KEY"));
                return;
              }
              chrome.runtime.sendMessage(
                { type: "TRANSLATE", payload: { text, targetLang: "zh-CN", cueId } },
                (response) => {
                  if (response && response.type === "TRANSLATE_RESULT") {
                    resolve(response.payload.translation);
                  } else {
                    reject(new Error(response && response.payload && response.payload.error || "TRANSLATE_ERROR"));
                  }
                }
              );
            });
          });
          this._prefetch = new PrefetchQueue({
            cache: this._cache,
            requestTranslation,
            lookahead: PREFETCH_LOOKAHEAD
          });
          this._observer = new SubtitleObserver({
            onSubtitle: (text, cueId) => {
              if (!this._overlay) {
                const captionsEl2 = document.querySelector(SELECTORS.CAPTIONS_ROOT);
                if (captionsEl2) {
                  this._overlay = new TranslationOverlay(captionsEl2);
                  this._checkCcStatus(captionsEl2);
                } else {
                  return;
                }
              }
              const cached = this._cache.get(cueId, text);
              if (cached) {
                this._overlay.setText(cached);
              } else {
                getApiConfig((apiConfig) => {
                  if (!apiConfig.apiKey) return;
                  chrome.runtime.sendMessage(
                    { type: "TRANSLATE", payload: { text, targetLang: "zh-CN", cueId } },
                    (response) => {
                      if (response && response.type === "TRANSLATE_RESULT") {
                        this._cache.set(cueId, text, response.payload.translation);
                        if (this._overlay) this._overlay.setText(response.payload.translation);
                      } else if (response && response.type === "TRANSLATE_ERROR") {
                        if (this._overlay) this._overlay.setError("\u7FFB\u8BD1\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 API \u8BBE\u7F6E");
                      }
                    }
                  );
                });
              }
              const video = document.querySelector("video");
              if (video && this._prefetch) this._prefetch.trigger(cueId, video);
            },
            onSubtitleClear: () => {
              if (this._overlay) this._overlay.setText("");
            }
          });
          this._observer.start();
          this._watchTrackLoad();
        }
        _watchTrackLoad() {
          const tryAttach = () => {
            const video = document.querySelector("video");
            if (!video) return;
            const attachToTrack = (track) => {
              if (track._dlaiPrefetchAttached) return;
              track._dlaiPrefetchAttached = true;
              const onCueChange = () => {
                if (!track.cues || track.cues.length === 0) return;
                track.removeEventListener("cuechange", onCueChange);
                if (this._prefetch) this._prefetch.triggerFromStart(video);
              };
              track.addEventListener("cuechange", onCueChange);
            };
            Array.from(video.textTracks).forEach(attachToTrack);
            const onAddTrack = (e) => attachToTrack(e.track);
            video.textTracks.addEventListener("addtrack", onAddTrack);
            this._trackAddTrackListener = { el: video.textTracks, fn: onAddTrack };
          };
          if (document.querySelector("video")) {
            tryAttach();
          } else {
            this._trackLoadObs = new MutationObserver(() => {
              if (!document || !document.querySelector) return;
              if (document.querySelector("video")) {
                this._trackLoadObs.disconnect();
                this._trackLoadObs = null;
                tryAttach();
              }
            });
            this._trackLoadObs.observe(document.body, { childList: true, subtree: true });
          }
        }
        // SPA 路由切换检测（轮询 URL 变化）
        _watchRoute() {
          this._routeCheckInterval = setInterval(() => {
            if (location.href !== this._lastUrl) {
              this._lastUrl = location.href;
              this._onRouteChange();
            }
          }, 500);
          window.addEventListener("popstate", () => this._onRouteChange());
        }
        // 检测 CC 是否关闭，若关闭则在 overlay 显示提示，CC 开启后自动清除
        _checkCcStatus(captionsEl) {
          if (captionsEl.getAttribute("aria-hidden") !== "true") return;
          if (this._overlay) {
            this._overlay.setText("\u8BF7\u5148\u70B9\u51FB\u64AD\u653E\u5668 CC \u6309\u94AE\u5F00\u542F\u82F1\u6587\u5B57\u5E55");
          }
          const ccBtn = document.querySelector(SELECTORS.CAPTION_BUTTON);
          if (ccBtn) {
            const onCcClick = () => {
              if (this._overlay) this._overlay.setText("");
              ccBtn.removeEventListener("click", onCcClick);
              this._ccBtnListener = null;
            };
            ccBtn.addEventListener("click", onCcClick);
            this._ccBtnListener = { el: ccBtn, fn: onCcClick };
          }
        }
        _onRouteChange() {
          if (this._ccBtnListener) {
            this._ccBtnListener.el.removeEventListener("click", this._ccBtnListener.fn);
            this._ccBtnListener = null;
          }
          if (this._trackLoadObs) {
            this._trackLoadObs.disconnect();
            this._trackLoadObs = null;
          }
          if (this._trackAddTrackListener) {
            this._trackAddTrackListener.el.removeEventListener("addtrack", this._trackAddTrackListener.fn);
            this._trackAddTrackListener = null;
          }
          if (this._observer) {
            this._observer.stop();
            this._observer = null;
          }
          if (this._prefetch) {
            this._prefetch.clear();
            this._prefetch = null;
          }
          if (this._panel) {
            this._panel.destroy();
            this._panel = null;
          }
          if (this._overlay) {
            this._overlay.destroy();
            this._overlay = null;
          }
          this._cache.clear();
          this._startModules();
        }
        _applyDisplayConfig() {
          getDisplayConfig((config) => {
            if (!this._overlay) return;
            if (!config.enabled) this._overlay.hide();
            else this._overlay.show();
            this._overlay.setPosition(config.position);
            this._overlay.setFontSize(config.fontSize);
          });
        }
        _cleanup() {
          if (this._routeCheckInterval) {
            clearInterval(this._routeCheckInterval);
            this._routeCheckInterval = null;
          }
          if (this._trackLoadObs) {
            this._trackLoadObs.disconnect();
            this._trackLoadObs = null;
          }
          if (this._trackAddTrackListener) {
            this._trackAddTrackListener.el.removeEventListener("addtrack", this._trackAddTrackListener.fn);
            this._trackAddTrackListener = null;
          }
          if (this._observer) this._observer.stop();
          if (this._prefetch) this._prefetch.clear();
        }
      };
      module.exports = App2;
    }
  });

  // src/content/main.js
  var App = require_content();
  var app = new App();
  app.init();
})();

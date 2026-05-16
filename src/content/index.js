'use strict';

const SubtitleObserver = require('./subtitle-observer');
const TranslationOverlay = require('./translation-overlay');
const ControlPanel = require('./control-panel');
const TranslationCache = require('./translation-cache');
const { getApiConfig, getDisplayConfig } = require('../shared/storage');
const { SELECTORS } = require('../shared/constants');

class App {
  constructor() {
    this._observer = null;
    this._overlay = null;
    this._panel = null;
    this._cache = new TranslationCache();
    this._lastUrl = location.href;
    this._routeCheckInterval = null;
  }

  init() {
    this._startModules();
    this._watchRoute();
    chrome.storage.onChanged.addListener(() => this._applyDisplayConfig());
  }

  _startModules() {
    const captionsEl = document.querySelector(SELECTORS.CAPTIONS_ROOT);
    if (captionsEl) {
      this._overlay = new TranslationOverlay(captionsEl);
    }

    this._panel = new ControlPanel({
      onSettingsChange: (settings) => {
        if (this._overlay) {
          if (!settings.enabled) this._overlay.hide();
          else this._overlay.show();
          this._overlay.setPosition(settings.position);
          this._overlay.setFontSize(settings.fontSize);
        }
      },
    });
    this._panel.init();

    this._observer = new SubtitleObserver({
      onSubtitle: (text, cueId) => {
        const cached = this._cache.get(cueId, text);
        if (cached) {
          if (this._overlay) this._overlay.setText(cached);
          return;
        }
        getApiConfig((apiConfig) => {
          if (!apiConfig.apiKey) return;
          chrome.runtime.sendMessage(
            { type: 'TRANSLATE', payload: { text, targetLang: 'zh-CN', cueId } },
            (response) => {
              if (response && response.type === 'TRANSLATE_RESULT') {
                this._cache.set(cueId, text, response.payload.translation);
                if (this._overlay) this._overlay.setText(response.payload.translation);
              }
            },
          );
        });
      },
      onSubtitleClear: () => {
        if (this._overlay) this._overlay.setText('');
      },
    });
    this._observer.start();
  }

  // SPA 路由切换检测（轮询 URL 变化）
  _watchRoute() {
    this._routeCheckInterval = setInterval(() => {
      if (location.href !== this._lastUrl) {
        this._lastUrl = location.href;
        this._onRouteChange();
      }
    }, 500);

    window.addEventListener('popstate', () => this._onRouteChange());
  }

  _onRouteChange() {
    if (this._observer) {
      this._observer.stop();
      this._observer = null;
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
    if (this._observer) this._observer.stop();
  }
}

module.exports = App;

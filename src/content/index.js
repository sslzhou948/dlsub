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
    this._ccBtnListener = null;
  }

  init() {
    this._startModules();
    this._watchRoute();
    chrome.storage.onChanged.addListener(() => this._applyDisplayConfig());
    window.addEventListener('beforeunload', () => this._cleanup());
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
        },
      });
      this._panel.init();

      // 启动后立即检查 API Key，未配置则在面板中显示引导提示
      getApiConfig((apiConfig) => {
        if (!apiConfig.apiKey && this._panel) {
          this._panel.showNoKeyWarning(() => {
            if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
          });
        }
      });
    });

    this._observer = new SubtitleObserver({
      onSubtitle: (text, cueId) => {
        // Lazily create overlay: captions element may load async after _startModules runs
        if (!this._overlay) {
          const captionsEl = document.querySelector(SELECTORS.CAPTIONS_ROOT);
          if (captionsEl) {
            this._overlay = new TranslationOverlay(captionsEl);
            this._checkCcStatus(captionsEl);
          } else {
            return;
          }
        }
        const cached = this._cache.get(cueId, text);
        if (cached) {
          this._overlay.setText(cached);
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
              } else if (response && response.type === 'TRANSLATE_ERROR') {
                if (this._overlay) this._overlay.setError('翻译失败，请检查 API 设置');
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

  // 检测 CC 是否关闭，若关闭则在 overlay 显示提示，CC 开启后自动清除
  _checkCcStatus(captionsEl) {
    if (captionsEl.getAttribute('aria-hidden') !== 'true') return;
    if (this._overlay) {
      this._overlay.setText('请先点击播放器 CC 按钮开启英文字幕');
    }
    const ccBtn = document.querySelector(SELECTORS.CAPTION_BUTTON);
    if (ccBtn) {
      const onCcClick = () => {
        if (this._overlay) this._overlay.setText('');
        ccBtn.removeEventListener('click', onCcClick);
        this._ccBtnListener = null;
      };
      ccBtn.addEventListener('click', onCcClick);
      this._ccBtnListener = { el: ccBtn, fn: onCcClick };
    }
  }

  _onRouteChange() {
    if (this._ccBtnListener) {
      this._ccBtnListener.el.removeEventListener('click', this._ccBtnListener.fn);
      this._ccBtnListener = null;
    }
    if (this._observer) {
      this._observer.stop();
      this._observer = null;
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
    if (this._observer) this._observer.stop();
  }
}

module.exports = App;

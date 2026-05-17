'use strict';

const SubtitleObserver = require('./subtitle-observer');
const TranslationOverlay = require('./translation-overlay');
const ControlPanel = require('./control-panel');
const TranslationCache = require('./translation-cache');
const PrefetchQueue = require('./prefetch-queue');
const { getApiConfig, getDisplayConfig } = require('../shared/storage');
const { SELECTORS, PREFETCH_LOOKAHEAD } = require('../shared/constants');

class App {
  constructor() {
    this._observer = null;
    this._overlay = null;
    this._panel = null;
    this._cache = new TranslationCache();
    this._prefetch = null;
    this._lastUrl = location.href;
    this._routeCheckInterval = null;
    this._ccBtnListener = null;
    this._trackLoadObs = null; // MutationObserver for _watchTrackLoad
    this._trackAddTrackListener = null; // addtrack listener for _watchTrackLoad
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
            chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
          });
        }
      });
    });

    // requestTranslation：供 PrefetchQueue 注入，返回 Promise<string>
    const requestTranslation = (text, cueId) =>
      new Promise((resolve, reject) => {
        getApiConfig((apiConfig) => {
          if (!apiConfig.apiKey) { reject(new Error('NO_API_KEY')); return; }
          chrome.runtime.sendMessage(
            { type: 'TRANSLATE', payload: { text, targetLang: 'zh-CN', cueId } },
            (response) => {
              if (response && response.type === 'TRANSLATE_RESULT') {
                resolve(response.payload.translation);
              } else {
                reject(new Error((response && response.payload && response.payload.error) || 'TRANSLATE_ERROR'));
              }
            },
          );
        });
      });

    this._prefetch = new PrefetchQueue({
      cache: this._cache,
      requestTranslation,
      lookahead: PREFETCH_LOOKAHEAD,
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
        } else {
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
        }
        // 无论 cache hit/miss，都触发预取后续字幕
        const video = document.querySelector('video');
        if (video && this._prefetch) this._prefetch.trigger(cueId, video);
      },
      onSubtitleClear: () => {
        if (this._overlay) this._overlay.setText('');
      },
    });
    this._observer.start();

    // VTT 文件加载完成后立即批量预取前 N 条字幕
    // （防止 VTT 尚未加载完成时第一条字幕已出现，导致 trigger 找不到 cues）
    this._watchTrackLoad();
  }

  _watchTrackLoad() {
    const tryAttach = () => {
      const video = document.querySelector('video');
      if (!video) return;
      const attachToTrack = (track) => {
        if (track._dlaiPrefetchAttached) return;
        track._dlaiPrefetchAttached = true;
        const onCueChange = () => {
          if (!track.cues || track.cues.length === 0) return;
          track.removeEventListener('cuechange', onCueChange);
          if (this._prefetch) this._prefetch.triggerFromStart(video);
        };
        track.addEventListener('cuechange', onCueChange);
      };
      Array.from(video.textTracks).forEach(attachToTrack);
      const onAddTrack = (e) => attachToTrack(e.track);
      video.textTracks.addEventListener('addtrack', onAddTrack);
      this._trackAddTrackListener = { el: video.textTracks, fn: onAddTrack };
    };
    // video 元素可能还没出现，稍后重试
    if (document.querySelector('video')) {
      tryAttach();
    } else {
      this._trackLoadObs = new MutationObserver(() => {
        if (!document || !document.querySelector) return;
        if (document.querySelector('video')) {
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
    if (this._trackLoadObs) {
      this._trackLoadObs.disconnect();
      this._trackLoadObs = null;
    }
    if (this._trackAddTrackListener) {
      this._trackAddTrackListener.el.removeEventListener('addtrack', this._trackAddTrackListener.fn);
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
      this._trackAddTrackListener.el.removeEventListener('addtrack', this._trackAddTrackListener.fn);
      this._trackAddTrackListener = null;
    }
    if (this._observer) this._observer.stop();
    if (this._prefetch) this._prefetch.clear();
  }
}

module.exports = App;

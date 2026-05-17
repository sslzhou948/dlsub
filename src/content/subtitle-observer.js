'use strict';

const { SELECTORS, DEBOUNCE_DELAY } = require('../shared/constants');

class SubtitleObserver {
  constructor({ onSubtitle, onSubtitleClear }) {
    this._onSubtitle = onSubtitle;
    this._onSubtitleClear = onSubtitleClear;

    this._captionsObserver = null; // 监听 .vds-captions 内部变化
    this._bodyObserver = null;     // 监听 body，等待 .vds-captions 出现
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

    // attach 时若已有字幕内容，立即触发一次（例如 _waitForCaptions 发现节点时内容已就位）
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
    const text = cueEl.textContent.trim().replace(/\n/g, ' ');
    const cueId = cueEl.dataset.id || '';
    this._onSubtitle(text, cueId);
  }
}

module.exports = SubtitleObserver;

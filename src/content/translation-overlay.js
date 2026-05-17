'use strict';

const { CSS_CLASSES, SELECTORS } = require('../shared/constants');

class TranslationOverlay {
  constructor(captionsEl) {
    this._captionsEl = captionsEl;
    this._el = document.createElement('div');
    this._el.className = CSS_CLASSES.TRANSLATION;
    this._visible = true;
    this._errorTimer = null;
  }

  setText(text) {
    if (this._errorTimer) {
      clearTimeout(this._errorTimer);
      this._errorTimer = null;
    }
    this._el.classList.remove('dlai-ext-translation--error');
    this._el.textContent = text;

    if (!text) {
      // 字幕消失时从 DOM 移除，避免残留空块
      this._el.remove();
      return;
    }

    if (!this._visible) {
      this._el.style.display = 'none';
    }

    // 沉浸式翻译：注入到当前 cue-display 内，紧随英文字幕之后
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
    this._el.classList.add('dlai-ext-translation--error');
    if (!this._captionsEl.contains(this._el)) {
      this._captionsEl.appendChild(this._el);
    }
    this._errorTimer = setTimeout(() => {
      this._el.classList.remove('dlai-ext-translation--error');
      this._el.remove();
      this._errorTimer = null;
    }, 5000);
  }

  hide() {
    this._visible = false;
    this._el.style.display = 'none';
  }

  show() {
    this._visible = true;
    if (this._el.textContent) this._el.style.display = '';
  }

  setPosition(position) {
    this._el.classList.remove('dlai-ext-translation--above', 'dlai-ext-translation--below');
    this._el.classList.add(`dlai-ext-translation--${position}`);
  }

  setFontSize(size) {
    this._el.style.setProperty('--dlai-font-size', size);
  }

  destroy() {
    this._el.remove();
  }
}

module.exports = TranslationOverlay;

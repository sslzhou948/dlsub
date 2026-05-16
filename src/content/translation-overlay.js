'use strict';

const { CSS_CLASSES } = require('../shared/constants');

class TranslationOverlay {
  constructor(captionsEl) {
    this._el = document.createElement('div');
    this._el.className = CSS_CLASSES.TRANSLATION;
    captionsEl.appendChild(this._el);
  }

  setText(text) {
    this._el.textContent = text;
  }

  hide() {
    this._el.style.display = 'none';
  }

  show() {
    this._el.style.display = '';
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

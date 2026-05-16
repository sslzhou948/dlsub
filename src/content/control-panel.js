'use strict';

const { SELECTORS, CSS_CLASSES } = require('../shared/constants');

class ControlPanel {
  constructor({ onSettingsChange }) {
    this._onSettingsChange = onSettingsChange;
    this._panelEl = null;
    this._btnEl = null;
    this._visible = false;
    this._bodyObserver = null;
  }

  init() {
    const controlsEl = document.querySelector(SELECTORS.CONTROLS_GROUP);
    if (controlsEl) {
      this._inject(controlsEl);
    } else {
      this._waitForControls();
    }
  }

  destroy() {
    if (this._bodyObserver) {
      this._bodyObserver.disconnect();
      this._bodyObserver = null;
    }
    if (this._btnEl) this._btnEl.remove();
    if (this._panelEl) this._panelEl.remove();
  }

  _waitForControls() {
    this._bodyObserver = new MutationObserver(() => {
      const controlsEl = document.querySelector(SELECTORS.CONTROLS_GROUP);
      if (controlsEl) {
        this._bodyObserver.disconnect();
        this._bodyObserver = null;
        this._inject(controlsEl);
      }
    });
    this._bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  _inject(controlsEl) {
    // 图标按钮
    this._btnEl = document.createElement('button');
    this._btnEl.className = CSS_CLASSES.TOGGLE_BTN;
    this._btnEl.textContent = 'CC';
    this._btnEl.addEventListener('click', () => this._toggle());
    controlsEl.appendChild(this._btnEl);

    // 控制面板（初始隐藏）
    this._panelEl = document.createElement('div');
    this._panelEl.className = CSS_CLASSES.CONTROL_PANEL;
    this._panelEl.style.display = 'none';
    this._panelEl.innerHTML = `
      <label>
        <input type="checkbox" data-setting="enabled" checked />
        翻译
      </label>
      <label>
        字体
        <select data-setting="fontSize">
          <option value="small">小</option>
          <option value="medium" selected>中</option>
          <option value="large">大</option>
        </select>
      </label>
      <label>
        位置
        <select data-setting="position">
          <option value="below" selected>下方</option>
          <option value="above">上方</option>
        </select>
      </label>
    `;
    this._panelEl.addEventListener('change', () => {
      this._onSettingsChange(this._readSettings());
    });
    controlsEl.appendChild(this._panelEl);
  }

  _toggle() {
    this._visible = !this._visible;
    if (this._panelEl) {
      this._panelEl.style.display = this._visible ? '' : 'none';
    }
  }

  _readSettings() {
    const enabled = this._panelEl.querySelector('[data-setting="enabled"]').checked;
    const fontSize = this._panelEl.querySelector('[data-setting="fontSize"]').value;
    const position = this._panelEl.querySelector('[data-setting="position"]').value;
    return { enabled, fontSize, position };
  }
}

module.exports = ControlPanel;

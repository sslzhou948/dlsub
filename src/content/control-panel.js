'use strict';

const { SELECTORS, CSS_CLASSES, DEFAULT_DISPLAY_CONFIG } = require('../shared/constants');

class ControlPanel {
  constructor({ onSettingsChange, initialConfig = null }) {
    this._onSettingsChange = onSettingsChange;
    this._initialConfig = initialConfig || DEFAULT_DISPLAY_CONFIG;
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
    // Remove the wrapper (which contains both the button and the panel)
    if (this._wrapperEl) {
      this._wrapperEl.remove();
      this._wrapperEl = null;
    } else {
      // Fallback for cases where wrapper was not created
      if (this._btnEl) this._btnEl.remove();
      if (this._panelEl) this._panelEl.remove();
    }
    this._btnEl = null;
    this._panelEl = null;
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
    // Wrapper provides the CSS positioning context for the floating panel
    this._wrapperEl = document.createElement('div');
    this._wrapperEl.className = CSS_CLASSES.CONTROL_WRAPPER;

    // 图标按钮
    this._btnEl = document.createElement('button');
    this._btnEl.className = CSS_CLASSES.TOGGLE_BTN;
    this._btnEl.textContent = 'CC';
    this._btnEl.addEventListener('click', () => this._toggle());
    this._wrapperEl.appendChild(this._btnEl);

    // 控制面板（初始隐藏）
    this._panelEl = document.createElement('div');
    this._panelEl.className = CSS_CLASSES.CONTROL_PANEL;
    this._panelEl.style.display = 'none';
    this._panelEl.innerHTML = `
      <label>
        <input type="checkbox" data-setting="enabled" />
        翻译
      </label>
      <label>
        字体
        <select data-setting="fontSize">
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
      </label>
      <label>
        位置
        <select data-setting="position">
          <option value="below">下方</option>
          <option value="above">上方</option>
        </select>
      </label>
    `;
    this._panelEl.querySelector('[data-setting="enabled"]').checked = this._initialConfig.enabled;
    this._panelEl.querySelector('[data-setting="fontSize"]').value = this._initialConfig.fontSize;
    this._panelEl.querySelector('[data-setting="position"]').value = this._initialConfig.position;
    this._panelEl.addEventListener('change', () => {
      this._onSettingsChange(this._readSettings());
    });
    this._wrapperEl.appendChild(this._panelEl);
    controlsEl.appendChild(this._wrapperEl);

    // Render any pending no-key warning that was requested before inject completed
    if (this._noKeyWarningShown) this._renderNoKeyWarning();
  }

  _toggle() {
    this._visible = !this._visible;
    if (this._panelEl) {
      this._panelEl.style.display = this._visible ? '' : 'none';
    }
  }

  /**
   * 当未配置 API Key 时调用，在面板顶部插入引导提示并在按钮上附加徽标。
   * 重复调用无副作用（幂等）。
   * @param {function} onAction - 点击"前往设置"时执行
   */
  showNoKeyWarning(onAction) {
    // 避免重复注入
    if (this._noKeyWarningShown) return;
    this._noKeyWarningShown = true;
    this._noKeyAction = onAction;

    if (this._panelEl) this._renderNoKeyWarning();
    if (this._btnEl) this._renderNoKeyBadge();
  }

  _renderNoKeyWarning() {
    const warning = document.createElement('p');
    warning.className = CSS_CLASSES.NO_KEY_WARNING;

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = '前往设置';
    settingsBtn.addEventListener('click', () => {
      if (this._noKeyAction) this._noKeyAction();
    });

    warning.append('⚠ 未配置 API Key — ', settingsBtn);
    this._panelEl.prepend(warning);
  }

  _renderNoKeyBadge() {
    const badge = document.createElement('span');
    badge.className = CSS_CLASSES.NO_KEY_BADGE;
    badge.textContent = '!';
    badge.setAttribute('aria-label', '未配置 API Key');
    this._btnEl.appendChild(badge);
  }

  _readSettings() {
    const enabled = this._panelEl.querySelector('[data-setting="enabled"]').checked;
    const fontSize = this._panelEl.querySelector('[data-setting="fontSize"]').value;
    const position = this._panelEl.querySelector('[data-setting="position"]').value;
    return { enabled, fontSize, position };
  }
}

module.exports = ControlPanel;

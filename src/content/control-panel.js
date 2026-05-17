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
    // 优先找含有 CC 按钮的那个 group（CSS :has() Chrome 105+ 支持）
    return document.querySelector(`${SELECTORS.CONTROLS_GROUP}:has(${SELECTORS.CAPTION_BUTTON})`)
      || document.querySelector(SELECTORS.CONTROLS_GROUP);
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
    // Wrapper provides the CSS positioning context for the floating panel
    this._wrapperEl = document.createElement('div');
    this._wrapperEl.className = CSS_CLASSES.CONTROL_WRAPPER;

    // 图标按钮
    this._btnEl = document.createElement('button');
    this._btnEl.className = CSS_CLASSES.TOGGLE_BTN;
    this._btnEl.title = '双语字幕';
    this._btnEl.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:3px">
        <path d="M4 6h16v2H4zm0 5h10v2H4zm0 5h12v2H4z"/>
      </svg>双语`;
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

'use strict';

let ControlPanel;

beforeEach(() => {
  jest.resetModules();
  ControlPanel = require('../../src/content/control-panel');
  document.body.innerHTML = '';
});

// 辅助：等待 MutationObserver / microtask
function flushMutations() {
  return Promise.resolve();
}

describe('等待 .vds-controls-group 出现后注入按钮', () => {
  test('controls-group 存在时立即注入', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    const btn = document.querySelector('.dlai-ext-toggle-btn');
    expect(btn).not.toBeNull();
  });

  test('controls-group 不存在时不抛异常', () => {
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    expect(() => panel.init()).not.toThrow();
  });

  test('controls-group 动态出现时注入按钮', async () => {
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();

    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    await flushMutations();

    const btn = document.querySelector('.dlai-ext-toggle-btn');
    expect(btn).not.toBeNull();
  });
});

describe('面板显示/隐藏', () => {
  test('点击按钮显示面板', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();

    const btn = document.querySelector('.dlai-ext-toggle-btn');
    btn.click();

    const panelEl = document.querySelector('.dlai-ext-control-panel');
    expect(panelEl).not.toBeNull();
    expect(panelEl.style.display).not.toBe('none');
  });

  test('再次点击按钮隐藏面板', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();

    const btn = document.querySelector('.dlai-ext-toggle-btn');
    btn.click(); // 显示
    btn.click(); // 隐藏

    const panelEl = document.querySelector('.dlai-ext-control-panel');
    expect(panelEl.style.display).toBe('none');
  });
});

describe('面板内容', () => {
  test('面板包含翻译开关', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    document.querySelector('.dlai-ext-toggle-btn').click();

    const toggle = document.querySelector('[data-setting="enabled"]');
    expect(toggle).not.toBeNull();
  });

  test('面板包含字体大小选项', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    document.querySelector('.dlai-ext-toggle-btn').click();

    const fontSize = document.querySelector('[data-setting="fontSize"]');
    expect(fontSize).not.toBeNull();
  });

  test('面板包含译文位置选项', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    document.querySelector('.dlai-ext-toggle-btn').click();

    const position = document.querySelector('[data-setting="position"]');
    expect(position).not.toBeNull();
  });
});

describe('设置变更回调', () => {
  test('变更设置后调用 onSettingsChange', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const onSettingsChange = jest.fn();
    const panel = new ControlPanel({ onSettingsChange });
    panel.init();
    document.querySelector('.dlai-ext-toggle-btn').click();

    // 触发 change 事件
    const toggle = document.querySelector('[data-setting="enabled"]');
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onSettingsChange).toHaveBeenCalledTimes(1);
  });
});

describe('initialConfig', () => {
  test('传入 initialConfig 后面板控件反映配置值', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({
      onSettingsChange: jest.fn(),
      initialConfig: { enabled: false, fontSize: 'large', position: 'above' },
    });
    panel.init();
    document.querySelector('.dlai-ext-toggle-btn').click();

    expect(document.querySelector('[data-setting="enabled"]').checked).toBe(false);
    expect(document.querySelector('[data-setting="fontSize"]').value).toBe('large');
    expect(document.querySelector('[data-setting="position"]').value).toBe('above');
  });
});

describe('destroy', () => {
  test('destroy() 移除按钮和面板 DOM 元素', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    panel.destroy();
    expect(document.querySelector('.dlai-ext-toggle-btn')).toBeNull();
    expect(document.querySelector('.dlai-ext-control-panel')).toBeNull();
  });
});

describe('showNoKeyWarning', () => {
  test('在面板中插入包含 "API Key" 文字的警告段落', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    panel.showNoKeyWarning(jest.fn());

    const warning = document.querySelector('.dlai-ext-no-key-warning');
    expect(warning).not.toBeNull();
    expect(warning.textContent).toContain('API Key');
  });

  test('在切换按钮上附加 ! 徽标', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    panel.showNoKeyWarning(jest.fn());

    const btn = document.querySelector('.dlai-ext-toggle-btn');
    expect(btn.querySelector('.dlai-ext-no-key-badge')).not.toBeNull();
  });

  test('点击"前往设置"按钮调用 onAction', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const onAction = jest.fn();
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    panel.showNoKeyWarning(onAction);

    const settingsBtn = document.querySelector('.dlai-ext-no-key-warning button');
    settingsBtn.click();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  test('重复调用不重复注入警告', () => {
    document.body.innerHTML = `<div class="vds-controls-group"></div>`;
    const panel = new ControlPanel({ onSettingsChange: jest.fn() });
    panel.init();
    panel.showNoKeyWarning(jest.fn());
    panel.showNoKeyWarning(jest.fn());

    expect(document.querySelectorAll('.dlai-ext-no-key-warning').length).toBe(1);
    expect(document.querySelectorAll('.dlai-ext-no-key-badge').length).toBe(1);
  });
});

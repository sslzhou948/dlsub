'use strict';

const { resetChromeMock, seedStore } = require('./helpers/chrome-mock');

beforeEach(() => {
  resetChromeMock();
  jest.resetModules();

  // 模拟 Options 页面 HTML
  document.body.innerHTML = `
    <form id="options-form">
      <input type="url"      id="baseUrl"  name="baseUrl"  />
      <input type="password" id="apiKey"   name="apiKey"   />
      <input type="text"     id="model"    name="model"    />
      <button type="submit">保存</button>
      <span id="status"></span>
    </form>
  `;

  require('../../src/options/options');
  // 触发 DOMContentLoaded，让 options.js 初始化
  document.dispatchEvent(new Event('DOMContentLoaded'));
});

describe('页面加载时从 storage 读取配置', () => {
  test('storage 有值时填充表单', () => {
    // 先写入存储，再重新初始化
    resetChromeMock();
    jest.resetModules();
    seedStore({
      apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-abc', model: 'gpt-4o' },
    });
    require('../../src/options/options');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.getElementById('baseUrl').value).toBe('https://api.openai.com/v1');
    expect(document.getElementById('apiKey').value).toBe('sk-abc');
    expect(document.getElementById('model').value).toBe('gpt-4o');
  });

  test('storage 为空时表单为默认值', () => {
    expect(document.getElementById('baseUrl').value).toBe('');
    expect(document.getElementById('model').value).toBe('gpt-4o-mini');
  });
});

describe('API Key 字段类型', () => {
  test('apiKey 输入框类型为 password', () => {
    const input = document.getElementById('apiKey');
    expect(input.type).toBe('password');
  });
});

describe('表单提交', () => {
  test('提交后写入 chrome.storage', () => {
    document.getElementById('baseUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = 'sk-xyz';
    document.getElementById('model').value = 'gpt-4o';

    document.getElementById('options-form').dispatchEvent(new Event('submit', { bubbles: true }));

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-xyz', model: 'gpt-4o' },
      }),
      expect.any(Function),
    );
  });
});

describe('Base URL 校验', () => {
  test('合法 URL 可以提交', () => {
    document.getElementById('baseUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = 'sk-key';
    document.getElementById('model').value = 'gpt-4o-mini';

    document.getElementById('options-form').dispatchEvent(new Event('submit', { bubbles: true }));

    expect(chrome.storage.sync.set).toHaveBeenCalled();
  });

  test('非法 URL 不写入 storage，显示错误', () => {
    document.getElementById('baseUrl').value = 'not-a-url';
    document.getElementById('apiKey').value = 'sk-key';
    document.getElementById('model').value = 'gpt-4o-mini';

    document.getElementById('options-form').dispatchEvent(new Event('submit', { bubbles: true }));

    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    const status = document.getElementById('status');
    expect(status.textContent).not.toBe('');
  });
});

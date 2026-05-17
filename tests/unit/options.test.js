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
      <button type="button"  id="test-conn">测试连接</button>
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

describe('测试连接按钮', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('"测试连接"按钮存在于页面', () => {
    expect(document.getElementById('test-conn')).not.toBeNull();
  });

  test('点击后立即显示"正在测试连接"', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})); // 永不 resolve
    document.getElementById('baseUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = 'sk-test';
    document.getElementById('model').value = 'gpt-4o-mini';

    document.getElementById('test-conn').click();

    expect(document.getElementById('status').textContent).toContain('正在测试');
  });

  test('fetch 成功（ok: true）时状态显示"连接成功"', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    document.getElementById('baseUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = 'sk-test';
    document.getElementById('model').value = 'gpt-4o-mini';

    document.getElementById('test-conn').click();
    await Promise.resolve();

    expect(document.getElementById('status').textContent).toContain('成功');
  });

  test('fetch 返回 401 时状态显示"连接失败"并含状态码', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    document.getElementById('baseUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = 'sk-invalid';
    document.getElementById('model').value = 'gpt-4o-mini';

    document.getElementById('test-conn').click();
    await Promise.resolve();

    const text = document.getElementById('status').textContent;
    expect(text).toContain('失败');
    expect(text).toContain('401');
  });

  test('fetch 网络异常时状态显示"连接失败"', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    document.getElementById('baseUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = 'sk-test';
    document.getElementById('model').value = 'gpt-4o-mini';

    document.getElementById('test-conn').click();
    await Promise.resolve();
    await Promise.resolve(); // rejected promise 需要额外一次 tick

    expect(document.getElementById('status').textContent).toContain('失败');
  });

  test('baseUrl 非法时不调用 fetch', () => {
    global.fetch = jest.fn();
    document.getElementById('baseUrl').value = 'not-a-url';
    document.getElementById('apiKey').value = 'sk-test';

    document.getElementById('test-conn').click();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('apiKey 为空时不调用 fetch', () => {
    global.fetch = jest.fn();
    document.getElementById('baseUrl').value = 'https://api.openai.com/v1';
    document.getElementById('apiKey').value = '';

    document.getElementById('test-conn').click();

    expect(global.fetch).not.toHaveBeenCalled();
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

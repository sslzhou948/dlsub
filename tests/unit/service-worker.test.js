'use strict';

const { resetChromeMock, seedStore } = require('./helpers/chrome-mock');

// service-worker.js 在加载时会注册 onMessage 监听器，
// 通过 chromeMock 捕获并手动触发，模拟 Content Script 发来消息。
let handleMessage;

beforeEach(() => {
  resetChromeMock();
  jest.resetModules();

  // 重置全局 fetch mock
  global.fetch = jest.fn();

  // 加载 service-worker，它会调用 chrome.runtime.onMessage.addListener
  require('../../src/background/service-worker');

  // 取出注册的监听器（chrome-mock 把它存进了 _messageListeners，但对外只暴露 addListener）
  // 我们直接用已 mock 的 addListener 调用记录拿到 handler
  handleMessage = chrome.runtime.onMessage.addListener.mock.calls[0][0];
});

afterEach(() => {
  delete global.fetch;
});

// 辅助：包装 sendResponse 为 Promise
function dispatch(message) {
  return new Promise((resolve) => {
    handleMessage(message, {}, resolve);
  });
}

// ---

describe('未配置 API Key', () => {
  test('返回 TRANSLATE_ERROR，code 为 NO_API_KEY', async () => {
    // store 为空，apiConfig.apiKey 为默认空字符串
    const response = await dispatch({ type: 'TRANSLATE', payload: { text: 'Hello', targetLang: 'zh-CN', cueId: '1' } });
    expect(response.type).toBe('TRANSLATE_ERROR');
    expect(response.payload.code).toBe('NO_API_KEY');
  });
});

describe('API 调用成功', () => {
  test('返回 TRANSLATE_RESULT，包含译文', async () => {
    seedStore({
      apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' },
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '你好' } }],
      }),
    });

    const response = await dispatch({ type: 'TRANSLATE', payload: { text: 'Hello', targetLang: 'zh-CN', cueId: '1' } });
    expect(response.type).toBe('TRANSLATE_RESULT');
    expect(response.payload.translation).toBe('你好');
    expect(response.payload.cueId).toBe('1');
  });
});

describe('API 返回非 200', () => {
  test('返回 TRANSLATE_ERROR，code 为 API_ERROR', async () => {
    seedStore({
      apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' },
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const response = await dispatch({ type: 'TRANSLATE', payload: { text: 'Hello', targetLang: 'zh-CN', cueId: '2' } });
    expect(response.type).toBe('TRANSLATE_ERROR');
    expect(response.payload.code).toBe('API_ERROR');
  });
});

describe('API 超时', () => {
  test('10s 超时后返回 TRANSLATE_ERROR，code 为 TIMEOUT', async () => {
    jest.useFakeTimers();

    seedStore({
      apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' },
    });

    // fetch 永远 pending
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    const promise = dispatch({ type: 'TRANSLATE', payload: { text: 'Hello', targetLang: 'zh-CN', cueId: '3' } });

    // 推进 10s 触发超时
    jest.advanceTimersByTime(10000);

    const response = await promise;
    expect(response.type).toBe('TRANSLATE_ERROR');
    expect(response.payload.code).toBe('TIMEOUT');

    jest.useRealTimers();
  });
});

describe('非 TRANSLATE 消息', () => {
  test('无关消息不响应（handler 返回 false / undefined）', () => {
    const result = handleMessage({ type: 'OTHER' }, {}, () => {});
    // 无关消息不处理，不调用 sendResponse，返回值不是 true
    expect(result).not.toBe(true);
  });
});

describe('OPEN_OPTIONS 消息', () => {
  test('收到 OPEN_OPTIONS 时调用 chrome.runtime.openOptionsPage', () => {
    handleMessage({ type: 'OPEN_OPTIONS' }, {}, () => {});
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });
});

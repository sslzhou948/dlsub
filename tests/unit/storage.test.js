'use strict';

const { resetChromeMock, seedStore } = require('./helpers/chrome-mock');

// 每次 require 前重置模块缓存，确保 storage.js 重新加载
let storage;

beforeEach(() => {
  resetChromeMock();
  jest.resetModules();
  storage = require('../../src/shared/storage');
});

// --- getApiConfig ---

describe('getApiConfig', () => {
  test('读取不存在的配置时返回默认值', (done) => {
    storage.getApiConfig((config) => {
      expect(config).toEqual({ baseUrl: '', apiKey: '', model: 'gpt-4o-mini' });
      done();
    });
  });

  test('写入后可正确读回', (done) => {
    storage.setApiConfig({ baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-abc', model: 'gpt-4o' }, () => {
      storage.getApiConfig((config) => {
        expect(config).toEqual({
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-abc',
          model: 'gpt-4o',
        });
        done();
      });
    });
  });

  test('预置 store 数据时正确读回', (done) => {
    seedStore({ apiConfig: { baseUrl: 'https://custom.ai', apiKey: 'key-xyz', model: 'gpt-3.5-turbo' } });
    storage.getApiConfig((config) => {
      expect(config).toEqual({ baseUrl: 'https://custom.ai', apiKey: 'key-xyz', model: 'gpt-3.5-turbo' });
      done();
    });
  });
});

// --- getDisplayConfig ---

describe('getDisplayConfig', () => {
  test('读取不存在的配置时返回默认值', (done) => {
    storage.getDisplayConfig((config) => {
      expect(config).toEqual({ enabled: true, fontSize: 'medium', position: 'below', targetLang: 'zh-CN' });
      done();
    });
  });

  test('写入后可正确读回', (done) => {
    storage.setDisplayConfig({ enabled: false, fontSize: 'large', position: 'above', targetLang: 'ja' }, () => {
      storage.getDisplayConfig((config) => {
        expect(config).toEqual({ enabled: false, fontSize: 'large', position: 'above', targetLang: 'ja' });
        done();
      });
    });
  });
});

// --- 独立性：apiConfig 和 displayConfig 互不干扰 ---

describe('apiConfig 和 displayConfig 相互独立', () => {
  test('写入 apiConfig 不影响 displayConfig', (done) => {
    storage.setApiConfig({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'm' }, () => {
      storage.getDisplayConfig((config) => {
        expect(config).toEqual({ enabled: true, fontSize: 'medium', position: 'below', targetLang: 'zh-CN' });
        done();
      });
    });
  });

  test('写入 displayConfig 不影响 apiConfig', (done) => {
    storage.setDisplayConfig({ enabled: false, fontSize: 'small', position: 'above', targetLang: 'ja' }, () => {
      storage.getApiConfig((config) => {
        expect(config).toEqual({ baseUrl: '', apiKey: '', model: 'gpt-4o-mini' });
        done();
      });
    });
  });
});

'use strict';

/**
 * chrome API mock，供所有需要 chrome.* 的单元测试使用。
 *
 * 使用方式（在每个测试文件顶部）：
 *   const { resetChromeMock } = require('./helpers/chrome-mock');
 *   beforeEach(() => resetChromeMock());
 *
 * 已覆盖：
 *   chrome.storage.sync.get / set
 *   chrome.storage.onChanged.addListener
 *   chrome.runtime.sendMessage
 *   chrome.runtime.onMessage.addListener / removeListener
 */

// 内部 storage 状态，每次 reset 时清空
let _store = {};

// 内部 onMessage 监听器列表
let _messageListeners = [];

// 内部 onChanged 监听器列表
let _changedListeners = [];

const chromeMock = {
  storage: {
    sync: {
      /**
       * get(keys, callback)
       * keys 可以是：
       *   - string          → 返回 { [key]: value }
       *   - string[]        → 返回 { [key]: value, ... }
       *   - object          → 以 object 的值作为默认值，store 中有的覆盖默认值
       *   - null / undefined → 返回全部 store 内容
       */
      get: jest.fn((keys, callback) => {
        let result;
        if (keys === null || keys === undefined) {
          result = { ..._store };
        } else if (typeof keys === 'string') {
          result = _store[keys] !== undefined ? { [keys]: _store[keys] } : {};
        } else if (Array.isArray(keys)) {
          result = {};
          keys.forEach((k) => {
            if (_store[k] !== undefined) result[k] = _store[k];
          });
        } else if (typeof keys === 'object') {
          // keys 是带默认值的对象
          result = { ...keys };
          Object.keys(keys).forEach((k) => {
            if (_store[k] !== undefined) result[k] = _store[k];
          });
        } else {
          result = {};
        }
        if (callback) callback(result);
      }),

      /**
       * set(items, callback)
       * 将 items 合并写入 store，然后触发 onChanged 监听器。
       */
      set: jest.fn((items, callback) => {
        const changes = {};
        Object.keys(items).forEach((k) => {
          changes[k] = { oldValue: _store[k], newValue: items[k] };
        });
        Object.assign(_store, items);
        // 触发 onChanged 监听器
        _changedListeners.forEach((fn) => fn(changes, 'sync'));
        if (callback) callback();
      }),
    },

    onChanged: {
      addListener: jest.fn((fn) => {
        _changedListeners.push(fn);
      }),
      removeListener: jest.fn((fn) => {
        _changedListeners = _changedListeners.filter((l) => l !== fn);
      }),
    },
  },

  runtime: {
    sendMessage: jest.fn(),

    onMessage: {
      addListener: jest.fn((fn) => {
        _messageListeners.push(fn);
      }),
      removeListener: jest.fn((fn) => {
        _messageListeners = _messageListeners.filter((l) => l !== fn);
      }),
    },
  },
};

/**
 * 在每个测试的 beforeEach 中调用，重置 store 和所有 mock 状态。
 */
function resetChromeMock() {
  _store = {};
  _messageListeners = [];
  _changedListeners = [];

  // 重置 jest.fn() 调用记录
  chromeMock.storage.sync.get.mockClear();
  chromeMock.storage.sync.set.mockClear();
  chromeMock.storage.onChanged.addListener.mockClear();
  chromeMock.storage.onChanged.removeListener.mockClear();
  chromeMock.runtime.sendMessage.mockClear();
  chromeMock.runtime.onMessage.addListener.mockClear();
  chromeMock.runtime.onMessage.removeListener.mockClear();
}

/**
 * 直接向内部 store 写入初始数据，用于测试"已有配置"场景。
 */
function seedStore(data) {
  Object.assign(_store, data);
}

// 挂载到全局 global.chrome，Jest 在 jsdom 环境下没有 chrome 对象
global.chrome = chromeMock;

module.exports = { chromeMock, resetChromeMock, seedStore };

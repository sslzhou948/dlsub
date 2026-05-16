'use strict';

let TranslationCache;

beforeEach(() => {
  jest.resetModules();
  TranslationCache = require('../../src/content/translation-cache');
});

describe('未命中缓存', () => {
  test('get 不存在的 key 返回 null', () => {
    const cache = new TranslationCache();
    expect(cache.get('id1', 'Hello')).toBeNull();
  });
});

describe('命中缓存', () => {
  test('set 后 get 返回正确译文', () => {
    const cache = new TranslationCache();
    cache.set('id1', 'Hello', '你好');
    expect(cache.get('id1', 'Hello')).toBe('你好');
  });

  test('相同 cueId 但不同 text 各自独立', () => {
    const cache = new TranslationCache();
    cache.set('id1', 'Hello', '你好');
    cache.set('id1', 'Hi', '嗨');
    expect(cache.get('id1', 'Hello')).toBe('你好');
    expect(cache.get('id1', 'Hi')).toBe('嗨');
  });
});

describe('超出上限自动清理', () => {
  test('超过 500 条时清除最早的 100 条', () => {
    const cache = new TranslationCache();
    // 写入 500 条
    for (let i = 0; i < 500; i++) {
      cache.set(`id${i}`, `text${i}`, `译${i}`);
    }
    // 写第 501 条，触发清理
    cache.set('id500', 'text500', '译500');

    // 最早的 100 条（id0 ~ id99）应被清除
    for (let i = 0; i < 100; i++) {
      expect(cache.get(`id${i}`, `text${i}`)).toBeNull();
    }
    // 第 100 条之后的仍存在
    expect(cache.get('id100', 'text100')).toBe('译100');
    // 最新写入的也存在
    expect(cache.get('id500', 'text500')).toBe('译500');
  });
});

describe('clear', () => {
  test('clear() 清空所有缓存', () => {
    const cache = new TranslationCache();
    cache.set('id1', 'Hello', '你好');
    cache.set('id2', 'World', '世界');
    cache.clear();
    expect(cache.get('id1', 'Hello')).toBeNull();
    expect(cache.get('id2', 'World')).toBeNull();
  });
});

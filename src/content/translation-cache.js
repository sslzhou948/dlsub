'use strict';

const { CACHE_MAX, CACHE_EVICT } = require('../shared/constants');

class TranslationCache {
  constructor() {
    // Map 保持插入顺序，用于 LRU 清理
    this._map = new Map();
  }

  /**
   * 生成缓存 key：cueId + text 组合，防止同 id 但内容不同的边界情况
   */
  _key(cueId, text) {
    return `${cueId}\x00${text}`;
  }

  /**
   * 读取缓存。未命中返回 null。
   */
  get(cueId, text) {
    const value = this._map.get(this._key(cueId, text));
    return value !== undefined ? value : null;
  }

  /**
   * 写入缓存。超出上限时清除最早的 CACHE_EVICT 条。
   */
  set(cueId, text, translation) {
    if (this._map.size >= CACHE_MAX) {
      let evicted = 0;
      for (const key of this._map.keys()) {
        this._map.delete(key);
        if (++evicted >= CACHE_EVICT) break;
      }
    }
    this._map.set(this._key(cueId, text), translation);
  }

  /**
   * 清空所有缓存（SPA 路由切换时调用）
   */
  clear() {
    this._map.clear();
  }
}

module.exports = TranslationCache;

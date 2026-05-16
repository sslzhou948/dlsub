'use strict';

const { DEFAULT_API_CONFIG, DEFAULT_DISPLAY_CONFIG } = require('./constants');

/**
 * 读取 API 配置。
 * @param {function} callback - 回调，接收 { baseUrl, apiKey, model }
 */
function getApiConfig(callback) {
  chrome.storage.sync.get({ apiConfig: DEFAULT_API_CONFIG }, (result) => {
    callback(result.apiConfig);
  });
}

/**
 * 写入 API 配置。
 * @param {{ baseUrl, apiKey, model }} config
 * @param {function} [callback]
 */
function setApiConfig(config, callback) {
  chrome.storage.sync.set({ apiConfig: config }, callback);
}

/**
 * 读取显示配置。
 * @param {function} callback - 回调，接收 { enabled, fontSize, position, targetLang }
 */
function getDisplayConfig(callback) {
  chrome.storage.sync.get({ displayConfig: DEFAULT_DISPLAY_CONFIG }, (result) => {
    callback(result.displayConfig);
  });
}

/**
 * 写入显示配置（支持 partial 更新，未传入的字段保持当前值）。
 * @param {Partial<{ enabled, fontSize, position, targetLang }>} partial
 * @param {function} [callback]
 */
function setDisplayConfig(partial, callback) {
  getDisplayConfig((current) => {
    chrome.storage.sync.set({ displayConfig: { ...current, ...partial } }, callback);
  });
}

module.exports = { getApiConfig, setApiConfig, getDisplayConfig, setDisplayConfig };

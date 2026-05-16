'use strict';

const { getApiConfig, setApiConfig } = require('../shared/storage');
const { DEFAULT_API_CONFIG } = require('../shared/constants');

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const baseUrlEl = document.getElementById('baseUrl');
  const apiKeyEl = document.getElementById('apiKey');
  const modelEl = document.getElementById('model');
  const statusEl = document.getElementById('status');
  const form = document.getElementById('options-form');

  // 读取现有配置填充表单
  getApiConfig((config) => {
    baseUrlEl.value = config.baseUrl || DEFAULT_API_CONFIG.baseUrl;
    apiKeyEl.value = config.apiKey || DEFAULT_API_CONFIG.apiKey;
    modelEl.value = config.model || DEFAULT_API_CONFIG.model;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    statusEl.textContent = '';

    const baseUrl = baseUrlEl.value.trim();
    const apiKey = apiKeyEl.value.trim();
    const model = modelEl.value.trim();

    if (!isValidUrl(baseUrl)) {
      statusEl.textContent = 'Base URL 格式不正确，请输入 http/https 地址';
      return;
    }

    setApiConfig({ baseUrl, apiKey, model }, () => {
      statusEl.textContent = '已保存';
    });
  });
});

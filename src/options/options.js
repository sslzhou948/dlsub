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

function setStatus(el, text, type) {
  el.textContent = text;
  el.classList.remove('status--success', 'status--error');
  if (type) el.classList.add(`status--${type}`);
}

document.addEventListener('DOMContentLoaded', () => {
  const baseUrlEl = document.getElementById('baseUrl');
  const apiKeyEl = document.getElementById('apiKey');
  const modelEl = document.getElementById('model');
  const statusEl = document.getElementById('status');
  const form = document.getElementById('options-form');
  const testConnBtn = document.getElementById('test-conn');

  // 读取现有配置填充表单
  getApiConfig((config) => {
    baseUrlEl.value = config.baseUrl || DEFAULT_API_CONFIG.baseUrl;
    apiKeyEl.value = config.apiKey || DEFAULT_API_CONFIG.apiKey;
    modelEl.value = config.model || DEFAULT_API_CONFIG.model;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    setStatus(statusEl, '');

    const baseUrl = baseUrlEl.value.trim();
    const apiKey = apiKeyEl.value.trim();
    const model = modelEl.value.trim();

    if (!isValidUrl(baseUrl)) {
      setStatus(statusEl, 'Base URL 格式不正确，请输入 http/https 地址', 'error');
      return;
    }

    setApiConfig({ baseUrl, apiKey, model }, () => {
      setStatus(statusEl, '已保存', 'success');
    });
  });

  testConnBtn.addEventListener('click', async () => {
    const baseUrl = baseUrlEl.value.trim();
    const apiKey = apiKeyEl.value.trim();
    const model = modelEl.value.trim();

    if (!isValidUrl(baseUrl)) {
      setStatus(statusEl, 'Base URL 格式不正确，请输入 http/https 地址', 'error');
      return;
    }
    if (!apiKey) {
      setStatus(statusEl, '请先填写 API Key', 'error');
      return;
    }

    setStatus(statusEl, '正在测试连接...');

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      if (res.ok) {
        setStatus(statusEl, '连接成功', 'success');
      } else {
        setStatus(statusEl, `连接失败：HTTP ${res.status}`, 'error');
      }
    } catch (err) {
      setStatus(statusEl, `连接失败：${err.message}`, 'error');
    }
  });
});

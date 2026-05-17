'use strict';

const { getApiConfig } = require('../shared/storage');
const { MSG_TYPES, ERROR_CODES } = require('../shared/constants');

const TIMEOUT_MS = 10000;

/**
 * 将 fetch + 超时包装为可取消的 Promise。
 */
function fetchWithTimeout(url, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);

    fetch(url, options)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * 调用 OpenAI 兼容 API 完成翻译。
 */
async function translate({ text, targetLang, cueId }, apiConfig) {
  const { baseUrl, apiKey, model } = apiConfig;

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a professional subtitle translator. Translate the given English subtitle text to ${targetLang}. Output ONLY the translated text. Keep proper nouns (model names, library names) in English. Be concise for subtitle display.`,
      },
      { role: 'user', content: text },
    ],
  });

  const res = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body,
    },
    TIMEOUT_MS,
  );

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.code = ERROR_CODES.API_ERROR;
    throw err;
  }

  const data = await res.json();
  const translation = data.choices?.[0]?.message?.content?.trim();
  if (!translation) {
    const err = new Error('Empty response from API');
    err.code = ERROR_CODES.API_ERROR;
    throw err;
  }
  return { type: MSG_TYPES.TRANSLATE_RESULT, payload: { translation, cueId } };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MSG_TYPES.OPEN_OPTIONS) {
    chrome.runtime.openOptionsPage();
    return false;
  }

  if (message.type !== MSG_TYPES.TRANSLATE) return false;

  const { payload } = message;

  getApiConfig((apiConfig) => {
    if (!apiConfig.apiKey) {
      sendResponse({
        type: MSG_TYPES.TRANSLATE_ERROR,
        payload: { error: 'No API key configured', code: ERROR_CODES.NO_API_KEY },
      });
      return;
    }

    translate(payload, apiConfig)
      .then(sendResponse)
      .catch((err) => {
        const code = err.message === 'TIMEOUT' ? ERROR_CODES.TIMEOUT : err.code || ERROR_CODES.API_ERROR;
        sendResponse({
          type: MSG_TYPES.TRANSLATE_ERROR,
          payload: { error: err.message, code },
        });
      });
  });

  return true; // 保持 sendResponse 通道开放（异步响应）
});

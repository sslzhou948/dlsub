'use strict';

const { MSG_TYPES, ERROR_CODES } = require('./constants');

const VALID_TYPES = new Set(Object.values(MSG_TYPES));

/**
 * 构造翻译请求（Content Script → Service Worker）
 */
function createTranslateRequest({ text, targetLang, cueId }) {
  return { type: MSG_TYPES.TRANSLATE, payload: { text, targetLang, cueId } };
}

/**
 * 构造翻译成功响应（Service Worker → Content Script）
 */
function createTranslateResult({ translation, cueId }) {
  return { type: MSG_TYPES.TRANSLATE_RESULT, payload: { translation, cueId } };
}

/**
 * 构造翻译失败响应（Service Worker → Content Script）
 * @param {{ error: string, code: 'NO_API_KEY'|'API_ERROR'|'TIMEOUT' }} param
 */
function createTranslateError({ error, code }) {
  return { type: MSG_TYPES.TRANSLATE_ERROR, payload: { error, code } };
}

/**
 * 校验消息是否合法（用于 onMessage 入口防御）
 */
function isValidMessage(msg) {
  if (!msg || typeof msg !== 'object') return false;
  return VALID_TYPES.has(msg.type);
}

module.exports = { createTranslateRequest, createTranslateResult, createTranslateError, isValidMessage };

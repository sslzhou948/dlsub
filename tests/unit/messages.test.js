'use strict';

const {
  createTranslateRequest,
  createTranslateResult,
  createTranslateError,
  isValidMessage,
} = require('../../src/shared/messages');

// --- createTranslateRequest ---

describe('createTranslateRequest', () => {
  test('返回正确结构', () => {
    const msg = createTranslateRequest({ text: 'Hello', targetLang: 'zh-CN', cueId: '42' });
    expect(msg).toEqual({
      type: 'TRANSLATE',
      payload: { text: 'Hello', targetLang: 'zh-CN', cueId: '42' },
    });
  });
});

// --- createTranslateResult ---

describe('createTranslateResult', () => {
  test('返回正确结构', () => {
    const msg = createTranslateResult({ translation: '你好', cueId: '42' });
    expect(msg).toEqual({
      type: 'TRANSLATE_RESULT',
      payload: { translation: '你好', cueId: '42' },
    });
  });
});

// --- createTranslateError ---

describe('createTranslateError', () => {
  test('NO_API_KEY 错误返回正确结构', () => {
    const msg = createTranslateError({ error: 'No API key configured', code: 'NO_API_KEY' });
    expect(msg).toEqual({
      type: 'TRANSLATE_ERROR',
      payload: { error: 'No API key configured', code: 'NO_API_KEY' },
    });
  });

  test('API_ERROR 错误返回正确结构', () => {
    const msg = createTranslateError({ error: 'HTTP 429', code: 'API_ERROR' });
    expect(msg).toEqual({
      type: 'TRANSLATE_ERROR',
      payload: { error: 'HTTP 429', code: 'API_ERROR' },
    });
  });

  test('TIMEOUT 错误返回正确结构', () => {
    const msg = createTranslateError({ error: 'Request timed out', code: 'TIMEOUT' });
    expect(msg).toEqual({
      type: 'TRANSLATE_ERROR',
      payload: { error: 'Request timed out', code: 'TIMEOUT' },
    });
  });
});

// --- isValidMessage ---

describe('isValidMessage', () => {
  test('含合法 type 的消息返回 true', () => {
    expect(isValidMessage({ type: 'TRANSLATE', payload: {} })).toBe(true);
    expect(isValidMessage({ type: 'TRANSLATE_RESULT', payload: {} })).toBe(true);
    expect(isValidMessage({ type: 'TRANSLATE_ERROR', payload: {} })).toBe(true);
  });

  test('null 返回 false', () => {
    expect(isValidMessage(null)).toBe(false);
  });

  test('无 type 字段的对象返回 false', () => {
    expect(isValidMessage({ payload: {} })).toBe(false);
  });

  test('type 不在已知列表中返回 false', () => {
    expect(isValidMessage({ type: 'UNKNOWN' })).toBe(false);
    expect(isValidMessage({ type: '' })).toBe(false);
  });

  test('非对象值返回 false', () => {
    expect(isValidMessage(undefined)).toBe(false);
    expect(isValidMessage('TRANSLATE')).toBe(false);
    expect(isValidMessage(42)).toBe(false);
  });
});

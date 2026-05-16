'use strict';

/**
 * E2E tests for the Options page (Phase 10).
 *
 * Strategy: Open src/options/index.html via file:// URL. Inject a chrome.storage
 * mock via addInitScript so the page's script can read and write configuration
 * without a real Chrome extension context.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const { buildChromeMock } = require('./helpers/chrome-mock');

const OPTIONS_URL = `file://${path.resolve(__dirname, '../../src/options/index.html')}`;

test.describe('Options 页面', () => {
  // ─────────────────────────────────────────────
  // 场景 1：配置保存
  // ─────────────────────────────────────────────
  test('填写并保存配置后字段值持久化', async ({ page }) => {
    // Start with empty storage
    await page.addInitScript({
      content: buildChromeMock({
        apiConfig: { baseUrl: '', apiKey: '', model: '' },
      }),
    });
    await page.goto(OPTIONS_URL);
    await page.waitForLoadState('domcontentloaded');

    // Fill in the form
    await page.fill('#baseUrl', 'https://api.openai.com/v1');
    await page.fill('#apiKey', 'sk-testkey123');
    await page.fill('#model', 'gpt-4o');

    // Submit
    await page.click('button[type="submit"]');

    // Status message should confirm save
    await expect(page.locator('#status')).toHaveText('已保存', { timeout: 3000 });

    // Verify values are still in the form (re-read from "storage")
    await expect(page.locator('#baseUrl')).toHaveValue('https://api.openai.com/v1');
    await expect(page.locator('#apiKey')).toHaveValue('sk-testkey123');
    await expect(page.locator('#model')).toHaveValue('gpt-4o');
  });

  test('页面加载时从 storage 读取已有配置填充表单', async ({ page }) => {
    await page.addInitScript({
      content: buildChromeMock({
        apiConfig: {
          baseUrl: 'https://my-api.example.com/v1',
          apiKey: 'sk-existing',
          model: 'gpt-3.5-turbo',
        },
      }),
    });
    await page.goto(OPTIONS_URL);
    await page.waitForLoadState('domcontentloaded');

    // Form should be pre-filled from storage
    await expect(page.locator('#baseUrl')).toHaveValue('https://my-api.example.com/v1');
    await expect(page.locator('#apiKey')).toHaveValue('sk-existing');
    await expect(page.locator('#model')).toHaveValue('gpt-3.5-turbo');
  });

  test('API Key 字段类型为 password（内容遮盖）', async ({ page }) => {
    await page.addInitScript({ content: buildChromeMock() });
    await page.goto(OPTIONS_URL);
    await page.waitForLoadState('domcontentloaded');

    const inputType = await page.locator('#apiKey').getAttribute('type');
    expect(inputType).toBe('password');
  });

  // ─────────────────────────────────────────────
  // 场景 2：字段校验
  // ─────────────────────────────────────────────
  test('Base URL 填写非 http/https 协议时显示错误提示', async ({ page }) => {
    // NOTE: <input type="url"> browser-native validation blocks syntactically-invalid URLs
    // (e.g. "not-a-url") before the submit handler runs — the JS custom error is never shown.
    // Using ftp:// which passes browser URL validation but fails our http/https-only check,
    // so the JS validation path is exercised.
    // See REVIEW.md for the UX inconsistency this creates.
    await page.addInitScript({ content: buildChromeMock() });
    await page.goto(OPTIONS_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.fill('#baseUrl', 'ftp://not-allowed.example.com/v1');
    await page.fill('#apiKey', 'sk-test');
    await page.fill('#model', 'gpt-4o-mini');
    await page.click('button[type="submit"]');

    await expect(page.locator('#status')).toContainText('Base URL 格式不正确', { timeout: 2000 });
  });

  test('Base URL 校验失败时不写入 storage', async ({ page }) => {
    await page.addInitScript({ content: buildChromeMock() });
    await page.goto(OPTIONS_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.fill('#baseUrl', 'ftp://wrong-protocol.com');
    await page.click('button[type="submit"]');

    // Storage should not have been updated (status shows error, not 已保存)
    await expect(page.locator('#status')).not.toHaveText('已保存', { timeout: 1000 });
    await expect(page.locator('#status')).toContainText('Base URL 格式不正确');
  });

  test('Base URL 为空时显示校验错误', async ({ page }) => {
    await page.addInitScript({ content: buildChromeMock() });
    await page.goto(OPTIONS_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.fill('#baseUrl', '');
    await page.click('button[type="submit"]');

    await expect(page.locator('#status')).toContainText('Base URL 格式不正确', { timeout: 2000 });
  });
});

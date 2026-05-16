'use strict';

/**
 * E2E tests for subtitle display (Phase 10).
 *
 * Strategy: Load a local fixture HTML that mimics the Vidstack player DOM, inject a
 * chrome API mock via addInitScript, then load the built content.js bundle. Subtitle
 * cue mutations are triggered via page.evaluate(); assertions check the
 * .dlai-ext-translation overlay.
 *
 * Does NOT require a real deeplearning.ai session — the fixture page simulates the
 * exact same DOM selectors the content script relies on.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const { buildChromeMock } = require('./helpers/chrome-mock');

const FIXTURE_URL = `file://${path.resolve(__dirname, 'fixtures/mock-player.html')}`;
const CONTENT_JS  = path.resolve(__dirname, '../../dist/content.js');
const DEBOUNCE_MS = 300;

// CSS class names from src/shared/constants.js
const OVERLAY_SEL     = '.dlai-ext-translation';
const TOGGLE_BTN_SEL  = '.dlai-ext-toggle-btn';
const CONTROL_PANEL_SEL = '.dlai-ext-control-panel';

// Wait long enough for debounce + script evaluation
const TRANSLATE_TIMEOUT = 3000;

test.describe('字幕翻译叠加层', () => {
  // Each test gets a fresh page with the chrome mock pre-installed
  test.beforeEach(async ({ page }) => {
    // Inject chrome mock before any page scripts run
    await page.addInitScript({ content: buildChromeMock() });
    await page.goto(FIXTURE_URL);
    // Inject the built content script (App.init() runs immediately)
    await page.addScriptTag({ path: CONTENT_JS });
    // Wait for the overlay element to exist in DOM.
    // The div starts empty (zero height), so use state:'attached' not 'visible'.
    await page.waitForSelector(OVERLAY_SEL, { timeout: 5000, state: 'attached' });
  });

  // ─────────────────────────────────────────────
  // 场景 1：正常翻译流程
  // ─────────────────────────────────────────────
  test('字幕出现后翻译叠加层显示译文', async ({ page }) => {
    // Trigger a subtitle cue in the fixture DOM
    await page.evaluate(() => window.showSubtitle('Hello world', '1'));

    // Wait for debounce + async translation response
    const overlay = page.locator(OVERLAY_SEL);
    await expect(overlay).toHaveText('[译] Hello world', { timeout: TRANSLATE_TIMEOUT });
  });

  test('字幕消失后叠加层文本清空', async ({ page }) => {
    await page.evaluate(() => window.showSubtitle('First cue', '1'));
    const overlay = page.locator(OVERLAY_SEL);
    await expect(overlay).toHaveText('[译] First cue', { timeout: TRANSLATE_TIMEOUT });

    // Remove subtitle cue
    await page.evaluate(() => window.clearSubtitle());
    await expect(overlay).toHaveText('', { timeout: TRANSLATE_TIMEOUT });
  });

  // ─────────────────────────────────────────────
  // 场景 2：翻译开关
  // ─────────────────────────────────────────────
  test('关闭翻译开关后叠加层隐藏', async ({ page }) => {
    await page.evaluate(() => window.showSubtitle('Toggle test', '2'));
    const overlay = page.locator(OVERLAY_SEL);
    await expect(overlay).toHaveText('[译] Toggle test', { timeout: TRANSLATE_TIMEOUT });

    // Open control panel
    await page.waitForSelector(TOGGLE_BTN_SEL);
    await page.click(TOGGLE_BTN_SEL);
    await page.waitForSelector(CONTROL_PANEL_SEL + ':visible');

    // Uncheck the "enabled" checkbox
    await page.locator('[data-setting="enabled"]').uncheck();

    // Overlay should be hidden (display:none)
    await expect(overlay).toBeHidden();
  });

  test('重新开启翻译开关后叠加层恢复可见', async ({ page }) => {
    // First show a subtitle so the overlay has text (and non-zero dimensions)
    await page.evaluate(() => window.showSubtitle('Toggle restore test', '5'));
    const overlay = page.locator(OVERLAY_SEL);
    await expect(overlay).toHaveText('[译] Toggle restore test', { timeout: TRANSLATE_TIMEOUT });

    // Open panel and disable translation
    await page.waitForSelector(TOGGLE_BTN_SEL);
    await page.click(TOGGLE_BTN_SEL);
    await page.waitForSelector(CONTROL_PANEL_SEL + ':visible');
    await page.locator('[data-setting="enabled"]').uncheck();
    await expect(overlay).toBeHidden();

    // Re-enable — overlay should become visible again (text still there)
    await page.locator('[data-setting="enabled"]').check();
    await expect(overlay).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // 场景 3：字体大小切换
  // ─────────────────────────────────────────────
  test('切换字体大小后 CSS 变量更新', async ({ page }) => {
    await page.waitForSelector(TOGGLE_BTN_SEL);
    await page.click(TOGGLE_BTN_SEL);
    await page.waitForSelector(CONTROL_PANEL_SEL + ':visible');

    // Switch to "large"
    await page.locator('[data-setting="fontSize"]').selectOption('large');

    const overlay = page.locator(OVERLAY_SEL);
    const fontSize = await overlay.evaluate(el => el.style.getPropertyValue('--dlai-font-size'));
    expect(fontSize).toBe('large');
  });

});

// Separate describe block for "no API key" scenario (needs different chrome mock)
test.describe('未配置 API Key 场景', () => {
  test('控制面板显示"未配置 API Key"警告并有"前往设置"按钮', async ({ page }) => {
    await page.addInitScript({
      content: buildChromeMock({
        apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' },
      }),
    });
    await page.goto(FIXTURE_URL);
    await page.addScriptTag({ path: CONTENT_JS });
    await page.waitForSelector(OVERLAY_SEL, { timeout: 5000, state: 'attached' });

    // Open the control panel
    await page.waitForSelector(TOGGLE_BTN_SEL);
    await page.click(TOGGLE_BTN_SEL);

    // Warning should appear in the panel
    const warning = page.locator('.dlai-ext-no-key-warning');
    await expect(warning).toContainText('API Key', { timeout: 3000 });

    // "前往设置" button should be present
    await expect(warning.locator('button')).toContainText('前往设置');
  });

  test('切换按钮上显示 ! 徽标', async ({ page }) => {
    await page.addInitScript({
      content: buildChromeMock({
        apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' },
      }),
    });
    await page.goto(FIXTURE_URL);
    await page.addScriptTag({ path: CONTENT_JS });
    await page.waitForSelector(TOGGLE_BTN_SEL, { timeout: 5000 });

    const badge = page.locator('.dlai-ext-no-key-badge');
    await expect(badge).toBeAttached({ timeout: 3000 });
    await expect(badge).toHaveText('!');
  });

  test('有字幕但叠加层保持空白（无 API Key 不发起翻译）', async ({ page }) => {
    await page.addInitScript({
      content: buildChromeMock({
        apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' },
      }),
    });
    await page.goto(FIXTURE_URL);
    await page.addScriptTag({ path: CONTENT_JS });
    await page.waitForSelector(OVERLAY_SEL, { timeout: 5000, state: 'attached' });

    await page.evaluate(() => window.showSubtitle('No key test', '99'));
    await page.waitForTimeout(DEBOUNCE_MS + 200);
    await expect(page.locator(OVERLAY_SEL)).toHaveText('');
  });
});

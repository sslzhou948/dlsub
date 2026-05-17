/**
 * Extension debug script — launches Chrome with the extension loaded,
 * navigates to deeplearning.ai, and reports diagnostic info.
 *
 * Usage: node tests/debug/inspect-extension.js [course-url]
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../');
const DEFAULT_URL = 'https://learn.deeplearning.ai';
const TARGET_URL = process.argv[2] || DEFAULT_URL;

(async () => {
  console.log('🚀 Launching Chrome with extension:', EXTENSION_PATH);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
    ],
  });

  const page = await context.newPage();

  // Capture console messages from the page (includes content script logs)
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (text.includes('dlai') || type === 'error' || type === 'warn') {
      console.log(`[page:${type}]`, text);
    }
  });

  page.on('pageerror', err => {
    console.error('[page:error]', err.message);
  });

  console.log(`\n📄 Navigating to: ${TARGET_URL}\n`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait a bit for SPA to settle
  await page.waitForTimeout(3000);

  // Run diagnostics
  const diag = await page.evaluate(() => {
    const selectors = {
      captionsRoot: '.vds-captions[data-part="captions"]',
      cueDisplay:   '[data-part="cue-display"]',
      cue:          '[data-part="cue"]',
      controlsGroup: '.vds-controls-group',
      captionButton: '.vds-caption-button',
      videoPlayer:   '[aria-label="Video Player"]',
    };

    const results = {};
    for (const [name, sel] of Object.entries(selectors)) {
      const el = document.querySelector(sel);
      results[name] = el
        ? `✅ FOUND  (tag=${el.tagName.toLowerCase()}, classes="${el.className}")`
        : `❌ NOT FOUND`;
    }

    // Check if our extension injected anything
    results['ext_toggle_btn']   = document.querySelector('.dlai-ext-toggle-btn')   ? '✅ injected' : '❌ not found';
    results['ext_translation']  = document.querySelector('.dlai-ext-translation')  ? '✅ injected' : '❌ not found';
    results['ext_control_panel']= document.querySelector('.dlai-ext-control-panel')? '✅ injected' : '❌ not found';

    // List ALL vds-* classes found on page (helps identify correct selectors)
    const allEls = document.querySelectorAll('*');
    const vdsClasses = new Set();
    for (const el of allEls) {
      for (const cls of el.classList) {
        if (cls.startsWith('vds-')) vdsClasses.add(cls);
      }
    }
    results['vds_classes_found'] = [...vdsClasses].sort().join(', ') || '(none)';

    return results;
  });

  console.log('\n─── DIAGNOSTIC RESULTS ───────────────────────────────────');
  for (const [key, val] of Object.entries(diag)) {
    if (key === 'vds_classes_found') continue;
    console.log(`  ${key.padEnd(22)} ${val}`);
  }
  console.log('\n─── VDS CLASSES ON PAGE ───────────────────────────────────');
  console.log(' ', diag.vds_classes_found || '(none — player may not have loaded yet)');
  console.log('───────────────────────────────────────────────────────────\n');

  console.log('Browser is open. Navigate to a course video page manually.');
  console.log('Press Ctrl+C when done.\n');

  // Keep browser open for manual inspection
  await new Promise(() => {});
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

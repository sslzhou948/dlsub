/**
 * 远程 CDP 调试脚本
 * 连接到本地笔记本上运行的 Chrome（通过 SSH 隧道暴露到 localhost:9222）
 *
 * 前置条件：
 *   1. 本地 Chrome 以 --remote-debugging-port=9222 --load-extension=... 启动
 *   2. SSH 隧道已建立（本地 9222 → 开发服务器 localhost:9222）
 *
 * 用法：
 *   node tests/debug/remote-cdp-debug.js
 */

const { chromium } = require('@playwright/test');

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const COURSE_URL = 'https://learn.deeplearning.ai/courses/ai-python-for-beginners/lesson/z57gn/introduction';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log(`\n🔌 Connecting to Chrome via CDP: ${CDP_URL}\n`);

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (e) {
    console.error('❌ 连接失败:', e.message);
    console.error('   请确认：');
    console.error('   1. 本地 Chrome 已用 --remote-debugging-port=9222 启动');
    console.error('   2. SSH 隧道已建立 (ssh -R 9222:localhost:9222 ...)');
    process.exit(1);
  }

  console.log('✅ 已连接到 Chrome');
  const contexts = browser.contexts();
  console.log(`   已有 ${contexts.length} 个 context`);

  // 用已有 context 或新建
  const ctx = contexts[0] || await browser.newContext();
  const pages = ctx.pages();
  let page = pages.find(p => p.url().includes('deeplearning.ai')) || pages[0];

  if (!page) {
    page = await ctx.newPage();
  }

  // 监听控制台（含 content script 输出）
  page.on('console', msg => {
    const text = msg.text();
    // 过滤无关噪音
    if (msg.type() === 'error' || text.toLowerCase().includes('dlai') || text.includes('translate')) {
      console.log(`  [console:${msg.type()}] ${text.slice(0, 200)}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`  [page error] ${err.message}`);
  });

  // 导航到视频页
  console.log(`\n📄 导航到课程页面...`);
  await page.goto(COURSE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('   等待播放器加载（3s）...');
  await sleep(3000);

  // ── 诊断 ──────────────────────────────────────────────────────────────────
  console.log('\n─── 诊断结果 ────────────────────────────────────────────────');

  const diag = await page.evaluate(() => {
    const check = sel => {
      const el = document.querySelector(sel);
      if (!el) return '❌ NOT FOUND';
      return `✅ ${el.tagName.toLowerCase()} aria-hidden=${el.getAttribute('aria-hidden')} class="${el.className.slice(0, 60)}"`;
    };
    return {
      'vds-captions':         check('.vds-captions[data-part="captions"]'),
      'vds-controls-group':   check('.vds-controls-group'),
      'vds-caption-button':   check('.vds-caption-button'),
      '--- 插件注入 ---':     '---',
      'dlai-ext-toggle-btn':  check('.dlai-ext-toggle-btn'),
      'dlai-ext-translation': check('.dlai-ext-translation'),
      'dlai-ext-control-panel': check('.dlai-ext-control-panel'),
    };
  });

  for (const [k, v] of Object.entries(diag)) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }

  // ── Chrome Storage 中的 API 配置 ──────────────────────────────────────────
  console.log('\n─── Chrome Storage (apiConfig) ──────────────────────────────');
  const storageData = await page.evaluate(() =>
    new Promise(resolve =>
      chrome.storage.sync.get(['apiConfig', 'displayConfig'], resolve)
    )
  );
  console.log('  apiConfig:', JSON.stringify({
    ...storageData.apiConfig,
    apiKey: storageData.apiConfig?.apiKey ? '***（已设置）' : '（未设置）',
  }, null, 2));
  console.log('  displayConfig:', JSON.stringify(storageData.displayConfig, null, 2));

  // ── 测试翻译流程（手动触发） ──────────────────────────────────────────────
  console.log('\n─── 模拟翻译请求 ─────────────────────────────────────────────');
  const translateResult = await page.evaluate(() =>
    new Promise(resolve => {
      chrome.runtime.sendMessage(
        { type: 'TRANSLATE', payload: { text: 'Hello world', targetLang: 'zh-CN', cueId: 'test-0' } },
        response => {
          resolve(response || { error: chrome.runtime.lastError?.message || 'no response' });
        }
      );
      setTimeout(() => resolve({ error: 'timeout after 10s' }), 10000);
    })
  );
  console.log('  翻译结果:', JSON.stringify(translateResult, null, 2));

  console.log('\n✅ 诊断完成。浏览器保持连接，你可以继续手动操作。');
  console.log('   按 Ctrl+C 退出。\n');

  // 保持连接
  await new Promise(() => {});
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    headless: true,
    // file:// URLs don't need a baseURL
    actionTimeout: 10000,
  },
  // Run test files in parallel for speed
  fullyParallel: true,
  // Show one retry on CI to reduce flakiness from debounce timing
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
});

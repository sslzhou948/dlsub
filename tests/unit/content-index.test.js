'use strict';

// content/index.js 是胶水层，单元测试只覆盖 SPA 路由切换逻辑。
// 所有子模块（SubtitleObserver、TranslationOverlay、ControlPanel）用 jest.mock 替代。

jest.mock('../../src/content/subtitle-observer', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  }));
});

jest.mock('../../src/content/translation-overlay', () => {
  return jest.fn().mockImplementation(() => ({
    setText: jest.fn(),
    hide: jest.fn(),
    show: jest.fn(),
    setPosition: jest.fn(),
    setFontSize: jest.fn(),
  }));
});

jest.mock('../../src/content/control-panel', () => {
  return jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    destroy: jest.fn(),
  }));
});

jest.mock('../../src/content/translation-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    clear: jest.fn(),
  }));
});

jest.mock('../../src/content/prefetch-queue', () => {
  return jest.fn().mockImplementation(() => ({
    trigger: jest.fn(),
    clear: jest.fn(),
  }));
});

const { resetChromeMock } = require('./helpers/chrome-mock');

let App;
let SubtitleObserver;
let TranslationCache;

beforeEach(() => {
  resetChromeMock();
  jest.resetModules();

  // 重新应用 mock（resetModules 会清除）；方法挂在 this 上，instances[] 才能访问
  jest.mock('../../src/content/subtitle-observer', () =>
    jest.fn().mockImplementation(function () {
      this.start = jest.fn();
      this.stop = jest.fn();
    }),
  );
  jest.mock('../../src/content/translation-overlay', () =>
    jest.fn().mockImplementation(function () {
      this.setText = jest.fn();
      this.setError = jest.fn();
      this.hide = jest.fn();
      this.show = jest.fn();
      this.setPosition = jest.fn();
      this.setFontSize = jest.fn();
      this.destroy = jest.fn();
    }),
  );
  jest.mock('../../src/content/control-panel', () =>
    jest.fn().mockImplementation(function () {
      this.init = jest.fn();
      this.destroy = jest.fn();
      this.showNoKeyWarning = jest.fn();
    }),
  );
  jest.mock('../../src/content/translation-cache', () =>
    jest.fn().mockImplementation(function () {
      this.get = jest.fn().mockReturnValue(null);
      this.set = jest.fn();
      this.clear = jest.fn();
    }),
  );
  jest.mock('../../src/content/prefetch-queue', () =>
    jest.fn().mockImplementation(function () {
      this.trigger = jest.fn();
      this.clear = jest.fn();
    }),
  );

  document.body.innerHTML = `
    <div class="vds-captions" data-part="captions"></div>
    <div class="vds-controls-group"></div>
  `;

  App = require('../../src/content/index');
  SubtitleObserver = require('../../src/content/subtitle-observer');
  TranslationCache = require('../../src/content/translation-cache');
});

afterEach(() => {
  // 清理 popstate 监听器等副作用
  if (App && App._cleanup) App._cleanup();
});

describe('初始化', () => {
  test('init() 启动 SubtitleObserver', () => {
    const app = new App();
    app.init();
    const instance = SubtitleObserver.mock.instances[0];
    expect(instance.start).toHaveBeenCalled();
  });
});

describe('API Key 未配置', () => {
  test('apiKey 为空时调用 ControlPanel.showNoKeyWarning', () => {
    const { seedStore } = require('./helpers/chrome-mock');
    seedStore({
      apiConfig: { baseUrl: '', apiKey: '', model: 'gpt-4o-mini' },
      displayConfig: { enabled: true, fontSize: 'medium', position: 'below', targetLang: 'zh-CN' },
    });

    const app = new App();
    app.init();

    const ControlPanel = require('../../src/content/control-panel');
    const panel = ControlPanel.mock.instances[0];
    expect(panel.showNoKeyWarning).toHaveBeenCalledTimes(1);
  });

  test('apiKey 已配置时不调用 showNoKeyWarning', () => {
    const { seedStore } = require('./helpers/chrome-mock');
    seedStore({
      apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' },
      displayConfig: { enabled: true, fontSize: 'medium', position: 'below', targetLang: 'zh-CN' },
    });

    const app = new App();
    app.init();

    const ControlPanel = require('../../src/content/control-panel');
    const panel = ControlPanel.mock.instances[0];
    expect(panel.showNoKeyWarning).not.toHaveBeenCalled();
  });
});

describe('CC 未开启提示', () => {
  test('captions 元素 aria-hidden="true" 时，overlay.setText 显示提示文字', () => {
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions" aria-hidden="true"></div>
      <div class="vds-controls-group"></div>
      <button class="vds-caption-button"></button>
    `;
    const app = new App();
    app.init();
    const TranslationOverlay = require('../../src/content/translation-overlay');
    const overlay = TranslationOverlay.mock.instances[0];
    expect(overlay.setText).toHaveBeenCalledWith(expect.stringContaining('CC'));
  });

  test('captions 元素 aria-hidden="false" 时，不显示 CC 提示', () => {
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions" aria-hidden="false"></div>
      <div class="vds-controls-group"></div>
    `;
    const app = new App();
    app.init();
    const TranslationOverlay = require('../../src/content/translation-overlay');
    const overlay = TranslationOverlay.mock.instances[0];
    expect(overlay.setText).not.toHaveBeenCalled();
  });

  test('点击 CC 按钮后，提示被清除（overlay.setText 以空字符串调用）', () => {
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions" aria-hidden="true"></div>
      <div class="vds-controls-group"></div>
      <button class="vds-caption-button"></button>
    `;
    const app = new App();
    app.init();
    const TranslationOverlay = require('../../src/content/translation-overlay');
    const overlay = TranslationOverlay.mock.instances[0];

    // 模拟用户点击 CC 按钮
    document.querySelector('.vds-caption-button').click();
    expect(overlay.setText).toHaveBeenLastCalledWith('');
  });
});

describe('SPA 路由切换', () => {
  test('URL 变化时调用 reset（stop 旧 observer + 清空 cache）', () => {
    const app = new App();
    app.init();

    const observerInstance = SubtitleObserver.mock.instances[0];
    const cacheInstance = TranslationCache.mock.instances[0];

    // 模拟 URL 变化
    app._onRouteChange();

    expect(observerInstance.stop).toHaveBeenCalled();
    expect(cacheInstance.clear).toHaveBeenCalled();
  });

  test('reset 后重新启动新的 SubtitleObserver', () => {
    const app = new App();
    app.init();

    app._onRouteChange();

    // 第二个 SubtitleObserver 实例应被创建并 start
    const instances = SubtitleObserver.mock.instances;
    expect(instances.length).toBeGreaterThanOrEqual(2);
    const newInstance = instances[instances.length - 1];
    expect(newInstance.start).toHaveBeenCalled();
  });

  test('路由切换时调用旧 ControlPanel 的 destroy()', () => {
    const app = new App();
    app.init();
    const ControlPanel = require('../../src/content/control-panel');
    const oldPanel = ControlPanel.mock.instances[0];
    app._onRouteChange();
    expect(oldPanel.destroy).toHaveBeenCalled();
  });

  test('路由切换时调用旧 TranslationOverlay 的 destroy()', () => {
    const app = new App();
    app.init();
    const TranslationOverlay = require('../../src/content/translation-overlay');
    const oldOverlay = TranslationOverlay.mock.instances[0];
    app._onRouteChange();
    expect(oldOverlay.destroy).toHaveBeenCalled();
  });
});

describe('前往设置按钮', () => {
  test('点击"前往设置"时发送 OPEN_OPTIONS 消息到 Service Worker', () => {
    const { seedStore } = require('./helpers/chrome-mock');
    seedStore({
      apiConfig: { baseUrl: '', apiKey: '', model: 'gpt-4o-mini' },
      displayConfig: { enabled: true, fontSize: 'medium', position: 'below', targetLang: 'zh-CN' },
    });

    const app = new App();
    app.init();

    const ControlPanel = require('../../src/content/control-panel');
    const panel = ControlPanel.mock.instances[0];

    // 模拟用户点击"前往设置"按钮
    const onAction = panel.showNoKeyWarning.mock.calls[0][0];
    onAction();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OPEN_OPTIONS' }),
    );
  });
});

describe('翻译 API 失败处理', () => {
  test('TRANSLATE_ERROR 响应时调用 overlay.setError', () => {
    const { seedStore } = require('./helpers/chrome-mock');
    seedStore({
      apiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' },
      displayConfig: { enabled: true, fontSize: 'medium', position: 'below', targetLang: 'zh-CN' },
    });

    chrome.runtime.sendMessage.mockImplementation((_msg, callback) => {
      callback({ type: 'TRANSLATE_ERROR', payload: { error: 'HTTP 401', code: 'API_ERROR' } });
    });

    const app = new App();
    app.init();

    // 触发 onSubtitle 回调
    const observerConstructorArgs = SubtitleObserver.mock.calls[0][0];
    observerConstructorArgs.onSubtitle('Hello world', '1');

    const TranslationOverlay = require('../../src/content/translation-overlay');
    const overlay = TranslationOverlay.mock.instances[0];
    expect(overlay.setError).toHaveBeenCalledTimes(1);
    expect(overlay.setError).toHaveBeenCalledWith(expect.any(String));
  });
});

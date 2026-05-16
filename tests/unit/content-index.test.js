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
      this.hide = jest.fn();
      this.show = jest.fn();
      this.setPosition = jest.fn();
      this.setFontSize = jest.fn();
    }),
  );
  jest.mock('../../src/content/control-panel', () =>
    jest.fn().mockImplementation(function () {
      this.init = jest.fn();
      this.destroy = jest.fn();
    }),
  );
  jest.mock('../../src/content/translation-cache', () =>
    jest.fn().mockImplementation(function () {
      this.get = jest.fn().mockReturnValue(null);
      this.set = jest.fn();
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
});

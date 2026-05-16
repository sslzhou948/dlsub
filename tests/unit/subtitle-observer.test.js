'use strict';

// jsdom 没有完整的 MutationObserver，但 Jest jsdom 环境已内置。
// 使用 jest.useFakeTimers() 控制防抖延迟。

let SubtitleObserver;

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  SubtitleObserver = require('../../src/content/subtitle-observer');
  // 清空 DOM
  document.body.innerHTML = '';
});

afterEach(() => {
  jest.useRealTimers();
});

// 辅助：等待 MutationObserver 回调（microtask）执行完毕
// MutationObserver 在 jsdom 中通过 microtask 触发，Promise.resolve() 即可刷新
function flushMutations() {
  return Promise.resolve();
}

// ---

describe('.vds-captions 已存在且已有字幕内容', () => {
  test('start() 时立即触发 onSubtitle 回调', () => {
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions">
        <div data-part="cue-display">
          <div data-part="cue" data-id="5">Already here</div>
        </div>
      </div>
    `;
    const onSubtitle = jest.fn();
    const observer = new SubtitleObserver({ onSubtitle, onSubtitleClear: jest.fn() });
    observer.start();
    jest.advanceTimersByTime(300);
    expect(onSubtitle).toHaveBeenCalledWith('Already here', '5');
  });
});

describe('.vds-captions 不存在时', () => {
  test('start() 不抛出异常', () => {
    const observer = new SubtitleObserver({ onSubtitle: jest.fn(), onSubtitleClear: jest.fn() });
    expect(() => observer.start()).not.toThrow();
  });

  test('字幕节点出现后开始监听', async () => {
    const onSubtitle = jest.fn();
    const observer = new SubtitleObserver({ onSubtitle, onSubtitleClear: jest.fn() });
    observer.start();

    // 此时 DOM 中没有 .vds-captions，onSubtitle 不应被调用
    jest.advanceTimersByTime(500);
    expect(onSubtitle).not.toHaveBeenCalled();

    // 动态插入 .vds-captions + cue 节点
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions">
        <div data-part="cue-display">
          <div data-part="cue" data-id="1">Hello world</div>
        </div>
      </div>
    `;
    await flushMutations();
    jest.advanceTimersByTime(300);

    expect(onSubtitle).toHaveBeenCalledWith('Hello world', '1');
  });
});

describe('字幕防抖', () => {
  test('300ms 内多次 DOM 变化只触发一次回调', async () => {
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions"></div>
    `;
    const captionsEl = document.querySelector('.vds-captions');
    const onSubtitle = jest.fn();
    const observer = new SubtitleObserver({ onSubtitle, onSubtitleClear: jest.fn() });
    observer.start();
    await flushMutations();

    // 短时间内多次变化
    captionsEl.innerHTML = `<div data-part="cue-display"><div data-part="cue" data-id="1">Line 1</div></div>`;
    await flushMutations();
    jest.advanceTimersByTime(100);

    captionsEl.innerHTML = `<div data-part="cue-display"><div data-part="cue" data-id="2">Line 2</div></div>`;
    await flushMutations();
    jest.advanceTimersByTime(100);

    captionsEl.innerHTML = `<div data-part="cue-display"><div data-part="cue" data-id="3">Line 3</div></div>`;
    await flushMutations();

    // 300ms 还未到，不应触发
    expect(onSubtitle).not.toHaveBeenCalled();

    // 推进到 300ms，触发一次（最后的状态）
    jest.advanceTimersByTime(300);
    expect(onSubtitle).toHaveBeenCalledTimes(1);
    expect(onSubtitle).toHaveBeenCalledWith('Line 3', '3');
  });
});

describe('字幕消失', () => {
  test('.vds-captions 清空时触发 onSubtitleClear', async () => {
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions">
        <div data-part="cue-display">
          <div data-part="cue" data-id="1">Hello</div>
        </div>
      </div>
    `;
    const captionsEl = document.querySelector('.vds-captions');
    const onSubtitleClear = jest.fn();
    const observer = new SubtitleObserver({ onSubtitle: jest.fn(), onSubtitleClear });
    observer.start();
    await flushMutations();

    // 清空字幕节点
    captionsEl.innerHTML = '';
    await flushMutations();
    jest.advanceTimersByTime(300);

    expect(onSubtitleClear).toHaveBeenCalledTimes(1);
  });
});

describe('stop()', () => {
  test('stop() 后 DOM 变化不再触发回调', async () => {
    document.body.innerHTML = `
      <div class="vds-captions" data-part="captions"></div>
    `;
    const captionsEl = document.querySelector('.vds-captions');
    const onSubtitle = jest.fn();
    const observer = new SubtitleObserver({ onSubtitle, onSubtitleClear: jest.fn() });
    observer.start();
    await flushMutations();

    observer.stop();

    captionsEl.innerHTML = `<div data-part="cue-display"><div data-part="cue" data-id="1">Hello</div></div>`;
    await flushMutations();
    jest.advanceTimersByTime(300);

    expect(onSubtitle).not.toHaveBeenCalled();
  });
});

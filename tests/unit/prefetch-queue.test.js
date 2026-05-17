'use strict';

// PrefetchQueue 不依赖 chrome.*，不需要 chrome-mock

let PrefetchQueue;

// 辅助：构造伪 videoEl，cues 为 [{ id, text, startTime }]
function makeVideoEl(cues, trackOpts = {}) {
  const track = {
    kind: trackOpts.kind || 'subtitles',
    mode: trackOpts.mode || 'showing',
    cues: trackOpts.cues !== undefined ? trackOpts.cues : makeCueList(cues),
  };
  return {
    textTracks: makeTrackList([track]),
    currentTime: trackOpts.currentTime || 0,
  };
}

function makeCueList(cues) {
  if (!cues) return null;
  // TextTrackCueList-like：iterable + length
  const list = cues.map((c) => ({
    id: String(c.id),
    text: c.text,
    startTime: c.startTime,
    endTime: c.endTime || c.startTime + 2,
  }));
  list[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(list);
  return list;
}

function makeTrackList(tracks) {
  const list = [...tracks];
  list[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(list);
  return list;
}

// 辅助：cacheKey 格式（与 TranslationCache._key 一致）
function cacheKey(cueId, text) {
  return `${cueId}\x00${text}`;
}

// 辅助：等待所有 microtask / promise 完成
function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  jest.resetModules();
  PrefetchQueue = require('../../src/content/prefetch-queue');
});

// ---

describe('PrefetchQueue — 构造函数', () => {
  test('使用默认 lookahead 实例化不抛出', () => {
    expect(() => {
      new PrefetchQueue({
        cache: { get: jest.fn(), set: jest.fn() },
        requestTranslation: jest.fn(),
      });
    }).not.toThrow();
  });

  test('lookahead 可通过参数覆盖', () => {
    const pq = new PrefetchQueue({
      cache: { get: jest.fn(), set: jest.fn() },
      requestTranslation: jest.fn(),
      lookahead: 5,
    });
    expect(pq._lookahead).toBe(5);
  });
});

// ---

describe('PrefetchQueue — trigger：videoEl 异常情况', () => {
  let mockRequestTranslation;

  beforeEach(() => {
    mockRequestTranslation = jest.fn().mockResolvedValue('译文');
  });

  test('videoEl 为 null 时不调用 requestTranslation', async () => {
    const pq = new PrefetchQueue({
      cache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
      requestTranslation: mockRequestTranslation,
    });
    pq.trigger('1', null);
    await flushPromises();
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });

  test('textTracks 为空列表时不调用 requestTranslation', async () => {
    const videoEl = { textTracks: makeTrackList([]), currentTime: 0 };
    const pq = new PrefetchQueue({
      cache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
      requestTranslation: mockRequestTranslation,
    });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });

  test('track.cues 为 null（mode=disabled）时不调用 requestTranslation', async () => {
    const videoEl = makeVideoEl([], { cues: null });
    const pq = new PrefetchQueue({
      cache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
      requestTranslation: mockRequestTranslation,
    });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });
});

// ---

describe('PrefetchQueue — trigger：track 选择', () => {
  let mockRequestTranslation;

  beforeEach(() => {
    mockRequestTranslation = jest.fn().mockResolvedValue('译文');
  });

  test('优先选择 mode=showing 的 track', async () => {
    const cues = [
      { id: '1', text: 'Hello', startTime: 0 },
      { id: '2', text: 'World', startTime: 2 },
    ];
    const disabledTrack = {
      kind: 'subtitles',
      mode: 'disabled',
      cues: null,
    };
    const showingTrack = {
      kind: 'subtitles',
      mode: 'showing',
      cues: makeCueList(cues),
    };
    const videoEl = {
      textTracks: makeTrackList([disabledTrack, showingTrack]),
      currentTime: 0,
    };
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequestTranslation });
    pq.trigger('1', videoEl);
    await flushPromises();
    // 应从 showingTrack 里找到 cue '2' 并预翻译
    expect(mockRequestTranslation).toHaveBeenCalledWith('World', '2');
  });

  test('无 showing track 时回退到 kind=subtitles 且 mode≠disabled 的 track', async () => {
    const cues = [
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ];
    const hiddenTrack = {
      kind: 'subtitles',
      mode: 'hidden',
      cues: makeCueList(cues),
    };
    const videoEl = {
      textTracks: makeTrackList([hiddenTrack]),
      currentTime: 0,
    };
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequestTranslation });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).toHaveBeenCalledWith('B', '2');
  });
});

// ---

describe('PrefetchQueue — trigger：cue 定位', () => {
  let mockCache;
  let mockRequestTranslation;

  beforeEach(() => {
    mockCache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    mockRequestTranslation = jest.fn().mockResolvedValue('译文');
  });

  test('currentCueId 未匹配到任何 cue 时不调用 requestTranslation', async () => {
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache: mockCache, requestTranslation: mockRequestTranslation });
    pq.trigger('999', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });

  test('当前 cue 是最后一条时没有后续 cue，不调用 requestTranslation', async () => {
    const videoEl = makeVideoEl([{ id: '1', text: 'Only one', startTime: 0 }]);
    const pq = new PrefetchQueue({ cache: mockCache, requestTranslation: mockRequestTranslation });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });

  test('正确取当前 cue 之后 lookahead=2 条', async () => {
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
      { id: '3', text: 'C', startTime: 4 },
      { id: '4', text: 'D', startTime: 6 },
    ]);
    const pq = new PrefetchQueue({
      cache: mockCache,
      requestTranslation: mockRequestTranslation,
      lookahead: 2,
    });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).toHaveBeenCalledTimes(2);
    expect(mockRequestTranslation).toHaveBeenCalledWith('B', '2');
    expect(mockRequestTranslation).toHaveBeenCalledWith('C', '3');
    expect(mockRequestTranslation).not.toHaveBeenCalledWith('D', '4');
  });

  test('剩余 cue 不足 lookahead 条时只取实际有的', async () => {
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({
      cache: mockCache,
      requestTranslation: mockRequestTranslation,
      lookahead: 3,
    });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).toHaveBeenCalledTimes(1);
    expect(mockRequestTranslation).toHaveBeenCalledWith('B', '2');
  });
});

// ---

describe('PrefetchQueue — trigger：cache 命中跳过', () => {
  let mockRequestTranslation;

  beforeEach(() => {
    mockRequestTranslation = jest.fn().mockResolvedValue('译文');
  });

  test('后续 cue 已在 cache 中时不调用 requestTranslation', async () => {
    const cache = {
      get: jest.fn((cueId, text) => (cueId === '2' ? '已有译文' : null)),
      set: jest.fn(),
    };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequestTranslation });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).not.toHaveBeenCalled();
  });

  test('部分命中 cache：只对未命中的调用 requestTranslation', async () => {
    const cache = {
      get: jest.fn((cueId) => (cueId === '2' ? '已有译文' : null)),
      set: jest.fn(),
    };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
      { id: '3', text: 'C', startTime: 4 },
    ]);
    const pq = new PrefetchQueue({
      cache,
      requestTranslation: mockRequestTranslation,
      lookahead: 3,
    });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).toHaveBeenCalledTimes(1);
    expect(mockRequestTranslation).toHaveBeenCalledWith('C', '3');
  });
});

// ---

describe('PrefetchQueue — trigger：in-flight 去重', () => {
  test('第一次请求未完成时再次 trigger，不重复发出 requestTranslation', async () => {
    let resolveFn;
    const slowRequest = jest.fn(
      () => new Promise((resolve) => { resolveFn = resolve; })
    );
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: slowRequest });

    pq.trigger('1', videoEl); // 第一次，发起请求
    pq.trigger('1', videoEl); // 第二次，应被 in-flight 拦截
    await flushPromises();

    expect(slowRequest).toHaveBeenCalledTimes(1);
    resolveFn('译文'); // 清理
  });

  test('请求 resolve 后，再次 trigger 会重新发起（in-flight 已清除）', async () => {
    const mockRequest = jest.fn().mockResolvedValue('译文');
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequest });

    pq.trigger('1', videoEl);
    await flushPromises(); // resolve，in-flight 清除

    // resolve 后 cache.get 对 '2'/'B' 仍返回 null（模拟 cache 未命中，重新请求）
    pq.trigger('1', videoEl);
    await flushPromises();

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  test('请求 reject 后，再次 trigger 会重新发起（in-flight 已清除）', async () => {
    const mockRequest = jest.fn()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce('译文');
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequest });

    pq.trigger('1', videoEl);
    await flushPromises(); // reject，in-flight 清除

    pq.trigger('1', videoEl);
    await flushPromises();

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});

// ---

describe('PrefetchQueue — trigger：成功写入 cache', () => {
  test('requestTranslation resolve 后调用 cache.set(cueId, text, translation)', async () => {
    const mockRequest = jest.fn().mockResolvedValue('翻译结果');
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'Hello', startTime: 0 },
      { id: '2', text: 'World', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequest });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(cache.set).toHaveBeenCalledWith('2', 'World', '翻译结果');
  });

  test('多条 cue 各自独立写入 cache', async () => {
    const mockRequest = jest.fn()
      .mockResolvedValueOnce('译B')
      .mockResolvedValueOnce('译C');
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
      { id: '3', text: 'C', startTime: 4 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequest, lookahead: 2 });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(cache.set).toHaveBeenCalledWith('2', 'B', '译B');
    expect(cache.set).toHaveBeenCalledWith('3', 'C', '译C');
  });
});

// ---

describe('PrefetchQueue — trigger：失败静默处理', () => {
  test('requestTranslation reject 时不抛出、不写 cache', async () => {
    const mockRequest = jest.fn().mockRejectedValue(new Error('API 失败'));
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequest });
    await expect(async () => {
      pq.trigger('1', videoEl);
      await flushPromises();
    }).not.toThrow();
    expect(cache.set).not.toHaveBeenCalled();
  });

  test('一条 reject 不影响其他并发请求的写入', async () => {
    const mockRequest = jest.fn()
      .mockRejectedValueOnce(new Error('失败'))
      .mockResolvedValueOnce('译C');
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
      { id: '3', text: 'C', startTime: 4 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequest, lookahead: 2 });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('3', 'C', '译C');
  });
});

// ---

describe('PrefetchQueue — trigger：HTML 标签剥离', () => {
  let mockCache;
  let mockRequestTranslation;

  beforeEach(() => {
    mockCache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    mockRequestTranslation = jest.fn().mockResolvedValue('译文');
  });

  test('cue.text 含 <c> 标签时传入 strip 后的纯文本', async () => {
    const videoEl = makeVideoEl([
      { id: '1', text: 'Hello', startTime: 0 },
      { id: '2', text: '<c.yellow>World</c>', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache: mockCache, requestTranslation: mockRequestTranslation });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).toHaveBeenCalledWith('World', '2');
  });

  test('cue.text 含嵌套标签 <c><v> 时正确 strip', async () => {
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: '<v Speaker><c>Nice</c></v>', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache: mockCache, requestTranslation: mockRequestTranslation });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).toHaveBeenCalledWith('Nice', '2');
  });

  test('strip 后文本为空时跳过该 cue，不调用 requestTranslation', async () => {
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: '<c></c>', startTime: 2 },
      { id: '3', text: 'Real text', startTime: 4 },
    ]);
    const pq = new PrefetchQueue({ cache: mockCache, requestTranslation: mockRequestTranslation, lookahead: 2 });
    pq.trigger('1', videoEl);
    await flushPromises();
    expect(mockRequestTranslation).toHaveBeenCalledTimes(1);
    expect(mockRequestTranslation).toHaveBeenCalledWith('Real text', '3');
  });
});

// ---

describe('PrefetchQueue — clear()', () => {
  test('clear() 后 _inFlight 为空', () => {
    const pq = new PrefetchQueue({
      cache: { get: jest.fn().mockReturnValue(null), set: jest.fn() },
      requestTranslation: jest.fn(() => new Promise(() => {})), // 永不 resolve
    });
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    pq.trigger('1', videoEl); // 发起请求，进入 in-flight
    expect(pq._inFlight.size).toBe(1);
    pq.clear();
    expect(pq._inFlight.size).toBe(0);
  });

  test('clear() 后再次 trigger 可正常发起请求（不被旧 in-flight 拦截）', async () => {
    const mockRequest = jest.fn().mockResolvedValue('译文');
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const videoEl = makeVideoEl([
      { id: '1', text: 'A', startTime: 0 },
      { id: '2', text: 'B', startTime: 2 },
    ]);
    const pq = new PrefetchQueue({ cache, requestTranslation: mockRequest });

    // 第一次 trigger 进入 in-flight（但 promise 已 resolve，in-flight 自然清除）
    pq.trigger('1', videoEl);
    pq.clear(); // 手动清 in-flight
    pq.trigger('1', videoEl); // 应能再次发起
    await flushPromises();

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  test('clear() 不影响 cache 内容', async () => {
    const cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    const pq = new PrefetchQueue({
      cache,
      requestTranslation: jest.fn().mockResolvedValue('译文'),
    });
    pq.clear();
    // cache.set 不应被调用
    expect(cache.set).not.toHaveBeenCalled();
  });
});

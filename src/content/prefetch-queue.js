'use strict';

const { PREFETCH_LOOKAHEAD } = require('../shared/constants');

/**
 * 预翻译队列。
 *
 * 当某条字幕出现时，扫描 video.textTracks 中当前 cue 之后的 N 条，
 * 对 cache miss 的条目提前发起翻译请求，结果写入 TranslationCache。
 * 字幕真正出现时即可命中 cache，0 延迟显示译文。
 *
 * 依赖完全通过构造函数注入，便于单元测试。
 */
class PrefetchQueue {
  /**
   * @param {object} opts
   * @param {object} opts.cache               - TranslationCache 实例（get / set）
   * @param {function} opts.requestTranslation - (text, cueId) => Promise<string>
   * @param {number} [opts.lookahead]          - 向后预取条数，默认 PREFETCH_LOOKAHEAD
   */
  constructor({ cache, requestTranslation, lookahead }) {
    this._cache = cache;
    this._requestTranslation = requestTranslation;
    this._lookahead = lookahead !== undefined ? lookahead : PREFETCH_LOOKAHEAD;
    // key 格式与 TranslationCache._key 一致：`${cueId}\x00${text}`
    this._inFlight = new Set();
  }

  /**
   * 触发预翻译。在当前字幕出现时调用。
   *
   * @param {string} currentCueId - 当前正在显示的 cue 的 id
   * @param {HTMLVideoElement|null} videoEl - video 元素
   */
  trigger(currentCueId, videoEl) {
    if (!videoEl) return;

    const track = this._selectTrack(videoEl);
    if (!track || !track.cues) return;

    const cues = Array.from(track.cues);
    const currentIdx = cues.findIndex((c) => String(c.id) === String(currentCueId));
    if (currentIdx === -1) return;

    const upcoming = cues.slice(currentIdx + 1, currentIdx + 1 + this._lookahead);
    for (const cue of upcoming) {
      this._prefetchCue(cue);
    }
  }

  /**
   * 清空 in-flight 状态（路由切换时调用）。
   * 不清空 cache，cache 生命周期由 App 统一管理。
   */
  clear() {
    this._inFlight.clear();
  }

  // --- 私有方法 ---

  /**
   * 从 video.textTracks 中选择字幕 track。
   * 优先 mode=showing，其次 kind=subtitles/captions 且 mode≠disabled。
   */
  _selectTrack(videoEl) {
    const tracks = Array.from(videoEl.textTracks);

    // 优先：mode=showing
    const showing = tracks.find((t) => t.mode === 'showing');
    if (showing) return showing;

    // 回退：kind=subtitles 或 kind=captions，且 mode≠disabled
    return tracks.find(
      (t) =>
        (t.kind === 'subtitles' || t.kind === 'captions') && t.mode !== 'disabled'
    ) || null;
  }

  /**
   * 对单条 cue 发起预翻译（含去重、cache 检查）。
   */
  _prefetchCue(cue) {
    const text = this._stripVttTags(cue.text);
    if (!text) return;

    const cueId = String(cue.id);
    if (this._cache.get(cueId, text)) return; // cache hit

    const key = `${cueId}\x00${text}`;
    if (this._inFlight.has(key)) return; // 已在飞行中

    this._inFlight.add(key);
    this._requestTranslation(text, cueId).then(
      (translation) => {
        this._cache.set(cueId, text, translation);
        this._inFlight.delete(key);
      },
      () => {
        // 静默失败：释放 in-flight 槽，允许后续重试
        this._inFlight.delete(key);
      }
    );
  }

  /**
   * 剥离 WebVTT 内联标签（<c>、<v>、<b> 等），返回纯文本。
   */
  _stripVttTags(text) {
    return text.replace(/<[^>]*>/g, '').trim();
  }
}

module.exports = PrefetchQueue;

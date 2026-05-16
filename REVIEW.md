# Code Review 问题清单

> 记录各 Phase review 发现的问题，统一处理后打勾。

---

## Phase 1 — `storage.js`

- [x] **[已修复]** `setDisplayConfig` 全量覆盖而非 partial merge，Phase 7/9 单字段更新时会丢失其余字段
  - 修复：改为 read-then-merge 语义，补充 partial 更新测试
  - commit: `fix: 修复 code review 发现的两处问题`

---

## Phase 4 — `service-worker.js`

- [x] **[已修复]** `data.choices[0].message.content.trim()` 未防御 choices 为空，会抛 TypeError 而非有意义错误
  - 修复：改用可选链 + 空值判断，抛出明确 API_ERROR
  - commit: `fix: 修复 code review 发现的两处问题`

---

## Phase 5 — `subtitle-observer.js`

- [ ] **[待处理]** 缺少测试用例：`start()` 时 `.vds-captions` 已存在且已有字幕内容，`_attachToCaptions` 立即触发路径（`subtitle-observer.js:60-62`）未被覆盖
  - 建议补充的测试：
    ```javascript
    test('start() 时 .vds-captions 已有字幕内容，立即触发回调', async () => {
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
    ```

---

## Phase 6 — `translation-overlay.js`

> 待 review

## Phase 7 — `control-panel.js`

> 待 review

## Phase 8 — `content/index.js`

> 待 review

## Phase 9 — `options/`

> 待 review

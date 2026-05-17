'use strict';

let TranslationOverlay;

beforeEach(() => {
  jest.resetModules();
  TranslationOverlay = require('../../src/content/translation-overlay');
  document.body.innerHTML = `
    <div class="vds-captions" data-part="captions">
      <div data-part="cue-display">
        <div data-part="cue" data-id="1">Hello</div>
      </div>
    </div>
  `;
});

describe('初始化', () => {
  test('构造后 overlay 元素尚未注入 DOM（懒注入）', () => {
    const captionsEl = document.querySelector('.vds-captions');
    new TranslationOverlay(captionsEl);
    expect(document.querySelector('.dlai-ext-translation')).toBeNull();
  });
});

describe('setText', () => {
  test('设置非空文本后，overlay 注入到 cue-display 内', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setText('你好');
    const cueDisplay = captionsEl.querySelector('[data-part="cue-display"]');
    expect(cueDisplay.querySelector('.dlai-ext-translation')).not.toBeNull();
    expect(cueDisplay.querySelector('.dlai-ext-translation').textContent).toBe('你好');
  });

  test('设置空文本后，overlay 从 DOM 移除', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setText('你好');
    overlay.setText('');
    expect(document.querySelector('.dlai-ext-translation')).toBeNull();
  });

  test('cue-display 替换后，下次 setText 重新注入新 cue-display', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setText('第一句');

    // 模拟 Vidstack 替换 cue-display
    captionsEl.innerHTML = `
      <div data-part="cue-display">
        <div data-part="cue" data-id="2">World</div>
      </div>
    `;
    overlay.setText('第二句');
    const newCueDisplay = captionsEl.querySelector('[data-part="cue-display"]');
    expect(newCueDisplay.querySelector('.dlai-ext-translation').textContent).toBe('第二句');
  });
});

describe('hide / show', () => {
  test('hide() 后节点不可见', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setText('测试');
    overlay.hide();
    expect(overlay._el.style.display).toBe('none');
  });

  test('show() 后节点可见', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setText('测试');
    overlay.hide();
    overlay.show();
    expect(overlay._el.style.display).not.toBe('none');
  });
});

describe('setPosition', () => {
  test("setPosition('above') 添加 above class", () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setPosition('above');
    expect(overlay._el.classList.contains('dlai-ext-translation--above')).toBe(true);
    expect(overlay._el.classList.contains('dlai-ext-translation--below')).toBe(false);
  });

  test("setPosition('below') 添加 below class", () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setPosition('below');
    expect(overlay._el.classList.contains('dlai-ext-translation--below')).toBe(true);
    expect(overlay._el.classList.contains('dlai-ext-translation--above')).toBe(false);
  });
});

describe('setFontSize', () => {
  test("setFontSize('large') 更新 CSS 变量", () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setFontSize('large');
    expect(overlay._el.style.getPropertyValue('--dlai-font-size')).toBe('large');
  });
});

describe('destroy', () => {
  test('destroy() 从 DOM 中移除译文节点', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setText('测试');
    overlay.destroy();
    expect(document.querySelector('.dlai-ext-translation')).toBeNull();
  });
});

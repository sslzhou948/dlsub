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
  test('在 .vds-captions 内创建 div.dlai-ext-translation', () => {
    const captionsEl = document.querySelector('.vds-captions');
    new TranslationOverlay(captionsEl);
    const overlay = captionsEl.querySelector('.dlai-ext-translation');
    expect(overlay).not.toBeNull();
  });

  test('译文节点初始内容为空', () => {
    const captionsEl = document.querySelector('.vds-captions');
    new TranslationOverlay(captionsEl);
    const overlay = captionsEl.querySelector('.dlai-ext-translation');
    expect(overlay.textContent).toBe('');
  });
});

describe('setText', () => {
  test('更新译文内容', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setText('你好');
    const el = captionsEl.querySelector('.dlai-ext-translation');
    expect(el.textContent).toBe('你好');
  });
});

describe('hide / show', () => {
  test('hide() 后节点不可见', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.hide();
    const el = captionsEl.querySelector('.dlai-ext-translation');
    expect(el.style.display).toBe('none');
  });

  test('show() 后节点可见', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.hide();
    overlay.show();
    const el = captionsEl.querySelector('.dlai-ext-translation');
    expect(el.style.display).not.toBe('none');
  });
});

describe('setPosition', () => {
  test("setPosition('above') 添加 above class", () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setPosition('above');
    const el = captionsEl.querySelector('.dlai-ext-translation');
    expect(el.classList.contains('dlai-ext-translation--above')).toBe(true);
    expect(el.classList.contains('dlai-ext-translation--below')).toBe(false);
  });

  test("setPosition('below') 添加 below class", () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setPosition('below');
    const el = captionsEl.querySelector('.dlai-ext-translation');
    expect(el.classList.contains('dlai-ext-translation--below')).toBe(true);
    expect(el.classList.contains('dlai-ext-translation--above')).toBe(false);
  });
});

describe('setFontSize', () => {
  test("setFontSize('large') 更新 CSS 变量", () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setFontSize('large');
    const el = captionsEl.querySelector('.dlai-ext-translation');
    expect(el.style.getPropertyValue('--dlai-font-size')).toBe('large');
  });

  test("setFontSize('small') 更新 CSS 变量", () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.setFontSize('small');
    const el = captionsEl.querySelector('.dlai-ext-translation');
    expect(el.style.getPropertyValue('--dlai-font-size')).toBe('small');
  });
});

describe('destroy', () => {
  test('destroy() 从 DOM 中移除译文节点', () => {
    const captionsEl = document.querySelector('.vds-captions');
    const overlay = new TranslationOverlay(captionsEl);
    overlay.destroy();
    expect(captionsEl.querySelector('.dlai-ext-translation')).toBeNull();
  });
});

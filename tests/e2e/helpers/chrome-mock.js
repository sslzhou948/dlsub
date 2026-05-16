'use strict';

/**
 * Returns a script string that injects a window.chrome mock into the page.
 * Call via:  await page.addInitScript({ content: buildChromeMock(opts) })
 *
 * @param {object} opts
 * @param {object} [opts.apiConfig]      - Pre-seeded apiConfig in storage
 * @param {object} [opts.displayConfig]  - Pre-seeded displayConfig in storage
 * @param {boolean} [opts.mockTranslate] - If true, sendMessage responds with a mock translation
 */
function buildChromeMock({ apiConfig, displayConfig, mockTranslate = true } = {}) {
  const storeInit = JSON.stringify({
    apiConfig: apiConfig || { baseUrl: 'https://api.openai.com/v1', apiKey: 'test-key', model: 'gpt-4o-mini' },
    displayConfig: displayConfig || { enabled: true, fontSize: 'medium', position: 'below', targetLang: 'zh-CN' },
  });

  return `
(function() {
  var _store = ${storeInit};
  var _changedListeners = [];

  window.chrome = {
    storage: {
      sync: {
        get: function(keys, callback) {
          var result = {};
          if (keys === null || keys === undefined) {
            result = Object.assign({}, _store);
          } else if (typeof keys === 'string') {
            if (_store[keys] !== undefined) result[keys] = _store[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(function(k) {
              if (_store[k] !== undefined) result[k] = _store[k];
            });
          } else if (typeof keys === 'object') {
            // keys is a defaults object
            Object.keys(keys).forEach(function(k) {
              result[k] = _store[k] !== undefined ? _store[k] : keys[k];
            });
          }
          if (callback) callback(result);
        },
        set: function(items, callback) {
          var changes = {};
          Object.keys(items).forEach(function(k) {
            changes[k] = { oldValue: _store[k], newValue: items[k] };
          });
          Object.assign(_store, items);
          _changedListeners.forEach(function(fn) { fn(changes, 'sync'); });
          if (callback) callback();
        }
      },
      onChanged: {
        addListener: function(fn) { _changedListeners.push(fn); },
        removeListener: function(fn) {
          _changedListeners = _changedListeners.filter(function(l) { return l !== fn; });
        }
      }
    },
    runtime: {
      sendMessage: function(msg, callback) {
        if (${mockTranslate} && msg && msg.type === 'TRANSLATE') {
          setTimeout(function() {
            if (callback) callback({
              type: 'TRANSLATE_RESULT',
              payload: { translation: '[译] ' + msg.payload.text }
            });
          }, 0);
        }
      },
      openOptionsPage: function() {
        window.__optionsPageOpened = true;
      },
      lastError: null
    }
  };

  // Expose store for test assertions
  window.__chromeStore = _store;
})();
`;
}

module.exports = { buildChromeMock };

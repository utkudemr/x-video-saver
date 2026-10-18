const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const media = fs.readFileSync(path.join(__dirname, '../media.js'), 'utf8');
const bridge = fs.readFileSync(path.join(__dirname, '../bridge.js'), 'utf8');

test('bridge does not depend on a cross-script global helper being present', () => {
  const listeners = {};
  const window = { location: { href: 'https://x.com/user/status/123', origin: 'https://x.com' },
    addEventListener: (type, callback) => { listeners[type] = callback; } };
  const chrome = { runtime: { onMessage: { addListener: callback => { listeners.runtime = callback; } } } };
  vm.runInNewContext(bridge, { window, chrome, URL });
  listeners.message({ source: window, origin: 'https://x.com', data: { kind: 'x-video-observer-ready-v1' } });
  listeners.message({ source: window, origin: 'https://x.com', data: { kind: 'x-video-variants-v1', apiResponse: true, records: [] } });
  listeners.message({ source: window, origin: 'https://x.com', data: { kind: 'x-video-variants-v1', records: [
    { statusId: '123', variants: [{ bitrate: 1, url: 'https://video.twimg.com/123.mp4' }] }
  ] } });
  let result;
  assert.doesNotThrow(() => listeners.runtime({ kind: 'get-videos' }, {}, value => { result = value; }));
  assert.equal(result.variants.length, 1);
  assert.equal(result.observerReady, true);
  assert.equal(result.apiResponseCount, 1);
  assert.deepEqual(Array.from(result.observedStatusIds), ['123']);
});

test('bridge returns only variants for current status and rejects foreign origins', () => {
  const listeners = {};
  const window = { location: { href: 'https://x.com/pusholder/status/123', origin: 'https://x.com' },
    addEventListener: (type, callback) => { listeners[type] = callback; } };
  const chrome = { runtime: { onMessage: { addListener: callback => { listeners.runtime = callback; } } } };
  const context = vm.createContext({ window, chrome, URL, globalThis: window });
  vm.runInContext(media, context);
  vm.runInContext(bridge, context);
  const record = id => ({ statusId: id, mediaId: id, variants: [{ bitrate: 1, url: 'https://video.twimg.com/' + id + '.mp4' }] });
  listeners.message({ source: window, origin: 'https://evil.test', data: { kind: 'x-video-variants-v1', records: [record('123')] } });
  listeners.message({ source: window, origin: 'https://x.com', data: { kind: 'x-video-variants-v1', records: [record('123'), record('456')] } });
  let result;
  listeners.runtime({ kind: 'get-videos' }, {}, response => { result = response; });
  assert.equal(result.statusId, '123');
  assert.equal(result.variants.length, 1);
  assert.equal(result.variants[0].url, 'https://video.twimg.com/123.mp4');
});

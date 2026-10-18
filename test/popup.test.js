const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const media = fs.readFileSync(path.join(__dirname, '../media.js'), 'utf8');
const popup = fs.readFileSync(path.join(__dirname, '../popup.js'), 'utf8');

test('popup downloads a validated MP4 for the active post', async () => {
  const buttons = [], downloads = [];
  const content = { replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); } };
  const document = { getElementById: () => content, createElement: tag => {
    const el = { textContent: '', addEventListener: (_event, callback) => { el.click = callback; } };
    if (tag === 'button') buttons.push(el);
    return el;
  } };
  const chrome = { tabs: { query: async () => [{ id: 5, url: 'https://x.com/user/status/123' }],
    sendMessage: async () => ({ statusId: '123', variants: [{ label: '720×720', bitrate: 100, url: 'https://video.twimg.com/video.mp4' }] }) },
    downloads: { download: async options => { downloads.push(options); return 7; } } };
  const context = vm.createContext({ document, chrome, URL, globalThis: {} });
  vm.runInContext(popup, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(buttons.length, 1);
  await buttons[0].click();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].url, 'https://video.twimg.com/video.mp4');
  assert.equal(downloads[0].filename, 'x-video-123-1.mp4');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const media = fs.readFileSync(path.join(__dirname, '../media.js'), 'utf8');
const observer = fs.readFileSync(path.join(__dirname, '../observer.js'), 'utf8');

function tweetPayload(id = '123') {
  return JSON.parse(`{"data":{"tweetResult":{"result":{"rest_id":"${id}","legacy":{"extended_entities":{"media":[{"type":"video","video_info":{"variants":[{"content_type":"video/mp4","url":"https://video.twimg.com/a.mp4"}]}}]}}}}}}`);
}

test('observes X JSON fetches and posts only extracted media records', async () => {
  const messages = [];
  const originalFetch = async () => ({ clone: () => ({ json: async () => tweetPayload() }) });
  const window = { location: { origin: 'https://x.com' }, postMessage: message => messages.push(message), fetch: originalFetch };
  const context = vm.createContext({ window, URL, globalThis: window, queueMicrotask });
  vm.runInContext(media, context); vm.runInContext(observer, context);
  await window.fetch('https://x.com/i/api/graphql/abc/TweetDetail');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(messages.some(message => message.kind === 'x-video-observer-ready-v1'));
  const data = messages.find(message => message.kind === 'x-video-variants-v1');
  assert.ok(data);
  assert.equal(data.apiResponse, true);
  assert.equal(data.records[0].statusId, '123');
  assert.equal(data.records[0].variants[0].url, 'https://video.twimg.com/a.mp4');
  assert.notEqual(window.fetch, originalFetch);
});

test('observes X API JSON returned through XMLHttpRequest', async () => {
  const messages = [];
  class FakeXHR {
    open(_method, url) { this.url = url; }
    addEventListener(type, callback) { this.listeners ||= {}; this.listeners[type] = callback; }
    send() {
      this.responseText = JSON.stringify(tweetPayload('456'));
      queueMicrotask(() => this.listeners?.load?.());
    }
  }
  const window = { location: { origin: 'https://x.com' }, postMessage: message => messages.push(message), XMLHttpRequest: FakeXHR };
  const context = vm.createContext({ window, URL, globalThis: window, queueMicrotask, JSON });
  vm.runInContext(media, context); vm.runInContext(observer, context);
  const xhr = new window.XMLHttpRequest(); xhr.open('GET', 'https://x.com/i/api/graphql/abc/TweetDetail'); xhr.send();
  await new Promise(resolve => setImmediate(resolve));
  const data = messages.find(message => message.kind === 'x-video-variants-v1');
  assert.ok(data);
  assert.equal(data.records[0].statusId, '456');
});

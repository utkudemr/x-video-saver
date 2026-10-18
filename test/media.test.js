const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractVideos, selectForStatus, safeVideoUrl } = require('../media.js');

const tweet = {
  data: { tweetResult: { result: { rest_id: '2111490647291302068', legacy: {
    extended_entities: { media: [{ type: 'video', id_str: '2111490364267704320', video_info: { variants: [
      { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/ext_tw_video/a.m3u8' },
      { content_type: 'video/mp4', bitrate: 832000, url: 'https://video.twimg.com/amplify_video/2111490364267704320/vid/540x540/a.mp4?tag=1' },
      { content_type: 'video/mp4', bitrate: 1280000, url: 'https://video.twimg.com/amplify_video/2111490364267704320/vid/720x720/b.mp4?tag=1' }
    ] } }] }
  } } } }
};

test('extracts direct MP4 variants only for their owning tweet', () => {
  const records = extractVideos(tweet);
  assert.equal(records.length, 1);
  assert.equal(records[0].statusId, '2111490647291302068');
  assert.deepEqual(records[0].variants.map(v => v.label), ['720×720', '540×540']);
  assert.equal(records[0].variants[0].bitrate, 1280000);
});

test('ignores media attached to other posts and duplicates', () => {
  const records = extractVideos({ tweets: [tweet.data.tweetResult.result, tweet.data.tweetResult.result,
    { rest_id: '999', legacy: { extended_entities: { media: [{ type: 'video', video_info: { variants: [
      { content_type: 'video/mp4', url: 'https://video.twimg.com/other.mp4' }
    ] } }] } } }] });
  assert.equal(selectForStatus(records, '2111490647291302068').length, 2);
  assert.equal(selectForStatus(records, 'missing').length, 0);
});

test('rejects spoofed or unsafe download URLs', () => {
  assert.equal(safeVideoUrl('https://video.twimg.com/path/a.mp4?tag=1'), true);
  assert.equal(safeVideoUrl('https://video.twimg.com.evil.test/a.mp4'), false);
  assert.equal(safeVideoUrl('http://video.twimg.com/a.mp4'), false);
  assert.equal(safeVideoUrl('https://video.twimg.com/a.m3u8'), false);
});

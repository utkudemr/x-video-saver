// Shared by the page observer and the popup. No network or browser privileges.
(function (root) {
  function safeVideoUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'video.twimg.com' &&
        url.pathname.toLowerCase().endsWith('.mp4');
    } catch { return false; }
  }

  function extractVideos(payload) {
    const records = [];
    const visited = new WeakSet();
    function visit(node, depth) {
      if (!node || typeof node !== 'object' || depth > 35 || visited.has(node)) return;
      visited.add(node);
      const statusId = String(node.rest_id || node.legacy?.id_str || '');
      const media = node.legacy?.extended_entities?.media || node.legacy?.entities?.media ||
        node.extended_entities?.media || node.entities?.media || [];
      if (/^\d+$/.test(statusId) && Array.isArray(media)) {
        for (const item of media) {
          if (!['video', 'animated_gif'].includes(item?.type)) continue;
          const variants = (item.video_info?.variants || [])
            .filter(v => v.content_type === 'video/mp4' && safeVideoUrl(v.url))
            .map(v => {
              const resolution = new URL(v.url).pathname.match(/\/(\d+)x(\d+)\//);
              return { url: v.url, bitrate: v.bitrate || 0,
                label: resolution ? `${resolution[1]}×${resolution[2]}` : 'MP4' };
            }).sort((a, b) => b.bitrate - a.bitrate);
          if (variants.length) records.push({ statusId, mediaId: String(item.id_str || item.id || ''), variants });
        }
      }
      if (Array.isArray(node)) for (const item of node) visit(item, depth + 1);
      else for (const [key, value] of Object.entries(node)) {
        if (key !== 'video_info' && key !== 'media') visit(value, depth + 1);
      }
    }
    visit(payload, 0);
    return records;
  }

  function selectForStatus(records, statusId) {
    const found = new Map();
    for (const record of records) if (record.statusId === statusId) {
      for (const variant of record.variants || []) if (safeVideoUrl(variant.url)) found.set(variant.url, variant);
    }
    return [...found.values()].sort((a, b) => b.bitrate - a.bitrate);
  }
  const api = { safeVideoUrl, extractVideos, selectForStatus };
  root.XVideoMedia = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);

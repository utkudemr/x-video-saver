// Isolated world: keep metadata in this tab only, and expose only the active status.
(() => {
  const records = [];
  let apiResponseCount = 0;
  let observerReady = false;
  function safeVideoUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'video.twimg.com' &&
        url.pathname.toLowerCase().endsWith('.mp4');
    } catch { return false; }
  }
  function selectForStatus(statusId) {
    const found = new Map();
    for (const record of records) if (record.statusId === statusId) {
      for (const variant of record.variants || []) if (safeVideoUrl(variant.url)) found.set(variant.url, variant);
    }
    return [...found.values()].sort((a, b) => b.bitrate - a.bitrate);
  }
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (event.data?.kind === 'x-video-observer-ready-v1') { observerReady = true; return; }
    if (event.data?.kind !== 'x-video-variants-v1' || !Array.isArray(event.data.records)) return;
    if (event.data.apiResponse) apiResponseCount++;
    for (const record of event.data.records.slice(0, 100)) {
      if (!/^\d+$/.test(record.statusId) || !Array.isArray(record.variants)) continue;
      const variants = record.variants.slice(0, 20).filter(v =>
        safeVideoUrl(v.url)).map(v => ({
          url: v.url, label: String(v.label || 'MP4').slice(0, 30), bitrate: Number(v.bitrate) || 0
        }));
      if (variants.length) records.push({ statusId: record.statusId, variants });
    }
    if (records.length > 300) records.splice(0, records.length - 300);
  });
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.kind !== 'get-videos') return;
    const statusId = new URL(window.location.href).pathname.match(/^\/[^/]+\/status\/(\d+)/)?.[1] || '';
    respond({ statusId, variants: selectForStatus(statusId), observerReady, apiResponseCount,
      observedStatusIds: [...new Set(records.map(record => record.statusId))] });
  });
})();

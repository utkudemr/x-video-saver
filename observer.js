// Observe only X API JSON; keep page behavior unchanged and forward parsed video metadata only.
(() => {
  if (window.__xVideoObserverInstalled) return;
  window.__xVideoObserverInstalled = true;

  function isXApi(url) { return /\/i\/api\//.test(String(url)); }
  function inspect(url, data) {
    if (!isXApi(url) || !data || typeof data !== 'object') return;
    try {
      const records = globalThis.XVideoMedia.extractVideos(data);
      window.postMessage({ kind: 'x-video-variants-v1', apiResponse: true, records }, window.location.origin);
    } catch { /* Never disrupt X's page. */ }
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function (...args) {
      const promise = originalFetch.apply(this, args);
      try {
        const url = String(args[0]?.url || args[0]);
        if (isXApi(url)) promise.then(response => {
          response.clone().json().then(data => inspect(url, data)).catch(() => {});
        }).catch(() => {});
      } catch { /* Preserve the original request result. */ }
      return promise;
    };
  }

  const XHR = window.XMLHttpRequest;
  if (XHR?.prototype) {
    const urls = new WeakMap();
    const originalOpen = XHR.prototype.open;
    const originalSend = XHR.prototype.send;
    XHR.prototype.open = function (method, url, ...rest) {
      urls.set(this, String(url));
      return originalOpen.call(this, method, url, ...rest);
    };
    XHR.prototype.send = function (...args) {
      const url = urls.get(this);
      if (isXApi(url)) this.addEventListener('load', () => {
        try {
          const data = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
          inspect(url, data);
        } catch { /* Ignore non-JSON XHR bodies. */ }
      }, { once: true });
      return originalSend.apply(this, args);
    };
  }
  window.postMessage({ kind: 'x-video-observer-ready-v1' }, window.location.origin);
})();

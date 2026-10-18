const content = document.getElementById('content');
function safeVideoUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'video.twimg.com' &&
      url.pathname.toLowerCase().endsWith('.mp4');
  } catch { return false; }
}
function notice(text) {
  const p = document.createElement('p');
  p.textContent = text;
  content.replaceChildren(p);
}
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !/^https:\/\/(x\.com|twitter\.com)\//.test(tab.url)) {
      notice('Bir X video gönderisi açın.'); return;
    }
    const data = await chrome.tabs.sendMessage(tab.id, { kind: 'get-videos' });
    if (!data?.statusId || !Array.isArray(data.variants) || !data.variants.length) {
      if (!data?.statusId) notice('Açık sekmenin gönderi kimliği okunamadı.');
      else if (!data.observerReady) notice('Tanılama: X sayfasındaki gözlemci çalıştırılamadı. Eklentiyi yükleyip X sekmesini tamamen yenileyin.');
      else if (!data.apiResponseCount) notice('Tanılama: Gözlemci çalışıyor; fakat sayfada X API yanıtı yakalanmadı.');
      else if (data.observedStatusIds?.length) notice(`Tanılama: ${data.apiResponseCount} X API yanıtı; video kaydı başka gönderi kimliklerinde bulundu: ${data.observedStatusIds.join(', ')}. Sayfa: ${data.statusId}`);
      else notice(`Tanılama: ${data.apiResponseCount} X API yanıtı alındı, fakat içlerinden doğrudan MP4 bulunamadı.`);
      return;
    }
    content.replaceChildren();
    data.variants.filter(v => safeVideoUrl(v.url)).forEach((variant, i) => {
      const button = document.createElement('button');
      button.textContent = `${variant.label || 'MP4'} indir`;
      button.addEventListener('click', async () => {
        try {
          await chrome.downloads.download({ url: variant.url,
            filename: `x-video-${data.statusId}-${i + 1}.mp4`, conflictAction: 'uniquify' });
          notice('İndirme başlatıldı. Durumu Brave indirmelerinden kontrol edin.');
        } catch (error) { notice(`İndirme başlatılamadı: ${error.message}`); }
      });
      content.append(button);
    });
  } catch (error) { notice(`Gönderi okunamadı: ${error.message}. Sayfayı yenileyip tekrar deneyin.`); }
})();

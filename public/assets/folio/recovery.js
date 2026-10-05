/** Small, independent fallbacks: the homepage stays useful without enhancements. */
(() => {
  function markImage(image, failed) {
    if (!(image instanceof HTMLImageElement)) return;
    if (!image.matches('.portrait-fallback, .cover-image')) return;
    image.classList.toggle('image-unavailable', failed);
    image.closest('.portrait-theme')?.classList.toggle('image-unavailable', failed);
  }
  document.addEventListener('error', event => markImage(event.target, true), true);
  document.addEventListener('load', event => markImage(event.target, false), true);
  document.querySelectorAll('.portrait-fallback, .cover-image').forEach(image => {
    if (image.complete && !image.naturalWidth) markImage(image, true);
  });
  const place = document.querySelector('.masthead .place');
  if (place) {
    const status = document.createElement('span');
    status.className = 'connection-status';
    status.setAttribute('role', 'status');
    place.after(status);
    const update = () => {
      status.hidden = navigator.onLine !== false;
      status.textContent = status.hidden ? '' : document.documentElement.lang === 'id' ? 'Offline · tautan eksternal mungkin tidak tersedia' : 'Offline · external links may be unavailable';
    };
    addEventListener('offline', update);
    addEventListener('online', update);
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    update();
  }
})();

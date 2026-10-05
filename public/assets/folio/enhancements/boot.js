(() => {
  const root = document.documentElement;
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('portfolio.creative-settings.v1') || '{}') || {}; } catch {}
  if (/^https?:$/.test(location.protocol)) {
    const url = new URL(location.href);
    if (url.searchParams.has('design') || url.searchParams.has('motion')) {
      url.searchParams.delete('design'); url.searchParams.delete('motion');
      history.replaceState(null, '', url);
    }
  }
  root.dataset.proportion = settings.proportion === 'current' ? 'current' : 'golden';
  if (settings.motion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('portfolio-boot');
    setTimeout(() => root.classList.remove('portfolio-boot'), 2500);
  }
})();

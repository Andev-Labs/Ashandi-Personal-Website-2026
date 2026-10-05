// Shared by the static writing, project, credits, and error pages.
try {
  const saved = localStorage.getItem('ds.theme') || localStorage.getItem('portfolio-theme');
  if (['light', 'dark'].includes(saved)) document.documentElement.dataset.theme = saved;
} catch { /* The default theme works without storage. */ }

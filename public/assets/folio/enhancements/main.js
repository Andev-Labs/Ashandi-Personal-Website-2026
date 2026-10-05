import { setupMessage } from './message.js';
import { setupActions } from './actions.js';
import { setupSectionHeadings, setupContentGroups } from './layout.js';
import { setupCreativeMode } from './creative.js';
import { content } from './config.js';
import { setupContact } from './contact.js';
import { createReveals } from './motion.js';
import { loadCreativePreferences, setupCreativeCustomizer } from './customizer.js';

// Enhance content first, then group it before measuring or animating. No build step.
try {
  loadCreativePreferences();
  setupContact(content);
  setupMessage(content);
  setupSectionHeadings();
  setupContentGroups();
  setupCreativeMode();
  setupActions();
  let fontTimer;
  await Promise.race([document.fonts.ready, new Promise(resolve => { fontTimer = setTimeout(resolve, 3000); })]);
  clearTimeout(fontTimer);
  // Do not spend the entrance in a background tab before the visitor sees it.
  if (document.hidden) await new Promise(resolve => {
    const visible = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', visible);
      resolve();
    };
    document.addEventListener('visibilitychange', visible);
  });
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = createReveals({ reducedMotion });
  setupCreativeCustomizer({ reveals, reducedMotion });
} catch (error) {
  document.querySelectorAll('[data-reveal-pending]').forEach(target => target.removeAttribute('data-reveal-pending'));
  console.error('Preview enhancement unavailable; showing the original page.', error);
} finally {
  document.documentElement.classList.remove('portfolio-boot');
}

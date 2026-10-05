import { splitText } from './vendor/text-split.js';
import { motion, selectors } from './config.js';

/** Reveal each target once. This module owns splitting, observers and cleanup. */
export function createReveals({ reducedMotion }) {
  const targets = [...document.querySelectorAll(Object.values(selectors).join(','))];
  const seen = new Set();
  const active = new Map();
  const queued = new Set();
  let observer;
  let timer;
  let nextStart = 0;
  let enabled = true;
  let initialReveal = true;

  function settle(target) {
    target.removeAttribute('data-reveal-pending');
    const entry = active.get(target);
    if (!entry) return;
    active.delete(target); // Promise callbacks must not restore an obsolete split.
    entry.animations.forEach(animation => animation.cancel());
    if (entry.split) entry.split.revert();
  }

  function stop() {
    observer?.disconnect();
    clearTimeout(timer);
    queued.clear();
    targets.forEach(settle);
    nextStart = 0;
  }

  function prepareNavigation(destination) {
    for (const target of targets) {
      if (!destination.contains(target) && !(target.compareDocumentPosition(destination) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      queued.delete(target);
      seen.add(target);
      settle(target);
      observer?.unobserve(target);
    }
    if (!queued.size) { clearTimeout(timer); nextStart = 0; }
  }
  document.addEventListener('portfolio:prepare-navigation', event => prepareNavigation(event.detail.target));

  function reveal(target) {
    target.removeAttribute('data-reveal-pending');
    const words = target.matches(selectors.words);
    const lines = target.matches(selectors.lines);
    const book = target.matches(selectors.book);
    const row = target.matches(selectors.row);
    let split;
    try {
      split = words || lines ? splitText(target, {
        type: words ? ['words'] : ['lines'],
        mask: words ? 'words' : { lines: '.15em' },
      }) : null;
      const units = words ? split.words : lines ? split.lines : [target];
      const delayFor = index => words ? index * motion.wordStagger : Math.min(index * motion.lineStagger, motion.maxLineStagger);
      const animations = units.map((unit, index) => unit.animate(words || lines ? [
        { transform: words ? 'translateY(100%)' : 'translateY(0.65em)', opacity: 0, filter: 'blur(3px)' },
        { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' },
      ] : [
        { translate: `0 ${book ? motion.book.rise : row ? motion.row.rise : motion.componentRise}px`, opacity: 0, filter: 'blur(2px)' },
        { translate: '0 0', opacity: 1, filter: 'blur(0px)' },
      ], {
        duration: book ? motion.book.duration : row ? motion.row.duration : motion.duration,
        delay: delayFor(index),
        easing: book ? motion.bookEasing : motion.easing,
        fill: 'backwards',
      }));
      const entry = { split, animations };
      active.set(target, entry);
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (active.get(target) === entry) { seen.add(target); settle(target); }
      });
      return delayFor(Math.max(0, units.length - 1)) + (row ? motion.row.gap : book ? motion.book.gap : motion.blockGap);
    } catch (error) {
      split?.revert();
      console.warn('Text reveal skipped; content remains readable.', error);
      return motion.blockGap;
    }
  }

  function drain() {
    clearTimeout(timer);
    if (!queued.size) { nextStart = 0; return; }
    const wait = nextStart - performance.now();
    if (wait > 0) { timer = setTimeout(drain, wait); return; }
    const target = targets.find(item => queued.has(item));
    queued.delete(target);
    nextStart = performance.now() + reveal(target);
    timer = setTimeout(drain, Math.max(0, nextStart - performance.now()));
  }

  function refresh({ replay = false } = {}) {
    stop();
    if (replay) seen.clear();
    // A restored tab can retain #contact while restoring scroll to the top.
    // Only settle early contact navigation when its destination is actually visible.
    if (!replay && location.hash === '#contact') {
      const contact = document.querySelector('#contact');
      const rect = contact?.getBoundingClientRect();
      if (scrollY > 0 && rect && rect.top < innerHeight && rect.bottom > 0) prepareNavigation(contact);
    }
    if (!enabled || reducedMotion.matches || document.hidden || !('IntersectionObserver' in window)) return;
    // Reserve a visible first frame before the entrance, including cached loads.
    if (initialReveal || replay) { nextStart = performance.now() + 180; initialReveal = false; }
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const target = entry.target;
        if (entry.isIntersecting && !seen.has(target) && !active.has(target)) queued.add(target);
        else if (!entry.isIntersecting) {
          queued.delete(target);
          // Fast scrolling must not leave invisible content queued above the reader.
          if (entry.boundingClientRect.bottom <= 0) {
            settle(target);
            seen.add(target);
            observer.unobserve(target);
          }
        }
      }
      drain();
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    for (const target of targets) {
      if (seen.has(target) || !target.getClientRects().length) continue;
      if (target.getBoundingClientRect().bottom <= 0) { seen.add(target); continue; }
      target.setAttribute('data-reveal-pending', '');
      observer.observe(target);
    }
  }

  document.addEventListener('focusin', event => {
    for (const target of targets) if (target.contains(event.target)) {
      queued.delete(target);
      seen.add(target);
      settle(target);
      observer?.unobserve(target);
    }
  });

  // Splits are layout snapshots: restore before locale writes, then observe again.
  document.querySelector('#language-menu')?.addEventListener('click', event => {
    if (!event.target.closest('[data-locale]')) return;
    stop();
    requestAnimationFrame(() => refresh());
  }, true);
  new MutationObserver(() => refresh()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  let width = document.querySelector('#main')?.clientWidth;
  let resizeFrame;
  new ResizeObserver(() => {
    const nextWidth = document.querySelector('#main')?.clientWidth;
    if (width === nextWidth) return;
    width = nextWidth;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => refresh());
  }).observe(document.querySelector('#main'));
  document.fonts?.addEventListener('loadingdone', () => refresh());
  addEventListener('beforeprint', stop);
  addEventListener('afterprint', () => refresh());
  addEventListener('pagehide', stop);
  // An interrupted entrance must not finish unseen in a background tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else refresh();
  });
  // A back/forward-cache restore is another visible entrance for the visitor.
  addEventListener('pageshow', event => { if (event.persisted) refresh({ replay: true }); });

  return {
    setEnabled(value, replay = false) { enabled = value; refresh({ replay }); },
    replay() { refresh({ replay: true }); },
    stop,
    finish() { stop(); targets.forEach(target => seen.add(target)); },
  };
}

import { enhanceSelects } from './select.js';
import { createCustomizerMorph } from './customizer-morph.js';
const STORAGE_KEY = 'portfolio.creative-settings.v1';
const defaults = { heading: 'bricolage', body: 'figtree', spacing: 'balanced', proportion: 'golden', motion: 'on' };
const allowed = {
  heading: new Set(['instrument-serif', 'geist', 'newsreader', 'instrument-sans', 'bricolage', 'manrope', 'figtree', 'fraunces', 'gentium']),
  body: new Set(['instrument-serif', 'geist', 'newsreader', 'instrument-sans', 'bricolage', 'manrope', 'figtree', 'fraunces', 'gentium']),
  proportion: new Set(['current', 'golden']),
  motion: new Set(['on', 'off']),
  spacing: new Set(['compact', 'balanced', 'airy']),
};

function normalize(value = {}) {
  value = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) =>
    [key, allowed[key].has(value[key]) ? value[key] : fallback]));
}

function readSaved() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { return { ...defaults }; }
}

function apply(settings) {
  const root = document.documentElement;
  root.dataset.headingFont = settings.heading;
  root.dataset.bodyFont = settings.body;
  root.dataset.spacing = settings.spacing;
  root.dataset.proportion = settings.proportion;
}

/** Apply saved choices before fonts are measured or text is split. */
export function loadCreativePreferences() { apply(readSaved()); }

/** Bottom editor: live preview, explicit save, and an interruptible upward panel. */
export function setupCreativeCustomizer({ reveals, reducedMotion }) {
  const toolbar = document.createElement('aside');
  toolbar.id = 'portfolio-style';
  toolbar.setAttribute('aria-label', 'Style controls');
  toolbar.hidden = true;
  document.body.append(toolbar);
  let settings = readSaved();
  const shell = document.createElement('div');
  shell.className = 'creative-customizer';
  shell.hidden = true;
  shell.innerHTML = `
    <button type="button" class="creative-customizer-trigger" aria-expanded="false" aria-controls="creative-customizer-panel">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h10M18 7h2M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 17h2M10 17h10M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg>
      <span>Style</span>
    </button>
    <section class="creative-customizer-panel" id="creative-customizer-panel" aria-label="Creative style settings" aria-hidden="true" tabindex="-1">
      <header><div><strong>Style</strong><small>Make this space your own</small></div><button type="button" class="creative-customizer-close" aria-label="Close style settings"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <form>
        <div class="creative-fields">
          <label class="creative-pairing"><span>Font pairing</span><select name="pairing"><option value="custom">Custom</option><option value="instrument-serif/geist">Instrument Serif + Geist</option><option value="newsreader/instrument-sans">Newsreader + Instrument Sans</option><option value="bricolage/manrope">Bricolage Grotesque + Manrope</option><option value="instrument-serif/figtree">Instrument Serif + Figtree</option><option value="fraunces/geist">Fraunces + Geist</option><option value="newsreader/geist">Newsreader + Geist</option><option value="bricolage/figtree">Bricolage Grotesque + Figtree</option><option value="gentium/manrope">Gentium Plus + Manrope</option></select></label>
          <label><span>Heading font</span><select name="heading"><option value="instrument-serif">Instrument Serif</option><option value="geist">Geist</option><option value="newsreader">Newsreader</option><option value="instrument-sans">Instrument Sans</option><option value="bricolage">Bricolage Grotesque</option><option value="manrope">Manrope</option><option value="figtree">Figtree</option><option value="fraunces">Fraunces</option><option value="gentium">Gentium Plus</option></select></label>
          <label><span>Body font</span><select name="body"><option value="instrument-serif">Instrument Serif</option><option value="geist">Geist</option><option value="newsreader">Newsreader</option><option value="instrument-sans">Instrument Sans</option><option value="bricolage">Bricolage Grotesque</option><option value="manrope">Manrope</option><option value="figtree">Figtree</option><option value="fraunces">Fraunces</option><option value="gentium">Gentium Plus</option></select></label>
          <fieldset><legend>Type scale</legend><div class="creative-segments creative-segments--two">
            <label><input type="radio" name="proportion" value="current" data-design="current"><span>Standard</span></label>
            <label><input type="radio" name="proportion" value="golden" data-design="golden"><span>Golden</span></label>
          </div></fieldset>
          <fieldset><legend>Spacing</legend><div class="creative-segments">
            <label><input type="radio" name="spacing" value="compact"><span>Compact</span></label>
            <label><input type="radio" name="spacing" value="balanced"><span>Balanced</span></label>
            <label><input type="radio" name="spacing" value="airy"><span>Airy</span></label>
          </div></fieldset>
          <fieldset><legend>Motion</legend><div class="creative-segments creative-segments--two">
            <label><input type="radio" name="motion" value="off" data-motion="original"><span>Off</span></label>
            <label><input type="radio" name="motion" value="on" data-motion="on"><span>On</span></label>
          </div><small class="creative-motion-hint" hidden>Reduced motion follows your device setting.</small></fieldset>
        </div>
        <div class="creative-customizer-actions">
          <button type="button" data-customizer-reset>Reset</button>
          <output aria-live="polite"></output>
          <button type="submit" class="creative-save">Save</button>
        </div>
      </form>
    </section>`;
  toolbar.append(shell);
  const trigger = shell.querySelector('.creative-customizer-trigger');
  const panel = shell.querySelector('.creative-customizer-panel');
  const form = shell.querySelector('form');
  const output = shell.querySelector('output');
  let statusTimer;
  const selects = enhanceSelects(form);
  [panel.querySelector('header'), ...panel.querySelector('.creative-fields').children,
    panel.querySelector('.creative-customizer-actions')].forEach((group, index) => {
    group.classList.add('creative-reveal-group');
    group.style.setProperty('--reveal-index', index);
  });
  const morph = createCustomizerMorph({ toolbar, shell, panel, reducedMotion, motionEnabled: () => settings.motion === 'on' });

  function fill() {
    for (const key of Object.keys(defaults)) form.elements[key].value = settings[key];
    const pairing = `${settings.heading}/${settings.body}`;
    form.elements.pairing.value = [...form.elements.pairing.options].some(option => option.value === pairing) ? pairing : 'custom';
    selects.sync();
  }
  function setOpen(open) {
    const wasOpen = trigger.getAttribute('aria-expanded') === 'true';
    const restoreFocus = !open && panel.contains(document.activeElement);
    shell.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('creative-settings-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    trigger.tabIndex = open ? -1 : 0;
    morph.setOpen(open);
    if (!open) selects.close();
    if (open && !wasOpen) panel.focus({ preventScroll: true });
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }
  const fontFamilies = { 'instrument-serif': 'Instrument Serif', newsreader: 'Newsreader', bricolage: 'Bricolage', fraunces: 'Fraunces', gentium: 'GentiumPlus', geist: 'Geist', 'instrument-sans': 'Instrument Sans', manrope: 'Manrope', figtree: 'Figtree' };
  let revision = 0;
  let transition;
  async function preview() {
    const enableEntrance = settings.motion !== 'on' && form.elements.motion.value === 'on';
    settings = normalize(Object.fromEntries(new FormData(form)));
    if (settings.motion !== 'on') morph.setOpen(shell.classList.contains('is-open'), true);
    fill();
    const currentRevision = ++revision;
    output.textContent = '';
    // Finish existing reveals once; styling never replays the entrance animation.
    document.dispatchEvent(new Event('portfolio:before-style-change'));
    reveals.finish();
    let fontTimer;
    const fontResults = await Promise.race([
      Promise.allSettled([settings.heading, settings.body].map(font => document.fonts.load(`16px ${fontFamilies[font]}`))),
      new Promise(resolve => { fontTimer = setTimeout(() => resolve(null), 3000); }),
    ]);
    clearTimeout(fontTimer);
    if (currentRevision !== revision) return;
    const update = () => { apply(settings); reveals.setEnabled(settings.motion === 'on', enableEntrance); };
    transition?.skipTransition();
    if (document.startViewTransition && !reducedMotion.matches && !enableEntrance) {
      transition = document.startViewTransition(update);
      transition.finished.catch(() => {});
    } else update();
    if (!fontResults || fontResults.some(result => result.status === 'rejected')) announce('Font unavailable. Using fallback.');
  }
  function announce(message) {
    clearTimeout(statusTimer);
    output.textContent = message;
    statusTimer = setTimeout(() => { output.textContent = ''; }, 1800);
  }
  let entrance;
  let entranceFrame;
  function syncCreativeMode() {
    const active = document.documentElement.dataset.creativeMode === 'on';
    const wasHidden = toolbar.hidden;
    const currentBottom = getComputedStyle(toolbar).bottom;
    entrance?.cancel();
    cancelAnimationFrame(entranceFrame);
    toolbar.inert = !active;
    if (!active) setOpen(false);
    if (!active && wasHidden) return;
    toolbar.hidden = false;
    shell.hidden = false;
    const restingBottom = getComputedStyle(toolbar).bottom;
    const belowScreen = `${-toolbar.offsetHeight - 24}px`;
    if (reducedMotion.matches || settings.motion !== 'on') {
      toolbar.hidden = !active;
      shell.hidden = !active;
      morph.sync();
      return;
    }
    const animation = toolbar.animate([
      { bottom: wasHidden ? belowScreen : currentBottom },
      { bottom: active ? restingBottom : belowScreen },
    ], { duration: active ? 380 : 260, easing: active ? 'cubic-bezier(.22,1,.36,1)' : 'cubic-bezier(.4,0,1,1)', fill: 'both' });
    entrance = animation;
    // The surface is fixed to the viewport: follow the moving toolbar.
    const follow = () => {
      morph.sync();
      if (entrance === animation) entranceFrame = requestAnimationFrame(follow);
    };
    follow();
    animation.finished.then(() => {
      if (entrance !== animation) return;
      cancelAnimationFrame(entranceFrame);
      toolbar.hidden = !active;
      shell.hidden = !active;
      entrance = null;
      animation.cancel();
      morph.sync();
    }).catch(() => {});
  }

  fill();
  setOpen(false);
  const syncMotion = () => {
    shell.querySelector('.creative-motion-hint').hidden = !reducedMotion.matches;
    reveals.setEnabled(settings.motion === 'on');
  };
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();
  document.addEventListener('pointerdown', event => { if (!toolbar.contains(event.target) && !event.target.closest('.style-select-menu')) setOpen(false); });
  trigger.addEventListener('click', () => setOpen(trigger.getAttribute('aria-expanded') !== 'true'));
  shell.querySelector('.creative-customizer-close').addEventListener('click', () => setOpen(false));
  form.addEventListener('change', event => {
    if (event.target.name === 'pairing' && event.target.value !== 'custom') {
      const [heading, body] = event.target.value.split('/');
      form.elements.heading.value = heading;
      form.elements.body.value = body;
    }
    preview();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      clearTimeout(statusTimer);
      output.textContent = '';
      setOpen(false);
    }
    catch { announce('Could not save on this device.'); }
  });
  form.querySelector('[data-customizer-reset]').addEventListener('click', () => {
    settings = { ...defaults };
    let savedReset = true;
    try { localStorage.removeItem(STORAGE_KEY); } catch { savedReset = false; }
    fill();
    preview();
    announce(savedReset ? 'Reset' : 'Reset for this visit only.');
  });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.target.closest('.style-select-menu') && trigger.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      trigger.focus();
    }
  });
  new MutationObserver(syncCreativeMode).observe(document.documentElement, { attributes: true, attributeFilter: ['data-creative-mode'] });
  syncCreativeMode();
}

import { splitText } from './vendor/text-split.js';
/** Creative mode owns its toggle, accessible note visibility and live type facts. */
export function setupCreativeMode() {
  const original = document.querySelector('#notes-toggle');
  if (!original) return;
  // Replace the legacy listener so the preview has one owner for this mode.
  const toggle = document.createElement('button');
  toggle.id = 'notes-toggle';
  toggle.className = 'creative-switch';
  toggle.type = 'button';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-label', 'Creative mode');
  toggle.innerHTML = '<span class="creative-switch-track" aria-hidden="true"><span></span></span>';
  const switchGroup = document.createElement('span');
  switchGroup.className = 'creative-switch-group';
  const tooltip = document.createElement('span');
  tooltip.className = 'creative-switch-tooltip';
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.textContent = 'Creative mode';
  switchGroup.append(toggle, tooltip);
  const message = document.querySelector('.message-trigger');
  const actions = document.createElement('div');
  actions.className = 'hero-message-actions';
  message.before(actions);
  actions.append(switchGroup, message);
  const oldRow = original.parentElement;
  original.remove();
  if (!oldRow.children.length) oldRow.remove();
  const root = document.documentElement;
  const notes = [...document.querySelectorAll('.margin-note')];
  notes.forEach((note, index) => { note.id = `creative-note-${index + 1}`; });
  toggle.setAttribute('aria-controls', notes.map(note => note.id).join(' '));

  // On narrow screens, inline notes follow the content they explain.
  for (const id of ['work', 'writing']) {
    const section = document.getElementById(id);
    const note = section?.querySelector('.margin-note');
    if (note) section.querySelector('.section-heading')?.after(note);
  }
  const contactNote = document.querySelector('#contact .margin-note');
  if (contactNote) document.querySelector('#contact .text-stack > p')?.after(contactNote);

  const typeNote = document.querySelector('[data-copy="noteType"]');
  typeNote?.removeAttribute('data-copy');
  function updateTypeNote() {
    if (!typeNote) return;
    const paragraph = document.querySelector('.intro-copy > p');
    const style = getComputedStyle(paragraph);
    const size = Math.round(parseFloat(style.fontSize) * 10) / 10;
    const leading = Math.round(parseFloat(style.lineHeight) * 10) / 10;
    const indonesian = root.lang === 'id';
    typeNote.lang = indonesian ? 'id' : 'en';
    typeNote.replaceChildren();
    const title = document.createElement('b');
    title.textContent = indonesian ? '02 / Ruang untuk membaca' : '02 / Room to read';
    typeNote.append(title, indonesian
      ? `Teks ${size}px, tinggi baris ${leading}px. Satu kolom agar nyaman dibaca.`
      : `${size}px type, ${leading}px line height. One column for comfortable reading.`);
  }
  const noteEntrances = new Map();
  function finishNoteEntrances() {
    for (const { split, animations } of noteEntrances.values()) {
      animations.forEach(animation => animation.cancel());
      split.revert();
    }
    noteEntrances.clear();
  }
  let noteRevision = 0;
  let noteCleanupTimer;
  function setEnabled(enabled) {
    const revision = ++noteRevision;
    clearTimeout(noteCleanupTimer);
    const wasOpen = root.classList.contains('notes-open');
    root.dataset.creativeMode = enabled ? 'on' : 'off';
    toggle.setAttribute('aria-checked', String(enabled));
    notes.forEach(note => note.setAttribute('aria-hidden', String(!enabled)));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || (!enabled && !wasOpen)) {
      finishNoteEntrances();
      root.classList.toggle('notes-open', enabled);
      if (enabled) updateTypeNote();
      return;
    }
    if (enabled && !wasOpen) {
      finishNoteEntrances();
      root.classList.add('notes-open');
      updateTypeNote();
    }
    const running = [];
    for (const note of notes) {
      let entry = noteEntrances.get(note);
      if (!entry) {
        const split = splitText(note, { type: ['lines'] });
        const animations = split.lines.map((line, index) => {
          const delay = 60 + Math.min(index * 30, 180);
          const animation = line.animate([
            { opacity: 0, transform: 'translateY(4px)', filter: 'blur(1.5px)' },
            { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
          ], { duration: 180, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
          animation.pause();
          animation.currentTime = enabled ? 0 : delay + 180;
          return animation;
        });
        entry = { split, animations };
        noteEntrances.set(note, entry);
      }
      for (const animation of entry.animations) {
        // Reverse the same timeline, preserving intermediate opacity and position.
        animation.updatePlaybackRate(enabled ? 1 : -1.35);
        animation.play();
        running.push(animation.finished);
      }
    }
    Promise.allSettled(running).then(() => {
      if (revision !== noteRevision || enabled) return;
      root.classList.remove('notes-open');
      // Keep the finished (transparent) line frames while the note wrapper exits.
      // Reverting immediately would flash the original text during its fade.
      noteCleanupTimer = setTimeout(() => {
        if (revision === noteRevision) finishNoteEntrances();
      }, 360);
    });
  }
  setEnabled(false);
  toggle.addEventListener('click', () => setEnabled(toggle.getAttribute('aria-checked') !== 'true'));
  new MutationObserver(() => {
    if (root.dataset.creativeMode === 'on') { finishNoteEntrances(); updateTypeNote(); }
  }).observe(root, { attributes: true, attributeFilter: ['lang', 'data-proportion'] });
  new ResizeObserver(() => {
    if (root.dataset.creativeMode === 'on') { finishNoteEntrances(); updateTypeNote(); }
  }).observe(document.querySelector('.intro-copy'));
}

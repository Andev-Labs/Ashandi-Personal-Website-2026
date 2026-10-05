/** One visual treatment for calls to action; links retain their real destinations. */
export function setupActions() {
  const selector = [
    '.message-trigger', '.creative-switch',
    'a.section-aside', '.socials > a', '.text-link', '.read-article',
    '.work-arrow', 'button.email-link', '.note-send',
  ].join(',');
  function decorate() {
    document.querySelectorAll(selector).forEach(control => {
      control.classList.add('selection-control');
      if (control.matches('.socials > a')) {
        control.querySelectorAll('svg').forEach(icon => icon.remove());
      }
      if (control.querySelector('.action-content')) return;
      control.querySelector('.selection-handles')?.remove();
      // Use the same SVG geometry instead of font-dependent arrow glyphs.
      for (const node of [...control.childNodes]) {
        if (node.nodeType !== 3 || !node.textContent.includes('↗')) continue;
        node.textContent = node.textContent.replace('↗', '').trimEnd();
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '1.5');
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<path d="M7 17 17 7M7 7h10v10"/>';
        node.after(icon);
      }
      const content = document.createElement('span');
      content.className = 'action-content';
      content.append(...control.childNodes);
      for (const node of [...content.childNodes]) {
        if (node.nodeType === 3 && node.textContent.trim()) {
          const label = document.createElement('span');
          label.className = 'action-label';
          label.textContent = node.textContent.trim();
          node.replaceWith(label);
        } else if (node.nodeType === 1 && node.tagName === 'SPAN' && !node.querySelector('svg')) {
          node.classList.add('action-label');
        }
      }
      control.append(content);
      const handles = document.createElement('span');
      handles.className = 'selection-handles';
      handles.setAttribute('aria-hidden', 'true');
      handles.innerHTML = '<i></i><i></i><i></i><i></i>';
      control.append(handles);
    });
  }
  decorate();
  // Translated labels replace inner HTML; restore their decorative corners.
  new MutationObserver(decorate).observe(document.documentElement, {
    attributes: true, attributeFilter: ['lang'],
  });
}

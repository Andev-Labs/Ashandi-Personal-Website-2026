/** Temporarily send the hero action to the contact section. */
export function setupMessage() {
  const anchor = document.querySelector('.portrait-atmosphere');
  if (!anchor) return;
  const trigger = document.createElement('a');
  trigger.className = 'message-trigger';
  trigger.href = '#contact';
  const labels = { en: 'Send message ↗', id: 'Kirim pesan ↗', zh: '发送消息 ↗' };
  const label = () => { trigger.textContent = labels[document.documentElement.lang] || labels.en; };
  label();
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  trigger.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const contact = document.querySelector('#contact');
    if (!contact) return;
    event.preventDefault();
    if (location.hash !== '#contact' && /^https?:$/.test(location.protocol)) history.pushState(null, '', '#contact');
    document.dispatchEvent(new CustomEvent('portfolio:prepare-navigation', { detail: { target: contact } }));
    requestAnimationFrame(() => {
      contact.setAttribute('tabindex', '-1');
      contact.focus({ preventScroll: true });
      contact.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
  });
  anchor.append(trigger);
  document.querySelector('.contact-link')?.remove();
}

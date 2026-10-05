/** Enhance a working mailto link; clipboard failure leaves a selectable address. */
export function setupContact({ email, footer }) {
  const link = document.querySelector('#contact .email-link');
  if (!link) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'email-link';
  const address = document.createElement('span');
  address.textContent = email;
  button.append(address);
  button.insertAdjacentHTML('beforeend', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>');
  const wrapper = document.createElement('div');
  wrapper.className = 'email-copy';
  const status = document.createElement('span');
  status.className = 'email-copy-status';
  status.setAttribute('role', 'status');
  link.replaceWith(wrapper);
  wrapper.append(button, status);

  const isIndonesian = () => document.documentElement.lang === 'id';
  const label = () => button.setAttribute('aria-label', `${isIndonesian() ? 'Salin alamat email' : 'Copy email address'}: ${email}`);
  label();
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  let timer;
  button.addEventListener('click', async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(email);
      status.textContent = isIndonesian() ? 'Tersalin!' : 'Copied!';
      timer = setTimeout(() => { status.textContent = ''; }, 2000);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(address);
      const selection = getSelection();
      if (!selection) {
        status.textContent = isIndonesian() ? `Salin secara manual: ${email}` : `Copy manually: ${email}`;
        return;
      }
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = isIndonesian() ? 'Teks dipilih. Salin secara manual.' : 'Address selected. Copy it manually.';
    }
  });
}

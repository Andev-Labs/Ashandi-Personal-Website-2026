/** Styled single-select with native form values and keyboard-accessible options. */
export function enhanceSelects(form) {
  // Keep usable native selects on browsers without the Popover API.
  if (typeof HTMLElement.prototype.showPopover !== 'function') return { sync() {}, close() {} };
  const controls = [...form.querySelectorAll('select')].map((select, index) => {
    const label = select.closest('label');
    const labelText = label.querySelector('span').textContent;
    const wrapper = document.createElement('div');
    wrapper.className = 'style-select';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'style-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const value = document.createElement('span');
    trigger.append(value);
    const menu = document.createElement('div');
    menu.className = 'style-select-menu';
    menu.id = `style-options-${index}`;
    menu.popover = 'auto';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', labelText);
    menu.tabIndex = -1;
    trigger.setAttribute('aria-controls', menu.id);
    let active = 0;
    const options = [...select.options].map((option, optionIndex) => {
      const item = document.createElement('div');
      item.id = `${menu.id}-${optionIndex}`;
      item.className = 'style-select-option';
      item.setAttribute('role', 'option');
      item.textContent = option.textContent;
      item.addEventListener('click', () => choose(optionIndex));
      menu.append(item);
      return item;
    });
    function sync() {
      value.textContent = select.selectedOptions[0]?.textContent || '';
      trigger.setAttribute('aria-label', `${labelText}: ${value.textContent}`);
      options.forEach((item, i) => item.setAttribute('aria-selected', String(i === select.selectedIndex)));
    }
    function highlight(index) {
      active = Math.max(0, Math.min(options.length - 1, index));
      options.forEach((item, i) => item.classList.toggle('is-active', i === active));
      menu.setAttribute('aria-activedescendant', options[active].id);
      options[active].scrollIntoView({ block: 'nearest' });
    }
    function choose(index) {
      select.selectedIndex = index;
      sync();
      menu.hidePopover();
      trigger.focus({ preventScroll: true });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function open() {
      const rect = trigger.getBoundingClientRect();
      menu.style.width = `${Math.min(rect.width, innerWidth - 24)}px`;
      menu.showPopover();
      const below = innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const openBelow = below >= Math.min(menu.scrollHeight, 260) || below >= above;
      const maxHeight = Math.max(80, Math.min(280, openBelow ? below : above));
      menu.style.maxHeight = `${maxHeight}px`;
      menu.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - menu.offsetWidth - 12))}px`;
      menu.style.top = `${openBelow ? rect.bottom + 6 : Math.max(12, rect.top - menu.offsetHeight - 6)}px`;
      highlight(select.selectedIndex);
      menu.focus({ preventScroll: true });
    }
    trigger.addEventListener('click', () => menu.matches(':popover-open') ? menu.hidePopover() : open());
    trigger.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(); }
    });
    let search = '';
    let lastKey = 0;
    menu.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowDown') highlight(active + 1);
      else if (event.key === 'ArrowUp') highlight(active - 1);
      else if (event.key === 'Home') highlight(0);
      else if (event.key === 'End') highlight(options.length - 1);
      else if (event.key === 'Enter' || event.key === ' ') choose(active);
      else if (event.key === 'Escape' || event.key === 'Tab') {
        menu.hidePopover(); trigger.focus({ preventScroll: true });
      } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        search = performance.now() - lastKey > 600 ? event.key : search + event.key;
        lastKey = performance.now();
        const match = options.findIndex(item => item.textContent.toLowerCase().startsWith(search.toLowerCase()));
        if (match >= 0) highlight(match);
      }
    });
    menu.addEventListener('toggle', () => trigger.setAttribute('aria-expanded', String(menu.matches(':popover-open'))));
    // The hidden select remains the source for FormData, reset and saved settings.
    select.hidden = true;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    label.after(wrapper);
    wrapper.append(label, trigger);
    document.body.append(menu);
    sync();
    return { sync, close() { if (menu.matches(':popover-open')) menu.hidePopover(); } };
  });
  addEventListener('resize', () => controls.forEach(control => control.close()));
  return { sync() { controls.forEach(control => control.sync()); }, close() { controls.forEach(control => control.close()); } };
}

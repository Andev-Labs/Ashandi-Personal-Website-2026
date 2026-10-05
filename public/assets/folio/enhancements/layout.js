/** A section heading owns its title/subtitle stack and its separate action. */
export function setupSectionHeadings() {
  document.querySelectorAll('#main .section-heading').forEach(heading => {
    const subtitle = heading.nextElementSibling;
    const title = heading.querySelector('h2');
    if (!title || !subtitle?.matches('.section-intro')) return;
    const copy = document.createElement('div');
    copy.className = 'section-heading-copy';
    heading.insertBefore(copy, title);
    copy.append(title, subtitle);
    heading.classList.add('has-subtitle');
  });
}

/** Keep each section's title, prose and actions as explicit nested groups. */
export function setupContentGroups() {
  for (const id of ['about', 'contact']) {
    const section = document.getElementById(id);
    if (!section || section.querySelector('.section-body')) continue;
    const paragraphs = [...section.children].filter(child => child.matches('p'));
    if (!paragraphs.length) continue;
    const body = document.createElement('div');
    body.className = 'section-body';
    const text = document.createElement('div');
    text.className = 'text-stack';
    const actions = document.createElement('div');
    actions.className = 'section-actions';
    paragraphs[0].before(body);
    text.append(...paragraphs);
    const actionNodes = [...section.children].filter(child => child.matches('.text-link, .email-copy, .socials'));
    actions.append(...actionNodes);
    body.append(text);
    if (actionNodes.length) body.append(actions);
    const title = section.querySelector(':scope > h2');
    if (title) {
      const heading = document.createElement('div');
      heading.className = 'section-heading';
      title.before(heading);
      heading.append(title);
    }
    // Contact copy is a subtitle, so it belongs with the heading above the actions.
    if (id === 'contact') {
      const heading = section.querySelector('.section-heading');
      const copy = document.createElement('div');
      copy.className = 'section-heading-copy';
      copy.append(...heading.childNodes, text);
      heading.append(copy);
    }
  }
  document.querySelectorAll('.work-item').forEach(item => {
    const copy = item.querySelector('.work-copy');
    copy?.classList.add('text-stack');
    // A 44px action must not stretch the title's own line box.
    const arrow = copy?.querySelector('.work-arrow');
    if (arrow) item.append(arrow);
    const title = copy?.querySelector('.work-title');
    const description = copy?.querySelector('.work-description');
    if (title && description && !copy.querySelector('.work-summary')) {
      const summary = document.createElement('span');
      summary.className = 'work-summary';
      title.before(summary);
      summary.append(title, description);
    }
  });
}

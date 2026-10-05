/** One surface becomes the settings panel and returns to the same Style button. */
export function createCustomizerMorph({ toolbar, shell, panel, reducedMotion, motionEnabled }) {
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (from, to, amount) => from + (to - from) * amount;
  const smooth = (start, end, value) => {
    const amount = clamp((value - start) / (end - start));
    return amount * amount * (3 - 2 * amount);
  };
  const ns = 'http://www.w3.org/2000/svg';
  const surface = document.createElementNS(ns, 'svg');
  surface.setAttribute('class', 'creative-customizer-surface');
  surface.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS(ns, 'rect');
  body.setAttribute('class', 'style-surface-body');
  surface.append(body);
  shell.prepend(surface);
  shell.classList.add('has-morph');
  const trigger = shell.querySelector('.creative-customizer-trigger');
  const groups = [...panel.querySelectorAll('.creative-reveal-group')];

  let progress = 0, target = 0, velocity = 0;
  let frame = 0, previousTime = 0, geometry;
  let pressElapsed = 0, pressing = false, compression = 0;
  const instantMotion = () => reducedMotion.matches || !motionEnabled();

  function render() {
    if (!geometry) return;
    const { b, p } = geometry;
    const t = clamp(progress);
    // Every edge and corner reads the same progress. The shell does not pause
    // as a droplet, and its width cannot arrive before its height.
    const scale = 1 - .04 * compression * (1 - smooth(0, .22, t));
    const width = mix(b.w, p.w, t) * scale;
    const height = mix(b.h, p.h, t) * scale;
    const cx = mix(b.x + b.w / 2, p.x + p.w / 2, t);
    const cy = mix(b.y + b.h / 2, p.y + p.h / 2, t);
    const x = cx - width / 2, y = cy - height / 2;
    const radius = mix(b.h / 2, 24, t) * scale;
    for (const [key, value] of Object.entries({ x, y, width, height, rx: radius })) {
      body.setAttribute(key, value.toFixed(3));
    }
    panel.style.clipPath = `inset(${Math.max(0, y - p.y)}px ${Math.max(0, p.x + p.w - x - width)}px ${Math.max(0, p.y + p.h - y - height)}px ${Math.max(0, x - p.x)}px round ${radius}px)`;

    // Type stays at natural scale. Reveal follows available room, in both
    // directions, instead of starting a second delayed CSS animation.
    const content = smooth(.38, .84, t);
    panel.style.setProperty('--style-content-opacity', content);
    panel.style.setProperty('--style-content-offset', `${(1 - content) * 6}px`);
    groups.forEach((group, index) => {
      const start = .38 + index * .018;
      const amount = smooth(start, start + .34, t);
      group.style.opacity = amount;
      group.style.transform = `translateY(${((1 - amount) * 6).toFixed(3)}px)`;
      group.style.visibility = amount > .001 ? 'visible' : 'hidden';
    });
    panel.style.visibility = target || t > 0 ? 'visible' : 'hidden';
    panel.classList.toggle('is-content-ready', Boolean(target) && t > .55);
    panel.classList.toggle('is-motion-instant', instantMotion());
    // The label remains through the press and rejoins the returning surface.
    // Keep its node mounted so keyboard focus can return even during closing.
    trigger.style.opacity = 1 - smooth(.02, .20, t);
    trigger.style.scale = scale;
    trigger.style.pointerEvents = t < .20 ? 'auto' : 'none';
  }

  function measure() {
    if (toolbar.hidden) return;
    const button = toolbar.getBoundingClientRect();
    const bounds = panel.getBoundingClientRect();
    const left = Math.max(0, Math.min(button.left, bounds.left) - 2);
    const top = Math.max(0, Math.min(button.top, bounds.top) - 2);
    const right = Math.max(button.right, bounds.right) + 2;
    const bottom = Math.max(button.bottom, bounds.bottom) + 2;
    const width = Math.max(1, right - left), height = Math.max(1, bottom - top);
    surface.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
    surface.setAttribute('viewBox', `0 0 ${width} ${height}`);
    geometry = {
      b: { x: button.left - left, y: button.top - top, w: button.width, h: button.height },
      p: { x: bounds.left - left, y: bounds.top - top, w: bounds.width, h: bounds.height },
    };
    render();
  }

  function tick(time) {
    let dt = previousTime ? Math.min((time - previousTime) / 1000, .064) : 1 / 60;
    previousTime = time;
    if (pressing) {
      // A brief acknowledgement, with no timeout left behind after reversal.
      const consumed = Math.min(dt, .06 - pressElapsed);
      pressElapsed += consumed;
      compression = smooth(0, .06, pressElapsed);
      dt -= consumed;
      if (pressElapsed >= .06) pressing = false;
    }
    if (!pressing && dt > 0) {
      // Exact critically damped integration. Retarget from BOTH the current
      // position and velocity; no restart and no frame-rate-dependent Euler step.
      const frequency = target ? 18 : 22;
      const delta = progress - target;
      const impulse = velocity + frequency * delta;
      const decay = Math.exp(-frequency * dt);
      progress = target + (delta + impulse * dt) * decay;
      velocity = (velocity - frequency * impulse * dt) * decay;
      if (progress < 0 || progress > 1) {
        progress = clamp(progress);
        velocity = 0;
      }
    }
    const finished = !pressing && Math.abs(target - progress) < .0002 && Math.abs(velocity) < .004;
    if (finished) {
      progress = target;
      velocity = 0;
      compression = 0;
      frame = 0;
      previousTime = 0;
    }
    render();
    if (!finished) frame = requestAnimationFrame(tick);
  }

  function setOpen(open, instant = false) {
    const next = Number(open);
    const immediate = instant || toolbar.hidden || instantMotion();
    if (next === target && (progress === target || !immediate)) return;
    const atRest = !frame && progress === 0;
    target = next;
    if (immediate) {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      progress = target;
      velocity = 0;
      pressing = false;
      compression = 0;
      measure();
      return;
    }
    pressing = Boolean(open) && atRest;
    pressElapsed = 0;
    // A close during the press simply restores the resting button.
    if (!open && progress === 0) compression = 0;
    measure();
    if (!frame) frame = requestAnimationFrame(tick);
  }

  const resize = new ResizeObserver(measure);
  resize.observe(toolbar);
  resize.observe(panel);
  window.addEventListener('resize', measure);
  window.visualViewport?.addEventListener('resize', measure);
  reducedMotion.addEventListener('change', () => setOpen(Boolean(target), true));
  return { setOpen, sync: measure };
}

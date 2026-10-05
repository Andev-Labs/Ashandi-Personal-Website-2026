(() => {
  'use strict';
  const root = document.documentElement;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const $ = id => document.getElementById(id);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const site = window.portfolioData;
  const supportedLanguages = ['en', 'id'];
  const languageNames = {en:'English',id:'Bahasa Indonesia',es:'Español',fr:'Français',de:'Deutsch',ja:'日本語'};
  const localePacks = window.portfolioLocales || {};
  const detectLanguage = () => {
    for (const locale of navigator.languages || [navigator.language]) {
      const code = locale.toLowerCase().split('-')[0];
      if (supportedLanguages.includes(code)) return code;
    }
    return 'en';
  };
  let languagePreference = 'auto';
  try { const saved = localStorage.getItem('folio.language-preference'); if (saved === 'auto' || supportedLanguages.includes(saved)) languagePreference = saved; } catch {}
  let language = languagePreference === 'auto' ? detectLanguage() : languagePreference;

  // Copy belongs to this page. Translations never come from remote content.
  const english = Object.fromEntries([...document.querySelectorAll('[data-copy]')].map(node => [node.dataset.copy, node.innerHTML]));
  const indonesian = localePacks.id.copy;
  const defaultUi = {
    en:{themeLight:'Switch to light mode',themeDark:'Switch to dark mode',language:'Language',automatic:'Automatic',browserLanguage:'Browser language',previousArticle:'Previous article',nextArticle:'Next article',rotateLeft:'Rotate cover left',rotateRight:'Rotate cover right',previewArticle:'Preview article:',previewTag:'Take a closer look {arrow}',minutesRead:'min read'},
    id:{themeLight:'Ganti ke tema terang',themeDark:'Ganti ke tema gelap',language:'Bahasa',automatic:'Otomatis',browserLanguage:'Bahasa browser',previousArticle:'Artikel sebelumnya',nextArticle:'Artikel berikutnya',rotateLeft:'Putar cover ke kiri',rotateRight:'Putar cover ke kanan',previewArticle:'Lihat artikel:',previewTag:'Lihat lebih dekat {arrow}',minutesRead:'menit baca'}
  };
  const uiCopy = () => localePacks[language]?.ui || defaultUi[language] || defaultUi.en;
  const renderCopy = copy => copy.replace(/\{arrow\}/g, '↗');
  const bookCatalog = site.articles;
  const books = bookCatalog.filter(book => !book.hidden);
  let selected = 0;
  let shelfButtons = [];
  let pinnedCover = null;
  let inspectionRotation = { x: -4, y: -24 };
  let restoreFocus = null;
  const langIndex = () => language === 'id' ? 1 : 0;
  const syncTheme = () => {
    const dark = root.dataset.theme === 'dark';
    $('theme-toggle').setAttribute('aria-pressed', String(dark));
    $('theme-toggle').setAttribute('aria-label', dark ? uiCopy().themeLight : uiCopy().themeDark);
    $('theme-label').textContent = dark ? uiCopy().themeLight : uiCopy().themeDark;
    document.querySelector('meta[name="theme-color"]').content = dark ? '#080808' : '#ffffff';
    loadPortraitTheme(root.dataset.theme);
  };
  let themeTransition;
  let themeRequest = 0;
  let requestedTheme;
  const stopThemeTransition = () => {
    themeTransition?.skipTransition();
    root.removeAttribute('data-theme-animating');
    root.removeAttribute('data-theme-transition');
  };
  addEventListener('resize', stopThemeTransition);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopThemeTransition(); });
  document.addEventListener('portfolio:before-style-change', stopThemeTransition);
  $('theme-toggle').addEventListener('click', async () => {
    const nextTheme = (requestedTheme || root.dataset.theme) === 'dark' ? 'light' : 'dark';
    requestedTheme = nextTheme;
    const request = ++themeRequest;
    if (themeTransition) {
      themeTransition.skipTransition();
      await themeTransition.finished.catch(() => {});
    }
    if (request !== themeRequest) return;
    root.removeAttribute('data-theme-animating');
    root.removeAttribute('data-theme-transition');
    themeTransition = undefined;
    const applyTheme = () => {
      root.dataset.theme = nextTheme;
      try { localStorage.setItem('ds.theme', nextTheme); } catch {}
      syncTheme();
    };
    if (!document.startViewTransition || reducedMotion.matches) {
      applyTheme(); requestedTheme = undefined; return;
    }
    // Decode both snapshots before the first switch, including a cold cache.
    await Promise.all([loadPortraitTheme('light'), loadPortraitTheme('dark')]);
    if (request !== themeRequest) return;
    const box = $('theme-toggle').getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    // Relative coordinates stay aligned with the browser's snapshot scale on Retina.
    root.style.setProperty('--theme-origin-x', (x / innerWidth * 100) + '%');
    root.style.setProperty('--theme-origin-y', (y / innerHeight * 100) + '%');
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.style.setProperty('--theme-radius', (radius / Math.hypot(innerWidth, innerHeight) * Math.SQRT2 * 100 + 1) + '%');
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    if (!reducedMotion.matches) {
      const rect = portrait.getBoundingClientRect();
      currentSector = (Math.round(Math.atan2(y - rect.top - rect.height / 2, x - rect.left - rect.width / 2) / (Math.PI / 4)) + 8) % 8;
      setPortraitFrame(directions[currentSector]);
    }
    root.dataset.themeTransition = nextTheme;
    let transition;
    try {
      transition = document.startViewTransition(applyTheme);
      themeTransition = transition;
      await transition.ready;
      if (request === themeRequest && !reducedMotion.matches && root.hasAttribute('data-theme-transition')) {
        root.dataset.themeAnimating = '';
      }
      await transition.finished;
    } catch {
      // Theme switching remains usable if snapshots or pseudo-element animation fail.
      transition?.skipTransition();
      if (request === themeRequest) applyTheme();
    } finally {
      if (request === themeRequest) {
        root.removeAttribute('data-theme-animating');
        root.removeAttribute('data-theme-transition');
        themeTransition = undefined;
        requestedTheme = undefined;
      }
    }
  });
  $('notes-toggle').addEventListener('click', () => {
    const open = root.classList.toggle('notes-open');
    $('notes-toggle').setAttribute('aria-pressed', String(open));
    document.querySelectorAll('.margin-note').forEach(note => note.setAttribute('aria-hidden', String(!open)));
  });
  if ('ResizeObserver' in window) new ResizeObserver(entries => { $('column-width').textContent = Math.round(entries[0].contentRect.width) + ' px'; }).observe(document.querySelector('.folio'));
  const updateTime = () => { $('jakarta-time').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: site.profile.timezone, hour: '2-digit', minute: '2-digit' }).format(new Date()); };
  updateTime(); setInterval(updateTime, 60000);
  $('year').textContent = new Date().getFullYear();

  // Nine registered sprite frames: neutral plus eight directions around the portrait.
  const portrait = $('portrait');
  let portraitVisible = true;
  let pointerFrame = 0;
  let pointer = { x: 0, y: 0 };
  let currentSector = null;
  const portraitLoads = new Map();
  function loadPortraitTheme(theme) {
    // Use the same production URL as the initial image, including its content hash.
    const fallback = portrait.querySelector('.portrait-' + theme + ' .portrait-fallback');
    const src = fallback.currentSrc || fallback.src;
    if (portraitLoads.get(theme)?.src === src) return portraitLoads.get(theme).ready;
    const image = new Image();
    image.src = src;
    portraitLoads.set(theme, image);
    image.ready = image.decode().then(() => {
      if (portraitLoads.get(theme) !== image) return;
      const layer = portrait.querySelector('.portrait-' + theme);
      const sprites = layer.querySelectorAll('.portrait-sprite');
      sprites.forEach(sprite => {
        sprite.style.transition = 'none';
        sprite.style.backgroundImage = 'url("' + src + '")';
      });
      layer.dataset.ready = 'true';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        sprites.forEach(sprite => sprite.style.removeProperty('transition'));
      }));
    }).catch(() => { if (portraitLoads.get(theme) === image) portraitLoads.delete(theme); });
    return image.ready;
  }
  ['light', 'dark'].forEach(theme => {
    portrait.querySelector('.portrait-' + theme + ' .portrait-fallback').addEventListener('load', () => loadPortraitTheme(theme));
  });
  function setPortraitFrame(pose) {
    if (portrait.dataset.gaze === pose.name) return;
    portrait.dataset.gaze = pose.name;
    portrait.querySelectorAll('.portrait-theme').forEach(layer => {
      const active = layer.querySelector('.portrait-sprite.is-active');
      const next = layer.querySelector('.portrait-sprite:not(.is-active)');
      next.style.setProperty('--frame-x', pose.x + '%');
      next.style.setProperty('--frame-y', pose.y + '%');
      next.classList.add('is-active');
      active.classList.remove('is-active');
    });
  }
  function resetPortrait() {
    if (root.hasAttribute('data-theme-transition')) return;
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0; currentSector = null;
    setPortraitFrame({name:'center',x:50,y:50});
    portrait.style.setProperty('--gaze-pitch', '0deg');
    portrait.style.setProperty('--gaze-yaw', '0deg');
  }
  const directions = [
    { name: 'right', x: 100, y: 50 }, { name: 'down-right', x: 100, y: 100 },
    { name: 'down', x: 50, y: 100 }, { name: 'down-left', x: 0, y: 100 },
    { name: 'left', x: 0, y: 50 }, { name: 'up-left', x: 0, y: 0 },
    { name: 'up', x: 50, y: 0 }, { name: 'up-right', x: 100, y: 0 }
  ];
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { portraitVisible = entry.isIntersecting; portrait.parentElement.classList.toggle('is-visible', portraitVisible); if (!portraitVisible) resetPortrait(); }).observe(portrait);
  window.addEventListener('pointermove', event => {
    if (site.profile.portraitMode === 'image' || root.hasAttribute('data-theme-transition') || !portraitVisible || !finePointer.matches || reducedMotion.matches || $('book-dialog').open || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const rect = portrait.getBoundingClientRect();
      const x = pointer.x - (rect.left + rect.width / 2);
      const y = pointer.y - (rect.top + rect.height / 2);
      if (Math.hypot(x, y) < 42) { resetPortrait(); return; }
      const angle = Math.atan2(y, x);
      const sector = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
      // A small angular dead band avoids flicker between adjacent frames.
      const previousAngle = currentSector === null ? 0 : currentSector * Math.PI / 4;
      const angleDelta = Math.abs(Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle)));
      if (currentSector === null || angleDelta > Math.PI / 8 + .055) currentSector = sector;
      const pose = directions[currentSector];
      setPortraitFrame(pose);
      portrait.style.setProperty('--gaze-pitch', clamp(-y / 95, -3, 3) + 'deg');
      portrait.style.setProperty('--gaze-yaw', clamp(x / 110, -3, 3) + 'deg');
    });
  }, { passive: true });
  window.addEventListener('blur', resetPortrait);
  document.documentElement.addEventListener('mouseleave', resetPortrait);
  finePointer.addEventListener('change', resetPortrait);
  reducedMotion.addEventListener('change', resetPortrait);
  loadPortraitTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  const bookDescription = book => book.description[langIndex()] || book.description[0];
  const bookCategory = book => book.category[langIndex()] || book.category[0];
  const articleDate = book => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(book.date + 'T12:00:00Z'));

  function makeBook(book, index, inspecting = false) {
    const object = document.createElement('div');
    object.className = 'book-object book-object--illustrated';
    object.style.setProperty('--book-cover', book.coverColor);
    object.setAttribute('aria-hidden', 'true');
    const number = String(index + 1).padStart(2, '0');
    const imageSizes = inspecting ? '(max-width: 680px) 180px, 210px' : '(max-width: 680px) 174px, 180px';
    object.innerHTML = '<div class="book-face book-front"><div class="cover-content"><span class="cover-edition"><span>' + escapeHTML(book.publication) + '</span><span>' + number + '</span></span><img class="cover-image" src="' + escapeHTML(book.image) + '" srcset="' + escapeHTML(book.srcset) + '" sizes="' + imageSizes + '" width="720" height="960" alt="" loading="lazy" decoding="async"><span class="cover-title"></span><span class="cover-bottom"><span>' + escapeHTML(site.profile.name.toUpperCase()) + '</span><span>' + book.date.slice(0,4) + '</span></span></div></div><div class="book-face book-back"><span class="back-mark">' + escapeHTML(site.profile.name) + '</span><p></p><small>Published in ' + escapeHTML(book.publication) + '<br>' + book.date.slice(0,4) + '</small></div><div class="book-face book-spine"><span>' + number + '</span><b></b><span>' + escapeHTML(site.profile.initials) + '</span></div><div class="book-face book-edge"></div><div class="book-face book-top"></div><div class="book-face book-bottom"></div>';
    object.querySelector('.cover-title').textContent = book.short;
    object.querySelector('.book-spine b').textContent = book.title;
    object.querySelector('.book-back p').textContent = bookDescription(book);
    return object;
  }
  function selectBook(index, announce = true, scroll = false) {
    selected = clamp(index, 0, books.length - 1);
    shelfButtons.forEach((button, i) => {
      button.setAttribute('aria-label', uiCopy().previewArticle.replace(/:$/, '') + ': ' + books[i].title);
      button.closest('.publication').querySelector('.publication-meta').textContent = books[i].publication + ' · ' + articleDate(books[i]);
      button.querySelector('.preview-tag').innerHTML = renderCopy(uiCopy().previewTag);
    });
    $('book-counter').textContent = String(selected + 1).padStart(2, '0') + ' / ' + String(books.length).padStart(2, '0');
    $('book-prev').disabled = selected === 0;
    $('book-next').disabled = selected === books.length - 1;
    if (scroll) {
      const stage = $('book-stage'), article = shelfButtons[selected].closest('.publication');
      const stageRect = stage.getBoundingClientRect(), rect = article.getBoundingClientRect();
      if (stage.scrollWidth > stage.clientWidth) stage.scrollTo({left: stage.scrollLeft + rect.left - stageRect.left - (stage.clientWidth - rect.width) / 2, behavior: reducedMotion.matches ? 'auto' : 'smooth'});
    }
    if (announce) $('shelf-announcement').textContent = books[selected].title;
  }
  function turnCover(index) {
    shelfButtons.forEach((button, i) => { button.dataset.open = String(i === index); });
    if (index !== null) selectBook(index, false);
  }
  function updateInspection() {
    const book = books[selected];
    $('book-dialog').style.setProperty('--card-accent', ['#a8b9df', '#e5ed81', '#c1b6d5', '#a1b8e6'][bookCatalog.indexOf(book)]);
    $('dialog-title').textContent = book.title;
    $('dialog-category').textContent = bookCategory(book);
    $('dialog-description').textContent = bookDescription(book);
    $('dialog-read').href = book.url;
    $('dialog-byline').textContent = site.profile.name + ' · ' + articleDate(book) + ' · ' + book.readTime + (language === 'ja' ? '' : ' ') + uiCopy().minutesRead;
    $('inspection-book').replaceChildren(makeBook(book, selected, true));
  }
  function rotateInspection() {
    $('inspection-stage').style.setProperty('--inspect-x', inspectionRotation.x + 'deg');
    $('inspection-stage').style.setProperty('--inspect-y', inspectionRotation.y + 'deg');
  }
  let openingBook = false;
  let coverFlip;
  let cardEntrance;
  let cardExit;
  let returnCover;
  async function inspectBook() {
    if (openingBook || $('book-dialog').open) return;
    openingBook = true;
    returnCover?.cancel();
    restoreFocus = shelfButtons[selected];
    const source = restoreFocus.querySelector('.book-object');
    const origin = source.getBoundingClientRect();
    inspectionRotation = { x: 0, y: -12 };
    updateInspection(); rotateInspection();
    if (!reducedMotion.matches) {
      coverFlip = source.animate([
        { transform: getComputedStyle(source).transform, opacity: 1, filter: 'blur(0px)' },
        { transform: 'translateY(-6px) rotateY(-90deg)', opacity: 0, filter: 'blur(2px)' }
      ], { duration: 220, easing: 'cubic-bezier(.4,0,.4,1)', fill: 'forwards' });
      await coverFlip.finished.catch(() => {});
    }
    const dialog = $('book-dialog');
    dialog.showModal();
    root.classList.add('dialog-open');
    const destination = dialog.getBoundingClientRect();
    if (!reducedMotion.matches) {
      const dx = origin.left + origin.width / 2 - destination.left - destination.width / 2;
      const dy = origin.top + origin.height / 2 - destination.top - destination.height / 2;
      cardEntrance = dialog.animate([
        { transform: `perspective(1200px) translate(${dx}px, ${dy}px) rotateY(90deg) scale(.65)`, opacity: 0, filter: 'blur(4px)' },
        { transform: 'perspective(1200px) translate(0,0) rotateY(0deg) scale(1)', opacity: 1, filter: 'blur(0px)' }
      ], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    // Keep the source cover absent until the card returns to its shelf slot.
    source.style.visibility = 'hidden';
    coverFlip?.cancel();
    openingBook = false;
    $('book-close').focus({ preventScroll: true });
    resetPortrait();
  }
  books.forEach((book, index) => {
    const article = document.createElement('article');
    article.className = 'publication';
    article.addEventListener('focusin', () => selectBook(index, false));
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'shelf-book';
    button.setAttribute('aria-haspopup', 'dialog');
    button.append(makeBook(book, index));
    const preview = document.createElement('span'); preview.className = 'preview-tag'; preview.setAttribute('aria-hidden', 'true'); button.append(preview);
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && finePointer.matches) turnCover(index);
    });
    button.addEventListener('pointerleave', () => { if (pinnedCover !== index) turnCover(pinnedCover); });
    button.addEventListener('focus', () => { if (button.matches(':focus-visible')) turnCover(index); });
    button.addEventListener('click', () => {
      if (openingBook || $('book-dialog').open) return;
      selectBook(index);
      pinnedCover = index; turnCover(index); inspectBook();
    });
    const title = document.createElement('a'); title.className = 'publication-title'; title.lang = 'en'; title.href = book.url; title.target = '_blank'; title.rel = 'noreferrer'; title.textContent = book.title;
    const meta = document.createElement('span'); meta.className = 'publication-meta';
    article.append(button, title, meta); $('book-lineup').append(article); shelfButtons.push(button);
  });
  $('writing-shelf').classList.add('shelf-ready');
  const syncShelfNavigation = () => { $('shelf-toolbar').hidden = $('book-stage').scrollWidth <= $('book-stage').clientWidth + 1; };
  new ResizeObserver(syncShelfNavigation).observe($('book-stage'));
  syncShelfNavigation();
  $('shelf-fallback').hidden = true;
  $('book-prev').addEventListener('click', () => { selectBook(selected - 1, true, true); shelfButtons[selected].focus({preventScroll:true}); });
  $('book-next').addEventListener('click', () => { selectBook(selected + 1, true, true); shelfButtons[selected].focus({preventScroll:true}); });
  $('writing-shelf').addEventListener('keydown', event => {
    const next = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: books.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); selectBook(next, true, true); shelfButtons[selected].focus({preventScroll:true}); }
  });
  let scrollFrame = 0;
  $('book-stage').addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const stage = $('book-stage'), center = stage.getBoundingClientRect().left + stage.clientWidth / 2;
      let closest = 0, distance = Infinity;
      shelfButtons.forEach((button,i) => { const rect = button.getBoundingClientRect(); const delta = Math.abs(rect.left + rect.width / 2 - center); if (delta < distance) {distance = delta; closest = i;} });
      if (closest !== selected) selectBook(closest, false);
    });
  }, {passive:true});
  function closeBook() {
    const dialog = $('book-dialog');
    if (!dialog.open || dialog.dataset.closing) return;
    const currentTransform = getComputedStyle(dialog).transform;
    const currentOpacity = getComputedStyle(dialog).opacity;
    const currentFilter = getComputedStyle(dialog).filter;
    cardEntrance?.cancel();
    if (reducedMotion.matches) { dialog.close(); return; }
    const source = restoreFocus?.querySelector('.book-object');
    const target = restoreFocus?.getBoundingClientRect();
    // offset geometry stays stable even when the entrance is interrupted.
    const dx = target ? target.left + target.width / 2 - dialog.offsetLeft - dialog.offsetWidth / 2 : 0;
    const dy = target ? target.top + target.height / 2 - dialog.offsetTop - dialog.offsetHeight / 2 : 0;
    if (source) source.style.visibility = 'hidden';
    dialog.dataset.closing = 'true';
    cardExit = dialog.animate([
      { transform: currentTransform, opacity: currentOpacity, filter: currentFilter },
      { transform: `perspective(1200px) translate(${dx}px, ${dy}px) rotateY(90deg) scale(.65)`, opacity: 0, filter: 'blur(4px)' }
    ], { duration: 420, easing: 'cubic-bezier(.4,0,.4,1)', fill: 'forwards' });
    cardExit.finished.then(() => {
      if (!dialog.open) return;
      coverFlip?.cancel();
      dialog.close();
      if (source?.isConnected) {
        source.style.visibility = '';
        returnCover = source.animate([
          { transform: 'translateY(-6px) rotateY(-90deg)', opacity: 0, filter: 'blur(2px)' },
          { transform: getComputedStyle(source).transform, opacity: 1, filter: 'blur(0px)' }
        ], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }).catch(() => {});
  }
  $('book-close').addEventListener('click', closeBook);
  $('book-dialog').addEventListener('cancel', event => { event.preventDefault(); closeBook(); });
  $('book-dialog').addEventListener('click', event => {
    if (event.target !== $('book-dialog')) return;
    const rect = $('book-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeBook();
  });
  $('book-dialog').addEventListener('close', () => {
    const source = restoreFocus?.querySelector('.book-object');
    if (source) source.style.visibility = '';
    cardExit?.cancel();
    coverFlip?.cancel();
    delete $('book-dialog').dataset.closing;
    root.classList.remove('dialog-open');
    if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
  });
  $('rotate-left').addEventListener('click', () => { inspectionRotation.y -= 35; rotateInspection(); });
  $('rotate-right').addEventListener('click', () => { inspectionRotation.y += 35; rotateInspection(); });

  // Drag is progressive enhancement; every action also has a native button.
  function dragSurface(element, onMove, onEnd) {
    let drag = null;
    let suppressClick = false;
    let suppressTimer;
    element.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary) return;
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: 0, y: 0, active: false };
    });
    element.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      if (event.buttons === 0) { finish(event, true); return; }
      const x = event.clientX - drag.startX, y = event.clientY - drag.startY;
      if (!drag.active) {
        if (Math.abs(y) > 12 && Math.abs(y) > Math.abs(x)) { drag = null; return; }
        if (Math.abs(x) < 8) return;
        drag.active = true;
        element.setPointerCapture(event.pointerId);
        element.classList.add('dragging');
      }
      onMove(x - drag.x, y - drag.y, x, y);
      drag.x = x; drag.y = y;
    });
    function finish(event, cancelled = false) {
      if (!drag || event.pointerId !== drag.id) return;
      const completed = drag;
      drag = null;
      element.classList.remove('dragging');
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
      if (completed.active) {
        suppressClick = true;
        clearTimeout(suppressTimer);
        suppressTimer = setTimeout(() => { suppressClick = false; }, 400);
        onEnd(completed.x, completed.y, cancelled);
      }
    }
    element.addEventListener('pointerup', event => finish(event));
    element.addEventListener('pointercancel', event => finish(event, true));
    element.addEventListener('pointerleave', () => { if (drag && !drag.active) drag = null; });
    element.addEventListener('lostpointercapture', event => finish(event, true));
    window.addEventListener('pointerup', event => finish(event));
    window.addEventListener('pointercancel', event => finish(event, true));
    window.addEventListener('blur', () => { if (drag) finish({ pointerId: drag.id }, true); });
    element.addEventListener('click', event => {
      if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
    }, true);
  }


  function setLanguage(next) {
    language = supportedLanguages.includes(next) ? next : 'en';
    root.lang = language;
    const copy = localePacks[language]?.copy || (language === 'id' ? indonesian : english);
    document.querySelectorAll('[data-copy]').forEach(node => {
      const content = renderCopy(copy[node.dataset.copy] ?? english[node.dataset.copy]);
      // Keep already-rendered copy in place on the initial English load.
      if (node.innerHTML !== content) node.innerHTML = content;
    });
    const ui = uiCopy();
    $('current-language').textContent = language.toUpperCase();
    $('language-toggle').setAttribute('aria-label', ui.language + ': ' + languageNames[language]);
    $('language-menu').setAttribute('aria-label', ui.language);
    $('language-heading').textContent = ui.language;
    $('auto-label').textContent = ui.automatic;
    $('auto-language').textContent = ui.browserLanguage + ' · ' + languageNames[detectLanguage()];
    document.querySelectorAll('[data-locale]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.locale === languagePreference)));
    ['book-prev','book-next','rotate-left','rotate-right'].forEach((id,i) => $(id).setAttribute('aria-label', [ui.previousArticle,ui.nextArticle,ui.rotateLeft,ui.rotateRight][i]));
    syncTheme(); selectBook(selected, false);
    if ($('book-dialog').open) updateInspection();
  }
  const menuButtons = [...document.querySelectorAll('[data-locale]')];
  function closeLanguageMenu(restore = false) {
    $('language-menu').hidden = true;
    $('language-toggle').setAttribute('aria-expanded','false');
    if (restore) $('language-toggle').focus({preventScroll:true});
  }
  function openLanguageMenu() {
    $('language-menu').hidden = false;
    $('language-toggle').setAttribute('aria-expanded','true');
    menuButtons.find(button => button.dataset.locale === languagePreference)?.focus({preventScroll:true});
  }
  $('language-toggle').addEventListener('click', () => { if ($('language-menu').hidden) openLanguageMenu(); else closeLanguageMenu(); });
  $('language-toggle').addEventListener('keydown', event => { if (event.key === 'ArrowDown') {event.preventDefault(); openLanguageMenu();} });
  menuButtons.forEach(button => button.addEventListener('click', () => {
    languagePreference = button.dataset.locale;
    try { localStorage.setItem('folio.language-preference',languagePreference); } catch {}
    setLanguage(languagePreference === 'auto' ? detectLanguage() : languagePreference);
    closeLanguageMenu(true);
  }));
  $('language-menu').addEventListener('keydown', event => {
    const index = menuButtons.indexOf(document.activeElement);
    const next = {ArrowDown:(index+1)%menuButtons.length,ArrowUp:(index-1+menuButtons.length)%menuButtons.length,Home:0,End:menuButtons.length-1}[event.key];
    if (next !== undefined) {event.preventDefault(); menuButtons[next].focus();}
    if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); closeLanguageMenu(true);}
  });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.language-picker')) closeLanguageMenu(); });
  document.addEventListener('focusin', event => { if (!event.target.closest('.language-picker')) closeLanguageMenu(); });
  window.addEventListener('languagechange', () => { if (languagePreference === 'auto') setLanguage(detectLanguage()); });
  setLanguage(language);
})();

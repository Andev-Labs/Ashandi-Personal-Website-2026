import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, locales } from './validate.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const arrow = '<svg class="hero-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><use href="/assets/icons/heroicons.svg#arrow-up-right"></use></svg>';
const articleURL = article => article.url || `/writing/${article.slug}/`;
const renderCopy = (key, text) => key.startsWith('note') ? text.split('\n').map((line,i) => i ? escapeHTML(line) : `<b>${escapeHTML(line)}</b>`).join('') : escapeHTML(text);

export function build({ site: supplied, outDir = path.join(root, 'dist'), siteUrl = process.env.SITE_URL } = {}) {
  const site = structuredClone(supplied || JSON.parse(fs.readFileSync(path.join(root, 'content/site.json'), 'utf8')));
  if (siteUrl) site.meta.url = siteUrl;
  validate(site);
  site.profile.portraitDark = site.profile.portraitMode === 'image' ? site.profile.portrait : (site.profile.portraitDark || site.profile.portrait);
  const url = new URL(site.meta.url);
  const base = url.pathname.replace(/\/$/, '');
  const routeURL = value => base && value.startsWith('/') && !value.startsWith('//') ? base + value : value;
  const htmlURLs = value => base ? value.replace(/((?:href|src)=["'])\/(?!\/)/g, `$1${base}/`) : value;
  // The output is disposable. Source/public are never served or removed by build.
  if (path.resolve(outDir) === root || root.startsWith(path.resolve(outDir) + path.sep)) throw new Error('Output must not contain the source directory.');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.cpSync(path.join(root, 'public'), outDir, { recursive: true });
  const put = (name, value) => {
    const file = path.join(outDir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  };
  const absolute = route => new URL(route.replace(/^\//, ''), site.meta.url).href;
  // Generate a fallback only when no custom project image was supplied.
  site.projects.forEach((project,i) => {
    if (project.image) return;
    const color = ['#e8e2d4','#d6e2d9','#dbe0ed'][i%3];
    put(`assets/images/project-${i+1}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 405"><rect width="720" height="405" fill="${color}"/><g fill="none" stroke="#313a36" stroke-width="2"><rect x="235" y="90" width="250" height="225" rx="10"/><path d="M267 137h150m-150 24h100m-100 58h185m-185 24h185m-185 24h80"/><circle cx="430" cy="158" r="35" fill="${color}"/></g><text x="42" y="363" fill="#313a36" font-family="sans-serif" font-size="16">${String(i+1).padStart(2,'0')} / ${escapeHTML(project.title)}</text></svg>`);
  });
  const companyMarkup = (id, linked = true) => {
    const company = site.companies[id];
    const tag = linked && company.url ? 'a' : 'span';
    return `<${tag} class="inline-company"${tag === 'a' ? ` href="${escapeHTML(company.url)}" target="_blank" rel="noreferrer"` : ''}><img data-company="${escapeHTML(id)}" src="${escapeHTML(company.logo)}" width="20" height="20" alt="">${escapeHTML(company.name)}</${tag}>`;
  };
  const authoredCopy = (key,value) => renderCopy(key,value).replace(/\{company:([a-z0-9-]+)\}/g,(_,id)=>companyMarkup(id));
  const copy = Object.fromEntries(Object.entries(site.copy).map(([locale, values]) => [locale, { copy: Object.fromEntries(Object.entries({ ...site.copy.en, ...values }).map(([key,value]) => [key,authoredCopy(key,value)])) }]));
  const title = `${site.profile.name} | ${site.copy.en.role.replace(/\.$/, '')}`;
  const tokens = {
    'meta.title': escapeHTML(title), 'meta.description': escapeHTML(site.meta.description),
    'meta.url': escapeHTML(site.meta.url), 'meta.imageUrl': escapeHTML(absolute(site.meta.image)),
    'meta.imageType': site.meta.image.endsWith('.png') ? 'image/png' : site.meta.image.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
    structuredData: json({ '@context':'https://schema.org', '@type':'Person', name:site.profile.name, url:site.meta.url, jobTitle:site.copy.en.role }),
    projects: site.projects.map((project,i) => `<a class="work-item" href="/work/${project.slug}/"><span class="work-preview" aria-hidden="true"><img src="${escapeHTML(project.image || `/assets/images/project-${i+1}.svg`)}" width="120" height="120" alt="" loading="lazy"></span><span class="work-copy"><span class="work-title">${escapeHTML(project.title)} <span class="work-arrow" aria-hidden="true">${arrow}</span></span><span class="work-description" data-copy="project${i}Description">${escapeHTML(project.description[0])}</span><span class="work-kind">${companyMarkup(project.companyId,false)} · ${escapeHTML(project.label)}</span></span></a>`).join('\n'),
    experience: site.experience.map((item,i)=>`<article class="experience-item"><span class="experience-period">${escapeHTML(item.period)}</span><div class="experience-copy"><h3>${companyMarkup(item.companyId)}</h3><p class="experience-role">${escapeHTML(item.role)}</p><p data-copy="experience${i}Summary">${escapeHTML(item.summary[0])}</p>${item.highlights ? `<ul class="experience-highlights">${item.highlights.map((highlight,j)=>`<li data-copy="experience${i}Highlight${j}">${escapeHTML(highlight[0])}</li>`).join('')}</ul>` : ''}${item.recommendation ? `<figure class="experience-recommendation"><blockquote><p data-copy="experience${i}RecommendationQuote">${escapeHTML(item.recommendation.quote[0])}</p></blockquote><figcaption><span class="experience-recommendation-author">${escapeHTML(item.recommendation.author)}</span>, ${escapeHTML(item.recommendation.title)} · <a href="${escapeHTML(item.recommendation.letter)}" target="_blank" rel="noreferrer" data-copy="experience${i}RecommendationLink">${escapeHTML(item.recommendation.letterLabel[0])}</a></figcaption></figure>` : ''}${item.stack ? `<ul class="experience-stack">${item.stack.map(tool=>`<li>${escapeHTML(tool)}</li>`).join('')}</ul>` : ''}<span class="experience-location">${escapeHTML(item.location)}</span></div></article>`).join('\n'),
    expertise: site.expertise.map((item,i)=>`<div class="expertise-item"><h3 data-copy="expertise${i}Title">${escapeHTML(item.title[0])}</h3><p data-copy="expertise${i}Description">${escapeHTML(item.description[0])}</p></div>`).join('\n'),
    articleFallback: site.articles.map(article => `<a href="${escapeHTML(articleURL(article))}"${article.url ? ' target="_blank" rel="noreferrer"' : ''}>${escapeHTML(article.title)} ${arrow}</a>`).join(''),
    socials: site.socials.map(link => `<a href="${escapeHTML(link.url)}" target="_blank" rel="noreferrer">${escapeHTML(link.label)} ${arrow}</a>`).join(''),
  };
  for (const [key,value] of Object.entries(site.profile)) tokens[`profile.${key}`] = escapeHTML(value);
  for (const [key,value] of Object.entries(site.copy.en)) tokens[`copy.${key}`] = authoredCopy(key,value);
  const template = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
  put('index.html', template.replace(/\{\{([\w.]+)\}\}/g, (_,key) => {
    if (!(key in tokens)) throw new Error(`Missing template value: ${key}`);
    return tokens[key];
  }));
  site.projects.forEach((project,i) => locales.forEach((locale,index) => {
    copy[locale].copy[`project${i}Description`] = escapeHTML(project.description[index] || project.description[0]);
  }));
  site.experience.forEach((item,i)=>locales.forEach((locale,index)=>{
    copy[locale].copy[`experience${i}Summary`]=escapeHTML(item.summary[index] || item.summary[0]);
    (item.highlights || []).forEach((highlight,j)=>{ copy[locale].copy[`experience${i}Highlight${j}`]=escapeHTML(highlight[index] || highlight[0]); });
    if (item.recommendation) {
      copy[locale].copy[`experience${i}RecommendationQuote`]=escapeHTML(item.recommendation.quote[index] || item.recommendation.quote[0]);
      copy[locale].copy[`experience${i}RecommendationLink`]=escapeHTML(item.recommendation.letterLabel[index] || item.recommendation.letterLabel[0]);
    }
  }));
  site.expertise.forEach((item,i)=>locales.forEach((locale,index)=>{
    copy[locale].copy[`expertise${i}Title`]=escapeHTML(item.title[index] || item.title[0]);
    copy[locale].copy[`expertise${i}Description`]=escapeHTML(item.description[index] || item.description[0]);
  }));
  const articles = site.articles.map(article => ({ ...article, image:routeURL(article.image), srcset: `${routeURL(article.image)} 720w`, url: routeURL(articleURL(article)) }));
  const profile = { ...site.profile, portrait:routeURL(site.profile.portrait), portraitDark:routeURL(site.profile.portraitDark) };
  for(const pack of Object.values(copy)) for(const key of Object.keys(pack.copy)) pack.copy[key]=htmlURLs(pack.copy[key]);
  put('assets/site-data.js', `// Generated from content/site.json. Edit the source, then rebuild.\nwindow.portfolioData = ${json({ profile, articles })};\nwindow.portfolioLocales = ${json(copy)};\n`);

  const page = (heading, description, content, route, footer = '') => `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHTML(heading)} | ${escapeHTML(site.profile.name)}</title><meta name="description" content="${escapeHTML(description)}"><meta name="color-scheme" content="light dark"><link rel="canonical" href="${escapeHTML(absolute(route))}"><link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><script src="/assets/theme.js"></script><link rel="stylesheet" href="/assets/folio/home.css"><link rel="stylesheet" href="/assets/template.css"></head>
<body><a class="skip-link" href="#main">Skip to content</a><main class="article-shell" id="main"><header><nav><a href="/">← ${escapeHTML(site.profile.name)}</a><a href="/#contact">Contact ↗</a></nav></header><h1>${escapeHTML(heading)}</h1><p>${escapeHTML(description)}</p>${content}<footer>${footer || 'Sample content. Replace it with your own story.'}<br><a href="/">← Back to portfolio</a></footer></main></body></html>`;
  const routes = ['/'];
  const paragraphs = body => body.map(text => `<p>${escapeHTML(text)}</p>`).join('\n');
  site.projects.forEach((project,i) => {
    const route = `/work/${project.slug}/`; routes.push(route);
    const facts = [['Context',`${site.companies[project.companyId].name} · ${project.label}`],['Focus',project.sector],['Contribution',project.role],['Period',project.year]];
    const story = project.body.map((paragraph,index)=>`${index < 5 ? `<h2>${['The question','The approach','My contribution','The details','Concept outcome'][index]}</h2>`:''}<p>${escapeHTML(paragraph)}</p>`).join('\n');
    put(`work/${project.slug}/index.html`, page(project.title, project.description[0], `<p class="project-disclosure">${escapeHTML(site.copy.en.demoNotice)}</p><dl class="project-facts">${facts.map(([key,value])=>`<div><dt>${escapeHTML(key)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><img class="article-image" src="${escapeHTML(project.image || `/assets/images/project-${i+1}.svg`)}" width="720" height="405" alt="Abstract illustration for ${escapeHTML(project.title)}">${story}<h2>Areas of contribution</h2><ul class="contribution-list">${project.contributions.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul>`, route));
  });
  site.articles.filter(article => !article.url).forEach(article => {
    const route = `/writing/${article.slug}/`; routes.push(route);
    put(`writing/${article.slug}/index.html`, page(article.title, article.description[0], `<p>${escapeHTML(site.profile.name)} · ${escapeHTML(article.date)} · ${article.readTime} min read</p>${paragraphs(article.body)}`, route));
  });
  routes.push('/writing/', '/credits/');
  put('writing/index.html', page(site.copy.en.writingHeading, site.copy.en.writingIntro, site.articles.map(article => `<section><h2><a href="${escapeHTML(articleURL(article))}">${escapeHTML(article.title)}</a></h2><p>${escapeHTML(article.description[0])}</p></section>`).join(''), '/writing/'));
  put('credits/index.html', page('Made with a little help.', 'Design references, dependencies, and the people behind the template.', `<section><h2>Design & interaction</h2><p>Template by <a href="https://daniasyrofi.com/">Dani Asyrofi</a>. Editorial references: <a href="https://pedromarques.me/">Pedro Marques</a> and <a href="https://dahbiahmed.com/">Ahmed Dahbi</a>. <a href="https://bencho.dev/">Bencho</a> informed the continuous, interruptible motion guidelines; it is a design reference, not a bundled component.</p></section><section><h2>Open-source dependencies</h2><p><a href="https://github.com/edoardolunardi/kugiri">Kugiri</a> text splitting retains its <a href="/assets/folio/enhancements/vendor/LICENSE">MIT license</a> and <a href="/assets/folio/enhancements/vendor/NOTICE.md">notice</a>. <a href="/assets/icons/HEROICONS-LICENSE.txt">Heroicons</a> retains its MIT license. Font licenses remain beside each typeface under assets/fonts; Caveat's <a href="/assets/folio/enhancements/vendor/caveat/OFL.txt">OFL</a> remains beside its binary.</p></section><section><h2>Company marks</h2><p>Apple and SpaceX logos are shown only as references for fictional concepts. Sources and ownership notes are in the <a href="/assets/images/companies/NOTICE.md">company asset notice</a>. The other organisation marks are original illustrations for the sample data.</p></section><section><h2>Use this template</h2><p><a href="https://github.com/daniasyrofi/syrofolio">Source and setup guide</a>. This release uses a <a href="/LICENSE">source-available license with no template resale</a>. Third-party licenses and rights already granted in earlier releases remain unchanged. Replace the demonstration name and portrait before publishing your own portfolio.</p></section>`, '/credits/', 'Attribution does not imply endorsement.'));
  put('404.html', page('This page has moved.', 'The address may have changed. You can find the work and writing on the homepage.', '<p><a href="/">Return home →</a></p>', '/404.html', ''));
  put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route=>`<url><loc>${escapeHTML(absolute(route))}</loc></url>`).join('')}</urlset>`);
  put('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${absolute('/sitemap.xml')}\n`);
  put('site.webmanifest', json({ name:site.profile.name, short_name:site.profile.name, start_url:`${base}/`, display:'standalone', background_color:'#080808', theme_color:'#080808', icons:[{src:`${base}/assets/favicon-512.png`,sizes:"512x512",type:"image/png"},{src:`${base}/assets/apple-touch-icon.png`,sizes:"180x180",type:"image/png"}] }));
  put('.nojekyll', '');
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(outDir, 'LICENSE'));
  put('assets/social-card.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#111"/><circle cx="1050" cy="70" r="280" fill="none" stroke="#444"/><text x="100" y="290" fill="#fff" font-family="sans-serif" font-size="72">${escapeHTML(site.profile.name)}</text><text x="104" y="360" fill="#aaa" font-family="sans-serif" font-size="28">${escapeHTML(site.copy.en.role)}</text></svg>`);
  // Support both a domain root and a GitHub project subdirectory. Rewrite only
  // root-relative authored asset/navigation references, never external origins.
  if (base) {
    for (const file of fs.readdirSync(outDir, { recursive: true })) {
      const full = path.join(outDir, file);
      if (!fs.statSync(full).isFile() || !/\.(html|css|js)$/.test(file)) continue;
      let text = fs.readFileSync(full, 'utf8');
      if (file.endsWith('.html')) text = htmlURLs(text);
      else if (file.endsWith('.css')) text = text.replace(/(url\(\s*["']?)\/(?!\/)/g, `$1${base}/`);
      // Only literal runtime asset paths need rewriting. Never match a slash
      // after '(' — that can be a JavaScript regular-expression literal.
      // Generated content has already been prefixed structurally above.
      else if (!file.endsWith('site-data.js')) text = text.replace(/(["'])\/assets\//g, `$1${base}/assets/`);
      fs.writeFileSync(full, text);
    }
  }
  return { outDir, base, routes:routes.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = build(); console.log(`Built ${result.routes} pages → dist/ (base: ${result.base || '/'})`); }
  catch (error) { console.error(`Build failed: ${error.message}`); process.exitCode = 1; }
}

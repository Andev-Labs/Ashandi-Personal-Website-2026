import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Order matters: translated arrays in content/site.json follow this order.
export const locales = ['en','id','zh'];

export function validate(site) {
  const fail = (key, message) => { throw new Error(`content/site.json → ${key}: ${message}`); };
  const text = (value,key) => { if (typeof value !== 'string' || !value.trim()) fail(key,'must be a non-empty string'); };
  const url = (value,key) => {
    text(value,key);
    if (/\s|[<>"'`\\]/u.test(value)) fail(key,'must be a URL without spaces or markup');
    if (value.startsWith('/') && !value.startsWith('//') && !value.split('/').includes('..')) return;
    let parsed; try { parsed = new URL(value); } catch { fail(key,'use an https:// URL or a site-relative /path/'); }
    if (!['https:','http:'].includes(parsed.protocol) || parsed.username || parsed.password) fail(key,'only HTTP(S) or local paths are allowed');
  };
  if (!site || typeof site !== 'object') fail('root','must be an object');
  for (const key of ['profile','meta','copy']) if (!site[key] || typeof site[key] !== 'object') fail(key,'is required');
  for (const key of ['name','initials','location','timezone','timeLabel','email','slogan']) text(site.profile[key],`profile.${key}`);
  if (!/^[^\s<>"'@]+@[^\s<>"'@]+\.[^\s<>"'@]+$/.test(site.profile.email)) fail('profile.email','must be an email address');
  if (site.profile.initials.length > 3) fail('profile.initials','use 1–3 characters');
  try { new Intl.DateTimeFormat('en',{timeZone:site.profile.timezone}); } catch { fail('profile.timezone','use an IANA timezone, e.g. Asia/Jakarta'); }
  if (!['sprite','image'].includes(site.profile.portraitMode)) fail('profile.portraitMode','must be sprite or image');
  for (const key of ['portrait','experienceUrl','writingUrl']) url(site.profile[key],`profile.${key}`);
  if (site.profile.portraitDark) {
    url(site.profile.portraitDark,'profile.portraitDark');
    if (!site.profile.portraitDark.startsWith('/assets/')) fail('profile.portraitDark','must be a local /assets/ image');
  }
  if (!site.profile.portrait.startsWith('/assets/')) fail('profile.portrait','must be a local /assets/ image');
  url(site.meta.url,'meta.url');
  const origin = new URL(site.meta.url);
  if (!site.meta.url.endsWith('/') || origin.search || origin.hash) fail('meta.url','use an absolute URL ending in /, with no query or fragment');
  text(site.meta.description,'meta.description');
  if (!site.companies || typeof site.companies !== 'object' || Array.isArray(site.companies)) fail('companies','must be an object of company definitions');
  for(const [id,company] of Object.entries(site.companies)) {
    if(!/^[a-z0-9-]+$/.test(id)) fail('companies','use lowercase company IDs');
    text(company.name,`companies.${id}.name`); url(company.url,`companies.${id}.url`); url(company.logo,`companies.${id}.logo`);
    if(!company.logo.startsWith('/assets/')) fail(`companies.${id}.logo`,'must be a local /assets/ logo');
  }
  url(site.meta.image,'meta.image');
  if (!/^\/assets\/.+\.(png|jpe?g|webp)$/i.test(site.meta.image)) fail('meta.image','use a local PNG, JPEG, or WebP (1200 × 630 recommended)');
  const requiredCopy = ['role','introOne','introTwo','introThree','letsTalk','openNotes','workHeading','workAside','writingHeading','writingIntro','allWriting','shelfHint','aboutHeading','aboutOne','aboutTwo','linkedinHistory','contactHeading','contactCopy','footerNote','rotateHint','readArticle','notePortrait','noteType','noteWork','noteShelf','noteContact'];
  for (const locale of locales) {
    if (!site.copy[locale]) fail(`copy.${locale}`,'is required');
    for (const key of requiredCopy) text(site.copy[locale][key],`copy.${locale}.${key}`);
    for (const [key,value] of Object.entries(site.copy[locale])) {
      text(value,`copy.${locale}.${key}`);
      for(const match of value.matchAll(/\{company:([^}]+)\}/g)) if(!site.companies[match[1]]) fail(`copy.${locale}.${key}`,`unknown company ${match[1]}`);
    }
  }
  for (const group of ['projects','articles','socials','experience','expertise']) if (!Array.isArray(site[group])) fail(group,'must be an array');
  for (const key of ['demoNotice','experienceHeading','experienceAside','experienceIntro','expertiseHeading','expertiseIntro']) for (const locale of locales) text(site.copy[locale][key],`copy.${locale}.${key}`);
  if (!site.articles.length) fail('articles','keep at least one article for the interactive bookshelf');
  for (const group of ['projects','articles']) {
    const seen = new Set();
    site[group].forEach((item,i) => {
      const key = `${group}[${i}]`;
      if (!item || typeof item !== 'object') fail(key,'must be an object');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) fail(`${key}.slug`,'use lowercase words separated by hyphens');
      if (seen.has(item.slug)) fail(`${key}.slug`,'must be unique');
      seen.add(item.slug);
      text(item.title,`${key}.title`);
      for (const prop of ['description','body']) {
        if (prop === 'body' && group === 'articles' && item.url !== undefined) continue;
        if (!Array.isArray(item[prop]) || !item[prop].length) fail(`${key}.${prop}`,'must be a non-empty array of text');
        item[prop].forEach((value,j) => text(value,`${key}.${prop}[${j}]`));
      }
      if (group === 'projects') {
        for (const prop of ['role','year','sector','label']) text(item[prop],`${key}.${prop}`);
        if(!site.companies[item.companyId]) fail(`${key}.companyId`,'must match an ID in companies');
        if (item.image) { url(item.image,`${key}.image`); if(!item.image.startsWith('/assets/')) fail(`${key}.image`,'must be a local /assets/ image'); }
        if(!Array.isArray(item.contributions) || !item.contributions.length) fail(`${key}.contributions`,'must be a non-empty list');
        item.contributions.forEach((value,j)=>text(value,`${key}.contributions[${j}]`));
      }
      else {
        for (const prop of ['short','publication']) text(item[prop],`${key}.${prop}`);
        if (!Array.isArray(item.category) || !item.category.length) fail(`${key}.category`,'must be an array of labels');
        item.category.forEach((value,j) => text(value,`${key}.category[${j}]`));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(Date.parse(item.date)) || new Date(item.date).toISOString().slice(0,10)!==item.date) fail(`${key}.date`,'use a real YYYY-MM-DD date');
        if (!Number.isInteger(item.readTime) || item.readTime < 1) fail(`${key}.readTime`,'must be a positive whole number');
        if (!/^#[a-f\d]{6}$/i.test(item.coverColor)) fail(`${key}.coverColor`,'use a six-digit hex color');
        url(item.image,`${key}.image`);
        if (!item.image.startsWith('/assets/')) fail(`${key}.image`,'must be a local /assets/ image');
        if (item.url !== undefined && !/^https:\/\//.test(item.url)) fail(`${key}.url`,'must be an absolute https:// URL to the published article');
      }
    });
  }
  site.socials.forEach((link,i)=>{ text(link.label,`socials[${i}].label`); url(link.url,`socials[${i}].url`); });
  site.experience.forEach((item,i)=>{
    if(!site.companies[item.companyId]) fail(`experience[${i}].companyId`,'must match an ID in companies');
    for (const key of ['role','period','location']) text(item[key],`experience[${i}].${key}`);
    if(!Array.isArray(item.summary)||!item.summary.length) fail(`experience[${i}].summary`,'must be a list of translated summaries');
    item.summary.forEach((value,j)=>text(value,`experience[${i}].summary[${j}]`));
    if (item.highlights !== undefined) {
      if (!Array.isArray(item.highlights) || !item.highlights.length) fail(`experience[${i}].highlights`,'must be a non-empty list of translated highlights');
      item.highlights.forEach((highlight,j)=>{
        if (!Array.isArray(highlight) || !highlight.length) fail(`experience[${i}].highlights[${j}]`,`must be a list of translations in ${locales.join(', ')} order`);
        highlight.forEach((value,k)=>text(value,`experience[${i}].highlights[${j}][${k}]`));
      });
    }
    if (item.stack !== undefined) {
      if (!Array.isArray(item.stack) || !item.stack.length) fail(`experience[${i}].stack`,'must be a non-empty list of tools');
      item.stack.forEach((value,j)=>text(value,`experience[${i}].stack[${j}]`));
    }
  });
  site.expertise.forEach((item,i)=>{
    for (const key of ['title','description']) {
      if(!Array.isArray(item[key])||!item[key].length) fail(`expertise[${i}].${key}`,'must be a list of translated text');
      item[key].forEach((value,j)=>text(value,`expertise[${i}].${key}[${j}]`));
    }
  });
  return site;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { validate(JSON.parse(fs.readFileSync(new URL('../content/site.json',import.meta.url),'utf8'))); console.log('Content is valid.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

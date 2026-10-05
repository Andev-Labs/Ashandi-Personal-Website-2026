import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build, root } from './build.mjs';

const { outDir, base } = build();
const files = fs.readdirSync(outDir,{ recursive:true }).filter(file=>fs.statSync(path.join(outDir,file)).isFile());
const errors = [];
let bytes = 0;
for (const file of files) {
  const full = path.join(outDir,file);
  bytes += fs.statSync(full).size;
  if (/\.(html|css|js)$/.test(file)) {
    const source = fs.readFileSync(full,'utf8');
    if (/\{\{(?:profile|meta|copy)\./.test(source)) errors.push(`${file}: unresolved content token`);
    const references = [...source.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"|url\(\s*["']?([^\s)'"#]+)|(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)].map(match=>match[1]||match[2]||match[3]);
    for (let ref of references) {
      if (ref.includes("' +") || ref.includes('${')) continue; // Dynamic JS values are checked from content/site.json below.
      if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
      ref=ref.split(/[?#]/)[0];
      if (base && ref.startsWith(base+'/')) ref=ref.slice(base.length);
      let target=ref.startsWith('/') ? path.join(outDir,ref) : path.resolve(path.dirname(full),ref);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
      if (!fs.existsSync(target)) errors.push(`${file}: missing local reference ${ref}`);
    }
    if (file.endsWith('.js')) {
      try { execFileSync(process.execPath,['--check',full],{stdio:'pipe'}); }
      catch (error) { errors.push(`${file}: ${error.stderr}`); }
    }
  }
}
const site=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
for (const ref of [site.profile.portrait,site.profile.portraitDark,site.meta.image,...site.articles.map(a=>a.image),...site.projects.map(p=>p.image),...Object.values(site.companies).map(c=>c.logo)].filter(Boolean)) {
  if (!fs.existsSync(path.join(root,'public',ref))) errors.push(`content/site.json: missing image ${ref}`);
}
if (bytes > 5*1024*1024) errors.push(`Site is ${(bytes/1024/1024).toFixed(2)} MB; keep the starter below 5 MB.`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log(`Checked ${files.length} files: syntax, local links, images, and ${(bytes/1024/1024).toFixed(2)} MB output.`);

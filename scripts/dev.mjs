import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { build, root } from './build.mjs';

const preview = process.argv.includes('--preview');
const port = Number(process.env.PORT || 4310);
const host = process.env.HOST || '127.0.0.1';
// Keep the active development preview isolated from production/CI builds.
const buildOptions = preview ? {} : { outDir:path.join(root,'.preview') };
let result = build(buildOptions);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{ Allow:'GET, HEAD' }); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Invalid URL'); return; }
  if (result.base) {
    if (pathname === '/') { res.writeHead(302,{ Location:result.base+'/' }); res.end(); return; }
    if (!pathname.startsWith(result.base+'/')) { res.writeHead(404); res.end('Not found'); return; }
    pathname = pathname.slice(result.base.length);
  }
  let file = path.resolve(result.outDir, '.'+pathname);
  if (!file.startsWith(result.outDir+path.sep) && file !== result.outDir) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) { res.writeHead(301,{Location:result.base+pathname+'/'}); res.end(); return; }
    file = path.join(file,'index.html');
  }
  let status = 200;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { file = path.join(result.outDir,'404.html'); status=404; }
  res.writeHead(status,{'Content-Type':mime[path.extname(file)] || 'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
});
server.listen(port,host,()=>console.log(`Portfolio ${preview?'preview':'development'} → http://${host}:${port}${result.base}/\n${preview?'':'Edit content/site.json and refresh your browser. Changes rebuild automatically.'}`));
let timer;
const watchers = preview ? [] : ['content','src','public'].map(dir => fs.watch(path.join(root,dir),{recursive:true},()=>{
  clearTimeout(timer);
  timer=setTimeout(()=>{ try { result=build(buildOptions); console.log('Rebuilt. Refresh the page.'); } catch (error) { console.error(error.message); } },120);
}));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{ clearTimeout(timer); watchers.forEach(w=>w.close()); server.close(); });

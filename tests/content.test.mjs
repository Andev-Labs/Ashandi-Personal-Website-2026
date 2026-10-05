import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { build, root } from '../scripts/build.mjs';
import { validate } from '../scripts/validate.mjs';

const original=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
test('one profile edit reaches rendered HTML, metadata, and runtime content',()=>{
  const site=structuredClone(original);
  site.profile.name='Alex & Jamie <Studio>';
  site.profile.email='team@example.net';
  site.profile.timezone='Europe/London';
  site.copy.en.introTwo='Independent design for small teams.';
  const outDir=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-content-'));
  try {
    build({site,outDir});
    const html=fs.readFileSync(path.join(outDir,'index.html'),'utf8');
    assert.match(html,/<h1>Alex &amp; Jamie &lt;Studio&gt;<\/h1>/);
    assert.match(html,/team@example.net/);
    assert.doesNotMatch(html,/Abadikan|Lumoshive|hello@daniasyrofi/);
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(outDir,'assets/site-data.js'),'utf8'),context);
    assert.equal(context.window.portfolioData.profile.name,site.profile.name);
    assert.equal(context.window.portfolioData.profile.timezone,'Europe/London');
    assert.equal(context.window.portfolioLocales.en.copy.introTwo,site.copy.en.introTwo);
  } finally { fs.rmSync(outDir,{recursive:true,force:true}); }
});
test('GitHub Pages subdirectory reaches HTML, CSS, runtime links and sitemap',()=>{
  const outDir=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-base-'));
  try {
    const site=structuredClone(original);
    site.articles.push({...site.articles[0],slug:'local-note',url:undefined,body:['A note hosted on this site.']});
    build({site,outDir,siteUrl:'https://someone.github.io/portfolio/'});
    const html=fs.readFileSync(path.join(outDir,'index.html'),'utf8');
    assert.match(html,/href="\/portfolio\/assets\/folio\/home.css"/);
    assert.match(html,/href="\/portfolio\/writing\/local-note\/"/);
    assert.match(fs.readFileSync(path.join(outDir,'assets/folio/home.css'),'utf8'),/\/portfolio\/assets\/fonts\//);
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(outDir,'assets/site-data.js'),'utf8'),context);
    assert.equal(context.window.portfolioData.articles[0].url,site.articles[0].url,'external articles keep their published URL');
    assert.equal(context.window.portfolioData.articles[1].url,'/portfolio/writing/local-note/');
    assert.ok(!fs.existsSync(path.join(outDir,'writing',site.articles[0].slug)),'external articles get no local page');
    assert.match(fs.readFileSync(path.join(outDir,'sitemap.xml'),'utf8'),/https:\/\/someone.github.io\/portfolio\/writing\//);
    const vendor='assets/folio/enhancements/vendor/text-split.js';
    assert.equal(fs.readFileSync(path.join(outDir,vendor),'utf8'),fs.readFileSync(path.join(root,'public',vendor),'utf8'),'subdirectory deployment must preserve upstream regex literals');
    for(const file of fs.readdirSync(outDir,{recursive:true}).filter(file=>file.endsWith('.js'))) execFileSync(process.execPath,['--check',path.join(outDir,file)],{stdio:'pipe'});
    assert.match(context.window.portfolioLocales.en.copy.introTwo,/src="\/portfolio\/assets\/images\/companies\/zeroone.svg"/);
  } finally { fs.rmSync(outDir,{recursive:true,force:true}); }
});
test('unsafe URLs, duplicate slugs, missing translations, and invalid dates have actionable errors',()=>{
  for (const [mutate,pattern] of [
    [s=>s.socials[0].url='javascript:alert(1)',/socials\[0\].url/],
    [s=>s.projects[1].slug=s.projects[0].slug,/must be unique/],
    [s=>s.articles[0].slug='../escape',/slug/],
    [s=>s.articles[0].date='2026-02-30',/real YYYY-MM-DD/],
    [s=>s.articles[0].url='http://medium.com/@someone/post',/articles\[0\].url/],
    [s=>{delete s.articles[0].url; delete s.articles[0].body;},/articles\[0\].body/],
    [s=>s.experience[0].highlights=[[]],/experience\[0\].highlights\[0\]/],
    [s=>delete s.copy.id.introOne,/copy.id.introOne/],
    [s=>s.articles=[],/at least one article/],
    [s=>s.profile.timezone='Moon/Sea',/IANA timezone/],
  ]) {
    const site=structuredClone(original); mutate(site);
    assert.throws(()=>validate(site),pattern);
  }
});

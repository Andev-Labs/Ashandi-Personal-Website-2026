import fs from 'node:fs';
import { chromium } from '@playwright/test';

// Run against npm run dev. This renders the actual site; screenshots are never
// used as application code or as a replacement for semantic HTML.
const browser = await chromium.launch();
try {
  fs.mkdirSync(new URL('../docs/',import.meta.url),{recursive:true});
  const page = await browser.newPage({ viewport:{width:1440,height:1100}, deviceScaleFactor:1 });
  await page.goto('http://127.0.0.1:4310/');
  await page.locator('html:not(.portfolio-boot)').waitFor();
  // Scroll the page to finish its real viewport-triggered entrances.
  await page.evaluate(async()=>{
    for(let y=0;y<document.body.scrollHeight;y+=500) { scrollTo({top:y,behavior:"instant"}); await new Promise(resolve=>setTimeout(resolve,700)); }
    await new Promise(resolve=>setTimeout(resolve,1800)); scrollTo({top:0,behavior:"instant"});
  });
  await page.waitForTimeout(1000);
  await page.screenshot({path:new URL('../docs/preview-desktop.png',import.meta.url).pathname,fullPage:true});
  await page.locator('#theme-toggle').click();
  await page.waitForTimeout(700);
  await page.screenshot({path:new URL('../docs/preview-light.png',import.meta.url).pathname,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.locator('html:not(.portfolio-boot)').waitFor();
  await page.evaluate(async()=>{
    for(let y=0;y<document.body.scrollHeight;y+=500) { scrollTo({top:y,behavior:"instant"}); await new Promise(resolve=>setTimeout(resolve,700)); }
    await new Promise(resolve=>setTimeout(resolve,1800)); scrollTo({top:0,behavior:"instant"});
  });
  await page.waitForTimeout(800);
  await page.screenshot({path:new URL('../docs/preview-mobile.png',import.meta.url).pathname,fullPage:true});
  await page.setViewportSize({width:1200,height:630});
  await page.goto('http://127.0.0.1:4310/assets/social-card.svg');
  await page.screenshot({path:new URL('../public/assets/social-preview.png',import.meta.url).pathname});
  console.log('Saved desktop, light, mobile, and social preview images.');
} finally { await browser.close(); }

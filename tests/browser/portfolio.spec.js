import { test, expect } from '@playwright/test';

test('demo disclosure follows the introduction instead of flashing before it',async({page})=>{
  await page.addInitScript(()=>{
    window.earlyDisclosure=false;
    const observe=()=>{
      const demo=document.querySelector('.demo-disclosure');
      if(demo&&!document.documentElement.classList.contains('portfolio-boot')) {
        const waiting=document.querySelector('.intro-copy > p[data-reveal-pending]');
        if(waiting&&Number(getComputedStyle(demo).opacity)>.05) window.earlyDisclosure=true;
      }
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  await page.goto('/');
  await page.locator('.demo-disclosure').scrollIntoViewIfNeeded();
  await expect(page.locator('.demo-disclosure')).toHaveCSS('opacity','1',{timeout:15000});
  expect(await page.evaluate(()=>window.earlyDisclosure)).toBe(false);
});

test('portfolio renders, changes language and theme, opens a cover and follows project links',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{ if(message.type()==='error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/portfolio-boot/);
  await expect(page.locator('h1')).toHaveText('Dani Asyrofi');
  await expect(page.locator('.work-item')).toHaveCount(6);
  await expect(page.locator('#book-lineup article')).toHaveCount(6);
  await expect(page.locator('.experience-item')).toHaveCount(3);
  await expect(page.locator('.celebrate-trigger')).toHaveCount(0);
  await expect(page.locator('.intro-copy [data-company]')).toHaveCount(3);
  await expect(page.locator('.intro-copy [data-company=zeroone]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.locator('#language-toggle').click();
  await page.locator('[data-locale="id"]').click();
  await expect(page.locator('[data-copy="introTwo"]')).toContainText('Mengeksplorasi konsep');
  await page.locator('#language-toggle').click();
  await page.locator('[data-locale="en"]').click();
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const book=page.locator('#book-lineup button').first();
  await book.scrollIntoViewIfNeeded();
  await book.click();
  await expect(page.locator('#book-dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText('Designing for the unknown');
  await page.locator('#book-close').click();
  await expect(page.locator('#book-dialog')).not.toBeVisible();
  await page.locator('#book-next').click();
  await expect(page.locator('#book-lineup button').nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('#book-lineup button').last()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialog-title')).toHaveText('Prototypes as questions');
  await page.locator('#book-close').click();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#contact h2')).toBeVisible();
  await page.locator('.work-item').first().click();
  await expect(page.locator('h1')).toHaveText('Helix');
  expect(errors).toEqual([]);
});

test('style panel remains interruptible and restores focus',async({page})=>{
  await page.goto('/');
  await page.getByRole('switch',{name:'Creative mode'}).click();
  const trigger=page.locator('.creative-customizer-trigger');
  const panel=page.locator('.creative-customizer-panel');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await expect(panel).toBeFocused();
  await page.locator('.creative-customizer-close').click();
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await expect(trigger).toBeFocused();
  // Reverse programmatically at a known mid-flight point; this checks the
  // animation controller, while the clicks above check actual hit targets.
  await trigger.evaluate(element=>{element.click();setTimeout(()=>element.click(),35);});
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await expect(panel).toHaveCSS('visibility','hidden');
  await trigger.click();
  await expect(panel).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await panel.evaluate(element=>element.inert)).toBeTruthy();
});

test('readable HTML and local navigation survive disabled JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3100/');
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('#shelf-fallback a').first().click();
  await expect(page.locator('h1')).toHaveText('Designing for the unknown');
  await context.close();
});

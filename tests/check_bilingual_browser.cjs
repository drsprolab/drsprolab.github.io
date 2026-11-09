// Local preview only. No quiz submissions, email, or other production writes.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base='http://127.0.0.1:4012';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US'});
  await context.route('**/get.geojs.io/**',r=>r.fulfill({json:{country:'US'}}));
  await context.route('**/script.google.com/**',r=>r.abort());
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const output=process.env.BILINGUAL_QA_DIR || '/tmp/proax-english-qa';
  await fs.mkdir(output,{recursive:true});
  await page.goto(base+'/'); await page.waitForURL(base+'/en/');
  await page.locator('.hero-intro h1').waitFor(); await page.screenshot({path:output+'/english-home-desktop.png',fullPage:true});
  assert.match(await page.locator('.hero-intro').innerText(),/Led by Professor\/Dr\. Ji Hoon Song/);
  for(const width of [1440,1024,900,390,360]){
    await page.setViewportSize({width,height:900});
    const geometry=await page.evaluate(()=>({window:innerWidth,scroll:document.documentElement.scrollWidth,links:[...document.querySelectorAll('.language-switch a')].map(a=>{const r=a.getBoundingClientRect();return {left:r.left,right:r.right};}), header:[...document.querySelectorAll('.brand,.site-nav,.language-switch')].filter(n=>getComputedStyle(n).display!=='none').map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right};})}));
    assert(geometry.scroll<=width+1,`horizontal overflow at ${width}: ${JSON.stringify(geometry)}`);
    assert(geometry.links.every(r=>r.left>=0&&r.right<=width),`language controls clipped at ${width}`);
    for(let i=1;i<geometry.header.length;i++) assert(geometry.header[i-1].right<=geometry.header[i].left+1,`header overlaps at ${width}: ${JSON.stringify(geometry)}`);
  }
  await page.screenshot({path:output+'/english-home-mobile.png',fullPage:true});
  await page.locator('#menu-toggle').click();
  await page.getByRole('link',{name:'Members',exact:true}).click(); await page.waitForURL('**/en/members/');
  await page.locator('[data-language-choice="ko"]').click(); await page.waitForURL(base+'/members/');
  await page.reload(); assert.equal(new URL(page.url()).pathname,'/members/');
  await page.locator('[data-language-choice="en"]').click(); await page.waitForURL(base+'/en/members/');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/en/weekly-insight/2026-10-31-ai-knowledge-definition/');
  assert.equal(await page.locator('.references p').count(),6);
  await page.screenshot({path:output+'/english-insight-desktop.png',fullPage:true});
  await page.goto(base+'/en/project/');
  await page.waitForFunction(()=>document.querySelectorAll('.lecture-node').length>5);
  await page.locator('[data-lecture-topic="Leadership"]').click();
  assert.match(await page.locator('.lecture-selection').innerText(),/Connected organizations/);
  assert.equal(errors.length,0,errors.join('\n'));
  await context.close();
  const korea=await browser.newContext({locale:'en-US'});
  await korea.route('**/get.geojs.io/**',r=>r.fulfill({json:{country:'KR'}}));
  const ko=await korea.newPage(); await ko.goto(base+'/');
  await ko.waitForTimeout(300); assert.equal(new URL(ko.url()).pathname,'/');
  await korea.close(); await browser.close(); console.log('Bilingual browser checks passed; screenshots: '+output);
})().catch(e=>{console.error(e);process.exit(1);});

// Optional browser check: PLAYWRIGHT_MODULE=/path/to/playwright node tests/check_diagnosis_pdf_browser.cjs URL OUTPUT_DIR
// Uses synthetic responses in isolated browser storage. Never submits production responses.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const baseUrl=(process.argv[2] || 'http://127.0.0.1:9873/').replace(/\/$/, '');
const outputDir=process.argv[3] || require('node:os').tmpdir()+'/diagnosis-pdf-qa';
const configs=[
 {path:'ai-competency',prefix:'aidx-v2',n:31,roles:['학생','교사(교수)','직장인'],tabs:['me','group','compare']},
 {path:'teacher-ai-competency',prefix:'tadx-v1',n:31,roles:['학생','교사','보직교사'],tabs:['me','school','others','level','all']},
 {path:'ax-readiness',prefix:'axr-v2',n:32,roles:['실무자(팀원)','팀장·파트장','임원·경영진'],tabs:['me','group','compare']},
 {path:'aix-school',prefix:'aixs-v1',n:32,roles:['교사','부장교사','교감·교장'],tabs:['report','peers','me','group','compare']}
];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 await fs.mkdir(outputDir,{recursive:true});
 try{
 for(const config of configs){
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:1000},colorScheme:config.path==='aix-school'?'dark':'light'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error'&&msg.text().includes('Diagnosis PDF:'))console.log(config.path,msg.text());});
  let failPdf=config.path==='ai-competency';
  await context.route('**/pdf-libs/**',route=>failPdf?route.abort():route.continue());
  await context.route('https://**/*',route=>route.abort());
  await context.route('**/in-progress/**',async route=>{
   if(route.request().resourceType()!=='document')return route.continue();
   const res=await route.fetch(); const html=(await res.text()).replace(/data-endpoint="[^"]*"/g,'data-endpoint=""');
   await route.fulfill({response:res,body:html});
  });
  await context.addInitScript(config=>{
   const rows=Array.from({length:36},(_,i)=>({id:i===0?'ABCD2345':'TEST'+String(i).padStart(4,'0'),group:'',org:i<12?'검증중학교':i<24?'비교중학교':'다른중학교',role:config.roles[i%3],lv:'중학교',job:'중학교',freq:'주 3~4회',answers:Array.from({length:config.n},(_,j)=>1+(i+j)%5),seconds:240}));
   localStorage.setItem(config.prefix+'-test-responses',JSON.stringify(rows));
   localStorage.setItem(config.prefix+'-me-test',JSON.stringify(rows[0]));
  },config);
  await page.goto(baseUrl+'/in-progress/'+config.path+'/');
  assert.equal(await page.locator('[data-act="pdf"]').count(),0,'No PDF button before analysis');
  await page.locator(`[data-act="${config.path==='aix-school'?'report':'my'}"]`).click();
  await page.waitForSelector('[data-act="pdf"]');
  await page.evaluate(() => {
   const save = window.DiagnosisPdf.save;
   window.DiagnosisPdf.save = function(options) {
    const values = Array.from(options.root.querySelectorAll('.kpi-v')).map(el=>el.textContent.replace(/\s+/g,''));
    const result = save(options);
    const host = document.querySelector('.diagnosis-pdf-host');
    if (host) window.__reportCheck = {
     heading: host.querySelector('h1').textContent,
     centered: getComputedStyle(host.querySelector('.diagnosis-pdf-heading')).textAlign,
     font: getComputedStyle(host.querySelector('.dr-paragraph')).fontFamily,
     chapters: Array.from(host.querySelectorAll('.dr-section-title')).map(el=>el.textContent),
     dashboardPanels: host.querySelectorAll('.panel, .kpi, .aidx-persona').length,
     preservedValues: values.every(value=>host.textContent.replace(/\s+/g,'').includes(value))
    };
    return result;
   };
  });
  if(failPdf){
   await page.getByRole('button',{name:'PDF 저장하기',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.diagnosis-pdf-status').textContent.includes('저장하지 못했습니다'));
   assert.equal(await page.locator('.diagnosis-pdf-host').count(),0);
   assert.equal(await page.locator('[data-act="pdf"]').isDisabled(),false);
   failPdf=false;
  }
  for(const tab of config.tabs){
   await page.locator(`[data-tab="${tab}"]`).click();
   await page.waitForSelector(`[data-tab="${tab}"][aria-selected="true"]`);
   assert.equal(await page.locator('[data-act="pdf"]').count(),1);
   const downloadPromise=page.waitForEvent('download',{timeout:90000});
   await page.getByRole('button',{name:'PDF 저장하기',exact:true}).click();
   const download=await downloadPromise;
   await download.saveAs(`${outputDir}/${config.path}-${tab}.pdf`);
   assert.equal(await download.failure(),null);
   const report = await page.evaluate(()=>window.__reportCheck);
   assert(report.heading.includes('결과 보고서'));
   assert.equal(report.centered, 'center');
   assert(report.font.includes('AppleMyungjo'));
   assert.equal(report.chapters[0], 'Ⅰ. 진단 개요');
   assert(report.chapters.length >= 1);
   if (tab === config.tabs[0]) assert(report.chapters.length >= 3);
   assert.equal(report.dashboardPanels, 0);
   assert.equal(report.preservedValues, true);
   await page.waitForFunction(()=>!document.querySelector('[data-act="pdf"]').disabled);
   assert((await page.locator('.diagnosis-pdf-status').innerText()).includes('저장했습니다'));
   assert.equal(await page.locator('.diagnosis-pdf-host').count(),0);
   assert.equal(await page.locator(`[data-tab="${tab}"]`).getAttribute('aria-selected'),'true');
   console.log('PASS',config.path,tab,download.suggestedFilename());
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator(`[data-tab="${config.tabs[0]}"]`).click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const mobile=page.waitForEvent('download',{timeout:90000});
  await page.getByRole('button',{name:'PDF 저장하기',exact:true}).click();
  await (await mobile).saveAs(`${outputDir}/${config.path}-mobile.pdf`);
  await page.waitForFunction(()=>!document.querySelector('[data-act="pdf"]').disabled);
  await page.screenshot({path:`${outputDir}/${config.path}-mobile.png`,fullPage:false});
  assert.deepEqual(errors,[]);
  await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

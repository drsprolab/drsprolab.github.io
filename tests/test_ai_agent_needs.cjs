const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const rootDir=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(rootDir,'assets/data/ai-agent-needs.json'),'utf8'));
async function api(){
 const root={dataset:{source:'fixture'},addEventListener(){},innerHTML:''};
 const context={document:{getElementById:()=>root},localStorage:{getItem:()=>null},location:{search:''},URLSearchParams,window:{},fetch:async()=>({ok:true,json:async()=>data})};
 context.globalThis=context;
 let source=fs.readFileSync(path.join(rootDir,'assets/js/ai-agent-needs.js'),'utf8');
 source=source.replace(/  loadData\(\);\s*\}\)\(\);\s*$/, '  globalThis.testApi = { analyze, domainAnalysis, detailAnalysis, items }; loadData(); })();');
 vm.runInNewContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 return context.testApi;
}
function respondent(I,P){return {I,P,bg:[1,1,1,1,1],adv:0};}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-9,actual+' != '+expected);}
test('domain aggregation pairs complete respondents and averages skills equally',async()=>{
 const a=await api(), blank=()=>Array(21).fill(null);
 const r1=respondent(blank(),blank()),r2=respondent(blank(),blank()),partial=respondent(blank(),blank());
 r1.I.splice(0,3,5,3,4);r1.P.splice(0,3,1,3,2);
 r2.I.splice(0,3,3,4,5);r2.P.splice(0,3,2,2,2);
 partial.I.splice(0,3,5,5,5);partial.P.splice(0,3,1,null,1);
 const d=a.domainAnalysis([r1,r2,partial],2).st[0];
 assert.equal(d.n,2);close(d.mI,4);close(d.mP,2);close(d.gap,2);close(d.borich,8);
 assert.equal(a.domainAnalysis([r1,partial],2),null);
});
test('within-domain cutoffs are recalculated without changing whole-survey statistics',async()=>{
 const a=await api();
 const rows=Array.from({length:6},()=>respondent(Array(21).fill(3),Array(21).fill(3)));
 rows.forEach(r=>{r.I.splice(0,3,5,4,3);r.P.splice(0,3,2,3,3);r.I.splice(3,3,1,1,1);r.P.splice(3,3,5,5,5);});
 const full=a.analyze(rows),before=JSON.stringify(full),D=a.detailAnalysis(full,data.domains[0]);
 assert.equal(D.st.length,3);close(D.cuts['공통'].aI,4);close(D.cuts['공통'].aP,8/3);close(D.cuts['공통'].aG,4/3);
 assert.deepEqual(Array.from(D.st,x=>x.rank),[1,2,3]);assert.equal(D.st[0].ipa,'집중 개선');assert.equal(D.st[0].lff,'HH');
 assert.equal(JSON.stringify(full),before);
});
test('common rankings are independent of advanced responses; signed negative demand is not a priority',async()=>{
 const a=await api();
 const rows=Array.from({length:5},()=>respondent(Array(21).fill(4),Array(21).fill(2)));
 const base=a.analyze(rows);
 rows.forEach(r=>{for(let k=15;k<21;k++){r.I[k]=1;r.P[k]=5;}});
 const changed=a.analyze(rows);
 assert.deepEqual(Array.from(base.st.slice(0,15),x=>[x.rank,x.lff,x.ipa]),Array.from(changed.st.slice(0,15),x=>[x.rank,x.lff,x.ipa]));
 assert.ok(changed.st.slice(15).every(x=>x.borich<0&&x.prio===0));
});
test('all 21 skills have unique short labels and retain original survey and storage codes',async()=>{
 const a=await api();assert.equal(a.items.length,21);assert.equal(new Set(a.items.map(x=>x.label)).size,21);
 assert.equal(a.items[3].code,'B01');assert.equal(a.items[3].label,'검색 도구 활용');
 assert.equal(a.items[3].text,data.domains[1].items[0][0]);
});

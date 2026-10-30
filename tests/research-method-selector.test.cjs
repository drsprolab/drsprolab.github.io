'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {recommend,evaluateChecklist}=require('../assets/js/research-method-selector.js');
const content=JSON.parse(fs.readFileSync(path.join(__dirname,'../_data/research_methods.json'),'utf8'));
const methods=content.methods;
const top=(input)=>recommend(methods,input).candidates[0]?.id;
const scenarios=[
 ['regression',{purpose:'상사 지원과 학습기회 등 여러 요인이 몰입과 어떻게 관련되는지 알고 싶다.',desired:'근속연수를 통제한 관계의 크기와 설명력',kind:'quantitative'}],
 ['mediation',{purpose:'교육이 자기효능감을 거쳐 학습전이와 연결되는 경로',desired:'중간 경로의 간접효과',kind:'quantitative'}],
 ['moderation',{purpose:'직무요구와 소진의 관계가 자율성에 따라 달라지는지',desired:'상호작용과 조건별 기울기',kind:'quantitative'}],
 ['moderated-mediation',{purpose:'지원이 효능감을 거쳐 몰입에 연결되는 간접효과가 활용기회에 따라 달라지는지',desired:'조건부 간접효과와 그 차이',kind:'quantitative'}],
 ['sem',{purpose:'여러 잠재개념의 구조적 관계를 측정오차를 고려해 검증',desired:'측정모형과 구조모형의 경로',kind:'quantitative'}],
 ['multigroup',{purpose:'정규직과 비정규직의 지원과 몰입 관계를 비교',desired:'집단 간 경로 차이와 측정동일성',kind:'quantitative'}],
 ['lpa',{purpose:'여러 점수의 조합으로 사람 유형을 찾고 싶다',desired:'숨은 유형의 점수 패턴',kind:'quantitative',indicators:'continuous'}],
 ['lca',{purpose:'여러 경험 유무의 응답 조합으로 사람 유형을 찾고 싶다',desired:'숨은 유형의 응답 패턴',kind:'quantitative',indicators:'categorical'}],
 ['scale-development',{purpose:'AI 협업역량의 개념을 측정하는 새로운 척도를 개발',desired:'문항 개발과 타당화',kind:'quantitative'}],
 ['prediction',{purpose:'3주 차 활동으로 중도탈락 위험을 미리 예측하고 싶다',desired:'새로운 학습자에서 예측 성능',kind:'quantitative'}],
 ['arcl',{purpose:'몰입과 학습참여가 서로 시간에 걸쳐 선행하는지',desired:'교차지연과 자기회귀 경로',kind:'quantitative',waves:'3'}],
 ['phenomenology',{purpose:'직장 내 배제 경험의 의미와 체험을 깊이 이해하고 싶다',dataText:'직접 경험한 사람의 심층면담',desired:'경험의 본질과 의미',kind:'qualitative'}],
 ['grounded-theory',{purpose:'소진의 회복 과정과 조건을 자료에서 이론으로 생성하고 싶다',desired:'과정 이론과 범주 간 관계',kind:'qualitative'}],
 ['narrative',{purpose:'경력 전환점과 정체성의 이야기를 시간에 따라 이해',dataText:'경력 이야기와 생애사 면담',desired:'서사와 플롯',kind:'qualitative'}],
 ['scoping-review',{purpose:'AI 학습 연구 지형과 범위, 공백을 파악',dataText:'기존 논문',desired:'문헌 지도와 연구동향',kind:'literature'}],
 ['integrative-review',{purpose:'흩어진 개념과 이론을 통합하고 재개념화',desired:'개념 통합 틀',kind:'literature'}],
 ['systematic-review',{purpose:'명확한 질문에 대한 기존 연구의 근거를 체계적으로 종합',desired:'편향 위험과 근거의 일관성',kind:'literature'}],
 ['meta-analysis',{purpose:'여러 연구의 효과크기를 합쳐 평균효과를 알고 싶다',desired:'통합효과와 이질성',kind:'literature'}],
 ['theory-building',{purpose:'기존 이론의 한계를 설명하는 새로운 메커니즘과 경계조건',desired:'새로운 설명 이론과 명제',kind:'literature'}]
];
for(const [expected,input] of scenarios)test(`beginner research question: ${expected}`,()=>assert.equal(top(input),expected));
test('does not recommend a method from a topic alone',()=>assert.equal(recommend(methods,{purpose:'조직몰입과 HRD가 궁금해요'}).candidates.length,0));
test('does not infer purpose from a data description alone',()=>assert.equal(recommend(methods,{dataText:'매개변수 점수를 설문으로 수집'}).candidates.length,0));
test('one wave cannot produce an ARCL recommendation',()=>{
 const r=recommend(methods,{purpose:'ARCL 자기회귀 교차지연',kind:'quantitative',waves:'1'});
 assert(!r.candidates.some(x=>x.id==='arcl'));assert(r.excluded.some(x=>x.id==='arcl'));
});
test('categorical indicators exclude LPA, continuous exclude LCA',()=>{
 for(const [indicators,excluded] of [['categorical','lpa'],['continuous','lca']])assert(!recommend(methods,{goal:'profiles',kind:'quantitative',indicators}).candidates.some(x=>x.id===excluded));
});
test('data-type conflict is disclosed instead of silently recommending',()=>{
 const r=recommend(methods,{purpose:'매개효과를 알고 싶다',kind:'qualitative'});
 assert(!r.candidates.some(x=>x.id==='mediation'));assert(r.excluded.some(x=>x.id==='mediation'));
});
test('unknown indicator type keeps both profile methods available',()=>{
 const ids=recommend(methods,{goal:'profiles',kind:'quantitative'}).candidates.map(x=>x.id);assert(ids.includes('lpa')&&ids.includes('lca'));
});
test('negated method is not endorsed',()=>assert.notEqual(top({purpose:'매개효과가 아니라 조절효과를 알고 싶다',kind:'quantitative'}),'mediation'));
test('mixed data is retained with an explicit stage warning',()=>{
 const r=recommend(methods,{purpose:'현상학 경험의 의미',kind:'mixed'});assert.equal(r.candidates[0].id,'phenomenology');assert(r.candidates[0].missing.some(x=>x.includes('어느 질문')));
});
test('checklist never declares a method optimal or a probability',()=>{
 assert.equal(evaluateChecklist(['yes','unknown',undefined]).state,'clarify');assert.equal(evaluateChecklist(['yes','no','yes']).state,'revise');assert.equal(evaluateChecklist(['yes','yes','yes']).state,'consider');
});
test('catalog coverage, concrete beginner cases and references are complete',()=>{
 assert.equal(methods.length,19);assert.equal(new Set(methods.map(m=>m.id)).size,19);
 assert.deepEqual(content.categories.map(c=>methods.filter(m=>m.category===c.id).length),[11,3,5]);
 for(const m of methods){
  assert.equal(m.cases.length,2);assert.equal(m.references.length,3);
  for(const c of m.cases)for(const field of ['purpose','question','data','analysis','output','learn'])assert(c[field]?.length>20,`${m.id}.${field}`);
  assert(m.ultimate&&m.outputs.length>=3&&m.data_example.columns&&m.checks.length===3);
  for(const id of m.related)assert(methods.some(x=>x.id===id));
  for(const id of m.references){const r=content.references[id];assert(r.ssci.issn&&r.doi&&r.focus);assert(!/^(10\.3390|10\.3389)/i.test(r.doi));assert(!/mdpi|frontiers/i.test(r.publisher));assert(r.issn.some(i=>[r.ssci.issn,r.ssci.eissn].includes(i)));}
 }
});
test('professor references are exact records from the existing bibliography',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../_data/publications.yml'),'utf8');
 for(const m of methods)if(m.professor_paper){assert(source.includes(JSON.stringify(m.professor_paper.citation)),m.id);}
});

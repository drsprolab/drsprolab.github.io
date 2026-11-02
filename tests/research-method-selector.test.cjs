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
 ['scoping-review',{purpose:'AI 학습 연구의 범위와 부족한 주제를 파악',dataText:'기존 논문',desired:'문헌별 주제와 연구동향',kind:'literature'}],
 ['integrative-review',{purpose:'흩어진 개념과 이론을 통합하고 재개념화',desired:'개념 통합 틀',kind:'literature'}],
 ['systematic-review',{purpose:'명확한 질문에 대한 기존 연구의 근거를 체계적으로 종합',desired:'편향 위험과 근거의 일관성',kind:'literature'}],
 ['meta-analysis',{purpose:'여러 연구의 효과크기를 합쳐 평균효과를 알고 싶다',desired:'통합효과와 이질성',kind:'literature'}],
 ['theory-building',{purpose:'기존 이론의 한계를 설명하는 새로운 메커니즘과 경계조건',desired:'새로운 설명 이론과 명제',kind:'literature'}],
 ['lta',{purpose:'학습자의 참여 유형이 학기 초와 말 사이에 다른 유형으로 어떻게 옮겨 가는지 알고 싶다',desired:'잠재전이분석의 전이확률',kind:'quantitative',waves:'2'}],
 ['ddr',{purpose:'교수설계 모형을 개발하고 전문가 타당화까지 하고 싶다',desired:'최종 모형과 설계 원리',kind:'mixed'}],
 ['mixed-methods',{purpose:'설문 결과의 이유를 면담으로 함께 통합해 설명하고 싶다',desired:'공동표시표',kind:'mixed'}],
 ['quasi-experiment',{purpose:'교육 효과를 실험집단과 통제집단의 사전 사후 점수로 비교하고 싶다',desired:'조정 평균과 효과크기',kind:'quantitative'}],
 ['lgm',{purpose:'같은 사람의 학습전이 변화 궤적과 변화 속도의 개인차를 알고 싶다',desired:'잠재 절편과 기울기',kind:'quantitative',waves:'3'}],
 ['case-study',{purpose:'한 기업의 교육 프로그램 운영 사례를 깊이 이해하는 사례연구를 하고 싶다',desired:'맥락과 과정의 설명',kind:'qualitative'}],
 ['multilevel',{purpose:'팀에 속한 팀원 개인의 학습전이에 개인 수준과 팀 수준 요인이 각각 어떻게 영향을 주는지 알고 싶다',desired:'수준별 고정효과와 교차수준 상호작용',kind:'quantitative'}],
 ['sna',{purpose:'구성원 사이에 누가 누구와 지식을 나누는지 연결 구조와 중심 인물을 알고 싶다',desired:'네트워크 그림과 중심성',kind:'quantitative'}],
 ['topic-modeling',{purpose:'서술형 응답과 논문 초록에서 어떤 토픽이 있는지 알고 싶다',desired:'토픽별 상위 단어와 비율',kind:'quantitative'}]
];
for(const [expected,input] of scenarios)test(`beginner research question: ${expected}`,()=>assert.equal(top(input),expected));
test('does not recommend a method from a topic alone',()=>assert.equal(recommend(methods,{purpose:'조직몰입과 HRD가 궁금해요'}).candidates.length,0));
test('does not infer purpose from a data description alone',()=>assert.equal(recommend(methods,{dataText:'설문 점수가 있습니다'}).candidates.length,0));
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
 assert.equal(methods.length,30);assert.equal(new Set(methods.map(m=>m.id)).size,30);
 assert.deepEqual(content.categories.map(c=>methods.filter(m=>m.category===c.id).length),[17,5,5,3]);
 for(const m of methods){
  assert.equal(m.cases.length,2);assert(m.references.length>=1&&m.references.length<=2);assert.equal(m.applications.length,2);assert.deepEqual(m.applications.map(a=>a.index).sort(),['KCI','SSCI']);m.applications.forEach(a=>assert(a.doi&&a.title&&a.journal&&a.year&&a.url===`https://doi.org/${a.doi}`));
  for(const c of m.cases)for(const field of ['purpose','question','data','analysis','output','learn'])assert(c[field]?.length>20,`${m.id}.${field}`);
  assert(m.ultimate&&m.outputs.length>=3&&m.analysis_structure.table.columns.length>=3&&m.analysis_structure.variables.length>=3&&m.checks.length===3);
  for(const id of m.related)assert(methods.some(x=>x.id===id));
  for(const id of m.references){const r=content.references[id];assert(r.ssci.issn&&r.doi&&r.focus);assert(!/^(10\.3390|10\.3389)/i.test(r.doi));assert(!/mdpi|frontiers/i.test(r.publisher));assert(r.issn.some(i=>[r.ssci.issn,r.ssci.eissn].includes(i)));}
 }
});
test('professor references are exact records from the existing bibliography',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../_data/publications.yml'),'utf8');
 for(const m of methods)if(m.professor_paper){assert(source.includes(JSON.stringify(m.professor_paper.citation)),m.id);}
});

// 학습자 말투로 쓴 입력: 맨 위 추천이 기대한 방법이어야 한다.
{
const B=[
['regression',{purpose:'직장인의 조직몰입에 어떤 요인이 영향을 미치는지 알고 싶어요',dataText:'상사 지원, 학습 기회, 자기효능감, 조직몰입을 설문으로 조사합니다'}],
['regression',{purpose:'근속연수를 통제하고도 학습 기회가 몰입과 관련 있는지 보고 싶습니다',desired:'각 변수의 영향력과 설명력'}],
['regression',{dataText:'설문으로 직무만족과 이직의도를 측정해 회귀분석을 하려고 합니다'}],
['mediation',{purpose:'교육이 자기효능감을 거쳐 현업 적용으로 이어지는지 알고 싶다',dataText:'설문'}],
['mediation',{dataText:'리더십과 혁신행동의 관계에서 심리적 안전감의 매개효과를 보고 싶습니다. 설문데이터를 씁니다.'}],
['mediation',{ultimate:'왜 코칭이 성과로 연결되는지 그 심리적 기제를 밝히고 싶어요',desired:'간접효과의 크기'}],
['moderation',{dataText:'자기효능감과 몰입의 관계에서 AI 활용에 대한 지원의 조절효과를 보고 싶습니다. 설문데이터를 활용하고자 합니다.'}],
['moderation',{purpose:'직무요구와 소진의 관계가 자율성에 따라 달라지는지 궁금합니다',dataText:'설문 점수'}],
['moderation',{desired:'상사 지원이 높을 때와 낮을 때 기울기가 어떻게 다른지 단순기울기를 제시'}],
['moderated-mediation',{purpose:'지원이 효능감을 거쳐 몰입으로 이어지는 간접효과가 활용기회에 따라 달라지는지',dataText:'설문'}],
['moderated-mediation',{dataText:'매개효과와 조절효과를 함께 보는 조절된 매개모형을 쓰고 싶어요'}],
['sem',{purpose:'여러 잠재개념 사이의 구조적 관계를 측정오차를 고려해 검증하고 싶다',dataText:'설문 문항'}],
['sem',{dataText:'구조방정식으로 학습조직문화, 심리적 안전감, 지식공유의 관계를 분석합니다'}],
['sem',{desired:'측정모형과 구조모형의 적합도, 잠재변수 간 경로계수'}],
['multigroup',{purpose:'정규직과 비정규직에서 경로가 다른지 비교하고 싶습니다',dataText:'설문'}],
['multigroup',{dataText:'남녀 집단 간 경로계수 차이를 다집단 분석으로 봅니다'}],
['lpa',{purpose:'몰입, 열의, 소진 점수의 조합으로 직원 유형을 찾고 싶다',dataText:'설문 점수'}],
['lpa',{dataText:'잠재프로파일분석을 하려고 합니다'}],
['lca',{purpose:'차별 경험 유무의 응답 조합으로 어떤 사람 유형이 있는지 찾고 싶다',dataText:'예/아니오 응답 설문'}],
['lca',{dataText:'잠재계층분석 LCA'}],
['lta',{purpose:'학습자의 참여 유형이 학기 초와 말 사이에 다른 유형으로 어떻게 옮겨 가는지 알고 싶다',dataText:'같은 학습자 두 시점 설문'}],
['lta',{dataText:'잠재전이분석으로 프로파일 이동을 보고 싶어요'}],
['scale-development',{purpose:'AI 활용 역량을 재는 새로운 척도를 만들고 싶습니다',desired:'요인구조와 신뢰도, 타당도'}],
['scale-development',{dataText:'문항 개발 후 EFA, CFA로 측정도구 타당화를 합니다'}],
['prediction',{purpose:'중도탈락할 학습자를 미리 찾아내고 싶어요',dataText:'LMS 로그 기록'}],
['prediction',{dataText:'랜덤 포레스트로 이직을 예측하는 모델을 만듭니다'}],
['arcl',{purpose:'리더십과 공정성 중 무엇이 먼저인지 알고 싶어요',dataText:'같은 직원을 세 번 설문합니다'}],
['arcl',{dataText:'교차지연 패널모형을 쓰려고 합니다. 3시점 자료입니다'}],
['lgm',{purpose:'학습전이가 시간에 따라 어떻게 변하고 사람마다 변화 속도가 다른지 알고 싶습니다',dataText:'네 번 설문'}],
['lgm',{dataText:'잠재성장모형으로 4시점 변화 궤적을 봅니다'}],
['sna',{purpose:'팀에서 누가 누구와 협업하고 누가 중심에 있는지 알고 싶어요',dataText:'협업 상대를 적는 설문'}],
['sna',{dataText:'사회네트워크분석으로 지식공유 연결망과 중심성을 봅니다'}],
['topic-modeling',{purpose:'수강 후기에 어떤 주제가 많이 나오는지 알고 싶다',dataText:'온라인 강의 후기 텍스트 5000건'}],
['topic-modeling',{dataText:'논문 초록으로 토픽모델링을 해서 연구동향을 봅니다'}],
['sentiment-analysis',{purpose:'교육 후기가 얼마나 긍정적인지 부정적인지 알고 싶다',dataText:'서술형 후기 3000건과 만족도 점수'}],
['sentiment-analysis',{dataText:'강의평가 서술형 응답으로 감성분석을 하려고 합니다'}],
['thematic-analysis',{purpose:'면담에서 실무자들이 반복해서 말하는 의미의 패턴을 찾고 싶다',dataText:'실무자 15명 면담 전사본'}],
['thematic-analysis',{dataText:'개방형 응답을 Braun과 Clarke의 주제분석으로 분석하려고 합니다'}],
['multilevel',{purpose:'팀 수준의 학습문화가 개인의 학습전이에 미치는 영향',dataText:'팀에 속한 직원 설문'}],
['multilevel',{dataText:'학생이 학급에 중첩된 자료로 HLM 다층분석을 합니다'}],
['quasi-experiment',{purpose:'리더십 교육의 효과를 교육 안 받은 부서와 비교하고 싶어요',dataText:'두 부서 사전 사후 점수'}],
['quasi-experiment',{dataText:'실험집단과 통제집단에 사전검사와 사후검사를 합니다. 준실험입니다.'}],
['quasi-experiment',{purpose:'플립러닝 수업이 효과가 있는지 검증하고 싶습니다',dataText:'두 분반의 시험 점수, 실험집단 통제집단'}],
['mixed-methods',{purpose:'설문 결과의 이유를 면담으로 함께 설명하고 싶어요',dataText:'설문과 심층면담'}],
['mixed-methods',{dataText:'설문조사 후 인터뷰를 해서 결과를 통합합니다. 혼합연구입니다'}],
['ddr',{purpose:'교수설계 모형을 개발하고 전문가 타당화를 받고 싶어요'}],
['ddr',{dataText:'프로그램을 개발해서 현장에 적용합니다. 설계기반연구를 하려고 합니다'}],
['ddr',{purpose:'AI 활용 수업 모형을 새로 만들고 전문가 검토로 검증하려고 합니다'}],
['phenomenology',{purpose:'승진에서 배제된 직원들이 겪은 경험의 의미를 이해하고 싶어요',dataText:'심층면담'}],
['phenomenology',{dataText:'인간이 왜 열심히 하는지 본질적 이유에 대해 알고 싶습니다. 관찰과 인터뷰 데이터를 활용하고자 합니다.'}],
['phenomenology',{dataText:'현상학적 연구로 체험을 분석합니다'}],
['grounded-theory',{purpose:'N잡러가 소진에서 회복하는 과정을 이론으로 만들고 싶어요',dataText:'면담'}],
['grounded-theory',{dataText:'근거이론으로 개방코딩, 축코딩을 합니다'}],
['narrative',{purpose:'경력 단절 여성의 삶의 이야기를 시간 순서로 듣고 정체성 변화를 보고 싶어요',dataText:'생애사 면담'}],
['narrative',{dataText:'내러티브 탐구를 하려고 합니다'}],
['case-study',{purpose:'한 기업의 핵심가치 교육이 어떻게 정착했는지 깊이 보고 싶어요',dataText:'면담, 내부 문서, 관찰'}],
['case-study',{dataText:'S사를 대상으로 단일사례 연구를 합니다'}],
['scoping-review',{purpose:'생성형 AI와 직원 학습 연구가 어디까지 이루어졌는지 알고 싶어요',dataText:'기존 논문'}],
['scoping-review',{dataText:'스코핑 리뷰로 연구 공백을 찾습니다'}],
['integrative-review',{purpose:'흩어진 경력역량 개념을 통합하고 싶어요',dataText:'선행연구 논문들을 비교합니다'}],
['integrative-review',{dataText:'통합적 문헌고찰을 합니다'}],
['systematic-review',{purpose:'코칭이 리더십 행동을 높이는지 기존 연구의 근거를 PRISMA로 정리하고 싶어요',dataText:'논문'}],
['systematic-review',{dataText:'체계적 문헌고찰을 하려고 합니다'}],
['meta-analysis',{purpose:'여러 연구의 효과크기를 합쳐 평균 효과를 구하고 싶어요',dataText:'기존 논문의 통계값'}],
['meta-analysis',{dataText:'메타분석으로 교육 효과를 통합합니다'}],
['theory-building',{purpose:'AI 시대 조직학습을 설명할 새로운 이론을 제안하고 싶어요',desired:'명제와 개념모형'}],
['theory-building',{dataText:'이론 구축 논문입니다. 기존 이론의 한계를 넘는 명제를 제시합니다'}]
];
const E=[
['moderation',{purpose:'매개효과가 아니라 조절효과를 알고 싶어요',dataText:'설문'}],
['lgm',{purpose:'학습전이 점수가 시간에 따라 변하는지 알고 싶어요',dataText:'같은 사람 네 번 설문'}],
['lta',{purpose:'시간이 지나면서 직원 유형이 바뀌는지 알고 싶어요',dataText:'두 시점 설문'}],
['arcl',{purpose:'자기회귀교차지연으로 두 변수의 선행 관계를 봅니다',dataText:'3시점 패널 설문'}],
['regression',{purpose:'자기효능감과 학습 동기가 전이에 미치는 영향',dataText:'한 번 설문'}],
['phenomenology',{purpose:'신입사원의 경험을 깊이 이해하고 싶어요',dataText:'심층면담'}],
['case-study',{purpose:'우리 회사 온보딩 프로그램이 왜 실패했는지 사례를 깊이 보고 싶습니다',dataText:'면담과 내부 문서'}],
['topic-modeling',{purpose:'직원 설문의 서술형 응답에서 어떤 주제가 나오는지 찾고 싶어요',dataText:'개방형 응답 3000건'}],
['scale-development',{purpose:'심리적 안전감 척도를 새로 개발하고 타당화합니다',dataText:'설문 문항'}],
['meta-analysis',{purpose:'교육 효과를 다룬 논문들의 효과크기를 메타분석하고 싶어요',dataText:'기존 논문'}],
['quasi-experiment',{purpose:'교육을 받은 팀과 안 받은 팀의 사전 사후 차이를 비교',dataText:'설문 점수'}],
['multigroup',{purpose:'세대별로 구조모형의 경로가 다른지 다집단으로 비교',dataText:'설문'}]
];
test('learner-style battery picks the expected method first',()=>{for(const [want,input] of [...B,...E])assert.equal(recommend(methods,input).candidates[0]?.id,want,JSON.stringify(input));});
test('every method is reachable by the battery',()=>{const seen=new Set([...B,...E].map(x=>x[0]));for(const m of methods)assert(seen.has(m.id),m.id);});
}

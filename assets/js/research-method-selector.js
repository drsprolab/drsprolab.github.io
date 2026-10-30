/* Deterministic educational triage. No network requests or inferred probabilities. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchMethodSelector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const goals = {
    relationship:['regression'], pathway:['mediation'], conditional:['moderation'],
    'conditional-pathway':['moderated-mediation'], latent:['sem'], groups:['multigroup'],
    profiles:['lpa','lca'], measurement:['scale-development'], future:['prediction'],
    temporal:['arcl'], experience:['phenomenology'], process:['grounded-theory'], story:['narrative'],
    map:['scoping-review'], integrate:['integrative-review'], evidence:['systematic-review'],
    pooled:['meta-analysis'], theory:['theory-building']
  };
  const patterns = {
    regression:[/(관계|관련|영향).{0,20}(알고|밝히|분석|확인|궁금)/,/다른.{0,15}(통제|고려)/,/어떤.{0,8}요인/,/여러.{0,8}요인/,/독립적.{0,8}(관련|관계)/],
    mediation:[/통해|통하여|통해서|거쳐|경유/,/중간.{0,10}(경로|과정|변수)/,/왜.{0,15}(관계|연결)/,/어떤.{0,8}기제/],
    moderation:[/따라.{0,18}달라/,/누구에게|어떤 조건/,/완충|강해지|약해지/],
    'moderated-mediation':[/간접.{0,25}(조건|따라|달라)/,/(매개|경유|거쳐).{0,35}(달라|조건)/,/(조건|따라).{0,25}간접/],
    sem:[/측정오차/,/여러.{0,10}(잠재|개념).{0,15}(관계|연결|구조)/],
    multigroup:[/정규직.{0,12}비정규직/,/알려진.{0,8}집단/,/집단.{0,6}(경로|관계).{0,10}(차이|비교)/],
    lpa:[/숨[은겨].{0,8}유형/,/사람.{0,12}유형/,/유형.{0,8}(분류|탐색|발견|찾)/,/점수.{0,8}조합/],
    lca:[/숨[은겨].{0,8}유형/,/사람.{0,12}유형/,/유형.{0,8}(분류|탐색|발견|찾)/,/응답.{0,8}조합/],
    'scale-development':[/개념.{0,12}측정/,/새로운.{0,8}척도/,/문항.{0,8}(만들|개발)/],
    prediction:[/미래.{0,10}(결과|위험)/,/새로운.{0,8}(사람|학습자).{0,12}(맞히|예측)/,/미리.{0,8}(찾|알|식별)/],
    arcl:[/무엇이 먼저|어느 것이 먼저/,/서로.{0,15}(선행|영향)/,/시간.{0,12}선행/],
    phenomenology:[/경험.{0,5}(어떤 )?의미/,/경험.{0,15}본질/,/어떻게.{0,8}살아/],
    'grounded-theory':[/어떤 과정.{0,10}(형성|변화|회복)/,/자료.{0,12}이론.{0,8}(생성|도출|발전)/],
    narrative:[/시간.{0,10}이야기/,/생애.{0,8}(이야기|정체성)/,/정체성.{0,8}(이야기|서사)/],
    'scoping-review':[/어떤.{0,15}연구.{0,8}(이루어|되어|진행)/,/개념.{0,12}대상.{0,12}방법/,/문헌.{0,10}지도/],
    'integrative-review':[/개념.{0,12}(연결|통합|재구성)/,/서로 다른.{0,12}이론.{0,8}통합/],
    'systematic-review':[/명확한.{0,10}질문.{0,15}근거/,/기존 연구.{0,20}(결론|일관성)/],
    'meta-analysis':[/여러 연구.{0,15}(효과|상관).{0,10}(합치|종합|통합)/,/연구.{0,10}평균.{0,8}효과/],
    'theory-building':[/왜.{0,12}어떻게.{0,15}설명/,/기존 이론.{0,15}(못|한계)/,/새로운.{0,10}(설명|메커니즘|명제)/]
  };
  function clean(value) {
    return String(value || '').slice(0,10000).normalize('NFKC').toLowerCase()
      .replace(/(매개|조절|회귀|예측|메타|현상학|근거이론|내러티브|네러티브)(?:효과|분석)?\s*(?:가|이|는|를|을)?\s*(?:아니\S*|제외\S*|원하지\S*|필요\s*없\S*)/g,' ');
  }
  function inferKind(text) {
    const found=[];
    if (/설문|점수|수치|응답범주|예\/아니오|이분형|범주형|패널자료/.test(text)) found.push('quantitative');
    if (/심층면담|심층 면담|인터뷰|생애사|경험일지|성찰일지|면담/.test(text)) found.push('qualitative');
    if (/기존 논문|문헌|논문들을|논문들을|연구보고서|선행연구들을|효과크기/.test(text)) found.push('literature');
    return found.length===1 ? found[0] : (found.length>1 ? 'mixed' : 'unknown');
  }
  function constraints(id,input,kind) {
    const excluded=[], missing=[];
    const indicators=input.indicators || 'unknown';
    const waves=input.waves || 'unknown';
    if(id==='lpa' && indicators==='categorical') excluded.push('핵심 지표가 범주형이면 연속형 지표 중심의 LPA와 맞지 않습니다. LCA를 비교하세요.');
    if(id==='lca' && indicators==='continuous') excluded.push('핵심 지표가 연속형이면 범주형 지표 중심의 LCA와 맞지 않습니다. LPA를 비교하세요.');
    if((id==='lpa'||id==='lca') && indicators==='unknown') missing.push('유형을 만들 지표가 연속형 점수인지 범주형 응답인지 확인하세요.');
    if(id==='arcl') {
      if(waves==='1') excluded.push('한 번만 측정한 자료로는 교차지연 관계를 추정할 수 없습니다. 동일인 반복 측정을 계획하세요.');
      else if(waves==='2') missing.push('전통 CLPM은 2시점도 가능하지만 개인 내 관계를 분리하는 RI-CLPM은 통상 3시점 이상을 계획합니다.');
      else missing.push('같은 사람을 반복 측정했는지, 간격과 개인 내/개인 간 질문이 맞는지 확인하세요.');
    }
    if(id==='mediation'||id==='moderated-mediation') missing.push('시간 순서와 교란 통제를 설계해야 합니다. 횡단자료의 간접효과는 인과 기제를 확정하지 않습니다.');
    if(id==='regression') missing.push('연속형 결과를 가정한 안내입니다. 퇴사·수료 여부라면 로지스틱 회귀 등 결과 척도에 맞는 대안을 확인하세요.');
    if(id==='prediction') missing.push('예측 시점 이후 정보가 섞이지 않는 독립적 검증 자료를 확보하세요.');
    if(id==='multigroup') missing.push('집단이 사전에 알려져 있는지와 측정동일성의 근거를 확인하세요.');
    if(id==='scale-development') missing.push('문항 개발·내용 검토·구조 검증·타당도 증거를 연결하는 전체 설계가 필요합니다.');
    if(kind==='mixed') missing.push('복합 자료에서는 이 후보가 어느 질문·자료 부분에 답하는지 구분하고 단계적 설계를 검토하세요.');
    return {excluded,missing};
  }
  function recommend(methods,input) {
    input=input||{};
    const goal=goals[input.goal]||[];
    const fields=[['purpose',1],['desired',1.5],['ultimate',1.5],['dataText',0.25]];
    const text=fields.map(([k])=>clean(input[k])).join(' ');
    const questionText=['purpose','desired','ultimate'].map(k=>clean(input[k])).join(' ');
    const selectedKind=input.kind||'unknown';
    const inferred=inferKind(clean(input.dataText));
    const kind=selectedKind==='unknown' ? inferred : selectedKind;
    const notes=[];
    if(selectedKind==='unknown' && inferred!=='unknown') notes.push('자료 설명에서 '+({quantitative:'수치형 자료',qualitative:'면담·경험 자료',literature:'문헌 자료',mixed:'여러 종류의 자료'})[inferred]+' 표현을 읽었습니다. 실제 자료 종류와 맞는지 선택란에서 확인하세요.');
    if(selectedKind!=='unknown' && inferred!=='unknown' && inferred!=='mixed' && selectedKind!==inferred && selectedKind!=='mixed') notes.push('자료 종류 선택과 작성한 자료 설명이 달라 보입니다. 실제로 분석할 자료를 확인하세요.');
    const rows=methods.map(m=>{
      let score=0; const reasons=[];
      if(goal.includes(m.id)){score+=25;reasons.push('선택한 결과를 확인하는 데 이 방법이 도움이 될 수 있습니다.');}
      const hits=[];
      fields.forEach(([key,weight])=>{
        const value=clean(input[key]);
        (m.signals||[]).forEach(s=>{if((/^[a-z][a-z -]*$/i.test(s) ? new RegExp('\\b'+s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(value) : value.includes(s.toLowerCase()))){score+=3*weight; if(key!=='dataText'&&!hits.includes(s))hits.push(s);}});
      });
      (patterns[m.id]||[]).forEach(p=>{const match=questionText.match(p); if(match){score+=5;hits.push(match[0]);}});
      if(hits.length) reasons.push('목적·결과에 쓴 “'+Array.from(new Set(hits)).slice(0,3).join('”, “')+'” 표현을 바탕으로 이 방법을 검토할 수 있습니다.');
      // Data alone is insufficient to infer a research purpose.
      if(!hits.length && !goal.includes(m.id)) score=0;
      if(m.id==='moderated-mediation' && /매개|간접|경유|거쳐/.test(questionText) && /조절|상호작용|따라.{0,20}달라/.test(questionText)){score+=18;reasons.push('중간 경로와 그 경로가 달라지는 조건을 함께 묻고 있습니다.');}
      if(m.id==='moderation' && /이중조절|삼원|three.way/.test(questionText))score+=9;
      if(m.id==='lpa' && input.indicators==='continuous' && score>0)score+=10;
      if(m.id==='lca' && input.indicators==='categorical' && score>0)score+=10;
      const check=constraints(m.id,input,kind);
      if(kind!=='unknown'&&kind!=='mixed'&&kind!==m.category)check.excluded.push('선택·입력한 자료 종류와 이 방법의 주된 자료가 다릅니다. 자료 조건을 먼저 확인하세요.');
      return {id:m.id,score,reasons,missing:check.missing,excluded:check.excluded};
    }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
    return {candidates:rows.filter(r=>!r.excluded.length).slice(0,3),excluded:rows.filter(r=>r.excluded.length).slice(0,3),notes,hasInput:text.trim().length>0||goal.length>0};
  }
  function evaluateChecklist(answers) {
    const list=Array.from(answers||[]);
    const no=list.filter(x=>x==='no').length;
    const unknown=list.filter(x=>x!=='yes'&&x!=='no').length;
    if(no) return {state:'revise',message:'현재 자료나 목적과 맞지 않는 조건이 '+no+'개 있습니다. 해당 조건을 보완하거나 아래 관련 방법의 목적·자료·결과를 비교해 보세요.'};
    if(unknown) return {state:'clarify',message:unknown+'개 조건을 더 확인해야 합니다. 아직 모르는 조건을 연구계획에 구체적으로 적고 필요한 자료와 설계를 정해 보세요.'};
    if(!list.length)return {state:'clarify',message:'각 조건을 확인한 뒤 선택해 주세요.'};
    return {state:'consider',message:'기본 선택 조건은 현재 연구목적과 자료에 맞습니다. 이제 위의 해석 범위와 분석 가정을 검토하고 표집·측정·시점·절차를 구체화해 연구방법을 결정하세요.'};
  }
  return {recommend,evaluateChecklist};
});

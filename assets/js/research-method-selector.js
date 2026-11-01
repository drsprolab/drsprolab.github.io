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
    profiles:['lpa','lca'], transition:['lta'], mixeddata:['mixed-methods'], intervention:['quasi-experiment'], designdev:['ddr'], measurement:['scale-development'], future:['prediction'],
    temporal:['arcl'], experience:['phenomenology'], process:['grounded-theory'], story:['narrative'],
    map:['scoping-review'], integrate:['integrative-review'], evidence:['systematic-review'],
    pooled:['meta-analysis'], theory:['theory-building'], network:['sna'], text:['topic-modeling'], multilevel:['multilevel'], growth:['lgm'], casestudy:['case-study']
  };
  const patterns = {
    regression:[/(관계|관련|영향).{0,20}(알고|밝히|분석|확인|궁금)/,/다른.{0,15}(통제|고려)/,/어떤.{0,8}요인/,/여러.{0,8}요인/,/독립적.{0,8}(관련|관계)/],
    mediation:[/통해|통하여|통해서|거쳐|경유/,/중간.{0,10}(경로|과정|변수)/,/왜.{0,15}(관계|연결)/,/어떤.{0,8}기제/],
    moderation:[/단순\s*기울기|높을 때와 낮을 때/,/따라.{0,18}달라/,/누구에게|어떤 조건/,/완충|강해지|약해지/],
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
    sna:[/누가 누구와/,/연결.{0,8}(구조|위치|형태)/,/네트워크/,/관계.{0,8}(구조|연결)/,/중심.{0,6}(인물|위치)/],
    'quasi-experiment':[/준실험|quasi/i,/(실험|통제|비교)\s*집단/,/사전.{0,4}사후/,/(교육|프로그램|수업|처치).{0,12}효과.{0,14}(있|검증|확인|비교)/],
    'mixed-methods':[/혼합\s*(연구|방법|설계|자료|데이터)/,/mixed.?method/i,/(설문|양적).{0,24}(면담|질적).{0,16}(함께|결합|통합|합쳐)/,/(면담|질적).{0,24}(설문|양적).{0,16}(함께|결합|통합|합쳐)/],
    ddr:[/설계\s*기반|설계.?개발\s*연구|개발\s*연구/,/\b(ddr|dbr)\b/i,/(모형|프로그램|교수설계).{0,10}(개발|만들).{0,24}(타당화|전문가|검증)/],
    lta:[/잠재전이/,/(유형|프로파일|계층|집단).{0,14}(이동|옮겨|바뀌)/,/전이확률/],
    lgm:[/잠재성장|성장모형/,/변화.{0,4}(궤적|속도|양상)/,/시간.{0,8}따라.{0,12}(변화|변하|달라)/,/변화.{0,12}개인차/],
    'case-study':[/사례.{0,3}연구/,/(특정|한).{0,6}(조직|기업|학교|프로그램).{0,15}(사례|깊이|왜|어떻게)/,/운영 사례|도입 사례/],
    multilevel:[/다층|위계적 선형/,/(팀|집단|학급|조직).{0,8}(수준|안에 속|에 속한).{0,12}(개인|효과)/,/교차.{0,3}수준/,/개인.{0,6}(수준|특성).{0,10}(팀|집단).{0,6}(수준|특성)/],
    'topic-modeling':[/토픽/,/(글|텍스트|응답|후기|댓글).{0,15}(주제|토픽)/,/서술.{0,8}응답.{0,12}(주제|분석)/,/말뭉치/],
    'theory-building':[/왜.{0,12}어떻게.{0,15}설명/,/기존 이론.{0,15}(못|한계)/,/새로운.{0,10}(설명|메커니즘|명제)/]
  };
  const names = {
    regression:/(?<!자기\s?)회귀\s*(분석|모형)?|regression/,mediation:/매개\s*(효과|분석|변수|모형)|간접\s*효과|mediation/,moderation:/조절\s*(효과|분석|변수|모형)|상호작용\s*효과|moderation/,
    'moderated-mediation':/조절된\s*매개|매개된\s*조절|조건부\s*간접|moderated mediation/,sem:/구조\s*방정식|\bsem\b|측정\s*모형/,multigroup:/다집단/,
    lpa:/잠재\s*프로파일|\blpa\b/,lca:/잠재\s*(계층|클래스)|\blca\b/,lta:/잠재\s*전이|\blta\b/,'scale-development':/척도\s*(를\s*)?(개발|타당화)|측정\s*도구\s*(를\s*)?(개발|타당화|만들)|문항\s*개발|\brasch\b|라쉬/,
    prediction:/머신\s*러닝|기계\s*학습|랜덤\s*포레스트|예측\s*모형|random forest/,arcl:/교차\s*지연|자기\s*회귀|\b(arcl|clpm)\b|ri-clpm/,phenomenology:/현상학/,'grounded-theory':/근거\s*이론/,narrative:/내러티브|네러티브|생애사/,
    'scoping-review':/스코핑|주제\s*범위\s*(문헌|고찰)/,'integrative-review':/통합적\s*(문헌|고찰)/,'systematic-review':/체계적\s*(문헌|고찰|리뷰)/,'meta-analysis':/메타\s*분석|meta.?analysis/,'theory-building':/이론\s*구축|명제/,
    sna:/사회\s*(관계\s*)?(망|네트워크)|\bsna\b|네트워크\s*분석/,'topic-modeling':/토픽|텍스트\s*마이닝|\blda\b/,multilevel:/다층|위계적\s*선형|\bhlm\b/,'case-study':/사례\s*연구|case study/,lgm:/잠재\s*성장|\blgm\b/,
    'mixed-methods':/혼합\s*(연구|방법)|mixed.?method/,ddr:/설계\s*기반\s*연구|설계.?개발\s*연구|\b(ddr|dbr)\b|개발\s*연구/,'quasi-experiment':/준실험|quasi/
  };
  const hints = {
    regression:[/관계|관련|영향|요인/],mediation:[/이유|왜|어떻게 이어|연결되는/],phenomenology:[/경험|느끼|겪/],'case-study':[/우리 (회사|조직|학교)|한 (회사|기업|학교)/],'grounded-theory':[/과정/],'scoping-review':[/연구 (현황|흐름|동향)|어디까지/],'quasi-experiment':[/효과(가|를|는)? ?(있|보|알|검증)/],prediction:[/미리|예측/],lgm:[/변화|변하/],narrative:[/이야기/]
  };
  const FIELDS=[['purpose','연구 목적',1],['dataText','변수·자료',1],['desired','제시할 결과',1.2],['ultimate','궁극적 질문',1.2]];
  function clean(value) {
    return String(value || '').slice(0,10000).normalize('NFKC').toLowerCase()
      .replace(/([가-힣a-z]+(?:\s[가-힣a-z]+)?)\s*(?:가|이|는|은|를|을)?\s*(?:아니라|아니고|아닌|아니\S*|제외\S*|원하지\S*|필요\s*없\S*|하지\s*않\S*)/g,' ');
  }
  function inferKind(text) {
    const found=[];
    if (/설문|점수|척도|수치|성적|시험|로그|lms|응답범주|예\/아니오|이분형|범주형|패널|데이터셋/.test(text)) found.push('quantitative');
    if (/심층\s*면담|인터뷰|면담|생애사|경험\s*일지|성찰\s*일지|참여\s*관찰|관찰|포커스\s*그룹|초점\s*집단/.test(text)) found.push('qualitative');
    if (/기존\s*논문|문헌|논문들|논문을|연구\s*보고서|선행\s*연구들?을|효과\s*크기를?\s*(모아|합)/.test(text)) found.push('literature');
    return found.length===1 ? found[0] : (found.length>1 ? 'mixed' : 'unknown');
  }
  function inferWaves(text) {
    if(/(한\s*번|1\s*회|한\s*시점|1\s*시점|횡단)/.test(text)) return '1';
    if(/(두\s*번|2\s*회|두\s*시점|2\s*시점|2\s*차례|사전.{0,4}사후)/.test(text)) return '2';
    if(/(세\s*번|네\s*번|다섯\s*번|[3-9]\s*회|[3-9]\s*번|[3-9]\s*시점|세\s*시점|네\s*시점|[3-9]\s*차례|[3-9]\s*개\s*시점)/.test(text)) return '3';
    return 'unknown';
  }
  function inferIndicators(text) {
    if(/예\/아니오|예·아니오|유무|여부|이분형|범주형|응답\s*범주/.test(text)) return 'categorical';
    if(/점수|척도|평균|연속형|리커트/.test(text)) return 'continuous';
    return 'unknown';
  }
  const FLEX=new Set(['topic-modeling','sna','case-study','ddr','mixed-methods']);
  function kindFits(m,kind){
    if(kind==='unknown'||kind==='mixed') return true;
    if(FLEX.has(m.id)) return true;
    if(m.id==='quasi-experiment') return kind==='quantitative';
    return kind===m.category;
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
    if(id==='lta') {
      if(waves==='1') excluded.push('잠재전이분석은 같은 사람을 2회 이상 측정해야 유형 이동을 추정할 수 있습니다.');
      else missing.push('같은 사람을 같은 도구로 반복 측정했는지, 시점 간 측정불변과 분류오차를 확인하세요.');
    }
    if(id==='lgm') {
      if(waves==='1'||waves==='2') excluded.push('잠재성장모형은 같은 사람을 3회 이상 측정해야 추정할 수 있습니다.');
      else missing.push('같은 사람을 3회 이상 같은 도구로 측정했는지, 시점 간 측정동일성과 탈락을 확인하세요.');
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
    const values=Object.fromEntries(FIELDS.map(([k])=>[k,clean(input[k])]));
    const text=FIELDS.map(([k])=>values[k]).join(' ');
    const selectedKind=input.kind||'unknown';
    const inferred=inferKind(values.dataText||'')==='unknown'?inferKind(text):inferKind(values.dataText);
    const kind=selectedKind==='unknown' ? inferred : selectedKind;
    const waves=(input.waves&&input.waves!=='unknown')?input.waves:inferWaves(text);
    const indicators=(input.indicators&&input.indicators!=='unknown')?input.indicators:inferIndicators(text);
    const conditionInput=Object.assign({},input,{waves,indicators});
    const notes=[];
    if(selectedKind==='unknown' && inferred!=='unknown') notes.push('작성한 내용에서 '+({quantitative:'수치형 자료',qualitative:'면담·관찰 자료',literature:'문헌 자료',mixed:'두 종류 이상의 자료'})[inferred]+'를 쓰는 것으로 읽었습니다. 다르면 아래 ‘주로 사용할 자료’에서 바로잡아 주세요.');
    if(selectedKind!=='unknown' && inferred!=='unknown' && inferred!=='mixed' && selectedKind!==inferred && selectedKind!=='mixed') notes.push('자료 종류 선택과 작성한 자료 설명이 달라 보입니다. 실제로 분석할 자료를 확인하세요.');
    const rows=methods.map(m=>{
      let score=0; const reasons=[]; const evidence=[];
      FIELDS.forEach(([key,label,weight])=>{
        const raw=values[key]; const value=m.id==='regression'?raw.replace(/자기\s*회귀/g,' '):raw;
        const found=[];
        const add=(phrase,pts)=>{if(phrase&&!found.includes(phrase)){found.push(phrase);score+=pts*weight;}};
        if(value){
          const nm=names[m.id]&&value.match(names[m.id]); if(nm)add(nm[0].trim(),14);
          (patterns[m.id]||[]).forEach(p=>{const hit=value.match(p);if(hit)add(hit[0].trim(),7);});
          (m.signals||[]).forEach(s=>{const hit=/^[a-z][a-z -]*$/i.test(s)?new RegExp('\\b'+s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(value):value.includes(s.toLowerCase());if(hit)add(s,4);});
          if(!found.length)(hints[m.id]||[]).forEach(p=>{const hit=value.match(p);if(hit)add(hit[0].trim(),2);});
        }
        evidence.push({field:key,label,written:!!value,phrases:found.slice(0,3)});
      });
      if(m.id==='mixed-methods'&&/설문|점수|척도/.test(text)&&/면담|인터뷰|관찰/.test(text)){score+=/함께|같이|모두|결합|통합|합쳐|이유|왜/.test(text)?16:6;const e=evidence.find(x=>x.field==='dataText');if(!e.phrases.length)e.phrases.push('수치 자료와 면담·관찰 자료');e.written=true;}
      const fieldsHit=evidence.filter(e=>e.phrases.length).length;
      if(fieldsHit>1)score+=(fieldsHit-1)*3;
      if(goal.includes(m.id)){score+=25;reasons.push('‘가장 중요하게 확인할 결과’로 고른 항목과 맞습니다.');}
      if(score>0&&m.id==='moderated-mediation'&&/매개|간접|경유|거쳐/.test(text)&&/조절|상호작용|따라.{0,20}달라/.test(text)){score+=20;reasons.push('중간 경로와 그 경로가 달라지는 조건을 함께 묻고 있습니다.');}
      if(m.id==='moderation'&&/이중조절|삼원|three.way/.test(text))score+=9;
      if(score>0&&m.id==='lpa'&&indicators==='continuous')score+=10;
      if(score>0&&m.id==='lca'&&indicators==='categorical')score+=10;
      if(fieldsHit&&reasons.length<3&&fieldsHit>1)reasons.push('네 질문 중 '+fieldsHit+'개의 답이 이 방법을 함께 가리킵니다.');
      const check=constraints(m.id,conditionInput,kind);
      const conditions=[];
      if(selectedKind!=='unknown'&&!kindFits(m,selectedKind)){check.excluded.push('선택한 자료 종류와 이 방법의 주된 자료가 다릅니다.');conditions.push({label:'자료 종류',state:'no',text:'선택한 자료와 맞지 않음'});}
      else if(kind!=='unknown'&&!kindFits(m,kind)){score-=10;check.missing.push('작성한 내용으로 보면 자료 종류가 이 방법과 다를 수 있습니다. 어떤 자료를 쓸지 확인하세요.');conditions.push({label:'자료 종류',state:'warn',text:'작성한 자료와 다를 수 있음'});}
      else if(kind!=='unknown'){score+=score>0?3:0;conditions.push({label:'자료 종류',state:'ok',text:'맞음'});}
      else conditions.push({label:'자료 종류',state:'unknown',text:'어떤 자료인지 아직 적지 않았습니다'});
      if(['arcl','lgm','lta','quasi-experiment'].includes(m.id)){const need=m.id==='lgm'?3:2;conditions.push(waves==='unknown'?{label:'측정 시점',state:'unknown',text:'같은 사람을 '+need+'회 이상 측정해야 합니다'}:(Number(waves)>=need?{label:'측정 시점',state:'ok',text:'맞음'}:{label:'측정 시점',state:'no',text:need+'회 이상 측정 필요'}));}
      if(m.id==='lpa'||m.id==='lca'){const want=m.id==='lpa'?'continuous':'categorical';conditions.push(indicators==='unknown'?{label:'지표 형태',state:'unknown',text:m.id==='lpa'?'연속형 점수여야 합니다':'범주형 응답이어야 합니다'}:(indicators===want?{label:'지표 형태',state:'ok',text:'맞음'}:{label:'지표 형태',state:'no',text:'맞지 않음'}));}
      return {id:m.id,score,reasons,missing:check.missing,excluded:check.excluded,evidence,conditions,fieldsHit};
    }).filter(r=>r.score>0&&(r.fieldsHit>0||goal.includes(r.id))).sort((a,b)=>b.score-a.score);
    const open=rows.filter(r=>!r.excluded.length);
    const candidates=open.filter((r,i)=>i===0||r.score>=Math.max(8,open[0].score*0.35)).slice(0,3);
    let fallback=[];
    if(!candidates.length&&kind!=='unknown'&&kind!=='mixed') fallback=methods.filter(m=>m.category===kind).map(m=>m.id);
    const top=candidates[0],next=candidates[1];
    const fit=!top?'none':(top.score<8?'weak':(next&&next.score>=top.score-3?'close':'clear'));
    return {candidates,excluded:rows.filter(r=>r.excluded.length).slice(0,3),notes,fit,fallback,hasInput:text.trim().length>0||goal.length>0,read:{kind,waves,indicators}};
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

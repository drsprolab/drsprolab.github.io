(function () {
  'use strict';
  const gf=document.getElementById('rm-gloss-filter');
  if(gf){const cnt=document.getElementById('rm-gloss-count');
    const upd=()=>{const q=gf.value.trim().toLowerCase();let n=0;
      document.querySelectorAll('#method-terms .rm-glossary-base dt').forEach(dt=>{const dd=dt.nextElementSibling;const hit=!q||(dt.textContent+' '+(dd?dd.textContent:'')).toLowerCase().includes(q);dt.hidden=!hit;if(dd)dd.hidden=!hit;if(hit)n++;});
      document.querySelectorAll('#method-terms .rm-gloss-item').forEach(it=>{const hit=!q||it.textContent.toLowerCase().includes(q);it.hidden=!hit;if(hit)n++;});
      document.querySelectorAll('#method-terms .rm-glossary-method').forEach(m=>{m.hidden=!m.querySelector('.rm-gloss-item:not([hidden])');});
      document.querySelectorAll('#method-terms .rm-glossary-cat').forEach(c=>{c.hidden=!c.querySelector('.rm-glossary-method:not([hidden])');});
      if(cnt)cnt.textContent=q?n+'개 용어':'';};
    gf.addEventListener('input',upd);}
  const openFold=()=>{const id=decodeURIComponent(location.hash.slice(1)),t=id&&document.getElementById(id);if(!t)return;let n=t;while(n){if(n.tagName==='DETAILS'&&!n.open)n.open=true;n=n.parentElement;}if(t.closest&&t.closest('.rm-fold'))t.scrollIntoView();};
  window.addEventListener('hashchange',openFold);openFold();
  window.addEventListener('beforeprint',()=>document.querySelectorAll('.rm-fold').forEach(d=>{d.open=true;}));
  const root=document.getElementById('method-selector');
  if(root){
    const startIds=['start','rm-form-title','rm-form','rm-results'],introIds=['rm-start','method-terms'];
    const viewFor=()=>{const id=decodeURIComponent(location.hash.slice(1));if(!id)return 'intro';if(startIds.includes(id))return 'start';if(introIds.includes(id))return 'intro';return 'catalog';};
    let current=null;
    const show=()=>{const view=viewFor(),changed=view!==current;current=view;root.dataset.view=view;
      const id=decodeURIComponent(location.hash.slice(1)),target=id&&document.getElementById(id);
      if(changed)window.scrollTo(0,Math.max(0,root.getBoundingClientRect().top+window.scrollY-80));
      if(target&&!['start','method-catalog'].includes(id)&&target.offsetParent)target.scrollIntoView();};
    window.addEventListener('hashchange',show);show();
  }
  const el=(tag,content,cls)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=content;if(cls)n.className=cls;return n;};
  const examples=[
    {label:'HRD · 교육에서 현업 적용으로',purpose:'교육 참여가 현업 적용으로 이어지는 중간 경로를 알고 싶습니다.',dataText:'동일 직원의 교육 참여, 교육 직후 자기효능감, 이후 전이동기와 학습전이를 설문으로 측정할 계획입니다.',desired:'자기효능감과 전이동기를 거치는 직렬다중매개 경로와 간접효과를 제시하고 싶습니다.',ultimate:'교육 참여가 왜 학습전이와 연결되는지 심리적 기제를 밝히고 싶습니다.',kind:'quantitative',indicators:'continuous',waves:'3',goal:'pathway'},
    {label:'조직심리 · 숨은 몰입 유형',purpose:'조직몰입과 직무열의, 소진의 점수 조합으로 사람 유형을 찾고 싶습니다.',dataText:'직원에게 몰입·열의·소진을 설문으로 조사한 연속형 점수가 있습니다.',desired:'평균 뒤에 숨은 잠재프로파일과 유형별 특성을 보여 주고 싶습니다.',ultimate:'서로 다른 경험 조합을 가진 직원에게 어떤 지원이 필요한지 이해하고 싶습니다.',kind:'quantitative',indicators:'continuous',waves:'1',goal:'profiles'},
    {label:'학습분석 · 중도탈락 조기경보',purpose:'중도탈락 위험을 미리 예측하여 학습지원을 설계하고 싶습니다.',dataText:'1~3주 수치형 LMS 기록과 사전성취, 학기 말 중도탈락 여부가 있습니다. 다음 기수를 검증 자료로 쓸 계획입니다.',desired:'새로운 학습자의 위험확률과 예측 오류·성능을 제시하고 싶습니다.',ultimate:'조기에 지원할 학습자를 얼마나 정확하게 식별할 수 있는지 알고 싶습니다.',kind:'quantitative',indicators:'unknown',waves:'unknown',goal:'future'},
    {label:'질적 · 배제 경험의 의미',purpose:'학습·승진 기회에서 배제된 직원의 경험의 의미를 이해하고 싶습니다.',dataText:'배제를 직접 경험한 직원의 심층면담과 경험일지를 수집하려고 합니다.',desired:'구체적 체험과 의미를 드러내는 경험 주제와 근거 인용을 제시하고 싶습니다.',ultimate:'당사자가 배제를 어떻게 살아내고 해석하는지 밝히고 싶습니다.',kind:'qualitative',indicators:'unknown',waves:'unknown',goal:'experience'},
    {label:'문헌 · AI 학습 연구 현황',purpose:'생성형 AI와 직원 학습에 관한 연구가 어디까지 이루어졌고, 무엇이 부족한지 알고 싶습니다.',dataText:'기존 논문과 연구보고서에서 대상·개념·맥락·방법을 추출하려고 합니다.',desired:'문헌의 범위와 개념·자료·설계의 분포를 정리하고 싶습니다.',ultimate:'무엇이 이미 연구되었고 어떤 질문이 남았는지 밝히고 싶습니다.',kind:'literature',indicators:'unknown',waves:'unknown',goal:'map'}
  ];
  const app=document.getElementById('method-selector');
  if(app && window.ResearchMethodSelector){
    const methods=JSON.parse(document.getElementById('rm-data-json').textContent);
    const form=document.getElementById('rm-form'),results=document.getElementById('rm-results'),status=document.getElementById('rm-status');
    const byId=new Map(methods.map(m=>[m.id,m]));
    function itemList(items,cls){const list=el('ul',undefined,cls);items.forEach(s=>list.append(el('li',s)));return list;}
    function clear(){results.hidden=true;results.replaceChildren();status.textContent='';}
    form.addEventListener('input',clear);form.addEventListener('change',clear);form.addEventListener('reset',clear);
    const picker=document.getElementById('rm-examples');
    examples.forEach(ex=>{const b=el('button',ex.label);b.type='button';b.addEventListener('click',()=>{clear();Object.keys(ex).forEach(k=>{if(form.elements[k])form.elements[k].value=ex[k];});status.textContent='연구 고민 예시를 입력했습니다.';form.elements.purpose.focus();});picker.append(b);});
    form.addEventListener('submit',event=>{
      event.preventDefault();clear();const input=Object.fromEntries(new FormData(form).entries());
      const output=window.ResearchMethodSelector.recommend(methods,input);
      results.hidden=false;const heading=el('h2','내 연구에서 먼저 살펴볼 방법');heading.id='rm-results-title';results.append(heading);
      const summary=el('details');summary.append(el('summary','내가 작성한 네 가지 질문 다시 보기'));
      const dl=el('dl',undefined,'rm-input-summary');[['purpose','목적'],['dataText','자료'],['desired','원하는 결과'],['ultimate','궁극적 질문']].forEach(([key,label])=>{dl.append(el('dt',label),el('dd',input[key]||'아직 작성하지 않았습니다.'));});summary.append(dl);results.append(summary);
      output.notes.forEach(n=>results.append(el('p',n,'rm-small')));
      const fitText={clear:'네 가지 답을 방법별로 대조해 가장 잘 맞는 방법을 골랐습니다.',close:'맨 위 두 방법이 비슷하게 맞습니다. 둘의 차이를 읽어 보고 정하세요.',weak:'쓴 내용이 짧아 확실히 고르기 어렵습니다. 가장 가까운 방법을 보여 드립니다. 대상, 변수, 자료를 더 적으면 정확해집니다.'};
      if(fitText[output.fit])results.append(el('p',fitText[output.fit],'rm-fit-note'));
      if(!output.candidates.length){results.append(el('p',output.hasInput?'지금 쓴 내용으로는 방법을 고르기 어렵습니다. 무엇을 알고 싶은지, 어떤 자료를 쓸지 한 문장씩 더 적어 보세요.':'네 질문 중 한 가지 이상을 적거나 가장 중요한 결과를 골라 주세요.'));
        if(output.fallback.length){results.append(el('p','선택한 자료로 할 수 있는 방법입니다.','rm-small'));const fb=el('ul');output.fallback.forEach(id=>{const li=el('li'),a=el('a',byId.get(id).name);a.href=app.dataset.base+encodeURIComponent(id)+'/';li.append(a);fb.append(li);});results.append(fb);}}
      output.candidates.forEach((r,i)=>{
        const m=byId.get(r.id),card=el('article',undefined,'rm-result-card'+(i===0?' is-best':''));
        const title=el('h3');const tl=el('a',m.name);tl.href=app.dataset.base+encodeURIComponent(m.id)+'/';title.append(tl);
        card.append(el('span',i===0?(output.fit==='weak'?'가장 가까운 방법':'가장 적합한 방법'):'함께 비교할 방법','rm-tag'),title,el('p',m.question));
        const table=el('table',undefined,'rm-crosscheck');const body=el('tbody');
        r.evidence.forEach(e=>{const tr=el('tr'),th=el('th',e.label);th.scope='row';const td=el('td',e.phrases.length?'“'+e.phrases.join('”, “')+'”':(e.written?'이 답에서는 근거를 찾지 못함':'작성하지 않음'));if(e.phrases.length)td.className='is-hit';tr.append(th,td);body.append(tr);});
        const stateMark={ok:'맞음',warn:'주의',no:'맞지 않음',unknown:'확인 필요'};
        r.conditions.forEach(c=>{const tr=el('tr'),th=el('th',c.label);th.scope='row';const td=el('td',c.text===stateMark[c.state]?c.text:stateMark[c.state]+' · '+c.text);td.className='is-'+c.state;tr.append(th,td);body.append(tr);});
        table.append(body);card.append(el('strong','내 답과 대조한 결과'),table);
        if(r.reasons.length)card.append(itemList(r.reasons));
        card.append(el('strong','얻을 수 있는 결과'),el('p',m.outputs[0]));
        if(r.missing.length)card.append(el('strong','확인할 점'),itemList(r.missing,'rm-missing'));
        const link=el('a',m.name.split(' (')[0]+' 자세히 보기 →','rm-button'+(i===0?' primary':''));link.href=app.dataset.base+encodeURIComponent(m.id)+'/';card.append(link);results.append(card);
      });
      if(output.excluded.length){const box=el('details');box.append(el('summary','목적은 맞지만 자료 조건이 맞지 않는 방법'));output.excluded.forEach(r=>{box.append(el('h3',byId.get(r.id).name),itemList(r.excluded));const a=el('a','이 방법의 자료 조건 읽기');a.href=app.dataset.base+encodeURIComponent(r.id)+'/';box.append(a);});results.append(box);}
      results.append(el('p','쓴 표현과 자료 조건만 대조한 안내이며, 입력 내용은 이 브라우저 밖으로 나가지 않습니다. 최종 선택 전에 상세 페이지의 선택 조건을 확인하세요.','rm-small'));
      status.textContent=output.candidates.length+'개의 방법 후보를 제시했습니다.';results.focus();results.scrollIntoView({block:'start',behavior:'auto'});
    });
  }
  const checks=document.getElementById('rm-check-form');
  if(checks){checks.addEventListener('submit',event=>{event.preventDefault();const fields=Array.from(checks.querySelectorAll('fieldset'));const answers=fields.map(f=>{const selected=f.querySelector('input:checked');return selected?selected.value:'unknown';});const result=document.getElementById('rm-check-result');result.replaceChildren();
    const message=window.ResearchMethodSelector.evaluateChecklist(answers).message;
    result.append(el('p',message));answers.forEach((a,i)=>{if(a!=='yes')result.append(el('p',(a==='no'?'보완할 조건: ':'더 확인할 조건: ')+fields[i].querySelector('legend').textContent));});
  });checks.addEventListener('change',()=>document.getElementById('rm-check-result').replaceChildren());}
})();

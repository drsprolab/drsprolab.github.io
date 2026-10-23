// AI Agent 요구도 분석 — AI 역량 수준 진단과 같은 단계형 화면/척도 디자인.
// 검토 모드: 응답은 메모리에만 유지하며 전송·저장하지 않는다.
(function () {
  var root = document.getElementById('aidx');
  if (!root) return;
  var source = root.dataset.source;
  var data = null, items = [], state = { view: 'home', page: -1, answers: {}, background: {}, advanced: false };
  var I_SCALE = [[1,'전혀 필요하지 않다'],[2,'별로 필요하지 않다'],[3,'보통이다'],[4,'필요하다'],[5,'매우 필요하다']];
  var P_SCALE = [[1,'혼자서는 하기 어렵다'],[2,'단계별 안내가 필요하다'],[3,'가끔 도움을 받아 할 수 있다'],[4,'익숙한 과제는 혼자 할 수 있다'],[5,'새로운 과제에도 혼자 적용할 수 있다']];
  var COMMON = [], ADVANCED = [], PAGES = [], ADVANCED_PAGES = [];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var cta = function (act, text, primary) { return '<button type="button" class="aidx-btn' + (primary ? ' primary' : '') + '" data-act="' + act + '">' + text + '</button>'; };

  function loadData() {
    fetch(source).then(function (r) { if (!r.ok) throw new Error('load'); return r.json(); }).then(function (d) {
      data = d; var n = 1;
      d.domains.forEach(function (dm) {
        dm.items.forEach(function (pair, i) {
          var it = { code: dm.id + String(i + 1).padStart(2,'0'), number: n++, domain: dm, text: pair[0], evidence: pair[1] };
          items.push(it); (dm.module === '공통' ? COMMON : ADVANCED).push(it);
        });
      });
      var commonDomains=d.domains.filter(function(dm){return dm.module==='공통';});
      var advancedDomains=d.domains.filter(function(dm){return dm.module!=='공통';});
      PAGES=commonDomains.map(function(dm){return items.filter(function(it){return it.domain.id===dm.id;});});
      ADVANCED_PAGES=advancedDomains.map(function(dm){return items.filter(function(it){return it.domain.id===dm.id;});});
      render();
    }).catch(function () { root.innerHTML = '<section class="aidx-home"><p class="aidx-err">문항 자료를 불러오지 못했습니다. 새로고침해 주세요.</p></section>'; });
  }
  function viewHome() {
    var html = '<p class="aidx-preview">검토용 시험 모드: 입력하신 답은 이 화면이 열려 있는 동안에만 유지되며, 서버로 전송되거나 저장되지 않습니다.</p>' +
      '<section class="aidx-home"><p class="aidx-lead">대학생에게 어떤 AI 기술을 먼저 가르칠지<br>필요성과 현재 수행수준으로 확인합니다.</p>' +
      '<ul class="aidx-meta"><li class="beta">개발안</li><li>공통 15문항</li><li>Agent 심화 6문항</li><li>중요도 × 수행수준</li></ul>' +
      '<div class="aidx-actions">' + cta('start','진단 시작',true) + '</div>' +
      '<p class="aidx-small">공통 문항은 5개 기술 영역, Agent 심화 문항은 2개 영역으로 구성됩니다. 심화 문항은 Agent 사용·구축 경험 또는 학습 의향에 따라 제시합니다. 전문가 검토와 예비조사 전의 개발안입니다.</p>' +
      '</section>' +
      '<section class="aidx-model"><h2 class="aidx-h">무엇을 파악하나요</h2><p>각 기술을 대학 수업·비교과에서 배울 필요성과 현재 혼자 수행할 수 있는 정도를 각각 답합니다. 중요도는 향후 1년의 교육 필요성, 수행수준은 최근 한 학기 실제 경험을 기준으로 판단합니다.</p>' +
      '<ol class="aidx-flow">' + data.domains.filter(function(d){return d.module==='공통';}).map(function(dm,i){return '<li><span class="aidx-when"><b>'+(i+1)+'</b>공통 영역</span><span class="aidx-ficon" aria-hidden="true">'+['💬','🔎','🛠️','📖','🛡️'][i]+'</span><strong class="aidx-fname">'+esc(dm.name)+'</strong><span class="aidx-fq">'+dm.items.length+'문항</span></li>';}).join('') + '</ol>' +
      '<p class="aidx-fsum"><span>공통 5개 기술 영역 · 15문항</span><span>+ Agent 심화 2개 영역 · 6문항</span><span>= 최대 21문항</span></p></section>';
    root.innerHTML = html;
  }

  function radioButtons(it, dimension, scale) {
    var name = it.code + '_' + dimension, current = state.answers[name];
    return '<div class="agn-answer"><strong>'+(dimension==='I'?'중요도':'수행수준')+'</strong><div class="agn-scale" role="radiogroup" aria-label="'+esc(it.text)+' '+(dimension==='I'?'중요도':'수행수준')+'">' +
      scale.map(function (o) { return '<label title="'+esc(o[1])+'"><input type="radio" name="'+name+'" value="'+o[0]+'" aria-label="'+o[0]+' '+esc(o[1])+'"'+(current===o[0]?' checked':'')+'><span>'+o[0]+'</span></label>'; }).join('') +
      '</div><div class="agn-scale-hints"><span>'+esc(scale[0][1])+'</span><span>'+esc(scale[4][1])+'</span></div></div>';
  }
  function itemList(list) {
    return '<ol class="aidx-items">'+list.map(function(it){return '<li class="aidx-item" id="q-'+it.code+'"><p class="aidx-q"><span class="aidx-no">'+it.code+'</span>'+esc(it.text)+'</p>'+
      '<div class="agn-pairs">'+radioButtons(it,'I',I_SCALE)+radioButtons(it,'P',P_SCALE)+'</div>'+
      '</li>';}).join('')+'</ol>';
  }
  function progress(done,total,step,totalSteps) {
    return '<div class="aidx-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+done+'"><span style="width:'+Math.round(done/total*100)+'%"></span></div><p class="aidx-step">'+step+' / '+totalSteps+'</p>';
  }
  function viewSurvey() {
    var p=state.page, totalSteps=PAGES.length+2+ADVANCED_PAGES.length, total=(COMMON.length+(state.advanced?ADVANCED.length:0))*2+5, done=Object.keys(state.answers).length+Object.keys(state.background).length;
    var h=progress(done,total,p+2,totalSteps), list=PAGES[p], domain=list[0].domain;
    h += '<h2 class="aidx-h">'+esc(domain.name)+' · '+(p+1)+' / '+PAGES.length+'</h2><p>각 기술을 향후 1년 안에 대학에서 배울 필요성과 현재 할 수 있는 정도를 각각 1~5점으로 골라 주세요. 수행수준은 최근 한 학기 경험을 바탕으로, 경험이 없다면 현재 혼자 할 수 있는 정도를 판단해 응답해 주세요.</p>';
    h += itemList(list);
    h += '<div class="aidx-nav">'+cta('prev','이전',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next',p===PAGES.length-1?'다음':'다음',true)+'</div>';
    root.innerHTML='<p class="aidx-preview">검토 모드 · 답변은 현재 화면에서만 유지됩니다.</p><section class="aidx-survey">'+h+'</section>';
  }
  function choice(name, title, options, cols) {
    var v=state.background[name];
    return '<fieldset class="aidx-role"><legend>'+title+'</legend><div class="aidx-roles" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+options.map(function(o){return '<label><input type="radio" name="'+name+'" value="'+o[0]+'"'+(v===o[0]?' checked':'')+'><span>'+esc(o[1])+'</span></label>';}).join('')+'</div></fieldset>';
  }
  function viewGuide() {
    var h=progress(Object.keys(state.background).length,4,1,PAGES.length+2+ADVANCED_PAGES.length);
    h+='<h2 class="aidx-h">응답하기 전에</h2><ol class="aidx-guide"><li><span class="aidx-gicon">⭐</span><strong>교육 필요성과 현재 능력</strong><span>중요도는 향후 1년 안에 대학에서 배울 필요성, 수행수준은 최근 한 학기 경험을 바탕으로 현재 혼자 할 수 있는 정도입니다. 두 항목 모두 1~5점으로 응답합니다.</span></li><li><span class="aidx-gicon">🧑‍🎓</span><strong>경험이 적어도 응답할 수 있어요</strong><span>직접 해 본 경험이 적거나 없어도 현재 할 수 있는 정도를 판단해 가장 가까운 점수를 선택해 주세요.</span></li></ol>';
    h+='<div class="agn-fields">'+choice('major','전공 계열',[['1','인문·사회'],['2','자연과학'],['3','공학·ICT'],['4','보건·의료'],['5','예술·체육'],['6','기타'],['9','응답하지 않음']],3)+
      choice('year','학년',[['1','1학년'],['2','2학년'],['3','3학년'],['4','4학년 이상'],['9','응답하지 않음']],3)+
      choice('ai_frequency','최근 4주 AI 사용 빈도',[['0','없음'],['1','월 1~3일'],['2','주 1~2일'],['3','주 3~4일'],['4','주 5일 이상']],3)+
      choice('agent_experience','직접 사용해 본 Agent 경험',[['0','없음'],['1','시연만 봄'],['2','기존 Agent 실행'],['3','직접 구성·수정 후 실행']],2)+'</div>';
    h+='<p class="agn-no-collect">검토용 시험 화면입니다. 답변은 전송·저장되지 않으며, 조사 참여 동의나 개인정보를 실제 수집하지 않습니다.</p>';
    h+='<div class="aidx-nav">'+cta('home','처음으로',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next','공통 문항 시작',true)+'</div>';
    root.innerHTML='<section class="aidx-survey">'+h+'</section>';
  }
  function viewBranch() {
    var v=state.background.build_interest;
    var h=progress(Object.keys(state.answers).length+Object.keys(state.background).length,COMMON.length*2+ADVANCED.length*2+5,PAGES.length+2,PAGES.length+2+ADVANCED_PAGES.length)+'<h2 class="aidx-h">Agent 심화 문항 안내</h2>'+
      '<p>Agent를 직접 사용해 본 적이 있거나, 앞으로 한 학기 안에 Agent 사용·구축 교육을 들을 의향이 보통 이상이면 심화 문항에 응답해 주세요. 해당하지 않으면 건너뛰어도 됩니다.</p>'+
      '<fieldset class="aidx-role"><legend>앞으로 한 학기 안에 AI Agent 활용 또는 구축 교육에 참여할 의향은 어느 정도인가요?</legend><div class="aidx-roles">'+[[1,'전혀 없다'],[2,'별로 없다'],[3,'보통이다'],[4,'있다'],[5,'매우 있다']].map(function(o){return '<label><input type="radio" name="build_interest" value="'+o[0]+'"'+(v===o[0]?' checked':'')+'><span>'+o[1]+'</span></label>';}).join('')+'</div></fieldset>'+
      '<div class="aidx-nav">'+cta('prev','이전',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next','다음',true)+'</div>';
    root.innerHTML='<section class="aidx-survey">'+h+'</section>';
  }
  function viewAdvanced() {
    var idx=state.page-PAGES.length, group=ADVANCED_PAGES[idx], dm=group[0].domain;
    var h=progress(Object.keys(state.answers).length+Object.keys(state.background).length,COMMON.length*2+ADVANCED.length*2+5,PAGES.length+3+idx,PAGES.length+2+ADVANCED_PAGES.length)+'<h2 class="aidx-h">Agent 심화 · '+esc(dm.name)+'</h2><p>향후 1년 안에 대학에서 배울 필요성과 현재 할 수 있는 정도를 각각 1~5점으로 골라 주세요. 수행수준은 경험이 적거나 없어도 현재 혼자 할 수 있는 정도를 판단해 응답해 주세요.</p>';
    h+=itemList(group)+'<div class="aidx-nav">'+cta('prev','이전',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next','다음',true)+'</div>';
    root.innerHTML='<p class="aidx-preview">Agent 심화 문항 · 조건에 해당하는 응답자에게만 제시</p><section class="aidx-survey">'+h+'</section>';
  }
  function viewComplete() {
    var answered=Object.keys(state.answers).length/2;
    root.innerHTML='<p class="aidx-preview">검토 모드: 어떤 응답도 저장하거나 전송하지 않았습니다.</p><section class="aidx-home"><p class="aidx-lead">문항 흐름 검토를 마쳤습니다.</p><ul class="aidx-meta"><li>'+answered+'개 문항 응답</li><li>'+(state.advanced?'Agent 심화 포함':'공통 문항')+'</li></ul><p class="aidx-small">이 시험 화면은 아직 응답을 수집하지 않으며 통계 결과도 계산하지 않습니다. 실제 요구도 결과는 여러 대학생의 응답을 수집한 뒤 동일 응답자 쌍으로 산출해야 합니다.</p><div class="aidx-actions">'+cta('home','처음으로',true)+'</div></section>';
  }
  function render() {
    if (!data) return;
    if (state.view==='home') viewHome();
    else if (state.view==='guide') viewGuide();
    else if (state.view==='survey') viewSurvey();
    else if (state.view==='branch') viewBranch();
    else if (state.view==='advanced') viewAdvanced();
    else if (state.view==='complete') viewComplete();
  }
  function go(view) { state.view=view; render(); window.scrollTo({top:root.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'}); }
  function completePage(list) { return list.every(function(it){return state.answers[it.code+'_I']!=null && state.answers[it.code+'_P']!=null;}); }
  function nextPage() {
    var err=document.getElementById('aidx-err');
    if (state.view==='guide') {
      var required=['major','year','ai_frequency','agent_experience'];
      if (required.some(function(k){return state.background[k]==null;})) {err.textContent='응답자 배경 항목을 골라 주세요.';return;}
      state.page=0;go('survey');return;
    }
    if (state.view==='survey') {
      var page=PAGES[state.page];
      if (!completePage(page)) {err.textContent='각 문항에서 중요도와 수행수준을 모두 골라 주세요.'; page.forEach(function(it){if(state.answers[it.code+'_I']==null||state.answers[it.code+'_P']==null){var li=document.getElementById('q-'+it.code);if(li)li.classList.add('is-miss');}});return;}
      if(state.page<PAGES.length-1){state.page++;render();window.scrollTo(0,0);}else go('branch');return;
    }
    if (state.view==='branch') {
      if(state.background.build_interest==null){err.textContent='참여 의향을 골라 주세요.';return;}
      state.advanced=state.background.agent_experience>=2||state.background.build_interest>=3;
      if(state.advanced){state.page=PAGES.length;go('advanced');}else go('complete');return;
    }
    if (state.view==='advanced') {
      var idx=state.page-PAGES.length, list=ADVANCED_PAGES[idx];
      if(!completePage(list)){err.textContent='각 문항에서 중요도와 수행수준을 모두 골라 주세요.';list.forEach(function(it){if(state.answers[it.code+'_I']==null||state.answers[it.code+'_P']==null){var li=document.getElementById('q-'+it.code);if(li)li.classList.add('is-miss');}});return;}
      if(idx<ADVANCED_PAGES.length-1){state.page++;render();window.scrollTo(0,0);}else go('complete');
    }
  }
  root.addEventListener('change',function(e){var t=e.target;if(t.type==='radio'){if(t.name.indexOf('_I')>0||t.name.indexOf('_P')>0){state.answers[t.name]=Number(t.value);var li=t.closest('.aidx-item');if(li)li.classList.remove('is-miss');}else state.background[t.name]=Number(t.value);}});
  root.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act;if(a==='start'){state.page=-1;go('guide');}else if(a==='home')go('home');else if(a==='prev'){if(state.view==='guide')go('home');else if(state.view==='survey'){if(state.page===0)go('guide');else{state.page--;render();window.scrollTo(0,0);}}else if(state.view==='branch'){state.page=PAGES.length-1;go('survey');}else if(state.view==='advanced'){if(state.page===PAGES.length)go('branch');else{state.page--;render();window.scrollTo(0,0);}}}else if(a==='next')nextPage();});
  loadData();
})();

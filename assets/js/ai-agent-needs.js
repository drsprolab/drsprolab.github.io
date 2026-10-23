// AI Agent 요구도 분석 — AI 역량 수준 진단과 같은 단계형 화면/척도 디자인.
// 설문 응답 → 저장 → 분석결과(Borich 요구도 · IPA · Locus for Focus, 응답자 구분별 비교, 나의 응답).
// 응답 저장: #aidx의 data-endpoint(Google Apps Script 웹앱, tools/ai-agent-needs/)가 있으면 그곳에,
// 비어 있으면 시험 모드로, 응답을 이 브라우저에만 저장하고 이 브라우저의 응답끼리만 분석한다.
(function () {
  var root = document.getElementById('aidx');
  if (!root) return;
  var source = root.dataset.source;
  var ENDPOINT = (root.dataset.endpoint || '').trim();
  var PREVIEW = !ENDPOINT;
  var GROUP = String(new URLSearchParams(location.search).get('group') || '').trim().replace(/[^\w가-힣-]/g, '').slice(0, 40);
  var LS_ME = 'agn-v1-me' + (PREVIEW ? '-test' : ''), LS_DATA = 'agn-v1-test-responses';
  var MIN_N = 5, MIN_GROUP = 3;
  var data = null, items = [], state = { view: 'home', page: -1, answers: {}, background: {}, advanced: false, started: 0, tab: 'all', pool: null, me: load(LS_ME), filter: { major: '', year: '' }, dim: 'major', detailDomain: 'A' };
  var I_SCALE = [[1,'전혀 필요하지 않다'],[2,'별로 필요하지 않다'],[3,'보통이다'],[4,'필요하다'],[5,'매우 필요하다']];
  var P_SCALE = [[1,'혼자서는 하기 어렵다'],[2,'단계별 안내가 필요하다'],[3,'가끔 도움을 받아 할 수 있다'],[4,'익숙한 과제는 혼자 할 수 있다'],[5,'새로운 과제에도 혼자 적용할 수 있다']];
  var BG = [
    ['major', '전공 계열', [['1','인문·사회'],['2','자연과학'],['3','공학·ICT'],['4','보건·의료'],['5','예술·체육'],['6','기타'],['9','응답하지 않음']]],
    ['year', '학년', [['1','1학년'],['2','2학년'],['3','3학년'],['4','4학년 이상'],['9','응답하지 않음']]],
    ['ai_frequency', '최근 4주 AI 사용 빈도', [['0','없음'],['1','월 1~3일'],['2','주 1~2일'],['3','주 3~4일'],['4','주 5일 이상']]],
    ['agent_experience', 'Agent 경험', [['0','없음'],['1','시연만 봄'],['2','기존 Agent 실행'],['3','직접 구성·수정 후 실행']]],
    ['build_interest', 'Agent 교육 참여 의향', [['1','전혀 없다'],['2','별로 없다'],['3','보통이다'],['4','있다'],['5','매우 있다']]]
  ];
  var COMMON = [], ADVANCED = [], PAGES = [], ADVANCED_PAGES = [];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var cta = function (act, text, primary) { return '<button type="button" class="aidx-btn' + (primary ? ' primary' : '') + '" data-act="' + act + '">' + text + '</button>'; };

  // ---------- 유틸 ----------
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function sd(a) { var m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1)) : 0; }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function newId() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = '';
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < 8; i++) s += A[b[i] % A.length];
    return s;
  }
  function fmtId(id) { return id.slice(0, 4) + '-' + id.slice(4); }
  function bgLabel(key, v) { var b = BG.filter(function (x) { return x[0] === key; })[0]; var o = b && b[2].filter(function (x) { return Number(x[0]) === v; })[0]; return o ? o[1] : '–'; }
  // 대응표본 t 검정의 양측 p값(Student t 분포, 불완전 베타 함수)
  function lgamma(x) { var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5], y = x, t = x + 5.5, s = 1.000000000190015; t -= (x + 0.5) * Math.log(t); for (var j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); var h = d; for (var m = 1; m <= 200; m++) { var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; var del = d * c; h *= del; if (Math.abs(del - 1) < 3e-7) break; } return h; }
  function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  function tP(t, df) { return ibeta(df / 2, 0.5, df / (df + t * t)); }
  function fmtP(p) { return p < 0.001 ? '< .001' : p.toFixed(3).replace(/^0/, ''); }

  function loadData() {
    fetch(source).then(function (r) { if (!r.ok) throw new Error('load'); return r.json(); }).then(function (d) {
      data = d; var n = 1;
      d.domains.forEach(function (dm) {
        dm.items.forEach(function (pair, i) {
          var it = { code: dm.id + String(i + 1).padStart(2,'0'), number: n++, idx: items.length, domain: dm, text: pair[0], label: dm.skill_labels[i], evidence: pair[1] };
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
  function previewNote() { return PREVIEW ? '<p class="aidx-preview">시험 모드: 응답 저장소가 아직 연결되지 않아, 응답은 이 브라우저에만 저장되고 이 브라우저의 응답끼리만 분석합니다.</p>' : ''; }

  // ---------- 화면: 대문 ----------
  function viewHome() {
    var me = state.me;
    var html = previewNote() +
      '<section class="aidx-home"><p class="aidx-lead">미래 필수역량인 AI·Agent 활용 역량 교육을 위해<br>어떤 기술과 학습 과정을 먼저 가르칠지 요구도를 분석해 교육과정을 설계합니다.</p>' +
      '<ul class="aidx-meta"><li class="beta">개발안</li><li>공통 15문항</li><li>Agent 심화 6문항</li><li>중요도 × 수행수준</li></ul>' +
      (GROUP ? '<p class="aidx-group">응답 그룹 <strong>' + esc(GROUP) + '</strong></p>' : '') +
      '<div class="aidx-actions">' + cta('start','진단 시작',true) + '</div>' +
      '<div class="aidx-actions sub">' + cta('results','분석결과 보기',false) + (me ? cta('mine','나의 응답 보기',false) : '') + '</div>' +
      (me ? '<p class="aidx-small">이 기기에 저장된 내 결과 코드: <code>' + fmtId(me.id) + '</code></p>' : '') +
      '<button type="button" class="aidx-link" data-act="code">다른 기기에서 이미 응답했다면 결과 코드 입력</button>' +
      '<form class="aidx-code" id="agn-code" hidden><label for="agn-code-in">결과 코드</label><input id="agn-code-in" autocomplete="off" placeholder="XXXX-XXXX" maxlength="9">' +
      '<button type="submit" class="aidx-btn">결과 보기</button><span class="aidx-err" id="agn-code-err"></span></form>' +
      '<p class="aidx-small">공통 문항은 5개 기술 영역, Agent 심화 문항은 2개 영역으로 구성됩니다. 심화 문항은 Agent 사용·구축 경험 또는 학습 의향에 따라 제시합니다. 전문가 검토와 예비조사 전의 개발안입니다.</p>' +
      '</section>' +
      '<section class="aidx-model"><h2 class="aidx-h">무엇을 파악하나요</h2><p>각 기술을 대학 수업·비교과에서 배울 필요성과 현재 혼자 수행할 수 있는 정도를 각각 답합니다. 중요도는 향후 1년의 교육 필요성, 수행수준은 최근 한 학기 실제 경험을 기준으로 판단합니다. 응답이 모이면 <strong>Borich 요구도 · IPA · Locus for Focus</strong>로 먼저 가르칠 기술을 정합니다.</p>' +
      '<ol class="aidx-flow">' + data.domains.filter(function(d){return d.module==='공통';}).map(function(dm,i){return '<li><span class="aidx-when"><b>'+(i+1)+'</b>공통 영역</span><span class="aidx-ficon" aria-hidden="true">'+['💬','🔎','🛠️','📖','🛡️'][i]+'</span><strong class="aidx-fname">'+esc(dm.name)+'</strong><span class="aidx-fq">'+dm.items.length+'문항</span></li>';}).join('') + '</ol>' +
      '<p class="aidx-fsum"><span>공통 5개 기술 영역 · 15문항</span><span>+ Agent 심화 2개 영역 · 6문항</span><span>= 최대 21문항</span></p></section>';
    root.innerHTML = html;
  }

  // ---------- 화면: 설문 ----------
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
    h += '<div class="aidx-nav">'+cta('prev','이전',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next','다음',true)+'</div>';
    root.innerHTML=previewNote()+'<section class="aidx-survey">'+h+'</section>';
  }
  function choice(name, title, options, cols) {
    var v=state.background[name];
    return '<fieldset class="aidx-role"><legend>'+title+'</legend><div class="aidx-roles" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">'+options.map(function(o){return '<label><input type="radio" name="'+name+'" value="'+o[0]+'"'+(v===Number(o[0])?' checked':'')+'><span>'+esc(o[1])+'</span></label>';}).join('')+'</div></fieldset>';
  }
  function viewGuide() {
    var h=progress(Object.keys(state.background).length,4,1,PAGES.length+2+ADVANCED_PAGES.length);
    h+='<h2 class="aidx-h">응답하기 전에</h2><ol class="aidx-guide"><li><span class="aidx-gicon">⭐</span><strong>교육 필요성과 현재 능력</strong><span>중요도는 향후 1년 안에 대학에서 배울 필요성, 수행수준은 최근 한 학기 경험을 바탕으로 현재 혼자 할 수 있는 정도입니다. 두 항목 모두 1~5점으로 응답합니다.</span></li><li><span class="aidx-gicon">🧑‍🎓</span><strong>경험이 적어도 응답할 수 있어요</strong><span>직접 해 본 경험이 적거나 없어도 현재 할 수 있는 정도를 판단해 가장 가까운 점수를 선택해 주세요.</span></li></ol>';
    h+='<div class="agn-fields">'+BG.slice(0, 4).map(function (b, i) { return choice(b[0], b[0]==='agent_experience'?'직접 사용해 본 Agent 경험':b[1], b[2], i===3?2:3); }).join('')+'</div>';
    h+='<p class="agn-no-collect">응답은 익명으로 저장되며, 대학생 AI 교육 과정을 설계하는 연구 목적으로만 사용합니다. 이름·학번 같은 개인정보는 묻지 않습니다.</p>';
    h+='<div class="aidx-nav">'+cta('home','처음으로',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next','공통 문항 시작',true)+'</div>';
    root.innerHTML=previewNote()+'<section class="aidx-survey">'+h+'</section>';
  }
  function viewBranch() {
    var v=state.background.build_interest;
    var h=progress(Object.keys(state.answers).length+Object.keys(state.background).length,COMMON.length*2+ADVANCED.length*2+5,PAGES.length+2,PAGES.length+2+ADVANCED_PAGES.length)+'<h2 class="aidx-h">Agent 심화 문항 안내</h2>'+
      '<p>Agent를 직접 사용해 본 적이 있거나, 앞으로 한 학기 안에 Agent 사용·구축 교육을 들을 의향이 보통 이상이면 심화 문항에 응답해 주세요. 해당하지 않으면 건너뛰어도 됩니다.</p>'+
      '<fieldset class="aidx-role"><legend>앞으로 한 학기 안에 AI Agent 활용 또는 구축 교육에 참여할 의향은 어느 정도인가요?</legend><div class="aidx-roles">'+[[1,'전혀 없다'],[2,'별로 없다'],[3,'보통이다'],[4,'있다'],[5,'매우 있다']].map(function(o){return '<label><input type="radio" name="build_interest" value="'+o[0]+'"'+(v===o[0]?' checked':'')+'><span>'+o[1]+'</span></label>';}).join('')+'</div></fieldset>'+
      '<div class="aidx-nav">'+cta('prev','이전',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next','다음',true)+'</div>';
    root.innerHTML=previewNote()+'<section class="aidx-survey">'+h+'</section>';
  }
  function viewAdvanced() {
    var idx=state.page-PAGES.length, group=ADVANCED_PAGES[idx], dm=group[0].domain;
    var h=progress(Object.keys(state.answers).length+Object.keys(state.background).length,COMMON.length*2+ADVANCED.length*2+5,PAGES.length+3+idx,PAGES.length+2+ADVANCED_PAGES.length)+'<h2 class="aidx-h">Agent 심화 · '+esc(dm.name)+'</h2><p>향후 1년 안에 대학에서 배울 필요성과 현재 할 수 있는 정도를 각각 1~5점으로 골라 주세요. 수행수준은 경험이 적거나 없어도 현재 혼자 할 수 있는 정도를 판단해 응답해 주세요.</p>';
    h+=itemList(group)+'<div class="aidx-nav">'+cta('prev','이전',false)+'<span class="aidx-err" id="aidx-err"></span>'+cta('next','제출하기',true)+'</div>';
    root.innerHTML=previewNote()+'<section class="aidx-survey">'+h+'</section>';
  }
  function viewSaving(msg) { root.innerHTML = '<section class="aidx-home"><div class="aidx-spin" aria-hidden="true"></div><p class="aidx-lead">' + msg + '</p></section>'; }
  function viewSaveError() {
    root.innerHTML = '<section class="aidx-home"><p class="aidx-err">응답을 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요. 입력한 답은 그대로 남아 있습니다.</p><div class="aidx-actions">' + cta('retry','다시 제출',true) + '</div></section>';
  }
  function viewDone() {
    var me = state.me;
    root.innerHTML = previewNote() + '<section class="aidx-home"><p class="aidx-lead">응답이 저장되었습니다. 감사합니다.</p>' +
      '<ul class="aidx-meta"><li>' + (COMMON.length + (me.advanced ? ADVANCED.length : 0)) + '개 문항 응답</li><li>' + (me.advanced ? 'Agent 심화 포함' : '공통 문항') + '</li></ul>' +
      '<p>내 결과 코드 <code>' + fmtId(me.id) + '</code> — 다른 기기에서 내 응답을 다시 볼 때 입력하세요.</p>' +
      '<div class="aidx-actions">' + cta('results','분석결과 보기',true) + cta('mine','나의 응답 보기',false) + '</div></section>';
  }

  // ---------- 데이터 ----------
  function call(url, opts) {
    var ctl = window.AbortController ? new AbortController() : null, o = opts || {};
    if (ctl) { o.signal = ctl.signal; setTimeout(function () { ctl.abort(); }, 25000); }
    return fetch(url, o).then(function (r) { return r.json(); });
  }
  function record() {
    var rec = { id: state.pendingId || (state.pendingId = newId()), group: GROUP, advanced: state.advanced ? 1 : 0, I: {}, P: {}, seconds: Math.round((Date.now() - state.started) / 1000) };
    BG.forEach(function (b) { rec[b[0]] = state.background[b[0]]; });
    items.forEach(function (it, k) { if (k < COMMON.length || state.advanced) { rec.I[it.code] = state.answers[it.code + '_I']; rec.P[it.code] = state.answers[it.code + '_P']; } });
    return rec;
  }
  function submit(rec) {
    if (PREVIEW) { var rows = load(LS_DATA) || []; rows.push(rec); save(LS_DATA, rows); return Promise.resolve(); }
    return call(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) })
      .then(function (j) { if (!j.ok && j.error !== 'duplicate') throw new Error(j.error || '저장 실패'); });
  }
  // 저장 형식(코드별 객체)과 서버 형식(배열)을 분석용 배열로 맞춘다.
  function fromRecord(r) {
    return { g: r.group || '', bg: BG.map(function (b) { return Number(r[b[0]]); }), adv: r.advanced ? 1 : 0,
      I: items.map(function (it) { var v = r.I[it.code]; return v == null ? null : Number(v); }),
      P: items.map(function (it) { var v = r.P[it.code]; return v == null ? null : Number(v); }) };
  }
  function fetchPool() {
    var me = state.me;
    if (PREVIEW) {
      return Promise.resolve((load(LS_DATA) || []).filter(function (r) { return !GROUP || (r.group || '') === GROUP; }).map(function (r) { var o = fromRecord(r); o.mine = !!(me && r.id === me.id); return o; }));
    }
    return call(ENDPOINT + '?action=all&group=' + encodeURIComponent(GROUP) + (me ? '&me=' + encodeURIComponent(me.id) : '')).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return j.rows.map(function (r) { return { g: r.g || '', bg: r.bg, adv: r.adv, I: r.I, P: r.P, mine: !!r.m }; });
    });
  }
  function fetchOne(id) {
    if (PREVIEW) { var r = (load(LS_DATA) || []).filter(function (x) { return x.id === id; })[0]; return Promise.resolve(r ? { id: r.id, row: fromRecord(r) } : null); }
    return call(ENDPOINT + '?action=one&id=' + encodeURIComponent(id)).then(function (j) { return j.ok && j.row ? { id: j.row.id, row: { g: j.row.g, bg: j.row.bg, adv: j.row.adv, I: j.row.I, P: j.row.P } } : null; });
  }

  // ---------- 분석 ----------
  // 문항마다 중요도·수행수준이 모두 있는 응답자 쌍으로 계산한다.
  function analyze(rows) {
    var st = items.map(function (it, k) {
      var pr = rows.filter(function (r) { return r.I[k] != null && r.P[k] != null; });
      var I = pr.map(function (r) { return r.I[k]; }), P = pr.map(function (r) { return r.P[k]; }), D = pr.map(function (r) { return r.I[k] - r.P[k]; });
      var n = pr.length, mI = mean(I), mP = mean(P), d = mean(D), s = sd(D);
      var t = n > 1 && s > 0 ? d / (s / Math.sqrt(n)) : null;
      return { it: it, k: k, n: n, mI: mI, mP: mP, gap: d, t: t, p: t === null ? null : tP(Math.abs(t), n - 1), borich: d * mI };
    }).filter(function (x) { return x.n > 0; });
    if (!st.length) return null;
    return classify(st);
  }
  // 상위 7개 영역은 같은 응답자의 세부 기술 평균으로 산출한다.
  // 공통·심화는 응답 대상이 달라 순위와 IPA/LFF 기준선을 각각 계산한다.
  function classify(st) {
    var cuts = {};
    ['공통', 'Agent 심화'].forEach(function (module) {
      var set = st.filter(function (x) { return x.it.domain.module === module; });
      if (!set.length) return;
      var aI = mean(set.map(function (x) { return x.mI; })), aP = mean(set.map(function (x) { return x.mP; })), aG = mean(set.map(function (x) { return x.gap; }));
      set.slice().sort(function (a, b) { return b.borich - a.borich || a.k - b.k; }).forEach(function (x, i) { x.rank = i + 1; });
      set.forEach(function (x) {
        x.lff = (x.mI >= aI ? 'H' : 'L') + (x.gap >= aG ? 'H' : 'L');
        x.ipa = x.mI >= aI ? (x.mP < aP ? '집중 개선' : '유지') : (x.mP < aP ? '낮은 우선' : '과잉');
      });
      var K = set.filter(function (x) { return x.lff === 'HH'; }).length;
      set.forEach(function (x) { var top = x.rank <= K, hh = x.lff === 'HH'; x.prio = x.gap > 0 ? (top && hh ? 1 : (top || hh ? 2 : 0)) : 0; });
      cuts[module] = { aI: aI, aP: aP, aG: aG, K: K };
    });
    return st.length ? { st: st, cuts: cuts } : null;
  }
  function domainAnalysis(rows, minimum) {
    var st = data.domains.map(function (dm, k) {
      var its = items.filter(function (it) { return it.domain.id === dm.id; });
      var pr = rows.filter(function (r) { return its.every(function (it) { return r.I[it.idx] != null && r.P[it.idx] != null; }); });
      var I = pr.map(function (r) { return mean(its.map(function (it) { return r.I[it.idx]; })); });
      var P = pr.map(function (r) { return mean(its.map(function (it) { return r.P[it.idx]; })); });
      var mI = mean(I), mP = mean(P);
      return { it: { domain: dm, label: dm.report_name, text: dm.name }, k: k, n: pr.length, mI: mI, mP: mP, gap: mI - mP, borich: (mI - mP) * mI };
    }).filter(function (x) { return x.n >= minimum; });
    return classify(st);
  }
  function detailAnalysis(A, dm) {
    // 세부 분석의 기준선·순위는 선택 영역 안의 세 기술만으로 다시 산출한다.
    return classify(A.st.filter(function (x) { return x.it.domain.id === dm.id; }).map(function (x) { return Object.assign({}, x); }));
  }
  var PRIO = ['–', '최우선', '차우선'];

  // ---------- 그림 ----------
  function scatter(st, xKey, yKey, xLab, yLab, xCut, yCut, quads, shadeLeft, label) {
    var W = 420, H = 300, l = 46, r = W - 12, t = 14, b = H - 40;
    var xs = st.map(function (x) { return x[xKey]; }), ys = st.map(function (x) { return x[yKey]; });
    var x0 = Math.floor((Math.min.apply(null, xs.concat([xCut])) - 0.15) * 10) / 10, x1 = Math.ceil((Math.max.apply(null, xs.concat([xCut])) + 0.15) * 10) / 10;
    var y0 = Math.floor((Math.min.apply(null, ys.concat([yCut])) - 0.15) * 10) / 10, y1 = Math.ceil((Math.max.apply(null, ys.concat([yCut])) + 0.15) * 10) / 10;
    var sx = function (v) { return l + (r - l) * (v - x0) / (x1 - x0); }, sy = function (v) { return b - (b - t) * (v - y0) / (y1 - y0); };
    var g = '<rect x="' + (shadeLeft ? l : sx(xCut)) + '" y="' + t + '" width="' + (shadeLeft ? sx(xCut) - l : r - sx(xCut)) + '" height="' + (sy(yCut) - t) + '" fill="var(--accent)" fill-opacity=".08"/>' +
      '<rect x="' + l + '" y="' + t + '" width="' + (r - l) + '" height="' + (b - t) + '" fill="none" stroke="var(--line)"/>' +
      '<line x1="' + sx(xCut) + '" y1="' + t + '" x2="' + sx(xCut) + '" y2="' + b + '" stroke="var(--muted)" stroke-dasharray="4 3"/>' +
      '<line x1="' + l + '" y1="' + sy(yCut) + '" x2="' + r + '" y2="' + sy(yCut) + '" stroke="var(--muted)" stroke-dasharray="4 3"/>';
    [[r - 4, t + 12, 'end'], [l + 4, t + 12, 'start'], [l + 4, b - 6, 'start'], [r - 4, b - 6, 'end']].forEach(function (q, i) {
      g += '<text x="' + q[0] + '" y="' + q[1] + '" text-anchor="' + q[2] + '" font-size="10" font-weight="700" fill="var(--muted)">' + quads[i] + '</text>';
    });
    [x0, xCut, x1].forEach(function (v) { g += '<text x="' + sx(v) + '" y="' + (b + 13) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + f2(v) + '</text>'; });
    [y0, yCut, y1].forEach(function (v) { g += '<text x="' + (l - 5) + '" y="' + (sy(v) + 3) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + f2(v) + '</text>'; });
    g += '<text x="' + (l + r) / 2 + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink)">' + xLab + '</text>' +
      '<text x="12" y="' + (t + b) / 2 + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink)" transform="rotate(-90 12 ' + (t + b) / 2 + ')">' + yLab + '</text>';
    var placed = [];
    st.forEach(function (x) {
      var hi = x.prio === 1, cx = sx(x[xKey]), cy = sy(x[yKey]);
      var labelWidth = Math.min(220, Array.from(x.it.label).reduce(function (n, c) { return n + (c.charCodeAt(0) > 255 ? 11 : 6); }, 0));
      var anchor = cx > (l + r) / 2 ? 'end' : 'start';
      var tx = anchor === 'end' ? Math.max(l + labelWidth + 4, cx - 9) : Math.min(r - labelWidth - 4, cx + 9);
      var lx = anchor === 'end' ? tx - labelWidth : tx, ty = cy - 12;
      var offsets = [-12, 20, -30, 38, -48, 56, -66, 74];
      for (var j = 0; j < offsets.length; j++) {
        ty = Math.max(t + 29, Math.min(b - 18, cy + offsets[j]));
        if (!placed.some(function (p) { return lx < p.x + p.w + 3 && lx + labelWidth + 3 > p.x && ty - 12 < p.y + 4 && ty + 4 > p.y - 12; })) break;
      }
      placed.push({ x: lx, y: ty, w: labelWidth });
      g += '<g><title>' + esc(x.it.label) + ' · ' + xLab + ' ' + f2(x[xKey]) + ' · ' + yLab + ' ' + f2(x[yKey]) + '</title><line x1="' + cx + '" y1="' + cy + '" x2="' + tx + '" y2="' + (ty - 4) + '" stroke="var(--muted)" stroke-opacity=".35"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (hi ? 5.5 : 4) + '" fill="' + (hi ? 'var(--series-1)' : 'var(--series-2)') + '" stroke="var(--paper)" stroke-width="1.5"/><text x="' + tx + '" y="' + ty + '" text-anchor="' + anchor + '" font-size="11" font-weight="' + (hi ? 700 : 400) + '" fill="var(--ink)">' + esc(x.it.label) + '</text></g>';
    });
    return '<div class="agn-scatter-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '" style="width:100%;min-width:380px;height:auto">' + g + '</svg></div>';
  }
  function signedBar(value, max, label) {
    var w = Math.min(50, Math.abs(value) / max * 50), left = value >= 0 ? 50 : 50 - w;
    return '<span class="agn-gap-track" aria-hidden="true"><i class="' + (value >= 0 ? 'positive' : 'negative') + '" style="left:' + left.toFixed(2) + '%;width:' + w.toFixed(2) + '%"></i></span>';
  }
  function rankBars(st) {
    return '<div class="aidx-hbars agn-rank-bars">' + st.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (x) {
      return '<div class="aidx-hrow' + (x.prio === 1 ? ' is-mine' : '') + '"><span class="aidx-hname">' + esc(x.it.label) + '</span>' + signedBar(x.borich, 20) + '<span class="aidx-hval">' + f2(x.borich) + (x.prio === 1 ? ' · 우선' : '') + '</span></div>';
    }).join('') + '</div>';
  }
  function pairedBars(st) {
    return '<div class="aidx-hbars agn-paired-bars">' + st.map(function (x) {
      return '<div class="aidx-hrow"><span class="aidx-hname">' + esc(x.it.label) + '</span><span class="aidx-htrack agn-two"><span style="width:' + x.mI / 5 * 100 + '%"></span><i style="width:' + x.mP / 5 * 100 + '%"></i></span><span class="aidx-hval">' + f2(x.mI) + ' / ' + f2(x.mP) + '</span></div>';
    }).join('') + '</div>';
  }
  function kpi(k, v, s) { return '<div class="kpi"><span class="kpi-k">' + k + '</span><span class="kpi-v">' + v + '</span><span class="kpi-s">' + s + '</span></div>'; }

  // ---------- 화면: 분석결과 ----------
  function filtered() {
    var f = state.filter;
    return state.pool.filter(function (r) { return (!f.major || r.bg[0] === Number(f.major)) && (!f.year || r.bg[1] === Number(f.year)); });
  }
  function filterBar() {
    function sel(key, label, opts) {
      return '<label class="agn-filter">' + label + ' <select data-filter="' + key + '"><option value="">전체</option>' + opts.filter(function (o) { return o[0] !== '9'; }).map(function (o) {
        return '<option value="' + o[0] + '"' + (state.filter[key] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    }
    return '<div class="agn-filters" data-report-control>' + sel('major', '전공 계열', BG[0][2]) + sel('year', '학년', BG[1][2]) + '</div>';
  }
  function moduleLabel(module) { return module === '공통' ? '공통 교육' : 'Agent 심화 교육'; }
  function priorityLabel(x) { return x.prio === 1 ? '우선 교육 후보' : x.prio === 2 ? '추가 검토' : '수요 참고'; }
  function moduleRanks(A) {
    return ['공통', 'Agent 심화'].map(function (module) {
      var st = A.st.filter(function (x) { return x.it.domain.module === module; });
      return '<div class="panel"><h3 class="panel-title">' + moduleLabel(module) + ' 우선순위</h3><p class="panel-sub">영역별 Borich 요구도 · 같은 교육 대상 안에서 비교 · 중앙선 0, 범위 −20~20</p>' + (st.length ? rankBars(st) : '<p class="aidx-note">분석 가능한 심화 응답이 부족합니다.</p>') + '</div>';
    }).join('');
  }
  function overviewMatrices(D) {
    return '<details class="panel agn-overview-matrix"><summary>7개 영역의 IPA·Locus for Focus 확인</summary><p class="aidx-small">공통 영역과 Agent 심화 영역은 각각 같은 모듈 안에서 평균 기준선을 정합니다.</p>' + ['공통','Agent 심화'].map(function(module) {
      var st=D.st.filter(function(x){return x.it.domain.module===module;}),cut=D.cuts[module];
      if(!st.length)return '';
      return '<h3 class="agn-group-sub">'+moduleLabel(module)+'</h3><section class="report-grid"><div class="panel"><h3 class="panel-title">영역별 IPA</h3>'+scatter(st,'mP','mI','수행수준 평균','중요도 평균',cut.aP,cut.aI,['유지','집중 개선','낮은 우선','과잉'],true,moduleLabel(module)+' 영역별 IPA')+'</div><div class="panel"><h3 class="panel-title">영역별 Locus for Focus</h3>'+scatter(st,'mI','gap','중요도 평균','중요도 − 수행수준',cut.aI,cut.aG,['HH','LH','LL','HL'],false,moduleLabel(module)+' 영역별 Locus for Focus')+'</div></section>';
    }).join('')+'</details>';
  }
  function detailTable(st) {
    return '<div class="table-wrap"><table class="aidx-table agn-detail-table"><thead><tr><th>세부 기술</th><th>n</th><th>중요도</th><th>수행수준</th><th>차이</th><th>Borich</th><th>순위</th><th>IPA</th><th>LFF</th><th>검토 결과</th><th>t</th><th>p</th></tr></thead><tbody>' + st.slice().sort(function (a,b) { return a.rank-b.rank; }).map(function (x) {
      return '<tr' + (x.prio === 1 ? ' class="aidx-mine-row"' : '') + '><td>' + esc(x.it.label) + '</td><td>' + x.n + '</td><td>' + f2(x.mI) + '</td><td>' + f2(x.mP) + '</td><td>' + f2(x.gap) + '</td><td><strong>' + f2(x.borich) + '</strong></td><td>' + x.rank + '</td><td>' + x.ipa + '</td><td>' + x.lff + '</td><td>' + priorityLabel(x) + '</td><td>' + (x.t === null ? '–' : f2(x.t)) + '</td><td>' + (x.p === null ? '–' : fmtP(x.p)) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function domainDetail(A, dm) {
    var eligible = { st: A.st.filter(function (x) { return x.n >= MIN_N; }) }, D = detailAnalysis(eligible, dm);
    var h = '<section class="agn-domain-detail"><div class="agn-detail-heading"><span class="agn-module">' + moduleLabel(dm.module) + '</span><h3>' + esc(dm.name) + '</h3><p>세부 기술 ' + dm.skill_labels.length + '개 · 이 영역 안에서 Borich 순위와 IPA·LFF 기준선을 산출합니다.</p></div>';
    if (!D) return h + '<p class="aidx-note">세부 기술별 유효 응답이 ' + MIN_N + '명 이상 모이면 분석을 표시합니다.</p></section>';
    var st = D.st, cut = D.cuts[dm.module];
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">세부 기술별 Borich 요구도</h3><p class="panel-sub">높을수록 우선 교육 수요가 큽니다. 진한 기술명은 우선 교육 후보입니다.</p>' + rankBars(st) + '</div><div class="panel"><h3 class="panel-title">세부 기술별 중요도·수행수준</h3><p class="panel-sub">위 파란 막대: 중요도 · 아래 주황 막대: 수행수준 · 1~5점</p>' + pairedBars(st) + '</div></section>';
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">세부 기술별 IPA</h3><p class="panel-sub">왼쪽 위: 중요도가 높고 수행수준이 낮은 기술 · 점선은 이 영역 기술들의 평균</p>' + scatter(st, 'mP', 'mI', '수행수준 평균', '중요도 평균', cut.aP, cut.aI, ['유지','집중 개선','낮은 우선','과잉'], true, dm.name + ' IPA') + '</div><div class="panel"><h3 class="panel-title">세부 기술별 Locus for Focus</h3><p class="panel-sub">오른쪽 위(HH): 중요도와 차이가 모두 높은 기술 · 점선은 이 영역 기술들의 평균</p>' + scatter(st, 'mI', 'gap', '중요도 평균', '중요도 − 수행수준', cut.aI, cut.aG, ['HH','LH','LL','HL'], false, dm.name + ' Locus for Focus') + '</div></section>';
    h += '<div class="panel"><h3 class="panel-title">세부 기술 분석값</h3>' + detailTable(st) + '<p class="aidx-small">t·p는 같은 학생의 중요도와 수행수준에 대한 대응표본 검정입니다. 차이의 유의성이 교육 우선순위를 단독으로 결정하지 않습니다.</p></div></section>';
    return h;
  }
  // 수요 순위와 수업 전 선수학습 안내를 분리한다. 공통·심화 간 점수는 비교하지 않는다.
  function curriculumPlan(A, D, minimum) {
    return ['공통', 'Agent 심화'].map(function (module) {
      return { module: module, steps: D.st.filter(function (x) {
        return x.it.domain.module === module && x.gap > 0;
      }).slice().sort(function (a, b) { return b.borich - a.borich || a.k - b.k; }).map(function (x) {
        var dm = x.it.domain, detail = detailAnalysis({ st: A.st.filter(function (v) { return v.n >= minimum; }) }, dm);
        return { domain: x, skills: detail ? detail.st.filter(function (v) { return v.gap > 0; }).sort(function (a, b) { return b.borich - a.borich || a.k - b.k; }) : [] };
      }) };
    });
  }
  function curriculumReport(A, D) {
    var plan = curriculumPlan(A, D, MIN_N);
    var h = '<section class="panel agn-curriculum"><h2 class="aidx-h">교육과정 수립 제언</h2><p>현재 선택한 응답자 집단을 기준으로, 다음 순서로 교육을 개설하고 각 단계 안에서는 먼저 표시된 세부 기술부터 중점적으로 가르칠 것을 제안합니다.</p><p class="aidx-small">공통·Agent 심화 과정은 별도 경로입니다. 중요도보다 수행수준이 낮은 영역을 Borich 요구도순으로 배치하며, 같은 점수는 설문 영역 순서로 표시합니다. IPA·Locus for Focus는 집중 교육 여부를 판단하는 보조 근거입니다. 아래 순서는 자기보고 요구에 따른 개설 제안이며, 선수학습과 실제 수행 과제를 확인해 조정하세요.</p>';
    h += '<div class="agn-curriculum-prep"><h3>수업 전 준비</h3><p>공통 과정: AI 사용 규칙·민감정보 보호를 먼저 안내하고 도구 접속과 기본 요청문 작성을 점검하세요. Agent 심화 과정: 목표·완료 기준 설정과 실행 검증을 점검한 뒤 구축·자동화로 진행하세요. 이 준비 순서는 통계 순위가 아닌 수업 설계상의 선수학습 안내입니다.</p></div>';
    plan.forEach(function (track) {
      h += '<h3>' + moduleLabel(track.module) + ' · 권장 교육 순서</h3>';
      if (!track.steps.length) {
        h += '<p class="aidx-note">' + (D.st.some(function (x) { return x.it.domain.module === track.module; }) ? '현재 자료에서 양의 영역 요구도 차이가 없습니다. 신규 집중 과정의 순위를 정하지 않고, 기존 역량 유지와 세부 기술별 보완 여부를 검토하세요.' : '유효 응답이 부족해 교육 순서 제안을 보류합니다.') + '</p>'; return;
      }
      h += '<p class="agn-curriculum-route">' + track.steps.map(function (step, i) { return (i + 1) + '. ' + esc(step.domain.it.label); }).join(' → ') + '</p>';
      track.steps.forEach(function (step, i) {
        var x = step.domain, dm = x.it.domain;
        h += '<article class="agn-curriculum-step"><h4>' + (i + 1) + '단계 · ' + esc(dm.course) + '</h4><p><strong>선정 근거:</strong> 영역 Borich ' + f2(x.borich) + ' · 중요도 ' + f2(x.mI) + ' / 수행 ' + f2(x.mP) + ' · 차이 ' + f2(x.gap) + ' · n=' + x.n + ' · IPA ' + x.ipa + ' · LFF ' + x.lff + ' · ' + priorityLabel(x) + '</p><p><strong>가르칠 세부 내용 — 아래 순서로 중점 지도</strong></p><ol>';
        step.skills.forEach(function (v) {
          var pos = items.filter(function (it) { return it.domain.id === dm.id; }).map(function (it) { return it.idx; }).indexOf(v.k);
          h += '<li><strong>' + esc(v.it.label) + '</strong>: ' + esc(dm.teaching_contents[pos]) + '<p class="aidx-small">세부 Borich ' + f2(v.borich) + ' · IPA ' + v.ipa + ' · LFF ' + v.lff + ' · ' + priorityLabel(v) + '</p></li>';
        });
        h += '</ol><p><strong>실습·평가 결과물:</strong> ' + esc(dm.learning_output) + '</p><p class="aidx-small">교수자는 해당 결과물을 직접 수행하게 하여 정확성·독립 수행·안전한 사용을 확인하고 보충학습을 결정하세요. 차이가 0 이하인 세부 기술은 집중 지도 목록에서 제외하며 유지·복습에 활용합니다.</p></article>';
      });
    });
    return h + '<p class="aidx-small">운영 방법: 앞 단계의 실습 결과를 다음 단계 과제에 연결하고, 교육 후 같은 중요도·수행수준 문항과 실제 수행 과제로 변화를 확인하세요. 응답이 부족한 영역은 추가 조사 후 편성합니다.</p></section>';
  }
  function allReport() {
    var rows = filtered(), n = rows.length, A = analyze(rows), D = domainAnalysis(rows, MIN_N);
    var h = filterBar() + '<p class="aidx-context">' + (GROUP ? '그룹 ' + esc(GROUP) : '전체 응답자') + ' · 응답 ' + n + '명 · Agent 심화 ' + rows.filter(function (r) { return r.adv; }).length + '명' + (PREVIEW ? ' · 시험 모드' : '') + '</p>';
    if (!A || !D || n < MIN_N) return h + '<p class="aidx-note">영역별 유효 응답이 ' + MIN_N + '명 이상 모이면 결과를 표시합니다.</p>';
    var priority = D.st.filter(function (x) { return x.prio === 1; });
    h += '<section class="aidx-type"><p class="aidx-eyebrow">교육과정 설계 요약</p><h2>7개 기술 영역에서 교육 우선순위를 찾습니다</h2><p>영역별 수요를 살펴보고, 아래에서 각 영역의 세부 기술을 Borich·IPA·Locus for Focus로 확인하세요.</p><div class="agn-summary-tags">' + (priority.length ? priority.map(function (x) { return '<span>' + esc(x.it.label) + ' · 우선 후보</span>'; }).join('') : '<span>겹치는 우선 후보가 없습니다. 세부 분석을 함께 검토하세요.</span>') + '</div></section>';
    h += '<div class="kpis aidx-kpis">' + kpi('전체 응답', n + '<small>명</small>', '공통 5개 영역') + kpi('Agent 심화 응답', rows.filter(function(r){return r.adv;}).length + '<small>명</small>', '심화 2개 영역 · 별도 비교') + kpi('분석 가능한 영역', D.st.length + '<small>개</small>', '영역별 유효 응답 ' + MIN_N + '명 이상') + kpi('우선 교육 후보', priority.length + '<small>개 영역</small>', 'Borich·LFF 교차 확인') + '</div>';
    h += curriculumReport(A, D);
    h += '<div class="agn-domain-cards" data-report-domain-summary>' + data.domains.map(function (dm) {
      var x = D.st.filter(function (s) { return s.it.domain.id === dm.id; })[0];
      return '<article class="panel agn-domain-card' + (x && x.prio === 1 ? ' agn-priority' : '') + '"><span class="agn-module">' + moduleLabel(dm.module) + '</span><h3 class="panel-title">' + esc(dm.name) + '</h3><div class="agn-skill-tags">' + dm.skill_labels.map(function (label) { return '<span>' + esc(label) + '</span>'; }).join('') + '</div>' + (x ? '<div class="agn-domain-score"><strong>' + f2(x.borich) + '</strong><span>Borich · ' + priorityLabel(x) + '</span></div><p class="agn-domain-metrics">중요도 ' + f2(x.mI) + ' · 수행 ' + f2(x.mP) + ' · 차이 ' + f2(x.gap) + ' · n=' + x.n + '</p>' : '<p class="aidx-small">응답 부족으로 분석 대기</p>') + '<p class="agn-course"><strong>교육 주제</strong> ' + esc(dm.course) + '</p><p class="aidx-small">실습 결과물: ' + esc(dm.learning_output) + '</p><button type="button" class="aidx-btn" data-act="domain-detail" data-domain-id="' + dm.id + '">세부 기술 분석 보기</button></article>';
    }).join('') + '</div>';
    h += '<section class="report-grid">' + moduleRanks(D) + '</section><div class="panel"><h3 class="panel-title">7개 영역의 중요도와 수행수준</h3><p class="panel-sub">위 파란 막대: 중요도 · 아래 주황 막대: 수행수준 · 1~5점 · 각 영역의 세 기술 평균</p>' + pairedBars(D.st) + '</div>';
    h += overviewMatrices(D);
    h += '<section class="panel" id="agn-detail"><h2 class="aidx-h">영역별 세부 기술 분석</h2><div class="agn-filters" data-report-control><label class="agn-filter">분석할 영역 <select data-domain="1"><option value="all"' + (state.detailDomain === 'all' ? ' selected' : '') + '>전체 7개 영역</option>' + data.domains.map(function(dm) { return '<option value="' + dm.id + '"' + (state.detailDomain === dm.id ? ' selected' : '') + '>' + esc(dm.name) + '</option>'; }).join('') + '</select></label></div><p class="aidx-small">선택한 영역의 세부 분석을 표시합니다. 전체 7개 영역을 선택하면 모든 영역을 함께 확인하고 PDF로 저장할 수 있습니다.</p>' + data.domains.filter(function(dm) { return state.detailDomain === 'all' || state.detailDomain === dm.id; }).map(function(dm) { return domainDetail(A,dm); }).join('') + '</section>';
    h += '<div class="panel"><h3 class="panel-title">응답자 구성</h3><div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>분포</th></tr></thead><tbody>' + BG.slice(0,4).map(function(b,i) { var c={}; rows.forEach(function(r){c[r.bg[i]]=(c[r.bg[i]]||0)+1;}); return '<tr><td>' + b[1] + '</td><td>' + b[2].filter(function(o){return c[o[0]];}).map(function(o){return esc(o[1])+' '+c[o[0]]+'명';}).join(' · ') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    return h;
  }
  function compareReport() {
    var dimI = BG.map(function(b){return b[0];}).indexOf(state.dim), b=BG[dimI];
    var h = '<div class="agn-filters" data-report-control><label class="agn-filter">비교 기준 <select data-dim="1">' + BG.slice(0,4).map(function(x){return '<option value="'+x[0]+'"'+(x[0]===state.dim?' selected':'')+'>'+x[1]+'</option>';}).join('') + '</select></label></div><p class="aidx-context">' + b[1] + '별로 7개 영역의 교육 요구와 우선 세부 기술을 비교합니다. 영역별 유효 응답이 ' + MIN_GROUP + '명 이상인 경우만 표시합니다.</p>';
    var groups=b[2].filter(function(o){return o[0]!=='9';}).map(function(o){var rs=state.pool.filter(function(r){return r.bg[dimI]===Number(o[0]);});return {name:o[1],rs:rs,D:domainAnalysis(rs,MIN_GROUP),A:analyze(rs)};}).filter(function(g){return g.rs.length>=MIN_GROUP;});
    if(groups.length<2)return h+'<p class="aidx-note">비교하려면 두 구분 이상에서 각각 '+MIN_GROUP+'명 이상 응답해야 합니다.</p>';
    h += '<div class="panel"><h3 class="panel-title">7개 영역 교육 요구 지도</h3><p class="panel-sub">값은 중요도 − 수행수준입니다. 파란색이 진할수록 양수 차이가 크고, 주황색은 음수 차이입니다. 같은 −4~4점 기준을 적용합니다.</p><div class="agn-heat-legend"><span>수행 &gt; 중요도</span><i></i><span>중요도 &gt; 수행</span></div><div class="table-wrap"><table class="aidx-table agn-heatmap"><thead><tr><th>기술 영역</th>'+groups.map(function(g){return '<th>'+esc(g.name)+'<small>전체 '+g.rs.length+'명</small></th>';}).join('')+'</tr></thead><tbody>'+data.domains.map(function(dm){return '<tr><td>'+esc(dm.report_name)+'<small>'+moduleLabel(dm.module)+'</small></td>'+groups.map(function(g){var x=g.D&&g.D.st.filter(function(v){return v.it.domain.id===dm.id;})[0];if(!x)return '<td class="agn-heat-empty">응답 부족</td>';var alpha=(Math.abs(x.gap)/4*.5).toFixed(3),color=x.gap>=0?'38,113,194':'213,112,38';return '<td><div class="agn-heat-cell" style="background:rgba('+color+','+alpha+')"><strong>'+f2(x.gap)+'</strong>'+signedBar(x.gap,4)+'<small>n='+x.n+'</small></div></td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div></div>';
    h += '<section class="agn-group-cards">'+groups.map(function(g){return '<div class="panel"><h3 class="panel-title">'+esc(g.name)+' <span class="aidx-muted">'+g.rs.length+'명</span></h3>'+['공통','Agent 심화'].map(function(module){var eligible=g.A?g.A.st.filter(function(x){return x.n>=MIN_GROUP&&x.it.domain.module===module;}).map(function(x){return Object.assign({},x);}):[], A=classify(eligible), top=A?A.st.slice().sort(function(a,b){return a.rank-b.rank;}).slice(0,3):[];return '<h4 class="agn-group-sub">'+moduleLabel(module)+' · 우선 세부 기술</h4>'+(top.length?rankBars(top):'<p class="aidx-small">유효 응답 부족</p>');}).join('')+'</div>';}).join('')+'</section><p class="aidx-small">집단별 순위는 각 집단의 공통·심화 기술 안에서 따로 계산합니다. 적은 표본의 차이와 순위는 탐색적으로 해석하세요.</p>';
    return h;
  }
  function mineReport() {
    var me=state.pool.filter(function(r){return r.mine;})[0];
    if(!me)return '<section class="aidx-home"><p>이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p><div class="aidx-actions">'+cta('start','진단 시작',true)+cta('home','결과 코드 입력',false)+'</div></section>';
    var D=domainAnalysis([me],1), allD=domainAnalysis(state.pool,MIN_N), all=analyze(state.pool), avg={};if(all)all.st.forEach(function(x){avg[x.k]=x;});
    var h='<p class="aidx-context">나의 학습 요구 · '+bgLabel('major',me.bg[0])+' · '+bgLabel('year',me.bg[1])+'</p><section class="aidx-type"><h2>내가 먼저 배울 영역과 세부 기술</h2><p>중요하게 생각하지만 현재 수행하기 어려운 영역을 살펴보세요. 아래 차이는 나의 자기평가이며 객관적인 능력 점수가 아닙니다.</p></section>';
    if(!D)return h+'<p class="aidx-note">분석 가능한 응답이 없습니다.</p>';
    h+='<div class="panel"><h3 class="panel-title">나의 영역별 중요도와 수행수준</h3><p class="panel-sub">위 파란 막대: 중요도 · 아래 주황 막대: 수행수준 · 1~5점</p>'+pairedBars(D.st)+'</div><div class="agn-domain-cards">'+D.st.map(function(x){var dm=x.it.domain, peers=allD&&allD.st.filter(function(a){return a.it.domain.id===dm.id;})[0];var skills=items.filter(function(it){return it.domain.id===dm.id;});return '<div class="panel agn-domain-card"><span class="agn-module">'+moduleLabel(dm.module)+'</span><h3 class="panel-title">'+esc(dm.name)+'</h3><div class="agn-domain-score"><strong>'+f2(x.gap)+'</strong><span>나의 중요도 − 수행수준</span></div><p class="aidx-small">응답자 평균 차이 '+(peers?f2(peers.gap)+' (n='+peers.n+')':'분석 대기')+'</p><p class="agn-course">추천 학습: '+esc(dm.course)+'</p><div class="table-wrap"><table class="aidx-table"><thead><tr><th>세부 기술</th><th>중요도</th><th>수행</th><th>차이</th></tr></thead><tbody>'+skills.map(function(it){return '<tr><td>'+esc(it.label)+'</td><td>'+me.I[it.idx]+'</td><td>'+me.P[it.idx]+'</td><td>'+f2(me.I[it.idx]-me.P[it.idx])+'</td></tr>';}).join('')+'</tbody></table></div></div>';}).join('')+'</div>';
    return h;
  }

  function tabLabel(full, short) { return '<span class="aidx-tl">' + full + '</span><span class="aidx-ts">' + short + '</span>'; }
  function viewResult() {
    var tabs = [['all', '교육과정 우선순위', '교육 우선순위'], ['compare', '응답자 구분별 비교', '구분별 비교'], ['mine', '나의 학습 요구', '나의 학습']];
    root.innerHTML = previewNote() + (window.DiagnosisPdf ? window.DiagnosisPdf.toolbar() : '') +
      '<div class="aidx-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '">' + tabLabel(t[1], t[2]) + '</button>'; }).join('') + '</div>' +
      '<div role="tabpanel">' + (state.tab === 'all' ? allReport() : state.tab === 'compare' ? compareReport() : mineReport()) + '</div>' +
      '<p class="report-foot aidx-foot"><strong>개발안</strong>입니다. 7개 영역은 설문에 정의된 기술 영역이며 교육과정 설계를 위한 내용별 묶음입니다. 영역 점수는 해당 영역의 세 기술에 모두 응답한 학생의 평균으로 산출합니다. Borich = (중요도 평균 − 수행수준 평균) × 중요도 평균. 공통·Agent 심화는 순위와 기준선을 따로 산출하고, 영역 안 세부 분석은 해당 영역의 기술만으로 순위·IPA·LFF 기준선을 다시 계산합니다. 표시된 우선 후보는 Borich 상위 순위와 LFF HH가 겹치고 차이가 양수인 항목입니다. 자기보고 기반 결과이므로 교육 설계 시 수업 규정과 실제 과제 수행도 함께 검토하세요. <a href="#" data-act="home">처음으로</a></p>' ;
  }
  function openResults(tab) {
    state.tab = tab;
    viewSaving('응답을 모으고 있습니다');
    fetchPool().then(function (rows) {
      var me = state.me;
      if (me && me.row && !rows.some(function (r) { return r.mine; })) { var o = JSON.parse(JSON.stringify(me.row)); o.mine = true; rows.push(o); }
      state.pool = rows; state.view = 'result'; viewResult();
      window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 });
    }).catch(function () { root.innerHTML = '<section class="aidx-home"><p class="aidx-err">응답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p><div class="aidx-actions">' + cta('home','처음으로',true) + '</div></section>'; });
  }

  function render() {
    if (!data) return;
    if (state.view==='home') viewHome();
    else if (state.view==='guide') viewGuide();
    else if (state.view==='survey') viewSurvey();
    else if (state.view==='branch') viewBranch();
    else if (state.view==='advanced') viewAdvanced();
    else if (state.view==='result') viewResult();
  }
  function go(view) { state.view=view; render(); window.scrollTo({top:root.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'}); }
  function completePage(list) { return list.every(function(it){return state.answers[it.code+'_I']!=null && state.answers[it.code+'_P']!=null;}); }
  function finish() {
    var rec = record();
    viewSaving('응답을 저장하고 있습니다');
    submit(rec).then(function () {
      state.me = { id: rec.id, advanced: rec.advanced, row: fromRecord(rec) }; save(LS_ME, state.me);
      state.answers = {}; state.background = {}; state.pendingId = null;
      viewDone();
    }).catch(viewSaveError);
  }
  function nextPage() {
    var err=document.getElementById('aidx-err');
    if (state.view==='guide') {
      var required=['major','year','ai_frequency','agent_experience'];
      if (required.some(function(k){return state.background[k]==null;})) {err.textContent='응답자 배경 항목을 골라 주세요.';return;}
      if (!state.started) state.started = Date.now();
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
      if(state.advanced){state.page=PAGES.length;go('advanced');}else finish();return;
    }
    if (state.view==='advanced') {
      var idx=state.page-PAGES.length, list=ADVANCED_PAGES[idx];
      if(!completePage(list)){err.textContent='각 문항에서 중요도와 수행수준을 모두 골라 주세요.';list.forEach(function(it){if(state.answers[it.code+'_I']==null||state.answers[it.code+'_P']==null){var li=document.getElementById('q-'+it.code);if(li)li.classList.add('is-miss');}});return;}
      if(idx<ADVANCED_PAGES.length-1){state.page++;render();window.scrollTo(0,0);}else finish();
    }
  }
  root.addEventListener('change',function(e){
    var t=e.target;
    if (t.dataset.domain) { state.detailDomain = t.value; viewResult(); return; }
    if (t.dataset.filter) { state.filter[t.dataset.filter] = t.value; viewResult(); return; }
    if (t.dataset.dim) { state.dim = t.value; viewResult(); return; }
    if(t.type==='radio'){if(/_[IP]$/.test(t.name)){state.answers[t.name]=Number(t.value);var li=t.closest('.aidx-item');if(li)li.classList.remove('is-miss');}else state.background[t.name]=Number(t.value);}
  });
  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'agn-code') return;
    e.preventDefault();
    var v = document.getElementById('agn-code-in').value.toUpperCase().replace(/[^A-Z0-9]/g, ''), er = document.getElementById('agn-code-err');
    if (!/^[A-Z2-9]{8}$/.test(v)) { er.textContent = '8자리 결과 코드를 입력해 주세요.'; return; }
    er.textContent = '확인하는 중…';
    fetchOne(v).then(function (r) {
      if (!r) { er.textContent = '해당 코드의 응답을 찾지 못했습니다.'; return; }
      state.me = { id: r.id, advanced: r.row.adv, row: r.row }; save(LS_ME, state.me);
      openResults('mine');
    }).catch(function () { er.textContent = '확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; });
  });
  root.addEventListener('click',function(e){
    var b=e.target.closest('[data-act],[data-tab]');if(!b)return;
    if (b.dataset.tab) { state.tab = b.dataset.tab; viewResult(); return; }
    var a=b.dataset.act;
    if(a==='domain-detail'){state.detailDomain=b.dataset.domainId;viewResult();document.getElementById('agn-detail').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(a==='start'){state.page=-1;go('guide');}
    else if(a==='home')go('home');
    else if(a==='results')openResults('all');
    else if(a==='mine')openResults('mine');
    else if(a==='retry')finish();
    else if(a==='code'){var f=document.getElementById('agn-code');if(f){f.hidden=!f.hidden;if(!f.hidden)document.getElementById('agn-code-in').focus();}}
    else if(a==='pdf'&&window.DiagnosisPdf){window.DiagnosisPdf.save({root:root,button:b,title:'AI Agent 구축 및 활용에 대한 요구도 분석',code:state.me&&state.me.id});}
    else if(a==='prev'){if(state.view==='guide')go('home');else if(state.view==='survey'){if(state.page===0)go('guide');else{state.page--;render();window.scrollTo(0,0);}}else if(state.view==='branch'){state.page=PAGES.length-1;go('survey');}else if(state.view==='advanced'){if(state.page===PAGES.length)go('branch');else{state.page--;render();window.scrollTo(0,0);}}}
    else if(a==='next')nextPage();
  });
  loadData();
})();

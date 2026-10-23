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
  var data = null, items = [], state = { view: 'home', page: -1, answers: {}, background: {}, advanced: false, started: 0, tab: 'all', pool: null, me: load(LS_ME), filter: { major: '', year: '' }, dim: 'major' };
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
          var it = { code: dm.id + String(i + 1).padStart(2,'0'), number: n++, idx: items.length, domain: dm, text: pair[0], evidence: pair[1] };
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
    var aI = mean(st.map(function (x) { return x.mI; })), aP = mean(st.map(function (x) { return x.mP; })), aG = mean(st.map(function (x) { return x.gap; }));
    st.slice().sort(function (a, b) { return b.borich - a.borich; }).forEach(function (x, i) { x.rank = i + 1; });
    st.forEach(function (x) {
      x.lff = (x.mI >= aI ? 'H' : 'L') + (x.gap >= aG ? 'H' : 'L');
      x.ipa = x.mI >= aI ? (x.mP < aP ? '집중 개선' : '유지') : (x.mP < aP ? '낮은 우선' : '과잉');
    });
    var K = st.filter(function (x) { return x.lff === 'HH'; }).length;
    st.forEach(function (x) { var top = x.rank <= K, hh = x.lff === 'HH'; x.prio = top && hh ? 1 : (top || hh ? 2 : 0); });
    return { st: st, aI: aI, aP: aP, aG: aG, K: K };
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
    st.forEach(function (x) {
      var hi = x.prio === 1;
      g += '<g><title>' + esc(x.it.code + ' ' + x.it.text) + ' · ' + xLab + ' ' + f2(x[xKey]) + ' · ' + yLab + ' ' + f2(x[yKey]) + '</title><circle cx="' + sx(x[xKey]) + '" cy="' + sy(x[yKey]) + '" r="' + (hi ? 5.5 : 4) + '" fill="' + (hi ? 'var(--series-1)' : 'var(--series-2)') + '" stroke="var(--paper)" stroke-width="1.5"/>' +
        '<text x="' + (sx(x[xKey]) + 7) + '" y="' + (sy(x[yKey]) + 4) + '" font-size="10" font-weight="' + (hi ? 700 : 400) + '" fill="var(--ink)">' + x.it.code + '</text></g>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '" style="width:100%;height:auto">' + g + '</svg>';
  }
  function rankBars(st) {
    var list = st.slice().sort(function (a, b) { return a.rank - b.rank; }), mx = Math.max.apply(null, list.map(function (x) { return x.borich; }).concat([0.01]));
    return '<div class="aidx-hbars">' + list.map(function (x) {
      return '<div class="aidx-hrow' + (x.prio === 1 ? ' is-mine' : '') + '" title="' + esc(x.it.text) + '"><span class="aidx-hname">' + x.rank + '. ' + x.it.code + ' ' + esc(x.it.text.length > 16 ? x.it.text.slice(0, 16) + '…' : x.it.text) + '</span>' +
        '<span class="aidx-htrack"><span style="width:' + Math.max(0, x.borich) / mx * 100 + '%"></span></span><span class="aidx-hval">' + f2(x.borich) + (x.prio ? ' · ' + PRIO[x.prio] : '') + '</span></div>';
    }).join('') + '</div>';
  }
  function domainBars(rows) {
    var doms = data.domains;
    return '<div class="aidx-hbars">' + doms.map(function (dm) {
      var ks = items.filter(function (it) { return it.domain.id === dm.id; }).map(function (it) { return it.idx; });
      var I = [], P = [];
      rows.forEach(function (r) { ks.forEach(function (k) { if (r.I[k] != null && r.P[k] != null) { I.push(r.I[k]); P.push(r.P[k]); } }); });
      if (!I.length) return '';
      return '<div class="aidx-hrow"><span class="aidx-hname">' + dm.id + '. ' + esc(dm.name) + '</span><span class="aidx-htrack agn-two"><span style="width:' + mean(I) / 5 * 100 + '%"></span><i style="width:' + mean(P) / 5 * 100 + '%"></i></span><span class="aidx-hval">' + f2(mean(I)) + ' / ' + f2(mean(P)) + '</span></div>';
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
    return '<div class="agn-filters">' + sel('major', '전공 계열', BG[0][2]) + sel('year', '학년', BG[1][2]) + '</div>';
  }
  function allReport() {
    var rows = filtered(), n = rows.length, A = analyze(rows);
    var h = filterBar() + '<p class="aidx-context">' + (GROUP ? '그룹 ' + esc(GROUP) : '전체 응답자') + ' · 응답 ' + n + '명 (Agent 심화 응답 ' + rows.filter(function (r) { return r.adv; }).length + '명)' + (PREVIEW ? ' · 시험 모드: 이 브라우저의 응답만' : '') + '</p>';
    if (!A || n < MIN_N) return h + '<p class="aidx-note">응답이 ' + n + '명입니다. ' + MIN_N + '명 이상 모이면 요구도 분석결과가 나타납니다.</p>';
    var st = A.st, top = st.filter(function (x) { return x.prio === 1; }).sort(function (a, b) { return a.rank - b.rank; });
    var first = st.slice().sort(function (a, b) { return a.rank - b.rank; })[0];
    h += '<section class="aidx-type"><p class="aidx-eyebrow">요구도 분석 한 줄 요약</p><h2>' + (top.length ? '먼저 가르칠 기술 ' + top.length + '가지' : '최우선 기술 없음') + '</h2>' +
      (top.length ? '<p>Borich 요구도 상위 ' + A.K + '위 안에 들면서 Locus for Focus 오른쪽 위(HH)에 함께 든 기술입니다.</p><ol class="aidx-list">' + top.map(function (x) { return '<li><strong>' + x.it.code + '</strong> ' + esc(x.it.text) + ' <span class="aidx-muted">' + esc(x.it.domain.name) + ' · Borich ' + f2(x.borich) + '</span></li>'; }).join('') + '</ol>' : '<p>Borich 상위 순위와 LFF 오른쪽 위 사분면이 겹치는 기술이 아직 없습니다.</p>') + '</section>';
    h += '<div class="kpis aidx-kpis">' + kpi('응답자', n + '<small>명</small>', '심화 ' + rows.filter(function (r) { return r.adv; }).length + '명') +
      kpi('최우선 기술', top.length + '<small>개</small>', '차우선 ' + st.filter(function (x) { return x.prio === 2; }).length + '개') +
      kpi('요구도 1위', first.it.code, esc(first.it.domain.name) + ' · ' + f2(first.borich)) +
      kpi('평균 차이', f2(A.aG) + '<small>점</small>', '중요도 ' + f2(A.aI) + ' · 수행 ' + f2(A.aP)) + '</div>';
    h += '<div class="panel"><h3 class="panel-title">Borich 요구도 순위</h3><p class="panel-sub">(중요도 − 수행수준) 평균 × 중요도 평균 · 진한 막대 = 최우선</p>' + rankBars(st) + '</div>';
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">Locus for Focus</h3><p class="panel-sub">x 중요도 평균 · y 중요도 − 수행수준 · 점선 = 평균 · 오른쪽 위(HH)가 최우선 후보</p>' + scatter(st, 'mI', 'gap', '중요도 평균', '중요도 − 수행수준', A.aI, A.aG, ['HH', 'LH', 'LL', 'HL'], false, 'Locus for Focus') + '</div>' +
      '<div class="panel"><h3 class="panel-title">IPA 매트릭스</h3><p class="panel-sub">x 수행수준 평균 · y 중요도 평균 · 점선 = 평균 · 왼쪽 위가 집중 개선</p>' + scatter(st, 'mP', 'mI', '수행수준 평균', '중요도 평균', A.aP, A.aI, ['유지', '집중 개선', '낮은 우선', '과잉'], true, 'IPA 매트릭스') + '</div></section>';
    h += '<div class="panel"><h3 class="panel-title">문항별 요구도 분석표</h3><p class="panel-sub">t·p = 중요도와 수행수준의 대응표본 t 검정 · 순위 = Borich 순위</p><div class="table-wrap"><table class="aidx-table"><thead><tr><th>코드</th><th>기술</th><th>n</th><th>중요도</th><th>수행수준</th><th>차이</th><th>t</th><th>p</th><th>Borich</th><th>순위</th><th>LFF</th><th>IPA</th><th>우선순위</th></tr></thead><tbody>' +
      st.map(function (x) {
        return '<tr' + (x.prio === 1 ? ' class="aidx-mine-row"' : '') + '><td>' + x.it.code + '</td><td>' + esc(x.it.text) + '</td><td>' + x.n + '</td><td>' + f2(x.mI) + '</td><td>' + f2(x.mP) + '</td><td>' + f2(x.gap) + '</td><td>' + (x.t === null ? '–' : f2(x.t)) + '</td><td>' + (x.p === null ? '–' : fmtP(x.p) + (x.p < 0.05 ? '*' : '')) + '</td><td><strong>' + f2(x.borich) + '</strong></td><td>' + x.rank + '</td><td>' + x.lff + '</td><td>' + x.ipa + '</td><td>' + PRIO[x.prio] + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="aidx-small">* p &lt; .05. 공통 문항과 Agent 심화 문항은 응답자 수(n)가 다릅니다.</p></div>';
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">영역별 중요도와 수행수준</h3><p class="panel-sub">위 막대 중요도 · 아래 막대 수행수준 (1~5점)</p>' + domainBars(rows) + '</div>' +
      '<div class="panel"><h3 class="panel-title">영역과 연결된 교육 프로그램</h3><div class="table-wrap"><table class="aidx-table"><thead><tr><th>영역</th><th>프로그램</th><th>최우선 문항</th></tr></thead><tbody>' +
      data.domains.map(function (dm) {
        var pg = data.programs.filter(function (p) { return p[0] === dm.program; })[0] || [];
        var tops = st.filter(function (x) { return x.it.domain.id === dm.id && x.prio === 1; }).map(function (x) { return x.it.code; });
        return '<tr' + (tops.length ? ' class="aidx-mine-row"' : '') + '><td>' + dm.id + '. ' + esc(dm.name) + '</td><td>' + esc(pg[0] + ' ' + pg[1]) + ' <span class="aidx-muted">' + esc(pg[3] + ' · ' + pg[4]) + '</span></td><td>' + (tops.join(', ') || '–') + '</td></tr>';
      }).join('') + '</tbody></table></div></div></section>';
    h += '<div class="panel"><h3 class="panel-title">응답자 구성</h3><div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>분포</th></tr></thead><tbody>' +
      BG.slice(0, 4).map(function (b, i) {
        var c = {}; rows.forEach(function (r) { c[r.bg[i]] = (c[r.bg[i]] || 0) + 1; });
        return '<tr><td>' + b[1] + '</td><td>' + b[2].filter(function (o) { return c[o[0]]; }).map(function (o) { return esc(o[1]) + ' ' + c[o[0]] + '명'; }).join(' · ') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    return h;
  }
  function compareReport() {
    var rows = state.pool, dimI = BG.map(function (b) { return b[0]; }).indexOf(state.dim), b = BG[dimI];
    var h = '<div class="agn-filters"><label class="agn-filter">비교 기준 <select data-dim="1">' + BG.slice(0, 4).map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === state.dim ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="aidx-context">' + b[1] + '별로 응답자를 묶어 영역별 요구(중요도 − 수행수준)와 요구도 상위 기술을 비교합니다. ' + MIN_GROUP + '명 이상인 구분만 표시합니다.</p>';
    var groups = b[2].filter(function (o) { return o[0] !== '9'; }).map(function (o) { return { name: o[1], rs: rows.filter(function (r) { return r.bg[dimI] === Number(o[0]); }) }; }).filter(function (g) { return g.rs.length >= MIN_GROUP; });
    if (groups.length < 2) return h + '<p class="aidx-note">비교하려면 두 구분 이상에서 각각 ' + MIN_GROUP + '명 이상 응답해야 합니다.</p>';
    function gapOf(rs, dm) { var d = []; items.filter(function (it) { return it.domain.id === dm.id; }).forEach(function (it) { rs.forEach(function (r) { if (r.I[it.idx] != null && r.P[it.idx] != null) d.push(r.I[it.idx] - r.P[it.idx]); }); }); return d.length ? mean(d) : null; }
    h += '<div class="panel"><h3 class="panel-title">' + b[1] + '별 영역 요구(중요도 − 수행수준)</h3><p class="panel-sub">값이 클수록 배울 필요에 비해 아직 못하는 영역 · 영역마다 가장 큰 값 굵게</p><div class="table-wrap"><table class="aidx-table"><thead><tr><th>영역</th>' + groups.map(function (g) { return '<th>' + esc(g.name) + ' <span class="aidx-muted">n=' + g.rs.length + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      data.domains.map(function (dm) {
        var v = groups.map(function (g) { return gapOf(g.rs, dm); }), mx = Math.max.apply(null, v.filter(function (x) { return x !== null; }));
        return '<tr><td>' + dm.id + '. ' + esc(dm.name) + '</td>' + v.map(function (x) { return '<td>' + (x === null ? '–' : (x === mx ? '<strong>' + f2(x) + '</strong>' : f2(x))) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
    h += '<div class="panel"><h3 class="panel-title">' + b[1] + '별 Borich 요구도 상위 3개 기술</h3><div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>1위</th><th>2위</th><th>3위</th></tr></thead><tbody>' +
      groups.map(function (g) {
        var A = analyze(g.rs), tops = A ? A.st.slice().sort(function (x, y) { return x.rank - y.rank; }).slice(0, 3) : [];
        return '<tr><td>' + esc(g.name) + ' <span class="aidx-muted">n=' + g.rs.length + '</span></td>' + [0, 1, 2].map(function (i) { var x = tops[i]; return '<td>' + (x ? '<strong>' + x.it.code + '</strong> ' + esc(x.it.text.length > 18 ? x.it.text.slice(0, 18) + '…' : x.it.text) + ' <span class="aidx-muted">' + f2(x.borich) + '</span>' : '–') + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="aidx-small">구분별 응답 수가 적으면 순위가 쉽게 바뀝니다. 참고용으로 보세요.</p></div>';
    return h;
  }
  function mineReport() {
    var me = state.pool.filter(function (r) { return r.mine; })[0];
    if (!me) return '<section class="aidx-home"><p>이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p><div class="aidx-actions">' + cta('start','진단 시작',true) + cta('home','결과 코드 입력',false) + '</div></section>';
    var A = analyze(state.pool), avg = {}; if (A) A.st.forEach(function (x) { avg[x.k] = x; });
    var mine = items.map(function (it, k) { return me.I[k] == null ? null : { it: it, k: k, I: me.I[k], P: me.P[k], gap: me.I[k] - me.P[k] }; }).filter(Boolean);
    var top = mine.slice().sort(function (a, b) { return (b.gap - a.gap) || (b.I - a.I); }).slice(0, 5).filter(function (x) { return x.gap > 0; });
    var h = '<p class="aidx-context">나의 응답: ' + bgLabel('major', me.bg[0]) + ' · ' + bgLabel('year', me.bg[1]) + ' · AI 사용 ' + bgLabel('ai_frequency', me.bg[2]) + ' · Agent 경험 ' + bgLabel('agent_experience', me.bg[3]) + (state.me ? ' · 결과 코드 ' + fmtId(state.me.id) : '') + '</p>';
    h += '<section class="aidx-type"><p class="aidx-eyebrow">나에게 가장 필요한 기술</p><h2>' + (top.length ? '배울 필요에 비해 아직 어려운 기술 ' + top.length + '가지' : '중요도보다 수행수준이 낮은 기술이 없습니다') + '</h2>' +
      (top.length ? '<ol class="aidx-list">' + top.map(function (x) {
        var pg = data.programs.filter(function (p) { return p[0] === x.it.domain.program; })[0] || [];
        return '<li><strong>' + x.it.code + '</strong> ' + esc(x.it.text) + ' <span class="aidx-muted">중요도 ' + x.I + ' · 수행수준 ' + x.P + ' · 추천 ' + esc(pg[0] + ' ' + pg[1]) + '</span></li>'; }).join('') + '</ol>' : '') + '</section>';
    h += '<div class="panel"><h3 class="panel-title">문항별 나의 응답과 전체 평균</h3><p class="panel-sub">차이 = 중요도 − 수행수준 · 전체 = 모든 응답자 평균</p><div class="table-wrap"><table class="aidx-table"><thead><tr><th>코드</th><th>기술</th><th>나의 중요도</th><th>나의 수행수준</th><th>나의 차이</th><th>전체 차이</th></tr></thead><tbody>' +
      mine.map(function (x) { var a = avg[x.k]; return '<tr' + (top.indexOf(x) >= 0 ? ' class="aidx-mine-row"' : '') + '><td>' + x.it.code + '</td><td>' + esc(x.it.text) + '</td><td>' + x.I + '</td><td>' + x.P + '</td><td><strong>' + x.gap + '</strong></td><td>' + (a ? f2(a.gap) : '–') + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>';
    return h;
  }
  function tabLabel(full, short) { return '<span class="aidx-tl">' + full + '</span><span class="aidx-ts">' + short + '</span>'; }
  function viewResult() {
    var tabs = [['all', '요구도 분석결과', '요구도'], ['compare', '응답자 구분별 비교', '구분별'], ['mine', '나의 응답', '나의 응답']];
    root.innerHTML = previewNote() + (window.DiagnosisPdf ? window.DiagnosisPdf.toolbar() : '') +
      '<div class="aidx-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '">' + tabLabel(t[1], t[2]) + '</button>'; }).join('') + '</div>' +
      '<div role="tabpanel">' + (state.tab === 'all' ? allReport() : state.tab === 'compare' ? compareReport() : mineReport()) + '</div>' +
      '<p class="report-foot aidx-foot"><strong>개발안</strong>입니다. 요구도 = Σ(중요도 − 수행수준) × 중요도 평균 ÷ N(Borich). 최우선 = Borich 상위 순위(LFF 오른쪽 위 문항 수만큼)와 Locus for Focus 오른쪽 위에 함께 든 문항, 차우선 = 둘 중 하나에만 든 문항. 전문가 검토와 예비조사 전이므로 결과는 참고용입니다. ' +
      '<button type="button" class="aidx-link" data-act="home">처음으로</button></p>';
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

// 스타벅스 AI 기본 역량 진단(매장용·본사용) 공통: 응답 저장, 결과 코드, 실제 응답으로 계산한 결과, 결과 코드로 다시 보기, 결과지 PDF.
// 페이지(in-progress/starbucks-ai-store, starbucks-ai-hq)의 인라인 스크립트가 만든 track·config·qs·state·roleLabels·show를 그대로 쓴다.
// 응답 저장소: Google Apps Script 웹앱 하나(tools/starbucks-ai/), 매장용·본사용은 시트 안에서 탭(store, hq)으로 나뉜다.
(function () {
  var ENDPOINT = ''; // 비어 있으면 시험 모드: 이 브라우저에만 저장
  var PREVIEW = !ENDPOINT;
  var TRACK = track, CFG = config, QS = qs;
  var LS_ME = 'sbx-v1-' + TRACK + '-me' + (PREVIEW ? '-test' : ''), LS_DATA = 'sbx-v1-' + TRACK + '-test-responses';
  var MIN_N = 5, MIN_G = 3; // 교육 요구도·백분위는 5명, 직무·직급 비교는 3명부터
  var K = 4, AREAS = []; // 영역 6개 × 4문항
  for (var i = 0; i < QS.length; i += K) AREAS.push(QS[i][0]);
  var NAME = TRACK === 'store' ? '매장용' : '본사용';

  // 영역별 다음 행동(제목, 설명)과 교육 포인트. 영역 순서는 두 진단이 같다.
  var ACTIONS = [
    ['AI에 맡기기 전에 사람이 판단할 부분을 한 줄로 적기', '고객·안전·품질에 영향이 큰 일은 AI 결과를 초안으로만 쓰는 기준을 정해 보세요.'],
    ['요청할 때 목적·상황·원하는 형식 세 가지를 꼭 적기', '자주 하는 요청 하나를 템플릿으로 저장하고, 다음에는 고쳐 쓰는 데서 시작하세요.'],
    ['AI가 정리한 내용에서 사실과 추정을 나눠 표시하기', '공지·매뉴얼·원자료 같은 공식 자료와 한 번 대조하는 습관을 들이세요.'],
    ['AI 답변을 바로 쓰지 말고 근거 한 줄 남기기', '수치와 계산은 원자료나 다른 방법으로 한 번 더 확인하고, 확인한 기준을 함께 기록해 보세요.'],
    ['효과가 있었던 AI 활용법 하나를 동료와 공유하기', '반복 업무 하나를 AI와 사람이 맡을 단계로 나누고, 사람이 확인할 지점을 정해 보세요.'],
    ['AI 입력 전 개인정보·내부정보 지우기를 체크리스트로 만들기', '승인된 AI 도구와 회사 사용 기준을 다시 확인하고 허용된 범위에서만 쓰세요.']
  ];
  var EDU = ['AI 활용 적합성 판단과 역할 구분', '요청문 작성과 반복 업무 템플릿', '자료 요약·데이터 해석과 공식 자료 대조', '사실·수치·근거 검증과 결과 수정', 'AI 활용 사례 공유와 업무 재설계', '개인정보·내부정보 보호와 승인 기준'];
  var WHEN = ['이번 주', '이번 달', '분기 내'];

  // ---------- 유틸 ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function signed1(v) { var r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toFixed(1); }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
  function newId() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = ''; crypto.getRandomValues(b); for (var i = 0; i < 8; i++) s += A[b[i] % A.length]; return s; }
  function fmtId(id) { return id.slice(0, 4) + '-' + id.slice(4); }
  function areaMeans(a) { return AREAS.map(function (_, d) { return mean(a.slice(d * K, d * K + K)); }); }
  function total(a) { return mean(a); }
  function score100(m) { return Math.round((m - 1) / 4 * 100); }
  function call(url, opts) {
    var ctl = window.AbortController ? new AbortController() : null, o = opts || {};
    if (ctl) { o.signal = ctl.signal; setTimeout(function () { ctl.abort(); }, 25000); }
    return fetch(url, o).then(function (r) { return r.json(); });
  }

  // ---------- 저장·불러오기 ----------
  function submit(rec) {
    if (PREVIEW) { var rows = load(LS_DATA) || []; rows.push(rec); save(LS_DATA, rows); return Promise.resolve(); }
    return call(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) })
      .then(function (j) { if (!j.ok && j.error !== 'duplicate') throw new Error(j.error || '저장 실패'); });
  }
  function fetchAll(me) {
    if (PREVIEW) return Promise.resolve((load(LS_DATA) || []).map(function (r) { return { role: r.role, job: r.job, a: r.answers, mine: !!(me && r.id === me.id) }; }));
    return call(ENDPOINT + '?action=all&track=' + TRACK + (me ? '&me=' + me.id : '')).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return j.rows.map(function (r) { return { role: r.r, job: r.j, a: r.a, mine: !!r.m }; });
    });
  }
  function fetchOne(id) {
    if (PREVIEW) return Promise.resolve((load(LS_DATA) || []).filter(function (r) { return r.id === id; })[0] || null);
    return call(ENDPOINT + '?action=one&track=' + TRACK + '&id=' + id).then(function (j) { return j.ok ? j.row : null; });
  }

  // ---------- 화면 보조 스타일 ----------
  var css = document.createElement('style');
  css.textContent = '.sbx-code{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;font-size:13px;color:#cfebdd}' +
    '.sbx-code code{font:700 20px ui-monospace,monospace;letter-spacing:.08em;color:#fff;background:rgba(255,255,255,.12);border-radius:6px;padding:2px 10px}' +
    '.sbx-copy{border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700}' +
    '.sbx-copy.done{background:#fff;color:#004f39}.sbx-msg{font-size:12px;color:var(--red);margin-top:8px;min-height:1em}' +
    '.sbx-lookup{margin-top:14px;font-size:13px}.sbx-lookup button.link{border:0;background:none;color:var(--green-dark);text-decoration:underline;padding:0}' +
    '.sbx-lookup form{display:none;gap:8px;justify-content:center;align-items:center;margin-top:10px;flex-wrap:wrap}.sbx-lookup form.open{display:flex}' +
    '.sbx-lookup input{font:15px ui-monospace,monospace;width:130px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;text-transform:uppercase}' +
    '.sbx-empty{font-size:12px;color:var(--muted);line-height:1.6;padding:14px;background:#f7faf7;border-radius:11px}' +
    '.compare .col span{display:block;font-weight:700;color:var(--ink);font-size:12px;margin-bottom:4px}.compare .col.na i{background:#eef1ef}' +
    '.pill{white-space:nowrap;flex:none}.result-footer .btns{display:flex;gap:9px;flex-wrap:wrap}.gap .left span:last-child{line-height:1.45}' +
    // 결과 격자가 내용 폭에 밀려 휴대폰 화면 밖으로 나가지 않게
    '.result-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}.result-card{min-width:0}.compare .col{flex:1;width:auto;min-width:0}' +
    '@media(max-width:850px){.result-grid{grid-template-columns:minmax(0,1fr)}}' +
    '@media(max-width:520px){.compare{gap:8px;padding:16px 8px 8px}.compare .col{font-size:10.5px}.priority-table{display:block;overflow-x:auto;white-space:nowrap}' +
    '.results-hero{flex-direction:column}.bar-row{grid-template-columns:96px 1fr 30px}.action{grid-template-columns:24px 1fr}.action .owner{grid-column:2;justify-self:start}}';
  document.head.appendChild(css);

  // 대문: 결과 코드로 다시 보기
  var card = document.querySelector('.home-card');
  if (card) {
    var lk = document.createElement('div'); lk.className = 'sbx-lookup';
    lk.innerHTML = '<button type="button" class="link" id="sbx-open-code">이미 진단했다면 결과 코드로 내 결과 다시 보기</button>' +
      '<form id="sbx-code-form"><input id="sbx-code-in" maxlength="9" placeholder="XXXX-XXXX" autocomplete="off"><button class="btn btn-green" type="submit">결과 보기</button><span class="sbx-msg" id="sbx-code-msg"></span></form>';
    card.appendChild(lk);
    document.getElementById('sbx-open-code').onclick = function () { document.getElementById('sbx-code-form').classList.add('open'); document.getElementById('sbx-code-in').focus(); };
    document.getElementById('sbx-code-form').onsubmit = function (e) {
      e.preventDefault();
      var id = document.getElementById('sbx-code-in').value.toUpperCase().replace(/[^A-Z0-9]/g, ''), msg = document.getElementById('sbx-code-msg');
      if (id.length !== 8) { msg.textContent = '코드 8자리를 입력해 주세요.'; return; }
      msg.textContent = '찾는 중…';
      fetchOne(id).then(function (r) {
        if (!r) { msg.textContent = '해당 코드의 응답이 없습니다.'; return; }
        var me = { id: r.id, role: r.role, job: r.job, exp: r.exp, answers: r.answers || r.a };
        save(LS_ME, me); msg.textContent = ''; analyze(me);
      }).catch(function () { msg.textContent = '불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; });
    };
  }

  // ---------- 제출 → 분석 ----------
  var pending = null, started = Date.now();
  document.getElementById('start-survey').addEventListener('click', function () { pending = null; started = Date.now(); });
  window.sbxFinish = function () {
    var btn = document.getElementById('next-q'), old = btn.textContent;
    var rec = pending || { id: newId(), track: TRACK, role: state.role, job: state.job, exp: state.exp, answers: state.answers.slice(), seconds: Math.round((Date.now() - started) / 1000) };
    pending = rec; btn.disabled = true; btn.textContent = '저장하는 중…';
    submit(rec).then(function () {
      pending = null; save(LS_ME, rec); btn.disabled = false; btn.textContent = old; analyze(rec);
    }).catch(function () { btn.disabled = false; btn.textContent = old; alert('응답을 저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요.'); });
  };
  function analyze(me) {
    var box = document.getElementById('sbx-results');
    box.innerHTML = '<div class="result-card" style="text-align:center;padding:60px 20px">결과를 분석하고 있습니다…</div>';
    show('results');
    fetchAll(me).then(function (rows) {
      if (!rows.some(function (r) { return r.mine; })) rows.push({ role: me.role, job: me.job, a: me.answers, mine: true });
      render(me, rows);
    }).catch(function () { box.innerHTML = '<div class="result-card">응답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</div>'; });
  }

  // ---------- 결과 ----------
  var model = null;
  function render(me, rows) {
    var a = me.answers, am = areaMeans(a), tot = total(a), sc = score100(tot);
    var cmp = [
      { k: '나', rs: [{ a: a }], me: true },
      { k: '동일 직무', rs: rows.filter(function (r) { return r.job === me.job; }) },
      { k: '동일 직급', rs: rows.filter(function (r) { return r.role === me.role; }) },
      { k: NAME + ' 전체', rs: rows }
    ].map(function (c) { c.n = c.rs.length; c.v = c.n ? mean(c.rs.map(function (r) { return total(r.a); })) : null; c.ok = c.me || c.n >= MIN_G; return c; });
    var allAm = AREAS.map(function (_, d) { return mean(rows.map(function (r) { return mean(r.a.slice(d * K, d * K + K)); })); });
    var diffs = AREAS.map(function (n, d) { return { n: n, d: am[d] - allAm[d] }; });
    var lowD = diffs.slice().sort(function (x, y) { return x.d - y.d; })[0], highD = diffs.slice().sort(function (x, y) { return y.d - x.d; })[0];
    var items = a.map(function (v, i) { return { i: i, v: v }; });
    var strong = items.slice().sort(function (x, y) { return y.v - x.v || x.i - y.i; }).slice(0, 2);
    var weak = items.slice().sort(function (x, y) { return x.v - y.v || x.i - y.i; }).slice(0, 2);
    var low3 = am.map(function (v, d) { return { d: d, v: v }; }).sort(function (x, y) { return x.v - y.v; }).slice(0, 3);
    // 주황 막대: 가장 낮은 영역과 3.0점 미만인 영역
    var weakSet = am.map(function (v, d) { return d; }).filter(function (d) { return d === low3[0].d || am[d] < 3; });
    var edu = rows.length >= MIN_N ? AREAS.map(function (n, d) {
      var vals = []; rows.forEach(function (r) { vals = vals.concat(r.a.slice(d * K, d * K + K)); });
      var low = vals.filter(function (v) { return v <= 2; }).length / vals.length;
      return { d: d, m: mean(vals), low: low, need: (5 - mean(vals)) + 2 * low };
    }).sort(function (x, y) { return y.need - x.need; }).slice(0, 3) : null;
    model = { me: me, am: am, tot: tot, sc: sc, cmp: cmp, diffs: diffs, lowD: lowD, highD: highD, strong: strong, weak: weak, low3: low3, edu: edu, n: rows.length };

    var maxV = 5, h = '';
    h += '<div class="results-hero"><div><div class="eyebrow">MY STARBUCKS AI SNAPSHOT</div><h1>나의 AI 활용 프로필 (' + NAME + ')</h1>' +
      '<p>' + esc(roleLabels[me.role] || me.role) + ' · ' + esc(me.job) + ' / ' + esc(CFG.title) + '</p>' +
      '<div class="sbx-code">결과 코드 <code>' + fmtId(me.id) + '</code><button type="button" class="sbx-copy" data-code="' + fmtId(me.id) + '">복사</button><span>다른 기기에서 결과를 다시 볼 때 필요합니다</span></div></div>' +
      '<div class="score-ring" style="background:conic-gradient(#f4bd50 0 ' + sc + '%,rgba(255,255,255,.18) ' + sc + '% 100%)"><div><strong>' + sc + '</strong><small>종합 점수</small></div></div></div>';
    h += '<div class="result-grid">';
    h += '<article class="result-card"><h3>나의 역량 프로필</h3><p class="sub">6개 영역별 평균 · 5점 만점</p><div class="bars">' + AREAS.map(function (n, d) {
      return '<div class="bar-row"><span>' + esc(n) + '</span><div class="bar"><i style="width:' + (am[d] / maxV * 100) + '%' + (weakSet.indexOf(d) >= 0 ? ';background:var(--amber)' : '') + '"></i></div><em>' + f1(am[d]) + '</em></div>';
    }).join('') + '</div></article>';
    h += '<article class="result-card"><h3>강점과 보완점</h3><p class="sub">내가 가장 잘하는 행동과 가장 덜 하는 행동</p><div class="gap-list">' +
      strong.map(function (x) { return '<div class="gap"><div class="left"><span class="pill good">강점</span><span>' + esc(QS[x.i][1]) + '</span></div><strong>' + x.v + '</strong></div>'; }).join('') +
      weak.map(function (x) { return '<div class="gap"><div class="left"><span class="pill">보완</span><span>' + esc(QS[x.i][1]) + '</span></div><strong>' + x.v + '</strong></div>'; }).join('') + '</div></article>';
    h += '<article class="result-card"><h3>나와 스타벅스 전체의 차이</h3><p class="sub">동일 직무·직급과 ' + NAME + ' 전체 응답(' + rows.length + '명)의 평균 비교 · 5점 만점</p><div class="compare">' +
      cmp.map(function (c) {
        return '<div class="col' + (c.me ? ' me' : '') + (c.ok ? '' : ' na') + '"><span>' + (c.ok ? f1(c.v) : '–') + '</span><i style="height:' + (c.ok ? Math.round(c.v / 5 * 120) : 20) + 'px"></i>' + c.k + '<br><small>' + (c.me ? '' : c.n + '명') + '</small></div>';
      }).join('') + '</div>' +
      '<p class="note" style="margin-top:14px">' + (rows.length < 2 ? '아직 비교할 응답이 없습니다. 응답이 모이면 자동으로 비교됩니다.'
        : NAME + ' 전체보다 ‘' + esc(lowD.n) + '’은 ' + f1(Math.abs(lowD.d)) + '점 ' + (lowD.d < 0 ? '낮고' : '높고') + ', ‘' + esc(highD.n) + '’은 ' + f1(Math.abs(highD.d)) + '점 ' + (highD.d >= 0 ? '높습니다.' : '낮습니다.') +
          ' 직무·직급 비교는 응답이 ' + MIN_G + '명 이상일 때 표시합니다.') + '</p></article>';
    h += '<article class="result-card"><h3>내가 다음에 할 일</h3><p class="sub">점수가 낮은 영역부터 우선순위 3가지</p>' + low3.map(function (x, i) {
      return '<div class="action"><span class="check">' + (i + 1) + '</span><div><strong>' + ACTIONS[x.d][0] + '</strong><p>' + esc(AREAS[x.d]) + ' ' + f1(x.v) + '점 · ' + ACTIONS[x.d][1] + '</p></div><span class="owner">' + WHEN[i] + '</span></div>';
    }).join('') + '</article>';
    h += '<article class="result-card wide"><h3>교육팀을 위한 요구도 분석 · 우선순위</h3><p class="sub">' + NAME + ' 응답 전체의 영역 평균(낮을수록)과 1~2점 응답 비율(높을수록)을 합친 교육 후보</p>' +
      (edu ? '<table class="priority-table"><thead><tr><th>우선</th><th>교육 주제</th><th>교육 포인트</th><th>평균 · 미흡 비율</th><th>요구도</th></tr></thead><tbody>' +
        edu.map(function (x, i) { return '<tr><td>P' + (i + 1) + '</td><td>' + esc(AREAS[x.d]) + '</td><td>' + EDU[x.d] + '</td><td>' + f1(x.m) + ' · ' + Math.round(x.low * 100) + '%</td><td>' + f1(x.need) + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<p class="sbx-empty">' + NAME + ' 응답이 ' + MIN_N + '명 이상 모이면 영역별 교육 우선순위가 표시됩니다. (현재 ' + rows.length + '명)</p>') + '</article>';
    h += '<article class="result-card wide"><h3>조직이 지원하면 좋은 것</h3>' + [
      ['직무별 검증된 프롬프트 라이브러리', '매장과 본사의 각 직무가 바로 적용하되, 반드시 확인할 항목까지 포함합니다.'],
      ['업무 데이터 입력 기준과 안전 가이드', '무엇을 입력해도 되는지, 언제 사람의 승인이 필요한지 한 장으로 안내합니다.'],
      ['직무 사례를 활용한 짧은 실습', '공통 기초 뒤에 직무별 마이크로러닝을 제공합니다.'],
      ['리더의 사용 시간과 공유 장치', '리더가 먼저 적용하고 정기 회의에서 한 가지 사례를 나누는 구조를 만듭니다.']
    ].map(function (x, i) { return '<div class="insight"><span class="num">0' + (i + 1) + '</span><div><strong>' + x[0] + '</strong><p>' + x[1] + '</p></div></div>'; }).join('') + '</article>';
    h += '</div><div class="result-footer"><p class="note">본 결과는 자기보고 응답을 바탕으로 한 개인화된 학습 안내입니다. BETA 버전으로, 비교 결과는 응답이 쌓일수록 정확해집니다.</p>' +
      '<div class="btns"><button type="button" class="btn btn-green" id="sbx-pdf">⬇ 결과지 PDF 다운로드</button><button type="button" class="btn btn-outline" id="sbx-again">다시 진단하기</button></div></div><p class="sbx-msg" id="sbx-pdf-msg"></p>';
    var box = document.getElementById('sbx-results');
    box.innerHTML = h;
    box.querySelector('.sbx-copy').onclick = function (e) {
      var b = e.currentTarget, code = b.dataset.code;
      var ok = function () { b.textContent = '복사했습니다'; b.classList.add('done'); setTimeout(function () { b.textContent = '복사'; b.classList.remove('done'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, function () { prompt('결과 코드를 복사하세요', code); }); else prompt('결과 코드를 복사하세요', code);
    };
    document.getElementById('sbx-again').onclick = function () { show('intro'); };
    document.getElementById('sbx-pdf').onclick = function (e) { downloadPdf(e.currentTarget); };
  }
  var results = document.getElementById('results');
  results.innerHTML = '<div id="sbx-results"></div>';

  // ---------- 결과지 PDF (연구실 의견서 양식, A4 쪽 나눔) ----------
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var PW = 680, PH = 990;
  function loadScript(src, ready) { return new Promise(function (ok, fail) { if (ready()) return ok(); var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); }); }
  function loadFonts() {
    if (!document.getElementById('sbx-rep-font')) {
      var l = document.createElement('link'); l.id = 'sbx-rep-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&family=Noto+Sans+KR:wght@500;700&display=block';
      document.head.appendChild(l);
    }
    return document.fonts && document.fonts.load ? Promise.all([document.fonts.load('400 14px "Noto Serif KR"', '가'), document.fonts.load('700 14px "Noto Sans KR"', '가')]).catch(function () {}) : Promise.resolve();
  }
  function repHtml(M) {
    var me = M.me, now = new Date(), date = now.getFullYear() + '. ' + (now.getMonth() + 1) + '. ' + now.getDate() + '.';
    var sans = '"Noto Sans KR","Apple SD Gothic Neo",sans-serif';
    var s = '<style>.rep{width:' + PW + 'px;color:#222;font-family:"Noto Serif KR","AppleMyungjo",serif;font-size:13.5px;line-height:1.75;word-break:keep-all;background:#fff}' +
      '.rep *{box-sizing:border-box;margin:0}.rep .hd{border-top:3px solid #222;padding-top:26px;text-align:center}' +
      '.rep h1{font-family:' + sans + ';font-size:24px;font-weight:700;letter-spacing:-.02em}.rep .beta{display:inline-block;vertical-align:5px;margin-left:8px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#00704a;border:1.5px solid #00704a;border-radius:4px;padding:0 6px;line-height:1.6}' +
      '.rep .sub{font-family:' + sans + ';font-size:12.5px;color:#444;margin-top:12px;padding-bottom:16px;border-bottom:1px solid #222}.rep .date{text-align:right;font-size:12.5px;color:#444;margin:12px 0 6px}' +
      '.rep h2{font-family:' + sans + ';font-size:17px;font-weight:700;margin:26px 0 12px;padding-bottom:7px;border-bottom:1px solid #222}' +
      '.rep p.b{padding-left:1.2em;text-indent:-1.2em;margin:4px 0}.rep p.c{padding-left:2.4em;text-indent:-1.2em;margin:2px 0}.rep strong{font-weight:600}' +
      '.rep .cap{text-align:center;font-family:' + sans + ';font-weight:700;font-size:12.5px;margin:14px 0 6px}.rep table{width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.5}' +
      '.rep th{background:#f1f1f1;font-family:' + sans + ';font-weight:600;border-top:1.5px solid #222;border-bottom:1px solid #999;padding:6px;text-align:center}.rep td{border-bottom:1px solid #d4d4d4;padding:6px;text-align:center}' +
      '.rep td:first-child{text-align:left;font-weight:600}.rep tr:last-child td{border-bottom:1.5px solid #222}.rep .note{margin-top:22px;padding-top:10px;border-top:1px solid #999;font-size:11.5px;color:#555}</style>';
    var h = s + '<div class="rep"><div class="hd"><h1>' + esc(CFG.title) + ' 결과지<span class="beta">BETA</span></h1>' +
      '<p class="sub">결과 코드 ' + fmtId(me.id) + ' · ' + esc(roleLabels[me.role] || me.role) + ' · ' + esc(me.job) + '</p></div><p class="date">' + date + '</p>';
    h += '<h2>Ⅰ. 진단 개요</h2><p class="b">□ 진단 목적: 업무에서 AI를 판단하고, 활용하고, 결과를 검증하며 책임 있게 쓰는 행동을 진단함</p>' +
      '<p class="b">□ 진단 구성: 6개 영역 × 4문항 = 24문항, 5점 척도(1 전혀 그렇지 않다 ~ 5 매우 그렇다)</p>' +
      '<p class="b">□ 비교 집단: ' + NAME + ' 전체 응답 ' + M.n + '명 (직무·직급 비교는 ' + MIN_G + '명 이상일 때)</p>' +
      '<p class="b">□ 종합 점수: 24문항 평균을 0~100점으로 환산 = <strong>' + M.sc + '점</strong> (평균 ' + f1(M.tot) + '점 / 5점)</p>';
    h += '<h2>Ⅱ. 영역별 결과</h2><div><p class="cap">&lt;표 1&gt; 영역별 평균과 ' + NAME + ' 전체 비교 (5점 만점)</p><table><thead><tr><th>영역</th><th>나</th><th>' + NAME + ' 전체</th><th>차이</th></tr></thead><tbody>' +
      AREAS.map(function (n, d) { return '<tr><td>' + esc(n) + '</td><td><strong>' + f1(M.am[d]) + '</strong></td><td>' + f1(M.am[d] - M.diffs[d].d) + '</td><td>' + signed1(M.diffs[d].d) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div><p class="cap">&lt;표 2&gt; 종합 평균 비교 (5점 만점)</p><table><thead><tr>' + M.cmp.map(function (c) { return '<th>' + c.k + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
      M.cmp.map(function (c) { return '<td>' + (c.ok ? f1(c.v) : '–') + (c.me ? '' : ' <span style="color:#777">(' + c.n + '명)</span>') + '</td>'; }).join('') + '</tr></tbody></table></div>';
    h += '<h2>Ⅲ. 강점과 보완점</h2><p class="b">□ 강점</p>' + M.strong.map(function (x) { return '<p class="c">○ ' + esc(QS[x.i][1]) + ' (' + x.v + '점)</p>'; }).join('') +
      '<p class="b">□ 보완점</p>' + M.weak.map(function (x) { return '<p class="c">○ ' + esc(QS[x.i][1]) + ' (' + x.v + '점)</p>'; }).join('') +
      (M.n >= 2 ? '<p class="b">□ ' + NAME + ' 전체와의 차이: ‘' + esc(M.lowD.n) + '’ ' + signed1(M.lowD.d) + '점, ‘' + esc(M.highD.n) + '’ ' + signed1(M.highD.d) + '점</p>' : '');
    h += '<h2>Ⅳ. 다음에 할 일 (우선순위 3가지)</h2>' + M.low3.map(function (x, i) {
      return '<div><p class="b">□ ' + (i + 1) + '. ' + ACTIONS[x.d][0] + ' (' + WHEN[i] + ')</p><p class="c">○ ' + esc(AREAS[x.d]) + ' ' + f1(x.v) + '점: ' + ACTIONS[x.d][1] + '</p></div>';
    }).join('');
    if (M.edu) h += '<h2>Ⅴ. 교육 요구도 (' + NAME + ' 전체)</h2>' + M.edu.map(function (x, i) { return '<p class="b">□ P' + (i + 1) + '. ' + esc(AREAS[x.d]) + ': ' + EDU[x.d] + ' (평균 ' + f1(x.m) + ', 미흡 비율 ' + Math.round(x.low * 100) + '%)</p>'; }).join('');
    h += '<p class="note">※ 본 결과는 자기보고 응답을 바탕으로 한 개인화된 학습 안내이며 BETA 버전입니다.<br>※ PRO AnalytiX Lab, 한양대학교 · hrdpro.hanyang.ac.kr/in-progress/starbucks-ai-' + TRACK + '/</p></div>';
    return h;
  }
  function paginate(rep) {
    var blocks = Array.prototype.slice.call(rep.children), pages = [], cur = [], start = 0;
    blocks.forEach(function (el) {
      var bottom = el.offsetTop + el.offsetHeight;
      if (cur.length && bottom - start > PH) {
        var carry = [];
        while (cur.length > 1 && /^H2$/.test(cur[cur.length - 1].tagName)) carry.unshift(cur.pop());
        pages.push(cur); cur = carry; start = (carry[0] || el).offsetTop;
      }
      if (!cur.length && !pages.length) start = el.offsetTop - (parseFloat(getComputedStyle(el).marginTop) || 0);
      cur.push(el);
    });
    if (cur.length) pages.push(cur);
    return pages;
  }
  function downloadPdf(btn) {
    var msg = document.getElementById('sbx-pdf-msg'), host;
    if (!model) return;
    btn.disabled = true; msg.textContent = 'PDF를 만드는 중…'; msg.style.color = 'var(--muted)';
    Promise.all([loadScript(H2C, function () { return !!window.html2canvas; }), loadScript(JSPDF, function () { return !!(window.jspdf && window.jspdf.jsPDF); }), loadFonts()]).then(function () {
      host = document.createElement('div'); host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + PW + 'px;background:#fff';
      host.innerHTML = repHtml(model); document.body.appendChild(host);
      var pages = paginate(host.querySelector('.rep')), pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }), chain = Promise.resolve();
      pages.forEach(function (blocks, i) {
        chain = chain.then(function () {
          var page = document.createElement('div'); page.className = 'rep';
          page.style.cssText = 'width:' + PW + 'px;height:' + PH + 'px;overflow:hidden;background:#fff';
          blocks.forEach(function (el, k) { var c = el.cloneNode(true); if (k === 0) c.style.marginTop = '0'; page.appendChild(c); });
          host.appendChild(page);
          return window.html2canvas(page, { scale: 2, backgroundColor: '#ffffff', logging: false }).then(function (cv) {
            if (i) pdf.addPage();
            pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 15, 16, 180, 180 * PH / PW);
            pdf.setFontSize(9); pdf.setTextColor(90); pdf.text('- ' + (i + 1) + ' -', 105, 289, { align: 'center' });
            host.removeChild(page);
          });
        });
      });
      return chain.then(function () { pdf.save('스타벅스AI기본역량진단_' + NAME + '_결과지_' + fmtId(model.me.id) + '.pdf'); });
    }).then(function () { msg.textContent = ''; btn.disabled = false; })
      .catch(function () { msg.textContent = 'PDF를 만들지 못했습니다. 잠시 뒤 다시 눌러 주세요.'; msg.style.color = 'var(--red)'; btn.disabled = false; })
      .then(function () { if (host && host.parentNode) host.parentNode.removeChild(host); });
  }

  if (PREVIEW) {
    var note = document.createElement('p');
    note.style.cssText = 'margin:0 auto 18px;max-width:1040px;padding:8px 14px;border-radius:8px;background:#edf6f0;color:#004f39;font-size:13px';
    note.textContent = '시험 모드: 응답 저장소가 아직 연결되지 않아, 응답이 이 브라우저에만 저장됩니다.';
    var intro = document.getElementById('intro'); intro.parentNode.insertBefore(note, intro);
  }
})();

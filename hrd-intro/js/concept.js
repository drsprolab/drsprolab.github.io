/* Conceptualization: 1주차 나만의 HRD 개념 정립 (질문-대답 활동).
 * 지금은 단계마다 정해 둔 질문(script)을 차례로 묻는다.
 * Claude를 연동할 때는 ASK_URL에 중계 서버(Apps Script 등) 주소를 넣는다. API 키는 이 파일에 두지 않는다.
 *   요청: POST { harness, step, goal, question, guide, history:[{role:'ai'|'me', text}] }  (중계 코드: hrd-intro-backend/Concept.gs)
 *   응답: { question, label, done }  — done이 true면 그 단계를 마친다.
 * 답은 이 브라우저(localStorage)에만 저장한다. 1단계 답은 고치지 않고 남겨 9단계 성찰에서 다시 쓴다. */
(function () {
  'use strict';
  var ASK_URL = 'https://script.google.com/macros/s/AKfycbz0-YhA73OcU0QqDDUrXS2eIDOd3E6Ij0Wg3m-7ND1Dh2hxiCRSXHXkfP0Ww9ln894c/exec';
  var STORE = 'hrd-concept-w1-';

  var STEPS = [
    { ko: '사전 개념 탐색', en: 'Prior Knowledge', q: 'HRD란 무엇이라고 생각하는가?', open: true,
      title: 'Harness 1. 사전 개념 탐색', enLong: 'Prior Knowledge Exploration',
      goal: '지금 내가 가지고 있는 HRD에 대한 생각과 그 바탕에 깔린 가정을 확인합니다.',
      guide: {
        check: ['HRD를 교육 또는 훈련과 동일시하는가?', 'HRD의 대상과 목적을 구분하는가?', '자신의 정의에 대한 근거를 가지고 있는가?'],
        end: '학생이 최초의 HRD 정의를 자신의 언어로 표현하고, 그렇게 생각한 이유를 설명할 수 있음.'
      },
      script: [
        { label: 'AI 질문 ①', text: 'HRD란 무엇이라고 생각하나요?' },
        { label: 'AI 질문 ② — 명료화', text: function (h) { return '“' + clip(lastMine(h)) + '”라고 했어요.\n여기서 가장 핵심이 되는 말은 구체적으로 무엇을 의미하나요?'; } },
        { label: 'AI 질문 ③ — 가정 탐색', text: '그렇다면 방금 말한 활동(예: 교육)은 HRD의 목적에 해당하나요, 아니면 어떤 목적을 이루기 위한 수단에 해당하나요?' },
        { label: 'AI 질문 ④ — 나의 첫 정의', text: '지금까지의 생각을 바탕으로, HRD를 나의 말로 한두 문장으로 정의해 보세요. 그리고 그렇게 생각한 이유도 함께 적어 주세요.' }
      ]
    },
    { ko: '개념의 본질 탐색', en: 'Essential Inquiry', q: '인간을 개발한다는 것은 무엇인가?' },
    { ko: '개념 간 차이 탐색', en: 'Conceptual Differentiation', q: '교육, 학습, 개발은 어떻게 다른가?' },
    { ko: '개념적 경계 탐색', en: 'Boundary Exploration', q: '어디까지를 HRD라고 할 수 있는가?' },
    { ko: '개발의 과정과 조건 탐색', en: 'Mechanism & Conditions', q: '인간의 개발은 어떻게 이루어지는가?' },
    { ko: '개발의 목적 탐색', en: 'Purpose Exploration', q: '왜 인간을 개발해야 하는가?' },
    { ko: '개념 통합 및 구조화', en: 'Conceptual Integration', q: '발견한 개념들은 어떻게 연결되는가?' },
    { ko: '정의 생성 및 검증', en: 'Definition Construction', q: '그렇다면 HRD란 무엇인가?' },
    { ko: '메타인지적 성찰', en: 'Metacognitive Reflection', q: '나의 생각은 어떻게 변화하였는가?' }
  ];

  function $(id) { return document.getElementById(id); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function clip(t) { t = (t || '').replace(/\s+/g, ' ').trim(); return t.length > 60 ? t.slice(0, 60) + '…' : t; }
  function lastMine(h) { for (var i = h.length - 1; i >= 0; i--) if (h[i].role === 'me') return h[i].text; return ''; }
  function load(i) { try { return JSON.parse(localStorage.getItem(STORE + (i + 1))) || { history: [], done: false }; } catch (e) { return { history: [], done: false }; } }
  function save(i, s) { try { localStorage.setItem(STORE + (i + 1), JSON.stringify(s)); } catch (e) { /* 저장 불가 브라우저: 화면에서만 진행 */ } }

  var cur = 0, state = null, busy = false, failed = false;

  // 단계 메뉴
  function renderSteps() {
    var ol = $('cpSteps'); ol.innerHTML = '';
    STEPS.forEach(function (s, i) {
      var li = document.createElement('li'), b = document.createElement(s.open ? 'button' : 'div');
      b.className = 'cp-step';
      if (s.open) { b.type = 'button'; b.addEventListener('click', function () { select(i); }); }
      else b.setAttribute('disabled', '');
      if (i === cur) b.setAttribute('aria-current', 'step');
      b.innerHTML = '<span class="no"></span><span class="ko"></span><span class="en"></span><span class="q"></span><span class="st"></span>';
      b.querySelector('.no').textContent = pad(i + 1);
      b.querySelector('.ko').textContent = s.ko;
      b.querySelector('.en').textContent = s.en;
      b.querySelector('.q').textContent = s.q;
      b.querySelector('.st').textContent = !s.open ? '준비 중' : load(i).done ? '완료' : load(i).history.length ? '진행 중' : '시작하기';
      li.appendChild(b); ol.appendChild(li);
    });
  }

  function addMsg(m) {
    var d = document.createElement('div');
    d.className = 'cp-msg ' + (m.role === 'ai' ? 'cp-ai' : 'cp-me');
    d.innerHTML = '<span class="who"></span><div class="txt"></div>';
    d.querySelector('.who').textContent = m.role === 'ai' ? (m.label || 'AI 질문') : '나의 답';
    d.querySelector('.txt').textContent = m.text;
    $('cpChat').appendChild(d);
  }

  function select(i) {
    cur = i; state = load(i);
    var s = STEPS[i];
    $('cpEyebrow').textContent = '1주차 · ' + pad(i + 1) + ' / ' + pad(STEPS.length);
    $('cpTitle').textContent = s.title;
    $('cpEn').textContent = s.enLong;
    $('cpGoal').innerHTML = '<strong>목적:</strong> ';
    $('cpGoal').appendChild(document.createTextNode(s.goal));
    $('cpChat').innerHTML = '';
    if (!state.history.length) { next(); } else { state.history.forEach(addMsg); }
    refresh(); renderSteps();
  }

  function refresh() {
    $('cpForm').hidden = state.done;
    $('cpDone').hidden = !state.done;
    if (state.done) $('cpDone').textContent = '이 단계를 마쳤습니다. 여기서 적은 첫 정의는 고치지 않고 남겨 두었다가, 마지막 성찰 단계에서 지금의 생각과 비교합니다.';
    $('cpSend').disabled = busy || failed;
    $('cpWait').hidden = !busy;
    $('cpRetry').hidden = !failed;
  }

  // 다음 질문: ASK_URL이 있으면 Claude, 없으면 정해 둔 질문
  function next() {
    var s = STEPS[cur];
    if (ASK_URL) {
      busy = true; failed = false; refresh();
      return fetch(ASK_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ harness: cur + 1, step: s.title, goal: s.goal, question: s.script[0].text, guide: s.guide,
          history: state.history.map(function (m) { return { role: m.role, text: m.text }; }) }) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.error) throw new Error(res.error);
          if (res.done) { state.done = true; state.finishedAt = new Date().toISOString(); }
          if (res.question) push({ role: 'ai', label: res.label, text: res.question });
        })
        .catch(function () { failed = true; })
        .then(function () { busy = false; save(cur, state); refresh(); renderSteps(); });
    }
    var asked = state.history.filter(function (m) { return m.role === 'ai'; }).length;
    if (asked >= s.script.length) { state.done = true; state.finishedAt = new Date().toISOString(); }
    else {
      var q = s.script[asked];
      push({ role: 'ai', label: q.label, text: typeof q.text === 'function' ? q.text(state.history) : q.text });
    }
    save(cur, state);
  }

  function push(m) { state.history.push(m); addMsg(m); }

  $('cpForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('cpAnswer').value.trim();
    if (!t || busy || state.done) { $('cpAnswer').focus(); return; }
    push({ role: 'me', text: t, at: new Date().toISOString() });
    $('cpAnswer').value = '';
    save(cur, state);
    next(); refresh(); renderSteps();
  });
  $('cpAnswer').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('cpForm').requestSubmit(); }
  });
  $('cpRetry').querySelector('button').addEventListener('click', function () { next(); });
  $('cpReset').addEventListener('click', function () {
    if (!confirm('이 단계에서 주고받은 기록을 모두 지우고 처음부터 다시 할까요?')) return;
    try { localStorage.removeItem(STORE + (cur + 1)); } catch (e) { /* 무시 */ }
    select(cur);
  });

  select(0);
})();

// 논문작성법(기초) 퀴즈. 문제는 서버에서 받고, 채점·해설·기록도 서버(research-help-backend/Quiz.gs)가 한다.
(function () {
  'use strict';
  var CHAPTERS = { 1: '1. 서론', 2: '2. 이론적 근거', 3: '3. 연구방법', 4: '4. 연구결과', 5: '5. 결론' };
  var MARKS = ['①', '②', '③', '④', '⑤'];
  var SESSION_KEY = 'research-help-v1-admin'; // 제출물 열람 화면과 같은 로그인 세션을 쓴다
  var RETAKE_KEY = 'research-help-quiz-retake'; // 이 기기에서 다시 풀 수 있는 시각(서버도 같은 이름은 7일 동안 막는다)
  var RETAKE_MSG = '내용에 대한 학습을 실시 한 후 다시 도전하세요.';

  function retakeAt(v) {
    try {
      if (v) { localStorage.setItem(RETAKE_KEY, v); return; }
      var t = localStorage.getItem(RETAKE_KEY);
      return t && Date.parse(t) > Date.now() ? new Date(t) : null;
    } catch (e) { return null; }
  }
  function dateText(d) {
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function waitNotice(d) {
    return el('p', { class: 'rhq-wait' }, [el('strong', { text: '다시 풀기는 ' + dateText(d) + ' 이후에 가능합니다.' }), ' ' + RETAKE_MSG]);
  }

  function post(url, body, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, ms || 60000);
    // text/plain으로 보내야 Apps Script가 사전 요청(CORS preflight) 없이 받는다.
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'network', message: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }; })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res || res.ok !== true) { var err = new Error((res && res.message) || '요청을 처리하지 못했습니다.'); err.code = res && res.error; err.retakeAt = res && res.retakeAt; throw err; }
        return res;
      });
  }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    [].concat(children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }
  function statusLine() {
    var p = el('p', { class: 'rh-status is-empty', role: 'status', 'aria-live': 'polite' });
    p.set = function (msg, isError) { p.textContent = msg || ''; p.className = 'rh-status' + (isError ? ' is-error' : '') + (msg ? '' : ' is-empty'); };
    return p;
  }

  function mountQuiz(root) {
    var endpoint = root.getAttribute('data-endpoint');
    var body = root.querySelector('.rhq-body');
    var status = statusLine();
    var data = null;

    function start() {
      status.set('문항을 불러오는 중입니다…');
      post(endpoint, { action: 'quizQuestions' }).then(function (res) { data = res; status.set(''); renderForm(); }, function (err) { status.set(err.message, true); });
    }

    function renderForm() {
      body.innerHTML = '';
      var form = el('form', { class: 'rhq-form', novalidate: true });
      form.appendChild(el('p', { class: 'rhq-guide', text: '총 ' + data.total + '문항 · ' + data.pass + '개 이상 맞으면 Pass입니다. 모든 문항에 답한 뒤 제출하세요.' }));
      form.appendChild(el('div', { class: 'rhq-name' }, [el('label', { for: 'rhq-name', text: '이름' }),
        el('input', { id: 'rhq-name', name: 'name', type: 'text', maxlength: '80', autocomplete: 'name', required: true })]));
      var chapter = 0;
      data.questions.forEach(function (q, i) {
        if (q.ch !== chapter) { chapter = q.ch; form.appendChild(el('h3', { class: 'rhq-ch', text: CHAPTERS[q.ch] })); }
        form.appendChild(el('fieldset', { class: 'rhq-q', id: 'rhq-' + q.id }, [
          el('legend', {}, [el('b', { text: (i + 1) + '. ' }), q.q]),
          el('div', { class: 'rhq-opts' }, q.o.map(function (opt, j) {
            return el('label', {}, [el('input', { type: 'radio', name: q.id, value: String(j) }), el('span', { text: MARKS[j] + ' ' + opt })]);
          }))
        ]));
      });
      var submit = el('button', { type: 'submit', class: 'rh-btn primary', text: '제출하고 채점하기' });
      form.appendChild(el('div', { class: 'rhq-actions' }, [submit]));
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = form.querySelector('#rhq-name').value.trim();
        var answers = {}, missing = [];
        data.questions.forEach(function (q, i) {
          var picked = form.querySelector('input[name="' + q.id + '"]:checked');
          if (picked) answers[q.id] = Number(picked.value); else missing.push(i + 1);
        });
        if (!name) { status.set('이름을 입력해 주세요.', true); form.querySelector('#rhq-name').focus(); return; }
        if (missing.length) {
          status.set('아직 답하지 않은 문항이 있습니다: ' + missing.join(', ') + '번', true);
          document.getElementById('rhq-' + data.questions[missing[0] - 1].id).scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        submit.disabled = true; submit.textContent = '채점 중…'; status.set('');
        post(endpoint, { action: 'quizSubmit', name: name, answers: answers }).then(function (res) { if (res.retakeAt) retakeAt(res.retakeAt); renderResult(name, res); },
          function (err) {
            submit.disabled = false; submit.textContent = '제출하고 채점하기'; status.set(err.message, true);
            if (err.retakeAt) retakeAt(err.retakeAt);
          });
      });
      body.appendChild(form);
    }

    function renderResult(name, res) {
      body.innerHTML = '';
      var wrong = res.results.filter(function (r) { return !r.ok; });
      body.appendChild(el('div', { class: 'rhq-score ' + (res.pass ? 'is-pass' : 'is-fail') }, [
        el('span', { class: 'rhq-verdict', text: res.pass ? 'Pass' : 'Fail' }),
        el('strong', { text: name + '님의 점수: ' + res.score + ' / ' + res.total }),
        el('span', { text: res.pass ? data.pass + '개 이상 맞혀 통과했습니다.' : (data.pass - 1) + '개 이하로 통과하지 못했습니다. 아래 해설로 복습한 뒤 다시 도전해 보세요.' })
      ]));
      if (wrong.length) {
        body.appendChild(el('h3', { class: 'rhq-ch', text: '틀린 문항 복습 (' + wrong.length + '개)' }));
        wrong.forEach(function (r) { body.appendChild(reviewItem(r)); });
      } else {
        body.appendChild(el('p', { class: 'rhq-guide', text: '모든 문항을 맞혔습니다.' }));
      }
      var right = res.results.filter(function (r) { return r.ok; });
      if (right.length) {
        body.appendChild(el('details', { class: 'rhq-right' }, [el('summary', { text: '맞힌 문항 해설 보기 (' + right.length + '개)' })].concat(right.map(reviewItem))));
      }
      body.appendChild(waitNotice(new Date(res.retakeAt || Date.now() + 7 * 86400000)));
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function reviewItem(r) {
      var n = Number(r.id.slice(1));
      return el('div', { class: 'rhq-review' + (r.ok ? ' is-ok' : '') }, [
        el('p', { class: 'rhq-review-q' }, [el('b', { text: n + '. ' }), r.q, el('span', { class: 'rhq-tag', text: CHAPTERS[r.ch] })]),
        r.ok ? null : el('p', { class: 'rhq-mine', text: '내 답: ' + MARKS[r.chosen] + ' ' + r.o[r.chosen] }),
        el('p', { class: 'rhq-answer', text: '정답: ' + MARKS[r.correct] + ' ' + r.o[r.correct] }),
        el('p', { class: 'rhq-explain', text: (r.ok ? '' : '왜 틀렸을까요? ') + r.e })
      ]);
    }

    var startBtn = root.querySelector('.rhq-start'), waitUntil = retakeAt();
    if (waitUntil) { startBtn.hidden = true; startBtn.parentNode.insertBefore(waitNotice(waitUntil), startBtn); }
    startBtn.addEventListener('click', function () {
      if (!endpoint) { status.set('서버 연결이 설정되지 않았습니다.', true); return; }
      this.hidden = true; start();
    });
    root.appendChild(status);
  }

  function mountQuizAdmin(root) {
    var endpoint = root.getAttribute('data-endpoint');
    var status = statusLine();
    function session(v) {
      try {
        if (v === undefined) return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (v === null) sessionStorage.removeItem(SESSION_KEY); else sessionStorage.setItem(SESSION_KEY, JSON.stringify(v));
      } catch (e) { return null; }
    }
    function view(node) { root.innerHTML = ''; root.appendChild(node); root.appendChild(status); }
    function failed(err) {
      if (err.code === 'admin_session') { session(null); loginView(); }
      status.set(err.message, true);
    }
    function loginView() {
      var input = el('input', { id: 'rhq-admin-pw', type: 'password', autocomplete: 'current-password', required: true });
      view(el('form', { class: 'rh-login', onsubmit: function (e) {
        e.preventDefault(); status.set('확인 중…');
        post(endpoint, { action: 'adminLogin', password: input.value }).then(function (res) { input.value = ''; session(res.session); status.set(''); listView(); }, failed);
      } }, [el('label', { for: 'rhq-admin-pw', text: '열람 비밀번호' }), input, el('button', { type: 'submit', class: 'rh-btn primary', text: '열람' })]));
    }
    function listView() {
      status.set('응시 기록을 불러오는 중…');
      post(endpoint, { action: 'adminQuizList', session: session() }).then(function (res) {
        status.set(res.attempts.length ? '' : '아직 응시 기록이 없습니다.');
        var passCount = res.attempts.filter(function (a) { return a.result === 'Pass'; }).length;
        var table = el('table', { class: 'rhb-table rhq-table' }, [
          el('thead', {}, [el('tr', {}, ['응시 일시', '이름', '점수', '결과', '틀린 문항'].map(function (h) { return el('th', { scope: 'col', text: h }); }))]),
          el('tbody', {}, res.attempts.map(function (a) {
            return el('tr', {}, [el('td', { text: String(a.submittedAt).replace('T', ' ').replace(/\+09:00$/, '') }), el('td', { text: a.name }),
              el('td', { text: a.score + ' / ' + a.total }), el('td', { class: a.result === 'Pass' ? 'rhq-pass' : 'rhq-fail', text: a.result }),
              el('td', { class: 'rhq-wrong', text: a.wrong.length ? a.wrong.join(', ') : '없음' })]);
          }))
        ]);
        view(el('div', {}, [
          el('div', { class: 'rh-admin-bar' }, [el('strong', { text: '응시 ' + res.attempts.length + '건 · Pass ' + passCount + '건 (기준 ' + res.pass + '개 이상)' }),
            el('button', { type: 'button', class: 'rh-link', text: '로그아웃', onclick: function () { session(null); loginView(); } })]),
          el('div', { class: 'rhb-table-wrap' }, [table])
        ]));
      }, failed);
    }
    if (!endpoint) { view(el('p', { text: '서버 연결이 설정되지 않았습니다.' })); return; }
    if (session()) listView(); else loginView();
  }

  function mount() {
    var quiz = document.getElementById('rhq');
    if (quiz) mountQuiz(quiz);
    var admin = document.getElementById('rhq-admin');
    if (admin) mountQuizAdmin(admin);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

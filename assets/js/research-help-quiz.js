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

  // ---------- 결과 PDF (A4, html2canvas + jsPDF) ----------
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var PW = 680, PH = 990;
  function loadScript(src, ready) {
    return new Promise(function (ok, fail) { if (ready()) return ok(); var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  }
  function loadFonts() {
    if (!document.getElementById('rhq-rep-font')) {
      var l = document.createElement('link'); l.id = 'rhq-rep-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=block';
      document.head.appendChild(l);
    }
    return document.fonts && document.fonts.load ? Promise.all([document.fonts.load('400 14px "Noto Sans KR"', '가'), document.fonts.load('700 14px "Noto Sans KR"', '가')]).catch(function () {}) : Promise.resolve();
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function repHtml(name, res, passMark) {
    var now = new Date(), date = now.getFullYear() + '. ' + (now.getMonth() + 1) + '. ' + now.getDate() + '.';
    var rate = res.total ? Math.round(res.score / res.total * 100) : 0;
    var wrong = res.results.filter(function (r) { return !r.ok; });
    var byCh = Object.keys(CHAPTERS).map(function (c) {
      var rs = res.results.filter(function (r) { return String(r.ch) === c; }), ok = rs.filter(function (r) { return r.ok; }).length;
      return rs.length ? '<tr><td>' + esc(CHAPTERS[c]) + '</td><td>' + ok + ' / ' + rs.length + '</td><td>' + Math.round(ok / rs.length * 100) + '%</td></tr>' : '';
    }).join('');
    var h = '<style>.rep{width:' + PW + 'px;color:#222;font-family:"Noto Sans KR","Apple SD Gothic Neo",sans-serif;font-size:13px;line-height:1.7;word-break:keep-all;background:#fff}' +
      '.rep *{box-sizing:border-box;margin:0}.rep .hd{border-top:3px solid #222;padding-top:22px;text-align:center}.rep h1{font-size:22px;font-weight:700}' +
      '.rep .sub{font-size:12.5px;color:#444;margin-top:8px;padding-bottom:14px;border-bottom:1px solid #222}.rep .date{text-align:right;font-size:12px;color:#444;margin:10px 0 4px}' +
      '.rep h2{font-size:15.5px;font-weight:700;margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid #222}' +
      '.rep .sum{display:flex;gap:10px}.rep .box{flex:1;border:1px solid #bbb;border-radius:6px;padding:10px 12px;text-align:center}.rep .box b{display:block;font-size:20px}.rep .box span{font-size:11.5px;color:#555}' +
      '.rep .pass b{color:#15803d}.rep .fail b{color:#b91c1c}' +
      '.rep table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:12px}.rep th{background:#f1f1f1;border-top:1.5px solid #222;border-bottom:1px solid #999;padding:5px}.rep td{border-bottom:1px solid #d4d4d4;padding:5px;text-align:center}.rep td:first-child{text-align:left}' +
      '.rep .q{padding:9px 12px;border-left:3px solid #c2410c;background:#f7f7f7;margin-bottom:8px}.rep .q p{margin:1px 0}.rep .qq{font-weight:700}.rep .tag{font-weight:400;color:#777;font-size:11px;margin-left:6px}' +
      '.rep .mine{color:#b91c1c}.rep .ans{color:#15803d;font-weight:700}.rep .ex{font-size:12px;color:#333}.rep .note{margin-top:18px;padding-top:8px;border-top:1px solid #999;font-size:11px;color:#555}</style>';
    h += '<div class="rep"><div class="hd"><h1>논문작성법(기초) 퀴즈 결과</h1><p class="sub">' + esc(name) + ' · PRO AnalytiX Lab 연구 도움</p></div><p class="date">' + date + '</p>';
    h += '<h2>1. 결과 요약</h2><div><div class="sum"><div class="box ' + (res.pass ? 'pass' : 'fail') + '"><b>' + (res.pass ? 'Pass' : 'Fail') + '</b><span>' + '통과 기준 ' + passMark + '문항 이상' + '</span></div>' +
      '<div class="box"><b>' + rate + '%</b><span>정답률</span></div><div class="box"><b>' + res.score + ' / ' + res.total + '</b><span>맞힌 문항</span></div><div class="box"><b>' + wrong.length + '</b><span>틀린 문항</span></div></div>' +
      '<table><thead><tr><th>장</th><th>맞힌 문항</th><th>정답률</th></tr></thead><tbody>' + byCh + '</tbody></table></div>';
    h += '<h2>2. 틀린 문항 복습' + (wrong.length ? ' (' + wrong.length + '개)' : '') + '</h2>';
    h += wrong.length ? wrong.map(function (r) {
      var n = Number(String(r.id).slice(1));
      return '<div class="q"><p class="qq">' + n + '. ' + esc(r.q) + '<span class="tag">' + esc(CHAPTERS[r.ch]) + '</span></p>' +
        '<p class="mine">내 답: ' + MARKS[r.chosen] + ' ' + esc(r.o[r.chosen]) + '</p><p class="ans">정답: ' + MARKS[r.correct] + ' ' + esc(r.o[r.correct]) + '</p>' +
        '<p class="ex">' + esc(r.e) + '</p></div>';
    }).join('') : '<p>모든 문항을 맞혔습니다.</p>';
    h += '<p class="note">※ 다시 응시는 ' + esc(dateText(new Date(res.retakeAt || Date.now() + 7 * 86400000))) + ' 이후에 가능합니다. ' + RETAKE_MSG + '<br>※ hrdpro.hanyang.ac.kr/research-help/basics/</p></div>';
    return h;
  }
  function paginate(rep) {
    var blocks = Array.prototype.slice.call(rep.children), pages = [], cur = [], start = 0;
    blocks.forEach(function (node) {
      var bottom = node.offsetTop + node.offsetHeight;
      if (cur.length && bottom - start > PH) {
        var carry = [];
        while (cur.length > 1 && /^H2$/.test(cur[cur.length - 1].tagName)) carry.unshift(cur.pop());
        pages.push(cur); cur = carry; start = (carry[0] || node).offsetTop;
      }
      if (!cur.length && !pages.length) start = node.offsetTop - (parseFloat(getComputedStyle(node).marginTop) || 0);
      cur.push(node);
    });
    if (cur.length) pages.push(cur);
    return pages;
  }
  function downloadPdf(btn, msg, name, res, passMark) {
    var host;
    btn.disabled = true; msg.textContent = 'PDF를 만드는 중…'; msg.className = 'rhq-pdf-msg';
    Promise.all([loadScript(H2C, function () { return !!window.html2canvas; }), loadScript(JSPDF, function () { return !!(window.jspdf && window.jspdf.jsPDF); }), loadFonts()]).then(function () {
      host = document.createElement('div'); host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + PW + 'px;background:#fff';
      host.innerHTML = repHtml(name, res, passMark); document.body.appendChild(host);
      var rep = host.querySelector('.rep');
      var pages = paginate(rep), pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }), chain = Promise.resolve();
      pages.forEach(function (blocks, i) {
        chain = chain.then(function () {
          var page = document.createElement('div'); page.className = 'rep';
          page.style.cssText = 'width:' + PW + 'px;height:' + PH + 'px;overflow:hidden;background:#fff';
          blocks.forEach(function (node, k) { var c = node.cloneNode(true); if (k === 0) c.style.marginTop = '0'; page.appendChild(c); });
          host.appendChild(page);
          return window.html2canvas(page, { scale: 2, backgroundColor: '#ffffff', logging: false }).then(function (cv) {
            if (i) pdf.addPage();
            pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 15, 16, 180, 180 * PH / PW);
            pdf.setFontSize(9); pdf.setTextColor(90); pdf.text('- ' + (i + 1) + ' -', 105, 289, { align: 'center' });
            host.removeChild(page);
          });
        });
      });
      return chain.then(function () { pdf.save('논문작성법_퀴즈결과_' + name.replace(/[\\/:*?"<>|\s]+/g, '_') + '.pdf'); });
    }).then(function () { msg.textContent = ''; btn.disabled = false; })
      .catch(function () { msg.textContent = 'PDF를 만들지 못했습니다. 잠시 뒤 다시 눌러 주세요.'; msg.className = 'rhq-pdf-msg is-error'; btn.disabled = false; })
      .then(function () { if (host && host.parentNode) host.parentNode.removeChild(host); });
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

    // 채점 뒤에는 '내 결과 확인하기' 한 화면만 보여 주고, 틀린 문항·정답률은 PDF로 받게 한다.
    function renderResult(name, res) {
      body.innerHTML = '';
      var rate = res.total ? Math.round(res.score / res.total * 100) : 0;
      var wrongN = res.results.filter(function (r) { return !r.ok; }).length;
      var msg = el('p', { class: 'rhq-pdf-msg', role: 'status', 'aria-live': 'polite' });
      var btn = el('button', { type: 'button', class: 'rh-btn primary', text: '결과 PDF 다운로드', onclick: function () { downloadPdf(btn, msg, name, res, data.pass); } });
      body.appendChild(el('div', { class: 'rhq-result ' + (res.pass ? 'is-pass' : 'is-fail') }, [
        el('h3', { text: '내 결과 확인하기' }),
        el('p', { class: 'rhq-result-line' }, [el('span', { class: 'rhq-verdict', text: res.pass ? 'Pass' : 'Fail' }),
          el('strong', { text: '정답률 ' + rate + '% (' + res.score + ' / ' + res.total + ')' })]),
        el('p', { class: 'rhq-guide', text: wrongN ? '틀린 문항 ' + wrongN + '개의 정답과 해설은 PDF에 정리되어 있습니다.' : '모든 문항을 맞혔습니다.' }),
        el('div', { class: 'rhq-actions' }, [btn]), msg
      ]));
      body.appendChild(waitNotice(new Date(res.retakeAt || Date.now() + 7 * 86400000)));
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

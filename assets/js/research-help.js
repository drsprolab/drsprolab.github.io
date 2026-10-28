// Research help: 연구계획 9개 항목 작성 → 1·2차 저장(DrS comments, AI 생성) → 3차 저장(PDF) → 제출.
// 저장·피드백은 별도 Apps Script(research-help-backend)에서 처리한다. 서버가 실패하면 다음 단계로 넘어가지 않는다.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchHelp = api;
  if (typeof document !== 'undefined') {
    var start = function () { api.mount(document); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FIELDS = [
    { key: 'name', label: '이름', max: 80, hint: '' },
    { key: 'title', label: '연구제목', max: 300, hint: '연구의 핵심 변수·대상·관계가 드러나도록 작성합니다.' },
    { key: 'problem', label: '연구의 문제의식', max: 4000, hint: '왜 이 연구를 시작했는지, 기존 연구와 무엇이 다른지 적습니다.' },
    { key: 'purpose', label: '연구의 목적', max: 4000, hint: '문제의식에서 도출한 목적을 분명하게 적습니다.' },
    { key: 'model', label: '연구 모형', max: 4000, hint: '변수와 관계(예: X → M → Y, 조절변수 W)를 글로 설명합니다.' },
    { key: 'rq', label: 'RQ', max: 4000, hint: '연구문제를 번호를 붙여 적습니다.' },
    { key: 'theory', label: '이론적 근거', max: 4000, hint: '이 모형을 설명하는 이론과 그 논리를 적습니다.' },
    { key: 'method', label: '연구 방법', max: 4000, hint: '대상·표집·자료 구조·측정·분석 방법을 적습니다.' },
    { key: 'implications', label: '기대시사점', max: 4000, hint: '연구문제에 답했을 때 얻을 이론적·실천적 시사점을 적습니다.' }
  ];
  var FEEDBACK_FIELDS = FIELDS.slice(1);
  var STORE_KEY = 'research-help-v1';
  var AI_NOTICE = 'DrS comments는 외부 AI(현재 Google Gemini)가 지정된 기준에 따라 생성한 참고 의견이며, 송지훈 교수가 직접 작성한 평가가 아닙니다.';
  var STEP_LABELS = ['작성', '1차 저장', '2차 저장', '3차 저장', '제출'];

  function emptyFields() {
    var o = {};
    FIELDS.forEach(function (f) { o[f.key] = ''; });
    return o;
  }

  function validateFields(value) {
    var out = {}, missing = [];
    FIELDS.forEach(function (f) {
      var v = String((value && value[f.key]) || '').trim();
      if (!v) missing.push(f.label);
      if (v.length > f.max) throw new Error(f.label + '은(는) ' + f.max + '자 이내로 작성해 주세요.');
      out[f.key] = v;
    });
    if (missing.length) throw new Error('다음 항목을 작성해 주세요: ' + missing.join(', '));
    return out;
  }

  function requestId() {
    var c = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    return c.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
  }

  function serverError(res) {
    var err = new Error((res && res.message) || '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    err.code = (res && res.error) || 'network';
    err.response = res || {};
    return err;
  }

  // 화면과 분리된 상태 관리. transport(body) → Promise<응답 JSON>, storage: {get,set,remove}.
  function createController(opts) {
    opts = opts || {};
    var transport = opts.transport, storage = opts.storage || { get: function () { return null; }, set: function () {}, remove: function () {} };
    var state = { fields: emptyFields(), round: 0, status: 'draft', id: null, token: null, consent: false,
      history: [], feedback: {}, busy: false, pending: null };

    function call(body) {
      if (!transport) return Promise.reject(serverError({ error: 'not_configured', message: '서버 연결이 아직 설정되지 않아 저장할 수 없습니다.' }));
      return Promise.resolve(transport(body)).then(function (res) {
        if (!res || res.ok !== true) throw serverError(res);
        return res;
      });
    }
    function remember(id, token) {
      if (id) state.id = id;
      if (token) state.token = token;
      if (state.id && state.token) storage.set({ id: state.id, token: state.token });
    }
    function snapshot(round, savedAt, fields, feedback) {
      return Object.freeze({ round: round, savedAt: savedAt, fields: Object.freeze(Object.assign({}, fields)), feedback: feedback || null });
    }

    function save() {
      if (state.busy) return Promise.reject(new Error('저장 중입니다. 잠시 기다려 주세요.'));
      if (state.status === 'submitted') return Promise.reject(new Error('이미 제출되었습니다.'));
      var round = state.round + 1;
      if (round > 3) return Promise.reject(new Error('3차 저장까지 완료되었습니다. 제출해 주세요.'));
      var fields;
      try { fields = validateFields(state.fields); } catch (err) { return Promise.reject(err); }
      if (round === 1 && !state.id && !state.consent) return Promise.reject(new Error('외부 AI 전송 안내를 읽고 동의해 주세요.'));
      // 시간 초과 뒤 다시 누르면 같은 요청 번호로 보낸다. 서버가 이미 저장했다면 그 결과를 돌려준다.
      if (!state.pending || state.pending.round !== round) state.pending = { round: round, id: requestId() };
      state.busy = true;
      return call({ action: 'save', round: round, fields: fields, id: state.id, token: state.token, consent: state.consent, requestId: state.pending.id })
        .then(function (res) {
          remember(res.id, res.token);
          state.history.push(snapshot(round, res.savedAt, fields, res.feedback));
          if (res.feedback) state.feedback[round] = res.feedback;
          state.round = round;
          state.pending = null;
          return res;
        }, function (err) {
          remember(err.response && err.response.id, err.response && err.response.token);
          throw err;
        })
        .then(function (res) { state.busy = false; return res; }, function (err) { state.busy = false; throw err; });
    }

    function submit() {
      if (state.round !== 3) return Promise.reject(new Error('3차 저장을 마친 뒤 제출할 수 있습니다.'));
      if (state.status === 'submitted') return Promise.resolve();
      state.busy = true;
      return call({ action: 'submit', id: state.id, token: state.token }).then(function (res) {
        state.status = res.submission.status;
        state.busy = false;
        return res;
      }, function (err) { state.busy = false; throw err; });
    }

    // 이 기기에 남은 저장 기록으로 이어서 작성한다.
    function resume() {
      var saved = storage.get();
      if (!saved || !saved.id || !saved.token) return Promise.resolve(false);
      return call({ action: 'load', id: saved.id, token: saved.token }).then(function (res) {
        state.id = saved.id; state.token = saved.token;
        applyRecord(res);
        return true;
      }, function (err) {
        if (err.code === 'unauthorized') storage.remove();
        throw err;
      });
    }
    function applyRecord(res) {
      var revs = res.revisions || [];
      state.round = res.submission.round;
      state.status = res.submission.status;
      state.history = revs.filter(function (r) { return r.status === 'ok'; }).map(function (r) { return snapshot(r.round, r.savedAt, r.fields, r.feedback); });
      state.feedback = {};
      state.history.forEach(function (h) { if (h.feedback) state.feedback[h.round] = h.feedback; });
      // 마지막으로 보낸 내용(실패한 시도 포함)을 편집 칸에 되살린다.
      var latest = revs[revs.length - 1];
      if (latest) state.fields = Object.assign(emptyFields(), latest.fields);
    }

    function reset() {
      storage.remove();
      state.fields = emptyFields(); state.round = 0; state.status = 'draft'; state.id = null; state.token = null;
      state.consent = false; state.history = []; state.feedback = {}; state.pending = null;
    }

    return {
      state: state,
      setFields: function (v) { state.fields = Object.assign(emptyFields(), v); },
      setField: function (k, v) { state.fields[k] = v; },
      setConsent: function (v) { state.consent = !!v; },
      save: save, submit: submit, resume: resume, reset: reset
    };
  }

  function createAdmin(opts) {
    var transport = opts.transport;
    var state = { session: (opts.session && opts.session.get()) || null, list: null, detail: null };
    function call(body) {
      if (!transport) return Promise.reject(serverError({ error: 'not_configured', message: '서버 연결이 아직 설정되지 않았습니다.' }));
      return Promise.resolve(transport(body)).then(function (res) {
        if (!res || res.ok !== true) {
          if (res && res.error === 'admin_session') { state.session = null; if (opts.session) opts.session.remove(); }
          throw serverError(res);
        }
        return res;
      });
    }
    return {
      state: state,
      login: function (password) {
        return call({ action: 'adminLogin', password: password }).then(function (res) {
          state.session = res.session;
          if (opts.session) opts.session.set(res.session);
        });
      },
      list: function () { return call({ action: 'adminList', session: state.session }).then(function (r) { state.list = r.submissions; return r.submissions; }); },
      get: function (id) { return call({ action: 'adminGet', session: state.session, id: id }).then(function (r) { state.detail = r; return r; }); },
      logout: function () { state.session = null; if (opts.session) opts.session.remove(); }
    };
  }

  // ---------- PDF 문서 구성 ----------
  function fieldBlocks(fields) {
    var blocks = [];
    FIELDS.forEach(function (f) {
      blocks.push({ type: 'h3', text: f.label });
      blocks.push({ type: 'p', text: fields[f.key] || '' });
    });
    return blocks;
  }
  function feedbackBlocks(feedback) {
    var blocks = [{ type: 'note', text: AI_NOTICE + ' (' + (feedback.generatedBy || 'AI') + ')' }];
    if (feedback.searchNote) blocks.push({ type: 'note', text: feedback.searchNote });
    FEEDBACK_FIELDS.forEach(function (f) {
      var item = feedback.items && feedback.items[f.key];
      if (!item) return;
      blocks.push({ type: 'h3', text: f.label });
      if (feedback.kind === 'socratic') {
        if (item.focus) blocks.push({ type: 'p', text: item.focus });
        (item.questions || []).forEach(function (q, i) { blocks.push({ type: 'p', text: (i + 1) + '. ' + q }); });
      } else {
        blocks.push({ type: 'p', text: (item.status === 'withheld' ? '[판단 보류] ' : '') + item.assessment });
        (item.suggestions || []).forEach(function (s) { blocks.push({ type: 'p', text: '· ' + s }); });
        (item.sources || []).forEach(function (s) { blocks.push({ type: 'note', text: citationText(s) + ' — 근거 범위: ' + s.scope + '. ' + s.basis }); });
      }
    });
    return blocks;
  }
  function citationText(s) {
    return '[' + s.n + '] ' + (s.authors || []).slice(0, 6).join(', ') + (s.authors && s.authors.length > 6 ? ' 외' : '') +
      ' (' + s.year + '). ' + s.title + '. ' + s.journal + '. https://doi.org/' + s.doi;
  }
  function pdfDocument(record, opts) {
    opts = opts || {};
    var oks = record.revisions.filter(function (r) { return r.status === 'ok'; });
    var final = oks[oks.length - 1];
    var sub = record.submission;
    var doc = { title: '연구계획서 · ' + (final ? final.fields.title : ''), meta: [
      '작성자: ' + sub.name, '최종 저장: ' + (final ? final.savedAt : '') + ' (' + (final ? final.round : 0) + '차)',
      sub.submittedAt ? '제출: ' + sub.submittedAt : '미제출'], blocks: [] };
    doc.blocks.push({ type: 'h2', text: '최종 연구계획' });
    doc.blocks = doc.blocks.concat(fieldBlocks(final ? final.fields : {}));
    if (opts.history) {
      oks.forEach(function (r) {
        doc.blocks.push({ type: 'h2', text: r.round + '차 저장본 (' + r.savedAt + ')', pageBreak: true });
        doc.blocks = doc.blocks.concat(fieldBlocks(r.fields));
        if (r.feedback) {
          doc.blocks.push({ type: 'h2', text: r.round + '차 DrS comments (AI 생성)' });
          doc.blocks = doc.blocks.concat(feedbackBlocks(r.feedback));
        }
      });
    }
    return doc;
  }
  function pdfFileName(record) {
    return ('research-plan-' + record.submission.name + '-' + record.submission.id + '.pdf').replace(/[\\/:*?"<>|\s]+/g, '_');
  }

  // ---------- 브라우저 ----------
  function post(url, body, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, ms);
    // text/plain으로 보내야 Apps Script가 사전 요청(CORS preflight) 없이 받는다.
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .catch(function (err) {
        return { ok: false, error: 'network', message: err && err.name === 'AbortError'
          ? '서버 응답 시간이 초과되었습니다. 같은 버튼을 다시 누르면 이어서 확인합니다.'
          : '서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.' };
      })
      .then(function (res) { if (timer) clearTimeout(timer); return res; });
  }
  function webStorage(kind, key) {
    return {
      get: function () { try { var v = window[kind].getItem(key); return v && JSON.parse(v); } catch (e) { return null; } },
      set: function (v) { try { window[kind].setItem(key, JSON.stringify(v)); } catch (e) { /* 저장소를 못 쓰면 이 화면에서만 유지 */ } },
      remove: function () { try { window[kind].removeItem(key); } catch (e) { /* 무시 */ } }
    };
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
  function savePdf(record, opts, status) {
    if (!window.ResearchHelpPDF) { status('PDF 도구를 불러오지 못했습니다.', true); return Promise.resolve(); }
    status('PDF를 만드는 중입니다…');
    return window.ResearchHelpPDF.save(pdfDocument(record, opts), pdfFileName(record))
      .then(function () { status('PDF를 저장했습니다.'); }, function (err) { status((err && err.message) || 'PDF를 만들지 못했습니다.', true); });
  }

  function commentsNode(feedback, round) {
    var box = el('div', { class: 'rh-comments' }, [
      el('div', { class: 'rh-comments-head' }, [el('strong', { text: 'DrS comments' }), el('span', { class: 'rh-ai-badge', text: 'AI 생성 · ' + round + '차' })])
    ]);
    return box;
  }
  function itemNode(feedback, key) {
    var item = feedback.items[key];
    var wrap = el('div', { class: 'rh-comment' });
    if (!item) return wrap;
    if (feedback.kind === 'socratic') {
      if (item.focus) wrap.appendChild(el('p', { text: item.focus }));
      wrap.appendChild(el('ol', {}, (item.questions || []).map(function (q) { return el('li', { text: q }); })));
      return wrap;
    }
    if (item.status === 'withheld') wrap.appendChild(el('span', { class: 'rh-withheld', text: '판단 보류' }));
    wrap.appendChild(el('p', { text: item.assessment }));
    if (item.suggestions && item.suggestions.length) wrap.appendChild(el('ul', {}, item.suggestions.map(function (s) { return el('li', { text: s }); })));
    if (item.sources && item.sources.length) {
      wrap.appendChild(el('ol', { class: 'rh-sources' }, item.sources.map(function (s) {
        return el('li', { value: String(s.n) }, [
          (s.authors || []).slice(0, 6).join(', ') + ' (' + s.year + '). ' + s.title + '. ',
          el('em', { text: s.journal }), '. ',
          el('a', { href: 'https://doi.org/' + s.doi, target: '_blank', rel: 'noopener', text: 'doi:' + s.doi }),
          el('span', { class: 'rh-scope', text: '근거 범위: ' + s.scope + ' — ' + s.basis })
        ]);
      })));
    }
    return wrap;
  }

  function mountStudent(rootEl) {
    var endpoint = rootEl.getAttribute('data-endpoint') || '';
    var app = createController({
      transport: endpoint ? function (body) { return post(endpoint, body, body.round === 2 ? 330000 : 200000); } : null,
      storage: webStorage('localStorage', STORE_KEY)
    });
    var statusEl, busyLabel = '';

    function status(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = 'rh-status' + (isError ? ' is-error' : '') + (msg ? '' : ' is-empty');
    }
    function record() {
      return { submission: { id: app.state.id || 'draft', name: app.state.fields.name, round: app.state.round, status: app.state.status, submittedAt: '' },
        revisions: app.state.history.map(function (h) { return { round: h.round, savedAt: h.savedAt, status: 'ok', fields: h.fields, feedback: h.feedback }; }) };
    }

    function render() {
      var s = app.state, locked = s.round >= 3 || s.status === 'submitted' || s.busy;
      var stepIndex = s.status === 'submitted' ? 4 : s.round;
      rootEl.innerHTML = '';
      rootEl.appendChild(el('ol', { class: 'rh-steps', 'aria-label': '진행 단계' }, STEP_LABELS.map(function (label, i) {
        return el('li', { class: i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : '', 'aria-current': i === stepIndex ? 'step' : false, text: label });
      })));
      if (!endpoint) rootEl.appendChild(el('p', { class: 'rh-status is-error', text: '서버 연결 준비 중입니다. 지금은 작성 내용을 저장할 수 없습니다.' }));
      rootEl.appendChild(el('p', { class: 'rh-notice', text: AI_NOTICE }));
      if (s.round === 0 && !s.id) {
        rootEl.appendChild(el('label', { class: 'rh-consent' }, [
          el('input', { type: 'checkbox', checked: s.consent, onchange: function (e) { app.setConsent(e.target.checked); } }),
          el('span', { text: '1·2차 저장 시 이름을 제외한 연구 내용이 피드백 생성을 위해 외부 AI 서비스(Google Gemini API 무료 등급)로 전송되는 것에 동의합니다. 무료 등급 약관에 따라 Google이 전송 내용을 서비스 개선에 사용할 수 있고 사람 검토자가 읽을 수 있으므로, 민감한 개인정보나 공개되면 안 되는 내용은 적지 마세요. 이름과 작성 내용은 연구실의 비공개 저장소에 보관되며 공개 블로그에 게시되지 않습니다.' })
        ]));
      }

      var nameField = FIELDS[0];
      rootEl.appendChild(el('div', { class: 'rh-name' }, [
        el('label', { for: 'rh-name', text: nameField.label }),
        el('input', { id: 'rh-name', type: 'text', maxlength: String(nameField.max), autocomplete: 'name', value: s.fields.name, readonly: locked,
          oninput: function (e) { app.setField('name', e.target.value); } })
      ]));

      var latest = s.feedback[2] || s.feedback[1] || null;
      var latestRound = s.feedback[2] ? 2 : 1;
      var grid = el('div', { class: 'rh-grid' + (latest ? ' has-comments' : '') });
      if (latest) grid.appendChild(el('div', { class: 'rh-grid-head', 'aria-hidden': 'true' }, [el('span', { text: '내가 작성한 내용 (수정 가능)' }), el('span', { text: 'DrS comments · AI 생성 ' + latestRound + '차' })]));
      FEEDBACK_FIELDS.forEach(function (f) {
        var counter = el('span', { class: 'rh-count', text: s.fields[f.key].length + ' / ' + f.max });
        var mine = el('div', { class: 'rh-mine' }, [
          el('label', { for: 'rh-' + f.key, text: f.label }),
          f.hint ? el('span', { class: 'rh-hint', text: f.hint }) : null,
          el('textarea', { id: 'rh-' + f.key, rows: f.key === 'title' ? '2' : '6', maxlength: String(f.max), readonly: locked,
            oninput: function (e) { app.setField(f.key, e.target.value); counter.textContent = e.target.value.length + ' / ' + f.max; } }, [s.fields[f.key]]),
          counter
        ]);
        var row = el('section', { class: 'rh-row', 'aria-label': f.label }, [mine]);
        if (latest) {
          var c = commentsNode(latest, latestRound);
          c.appendChild(itemNode(latest, f.key));
          if (latestRound === 2 && s.feedback[1]) {
            c.appendChild(el('details', { class: 'rh-earlier' }, [el('summary', { text: '1차 질문 다시 보기' }), itemNode(s.feedback[1], f.key)]));
          }
          row.appendChild(c);
        }
        grid.appendChild(row);
      });
      rootEl.appendChild(grid);
      if (latest && latest.searchNote) rootEl.appendChild(el('p', { class: 'rh-note', text: '문헌 확인 절차: ' + latest.searchNote + ' 문헌 근거는 초록과 서지정보 범위에서만 사용했으며, 원문 내용은 직접 확인해 주세요.' }));

      var actions = el('div', { class: 'rh-actions' });
      if (s.status === 'submitted') {
        actions.appendChild(el('p', { class: 'rh-done', text: '제출이 완료되었습니다. 감사합니다.' }));
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn', onclick: function () { savePdf(record(), {}, status); }, text: 'PDF 다운로드' }));
      } else if (s.round >= 3) {
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn', onclick: function () { savePdf(record(), {}, status); }, text: 'PDF 다운로드' }));
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn primary', disabled: s.busy, onclick: doSubmit, text: s.busy ? '제출 중…' : '제출' }));
      } else {
        var label = (s.round + 1) + '차 저장';
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn primary', disabled: s.busy || !endpoint, onclick: doSave, text: s.busy ? busyLabel : label }));
        if (s.round < 2) actions.appendChild(el('span', { class: 'rh-hint', text: s.round === 0 ? '저장하면 항목별 1차 DrS comments(소크라테스식 질문)가 표시됩니다. 1–3분 걸릴 수 있습니다.' : '수정한 내용을 저장하면 검증된 SSCI 문헌에 근거한 2차 DrS comments가 표시됩니다. 2–5분 걸릴 수 있습니다.' }));
        else actions.appendChild(el('span', { class: 'rh-hint', text: '3차 저장본이 최종본이 되며, PDF로 내려받고 제출할 수 있습니다.' }));
      }
      rootEl.appendChild(actions);
      statusEl = el('p', { class: 'rh-status is-empty', role: 'status', 'aria-live': 'polite' });
      rootEl.appendChild(statusEl);
      if (s.id && s.status !== 'submitted') {
        rootEl.appendChild(el('p', { class: 'rh-small' }, ['이 기기에 저장 기록이 있어 이어서 작성합니다. ',
          el('button', { type: 'button', class: 'rh-link', onclick: function () {
            if (window.confirm('이 기기에서 이어쓰기 기록을 지우고 새로 작성할까요? 서버에 저장된 내용은 삭제되지 않습니다.')) { app.reset(); render(); }
          }, text: '새로 작성하기' })]));
      }
    }

    function doSave() {
      var round = app.state.round + 1;
      busyLabel = round === 3 ? '저장 중…' : round + '차 DrS comments를 만드는 중…';
      var p = app.save();
      render();
      status(round === 3 ? '최종본을 저장하는 중입니다…' : '저장하고 피드백을 만드는 중입니다. 창을 닫지 말아 주세요.');
      p.then(function () {
        render();
        status(round === 3 ? '3차 저장(최종본)이 완료되었습니다. PDF를 내려받거나 제출해 주세요.' : round + '차 저장이 완료되었습니다. 오른쪽 DrS comments를 참고해 왼쪽 내용을 수정해 주세요.');
        var first = rootEl.querySelector('.rh-grid');
        if (first && first.scrollIntoView) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, function (err) {
        render();
        status(err.message, true);
      });
    }
    function doSubmit() {
      if (!window.confirm('제출하면 더 이상 수정할 수 없습니다. 제출할까요?')) return;
      var p = app.submit();
      render();
      p.then(function () { render(); status('제출이 완료되었습니다.'); }, function (err) { render(); status(err.message, true); });
    }

    render();
    if (endpoint) {
      app.resume().then(function (resumed) { if (resumed) { render(); status('이전에 저장한 내용을 불러왔습니다.'); } },
        function (err) { render(); status('이전 저장 기록을 불러오지 못했습니다: ' + err.message, true); });
    }
    return app;
  }

  function mountAdmin(rootEl) {
    var endpoint = rootEl.getAttribute('data-endpoint') || '';
    var admin = createAdmin({ transport: endpoint ? function (b) { return post(endpoint, b, 60000); } : null, session: webStorage('sessionStorage', STORE_KEY + '-admin') });
    var statusEl = el('p', { class: 'rh-status is-empty', role: 'status', 'aria-live': 'polite' });
    function status(msg, isError) { statusEl.textContent = msg || ''; statusEl.className = 'rh-status' + (isError ? ' is-error' : '') + (msg ? '' : ' is-empty'); }
    function view(node) { rootEl.innerHTML = ''; rootEl.appendChild(node); rootEl.appendChild(statusEl); }

    function loginView() {
      var input = el('input', { id: 'rh-admin-pw', type: 'password', inputmode: 'numeric', autocomplete: 'current-password', required: true });
      view(el('form', { class: 'rh-login', onsubmit: function (e) {
        e.preventDefault();
        status('확인 중…');
        admin.login(input.value).then(function () { input.value = ''; status(''); listView(); }, function (err) { status(err.message, true); });
      } }, [el('label', { for: 'rh-admin-pw', text: '열람 비밀번호' }), input, el('button', { type: 'submit', class: 'rh-btn primary', text: '열람' })]));
      if (!endpoint) status('서버 연결 준비 중입니다.', true);
    }
    function listView() {
      status('제출물을 불러오는 중…');
      admin.list().then(function (subs) {
        status(subs.length ? '' : '아직 제출된 연구계획서가 없습니다.');
        view(el('div', {}, [
          el('div', { class: 'rh-admin-bar' }, [el('strong', { text: '제출물 ' + subs.length + '건' }), el('button', { type: 'button', class: 'rh-link', onclick: function () { admin.logout(); loginView(); }, text: '로그아웃' })]),
          el('ul', { class: 'rh-list' }, subs.map(function (s) {
            return el('li', {}, [el('button', { type: 'button', class: 'rh-list-item', onclick: function () { detailView(s.id); } }, [
              el('strong', { text: s.title || '(제목 없음)' }), el('span', { text: s.name + ' · 제출 ' + s.submittedAt + ' · ' + s.id })
            ])]);
          }))
        ]));
      }, failed);
    }
    function detailView(id) {
      status('불러오는 중…');
      admin.get(id).then(function (rec) {
        status('');
        var oks = rec.revisions.filter(function (r) { return r.status === 'ok'; });
        var body = el('div', { class: 'rh-detail' });
        function show(rev) {
          body.innerHTML = '';
          var grid = el('div', { class: 'rh-grid' + (rev.feedback ? ' has-comments' : '') });
          FIELDS.forEach(function (f) {
            var row = el('section', { class: 'rh-row' }, [el('div', { class: 'rh-mine' }, [el('h3', { text: f.label }), el('p', { class: 'rh-text', text: rev.fields[f.key] })])]);
            if (rev.feedback && f.key !== 'name') { var c = commentsNode(rev.feedback, rev.round); c.appendChild(itemNode(rev.feedback, f.key)); row.appendChild(c); }
            grid.appendChild(row);
          });
          body.appendChild(grid);
        }
        var tabs = el('div', { class: 'rh-tabs', role: 'tablist' }, oks.map(function (r, i) {
          return el('button', { type: 'button', role: 'tab', 'aria-selected': i === oks.length - 1 ? 'true' : 'false', text: r.round + '차 저장본', onclick: function (e) {
            [].forEach.call(tabs.children, function (b) { b.setAttribute('aria-selected', 'false'); });
            e.target.setAttribute('aria-selected', 'true'); show(r);
          } });
        }));
        view(el('div', {}, [
          el('div', { class: 'rh-admin-bar' }, [el('button', { type: 'button', class: 'rh-link', onclick: listView, text: '← 목록' }),
            el('button', { type: 'button', class: 'rh-btn', onclick: function () { savePdf(rec, { history: true }, status); }, text: 'PDF 다운로드 (수정 이력 포함)' })]),
          el('h2', { text: (oks.length ? oks[oks.length - 1].fields.title : '') }),
          el('p', { class: 'rh-small', text: rec.submission.name + ' · 제출 ' + rec.submission.submittedAt + ' · ' + rec.submission.id }),
          el('p', { class: 'rh-notice', text: AI_NOTICE }),
          tabs, body
        ]));
        if (oks.length) show(oks[oks.length - 1]);
      }, failed);
    }
    function failed(err) {
      if (err.code === 'admin_session') { loginView(); status(err.message, true); return; }
      status(err.message, true);
    }
    if (admin.state.session) listView(); else loginView();
    return admin;
  }

  function mount(doc) {
    var student = doc.getElementById('research-help');
    if (student) mountStudent(student);
    var admin = doc.getElementById('research-help-admin');
    if (admin) mountAdmin(admin);
  }

  return { FIELDS: FIELDS, AI_NOTICE: AI_NOTICE, validateFields: validateFields, createController: createController, createAdmin: createAdmin,
    pdfDocument: pdfDocument, pdfFileName: pdfFileName, mount: mount };
});

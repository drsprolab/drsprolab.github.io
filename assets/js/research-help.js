// Research help: 연구계획 9개 항목 작성 → 1·2·3차 저장(DrS comments, AI 생성) → 최종 수정본 저장(PDF) → 제출.
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
    { key: 'model', label: '연구 모형', max: 4000, hint: '연구 모형 그림 붙여넣기는 허용됩니다. 그림의 변수명·화살표 방향·관계선을 분명히 표시하고, 아래 설명란에 각 경로의 의미와 이론적 근거를 직접 작성해 주세요.' },
    { key: 'rq', label: 'RQ', max: 4000, hint: '연구문제를 번호를 붙여 적습니다.' },
    { key: 'theory', label: '이론적 근거', max: 4000, hint: '이 모형을 설명하는 이론과 그 논리를 적습니다.' },
    { key: 'method', label: '연구 방법', max: 4000, hint: '대상·표집·자료 구조·측정·분석 방법을 적습니다.' },
    { key: 'implications', label: '기대시사점', max: 4000, hint: '연구문제에 답했을 때 얻을 이론적·실천적 시사점을 적습니다.' }
  ];
  var FEEDBACK_FIELDS = FIELDS.slice(1);
  var STORE_KEY = 'research-help-v1';
  // 피드백 AI 서비스는 사이트 설정(research_help_ai)이 페이지의 data-ai-provider로 알려 준다. 문구가 실제 서비스와 어긋나지 않게 한다.
  var aiHost = typeof document !== 'undefined' && document.querySelector ? document.querySelector('[data-ai-provider]') : null;
  var AI_PROVIDER = aiHost && aiHost.getAttribute('data-ai-provider') === 'claude' ? 'claude' : 'gemini';
  var AI_NOTICE = 'DrS 미리 설정해 둔 심사 기준, 논리적 흐름 문제, 이론적 정합성 확인 방식에 따라 제시되는 의견입니다.';
  var AI_CONSENT = AI_PROVIDER === 'claude'
    ? '1·2·3차 저장 시 이름을 제외한 연구 내용이 피드백 생성을 위해 외부 AI 서비스(Anthropic Claude API)로 전송되는 것에 동의합니다. Anthropic은 API로 받은 내용을 AI 모델 학습에 사용하지 않지만 외부 서비스로 전송되므로, 민감한 개인정보나 공개되면 안 되는 내용은 적지 마세요. 이름과 작성 내용은 연구실의 비공개 저장소에 보관되며 공개 블로그에 게시되지 않습니다.'
    : null;
  var CRITIC_KEYS = ['alignment', 'modelTheory', 'methodFit'];
  // 소논문의 3차 의견(건설적 종합 의견) 관점
  var CONSTRUCT_KEYS = ['logic', 'theoryFit', 'methodValidity'];
  var PAPER_TYPE_LABELS = { thesis: '학위논문용', article: '소논문용' };
  function isRound3(fb) { return !!fb && (fb.kind === 'critical' || fb.kind === 'constructive'); }
  function round3Keys(fb) { return fb && fb.kind === 'constructive' ? CONSTRUCT_KEYS : CRITIC_KEYS; }
  var SEVERITY_LABELS = { critical: '치명적', major: '큰 문제', minor: '보완 권장', sound: '문제 없음' };
  var STEP_LABELS = ['작성', '1차 저장', '2차 저장', '3차 저장', '최종 저장', '제출'];
  var VERDICT_LABELS = { valid: '타당함', partial: '일부 타당 · 보완 필요', weak: '근거 부족' };
  var CRITIC_LABELS = { alignment: '연구목적과 연구문제의 얼라인먼트', modelTheory: '연구목적에 따른 연구모형 설정의 이론적 불일치', methodFit: '연구방법이 연구목적을 달성하는 데 갖는 불합리성',
    logic: '논문 전체의 논리성', theoryFit: '이론적 근거의 정합성', methodValidity: '연구방법의 타당성' };

  // 피드백 수용·불수용: 3차 저장은 2차 피드백(작성 항목별), 최종 저장은 3차 점검(세 관점)에 응답한다.
  function responseKeys(to) { return to === 2 ? FEEDBACK_FIELDS.map(function (f) { return f.key; }) : CRITIC_KEYS.concat(CONSTRUCT_KEYS); }
  function responseLabel(to, key) {
    if (to === 3) return CRITIC_LABELS[key];
    var f = FEEDBACK_FIELDS.filter(function (x) { return x.key === key; })[0];
    return f ? f.label : key;
  }
  function checkResponses(to, items, feedback) {
    var missing = [], noReason = [];
    responseKeys(to).forEach(function (k) {
      if (!feedback || !feedback.items || !feedback.items[k]) return;
      var e = items[k];
      if (!e || (e.d !== 'accept' && e.d !== 'reject')) missing.push(responseLabel(to, k));
      else if (e.d === 'reject' && String(e.r || '').trim().length < 10) noReason.push(responseLabel(to, k));
    });
    if (missing.length) throw new Error(to + '차 피드백의 수용·불수용을 선택해 주세요: ' + missing.join(', '));
    if (noReason.length) throw new Error('불수용을 선택한 항목은 수용하지 않는 이유를 10자 이상 작성해 주세요: ' + noReason.join(', '));
  }
  function responseLines(res) {
    if (!res || !res.items) return [];
    return responseKeys(res.to).filter(function (k) { return res.items[k]; }).map(function (k) {
      var e = res.items[k];
      return { label: responseLabel(res.to, k), reject: e.d === 'reject', text: e.d === 'reject' ? '불수용 — ' + e.r : '수용' };
    });
  }

  function emptyFields() {
    var o = {};
    FIELDS.forEach(function (f) { o[f.key] = ''; });
    return o;
  }

  function validateFields(value, hasImage) {
    var out = {}, missing = [];
    FIELDS.forEach(function (f) {
      var v = String((value && value[f.key]) || '').trim();
      if (!v && !(f.key === 'model' && hasImage)) missing.push(f.label);
      if (v.length > f.max) throw new Error(f.label + '은(는) ' + f.max + '자 이내로 작성해 주세요.');
      out[f.key] = v;
    });
    if (missing.length) throw new Error('다음 항목을 작성해 주세요: ' + missing.join(', '));
    if (value && value.modelImage) out.modelImage = String(value.modelImage);
    return out;
  }

  function requestId() {
    var c = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    return c.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
  }

  var AUTO_INPUT_MIN = 40; // 한 번의 입력으로 이만큼 이상 늘면 자동입력으로 본다
  var RULE_TEXT = '타이핑을 하면서 여러분들의 생각이 더 잘 정리 될 수 있습니다. 마치 노트 필기 하는 것과 같은 원리로 보면 됩니다. 가급적 본인의 인지적 사고를 통해서 생각하고 AI 에게 도움을 받는 것을 추천합니다.';
  // 저장본의 입력 기록(fields._input)을 사람이 읽는 문장 목록으로 바꾼다
  function inputLogLines(log) {
    var out = [];
    FIELDS.forEach(function (f) {
      var e = log && log[f.key]; if (!e) return;
      var parts = [];
      if (e.p) parts.push('붙여넣기 ' + e.p[0] + '회 (' + e.p[1].toLocaleString('ko-KR') + '자)');
      if (e.a) parts.push('자동입력 의심 ' + e.a[0] + '회 (' + e.a[1].toLocaleString('ko-KR') + '자)');
      if (parts.length) out.push(f.label + ': ' + parts.join(', '));
    });
    return out;
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
      history: [], feedback: {}, busy: false, pending: null,
      // 연구 모형 그림: imagePending = 아직 서버에 안 보낸 새 그림(data URL), images = 파일 id → 화면용 data URL
      imagePending: null, images: {}, inputLog: {}, responses: { 2: {}, 3: {} }, paperType: '' };

    function call(body, retries) {
      if (!transport) return Promise.reject(serverError({ error: 'not_configured', message: '서버 연결이 아직 설정되지 않아 저장할 수 없습니다.' }));
      return Promise.resolve(transport(body)).then(function (res) {
        if (!res || res.ok !== true) throw serverError(res);
        return res;
      }).catch(function (err) {
        // 저장 요청은 같은 요청 번호로 다시 보내도 서버가 중복 없이 처리한다. 일시적인 서버 오류·혼잡이면 자동으로 다시 시도한다.
        var code = err && err.code;
        if (retries > 0 && (code === 'server_error' || code === 'busy')) {
          return new Promise(function (resolve) { setTimeout(resolve, opts.retryDelay === undefined ? 5000 : opts.retryDelay); }).then(function () { return call(body, retries - 1); });
        }
        throw err;
      });
    }
    function remember(id, token) {
      if (id) state.id = id;
      if (token) state.token = token;
      if (state.id && state.token) storage.set({ id: state.id, token: state.token });
    }
    // 붙여넣기(p)·자동입력으로 보이는 한 번에 긴 입력(a)을 항목별로 센다. 저장할 때 서버에 함께 보내 관리자 기록에 남긴다.
    function logInput(key, type, chars) {
      if (!(chars > 0)) return;
      var e = state.inputLog[key] || (state.inputLog[key] = {});
      var pair = e[type] || (e[type] = [0, 0]);
      pair[0] += 1; pair[1] += chars;
    }
    function snapshot(round, savedAt, fields, feedback) {
      return Object.freeze({ round: round, savedAt: savedAt, fields: Object.freeze(Object.assign({}, fields)), feedback: feedback || null });
    }

    function save() {
      if (state.busy) return Promise.reject(new Error('저장 중입니다. 잠시 기다려 주세요.'));
      if (state.status === 'submitted') return Promise.reject(new Error('이미 제출되었습니다.'));
      var round = state.round + 1;
      if (round > 4) return Promise.reject(new Error('최종 저장까지 완료되었습니다. 제출해 주세요.'));
      var fields;
      try { fields = validateFields(state.fields, !!(state.imagePending || state.fields.modelImage)); } catch (err) { return Promise.reject(err); }
      if (round === 1 && !state.id && !state.paperType) return Promise.reject(new Error('학위논문용과 소논문용 중 하나를 선택해 주세요.'));
      if (round === 1 && !state.id && !state.consent) return Promise.reject(new Error('외부 AI 전송 안내를 읽고 동의해 주세요.'));
      var responses = null;
      if (round === 3 || round === 4) {
        try { checkResponses(round - 1, state.responses[round - 1], state.feedback[round - 1]); } catch (err) { return Promise.reject(err); }
        responses = { to: round - 1, items: JSON.parse(JSON.stringify(state.responses[round - 1])) };
      }
      // 시간 초과 뒤 다시 누르면 같은 요청 번호로 보낸다. 서버가 이미 저장했다면 그 결과를 돌려준다.
      if (!state.pending || state.pending.round !== round) state.pending = { round: round, id: requestId() };
      state.busy = true;
      var body = { action: 'save', round: round, fields: fields, id: state.id, token: state.token, consent: state.consent, requestId: state.pending.id };
      var sentLog = JSON.parse(JSON.stringify(state.inputLog)); body.inputLog = sentLog;
      if (responses) body.responses = responses;
      if (round === 1) body.paperType = state.paperType || 'thesis';
      if (state.imagePending) { body.modelImageData = state.imagePending; delete body.fields.modelImage; }
      return call(body, 2)
        .then(function (res) {
          remember(res.id, res.token);
          if (res.modelImage) {
            if (state.imagePending) state.images[res.modelImage] = state.imagePending;
            fields.modelImage = res.modelImage;
          } else delete fields.modelImage;
          state.fields.modelImage = res.modelImage || '';
          state.imagePending = null;
          if (responses) fields._responses = responses;
          state.history.push(snapshot(round, res.savedAt, fields, res.feedback));
          if (res.feedback) state.feedback[round] = res.feedback;
          state.round = round;
          state.pending = null;
          state.inputLog = {}; // 저장된 기록은 서버에 남았으므로 다음 저장부터 새로 센다
          return res;
        }, function (err) {
          remember(err.response && err.response.id, err.response && err.response.token);
          throw err;
        })
        .then(function (res) { state.busy = false; return res; }, function (err) { state.busy = false; throw err; });
    }

    function submit() {
      if (state.round !== 4) return Promise.reject(new Error('3차 피드백을 반영한 최종 저장(4차)을 마친 뒤 제출할 수 있습니다.'));
      if (state.status === 'submitted') return Promise.resolve();
      state.busy = true;
      return call({ action: 'submit', id: state.id, token: state.token }).then(function (res) {
        state.status = res.submission.status;
        state.busy = false;
        return res;
      }, function (err) { state.busy = false; throw err; });
    }

    function clarify(opts) {
      opts = opts || {};
      if (state.busy) return Promise.reject(new Error('처리 중입니다. 잠시 기다려 주세요.'));
      if (state.status === 'submitted') return Promise.reject(new Error('이미 제출되었습니다.'));
      if (state.round < 1 || state.round > 3 || !state.feedback[state.round]) {
        return Promise.reject(new Error('피드백을 받은 1·2·3차 단계에서만 추가 설명을 요청할 수 있습니다.'));
      }
      var seen = {};
      var topics = (Array.isArray(opts.topics) ? opts.topics : []).map(function (t) { return String(t || '').trim(); })
        .filter(function (t) { return t && !seen[t] && (seen[t] = true); });
      if (!topics.length) return Promise.reject(new Error('더 설명이 필요한 부분을 하나 이상 선택해 주세요.'));
      var note = String(opts.note || '').trim().slice(0, 500);
      var targetRound = state.round;
      state.busy = true;
      return call({ action: 'clarify', id: state.id, token: state.token, round: targetRound, topics: topics, note: note }, 1)
        .then(function (res) {
          var fb = state.feedback[targetRound];
          if (fb && res.clarification) {
            fb.clarifications = (fb.clarifications || []).concat([res.clarification]);
          }
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
        return loadImages().then(function () { return true; });
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
      state.responses = { 2: {}, 3: {} };
      state.paperType = (state.history.filter(function (h) { return h.fields && h.fields._type; })[0] || { fields: { _type: 'thesis' } }).fields._type;
      state.history.forEach(function (h) { var r = h.fields && h.fields._responses; if (r && r.items && state.responses[r.to]) state.responses[r.to] = JSON.parse(JSON.stringify(r.items)); });
      // 마지막으로 보낸 내용(실패한 시도 포함)을 편집 칸에 되살린다.
      var latest = revs[revs.length - 1];
      if (latest) state.fields = Object.assign(emptyFields(), latest.fields);
    }

    // 저장본에 들어 있는 연구 모형 그림을 화면·PDF용으로 받아 둔다.
    function loadImages() {
      var ids = {};
      state.history.forEach(function (h) { if (h.fields.modelImage) ids[h.fields.modelImage] = 1; });
      if (state.fields.modelImage) ids[state.fields.modelImage] = 1;
      return Promise.all(Object.keys(ids).filter(function (id) { return !state.images[id]; }).map(function (fileId) {
        return call({ action: 'image', id: state.id, token: state.token, fileId: fileId })
          .then(function (r) { state.images[fileId] = r.dataUrl; }, function () { /* 그림을 못 받아도 글은 그대로 보인다 */ });
      }));
    }

    function reset() {
      storage.remove();
      state.fields = emptyFields(); state.round = 0; state.status = 'draft'; state.id = null; state.token = null;
      state.consent = false; state.history = []; state.feedback = {}; state.pending = null;
      state.imagePending = null; state.images = {}; state.inputLog = {}; state.busy = false; state.responses = { 2: {}, 3: {} }; state.paperType = '';
    }

    return {
      state: state,
      setFields: function (v) { state.fields = Object.assign(emptyFields(), v); },
      setField: function (k, v) { state.fields[k] = v; },
      setConsent: function (v) { state.consent = !!v; },
      setPaperType: function (v) { state.paperType = PAPER_TYPE_LABELS[v] ? v : ''; },
      setResponse: function (to, key, patch) { state.responses[to][key] = Object.assign({}, state.responses[to][key], patch); },
      logInput: logInput,
      setImage: function (dataUrl) { state.imagePending = dataUrl; },
      clearImage: function () { state.imagePending = null; state.fields.modelImage = ''; },
      imageUrl: function () { return state.imagePending || state.images[state.fields.modelImage] || null; },
      save: save, submit: submit, clarify: clarify, resume: resume, reset: reset
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
      get: function (id) {
        return call({ action: 'adminGet', session: state.session, id: id }).then(function (r) {
          // 저장본의 연구 모형 그림을 받아 둔다(화면·PDF용)
          var ids = {}; r.images = {};
          (r.revisions || []).forEach(function (v) { if (v.fields && v.fields.modelImage) ids[v.fields.modelImage] = 1; });
          return Promise.all(Object.keys(ids).map(function (fileId) {
            return call({ action: 'image', session: state.session, id: id, fileId: fileId }).then(function (x) { r.images[fileId] = x.dataUrl; }, function () {});
          })).then(function () { state.detail = r; return r; });
        });
      },
      logout: function () { state.session = null; if (opts.session) opts.session.remove(); }
    };
  }

  // ---------- PDF 문서 구성 ----------
  // 최종본은 논문 형식(1. 서론 1-1~1-4, 2. 이론적 근거, 3. 연구방법, 4. 기대시사점)으로 이어 쓴다.
  var PAPER = [
    { h2: '1. 서론' }, { h3: '1-1. 연구의 문제의식', key: 'problem' }, { h3: '1-2. 연구의 목적', key: 'purpose' },
    { h3: '1-3. 연구 모형', key: 'model' }, { h3: '1-4. 연구 문제', key: 'rq' },
    { h2: '2. 이론적 근거', key: 'theory' }, { h2: '3. 연구방법', key: 'method' }, { h2: '4. 기대시사점', key: 'implications' }
  ];
  function paragraphs(text, type) {
    return String(text || '').split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean).map(function (t) { return { type: type || 'p', text: t }; });
  }
  function imageBlock(fields, images) {
    var src = fields.modelImage && images && images[fields.modelImage];
    return src ? [{ type: 'img', src: src, text: '연구 모형 그림' }] : [];
  }
  function paperBlocks(fields, images) {
    var blocks = [];
    PAPER.forEach(function (s) {
      blocks.push(s.h2 ? { type: 'h2', text: s.h2 } : { type: 'h3', text: s.h3 });
      if (s.key === 'model') blocks = blocks.concat(imageBlock(fields, images));
      if (s.key) blocks = blocks.concat(paragraphs(fields[s.key]));
    });
    return blocks;
  }
  function fieldBlocks(fields, images) {
    var blocks = [];
    FIELDS.forEach(function (f) {
      blocks.push({ type: 'sq', text: f.label });
      if (f.key === 'model') blocks = blocks.concat(imageBlock(fields, images));
      blocks = blocks.concat(paragraphs(fields[f.key], 'ci'));
    });
    return blocks;
  }
  function feedbackBlocks(feedback) {
    var blocks = [{ type: 'note', text: AI_NOTICE }];
    if (feedback.searchNote) blocks.push({ type: 'note', text: '문헌 확인 절차: ' + feedback.searchNote });
    if (isRound3(feedback)) {
      if (feedback.summary) blocks.push({ type: 'ci', text: '종합: ' + feedback.summary });
      if (feedback.revisions && feedback.revisions.length) {
        blocks.push({ type: 'sq', text: '1·2차 피드백 이후 수정한 점' });
        feedback.revisions.forEach(function (r) { blocks.push({ type: 'dash', text: r.field + ': ' + r.change + (r.reflected ? ' (' + r.reflected + ')' : '') }); });
      }
      round3Keys(feedback).forEach(function (k) {
        var item = feedback.items && feedback.items[k];
        if (!item) return;
        if (feedback.kind === 'constructive') {
          blocks.push({ type: 'sq', text: item.label });
          if (item.assessment) blocks.push({ type: 'ci', text: item.assessment });
          (item.strengths || []).forEach(function (x) { blocks.push({ type: 'dash', text: '잘된 점: ' + x }); });
          (item.next || []).forEach(function (x) { blocks.push({ type: 'dash', text: '다음 단계: ' + x }); });
          return;
        }
        blocks.push({ type: 'sq', text: item.label + ' · ' + (SEVERITY_LABELS[item.severity] || '') });
        (item.evidence || []).forEach(function (e) { blocks.push({ type: 'ci', text: '원고에서 확인한 문구(' + e.label + '): “' + e.quote + '”' }); });
        if (item.finding) blocks.push({ type: 'ci', text: item.finding });
        if (item.consequence) blocks.push({ type: 'ci', text: '이대로 제출할 경우: ' + item.consequence });
        (item.fixes || []).forEach(function (s) { blocks.push({ type: 'dash', text: s }); });
      });
      if (feedback.rebuttals && feedback.rebuttals.length) {
        blocks.push({ type: 'sq', text: '2차 피드백 불수용(반박)에 대한 검토' });
        feedback.rebuttals.forEach(function (x) {
          blocks.push({ type: 'ci', text: x.label + ' · ' + (VERDICT_LABELS[x.verdict] || '') + ': ' + x.review });
          (x.develop || []).forEach(function (d) { blocks.push({ type: 'dash', text: d }); });
        });
      }
      return blocks;
    }
    FEEDBACK_FIELDS.forEach(function (f) {
      var item = feedback.items && feedback.items[f.key];
      if (!item || isRound3(feedback)) return;
      blocks.push({ type: 'sq', text: f.label });
      if (feedback.kind === 'socratic') {
        if (item.anchor) blocks.push({ type: 'ci', text: '원고에서 확인한 문구: “' + item.anchor + '”' });
        if (item.focus) blocks.push({ type: 'ci', text: '생각해 볼 지점: ' + item.focus });
        (item.questions || []).forEach(function (q) { blocks.push({ type: 'dash', text: q }); });
      } else {
        (item.checks || []).forEach(function (c) { blocks.push({ type: 'dash', text: '[점검] ' + c.point + ' → ' + c.finding }); });
        blocks.push({ type: 'ci', text: '종합: ' + (item.status === 'withheld' ? '[판단 보류] ' : '') + item.assessment });
        (item.suggestions || []).forEach(function (s) { blocks.push({ type: 'dash', text: s }); });
        (item.sources || []).forEach(function (s) { blocks.push({ type: 'note', text: citationText(s) + ' — 근거 범위: ' + s.scope + '. ' + s.basis }); });
      }
    });
    return blocks;
  }
  function citationText(s) {
    return '[' + s.n + '] ' + (s.authors || []).slice(0, 6).join(', ') + (s.authors && s.authors.length > 6 ? ' 외' : '') +
      ' (' + s.year + '). ' + s.title + '. ' + s.journal + '. https://doi.org/' + s.doi;
  }
  // APA 7판 참고문헌. 서지정보는 서버가 Crossref에서 확인한 값이며, 학술지명과 권은 기울임으로 표시한다.
  function apaAuthor(a) {
    var initials = String(a.given || '').split(/\s+/).filter(Boolean).map(function (g) {
      return g.split('-').map(function (x) { return x.charAt(0).toUpperCase() + '.'; }).join('-');
    }).join(' ');
    return a.family + (initials ? ', ' + initials : '');
  }
  function apaAuthors(list) {
    var names = (list || []).map(apaAuthor);
    if (names.length > 20) return names.slice(0, 19).join(', ') + ', . . . ' + names[names.length - 1];
    if (names.length < 2) return names[0] || '';
    return names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1];
  }
  function clean(t) {
    return String(t || '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  }
  function apaParts(s) {
    var authors = s.apaAuthors && s.apaAuthors.length ? apaAuthors(s.apaAuthors) : (s.authors || []).join(', ');
    var title = clean(s.title).replace(/[.\s]+$/, '');
    var parts = [{ text: authors + ' (' + s.year + '). ' + title + (/[?!]$/.test(title) ? ' ' : '. ') }, { text: clean(s.journal), em: true }];
    if (s.volume) { parts.push({ text: ', ' }); parts.push({ text: s.volume, em: true }); }
    parts.push({ text: (s.issue ? '(' + s.issue + ')' : '') + (s.page ? ', ' + s.page.replace(/-/g, '–') : '') + '. https://doi.org/' + s.doi });
    return parts;
  }
  function apaText(s) {
    return apaParts(s).map(function (p) { return p.text; }).join('');
  }
  function recommendedBlocks(list) {
    var blocks = [{ type: 'h2', text: '참고문헌: 추천 논문 ' + list.length + '편' },
      { type: 'note', text: '2차 DrS comments 단계에서 OpenAlex 검색 → SSCI 등재 목록(ISSN) 대조 → Crossref DOI 확인을 통과한 논문 가운데 AI가 연구 주제와의 관련성 순으로 고른 목록입니다. 추천 이유는 초록과 서지정보에 근거하며 원문은 확인하지 않았습니다.' }];
    list.forEach(function (s) {
      blocks.push({ type: 'ref', parts: apaParts(s), text: apaText(s) });
      if (s.reason) blocks.push({ type: 'note', text: '추천 이유: ' + s.reason });
    });
    return blocks;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.';
  }
  // 제목 칸에 본문 첫머리까지 붙여 넣은 경우 제목 부분만 보여 준다(저장된 원문은 그대로 둔다).
  function shortTitle(title, fields) {
    var t = String(title || '').replace(/\s+/g, ' ').trim(), cut = -1;
    ['problem', 'purpose'].forEach(function (k) {
      var head = String((fields && fields[k]) || '').replace(/\s+/g, ' ').trim().slice(0, 12);
      var i = head.length >= 6 ? t.indexOf(head) : -1;
      if (i > 0 && (cut < 0 || i < cut)) cut = i;
    });
    if (cut < 0) {
      var end = t.search(/다\.(\s|$)/);
      if (end > 0) {
        var re = /(분석|연구|탐색|검증|효과|영향|역할|관계|비교|개발|설계|적용)(?=[가-힣])/g, m;
        while ((m = re.exec(t.slice(0, end)))) cut = m.index + m[1].length;
      }
    }
    return (cut > 0 ? t.slice(0, cut) : t).trim();
  }
  function pdfDocument(record, opts) {
    opts = opts || {};
    var oks = record.revisions.filter(function (r) { return r.status === 'ok'; }).sort(function (a, b) { return a.round - b.round; });
    var final = oks[oks.length - 1];
    var sub = record.submission;
    var doc = { title: final ? shortTitle(final.fields.title, final.fields) : '연구계획서',
      subtitle: '연구계획서 · ' + sub.name + (final ? ' · ' + final.round + '차 저장본' : '') + (sub.submittedAt ? ' · 제출 ' + sub.submittedAt : ''),
      date: today(), blocks: final ? paperBlocks(final.fields, record.images) : [] };
    var lit = oks.filter(function (r) { return r.feedback && r.feedback.recommended && r.feedback.recommended.length; }).pop();
    if (lit) doc.blocks = doc.blocks.concat(recommendedBlocks(lit.feedback.recommended));
    if (opts.history !== false && oks.length) {
      doc.blocks.push({ type: 'h2', text: '부록. 연구계획 발전 과정', pageBreak: true });
      doc.blocks.push({ type: 'note', text: '최초 작성본 → 1차 피드백 → 1차 수정본 → 2차 피드백 → 2차 수정본 → 3차 피드백 → 최종 수정본 순으로 수록했습니다. 각 작성본은 해당 차수에 저장한 원문이며, 피드백은 AI가 생성한 참고 의견입니다.' });
      var n = 0;
      oks.forEach(function (r) {
        var label = r.round === 1 ? '최초 작성본 (1차 저장)' : r.round === 2 ? '1차 피드백 반영 수정본 (2차 저장)' : r.round === 3 ? '2차 피드백 반영 수정본 (3차 저장)' : '3차 피드백 반영 최종 수정본 (최종 저장)';
        doc.blocks.push({ type: 'h3', text: (++n) + '. ' + label + ' · ' + r.savedAt, pageBreak: n > 1 });
        var answered = r.fields && r.fields._responses;
        if (answered && answered.items) {
          doc.blocks.push({ type: 'sq', text: answered.to + '차 피드백에 대한 수용·불수용' });
          responseLines(answered).forEach(function (l) { doc.blocks.push({ type: 'ci', text: l.label + ': ' + l.text }); });
        }
        doc.blocks = doc.blocks.concat(fieldBlocks(r.fields, record.images));
        if (r.feedback) {
          doc.blocks.push({ type: 'h3', text: (++n) + '. ' + r.round + '차 피드백 · DrS comments (AI 생성)' });
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
  // 연구 모형 그림 파일 → data URL. 긴 변이 2000px를 넘거나 2MB가 넘으면 줄여서 보낸다.
  var IMAGE_TYPES = /^image\/(png|jpeg|webp|gif)$/;
  function readImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !IMAGE_TYPES.test(file.type)) { reject(new Error('연구 모형 그림은 PNG·JPG·WEBP·GIF 파일만 넣을 수 있습니다.')); return; }
      if (file.size > 40 * 1024 * 1024) { reject(new Error('그림 파일이 너무 큽니다(40MB 이하).')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('그림 파일을 읽지 못했습니다.')); };
      reader.onload = function () {
        var src = reader.result, img = new Image();
        img.onerror = function () { reject(new Error('그림 파일을 열지 못했습니다.')); };
        img.onload = function () {
          // AI가 받을 수 있는 크기(긴 변 1600px, 약 1.5MB)로 맞춘다. 큰 그림은 줄이고, 그래도 크면 JPEG 품질을 낮춘다.
          var LIMIT = 1.5 * 1024 * 1024, bytes = function (u) { return Math.floor((u.length - u.indexOf(',') - 1) * 0.75); };
          var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) { reject(new Error('그림 파일을 열지 못했습니다.')); return; }
          if (Math.max(w, h) <= max && file.size <= LIMIT && /png|jpeg/.test(file.type)) { resolve(src); return; }
          var png = /png|gif/.test(file.type), scale = Math.min(1, max / Math.max(w, h));
          for (var tries = 0; tries < 6; tries++) {
            var c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
            var g = c.getContext('2d');
            g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // 투명 배경은 흰색으로
            g.drawImage(img, 0, 0, c.width, c.height);
            if (png) { var p = c.toDataURL('image/png'); if (bytes(p) <= LIMIT) { resolve(p); return; } }
            for (var q = 0.9; q >= 0.6; q -= 0.1) { var j = c.toDataURL('image/jpeg', q); if (bytes(j) <= LIMIT) { resolve(j); return; } }
            scale *= 0.75;
          }
          reject(new Error('그림이 너무 커서 줄이지 못했습니다. 화면을 캡처한 작은 그림으로 다시 넣어 주세요.'));
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }
  function imageFrom(list) {
    var files = [].slice.call((list && (list.files || list.items)) || []);
    for (var i = 0; i < files.length; i++) {
      var f = files[i].kind === 'file' ? files[i].getAsFile() : files[i];
      if (f && /^image\//.test(f.type)) return f;
    }
    return null;
  }

  function savePdf(record, opts, status) {
    if (!window.ResearchHelpPDF) { status('PDF 도구를 불러오지 못했습니다.', true); return Promise.resolve(); }
    status('PDF를 만드는 중입니다…');
    return window.ResearchHelpPDF.save(pdfDocument(record, opts), pdfFileName(record))
      .then(function () { status('PDF를 저장했습니다.'); }, function (err) { status((err && err.message) || 'PDF를 만들지 못했습니다.', true); });
  }

  // 화면에서도 최종 작성문을 서론·이론·방법·시사점 순서의 연구계획서로 보여 준다.
  function proposalPreview(record) {
    var doc = pdfDocument(record, { history: false });
    var article = el('article', { class: 'rh-final-plan', 'aria-label': '최종 연구계획서' }, [
      el('p', { class: 'rh-final-kicker', text: '최종 연구계획서' }),
      el('h2', { class: 'rh-final-title', text: doc.title }),
      el('p', { class: 'rh-final-meta', text: doc.subtitle })
    ]);
    doc.blocks.forEach(function (block) {
      var node;
      if (block.type === 'img') {
        node = el('figure', {}, [el('img', { src: block.src, alt: block.text || '연구 모형' })]);
      } else if (block.type === 'ref') {
        node = el('p', { class: 'rh-final-ref' }, (block.parts || []).map(function (part) {
          return part.em ? el('em', { text: part.text }) : document.createTextNode(part.text);
        }));
      } else {
        node = el(block.type === 'h2' ? 'h3' : block.type === 'h3' ? 'h4' : 'p', {
          class: block.type === 'note' ? 'rh-note' : 'rh-final-text', text: block.text
        });
      }
      article.appendChild(node);
    });
    return article;
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
      if (item.anchor) wrap.appendChild(el('p', {}, [el('strong', { text: '원고에서 확인한 문구 ' }), '“' + item.anchor + '”']));
      if (item.focus) wrap.appendChild(el('p', {}, [el('strong', { text: '생각해 볼 지점 ' }), item.focus]));
      wrap.appendChild(el('ol', {}, (item.questions || []).map(function (q) { return el('li', { text: q }); })));
      return wrap;
    }
    if (item.checks && item.checks.length) {
      wrap.appendChild(el('dl', { class: 'rh-checks' }, [].concat.apply([], item.checks.map(function (c) {
        return [el('dt', { text: c.point }), el('dd', { text: c.finding })];
      }))));
    }
    if (item.status === 'withheld') wrap.appendChild(el('span', { class: 'rh-withheld', text: '판단 보류' }));
    wrap.appendChild(el('p', {}, [el('strong', { text: '종합 ' }), item.assessment]));
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

  // 피드백 한 항목에 대한 수용·불수용. onChange가 없으면 저장된 응답을 읽기 전용으로 보여 준다.
  var responseSeq = 0;
  function responseNode(to, key, current, onChange) {
    current = current || {};
    var box = el('div', { class: 'rh-response' + (current.d === 'reject' ? ' is-reject' : current.d === 'accept' ? ' is-accept' : '') });
    if (!onChange) {
      if (!current.d) return null;
      box.appendChild(el('p', {}, [el('strong', { text: '나의 응답 ' }), current.d === 'reject' ? '불수용' : '수용']));
      if (current.d === 'reject') box.appendChild(el('p', { class: 'rh-response-reason', text: current.r }));
      return box;
    }
    var name = 'rh-resp-' + to + '-' + key + '-' + (++responseSeq);
    var reason = el('textarea', { rows: '4', maxlength: '2000', placeholder: '이 피드백을 수용하지 않는 이유를 본인의 논리로 적어 주세요. 예: 연구의 범위, 자료의 조건, 이론적 판단 등', 'aria-label': responseLabel(to, key) + ' 불수용 이유',
      oninput: function (e) { onChange({ r: e.target.value }); } }, [current.r || '']);
    var reasonWrap = el('div', { class: 'rh-response-why' }, [
      el('label', { text: '수용하지 않는 이유(반박)' }), reason,
      el('span', { class: 'rh-hint', text: to === 2 ? '이 반박은 3차 점검에서 타당성을 검토하고, 입장을 유지하면서 발전시키는 방법을 함께 제시합니다.' : '반박 내용은 최종 저장본과 PDF에 함께 남습니다.' })
    ]);
    reasonWrap.hidden = current.d !== 'reject';
    function pick(d) {
      onChange({ d: d });
      reasonWrap.hidden = d !== 'reject';
      box.className = 'rh-response ' + (d === 'reject' ? 'is-reject' : 'is-accept');
      if (d === 'reject') reason.focus();
    }
    box.appendChild(el('fieldset', { class: 'rh-response-pick' }, [
      el('legend', { text: to + '차 피드백 반영 여부' }),
      el('label', {}, [el('input', { type: 'radio', name: name, value: 'accept', checked: current.d === 'accept', onchange: function () { pick('accept'); } }), ' 수용']),
      el('label', {}, [el('input', { type: 'radio', name: name, value: 'reject', checked: current.d === 'reject', onchange: function () { pick('reject'); } }), ' 불수용'])
    ]));
    box.appendChild(reasonWrap);
    return box;
  }
  function responsesSummary(res) {
    var lines = responseLines(res);
    if (!lines.length) return null;
    return el('div', { class: 'rh-response-summary' }, [el('strong', { text: res.to + '차 피드백에 대한 수용·불수용' }),
      el('ul', {}, lines.map(function (l) { return el('li', { class: l.reject ? 'is-reject' : '' }, [el('b', { text: l.label + ' ' }), l.text]); }))]);
  }

  // 3차 피드백: 항목별이 아니라 세 가지 핵심 정합성 점검으로 보여 준다.
  function criticalNode(feedback, opts) {
    opts = opts || {};
    var constructive = feedback.kind === 'constructive';
    var box = el('div', { class: 'rh-comments rh-critic' + (constructive ? ' is-constructive' : '') }, [
      el('div', { class: 'rh-comments-head' }, [el('strong', { text: constructive ? 'DrS comments · 종합 의견 (소논문)' : 'DrS comments · 핵심 정합성 점검' }), el('span', { class: 'rh-ai-badge', text: 'AI 생성 · 3차' })])
    ]);
    if (feedback.summary) box.appendChild(el('p', { class: 'rh-critic-summary' }, [el('strong', { text: '종합 ' }), feedback.summary]));
    if (feedback.revisions && feedback.revisions.length) {
      box.appendChild(el('section', { class: 'rh-comment rh-revised' }, [el('h4', { text: '1·2차 피드백 이후 수정한 점' }),
        el('ul', {}, feedback.revisions.map(function (r) { return el('li', {}, [el('b', { text: r.field + ' ' }), r.change, r.reflected ? el('span', { class: 'rh-hint', text: ' · ' + r.reflected }) : null]); }))]));
    }
    round3Keys(feedback).forEach(function (k) {
      var item = feedback.items && feedback.items[k];
      if (!item) return;
      if (constructive) {
        var cc = el('section', { class: 'rh-comment rh-critic-card is-constructive' }, [el('h4', { text: item.label })]);
        if (item.assessment) cc.appendChild(el('p', { text: item.assessment }));
        if (item.strengths && item.strengths.length) cc.appendChild(el('div', { class: 'rh-good' }, [el('strong', { text: '잘된 점' }), el('ul', {}, item.strengths.map(function (x) { return el('li', { text: x }); }))]));
        if (item.next && item.next.length) cc.appendChild(el('div', { class: 'rh-next' }, [el('strong', { text: '다음 단계' }), el('ul', {}, item.next.map(function (x) { return el('li', { text: x }); }))]));
        if (opts.respond) { var rc = opts.respond(k); if (rc) cc.appendChild(rc); }
        box.appendChild(cc);
        return;
      }
      var card = el('section', { class: 'rh-comment rh-critic-card is-' + item.severity }, [
        el('h4', {}, [item.label + ' ', el('span', { class: 'rh-sev', text: SEVERITY_LABELS[item.severity] || '' })])
      ]);
      (item.evidence || []).forEach(function (e) { card.appendChild(el('p', { class: 'rh-quote' }, [el('strong', { text: e.label + ' ' }), '“' + e.quote + '”'])); });
      if (item.finding) card.appendChild(el('p', { text: item.finding }));
      if (item.consequence) card.appendChild(el('p', {}, [el('strong', { text: '이대로 제출하면 ' }), item.consequence]));
      if (item.fixes && item.fixes.length) card.appendChild(el('ul', {}, item.fixes.map(function (f) { return el('li', { text: f }); })));
      if (opts.respond) { var r = opts.respond(k); if (r) card.appendChild(r); }
      box.appendChild(card);
    });
    if (feedback.rebuttals && feedback.rebuttals.length) {
      var reb = el('section', { class: 'rh-comment rh-rebuttals' }, [el('h4', { text: '2차 피드백 불수용(반박)에 대한 검토' }),
        el('p', { class: 'rh-hint', text: '불수용한 입장을 유지하는 것을 전제로, 반박의 타당성과 더 설득력 있게 만드는 방법을 정리했습니다.' })]);
      feedback.rebuttals.forEach(function (x) {
        reb.appendChild(el('div', { class: 'rh-rebuttal is-' + x.verdict }, [
          el('p', {}, [el('strong', { text: x.label + ' ' }), el('span', { class: 'rh-sev', text: VERDICT_LABELS[x.verdict] || '' })]),
          el('p', { class: 'rh-quote', text: '나의 반박: “' + x.rebuttal + '”' }),
          el('p', { text: x.review }),
          x.develop && x.develop.length ? el('ul', {}, x.develop.map(function (d) { return el('li', { text: d }); })) : null
        ]));
      });
      box.appendChild(reb);
    }
    return box;
  }

  function mountStudent(rootEl) {
    var endpoint = rootEl.getAttribute('data-endpoint') || '';
    var app = createController({
      transport: endpoint ? function (body) { return post(endpoint, body, body.round === 2 ? 330000 : 200000); } : null,
      storage: webStorage('localStorage', STORE_KEY)
    });
    var statusEl, busyLabel = '', clarifyTopics = {}, clarifyNote = '', clarifying = false;
    var CLARIFY_OPTIONS = [
      { key: 'purpose', label: '연구의 목적' },
      { key: 'theory', label: '이론적 근거' },
      { key: 'method', label: '연구 방법' },
      { key: 'problem', label: '연구의 문제의식' },
      { key: 'model', label: '연구 모형' },
      { key: 'rq', label: 'RQ' },
      { key: 'implications', label: '기대시사점' }
    ];

    function status(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = 'rh-status' + (isError ? ' is-error' : '') + (msg ? '' : ' is-empty');
    }
    function record() {
      return { submission: { id: app.state.id || 'draft', name: app.state.fields.name, round: app.state.round, status: app.state.status, submittedAt: '' },
        revisions: app.state.history.map(function (h) { return { round: h.round, savedAt: h.savedAt, status: 'ok', fields: h.fields, feedback: h.feedback }; }),
        images: app.state.images };
    }

    // 붙여넣기·끌어다 놓기·한 번에 긴 입력을 항목별로 센다(막지는 않고 기록으로 남긴다)
    function trackInput(node, key) {
      if (!node || node.readOnly) return;
      var prev = node.value.length, pasted = false;
      node.addEventListener('paste', function (e) {
        var t = (e.clipboardData && e.clipboardData.getData('text')) || '';
        if (t.length) { app.logInput(key, 'p', t.length); pasted = true; }
      });
      node.addEventListener('drop', function (e) {
        var t = (e.dataTransfer && e.dataTransfer.getData('text')) || '';
        if (t.length) { app.logInput(key, 'p', t.length); pasted = true; }
      });
      node.addEventListener('input', function (e) {
        var len = node.value.length, d = len - prev; prev = len;
        if (pasted) { pasted = false; return; }
        var type = e.inputType || '';
        if (type === 'insertCompositionText' || /^insertFrom(Paste|Drop)/.test(type)) return;
        if (d >= AUTO_INPUT_MIN) app.logInput(key, 'a', d);
      });
    }
    function render() {
      var s = app.state, locked = s.round >= 4 || s.status === 'submitted' || s.busy;
      var stepIndex = s.status === 'submitted' ? 5 : s.round;
      rootEl.innerHTML = '';
      rootEl.appendChild(el('ol', { class: 'rh-steps', 'aria-label': '진행 단계' }, STEP_LABELS.map(function (label, i) {
        return el('li', { class: i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : '', 'aria-current': i === stepIndex ? 'step' : false, text: label });
      })));
      if (!endpoint) rootEl.appendChild(el('p', { class: 'rh-status is-error', text: '서버 연결 준비 중입니다. 지금은 작성 내용을 저장할 수 없습니다.' }));
      rootEl.appendChild(el('div', { class: 'rh-rule', role: 'note' }, [el('strong', { class: 'rh-rule-title', text: '실습 시 주의사항' }), el('p', { class: 'rh-rule-text' }, ['타이핑을 하면서 여러분들의 생각이 더 잘 정리 될 수 있습니다. 마치 노트 필기 하는 것과 같은 원리로 보면 됩니다. ', el('mark', { text: '가급적 본인의 인지적 사고를 통해서 생각하고 AI 에게 도움을 받는 것을 추천합니다.' })])]));
      rootEl.appendChild(el('p', { class: 'rh-notice', text: AI_NOTICE }));
      if (s.id && s.status !== 'submitted') {
        rootEl.insertBefore(el('div', { class: 'rh-new-plan-actions' }, [
          el('button', { type: 'button', class: 'rh-btn rh-new-plan-btn', onclick: function () {
            if (window.confirm('이 브라우저의 이어쓰기 기록을 지우고 새 연구계획서를 작성할까요? 서버에 저장된 기존 기록은 삭제되지 않습니다.')) {
              app.reset(); clearModelDraft(); render(); status('새 연구계획서를 작성할 수 있습니다.');
            }
          } }, [el('span', { 'aria-hidden': 'true', text: '+' }), '새 연구계획서 작성하기'])
        ]), rootEl.firstChild);
      }
      var guide = s.round === 0 ? '처음 작성한 내용을 1차 저장하면 오른쪽에 피드백이 나타납니다. 이후에도 왼쪽의 기존 글을 이어서 수정합니다.'
        : s.round === 1 ? '1차 피드백을 반영하는 단계입니다. 오른쪽 의견을 보면서 왼쪽에 남아 있는 최초 작성문을 수정한 뒤 2차 저장해 주세요.'
        : s.round === 2 ? '2차 피드백을 반영하는 단계입니다. 오른쪽 의견마다 수용·불수용을 선택하고, 불수용하면 그 이유(반박)를 적어 주세요. 수용한 의견은 왼쪽의 1차 수정본에 반영한 뒤 3차 저장합니다. 반박은 3차 점검에서 타당성을 검토받습니다.'
        : s.round === 3 ? '3차 피드백을 반영하는 마지막 단계입니다. 위의 점검 의견마다 수용·불수용을 선택하고, 불수용하면 그 이유(반박)를 적어 주세요. 수용한 의견은 왼쪽 수정본에 반영한 뒤 최종 저장합니다. 최종 저장을 마쳐야 제출할 수 있습니다.'
        : '최종본이 연구계획서 형식으로 정리되었습니다. PDF에는 최종 연구계획서와 최초 작성본·세 차례의 피드백·수정본이 모두 포함됩니다.';
      rootEl.appendChild(el('p', { class: 'rh-revision-guide', text: guide }));
      if (s.round === 0 && !s.id) {
        rootEl.appendChild(el('fieldset', { class: 'rh-type' }, [
          el('legend', { text: '어떤 논문을 준비하나요?' }),
          el('label', { class: 'rh-type-opt' }, [el('input', { type: 'radio', name: 'rh-type', value: 'thesis', checked: s.paperType === 'thesis', onchange: function () { app.setPaperType('thesis'); } }),
            el('span', {}, [el('strong', { text: '학위논문용' }), el('span', { class: 'rh-hint', text: '3차 피드백은 학위논문 심사 기준으로 핵심 결함을 엄격하게 점검합니다.' })])]),
          el('label', { class: 'rh-type-opt' }, [el('input', { type: 'radio', name: 'rh-type', value: 'article', checked: s.paperType === 'article', onchange: function () { app.setPaperType('article'); } }),
            el('span', {}, [el('strong', { text: '소논문용(학술지 논문)' }), el('span', { class: 'rh-hint', text: '3차 피드백은 1·2차 피드백과 수정 과정을 종합해 논리성·이론적 정합성·방법의 타당성 중심으로 건설적인 의견을 드립니다.' })])])
        ]));
        rootEl.appendChild(el('label', { class: 'rh-consent' }, [
          el('input', { type: 'checkbox', checked: s.consent, onchange: function (e) { app.setConsent(e.target.checked); } }),
          el('span', { text: AI_CONSENT || '1·2·3차 저장 시 이름을 제외한 연구 내용이 피드백 생성을 위해 외부 AI 서비스(Google Gemini API 무료 등급)로 전송되는 것에 동의합니다. 무료 등급 약관에 따라 Google이 전송 내용을 서비스 개선에 사용할 수 있고 사람 검토자가 읽을 수 있으므로, 민감한 개인정보나 공개되면 안 되는 내용은 적지 마세요. 이름과 작성 내용은 연구실의 비공개 저장소에 보관되며 공개 블로그에 게시되지 않습니다.' })
        ]));
      }

      if (s.id && s.paperType) rootEl.appendChild(el('p', { class: 'rh-type-badge', text: '논문 유형: ' + PAPER_TYPE_LABELS[s.paperType] }));
      var nameField = FIELDS[0];
      rootEl.appendChild(el('div', { class: 'rh-name' }, [
        el('label', { for: 'rh-name', text: nameField.label }),
        el('input', { id: 'rh-name', type: 'text', maxlength: String(nameField.max), autocomplete: 'name', value: s.fields.name, readonly: locked,
          oninput: function (e) { app.setField('name', e.target.value); } })
      ]));
      trackInput(rootEl.querySelector('#rh-name'), 'name');

      var latest = s.feedback[2] || s.feedback[1] || null;
      var latestRound = s.feedback[2] ? 2 : 1;
      if (s.round >= 4) rootEl.appendChild(proposalPreview(record()));
      var canRespond = s.status !== 'submitted' && !s.busy;
      function respond(to, key) {
        var editable = canRespond && s.round === to;
        return responseNode(to, key, s.responses[to][key], editable ? function (patch) { app.setResponse(to, key, patch); } : null);
      }
      if (s.feedback[3]) rootEl.appendChild(criticalNode(s.feedback[3], { respond: function (k) { return respond(3, k); } }));
      var grid = el('div', { class: 'rh-grid' + (latest ? ' has-comments' : '') });
      if (latest) grid.appendChild(el('div', { class: 'rh-grid-head', 'aria-hidden': 'true' }, [el('span', { text: s.round >= 4 ? '내가 작성한 내용 (최종 저장본)' : '내가 작성한 내용 (이 글을 이어서 수정)' }), el('span', { text: 'DrS comments · AI 생성 ' + latestRound + '차' })]));
      FEEDBACK_FIELDS.forEach(function (f) {
        var counter = el('span', { class: 'rh-count', text: s.fields[f.key].length + ' / ' + f.max });
        var mine = el('div', { class: 'rh-mine' }, [
          el('label', { for: 'rh-' + f.key, text: f.label }),
          f.hint ? el('span', { class: 'rh-hint', text: f.hint }) : null,
          el('textarea', { id: 'rh-' + f.key, rows: f.key === 'title' ? '2' : '6', maxlength: String(f.max), readonly: locked,
            oninput: function (e) { app.setField(f.key, e.target.value); counter.textContent = e.target.value.length + ' / ' + f.max; } }, [s.fields[f.key]]),
          counter
        ]);
        trackInput(mine.querySelector('textarea'), f.key);
        if (f.key === 'model') {
          var textarea = mine.querySelector('textarea');
          var explanation = el('section', { class: 'rh-model-section', 'aria-label': '연구 모형 설명' });
          var modelLabel = mine.querySelector('label');
          modelLabel.textContent = '2. 연구 모형 설명';
          textarea.setAttribute('placeholder', '예: X → M → Y는 매개 경로입니다. W는 X → M 관계를 조절합니다. 각 화살표와 선 종류의 의미, 이론적 근거를 설명해 주세요.');
          explanation.appendChild(modelLabel);
          explanation.appendChild(el('p', { class: 'rh-hint', text: '변수의 역할, 화살표의 출발·도착점, 매개·조절 관계, 실선·점선의 의미를 설명합니다. 그림과 설명을 함께 검토합니다.' }));
          explanation.appendChild(textarea);
          explanation.appendChild(counter);
          mine.insertBefore(modelFigureSection(locked), mine.firstChild);
          mine.insertBefore(el('h3', { text: '연구 모형' }), mine.firstChild);
          mine.appendChild(explanation);
          if (!locked) {
            // 글 칸에 그림을 붙여 넣으면 그림으로 넣는다(글 붙여넣기는 그대로)
            textarea.addEventListener('paste', function (e) {
              var file = imageFrom(e.clipboardData);
              if (file) { e.preventDefault(); takeImage(file); }
            });
            ['dragover', 'drop'].forEach(function (type) {
              mine.addEventListener(type, function (e) {
                if (!e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
                e.preventDefault();
                if (type === 'drop') { var file = imageFrom(e.dataTransfer); if (file) takeImage(file); else status('그림 파일(PNG·JPG·WEBP·GIF)을 넣어 주세요.', true); }
              });
            });
          }
        }
        var row = el('section', { class: 'rh-row', 'aria-label': f.label }, [mine]);
        if (latest) {
          var c = commentsNode(latest, latestRound);
          c.appendChild(itemNode(latest, f.key));
          if (latestRound === 2 && latest.items && latest.items[f.key]) { var rn = respond(2, f.key); if (rn) c.appendChild(rn); }
          if (latestRound === 2 && s.feedback[1]) {
            c.appendChild(el('details', { class: 'rh-earlier' }, [el('summary', { text: '1차 질문 다시 보기' }), itemNode(s.feedback[1], f.key)]));
          }
          row.appendChild(c);
        }
        grid.appendChild(row);
      });
      if (s.round >= 4) {
        rootEl.appendChild(el('details', { class: 'rh-saved-editor' }, [el('summary', { text: '작성 항목과 1·2차 피드백 다시 보기' }), grid]));
      } else rootEl.appendChild(grid);
      if (latest && latest.searchNote) rootEl.appendChild(el('p', { class: 'rh-note', text: '문헌 확인 절차: ' + latest.searchNote + ' 문헌 근거는 초록과 서지정보 범위에서만 사용했으며, 원문 내용은 직접 확인해 주세요.' }));
      if (s.round >= 1 && s.round <= 3 && s.status !== 'submitted' && s.feedback[s.round]) {
        rootEl.appendChild(clarifySection(s.round, s.feedback[s.round], s.busy, endpoint));
      }

      var actions = el('div', { class: 'rh-actions' });
      if (s.status === 'submitted') {
        actions.appendChild(el('p', { class: 'rh-done', text: '제출이 완료되었습니다. 감사합니다.' }));
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn', onclick: function () { savePdf(record(), {}, status); }, text: 'PDF 다운로드' }));
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn primary', onclick: function () {
          if (window.confirm('새 연구계획서를 작성할까요? 기존 제출물은 서버에 보존됩니다. 현재 제출물의 PDF가 필요하면 먼저 다운로드해 주세요.')) {
            app.reset(); clearModelDraft(); render(); status('새 연구계획서를 작성할 수 있습니다.');
          }
        }, text: '새 연구계획서 작성' }));
      } else if (s.round >= 4) {
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn', onclick: function () { savePdf(record(), {}, status); }, text: 'PDF 다운로드' }));
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn primary', disabled: s.busy, onclick: doSubmit, text: s.busy ? '제출 중…' : '제출' }));
      } else {
        var label = s.round === 3 ? '최종 저장' : (s.round + 1) + '차 저장';
        actions.appendChild(el('button', { type: 'button', class: 'rh-btn primary', disabled: s.busy || !endpoint, onclick: doSave, text: s.busy ? busyLabel : label }));
        if (s.round < 2) actions.appendChild(el('span', { class: 'rh-hint', text: s.round === 0 ? '1차 피드백은 원고 근거를 짚고, 의도 확인 → 근거·가정 탐색 → 연구 항목 간 연결·수정 질문 순으로 생각을 돕습니다. 1–3분 걸릴 수 있습니다.' : '수정한 내용을 저장하면 검증된 SSCI 문헌에 근거한 2차 DrS comments가 표시됩니다. 2–5분 걸릴 수 있습니다.' }));
        else if (s.round === 2) actions.appendChild(el('span', { class: 'rh-hint', text: s.paperType === 'article'
          ? '수정한 내용을 저장하면 1·2차 피드백과 수정 과정을 종합해 논리성·이론적 정합성·방법의 타당성을 짚는 3차 종합 의견이 표시됩니다. 1–3분 걸릴 수 있습니다.'
          : '수정한 내용을 저장하면 연구목적·연구문제·연구모형·연구방법의 정합성을 점검한 3차 DrS comments가 표시됩니다. 1–3분 걸릴 수 있습니다.' }));
        else actions.appendChild(el('span', { class: 'rh-hint', text: '최종 저장본이 연구계획서가 되며, 저장한 뒤 PDF로 내려받고 제출할 수 있습니다.' }));
      }
      rootEl.appendChild(actions);
      if (s.round >= 4) rootEl.appendChild(el('p', { class: 'rh-hint', text: 'PDF 앞부분에는 최종 연구계획서가, 뒤쪽 부록에는 최초 작성부터 세 차례 피드백과 수정 과정이 순서대로 담깁니다.' }));
      statusEl = el('p', { class: 'rh-status is-empty', role: 'status', 'aria-live': 'polite' });
      rootEl.appendChild(statusEl);
    }

    function clarifySection(round, feedback, busy, endpoint) {
      var list = (feedback && feedback.clarifications) || [];
      var sec = el('section', { class: 'rh-clarify', 'aria-label': '피드백 추가 설명 요청' }, [
        el('h3', { class: 'rh-clarify-title', text: '더 설명이 필요한 부분이 있나요?' }),
        el('p', { class: 'rh-hint', text: round + '차 피드백 중 이해하기 어렵거나 구체적인 예시가 더 필요한 부분을 체크해 제출하면, 쉬운 설명과 예시를 추가로 받아볼 수 있습니다.' })
      ]);
      var checks = el('fieldset', { class: 'rh-clarify-checks' }, [
        el('legend', { text: '어떤 부분의 추가 설명이 필요한가요?' })
      ].concat(CLARIFY_OPTIONS.map(function (opt) {
        return el('label', { class: 'rh-clarify-opt' }, [
          el('input', {
            type: 'checkbox',
            value: opt.key,
            checked: !!clarifyTopics[opt.key],
            disabled: busy,
            onchange: function (e) { clarifyTopics[opt.key] = e.target.checked; }
          }),
          el('span', { text: opt.label })
        ]);
      })));
      sec.appendChild(checks);
      sec.appendChild(el('div', { class: 'rh-clarify-note' }, [
        el('label', { for: 'rh-clarify-note', text: '피드백에서 특히 어려웠던 내용이나 궁금한 점 (선택)' }),
        el('textarea', {
          id: 'rh-clarify-note', rows: '2', maxlength: '500', readonly: busy,
          placeholder: '예: 이론적 근거에서 모형 경로를 설명하라는 부분이 잘 이해되지 않습니다.',
          oninput: function (e) { clarifyNote = e.target.value; }
        }, [clarifyNote])
      ]));
      sec.appendChild(el('div', { class: 'rh-clarify-actions' }, [
        el('button', {
          type: 'button', class: 'rh-btn', disabled: busy || !endpoint,
          onclick: doClarify,
          text: clarifying ? '추가 설명을 만드는 중…' : '추가 설명 받기'
        })
      ]));
      if (list.length) {
        var results = el('div', { class: 'rh-clarify-results' });
        list.forEach(function (c, idx) {
          var card = el('div', { class: 'rh-clarify-card' }, [
            el('div', { class: 'rh-clarify-card-head' }, [
              el('strong', { text: '추가 설명 ' + (idx + 1) }),
              el('span', { class: 'rh-ai-badge', text: (c.items || []).map(function (it) { return it.label; }).join(' · ') })
            ])
          ]);
          if (c.summary) card.appendChild(el('p', { class: 'rh-clarify-summary', text: c.summary }));
          (c.items || []).forEach(function (it) {
            var itemBox = el('div', { class: 'rh-clarify-item' }, [
              el('h4', { text: it.label }),
              el('p', { text: it.easyExplanation })
            ]);
            if (it.examples && it.examples.length) {
              itemBox.appendChild(el('strong', { class: 'rh-clarify-sub', text: '구체적인 예시' }));
              itemBox.appendChild(el('ul', {}, it.examples.map(function (ex) { return el('li', { text: ex }); })));
            }
            if (it.checkTip) {
              itemBox.appendChild(el('p', { class: 'rh-clarify-tip' }, [el('strong', { text: '수정할 때 확인해 볼 점 ' }), it.checkTip]));
            }
            card.appendChild(itemBox);
          });
          results.appendChild(card);
        });
        sec.appendChild(results);
      }
      return sec;
    }

    function doClarify() {
      var topics = CLARIFY_OPTIONS.map(function (o) { return o.key; }).filter(function (k) { return !!clarifyTopics[k]; });
      if (!topics.length) {
        status('더 설명이 필요한 부분을 하나 이상 체크해 주세요.', true);
        return;
      }
      clarifying = true;
      var p = app.clarify({ topics: topics, note: clarifyNote });
      render();
      status('선택한 부분에 대한 쉬운 설명과 예시를 만드는 중입니다…');
      p.then(function () {
        clarifying = false;
        clarifyTopics = {};
        clarifyNote = '';
        render();
        status('추가 설명이 아래에 표시되었습니다. 참고해 글을 수정해 보세요.');
        var resEl = rootEl.querySelector('.rh-clarify-results');
        if (resEl && resEl.scrollIntoView) resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, function (err) {
        clarifying = false;
        render();
        status(err.message, true);
      });
    }

    // ── 연구 모형 그림을 넣는 세 가지 방법 ─────────────────────────
    // 옵션 1 그림 붙여넣기 · 옵션 2 글로 쓰면 도식으로(Graphviz) · 옵션 3 그림판(Excalidraw).
    // 옵션 2·3의 결과도 PNG로 바꿔 같은 그림 칸(app.setImage)에 넣으므로 저장·PDF·서버는 그대로다.
    // 쓰던 글·그림판 장면은 이 기기에만 보관해 다시 고칠 수 있게 한다.
    var modelStore = webStorage('localStorage', 'research-help-model-draft');
    var modelDraft = modelStore.get() || {};
    function saveModelDraft() { modelStore.set(modelDraft); }
    function clearModelDraft() { modelDraft = {}; modelStore.remove(); }
    var MODEL_OPTIONS = [
      { key: 'image', label: '옵션 1. 그림 붙여넣기', hint: '직접 그린 그림 파일을 넣습니다' },
      { key: 'text', label: '옵션 2. 글로 쓰면 도식으로', hint: '관계를 글로 쓰면 자동으로 그려집니다' },
      { key: 'sketch', label: '옵션 3. 그림판에서 직접 그리기', hint: '큰 그림판에서 상자와 화살표를 그립니다' }
    ];
    function modelFigureSection(locked) {
      var sec = el('section', { class: 'rh-model-section', 'aria-label': '연구 모형 그림' }, [el('h3', { text: '1. 연구 모형 그림' })]);
      var MD = window.ResearchHelpModel;
      if (locked || !MD) { sec.appendChild(modelImageArea(locked)); return sec; }
      var mode = modelDraft.mode === 'text' || modelDraft.mode === 'sketch' ? modelDraft.mode : 'image';
      sec.appendChild(el('p', { class: 'rh-hint', text: '아래 세 가지 방법 중 편한 것 하나를 골라 연구 모형 그림을 넣습니다. 어느 방법이든 넣은 그림은 저장·PDF에 똑같이 들어갑니다.' }));
      sec.appendChild(el('div', { class: 'rh-model-tabs', role: 'tablist', 'aria-label': '연구 모형 그림 넣는 방법' }, MODEL_OPTIONS.map(function (o) {
        return el('button', { type: 'button', role: 'tab', class: 'rh-model-tab' + (o.key === mode ? ' is-active' : ''), 'aria-selected': o.key === mode ? 'true' : 'false',
          onclick: function () { if (o.key === mode) return; modelDraft.mode = o.key; saveModelDraft(); render(); var t = rootEl.querySelector('.rh-model-tab.is-active'); if (t) t.focus(); } },
          [el('strong', { text: o.label }), el('span', { text: o.hint })]);
      })));
      var panel = el('div', { class: 'rh-model-panel', role: 'tabpanel' });
      if (mode === 'text') panel.appendChild(modelTextArea(MD));
      else if (mode === 'sketch') panel.appendChild(modelSketchArea(MD));
      else panel.appendChild(modelImageArea(false));
      sec.appendChild(panel);
      return sec;
    }
    function modelSteps(items) {
      return el('ol', { class: 'rh-model-steps' }, items.map(function (t) { return el('li', { text: t }); }));
    }
    function currentModelImage() {
      var url = app.imageUrl();
      if (!url) return null;
      return el('div', { class: 'rh-model-current' }, [
        el('p', { class: 'rh-hint', text: '지금 넣어 둔 연구 모형 그림 (저장하면 이 그림이 함께 저장됩니다)' }),
        el('img', { src: url, alt: '연구 모형 그림' }),
        el('button', { type: 'button', class: 'rh-link', onclick: function () { app.clearImage(); render(); status('연구 모형 그림을 뺐습니다.'); }, text: '그림 빼기' })
      ]);
    }
    var MODEL_PLACEHOLDER = '여기에 연구 모형을 글로 쓰세요. 한 줄에 관계 하나씩 씁니다.\n\n' +
      '예)\n직무 자율성 -> 일 몰입 -> 혁신 행동\n직무 자율성 -> 혁신 행동 : H1\n심리적 안정감 -> (직무 자율성 -> 일 몰입)\n통제: 성별, 근속연수\n\n' +
      '· A -> B 는 "A가 B에 영향"\n· W -> (A -> B) 는 "W가 A → B 관계를 조절"\n· 위 [예시] 버튼을 누르면 틀이 채워집니다.';
    function modelTextArea(MD) {
      var wrap = el('div', { class: 'rh-model-text' });
      var lastSvg = null, seq = 0, timer = null;
      var textarea = el('textarea', { class: 'rh-model-code', rows: '12', maxlength: '3000', spellcheck: 'false', placeholder: MODEL_PLACEHOLDER, 'aria-label': '연구 모형을 글로 쓰기' }, [modelDraft.text || '']);
      var preview = el('div', { class: 'rh-model-preview', 'aria-live': 'polite' });
      var btn = el('button', { type: 'button', class: 'rh-btn primary', disabled: true, text: app.imageUrl() ? '이 도식으로 연구 모형 그림 바꾸기' : '이 도식을 연구 모형 그림으로 넣기' });
      function message(text, isError) { preview.innerHTML = ''; preview.appendChild(el('p', { class: 'rh-model-msg' + (isError ? ' is-error' : ''), text: text })); }
      function draw() {
        var my = ++seq, text = textarea.value;
        lastSvg = null; btn.disabled = true;
        if (!text.trim()) { message('왼쪽 칸에 글을 쓰면 여기에 도식이 바로 그려집니다.'); return; }
        preview.classList.add('is-busy');
        MD.renderText(text).then(function (r) {
          if (my !== seq) return;
          preview.classList.remove('is-busy');
          preview.innerHTML = '';
          if (r.errors.length) {
            preview.appendChild(el('p', { class: 'rh-model-msg is-error', text: '아래를 고치면 도식이 그려집니다.' }));
            preview.appendChild(el('ul', { class: 'rh-model-errors' }, r.errors.slice(0, 5).map(function (e) { return el('li', { text: e }); })));
            return;
          }
          lastSvg = r.svg; preview.appendChild(r.svg); btn.disabled = false;
        }, function (err) { if (my !== seq) return; preview.classList.remove('is-busy'); message(err.message, true); });
      }
      function onInput() { modelDraft.text = textarea.value; saveModelDraft(); clearTimeout(timer); timer = setTimeout(draw, 350); }
      textarea.addEventListener('input', onInput);
      btn.addEventListener('click', function () {
        if (!lastSvg) return;
        btn.disabled = true;
        MD.svgToPng(lastSvg).then(function (url) {
          app.setImage(url); render();
          status('글로 쓴 도식을 연구 모형 그림으로 넣었습니다. 아래 "2. 연구 모형 설명"도 함께 작성해 주세요.');
        }, function (err) { btn.disabled = false; status(err.message, true); });
      });
      wrap.appendChild(modelSteps([
        '아래 [예시] 중 내 연구 모형과 가장 비슷한 것을 누릅니다. 비워 두고 처음부터 써도 됩니다.',
        '예시의 변수 이름을 내 연구의 변수로 바꿉니다. 한 줄에 관계 하나씩 쓰고, 화살표는 -> (빼기 + 오른쪽 꺾쇠)로 씁니다.',
        '오른쪽 미리보기에서 도식을 확인한 뒤 [이 도식을 연구 모형 그림으로 넣기]를 누릅니다.'
      ]));
      wrap.appendChild(el('div', { class: 'rh-model-examples' }, [el('span', { text: '예시' })].concat(MD.TEMPLATES.map(function (t) {
        return el('button', { type: 'button', class: 'rh-model-chip', text: t.label, onclick: function () {
          if (textarea.value.trim() && textarea.value !== t.text && !window.confirm('지금 쓴 내용을 "' + t.label + '" 예시로 바꿀까요?')) return;
          textarea.value = t.text; onInput(); textarea.focus();
        } });
      }))));
      wrap.appendChild(el('details', { class: 'rh-model-syntax', open: !modelDraft.text }, [
        el('summary', { text: '쓰는 법 한눈에 보기' }),
        el('table', {}, MD.SYNTAX.map(function (r) { return el('tr', {}, [el('td', {}, [el('code', { text: r[0] })]), el('td', { text: r[1] })]); }))
      ]));
      wrap.appendChild(el('div', { class: 'rh-model-editor' }, [textarea, preview]));
      wrap.appendChild(el('div', { class: 'rh-model-actions' }, [btn]));
      var cur = currentModelImage();
      if (cur) wrap.appendChild(cur);
      draw();
      return wrap;
    }
    function modelSketchArea(MD) {
      var wrap = el('div', { class: 'rh-model-sketch-area' });
      wrap.appendChild(modelSteps([
        '[그림판 열기]를 누르면 화면 가득 큰 그림판이 열립니다. 독립변수 → 매개변수 → 종속변수 상자와 화살표가 미리 놓여 있습니다.',
        '상자 안 글자를 두 번 눌러 내 변수 이름으로 바꿉니다. 필요 없는 상자·화살표는 눌러서 Delete 키로 지웁니다.',
        '상자·화살표·글자를 더하려면 위쪽 도구 막대에서 사각형, 화살표, 글자(A)를 고릅니다. 화살표 끝을 상자 가장자리에 붙이면 상자를 옮겨도 따라옵니다. 조절변수는 화살표가 경로 선의 가운데를 가리키게 그립니다.',
        '다 그렸으면 오른쪽 위 [저장하고 닫기]를 누릅니다. 그림이 이 연구 모형 그림 칸에 들어가며, 다시 열면 이어서 고칠 수 있습니다.'
      ]));
      var open = el('button', { type: 'button', class: 'rh-btn primary', text: modelDraft.scene ? '그림판 열기 (이어서 그리기)' : '그림판 열기' });
      open.addEventListener('click', function () {
        MD.openSketch({ scene: modelDraft.scene }).then(function (r) {
          if (!r) return;
          modelDraft.scene = r.scene; saveModelDraft();
          app.setImage(r.dataUrl); render();
          status('그림판에서 그린 연구 모형을 넣었습니다. 아래 "2. 연구 모형 설명"도 함께 작성해 주세요.');
        });
      });
      var actions = el('div', { class: 'rh-model-actions' }, [open]);
      if (modelDraft.scene) actions.appendChild(el('button', { type: 'button', class: 'rh-link', text: '그림판 처음부터 다시 그리기', onclick: function () {
        if (!window.confirm('그림판에 그리던 내용을 지우고 처음 틀로 다시 시작할까요? (이미 넣은 그림은 그대로 있습니다)')) return;
        delete modelDraft.scene; saveModelDraft(); render();
      } }));
      wrap.appendChild(actions);
      var cur = currentModelImage();
      if (cur) wrap.appendChild(cur);
      return wrap;
    }

    function takeImage(file) {
      status('그림을 넣는 중…');
      readImage(file).then(function (dataUrl) {
        app.setImage(dataUrl);
        modelDraft.mode = 'image'; saveModelDraft();
        render();
        status('연구 모형 그림을 넣었습니다. 저장하면 함께 저장됩니다.');
      }, function (err) { status(err.message, true); });
    }
    function modelImageArea(locked) {
      var url = app.imageUrl();
      var input = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', class: 'rh-file', 'aria-label': '연구 모형 그림 파일 선택',
        onchange: function (e) { var file = e.target.files && e.target.files[0]; if (file) takeImage(file); } });
      var box = el('div', { class: 'rh-drop' + (url ? ' has-image' : '') + (locked ? ' is-locked' : ''), tabindex: locked ? '-1' : '0', role: 'group', 'aria-label': '연구 모형 그림 첨부. 이 영역을 클릭한 뒤 그림을 붙여넣으세요.' });
      if (!locked) box.addEventListener('paste', function (e) {
        var file = imageFrom(e.clipboardData);
        if (file) { e.preventDefault(); takeImage(file); }
        else status('클립보드에 그림이 없습니다. 그림을 복사하거나 파일 선택을 이용해 주세요.', true);
      });
      if (url) {
        box.appendChild(el('img', { src: url, alt: '연구 모형 그림' }));
        if (!locked) box.appendChild(el('div', { class: 'rh-drop-actions' }, [
          el('button', { type: 'button', class: 'rh-link', onclick: function () { input.click(); }, text: '그림 바꾸기' }),
          el('button', { type: 'button', class: 'rh-link', onclick: function () { app.clearImage(); render(); status('연구 모형 그림을 뺐습니다.'); }, text: '그림 빼기' })
        ]));
      } else if (!locked) {
        box.appendChild(el('p', { text: '이 영역을 클릭한 뒤 그림을 붙여넣기(⌘V/Ctrl+V) 하거나 끌어다 놓으세요. PNG·JPG·WEBP·GIF 파일도 선택할 수 있습니다. ' }, [
          el('button', { type: 'button', class: 'rh-link', onclick: function () { input.click(); }, text: '파일 선택' })]));
      } else return el('span');
      if (!locked) box.appendChild(input);
      return box;
    }

    function doSave() {
      if (app.imageUrl() && !app.state.fields.model.trim()) {
        status('연구 모형 그림에 대한 설명도 함께 작성해 주세요. 변수와 화살표의 의미를 적어 주세요.', true);
        rootEl.querySelector('#rh-model').focus();
        return;
      }
      var round = app.state.round + 1;
      busyLabel = round === 4 ? '저장 중…' : round + '차 DrS comments를 만드는 중…';
      var p = app.save();
      render();
      status(round === 4 ? '최종본을 저장하는 중입니다…' : '저장하고 피드백을 만드는 중입니다. 창을 닫지 말아 주세요.');
      p.then(function () {
        render();
        status(round === 4 ? '최종 저장이 완료되었습니다. PDF를 내려받거나 제출해 주세요.' : round === 3 ? '3차 저장이 완료되었습니다. 위의 3차 의견마다 수용·불수용을 선택하고, 의견을 참고해 왼쪽 내용을 수정한 뒤 최종 저장해 주세요.' : round + '차 저장이 완료되었습니다. 오른쪽 DrS comments를 참고해 왼쪽 내용을 수정해 주세요.');
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
              el('strong', { text: shortTitle(s.title) || '(제목 없음)' }), el('span', { text: s.name + ' · 제출 ' + s.submittedAt + ' · ' + s.id }),
              (s.inputLog && (s.inputLog.pasteCount || s.inputLog.autoCount)) ? el('span', { class: 'rh-flag', text: '⚠ 입력 기록: 붙여넣기 ' + s.inputLog.pasteCount + '회(' + s.inputLog.pasteChars.toLocaleString('ko-KR') + '자) · 자동입력 의심 ' + s.inputLog.autoCount + '회' }) : null
            ]), el('button', { type: 'button', class: 'rh-btn rh-list-download', 'aria-label': s.name + ' 제출물 PDF 다운로드', onclick: function () {
              status('제출물을 불러오는 중…');
              admin.get(s.id).then(function (rec) { return savePdf(rec, { history: true }, status); }, failed);
            }, text: 'PDF 다운로드' })]);
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
          var lines = inputLogLines(rev.fields._input);
          body.appendChild(el('div', { class: 'rh-inputlog' + (lines.length ? ' is-flagged' : '') }, lines.length
            ? [el('strong', { text: '⚠ 입력 기록 · 이 저장 단계에서 붙여넣기·자동입력이 있었습니다' }), el('ul', {}, lines.map(function (l) { return el('li', { text: l }); }))]
            : [el('span', { text: '입력 기록: 이 저장 단계에서 붙여넣기·자동입력이 기록되지 않았습니다.' })]));
          var perField = rev.feedback && !isRound3(rev.feedback);
          var answered = responsesSummary(rev.fields._responses);
          if (answered) body.appendChild(answered);
          if (isRound3(rev.feedback)) body.appendChild(criticalNode(rev.feedback));
          var grid = el('div', { class: 'rh-grid' + (perField ? ' has-comments' : '') });
          FIELDS.forEach(function (f) {
            var img = f.key === 'model' && rev.fields.modelImage && rec.images && rec.images[rev.fields.modelImage];
            var row = el('section', { class: 'rh-row' }, [el('div', { class: 'rh-mine' }, [el('h3', { text: f.label }),
              img ? el('div', { class: 'rh-drop has-image is-locked' }, [el('img', { src: img, alt: '연구 모형 그림' })]) : null,
              el('p', { class: 'rh-text', text: rev.fields[f.key] })])]);
            if (perField && f.key !== 'name') { var c = commentsNode(rev.feedback, rev.round); c.appendChild(itemNode(rev.feedback, f.key)); row.appendChild(c); }
            grid.appendChild(row);
          });
          body.appendChild(grid);
        }
        var tabs = el('div', { class: 'rh-tabs', role: 'tablist' }, oks.map(function (r, i) {
          return el('button', { type: 'button', role: 'tab', 'aria-selected': i === oks.length - 1 ? 'true' : 'false', text: r.round === 4 ? '최종 저장본' : r.round + '차 저장본', onclick: function (e) {
            [].forEach.call(tabs.children, function (b) { b.setAttribute('aria-selected', 'false'); });
            e.target.setAttribute('aria-selected', 'true'); show(r);
          } });
        }));
        view(el('div', {}, [
          el('div', { class: 'rh-admin-bar' }, [el('button', { type: 'button', class: 'rh-link', onclick: listView, text: '← 목록' }),
            el('button', { type: 'button', class: 'rh-btn', onclick: function () { savePdf(rec, { history: true }, status); }, text: 'PDF 다운로드 (수정 이력 포함)' })]),
          el('h2', { text: (oks.length ? shortTitle(oks[oks.length - 1].fields.title, oks[oks.length - 1].fields) : '') }),
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

  return { FIELDS: FIELDS, AI_NOTICE: AI_NOTICE, shortTitle: shortTitle, validateFields: validateFields, createController: createController, createAdmin: createAdmin,
    pdfDocument: pdfDocument, pdfFileName: pdfFileName, apaText: apaText, mount: mount };
});

// AX 전환 준비도 진단: 설문 응답 수집 → 분석 실시 → 내가 본 우리 회사 / 우리 회사 분석결과 / 응답자 구분별 비교.
// 문항: 개인 → 직무 → 팀 → 조직 → 전사 시스템, 5단계 × 5문항 + 전반 인식 2문항 = 27문항, 5점 동의 척도.
// 조직·전사 시스템·전반 인식 문항에는 '잘 모르겠다'(값 0)를 둔다. 0은 점수 계산에서 빼고, 단계별 '모르겠다' 비율로 따로 보고한다.
// 응답 저장: #axr의 data-endpoint(Google Apps Script 웹앱, tools/ax-readiness/)가 있으면 그곳에,
// 비어 있으면 시험 모드로, 응답을 이 브라우저에만 저장하고 이 브라우저의 응답끼리만 분석한다.
(function () {
  var root = document.getElementById('axr');
  if (!root) return;
  var tip = document.getElementById('axr-tip');
  var ENDPOINT = (root.dataset.endpoint || '').trim();
  var PREVIEW = !ENDPOINT;
  var GROUP = cleanGroup(new URLSearchParams(location.search).get('group'));
  var LS_ME = 'axr-v1-me' + (PREVIEW ? '-test' : ''), LS_DATA = 'axr-v1-test-responses';
  var MIN_N = 5;   // 회사 결과·비교를 보여 줄 최소 응답 수
  var MIN_ROLE = 3; // 응답자 구분별 비교에 넣을 최소 인원

  // ---------- 단계와 문항 ----------
  // ref: 문항의 주어(참조 대상). 한 단계 안에서는 주어를 통일한다.
  // unk: '잘 모르겠다' 허용 여부. 응답자가 직접 알기 어려운 회사 수준 단계에만 둔다.
  var STAGES = [
    { key: 'P', name: '개인 준비', ref: '나는', icon: '🙋', q: '나는 AI와 일할 준비가 되었나?', unk: false,
      def: '구성원 한 사람 한 사람이 AI를 다룰 줄 알고, 쓸 이유를 알고, 변화를 받아들이고 배우는 상태.',
      ex: 'AI 도구의 기본 기능을 익혔고, 내 업무에 어떤 도움이 되는지 예를 들 수 있다',
      owner: '구성원 개인', basis: '변화 준비도의 개인 효능감·개인 효용 (Holt 외, 2007)' },
    { key: 'J', name: '직무 재설계', ref: '내 직무에서는', icon: '🧩', q: '내 일은 AI를 전제로 다시 짜였나?', unk: false,
      def: '직무의 과업이 AI에게 맡길 일과 사람이 판단할 일로 나뉘고, 역할·목표·도구가 그에 맞게 바뀐 상태.',
      ex: 'AI에게 맡길 과업과 사람이 확인할 단계가 정해져 있다',
      owner: '구성원과 리더', basis: '디지털 시대의 일 설계 (Parker & Grote, 2022)' },
    { key: 'T', name: '팀 협업', ref: '우리 팀은', icon: '🤝', q: '우리 팀은 AI와 함께 일하는 방식이 있나?', unk: false,
      def: '팀의 업무 절차에 AI가 들어가 있고, 노하우를 나누며, 실패해도 다시 시도할 수 있는 상태.',
      ex: '팀 업무 절차에 AI를 쓰는 단계가 있고, 활용 노하우를 서로 나눈다',
      owner: '팀 리더', basis: '집단 수준 변화 준비도 (Rafferty 외, 2013)' },
    { key: 'O', name: '조직 기반', ref: '우리 회사는', icon: '🏢', q: '회사는 AX를 이끌 체계를 갖췄나?', unk: true,
      def: '회사가 AX 목표를 밝히고, 자원·지침·교육·인정 제도로 전환을 뒷받침하는 상태.',
      ex: 'AX 목표가 알려져 있고, AI 사용 지침과 직무별 교육이 있다',
      owner: '경영진과 지원 부서', basis: '조직 AI 준비 요인: 전략·자원·지식·문화 (Jöhnk 외, 2021)' },
    { key: 'S', name: '전사 시스템', ref: '우리 회사의 업무 체계는', icon: '⚙️', q: 'AI가 회사의 업무 체계에 녹아들었나?', unk: true,
      def: '데이터와 업무 시스템이 연결되고, 부서를 넘는 프로세스가 AI를 전제로 다시 설계되어, AI가 업무 일부를 직접 처리하는 상태.',
      ex: '부서 데이터가 연결되어 있고, AI가 사람의 감독 아래 업무 일부를 처리한다',
      owner: '전사 (경영진·IT·현업)', basis: '기업 AI 성숙도 3~4단계 (Weill 외, 2024) · 프런티어 기업 (Microsoft, 2025)' }
  ];
  var RAW = [
    ['P1', '나는 업무에 쓸 수 있는 AI 도구의 기본 기능을 익혔다.'],
    ['P2', '나는 내 업무 가운데 AI를 정기적으로 활용하는 일이 있다.'],
    ['P3', '나는 AI가 내 업무에 어떤 도움이 되는지 구체적인 예를 들 수 있다.'],
    ['P4', '나는 AI 도입으로 내 업무 방식이 바뀌는 것을 받아들일 마음이 있다.'],
    ['P5', '나는 AI 활용 능력을 키우려고 스스로 시간을 내어 배우고 있다.'],
    ['J1', '내 업무 가운데 AI에게 맡길 과업이 구체적으로 정해져 있다.'],
    ['J2', '내 업무에서 AI 결과를 사람이 확인해야 하는 단계가 정해져 있다.'],
    ['J3', 'AI 도입에 맞추어 내 역할(맡는 일의 범위)이 다시 정해졌다.'],
    ['J4', '내가 받는 업무 목표에 AI 활용이 반영되어 있다.'],
    ['J5', '내 업무에 맞는 AI 도구를 회사가 허용한 범위 안에서 바로 쓸 수 있다.'],
    ['T1', '우리 팀의 업무 절차에는 AI를 쓰는 단계가 정해져 있다.'],
    ['T2', '우리 팀원들은 AI 활용 노하우를 서로 공유한다.'],
    ['T3', '우리 팀은 AI를 새로 시도하다 생긴 실패를 배움의 기회로 다룬다.'],
    ['T4', '우리 팀의 리더는 팀원들이 AI 활용을 시도하도록 지원한다.'],
    ['T5', '우리 팀은 AI를 쓸 때 지킬 기준(예: 입력하면 안 되는 정보, 검토 절차)을 정해 두었다.'],
    ['O1', '우리 회사는 AX로 이루려는 목표를 구성원에게 분명히 알렸다.'],
    ['O2', '우리 회사 경영진은 AX 추진에 필요한 자원(예: 예산, 인력)을 배정하고 있다.'],
    ['O3', '우리 회사는 AI 사용에 관한 공식 지침(예: 보안, 개인정보, 책임 범위)을 갖추고 있다.'],
    ['O4', '우리 회사는 직무에 맞는 AI 교육 기회를 제공한다.'],
    ['O5', '우리 회사는 AI 활용으로 성과를 낸 구성원을 공식적으로 인정한다.'],
    ['S1', '우리 회사의 업무 데이터는 부서 구분 없이 AI가 활용할 수 있도록 연결되어 있다.'],
    ['S2', '우리 회사의 핵심 업무 시스템(예: ERP, 그룹웨어)에는 AI 기능이 연동되어 있다.'],
    ['S3', '우리 회사는 여러 부서에 걸친 업무 프로세스를 AI 활용을 전제로 다시 설계했다.'],
    ['S4', '우리 회사는 AI가 만든 성과(예: 절감된 시간, 비용, 품질 개선)를 전사 차원에서 측정한다.'],
    ['S5', '우리 회사에서는 AI가 사람의 감독 아래 업무 프로세스의 일부 단계를 직접 처리한다.'],
    ['G1', '우리 회사 구성원들은 AX 전환을 해내려는 의지가 강하다.'],
    ['G2', '우리 회사는 AX 전환을 해낼 역량을 갖추고 있다.']
  ];
  var ITEMS = RAW.map(function (r, i) {
    var s = i < 25 ? STAGES[Math.floor(i / 5)] : null;
    return { code: r[0], text: r[1], idx: i, unk: s ? s.unk : true };
  });
  var NS = 25, NI = ITEMS.length; // 단계 문항 수, 전체 문항 수
  var SCALE = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
  var UNK = '잘 모르겠다';
  var ROLES = ['실무자(팀원)', '팀장·파트장', '임원·경영진', '기타'];
  // 제시 순서: 주어가 같은 단계끼리 한 쪽에. 개인 → 직무 → 팀 → 조직 → 전사 → 전반 인식
  var PAGES = STAGES.map(function (_, s) { return ITEMS.slice(s * 5, s * 5 + 5); });
  PAGES.push(ITEMS.slice(NS));
  var PAGE_HEAD = ['나 자신에 대한 문장입니다.', '내가 맡은 직무에 대한 문장입니다.', '내가 속한 팀에 대한 문장입니다.', '우리 회사 전체에 대한 문장입니다.', '우리 회사의 데이터·시스템·업무 프로세스에 대한 문장입니다.', '마지막으로, 우리 회사 전체를 떠올려 주세요.'];

  // ---------- 수준·단계 ----------
  var LEVELS = [{ min: 80, t: '주도' }, { min: 60, t: '정착' }, { min: 40, t: '형성' }, { min: 0, t: '시작' }];
  var CUT = 60;      // 단계 '준비 완료' 기준점(잠정)
  var MIN_ITEMS = 4; // 단계 점수를 내려면 5문항 중 이만큼 응답(모르겠다 제외)해야 함
  var STAGE_NAMES = ['출발 전', '1단계 · 개인 준비', '2단계 · 직무 재설계', '3단계 · 팀 협업', '4단계 · 조직 기반', '5단계 · 전사 시스템'];
  var STAGE_DESC = [
    '아직 구성원 개인의 준비부터 갖추어야 하는 단계입니다. AX의 출발점은 사람입니다.',
    '구성원 개인은 준비되었지만, 각자의 직무가 아직 AI를 전제로 다시 짜이지 않았습니다.',
    '직무 수준까지 준비되었지만, 팀의 일하는 방식으로는 아직 자리 잡지 않았습니다.',
    '팀 수준까지 준비되었지만, 회사 차원의 목표·자원·지침이 뒤따르지 못하고 있습니다.',
    '조직 기반까지 갖추었지만, 데이터와 업무 체계가 아직 AI를 중심으로 연결되지 않았습니다.',
    '다섯 단계를 모두 갖추어, AI를 전제로 일하는 회사로 전환할 준비가 된 상태입니다.'
  ];
  // 단계별로 회사(또는 팀)가 해 볼 일
  var ACTIONS = {
    P: ['직무별 실제 업무 자료로 하는 AI 실습을 열어, 모든 구성원이 기본 기능을 익히게 합니다.', '부서별로 "AI로 이만큼 줄었다"는 업무 사례를 모아 공유합니다.', '근무 시간 안에 AI를 배우고 시험해 볼 시간을 공식적으로 보장합니다.'],
    J: ['직무별 과업 목록을 만들고, AI에게 맡길 과업과 사람이 판단할 과업을 표시합니다.', 'AI 결과를 사람이 확인해야 하는 단계를 업무 절차에 명시합니다.', '바뀐 역할에 맞추어 업무 목표와 평가 기준을 다시 정합니다.'],
    T: ['팀 업무 절차서에 AI를 쓰는 단계와 검토 단계를 적어 넣습니다.', '주간 회의에 짧은 AI 활용 사례 공유 시간을 둡니다.', '팀이 지킬 AI 사용 기준(입력 금지 정보, 검토 절차)을 함께 정합니다.'],
    O: ['AX로 이루려는 목표와 일정을 전 구성원에게 알리고, 진행 상황을 정기적으로 공유합니다.', 'AI 사용 지침(보안·개인정보·책임 범위)을 공식화하고 쉽게 찾을 수 있게 둡니다.', '직무별 AI 교육 과정과 AI 활용 성과를 인정하는 제도를 마련합니다.'],
    S: ['부서별로 흩어진 업무 데이터를 AI가 안전하게 쓸 수 있도록 연결합니다.', '부서를 넘는 핵심 프로세스 하나를 골라 AI를 전제로 처음부터 다시 설계해 봅니다.', 'AI가 만든 성과(시간·비용·품질)를 전사 지표로 측정해 투자 판단에 씁니다.']
  };
  // 개인이 직접 해 볼 일 (개인 준비·직무 단계)
  var MY_TIPS = {
    P: ['지금 하는 일 하나를 골라, 이번 주에 AI로 처리해 보세요.', 'AI가 내 업무에 도움이 된 예를 한 줄씩 기록해 두세요.', '한 주에 30분, AI 활용법을 배우는 시간을 일정에 넣어 보세요.'],
    J: ['내 업무를 과업 단위로 적고, AI에게 맡길 수 있는 것을 표시해 보세요.', 'AI 결과를 반드시 내가 확인해야 하는 지점을 정해 두세요.', '리더와 함께 AI 활용을 업무 목표에 어떻게 반영할지 이야기해 보세요.']
  };

  // ---------- 상태 ----------
  var state = { view: 'home', page: -1, answers: {}, role: '', started: 0, tab: 'me', me: null, pool: null };

  // ---------- 유틸 ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cleanGroup(g) { return String(g || '').trim().replace(/[^\w가-힣-]/g, '').slice(0, 40); }
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function variance(a) { var m = mean(a); return a.length > 1 ? a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1) : 0; }
  function sd(a) { return Math.sqrt(variance(a)); }
  function r0(v) { return Math.round(v); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function signed(v) { var r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function level(v) { for (var i = 0; i < LEVELS.length; i++) if (v >= LEVELS[i].min) return LEVELS[i].t; return '시작'; }
  function lvlCls(t) { return { '주도': 'l4', '정착': 'l3', '형성': 'l2', '시작': 'l1' }[t]; }
  function nn(a) { return a.filter(function (v) { return v !== null; }); }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
  function newId() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = '';
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < 8; i++) s += A[b[i] % A.length];
    return s;
  }
  function fmtId(id) { return id.slice(0, 4) + '-' + id.slice(4); }
  function josa(w, a, b) { var c = w.charCodeAt(w.length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); }
  function copyBtn(id, small) { return '<button type="button" class="aidx-copy' + (small ? ' small' : '') + '" data-act="copycode" data-code="' + fmtId(id) + '">복사</button>'; }
  function groupLabel(g) { return g ? '회사(그룹) ' + g : '전체 응답자'; }
  function stageTitle(k) { return k ? STAGE_NAMES[k] + '까지 준비됨' : '출발 전 · 1단계 준비 중'; }
  function sc(v) { return v === null ? '–' : r0(v); }

  // ---------- 점수 ----------
  // 단계 점수 0~100 = (응답한 문항 평균 − 1) × 25. '모르겠다'(0)는 빼고, 4문항 이상 응답해야 산출.
  function itemsScore(vals) {
    var ok = vals.filter(function (v) { return v > 0; });
    return ok.length >= Math.min(MIN_ITEMS, vals.length) ? (mean(ok) - 1) * 25 : null;
  }
  // 누적 규칙: 1단계부터 차례로 기준점(60) 이상인 단계까지를 '준비된 단계'로 본다. 판단 보류(null)에서 멈춘다.
  function stageOf(lv) {
    var k = 0;
    while (k < lv.length && lv[k] !== null && lv[k] >= CUT) k++;
    return k;
  }
  function score(a) {
    var lv = STAGES.map(function (_, s) { return itemsScore(a.slice(s * 5, s * 5 + 5)); });
    var unk = STAGES.map(function (_, s) { return a.slice(s * 5, s * 5 + 5).filter(function (v) { return v === 0; }).length; });
    return { lv: lv, unk: unk, stage: stageOf(lv), g: itemsScore(a.slice(NS)), a: a };
  }

  // ---------- 데이터 ----------
  function call(url, opts) {
    var ctl = window.AbortController ? new AbortController() : null, o = opts || {};
    if (ctl) { o.signal = ctl.signal; setTimeout(function () { ctl.abort(); }, 25000); }
    return fetch(url, o).then(function (r) { return r.json(); });
  }
  function localRows() { return load(LS_DATA) || []; }
  function submit(rec) {
    if (PREVIEW) { var rows = localRows(); rows.push(rec); save(LS_DATA, rows); return Promise.resolve(); }
    return call(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) })
      .then(function (j) { if (!j.ok && j.error !== 'duplicate') throw new Error(j.error || '저장 실패'); });
  }
  function fetchPool(group, me) {
    if (PREVIEW) {
      var rows = localRows().filter(function (r) { return !group || (r.group || '') === group; }).map(function (r) {
        return { role: r.role, g: r.group || '', a: r.answers, mine: !!(me && r.id === me.id) };
      });
      return Promise.resolve(withMine(rows, me));
    }
    var u = ENDPOINT + '?action=all&group=' + encodeURIComponent(group) + (me ? '&me=' + encodeURIComponent(me.id) : '');
    return call(u).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return withMine(j.rows.map(function (r) { return { role: r.role, g: r.g || '', a: r.a, mine: !!r.m }; }), me);
    });
  }
  function withMine(rows, me) {
    if (me && !rows.some(function (r) { return r.mine; })) rows.push({ role: me.role, g: me.group || '', a: me.answers, mine: true });
    return rows;
  }
  function fetchOne(id) {
    if (PREVIEW) return Promise.resolve(localRows().filter(function (r) { return r.id === id; })[0] || null);
    return call(ENDPOINT + '?action=one&id=' + encodeURIComponent(id))
      .then(function (j) { return j.ok && j.row ? { id: j.row.id, group: j.row.group, role: j.row.role, answers: j.row.a } : null; });
  }

  // ---------- 회사(집단) 집계 ----------
  function aggregate(rows) {
    var lvMean = STAGES.map(function (_, s) { var v = nn(rows.map(function (r) { return r.lv[s]; })); return v.length ? mean(v) : null; });
    var lvSd = STAGES.map(function (_, s) { return sd(nn(rows.map(function (r) { return r.lv[s]; }))); });
    var unkPct = STAGES.map(function (_, s) {
      var tot = 0, u = 0;
      rows.forEach(function (r) { for (var i = s * 5; i < s * 5 + 5; i++) { tot++; if (r.a[i] === 0) u++; } });
      return tot ? u / tot * 100 : 0;
    });
    var ready = STAGES.map(function (_, s) {
      var v = nn(rows.map(function (r) { return r.lv[s]; }));
      return v.length ? v.filter(function (x) { return x >= CUT; }).length / v.length * 100 : 0;
    });
    return { lvMean: lvMean, lvSd: lvSd, unkPct: unkPct, ready: ready, stage: stageOf(lvMean) };
  }
  // 집단 내 합의도 rwg(j): 균등분포 기대분산(5점 척도 = 2)과 문항 분산 평균을 비교. '모르겠다'는 뺀다.
  function rwgj(rows, from, to) {
    var J = to - from, vars = [];
    for (var i = from; i < to; i++) {
      var v = rows.map(function (r) { return r.a[i]; }).filter(function (x) { return x > 0; });
      if (v.length >= 2) vars.push(variance(v));
    }
    if (vars.length < J) return null;
    var ratio = mean(vars) / 2, k = J * (1 - ratio);
    if (ratio >= 1) return 0;
    return k / (k + ratio);
  }
  function alpha(rows, from, to) {
    var full = rows.filter(function (r) { return r.a.slice(from, to).every(function (v) { return v > 0; }); });
    if (full.length < 10) return null;
    var k = to - from, iv = 0;
    for (var i = from; i < to; i++) iv += variance(full.map(function (r) { return r.a[i]; }));
    var tv = variance(full.map(function (r) { return r.a.slice(from, to).reduce(function (s, v) { return s + v; }, 0); }));
    return tv > 0 ? k / (k - 1) * (1 - iv / tv) : null;
  }
  // 단계 순서 일치율: 다섯 단계 점수가 모두 있는 응답자 중, 앞 단계를 넘지 못했는데 뒤 단계를 넘은 경우가 없는 비율.
  function orderFit(rows) {
    var full = rows.filter(function (r) { return r.lv.every(function (v) { return v !== null; }); });
    if (full.length < 10) return null;
    var ok = full.filter(function (r) {
      var pass = r.lv.map(function (v) { return v >= CUT; });
      for (var j = 1; j < 5; j++) if (pass[j] && !pass[j - 1]) return false;
      return true;
    }).length;
    return { pct: ok / full.length * 100, n: full.length };
  }
  function pearson(x, y) {
    var mx = mean(x), my = mean(y), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }

  // ---------- 그림 ----------
  // 계단 그림: 다섯 단계를 왼쪽 아래에서 오른쪽 위로 쌓고, 준비된 단계까지 색을 채운다.
  function stairs(stage, label) {
    var W = 560, H = 236, sw = 100, sh = 30, x0 = 30, y0 = H - 22;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="axr-stairs" role="img" aria-label="' + esc(label) + '">';
    STAGES.forEach(function (st, i) {
      var x = x0 + i * sw, h = sh * (i + 1), y = y0 - h, on = i < stage, next = i === stage;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (sw - 6) + '" height="' + h + '" rx="6" class="axr-step' + (on ? ' on' : next ? ' next' : '') + '"/>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y - 26) + '" text-anchor="middle" class="axr-snum">' + (i + 1) + '단계</text>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y - 9) + '" text-anchor="middle" class="axr-sname">' + st.name + '</text>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y0 - 10) + '" text-anchor="middle" class="axr-sicon">' + st.icon + '</text>';
    });
    s += '<line x1="' + (x0 - 10) + '" y1="' + y0 + '" x2="' + (x0 + 5 * sw) + '" y2="' + y0 + '" class="axr-base"/>';
    return s + '</svg>';
  }
  // 단계별 막대: 내 점수(또는 회사 평균) 막대 + 비교 눈금 + 기준점 점선
  function stageBars(vals, cmp, cmpLabel, marks) {
    return '<div class="aidx-rank axr-bars">' + STAGES.map(function (st, i) {
      var v = vals[i], st2 = v === null ? '' : v >= CUT ? 'good' : 'warn';
      return '<div class="aidx-rrow ' + st2 + '"><span class="aidx-rname">' + (i + 1) + '. ' + st.name + '</span>' +
        '<span class="aidx-rtrack">' + (v === null ? '' : '<span class="aidx-rbar" style="width:' + v + '%"></span>') +
        '<i class="aidx-rcut" style="left:' + CUT + '%"></i>' +
        (cmp && cmp[i] !== null ? '<i class="aidx-rmean" style="left:' + cmp[i] + '%" data-tip="' + esc(cmpLabel + ' ' + r0(cmp[i]) + '점') + '"></i>' : '') + '</span>' +
        '<span class="aidx-rval">' + sc(v) + '</span>' +
        '<span class="aidx-rtag">' + (marks && marks[i] ? marks[i] : v === null ? '판단 보류' : v >= CUT ? '준비됨' : '보완 필요') + '</span></div>';
    }).join('') + '</div>';
  }
  function kpi(k, v, s) { return '<div class="kpi"><span class="kpi-k">' + k + '</span><span class="kpi-v">' + v + '</span>' + (s ? '<span class="kpi-s">' + s + '</span>' : '') + '</div>'; }
  function lvlChip(v) { if (v === null) return ''; var t = level(v); return '<span class="aidx-lv ' + lvlCls(t) + '">' + t + '</span>'; }

  // ---------- 화면: 대문 ----------
  function previewNote() {
    return PREVIEW ? '<p class="aidx-preview">시험 모드: 응답 저장소가 아직 연결되지 않아, 응답이 이 브라우저에만 저장됩니다.</p>' : '';
  }
  function viewHome() {
    var me = load(LS_ME);
    root.innerHTML = previewNote() +
      '<section class="aidx-home">' +
      '<p class="aidx-lead">우리 회사는 AI를 전제로 일하는 회사로 바뀔 준비가 얼마나 되어 있을까요?<br>개인에서 전사 시스템까지, 다섯 단계로 AX 전환 준비도를 진단합니다.</p>' +
      '<ul class="aidx-meta"><li class="beta">BETA</li><li>27문항</li><li>약 6분</li><li>익명</li></ul>' +
      (GROUP ? '<p class="aidx-group">응답 회사(그룹) <strong>' + esc(GROUP) + '</strong></p>' : '') +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button></div>' +
      '<div class="aidx-actions sub">' +
      '<button type="button" class="aidx-btn" data-act="my">내가 본 우리 회사</button>' +
      '<button type="button" class="aidx-btn" data-act="group">우리 회사 분석결과 보기</button></div>' +
      (me ? '<p class="aidx-small">이 기기에 저장된 내 결과 코드: <code>' + fmtId(me.id) + '</code> ' + copyBtn(me.id, true) + '</p>' : '') +
      '<div class="aidx-gate" id="axr-gate" role="alert" hidden><p><strong id="axr-gate-msg"></strong></p>' +
      '<button type="button" class="aidx-link" data-act="code">다른 기기에서 이미 응답했다면 결과 코드 입력</button></div>' +
      '<form class="aidx-code" id="axr-code" hidden><label for="axr-code-in">결과 코드</label>' +
      '<input id="axr-code-in" autocomplete="off" placeholder="XXXX-XXXX" maxlength="9">' +
      '<button type="submit" class="aidx-btn">결과 보기</button><span class="aidx-err" id="axr-code-err"></span></form>' +
      '</section>' +
      '<section class="aidx-model"><h2 class="aidx-h">무엇을 진단하나요</h2>' +
      '<p><strong>AX(AI 전환)</strong>는 AI 도구를 들여오는 데서 끝나지 않고, 사람이 일하는 방식부터 회사의 업무 체계까지 AI를 전제로 다시 짜는 일입니다. ' +
      '이 진단은 그 준비가 <strong>나 → 내 직무 → 우리 팀 → 우리 회사 → 전사 시스템</strong>의 순서로 어디까지 갖추어졌는지 봅니다.</p>' +
      '<ol class="aidx-flow">' + STAGES.map(function (st, i) {
        return '<li><span class="aidx-when"><b>' + (i + 1) + '</b>' + st.ref.replace(/는$/, '') + '</span>' +
          '<span class="aidx-ficon" aria-hidden="true">' + st.icon + '</span>' +
          '<strong class="aidx-fname">' + st.name + '</strong>' +
          '<span class="aidx-fq">' + st.q + '</span>' +
          '<span class="aidx-fex">예) ' + st.ex + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="aidx-fsum"><span>단계별 5문항 → 25문항</span><span>+ 전반 인식 2문항</span><span>= 27문항</span></p>' +
      '<p class="aidx-small">앞 단계가 갖추어져야 다음 단계가 제대로 작동한다고 보고, 1단계부터 차례로 기준(60점)을 넘은 단계까지를 "준비된 단계"로 판정합니다.</p></section>';
  }

  // ---------- 화면: 설문 ----------
  function answered() { return Object.keys(state.answers).length; }
  function viewSurvey() {
    var p = state.page, h = '';
    var done = answered() + (state.role ? 1 : 0), total = NI + 1;
    h += '<div class="aidx-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + (done / total * 100) + '%"></span></div>';
    h += '<p class="aidx-step">' + (p + 2) + ' / ' + (PAGES.length + 1) + '</p>';
    if (p === -1) {
      h += '<h2 class="aidx-h">응답하기 전에</h2>' +
        '<ol class="aidx-guide">' +
        '<li><span class="aidx-gicon" aria-hidden="true">📍</span><strong>지금 상태를 떠올리세요</strong><span>앞으로의 계획이 아니라, 오늘 실제로 갖추어져 있는 것을 기준으로</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🔁</span><strong>주어가 바뀝니다</strong><span>나 → 내 직무 → 우리 팀 → 우리 회사 순서로, 쪽마다 대상이 다릅니다</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🤷</span><strong>모르면 "잘 모르겠다"</strong><span>회사 전체에 관한 문항은 잘 모르면 짐작하지 말고 "잘 모르겠다"를 고르세요</span></li>' +
        '</ol>' +
        '<fieldset class="aidx-role"><legend>먼저, 나는</legend><div class="aidx-roles">' +
        ROLES.map(function (r) { return '<label><input type="radio" name="role" value="' + r + '"' + (state.role === r ? ' checked' : '') + '><span>' + r + '</span></label>'; }).join('') +
        '</div></fieldset>';
    } else {
      var items = PAGES[p], st = STAGES[p];
      h += '<h2 class="aidx-h">' + (st ? (p + 1) + '단계 · ' + st.name : '전반 인식') + '</h2>' +
        '<p class="axr-pagehead">' + PAGE_HEAD[p] + ' 각 문장이 <strong>현재 상태</strong>와 얼마나 같은가요?</p>';
      var before = PAGES.slice(0, p).reduce(function (s, x) { return s + x.length; }, 0);
      h += '<ol class="aidx-items">' + items.map(function (it, j) {
        return '<li class="aidx-item" id="q-' + it.code + '"><p class="aidx-q"><span class="aidx-no">' + (before + j + 1) + '</span>' + esc(it.text) + '</p>' +
          '<div class="aidx-scale' + (it.unk ? ' axr-has-unk' : '') + '"><span class="aidx-end">' + SCALE[0] + '</span><div class="aidx-dots" role="radiogroup" aria-label="' + esc(it.text) + '">' + SCALE.map(function (lab, v) {
            return '<label title="' + lab + '"><input type="radio" name="' + it.code + '" value="' + (v + 1) + '" aria-label="' + (v + 1) + ' ' + lab + '"' + (state.answers[it.code] === v + 1 ? ' checked' : '') + '><span>' + (v + 1) + '</span></label>';
          }).join('') + '</div><span class="aidx-end">' + SCALE[4] + '</span>' +
          (it.unk ? '<label class="axr-unk"><input type="radio" name="' + it.code + '" value="0"' + (state.answers[it.code] === 0 ? ' checked' : '') + '><span>' + UNK + '</span></label>' : '') +
          '</div></li>';
      }).join('') + '</ol>';
    }
    var last = p === PAGES.length - 1;
    h += '<div class="aidx-nav"><button type="button" class="aidx-btn" data-act="prev">' + (p === -1 ? '처음으로' : '이전') + '</button>' +
      '<span class="aidx-err" id="axr-err"></span>' +
      '<button type="button" class="aidx-btn primary" data-act="next">' + (last ? '응답 제출' : '다음') + '</button></div>';
    root.innerHTML = previewNote() + '<section class="aidx-survey">' + h + '</section>';
  }
  function pageComplete() {
    if (state.page === -1) return state.role ? null : 'role';
    var miss = PAGES[state.page].filter(function (it) { return state.answers[it.code] === undefined; });
    return miss.length ? miss[0].code : null;
  }

  // ---------- 화면: 제출 완료 / 분석 중 ----------
  function viewDone() {
    var me = state.me;
    root.innerHTML = previewNote() + '<section class="aidx-home">' +
      '<h2 class="aidx-h">응답이 저장되었습니다</h2>' +
      '<p class="aidx-codeline">결과 코드 <code class="aidx-bigcode">' + fmtId(me.id) + '</code>' + copyBtn(me.id) + '</p>' +
      '<p class="aidx-small">다른 기기에서 결과를 다시 볼 때 이 코드가 필요합니다. 복사해 두세요.</p>' +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="analyze">분석 실시</button></div></section>';
  }
  function viewAnalyzing(msg) { root.innerHTML = '<section class="aidx-home"><div class="aidx-spin" aria-hidden="true"></div><p>' + esc(msg) + '</p></section>'; }
  function viewError(msg) {
    root.innerHTML = '<section class="aidx-home"><p class="aidx-err">' + esc(msg) + '</p><div class="aidx-actions"><button type="button" class="aidx-btn" data-act="home">처음으로</button></div></section>';
  }

  // ---------- 분석 실행 ----------
  function scored(r) { var s = score(r.a); s.role = r.role; s.g0 = r.g || ''; s.mine = r.mine; return s; }
  function analyze(tab) {
    state.tab = tab;
    var me = state.me, group = me ? (me.group || '') : GROUP;
    viewAnalyzing(tab === 'me' ? '응답을 분석하고 있습니다' : '회사 응답을 모으고 있습니다');
    var t0 = Date.now();
    fetchPool(group, me).then(function (rows) {
      state.pool = { group: group, rows: rows.map(scored) };
      setTimeout(viewResult, Math.max(0, 700 - (Date.now() - t0)));
    }).catch(function () { viewError('응답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); });
  }

  // ---------- 화면: 결과 ----------
  function tabLabel(full, short) { return '<span class="aidx-tl">' + full + '</span><span class="aidx-ts">' + short + '</span>'; }
  function viewResult() {
    root.innerHTML = previewNote() +
      '<div class="aidx-tabs" role="tablist">' +
      '<button type="button" role="tab" data-tab="me" aria-selected="' + (state.tab === 'me') + '">' + tabLabel('내가 본 우리 회사', '나의 응답') + '</button>' +
      '<button type="button" role="tab" data-tab="group" aria-selected="' + (state.tab === 'group') + '">' + tabLabel('우리 회사 분석결과', '우리 회사') + '</button>' +
      '<button type="button" role="tab" data-tab="compare" aria-selected="' + (state.tab === 'compare') + '">' + tabLabel('응답자 구분별 비교', '구분별 비교') + '</button></div>' +
      '<div role="tabpanel">' + (state.tab === 'me' ? personal() : state.tab === 'group' ? companyReport() : compareReport()) + '</div>' +
      '<p class="report-foot aidx-foot"><strong>BETA 버전</strong>입니다. 준비 기준점(60점)과 단계 순서는 타당화 전의 잠정 기준입니다. 점수 = (응답한 문항 평균 − 1) × 25, 0~100점, "잘 모르겠다"는 점수에서 제외. ' +
      '<button type="button" class="aidx-link" data-act="home">처음으로</button></p>';
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 });
  }

  function personal() {
    var P = state.pool, me = P && P.rows.filter(function (r) { return r.mine; })[0];
    if (!me) {
      return '<section class="aidx-home"><p>아직 이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p>' +
        '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="my">결과 코드 입력</button></div></section>';
    }
    var rows = P.rows, n = rows.length, few = n < MIN_N, A = aggregate(rows);
    var h = '';
    // 1. 내가 본 단계
    var bott = me.stage < 5 ? me.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">내가 본 우리 회사의 AX 준비 단계</p>' +
      '<h2>' + stageTitle(me.stage) + '</h2>' +
      '<p>' + STAGE_DESC[me.stage] + '</p>' +
      (bott >= 0 ? '<p>다음 관문은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>입니다. "' + STAGES[bott].q + '"</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(me.stage, '내가 본 준비 단계 ' + me.stage + '단계') + '</div></section>';

    // 2. 핵심 숫자
    var myUnk = me.unk[3] + me.unk[4];
    h += '<div class="kpis aidx-kpis">' +
      kpi('내가 본 단계', me.stage + '<small>/ 5단계</small>', STAGE_NAMES[me.stage]) +
      (few ? kpi('회사 전체 단계', '–', '응답 ' + MIN_N + '명 이상 모이면 표시 (현재 ' + n + '명)')
        : kpi('회사 전체 단계', A.stage + '<small>/ 5단계</small>', esc(groupLabel(P.group)) + ' ' + n + '명 평균 기준')) +
      kpi('개인 준비', sc(me.lv[0]) + '<small>/ 100</small>', lvlChip(me.lv[0]) + (few ? '' : ' 회사 평균 ' + sc(A.lvMean[0]))) +
      kpi('"잘 모르겠다"', myUnk + '<small>/ 10문항</small>', '조직·전사 시스템 문항 중') +
      '</div>';

    // 3. 단계별 점수
    h += '<section class="panel"><h3 class="panel-title">단계별 점수</h3>' +
      '<p class="panel-sub">내 응답 · 진한 눈금은 ' + (few ? '응답자' : '회사') + ' 평균 · 점선은 준비 기준 60점</p>' +
      stageBars(me.lv, n > 1 ? A.lvMean : null, (few ? '응답자' : '회사') + ' 평균') +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>나</th><th>' + (few ? '응답자' : '회사') + ' 평균</th><th>차이</th><th>나의 "모르겠다"</th></tr></thead><tbody>' +
      STAGES.map(function (st, i) {
        var d = me.lv[i] !== null && A.lvMean[i] !== null ? me.lv[i] - A.lvMean[i] : null;
        return '<tr><td>' + (i + 1) + '. ' + st.name + '</td><td><strong>' + sc(me.lv[i]) + '</strong> ' + lvlChip(me.lv[i]) + '</td><td>' + sc(A.lvMean[i]) + '</td>' +
          '<td class="' + (d === null ? '' : d >= 5 ? 'up' : d <= -5 ? 'down' : '') + '">' + (d === null ? '–' : signed(d)) + '</td><td>' + (st.unk ? me.unk[i] + '개' : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="aidx-small">수준: 시작 0~39 · 형성 40~59 · 정착 60~79 · 주도 80~100. 1~2단계는 나 자신과 내 직무, 3~5단계는 팀과 회사를 내가 어떻게 보는지에 대한 점수입니다.</p></section>';

    // 4. 해 볼 일
    var tips = '';
    [0, 1].forEach(function (s) {
      if (me.lv[s] === null || me.lv[s] >= 80) return;
      var low = ITEMS.slice(s * 5, s * 5 + 5).filter(function (it) { return me.a[it.idx] > 0 && me.a[it.idx] <= 3; }).slice(0, 2);
      tips += '<li class="aidx-plan-card"><p class="aidx-plan-h">' + STAGES[s].icon + ' ' + STAGES[s].name + ' <span class="aidx-muted">' + sc(me.lv[s]) + '점</span></p>' +
        '<ul class="aidx-list">' + MY_TIPS[STAGES[s].key].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        (low.length ? '<p class="aidx-small">아직 갖추지 못했다고 답한 것</p><ul class="aidx-list aidx-check">' + low.map(function (it) { return '<li>' + esc(it.text) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    });
    var weakOrg = [2, 3, 4].filter(function (s) { return me.lv[s] !== null && me.lv[s] < CUT; })[0];
    if (weakOrg !== undefined) {
      tips += '<li class="aidx-plan-card keep"><p class="aidx-plan-h">' + STAGES[weakOrg].icon + ' 팀·회사에 제안해 볼 것 · ' + STAGES[weakOrg].name + '</p>' +
        '<ul class="aidx-list">' + ACTIONS[STAGES[weakOrg].key].slice(0, 2).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></li>';
    }
    if (myUnk >= 4) {
      tips += '<li class="aidx-plan-card"><p class="aidx-plan-h">🤷 회사의 AX 계획을 알아보기</p>' +
        '<p>조직·전사 시스템 문항 10개 중 ' + myUnk + '개에 "잘 모르겠다"고 답했습니다. 회사의 AX 목표, AI 사용 지침, 교육 기회가 어디에 안내되어 있는지 리더에게 물어보세요. 모르는 구성원이 많다면 그 자체가 회사가 소통을 보완해야 한다는 신호입니다.</p></li>';
    }
    if (tips) h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">나의 행동 추천</p><h3>지금 내가 해 볼 수 있는 것</h3>' +
      '<p>1~2단계는 내가 직접 바꿀 수 있는 부분이고, 3~5단계는 팀과 회사에 제안할 부분입니다.</p></div><ol class="aidx-plan-list">' + tips + '</ol></section>';
    return h;
  }

  function companyReport() {
    var P = state.pool, rows = P.rows, n = rows.length;
    if (!n) return '<section class="aidx-home"><p>아직 응답이 없습니다.</p></section>';
    var A = aggregate(rows), h = '';
    h += '<p class="aidx-context">' + esc(groupLabel(P.group)) + ' · 응답 ' + n + '명' + (PREVIEW ? ' (시험 모드: 이 브라우저의 응답만)' : '') + '</p>';
    if (n < MIN_N) h += '<p class="aidx-note">아직 응답이 ' + n + '명입니다. ' + MIN_N + '명 이상 모이면 회사 결과가 안정됩니다. 회사 전체를 대표하려면 부서와 직급이 고르게 응답해야 합니다.</p>';

    // 1. 한 줄 요약
    var bott = A.stage < 5 ? A.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">우리 회사의 AX 준비 단계</p>' +
      '<h2>' + stageTitle(A.stage) + '</h2><p>' + STAGE_DESC[A.stage] + '</p>' +
      (bott >= 0 ? '<p>병목은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>(평균 ' + sc(A.lvMean[bott]) + '점)입니다. 이 단계에서 "준비됨"(60점 이상)이라고 본 응답자는 ' + r0(A.ready[bott]) + '%입니다.</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(A.stage, '회사 준비 단계 ' + A.stage + '단계') + '</div></section>';

    // 2. 핵심 숫자
    var g = nn(rows.map(function (r) { return r.g; }));
    var unkOrg = (A.unkPct[3] + A.unkPct[4]) / 2;
    h += '<div class="kpis aidx-kpis">' +
      kpi('응답자', n + '<small>명</small>', esc(groupLabel(P.group))) +
      kpi('준비된 단계', A.stage + '<small>/ 5단계</small>', bott >= 0 ? '병목: ' + STAGES[bott].name : '전 단계 준비') +
      kpi('전반 인식', g.length ? r0(mean(g)) + '<small>/ 100</small>' : '–', 'AX 의지·역량에 대한 인식 (G1·G2)') +
      kpi('"잘 모르겠다"', r0(unkOrg) + '<small>%</small>', '조직·전사 시스템 문항 평균') +
      '</div>';

    // 3. 단계별 프로파일
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">단계별 회사 평균</h3><p class="panel-sub">0~100점 · 점선은 준비 기준 60점</p>' +
      stageBars(A.lvMean, null, '', A.lvMean.map(function (v, i) { return v === null ? '판단 보류' : r0(A.ready[i]) + '% 준비'; })) +
      '<p class="aidx-small">오른쪽 비율은 그 단계를 60점 이상으로 본 응답자 비율입니다.</p></div>' +
      '<div class="panel"><h3 class="panel-title">단계별 수준 분포</h3><p class="panel-sub">각 단계에서 시작·형성·정착·주도 수준으로 본 응답자 비율</p>' +
      '<div class="legend">' + ['시작', '형성', '정착', '주도'].map(function (t) { return '<span class="lg"><span class="aidx-sw ' + lvlCls(t) + '"></span>' + t + '</span>'; }).join('') + '</div>' +
      '<div class="aidx-stack">' + STAGES.map(function (st, s) {
        var cnt = { '시작': 0, '형성': 0, '정착': 0, '주도': 0 }, m = 0;
        rows.forEach(function (r) { if (r.lv[s] !== null) { cnt[level(r.lv[s])]++; m++; } });
        return '<div class="aidx-srow"><span class="aidx-sname">' + (s + 1) + '. ' + st.name + '</span><div class="aidx-sbar">' + (m ? ['시작', '형성', '정착', '주도'].map(function (t) {
          var p = cnt[t] / m * 100;
          return p ? '<span class="' + lvlCls(t) + '" style="width:' + p + '%" data-tip="' + esc(st.name + ' · ' + t + ' ' + cnt[t] + '명 (' + Math.round(p) + '%)') + '">' + (p >= 9 ? Math.round(p) : '') + '</span>' : '';
        }).join('') : '') + '</div></div>';
      }).join('') + '</div></div></section>';

    // 4. 기초 통계
    h += '<div class="panel"><h3 class="panel-title">단계별 기초 통계</h3>' +
      '<p class="panel-sub">합의도 rwg(j)는 회사 수준 단계(조직·전사 시스템)에서, 신뢰도 α는 "모르겠다" 없이 응답한 사람이 10명 이상일 때 표시</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>평균</th><th>SD</th><th>준비됨</th><th>모르겠다</th><th>합의도</th><th>α</th></tr></thead><tbody>' +
      STAGES.map(function (st, s) {
        var rw = st.unk && n >= MIN_N ? rwgj(rows, s * 5, s * 5 + 5) : null, al = alpha(rows, s * 5, s * 5 + 5);
        return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(A.lvMean[s]) + '</strong></td><td>' + r0(A.lvSd[s]) + '</td><td>' + r0(A.ready[s]) + '%</td>' +
          '<td>' + (st.unk ? r0(A.unkPct[s]) + '%' : '–') + '</td><td>' + (rw === null ? '–' : f2(rw)) + '</td><td>' + (al === null ? '–' : f2(al)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="aidx-small">합의도가 .70 이상이면 구성원들이 회사 상태를 비슷하게 보고 있어 평균을 회사의 상태로 읽을 수 있습니다. 낮으면 부서나 직급에 따라 경험이 다르다는 뜻이므로 "응답자 구분별 비교"를 함께 보세요. "모르겠다"가 30%를 넘는 단계는 회사가 그 내용을 구성원에게 충분히 알리지 않았다는 신호입니다.</p></div>';

    // 5. 갖춘 것과 비어 있는 것
    var im = ITEMS.slice(0, NS).map(function (it) {
      var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; });
      return { it: it, m: v.length ? mean(v) : null };
    }).filter(function (x) { return x.m !== null; }).sort(function (a, b) { return b.m - a.m; });
    function itemList(list) { return '<ul class="aidx-list">' + list.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + STAGES[Math.floor(x.it.idx / 5)].name + ' · ' + f1(x.m) + '</span></li>'; }).join('') + '</ul>'; }
    var unkTop = ITEMS.slice(0, NS).filter(function (it) { return it.unk; }).map(function (it) {
      return { it: it, p: rows.filter(function (r) { return r.a[it.idx] === 0; }).length / n * 100 };
    }).sort(function (a, b) { return b.p - a.p; }).slice(0, 3).filter(function (x) { return x.p > 0; });
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">가장 잘 갖춘 것과 가장 비어 있는 것</h3><p class="panel-sub">문항 평균 (1~5점, "모르겠다" 제외)</p>' +
      '<p class="aidx-small">가장 잘 갖춘 것</p>' + itemList(im.slice(0, 3)) +
      '<p class="aidx-small">가장 비어 있는 것</p>' + itemList(im.slice(-3).reverse()) + '</div>' +
      '<div class="panel"><h3 class="panel-title">구성원이 잘 모르는 것</h3><p class="panel-sub">"잘 모르겠다" 응답 비율이 높은 문항</p>' +
      (unkTop.length ? '<ul class="aidx-list">' + unkTop.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + r0(x.p) + '%</span></li>'; }).join('') + '</ul>'
        : '<p>"잘 모르겠다" 응답이 없습니다.</p>') + '</div></section>';

    // 6. 다음 단계로 가려면
    if (bott >= 0) {
      var ahead = [bott, bott + 1].filter(function (s) { return s < 5; });
      h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">다음 단계로 가려면</p><h3>' + josa(STAGES[bott].name, '을', '를') + ' 먼저 채우세요</h3>' +
        '<p>앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작습니다. 병목 단계부터 우선순위를 두세요.</p></div>' +
        '<ol class="aidx-plan-list">' + ahead.map(function (s, i) {
          var low = ITEMS.slice(s * 5, s * 5 + 5).map(function (it) { var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; }); return { it: it, m: v.length ? mean(v) : 9 }; })
            .sort(function (a, b) { return a.m - b.m; }).slice(0, 2);
          return '<li class="aidx-plan-card' + (i ? ' keep' : '') + '"><p class="aidx-plan-h"><span class="aidx-prio">' + (i + 1) + '</span>' + STAGES[s].icon + ' ' + (s + 1) + '단계 ' + STAGES[s].name +
            ' <span class="aidx-muted">평균 ' + sc(A.lvMean[s]) + '점 · 책임: ' + STAGES[s].owner + '</span></p>' +
            '<ul class="aidx-list">' + ACTIONS[STAGES[s].key].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
            '<p class="aidx-small">점수가 가장 낮은 항목</p><ul class="aidx-list aidx-check">' + low.map(function (x) { return '<li>' + esc(x.it.text) + '</li>'; }).join('') + '</ul></li>';
        }).join('') + '</ol></section>';
    }

    // 7. 도구 점검 (타당화용)
    var fit = orderFit(rows);
    var both = rows.filter(function (r) { return r.g !== null && r.lv.every(function (v) { return v !== null; }); });
    var rg = both.length >= 10 ? pearson(both.map(function (r) { return mean(r.lv); }), both.map(function (r) { return r.g; })) : null;
    h += '<div class="panel"><h3 class="panel-title">진단 도구 점검</h3><p class="panel-sub">응답이 쌓이면 이 진단의 가정이 맞는지 확인하는 지표 (10명 이상일 때 표시)</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>지표</th><th>값</th><th>뜻</th></tr></thead><tbody>' +
      '<tr><td>단계 순서 일치율</td><td>' + (fit ? r0(fit.pct) + '% (' + fit.n + '명)' : '–') + '</td><td>단계 순서를 거스른 응답이 없는 비율 (높을수록 순서 가정이 맞음)</td></tr>' +
      '<tr><td>단계 점수와 전반 인식의 상관</td><td>' + (rg === null ? '–' : 'r = ' + f2(rg)) + '</td><td>단계 점수가 AX 의지·역량 인식과 함께 움직이는 정도</td></tr>' +
      '</tbody></table></div></div>';
    return h;
  }

  function compareReport() {
    var P = state.pool, rows = P.rows, n = rows.length;
    var groups = ROLES.map(function (rl) { return { rl: rl, rs: rows.filter(function (r) { return r.role === rl; }) }; }).filter(function (x) { return x.rs.length >= MIN_ROLE; });
    var h = '<p class="aidx-context">' + esc(groupLabel(P.group)) + ' · 응답 ' + n + '명</p>';
    if (groups.length < 2) {
      return h + '<section class="aidx-home"><p>응답자 구분별 비교는 두 구분 이상에서 각각 ' + MIN_ROLE + '명 이상 응답해야 볼 수 있습니다. 응답자를 알아볼 수 없도록 인원이 적은 구분은 표시하지 않습니다.</p></section>';
    }
    var aggs = groups.map(function (x) { return { rl: x.rl, n: x.rs.length, A: aggregate(x.rs) }; });
    h += '<div class="panel"><h3 class="panel-title">응답자 구분별 단계 평균</h3><p class="panel-sub">' + MIN_ROLE + '명 이상인 구분만 표시 · 마지막 열은 그 구분의 평균으로 판정한 준비 단계</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>n</th>' + STAGES.map(function (st, i) { return '<th>' + (i + 1) + '. ' + st.name + '</th>'; }).join('') + '<th>준비 단계</th></tr></thead><tbody>' +
      aggs.map(function (x) {
        return '<tr><td>' + x.rl + '</td><td>' + x.n + '</td>' + x.A.lvMean.map(function (v) { return '<td>' + sc(v) + '</td>'; }).join('') + '<td><strong>' + x.A.stage + '단계</strong></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    // 경영진·리더와 실무자의 인식 차이
    var staff = aggs.filter(function (x) { return x.rl === ROLES[0]; })[0];
    var lead = aggs.filter(function (x) { return x.rl === ROLES[2]; })[0] || aggs.filter(function (x) { return x.rl === ROLES[1]; })[0];
    if (staff && lead) {
      var diffs = STAGES.map(function (_, s) { return staff.A.lvMean[s] !== null && lead.A.lvMean[s] !== null ? lead.A.lvMean[s] - staff.A.lvMean[s] : null; });
      var big = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })[0];
      h += '<section class="aidx-gap ' + (big && Math.abs(big.d) >= 15 ? 'ahead' : 'match') + '"><p class="aidx-eyebrow">' + lead.rl + '과 실무자의 인식 차이</p>' +
        '<h3>' + (big && Math.abs(big.d) >= 15 ? josa(STAGES[big.s].name, '을', '를') + ' 두고 보는 눈이 ' + r0(Math.abs(big.d)) + '점 다릅니다' : '단계마다 인식 차이가 크지 않습니다') + '</h3>' +
        '<div class="aidx-gbars">' + STAGES.map(function (st, s) {
          return '<div class="aidx-grow"><span>' + st.name + '</span><span class="aidx-gtrack"><span style="width:' + (lead.A.lvMean[s] || 0) + '%"></span></span><b>' + sc(lead.A.lvMean[s]) + '</b></div>' +
            '<div class="aidx-grow act"><span><small>실무자</small></span><span class="aidx-gtrack"><span style="width:' + (staff.A.lvMean[s] || 0) + '%"></span></span><b>' + sc(staff.A.lvMean[s]) + '</b></div>';
        }).join('') + '</div>' +
        '<p>위 막대는 ' + lead.rl + ', 아래 막대는 실무자의 평균입니다. ' +
        (big && big.d >= 15 ? '리더가 실무자보다 준비 상태를 높게 보고 있습니다. 리더가 마련했다고 생각하는 제도나 도구가 현장까지 닿지 않았을 수 있습니다.'
          : big && big.d <= -15 ? '실무자가 리더보다 준비 상태를 높게 보고 있습니다. 현장의 준비가 리더에게 보이지 않거나, 리더가 기대하는 수준이 더 높을 수 있습니다.'
          : '같은 상태를 비슷하게 보고 있어, 회사 평균을 공통의 출발점으로 삼을 수 있습니다.') + '</p></section>';
    }
    h += '<p class="aidx-small">응답 수가 적으면 차이가 커 보여도 우연일 수 있습니다. 표본이 작을 때는 참고용으로 보세요.</p>';
    return h;
  }

  // ---------- 이벤트 ----------
  function render() { if (state.view === 'home') viewHome(); else if (state.view === 'survey') viewSurvey(); }
  function go(view) { state.view = view; render(); window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 }); }

  root.addEventListener('change', function (e) {
    var t = e.target;
    state.pending = null;
    if (t.name === 'role') state.role = t.value;
    else if (t.type === 'radio') {
      state.answers[t.name] = +t.value;
      var li = t.closest('.aidx-item'); if (li) li.classList.remove('is-miss');
    }
    var bar = root.querySelector('.aidx-progress');
    if (bar) { var done = answered() + (state.role ? 1 : 0); bar.firstChild.style.width = (done / (NI + 1) * 100) + '%'; bar.setAttribute('aria-valuenow', done); }
  });

  root.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-tab]');
    if (tb) { if (!state.pool) { analyze(tb.dataset.tab); return; } state.tab = tb.dataset.tab; viewResult(); return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'start') { state.answers = {}; state.role = ''; state.pending = null; state.page = -1; state.started = Date.now(); go('survey'); }
    else if (act === 'home') { go('home'); }
    else if (act === 'prev') { if (state.page === -1) go('home'); else { state.page--; go('survey'); } }
    else if (act === 'next') {
      var miss = pageComplete(), err = document.getElementById('axr-err');
      if (miss) {
        err.textContent = miss === 'role' ? '응답자 구분을 골라 주세요.' : '응답하지 않은 문항이 있습니다.';
        if (miss !== 'role') {
          PAGES[state.page].forEach(function (it) { if (state.answers[it.code] === undefined) document.getElementById('q-' + it.code).classList.add('is-miss'); });
          document.getElementById('q-' + miss).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (state.page < PAGES.length - 1) { state.page++; go('survey'); return; }
      var rec = state.pending || { id: newId(), group: GROUP, role: state.role, answers: ITEMS.map(function (it) { return state.answers[it.code]; }), seconds: Math.round((Date.now() - state.started) / 1000) };
      state.pending = rec; b.disabled = true; err.textContent = '저장하는 중…';
      submit(rec).then(function () {
        state.me = rec; state.pending = null; state.pool = null; save(LS_ME, rec); viewDone();
      }).catch(function () { b.disabled = false; err.textContent = '저장하지 못했습니다. 잠시 뒤 응답 제출을 다시 눌러 주세요.'; });
    }
    else if (act === 'analyze') { analyze('me'); }
    else if (act === 'copycode') {
      var code = b.dataset.code;
      var ok = function () { b.textContent = '복사했습니다'; b.classList.add('is-done'); setTimeout(function () { b.textContent = '복사'; b.classList.remove('is-done'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, function () { window.prompt('결과 코드를 복사하세요', code); });
      else window.prompt('결과 코드를 복사하세요', code);
    }
    else if (act === 'my' || act === 'group') {
      var me = load(LS_ME), tab = act === 'my' ? 'me' : 'group';
      if (me) { state.me = me; state.pool = null; analyze(tab); return; }
      state.gateTab = tab;
      if (state.view !== 'home' || !document.getElementById('axr-gate')) go('home');
      document.getElementById('axr-gate-msg').textContent = (tab === 'me' ? '내 결과는' : '우리 회사 분석결과는') + ' 먼저 진단을 완료해야 볼 수 있습니다.';
      document.getElementById('axr-gate').hidden = false;
      document.getElementById('axr-code').hidden = true;
    }
    else if (act === 'code') { document.getElementById('axr-code').hidden = false; document.getElementById('axr-code-in').focus(); }
  });

  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'axr-code') return;
    e.preventDefault();
    var id = document.getElementById('axr-code-in').value.toUpperCase().replace(/[^A-Z0-9]/g, ''), err = document.getElementById('axr-code-err');
    if (id.length !== 8) { err.textContent = '코드 8자리를 입력해 주세요.'; return; }
    err.textContent = '찾는 중…';
    fetchOne(id).then(function (rec) {
      if (!rec) { err.textContent = '해당 코드의 응답이 없습니다.'; return; }
      state.me = rec; state.pool = null; save(LS_ME, rec); analyze(state.gateTab || 'me');
    }).catch(function () { err.textContent = '불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; });
  });

  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  render();
})();

// Research help: 연구 모형 그림 만들기 도구.
//   옵션 2. 글로 쓰면 도식으로 — 전용 짧은 문법을 Graphviz(DOT)로 바꾸고 viz.js로 그린다.
//   옵션 3. 그림판에서 직접 그리기 — Excalidraw 그림판을 큰 창으로 띄우고, 저장하면 PNG로 돌려준다.
// 두 옵션 모두 결과는 PNG data URL이며, 기존 '연구 모형 그림' 저장 흐름(옵션 1과 같은 길)에 그대로 들어간다.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchHelpModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 옵션 2: 글 → 도식 ───────────────────────────────────────
  //   A -> B            직접 경로              A -> M -> B         여러 단계(매개)를 한 줄에
  //   W -> (A -> B)     W가 A→B 관계를 조절     A -> B : H1         화살표에 가설 번호
  //   통제: 성별, 근속연수  통제변수(점선)         # 메모              그림에 나오지 않음
  var FONT = 'Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif';
  var TEMPLATES = [
    { key: 'mediation', label: '매개', text: '# 매개 모형: 독립변수가 매개변수를 거쳐 종속변수에 영향을 줍니다.\n직무 자율성 -> 일 몰입 : H1\n일 몰입 -> 혁신 행동 : H2\n직무 자율성 -> 혁신 행동 : H3' },
    { key: 'moderation', label: '조절', text: '# 조절 모형: 조절변수가 두 변수 관계의 강도를 바꿉니다.\n직무 자율성 -> 혁신 행동 : H1\n심리적 안정감 -> (직무 자율성 -> 혁신 행동) : H2' },
    { key: 'modmed', label: '조절된 매개', text: '# 조절된 매개 모형: 매개 경로의 앞부분(X → M)을 조절변수가 조절합니다.\n직무 자율성 -> 일 몰입 -> 혁신 행동\n직무 자율성 -> 혁신 행동\n심리적 안정감 -> (직무 자율성 -> 일 몰입)\n통제: 성별, 근속연수' },
    { key: 'parallel', label: '병렬 매개', text: '# 병렬 매개 모형: 매개변수 두 개가 나란히 있습니다.\n직무 자율성 -> 일 몰입 -> 혁신 행동\n직무 자율성 -> 자기효능감 -> 혁신 행동\n직무 자율성 -> 혁신 행동' },
    { key: 'serial', label: '순차 매개', text: '# 순차(이중) 매개 모형: 매개변수 두 개를 차례로 거칩니다.\n직무 자율성 -> 일 몰입 -> 자기효능감 -> 혁신 행동\n직무 자율성 -> 혁신 행동' },
    { key: 'regression', label: '회귀분석', text: '# 다중회귀분석: 여러 독립변수가 하나의 종속변수에 주는 영향을 함께 봅니다.\n# 통제변수를 넣은 뒤에도 각 독립변수의 효과가 남는지 확인합니다(위계적 회귀).\n직무 자율성 -> 혁신 행동 : H1\n자기효능감 -> 혁신 행동 : H2\n상사 지원 -> 혁신 행동 : H3\n통제: 성별, 연령, 근속연수' },
    { key: 'sem', label: '구조방정식', text: '# 구조방정식 모형(SEM): 각 상자는 여러 문항으로 측정한 잠재변수입니다.\n# 먼저 확인적 요인분석(CFA)으로 측정모형을 확인한 뒤, 아래 구조모형(경로)을 검증합니다.\n변혁적 리더십 -> 심리적 임파워먼트 : H1\n심리적 임파워먼트 -> 직무 몰입 : H2\n변혁적 리더십 -> 직무 몰입 : H3\n직무 몰입 -> 이직 의도 : H4' },
    { key: 'predict', label: '예측모형', text: '# 예측모형: 여러 예측변수로 결과(예: 이직 여부)를 얼마나 잘 맞히는지 봅니다.\n# 로지스틱 회귀나 머신러닝(랜덤 포레스트 등)을 쓰고, 정확도·AUC와 변수 중요도를 보고합니다.\n직무 만족 -> 이직 여부\n임금 만족 -> 이직 여부\n상사 지원 -> 이직 여부\n경력 개발 기회 -> 이직 여부\n근속연수 -> 이직 여부' },
    { key: 'lpa', label: 'LPA', text: '# 잠재 프로파일 분석(LPA): 연속형 지표(예: 몰입 하위요인 점수)로 응답자를 몇 개의 프로파일로 나눕니다.\n# 프로파일 수는 AIC·BIC·엔트로피·LMR 검정으로 정하고, 선행요인과 결과변수를 함께 봅니다.\n잠재 프로파일 -> 활력 점수\n잠재 프로파일 -> 헌신 점수\n잠재 프로파일 -> 몰두 점수\n변혁적 리더십 -> 잠재 프로파일 : H1\n잠재 프로파일 -> 혁신 행동 : H2' },
    { key: 'lca', label: 'LCA', text: '# 잠재 계층 분석(LCA): 범주형 지표(예/아니오 등)로 응답자를 몇 개의 계층(유형)으로 나눕니다.\n# 계층 수는 AIC·BIC·엔트로피로 정하고, 계층을 가르는 요인과 계층별 결과 차이를 봅니다.\n학습 참여 유형 -> 사내 교육 참여\n학습 참여 유형 -> 온라인 학습 이용\n학습 참여 유형 -> 멘토링 참여\n학습 참여 유형 -> 자격증 취득\n연령 -> 학습 참여 유형 : H1\n학습 참여 유형 -> 경력 만족 : H2' },
    { key: 'anova', label: 'ANOVA', text: '# 이원분산분석(ANOVA): 집단(범주형 변수)에 따라 종속변수의 평균이 다른지 봅니다.\n# 두 요인의 상호작용은 조절과 같은 모양(괄호)으로 그립니다. 사후검정(Scheffé, Tukey 등)을 함께 보고합니다.\n교육 방식 -> 학습 전이 : H1\n직급 -> 학습 전이 : H2\n직급 -> (교육 방식 -> 학습 전이) : H3' }
  ];
  var SYNTAX = [
    ['A -> B', 'A가 B에 영향을 줍니다 (직접 경로).'],
    ['A -> M -> B', '여러 단계를 한 줄에 이어 씁니다 (매개 경로).'],
    ['W -> (A -> B)', 'W가 A → B 관계를 조절합니다. 조절하는 경로를 괄호로 감쌉니다.'],
    ['A -> B : H1', '화살표에 가설 번호를 붙입니다 (화살표가 하나인 줄에만).'],
    ['통제: 성별, 근속연수', '통제변수를 쉼표로 나눠 적습니다 (점선 상자).'],
    ['# 메모', '#으로 시작하는 줄은 그림에 나오지 않습니다.']
  ];

  function parse(text) {
    var nodes = [], edges = [], mods = [], controls = [], errors = [];
    function node(name, line) {
      name = String(name).replace(/\s+/g, ' ').trim();
      if (!name) { errors.push(line + '번째 줄: 화살표(->) 앞뒤에 변수 이름이 비어 있습니다.'); return null; }
      if (/[()]/.test(name)) { errors.push(line + '번째 줄: 괄호는 조절할 경로를 감쌀 때만 씁니다. 예: W -> (A -> B)'); return null; }
      if (name.length > 40) { errors.push(line + '번째 줄: 변수 이름은 40자 이내로 써 주세요.'); return null; }
      if (nodes.indexOf(name) < 0) nodes.push(name);
      return name;
    }
    function edge(from, to, label) {
      for (var i = 0; i < edges.length; i++) {
        if (edges[i].from === from && edges[i].to === to) { if (label && !edges[i].label) edges[i].label = label; return edges[i]; }
      }
      var e = { from: from, to: to, label: label || '' };
      edges.push(e);
      return e;
    }
    String(text || '').split(/\r?\n/).forEach(function (raw, i) {
      var line = i + 1;
      var s = raw.replace(/[→⟶➔➜]/g, '->').replace(/（/g, '(').replace(/）/g, ')').replace(/：/g, ':').trim();
      if (!s || /^(#|\/\/)/.test(s)) return;
      var m = /^통제(?:변수)?\s*:\s*(.*)$/.exec(s);
      if (m) {
        var before = controls.length;
        m[1].split(/[,，、]/).forEach(function (c) { c = c.replace(/\s+/g, ' ').trim(); if (c && controls.indexOf(c) < 0) controls.push(c); });
        if (controls.length === before) errors.push(line + '번째 줄: 통제변수 이름을 쉼표로 나눠 적어 주세요. 예: 통제: 성별, 근속연수');
        return;
      }
      if (s.indexOf('->') < 0) { errors.push(line + '번째 줄: 화살표(->)가 없습니다. 예: 직무 자율성 -> 혁신 행동'); return; }
      var label = '';
      m = /^(.*\S)\s*:\s*([^:>()]{1,12})$/.exec(s);
      if (m && m[1].indexOf('->') >= 0) { s = m[1]; label = m[2].trim(); }
      m = /^(.+?)\s*->\s*\(\s*(.+?)\s*\)$/.exec(s);
      if (m) {
        var inner = m[2].split('->');
        if (inner.length !== 2) { errors.push(line + '번째 줄: 괄호 안에는 화살표가 하나인 경로를 씁니다. 예: W -> (A -> B)'); return; }
        var w = node(m[1], line), a = node(inner[0], line), b = node(inner[1], line);
        if (!w || !a || !b) return;
        if (a === b) { errors.push(line + '번째 줄: 같은 변수끼리 화살표를 이을 수 없습니다.'); return; }
        if (w === a || w === b) { errors.push(line + '번째 줄: 조절변수는 괄호 안 경로의 변수와 달라야 합니다.'); return; }
        mods.push({ from: w, edge: edge(a, b, ''), label: label });
        return;
      }
      if (/[()]/.test(s)) { errors.push(line + '번째 줄: 조절은 W -> (A -> B)처럼 조절할 경로 전체를 괄호로 감싸 주세요.'); return; }
      var parts = s.split('->');
      if (label && parts.length > 2) { errors.push(line + '번째 줄: 가설 번호(: H1)는 화살표가 하나인 줄에만 붙일 수 있습니다.'); return; }
      var names = parts.map(function (p) { return node(p, line); });
      if (names.indexOf(null) >= 0) return;
      for (var k = 0; k + 1 < names.length; k++) {
        if (names[k] === names[k + 1]) { errors.push(line + '번째 줄: 같은 변수끼리 화살표를 이을 수 없습니다.'); return; }
      }
      for (k = 0; k + 1 < names.length; k++) edge(names[k], names[k + 1], label);
    });
    if (!errors.length && !edges.length) errors.push('관계를 한 줄 이상 적어 주세요. 예: 직무 자율성 -> 혁신 행동');
    if (nodes.length > 20) errors.push('변수가 너무 많습니다(20개 이하).');
    return { nodes: nodes, edges: edges, mods: mods, controls: controls, errors: errors };
  }

  function toDot(text) {
    var m = parse(text);
    if (m.errors.length) return { dot: '', errors: m.errors };
    var q = function (s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'; };
    var id = function (name) { return 'n' + m.nodes.indexOf(name); };
    // Graphviz는 한글 폭을 좁게 잡으므로 상자 너비를 직접 계산해 준다(14pt 기준, 인치).
    var width = function (label, size) {
      var k = (size || 14) / 14;
      var px = Math.max.apply(null, String(label).split('\n').map(function (l) {
        var w = 0;
        for (var i = 0; i < l.length; i++) w += /[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(l[i]) ? 14 : l[i] === ' ' ? 4.5 : 8.2;
        return w;
      }));
      return (px * k / 72 + 0.5).toFixed(2);
    };
    var lab = function (l) { return l ? 'label=' + q(' ' + l + ' ') : ''; };
    var attrs = function (list) { list = list.filter(Boolean); return list.length ? ' [' + list.join(', ') + ']' : ''; };
    var out = ['digraph model {',
      '  graph [rankdir=LR, nodesep=0.55, ranksep=0.9, pad=0.3, bgcolor="white"];',
      '  node [shape=box, style="rounded", color="#333333", fontcolor="#111111", fontname=' + q(FONT) + ', fontsize=14, height=0.55];',
      '  edge [color="#333333", arrowsize=0.8, fontname=' + q(FONT) + ', fontsize=12, fontcolor="#1d4ed8"];'];
    m.nodes.forEach(function (n) { out.push('  ' + id(n) + ' [label=' + q(n) + ', width=' + width(n) + '];'); });
    var placed = {};
    m.edges.forEach(function (e, i) {
      var ms = m.mods.filter(function (x) { return x.edge === e; });
      if (!ms.length) { out.push('  ' + id(e.from) + ' -> ' + id(e.to) + attrs([lab(e.label)]) + ';'); return; }
      // 조절되는 경로는 가운데에 작은 점을 두고, 조절변수 화살표를 그 점에 꽂는다.
      var p = 'p' + i;
      out.push('  ' + p + ' [shape=point, width=0.07, color="#333333", label=""];');
      out.push('  ' + id(e.from) + ' -> ' + p + attrs(['arrowhead=none', lab(e.label)]) + ';');
      out.push('  ' + p + ' -> ' + id(e.to) + ';');
      ms.forEach(function (x) {
        out.push('  ' + id(x.from) + ' -> ' + p + attrs([lab(x.label)]) + ';');
        // 조절변수는 처음 조절하는 경로의 점과 같은 열에 두어 화살표가 위(아래)에서 꽂히게 한다.
        if (!placed[x.from]) { placed[x.from] = 1; out.push('  { rank=same; ' + id(x.from) + '; ' + p + '; }'); }
      });
    });
    if (m.controls.length) {
      var outgoing = {};
      m.edges.forEach(function (e) { outgoing[e.from] = 1; });
      m.mods.forEach(function (x) { outgoing[x.from] = 1; });
      var sinks = m.nodes.filter(function (n) { return !outgoing[n]; });
      if (!sinks.length) sinks = [m.nodes[m.nodes.length - 1]];
      var cl = '통제변수\n' + m.controls.join(', ');
      out.push('  ctrl [label=' + q(cl) + ', style="rounded,dashed", color="#777777", fontcolor="#444444", fontsize=12, width=' + width(cl, 12) + '];');
      sinks.forEach(function (n) { out.push('  ctrl -> ' + id(n) + ' [style=dashed, color="#777777"];'); });
      out.push('  { rank=same; ctrl; ' + id(sinks[0]) + '; }');
    }
    out.push('}');
    return { dot: out.join('\n'), errors: [] };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = src; sc.async = false; sc.crossOrigin = 'anonymous';
      sc.onload = function () { resolve(); };
      sc.onerror = function () { reject(new Error('도구를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.')); };
      document.head.appendChild(sc);
    });
  }
  function once(fn) {
    var p = null;
    return function () {
      if (!p) { p = fn(); p.catch(function () { p = null; }); }
      return p;
    };
  }

  var VIZ_SRC = 'https://cdn.jsdelivr.net/npm/@viz-js/viz@3.31.0/dist/viz-global.js';
  var loadViz = once(function () {
    return (window.Viz ? Promise.resolve() : loadScript(VIZ_SRC)).then(function () { return window.Viz.instance(); });
  });
  // 글 → SVG 요소. 문법 오류는 { errors } 로 돌려준다.
  function renderText(text) {
    var r = toDot(text);
    if (r.errors.length) return Promise.resolve({ errors: r.errors });
    return loadViz().then(function (viz) {
      try { return { svg: viz.renderSVGElement(r.dot), errors: [] }; }
      catch (e) { return { errors: ['도식을 그리지 못했습니다. 관계를 조금 단순하게 바꿔 보세요.'] }; }
    });
  }

  // SVG → 흰 배경 PNG data URL(긴 변 최대 1600px).
  function svgToPng(svg) {
    return new Promise(function (resolve, reject) {
      var vb = String(svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      var w = vb[2] || parseFloat(svg.getAttribute('width')) || 600, h = vb[3] || parseFloat(svg.getAttribute('height')) || 300;
      var scale = Math.min(2.5, 1600 / Math.max(w, h));
      var copy = svg.cloneNode(true);
      copy.setAttribute('width', w); copy.setAttribute('height', h);
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var img = new Image();
      img.onerror = function () { reject(new Error('도식을 그림으로 바꾸지 못했습니다.')); };
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        var g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL('image/png')); } catch (e) { reject(new Error('도식을 그림으로 바꾸지 못했습니다.')); }
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copy));
    });
  }

  // ── 옵션 3: 그림판(Excalidraw) ──────────────────────────────
  var EXCALIDRAW = 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.6/dist/';
  var loadSketch = once(function () {
    window.EXCALIDRAW_ASSET_PATH = EXCALIDRAW;
    var chain = Promise.resolve();
    if (!window.React) chain = chain.then(function () { return loadScript('https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js'); });
    if (!window.ReactDOM) chain = chain.then(function () { return loadScript('https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js'); });
    return chain.then(function () { return window.ExcalidrawLib ? null : loadScript(EXCALIDRAW + 'excalidraw.production.min.js'); })
      .then(function () { return window.ExcalidrawLib; });
  });

  // 처음 열 때 놓아 둘 시작 틀: 독립 → 매개 → 종속 상자와 화살표. 상자 글자를 두 번 눌러 이름을 바꾼다.
  function starterElements(lib) {
    var box = function (id, x, y, text) {
      return { type: 'rectangle', id: id, x: x, y: y, width: 180, height: 70, strokeColor: '#1e1e1e', strokeWidth: 2, roughness: 0, roundness: { type: 3 },
        label: { text: text, fontSize: 20, fontFamily: 2 } };
    };
    var arrow = function (from, to, x, y, dx, dy) {
      return { type: 'arrow', x: x, y: y, width: dx, height: dy, points: [[0, 0], [dx, dy]], strokeColor: '#1e1e1e', strokeWidth: 2, roughness: 0,
        start: { id: from }, end: { id: to }, endArrowhead: 'arrow' };
    };
    return lib.convertToExcalidrawElements([
      box('x', 60, 220, '독립변수 X'), box('m', 340, 60, '매개변수 M'), box('y', 620, 220, '종속변수 Y'),
      arrow('x', 'm', 240, 240, 100, -135), arrow('m', 'y', 520, 105, 100, 135), arrow('x', 'y', 240, 255, 380, 0)
    ]);
  }

  // 큰 그림판 창을 연다. opts.scene = 이전에 저장한 장면(JSON 문자열), 저장하면 { dataUrl, scene } 으로 끝난다. 닫으면 null.
  function openSketch(opts) {
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.className = 'rh-sketch';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '연구 모형 그림판');
    overlay.innerHTML = '<div class="rh-sketch-bar">' +
      '<div class="rh-sketch-title"><strong>옵션 3. 그림판에서 연구 모형 그리기</strong>' +
      '<span>① 상자 글자를 두 번 눌러 변수 이름을 바꿉니다. ② 위쪽 도구에서 사각형(2)·화살표(5)·글자(8)로 변수와 경로를 더합니다. 화살표는 상자 가장자리에 끌어다 붙이면 상자를 옮겨도 따라옵니다. ③ 다 그렸으면 [저장하고 닫기]를 누릅니다.</span></div>' +
      '<div class="rh-sketch-buttons"><button type="button" class="rh-btn" data-act="cancel">취소</button>' +
      '<button type="button" class="rh-btn primary" data-act="save">저장하고 닫기</button></div></div>' +
      '<div class="rh-sketch-canvas"><p class="rh-sketch-loading">그림판을 여는 중입니다…</p></div>';
    document.body.appendChild(overlay);
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var holder = overlay.querySelector('.rh-sketch-canvas');
    var api = null, reactRoot = null, settled = false;

    return new Promise(function (resolve) {
      function close(result) {
        if (settled) return;
        settled = true;
        try { if (reactRoot) reactRoot.unmount(); } catch (e) { /* 무시 */ }
        document.body.style.overflow = prevOverflow;
        overlay.remove();
        resolve(result);
      }
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', function () {
        if (api && api.getSceneElements().length && !window.confirm('그린 내용을 저장하지 않고 닫을까요?')) return;
        close(null);
      });
      var saveBtn = overlay.querySelector('[data-act="save"]');
      saveBtn.disabled = true;
      saveBtn.addEventListener('click', function () {
        var lib = window.ExcalidrawLib;
        var elements = api.getSceneElements().filter(function (e) { return !e.isDeleted; });
        if (!elements.length) { window.alert('그림판이 비어 있습니다. 변수와 화살표를 그린 뒤 저장해 주세요.'); return; }
        saveBtn.disabled = true; saveBtn.textContent = '저장 중…';
        var files = api.getFiles();
        lib.exportToBlob({ elements: elements, files: files, mimeType: 'image/png', exportPadding: 24,
          appState: { exportBackground: true, viewBackgroundColor: '#ffffff', exportWithDarkMode: false, exportScale: 2 },
          getDimensions: function (w, h) { var s = Math.min(2, 1600 / Math.max(w, h)); return { width: Math.round(w * s), height: Math.round(h * s), scale: s }; }
        }).then(function (blob) {
          return new Promise(function (ok, fail) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = fail; r.readAsDataURL(blob); });
        }).then(function (dataUrl) {
          var scene = lib.serializeAsJSON(elements, { viewBackgroundColor: '#ffffff' }, files, 'local');
          close({ dataUrl: dataUrl, scene: scene });
        }, function () {
          saveBtn.disabled = false; saveBtn.textContent = '저장하고 닫기';
          window.alert('그림을 저장하지 못했습니다. 다시 시도해 주세요.');
        });
      });

      loadSketch().then(function (lib) {
        if (settled) return;
        holder.innerHTML = '';
        var initial = null;
        try { if (opts.scene) initial = lib.restore(JSON.parse(opts.scene), null, null); } catch (e) { initial = null; }
        var data = initial ? { elements: initial.elements, files: initial.files, appState: { viewBackgroundColor: '#ffffff' } }
          : { elements: starterElements(lib), appState: { viewBackgroundColor: '#ffffff', currentItemRoughness: 0, currentItemFontFamily: 2, currentItemStrokeWidth: 2 } };
        data.scrollToContent = true;
        var R = window.React;
        reactRoot = window.ReactDOM.createRoot(holder);
        reactRoot.render(R.createElement(lib.Excalidraw, {
          initialData: data, langCode: 'ko-KR', theme: 'light',
          excalidrawAPI: function (a) { api = a; saveBtn.disabled = false; },
          UIOptions: { canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: false, toggleTheme: false, changeViewBackgroundColor: false }, tools: { image: true } }
        }));
      }, function (err) {
        holder.innerHTML = '';
        var p = document.createElement('p');
        p.className = 'rh-sketch-loading is-error';
        p.textContent = err.message;
        holder.appendChild(p);
      });
    });
  }

  return { TEMPLATES: TEMPLATES, SYNTAX: SYNTAX, parse: parse, toDot: toDot, renderText: renderText, svgToPng: svgToPng, openSketch: openSketch };
});

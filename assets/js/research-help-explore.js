// 어서와, 연구는 처음이지? — 자유 서술을 받아 연구주제·변수·이론적 근거를 추천한다. 추천은 서버(research-help-backend/Code.gs의 explore)가 만든다.
(function () {
  'use strict';
  var DRAFT_KEY = 'research-help-explore-draft';
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    [].concat(children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }
  function store(v) {
    try { if (v === undefined) return localStorage.getItem(DRAFT_KEY) || ''; if (v) localStorage.setItem(DRAFT_KEY, v); else localStorage.removeItem(DRAFT_KEY); } catch (e) { return ''; }
  }
  function post(url, body, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, ms);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, message: '서버에 연결하지 못했거나 시간이 너무 오래 걸렸습니다. 잠시 후 다시 시도해 주세요.' }; })
      .then(function (res) { if (timer) clearTimeout(timer); return res; });
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function wrapLabel(t) {
    t = String(t || '');
    if (t.length <= 9) return [t];
    var cut = t.lastIndexOf(' ', 10); if (cut < 4) cut = Math.min(9, Math.ceil(t.length / 2));
    var second = t.slice(cut).trim();
    return [t.slice(0, cut).trim(), second.length > 10 ? second.slice(0, 9) + '…' : second];
  }
  // 연구모형 도식: 독립(왼쪽) → 매개(가운데) → 종속(오른쪽), 조절변수는 경로 가운데 위(막히면 아래)에서 점선으로 가리킨다.
  function modelDiagram(model) {
    var nodes = (model && model.nodes) || [];
    if (nodes.length < 2) return null;
    var BW = 150, BH = 56, W = 740;
    var by = function (role) { return nodes.filter(function (n) { return n.role === role; }); };
    var X = by('독립변수'), M = by('매개변수'), Y = by('종속변수'), Wm = by('조절변수'), C = by('통제변수');
    var paths = (model && model.paths) || [];
    var mIds = {};
    M.forEach(function (n) { mIds[n.id] = true; });
    var mPaths = paths.filter(function (p) { return mIds[p.from] && mIds[p.to]; });

    // 매개변수 사이에 경로가 있으면(직렬 매개) 위상 정렬해 왼쪽→오른쪽 순서로 세운다.
    if (mPaths.length && M.length > 1) {
      var inDeg = {}, adj = {}, mById = {};
      M.forEach(function (n) { inDeg[n.id] = 0; adj[n.id] = []; mById[n.id] = n; });
      mPaths.forEach(function (p) { adj[p.from].push(p.to); inDeg[p.to]++; });
      var q = M.filter(function (n) { return inDeg[n.id] === 0; }).map(function (n) { return n.id; });
      var ordered = [], seenM = {};
      while (q.length) {
        var cur = q.shift();
        if (seenM[cur]) continue;
        seenM[cur] = true;
        ordered.push(mById[cur]);
        adj[cur].forEach(function (nxt) { inDeg[nxt]--; if (inDeg[nxt] === 0) q.push(nxt); });
      }
      M.forEach(function (n) { if (!seenM[n.id]) ordered.push(n); });
      M = ordered;
    }

    var rowW = 24, rowM = Wm.length ? 120 : 24;
    var serialM = mPaths.length > 0 && M.length > 1;
    var hasXY = paths.some(function (p) {
      var fn = nodes.filter(function (n) { return n.id === p.from; })[0];
      var tn = nodes.filter(function (n) { return n.id === p.to; })[0];
      return fn && tn && fn.role === '독립변수' && tn.role === '종속변수';
    });
    var mGap = BH + 28;
    var mBlockH = M.length ? (serialM ? BH + 38 : M.length * mGap + 12) : 0;
    var base = rowM + mBlockH;
    var pos = {};
    function place(list, cx, top) { list.forEach(function (n, i) { pos[n.id] = { x: cx - BW / 2, y: top + i * (BH + 26), n: n }; }); }
    var stack = Math.max(X.length, Y.length, 1);
    // 병렬 매개변수가 2개 이상이고 X→Y 직접 경로가 없으면 X·Y를 전체 중앙 높이에 맞춘다.
    var yTop = (!serialM && M.length > 1 && !hasXY) ? rowM + Math.max(0, (M.length - stack) * mGap / 2) : base;
    place(X, 95, yTop);
    place(Y, W - 95, yTop + (stack - Y.length) * (BH + 26) / 2);
    if (M.length) {
      if (serialM) {
        var stepX = Math.min(BW + 44, (W - 2 * 190) / Math.max(M.length, 1));
        M.forEach(function (n, i) {
          pos[n.id] = { x: W / 2 - BW / 2 + (i - (M.length - 1) / 2) * stepX, y: rowM, n: n };
        });
      } else {
        M.forEach(function (n, i) {
          pos[n.id] = { x: W / 2 - BW / 2, y: rowM + i * mGap, n: n };
        });
      }
    }
    // 조절변수는 자신이 조절하는 경로의 가운데 위에 둔다(겹치지 않게 차례로 비켜 놓음).
    var used = [];
    Wm.forEach(function (n, i) {
      var m = (model.moderations || []).filter(function (x) { return x.by === n.id && pos[x.from] && pos[x.to]; })[0];
      var cx = m ? (pos[m.from].x + pos[m.to].x) / 2 + BW / 2 : W / 2 + (i - (Wm.length - 1) / 2) * (BW + 24);
      var x = Math.max(0, Math.min(W - BW, cx - BW / 2));
      used.forEach(function (u) { if (Math.abs(u - x) < BW + 12) x = Math.min(W - BW, u + BW + 12); });
      used.push(x);
      pos[n.id] = { x: x, y: rowW, n: n };
    });
    var maxNodeBottom = Math.max.apply(null, Object.keys(pos).map(function (id) { return pos[id].y + BH; }));
    var H = maxNodeBottom + 24;
    // 조절변수에서 경로 가운데로 내린 선이 다른 상자를 지나가면, 그 조절변수는 아래쪽 줄로 옮긴다.
    var bottomY = H + 4, movedDown = false;
    Wm.forEach(function (n) {
      var m = (model.moderations || []).filter(function (x) { return x.by === n.id && pos[x.from] && pos[x.to]; })[0];
      if (!m) return;
      var p = pos[n.id], cx = p.x + BW / 2;
      var midY = (pos[m.from].y + pos[m.to].y) / 2 + BH / 2;
      var blocked = Object.keys(pos).some(function (id) {
        if (id === n.id) return false;
        var q = pos[id];
        return q.x - 4 < cx && cx < q.x + BW + 4 && q.y + BH > p.y + BH && q.y < midY;
      });
      if (blocked) { p.y = bottomY; movedDown = true; }
    });
    if (movedDown) H = bottomY + BH + 16;
    // 위쪽이 비면(조절변수가 모두 아래로 갔을 때) 잘라 낸다.
    var minY = Math.min.apply(null, Object.keys(pos).map(function (id) { return pos[id].y; })) - 22;
    var root = svg('svg', { viewBox: '0 ' + minY + ' ' + W + ' ' + (H - minY), class: 'rhx-model-svg', role: 'img', 'aria-label': model.caption || '연구모형 도식' });
    var defs = svg('defs');
    var mk = svg('marker', { id: 'rhx-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    mk.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'rhx-arrowhead' }));
    defs.appendChild(mk); root.appendChild(defs);
    function center(id) { var p = pos[id]; return { x: p.x + BW / 2, y: p.y + BH / 2 }; }
    function edge(a, b) { // a 상자 테두리에서 b 쪽으로 나가는 점
      var dx = b.x - a.x, dy = b.y - a.y, t = Math.min((BW / 2 + 4) / Math.abs(dx || 1e-9), (BH / 2 + 4) / Math.abs(dy || 1e-9));
      return { x: a.x + dx * t, y: a.y + dy * t };
    }
    function hitsBox(s, e, fromId, toId) {
      return Object.keys(pos).some(function (id) {
        if (id === fromId || id === toId) return false;
        var q = pos[id], pad = 10;
        var x1 = q.x - pad, y1 = q.y - pad, x2 = q.x + BW + pad, y2 = q.y + BH + pad;
        for (var k = 1; k < 12; k++) {
          var t = k / 12, px = s.x + (e.x - s.x) * t, py = s.y + (e.y - s.y) * t;
          if (px >= x1 && px <= x2 && py >= y1 && py <= y2) return true;
        }
        return false;
      });
    }
    var mids = {};
    paths.forEach(function (p) {
      if (!pos[p.from] || !pos[p.to]) return;
      var a = center(p.from), b = center(p.to), s = edge(a, b), e = edge(b, a);
      if (hitsBox(s, e, p.from, p.to)) {
        var dir = ((a.y + b.y) / 2 <= rowM + BH) ? -48 : 48;
        var cx = (s.x + e.x) / 2, cy = (s.y + e.y) / 2 + dir;
        if (cy < minY + 12) { minY = cy - 12; root.setAttribute('viewBox', '0 ' + minY + ' ' + W + ' ' + (H - minY)); }
        if (cy > H - 12) { H = cy + 12; root.setAttribute('viewBox', '0 ' + minY + ' ' + W + ' ' + (H - minY)); }
        root.appendChild(svg('path', { d: 'M' + s.x.toFixed(1) + ' ' + s.y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + e.x.toFixed(1) + ' ' + e.y.toFixed(1), fill: 'none', class: 'rhx-path', 'marker-end': 'url(#rhx-arrow)' }));
        mids[p.from + '>' + p.to] = { x: 0.25 * s.x + 0.5 * cx + 0.25 * e.x, y: 0.25 * s.y + 0.5 * cy + 0.25 * e.y };
      } else {
        root.appendChild(svg('line', { x1: s.x, y1: s.y, x2: e.x, y2: e.y, class: 'rhx-path', 'marker-end': 'url(#rhx-arrow)' }));
        mids[p.from + '>' + p.to] = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
      }
    });
    (model.moderations || []).forEach(function (m) {
      var mid = mids[m.from + '>' + m.to]; if (!pos[m.by] || !mid) return;
      var a = center(m.by), s = edge(a, mid);
      root.appendChild(svg('line', { x1: s.x, y1: s.y, x2: mid.x, y2: mid.y, class: 'rhx-path is-mod', 'marker-end': 'url(#rhx-arrow)' }));
    });
    Object.keys(pos).forEach(function (id) {
      var p = pos[id], g = svg('g', { class: 'rhx-node is-' + ({ '독립변수': 'x', '매개변수': 'm', '종속변수': 'y', '조절변수': 'w' }[p.n.role] || 'x') });
      g.appendChild(svg('rect', { x: p.x, y: p.y, width: BW, height: BH, rx: 10 }));
      var lines = wrapLabel(p.n.label);
      lines.forEach(function (l, i) { g.appendChild(svg('text', { x: p.x + BW / 2, y: p.y + BH / 2 + (i - (lines.length - 1) / 2) * 17 + 5, 'text-anchor': 'middle', class: 'rhx-node-label' }, l)); });
      g.appendChild(svg('text', { x: p.x + 8, y: p.y - 6, class: 'rhx-node-role' }, p.n.role));
      root.appendChild(g);
    });
    var wrap = el('figure', { class: 'rhx-model' }, [root]);
    var foot = [];
    if (C.length) foot.push('통제변수: ' + C.map(function (n) { return n.label; }).join(', '));
    foot.push('실선 화살표는 직접 관계, 점선 화살표는 조절 관계(어떤 조건에서 관계의 크기가 달라지는지)를 뜻합니다.');
    wrap.appendChild(el('figcaption', {}, [model.caption ? el('strong', { text: model.caption }) : null].concat(foot.map(function (t) { return el('span', { text: t }); }))));
    return wrap;
  }

  function step(n, title, lead, body) {
    return el('section', { class: 'rhx-step' }, [
      el('div', { class: 'rhx-step-head' }, [el('span', { class: 'rhx-step-no', text: String(n) }), el('h3', { text: title })]),
      lead ? el('p', { class: 'rhx-lead', text: lead }) : null
    ].concat(body));
  }
  function varTable(list, extra) {
    if (!list || !list.length) return null;
    var heads = ['변수', '역할', '개념'].concat(extra ? ['함께 고려하면 좋은 이유'] : []).concat(['측정 방향 · 척도 검색어']);
    return el('div', { class: 'rhx-table-wrap' }, [el('table', { class: 'rhx-table' }, [
      el('thead', {}, [el('tr', {}, heads.map(function (h) { return el('th', { scope: 'col', text: h }); }))]),
      el('tbody', {}, list.map(function (v) {
        return el('tr', {}, [el('td', { class: 'rhx-var', text: v.name }), el('td', {}, [el('span', { class: 'rhx-role', text: v.role })]), el('td', { text: v.concept })]
          .concat(extra ? [el('td', { text: v.why })] : []).concat([el('td', { text: v.measure })]));
      }))
    ])]);
  }

  var EXPLORE_CLARIFY_OPTIONS = [
    { key: 'problem', label: '1. 연구의 문제의식' },
    { key: 'purpose', label: '2. 연구의 목적' },
    { key: 'theory', label: '3. 이론적 근거' },
    { key: 'variables', label: '4. 변수와 개념' },
    { key: 'model', label: '5. 연구모형' },
    { key: 'method', label: '5. 연구방법' },
    { key: 'considerations', label: '6. 앞으로 생각해 볼 고민거리' }
  ];

  function renderClarificationCard(c) {
    return el('article', { class: 'rh-clarify-card' }, [
      el('div', { class: 'rh-clarify-card-head' }, [
        el('strong', { text: '추가 설명' }),
        el('span', { class: 'rh-muted', text: c.generatedBy || 'AI' })
      ]),
      c.summary ? el('p', { class: 'rh-clarify-summary', text: c.summary }) : null
    ].concat((c.items || []).map(function (it) {
      return el('div', { class: 'rh-clarify-item' }, [
        el('h4', { text: it.label || it.topic }),
        el('p', { text: it.easyExplanation }),
        it.examples && it.examples.length ? el('div', {}, [
          el('strong', { class: 'rh-clarify-sub', text: '이해가 쉬워지는 예시' }),
          el('ul', {}, it.examples.map(function (ex) { return el('li', { text: ex }); }))
        ]) : null,
        it.checkTip ? el('p', { class: 'rh-clarify-tip' }, [el('strong', { text: '이렇게 다듬어 보세요 ' }), it.checkTip]) : null
      ]);
    })));
  }

  function clarifySection(r, ctx) {
    var picked = {};
    var note = el('textarea', { class: 'rh-text', rows: 2, maxlength: 500, placeholder: '특히 어떤 표현이나 개념이 헷갈렸는지 적어 주세요 (선택)' });
    var btn = el('button', { type: 'button', class: 'rh-btn primary', text: '추가 설명 받기' });
    var msg = el('span', { class: 'rh-status is-empty', role: 'status', 'aria-live': 'polite' });
    var results = el('div', { class: 'rh-clarify-results' });
    function setMsg(text, isErr) {
      msg.textContent = text || '';
      msg.className = 'rh-status' + (isErr ? ' is-error' : '') + (text ? '' : ' is-empty');
    }
    var checks = el('fieldset', { class: 'rh-clarify-checks' }, [
      el('legend', { text: '추가 설명이 필요한 부분을 선택해 주세요' })
    ].concat(EXPLORE_CLARIFY_OPTIONS.map(function (opt) {
      var cb = el('input', { type: 'checkbox', value: opt.key });
      cb.addEventListener('change', function () {
        if (cb.checked) picked[opt.key] = true; else delete picked[opt.key];
      });
      return el('label', { class: 'rh-clarify-opt' }, [cb, opt.label]);
    })));
    btn.addEventListener('click', function () {
      var topics = EXPLORE_CLARIFY_OPTIONS.map(function (o) { return o.key; }).filter(function (k) { return picked[k]; });
      if (!topics.length) { setMsg('더 설명이 필요한 부분을 하나 이상 선택해 주세요.', true); return; }
      if (!ctx || !ctx.endpoint) { setMsg('서버 연결이 설정되지 않았습니다.', true); return; }
      btn.disabled = true; btn.textContent = '쉬운 설명 만드는 중…';
      setMsg('선택한 부분에 대한 쉬운 설명과 예시를 준비하고 있습니다.');
      post(ctx.endpoint, {
        action: 'exploreClarify',
        text: ctx.text || '',
        result: r,
        topics: topics,
        note: note.value.trim()
      }, 180000).then(function (res) {
        btn.disabled = false; btn.textContent = '추가 설명 받기';
        if (!res || res.ok !== true || !res.clarification) {
          setMsg((res && res.message) || '추가 설명을 만들지 못했습니다.', true);
          return;
        }
        setMsg('');
        results.appendChild(renderClarificationCard(res.clarification));
        results.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
    return el('section', { class: 'rh-clarify' }, [
      el('h3', { class: 'rh-clarify-title', text: '더 설명이 필요한 부분이 있나요?' }),
      el('p', { class: 'rh-lead', text: '잘 이해되지 않거나 헷갈리는 부분을 선택해 다시 제출하시면, 여러분의 주제에 맞춘 쉬운 설명과 예시를 추가로 받아 보실 수 있습니다.' }),
      checks,
      el('div', { class: 'rh-clarify-note' }, [
        el('label', { text: '궁금한 점이나 더 알고 싶은 내용 (선택)' }),
        note
      ]),
      el('div', { class: 'rh-clarify-actions' }, [btn, msg]),
      results
    ]);
  }

  function render(box, r, ctx) {
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'rhx-head' }, [el('h2', { text: '나의 고민을 연구로 바꿔 보기' }), el('span', { class: 'rhx-badge', text: 'DrS가 설계해 둔 논리적 흐름으로 제시합니다' })]));
    if (r.understanding) box.appendChild(el('p', { class: 'rhx-understand' }, [el('strong', { text: '여러분이 궁금해하는 것 ' }), r.understanding]));
    if ((r.titles || []).length) box.appendChild(el('section', { class: 'rhx-titles' }, [
      el('h3', { text: '이런 연구제목은 어떨까요?' }),
      el('ol', {}, r.titles.map(function (t) { return el('li', {}, [el('strong', { text: t.title }), t.note ? el('span', { text: t.note }) : null]); }))
    ]));
    if (r.problem) box.appendChild(step(1, '연구의 문제의식', '이런 문제의식을 기반으로 생각해 볼 수 있어요.', [
      el('blockquote', { class: 'rhx-draft', text: r.problem.text }),
      r.problem.basis ? el('p', { class: 'rhx-basis' }, [el('b', { text: '어디에서 읽어 냈나요? ' }), r.problem.basis]) : null
    ]));
    box.appendChild(step(2, '연구의 목적', '이러한 목적으로 연구를 하고자 하는 게 맞나요? 가장 가까운 목적을 골라 내 말로 다듬어 보세요.',
      (r.purposes || []).map(function (p, i) {
        return el('article', { class: 'rhx-card' }, [
          el('h4', {}, [el('span', { class: 'rhx-no', text: '목적 ' + (i + 1) }), p.focus || '']),
          el('p', { class: 'rhx-purpose', text: p.purpose }),
          p.rqs && p.rqs.length ? el('div', { class: 'rhx-rqs' }, [el('b', { text: '이 목적이라면 연구문제는' }), el('ol', {}, p.rqs.map(function (q) { return el('li', { text: q }); }))]) : null
        ]);
      })));
    box.appendChild(step(3, '이론적 근거', '이런 이론을 사용하면 이런 논리로 연구를 진행할 수 있어요. 이론 이름만 붙이지 말고 원전을 읽고 논리를 확인하세요.',
      (r.theories || []).map(function (t) {
        return el('article', { class: 'rhx-card' }, [
          el('h4', { text: t.name }),
          t.scholars ? el('p', { class: 'rhx-scholar', text: '대표 학자: ' + t.scholars }) : null,
          t.core ? el('p', {}, [el('b', { text: '핵심 주장 ' }), t.core]) : null,
          el('p', { class: 'rhx-logic' }, [el('b', { text: '이 연구에 적용하면 ' }), t.logic]),
          t.caution ? el('p', { class: 'rhx-caution' }, [el('b', { text: '주의 ' }), t.caution]) : null
        ]);
      })));
    var v = r.variables || {};
    box.appendChild(step(4, '변수와 개념', '여러분의 글에서 다루고 싶어 하는 변수와 그 뜻, 그리고 함께 생각해 볼 수 있는 변수를 정리했어요. 변수는 연구에서 재거나 비교하는 "달라질 수 있는 것"이에요.', [
      el('h4', { class: 'rhx-subhead', text: '사용하고자 하는 변수' }), varTable(v.core, false),
      v.extra && v.extra.length ? el('h4', { class: 'rhx-subhead', text: '추가로 고려해 볼 수 있는 변수' }) : null, varTable(v.extra, true)
    ]));
    box.appendChild(step(5, '연구모형과 연구방법', '지금 연구방법을 정확하게 이해하기 어려운 것은 정상입니다. 처음에는 "누구에게, 무엇을, 어떻게 물어볼까" 정도로 생각하면 충분해요. 이런 연구모형이라면 이런 방법을 고려해 볼 수 있어요.', [
      modelDiagram(r.model)
    ].concat((r.methods || []).map(function (m) {
      return el('article', { class: 'rhx-card' }, [el('h4', { text: m.name }), el('p', {}, [el('b', { text: '왜 이 방법일까요 ' }), m.why]), el('p', {}, [el('b', { text: '어떻게 해 보면 될까요 ' }), m.how])]);
    }))));
    box.appendChild(step(6, '앞으로 생각해 볼 고민거리', '정답을 찾으려 하기보다, 아래 질문에 여러분의 말로 한 줄씩 답해 보세요.', [
      el('ol', { class: 'rhx-consider' }, (r.considerations || []).map(function (k) { return el('li', {}, [el('b', { text: k.topic }), el('span', { text: k.detail })]); }))
    ]));
    if ((r.keywords || []).length) box.appendChild(el('div', { class: 'rhx-kw' }, [el('b', { text: '선행연구 검색어 ' }),
      el('ul', { class: 'rhx-keywords' }, r.keywords.map(function (k) {
        return el('li', {}, [el('a', { href: 'https://scholar.google.com/scholar?q=' + encodeURIComponent(k), target: '_blank', rel: 'noopener', text: k })]);
      }))]));
    box.appendChild(clarifySection(r, ctx));
    box.appendChild(el('p', { class: 'rhx-note', text: '이 정리는 출발점입니다. 이론과 척도는 반드시 원문을 찾아 확인하고, 지도교수와 상의해 주제를 정하세요. (' + (r.generatedBy || 'AI') + ')' }));
    box.appendChild(el('div', { class: 'rhx-actions' }, [
      el('button', { type: 'button', class: 'rh-btn', text: '다시 써서 추천받기', onclick: function () { document.getElementById('rhx-text').focus(); window.scrollTo({ top: document.getElementById('rh-explore').offsetTop - 80, behavior: 'smooth' }); } }),
      el('button', { type: 'button', class: 'rh-btn', text: '인쇄 · PDF로 저장', onclick: function () { window.print(); } })
    ]));
  }

  function mount(root) {
    var endpoint = root.getAttribute('data-endpoint');
    var text = root.querySelector('#rhx-text'), count = root.querySelector('#rhx-count');
    var go = root.querySelector('#rhx-go'), statusEl = root.querySelector('#rhx-status'), result = root.querySelector('#rhx-result');
    function status(msg, isError) { statusEl.textContent = msg || ''; statusEl.className = 'rh-status' + (isError ? ' is-error' : '') + (msg ? '' : ' is-empty'); }
    text.value = store();
    function counted() { count.textContent = text.value.length + ' / 4000'; }
    counted();
    text.addEventListener('input', function () { counted(); store(text.value); });
    go.addEventListener('click', function () {
      var v = text.value.trim();
      if (v.length < 30) { status('고민하는 내용을 30자 이상 적어 주세요. 떠오르는 대로 편하게 써도 됩니다.', true); text.focus(); return; }
      if (!endpoint) { status('서버 연결이 설정되지 않았습니다.', true); return; }
      go.disabled = true; go.textContent = '추천을 만드는 중…';
      status('글을 읽고 문제의식부터 연구모형까지 정리하는 중입니다. 1~2분 걸릴 수 있으니 창을 닫지 말아 주세요.');
      post(endpoint, { action: 'explore', name: '익명', text: v }, 180000).then(function (res) {
        go.disabled = false; go.textContent = '연구주제 추천받기';
        if (!res || res.ok !== true) { status((res && res.message) || '추천을 만들지 못했습니다.', true); return; }
        status('');
        render(result, res.result, { endpoint: endpoint, text: v });
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  function start() { var root = document.getElementById('rh-explore'); if (root) mount(root); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

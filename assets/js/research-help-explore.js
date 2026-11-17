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
  // 연구모형 도식: 독립(왼쪽) → 매개(가운데 위) → 종속(오른쪽), 조절변수는 맨 위에서 점선으로 해당 경로를 가리킨다.
  function modelDiagram(model) {
    var nodes = (model && model.nodes) || [];
    if (nodes.length < 2) return null;
    var BW = 150, BH = 56, W = 720;
    var by = function (role) { return nodes.filter(function (n) { return n.role === role; }); };
    var X = by('독립변수'), M = by('매개변수'), Y = by('종속변수'), Wm = by('조절변수'), C = by('통제변수');
    var rowW = 24, rowM = Wm.length ? 120 : 24, base = rowM + (M.length ? 120 : 0);
    var pos = {};
    function place(list, cx, top) { list.forEach(function (n, i) { pos[n.id] = { x: cx - BW / 2, y: top + i * (BH + 26), n: n }; }); }
    var stack = Math.max(X.length, Y.length, 1);
    var yTop = base;
    place(X, 95, yTop);
    place(Y, W - 95, yTop + (stack - Y.length) * (BH + 26) / 2);
    if (M.length) M.forEach(function (n, i) { pos[n.id] = { x: W / 2 - BW / 2 + (i - (M.length - 1) / 2) * (BW + 24), y: rowM, n: n }; });
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
    var H = yTop + stack * (BH + 26) + 10;
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'rhx-model-svg', role: 'img', 'aria-label': model.caption || '연구모형 도식' });
    var defs = svg('defs');
    var mk = svg('marker', { id: 'rhx-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    mk.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'rhx-arrowhead' }));
    defs.appendChild(mk); root.appendChild(defs);
    function center(id) { var p = pos[id]; return { x: p.x + BW / 2, y: p.y + BH / 2 }; }
    function edge(a, b) { // a 상자 테두리에서 b 쪽으로 나가는 점
      var dx = b.x - a.x, dy = b.y - a.y, t = Math.min((BW / 2 + 4) / Math.abs(dx || 1e-9), (BH / 2 + 4) / Math.abs(dy || 1e-9));
      return { x: a.x + dx * t, y: a.y + dy * t };
    }
    var mids = {};
    (model.paths || []).forEach(function (p) {
      if (!pos[p.from] || !pos[p.to]) return;
      var a = center(p.from), b = center(p.to), s = edge(a, b), e = edge(b, a);
      root.appendChild(svg('line', { x1: s.x, y1: s.y, x2: e.x, y2: e.y, class: 'rhx-path', 'marker-end': 'url(#rhx-arrow)' }));
      mids[p.from + '>' + p.to] = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
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

  function render(box, r) {
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'rhx-head' }, [el('h2', { text: '나의 고민을 연구로 바꿔 보기' }), el('span', { class: 'rhx-badge', text: 'DrS가 설계해 둔 논리적 흐름으로 제시합니다' })]));
    if (r.understanding) box.appendChild(el('p', { class: 'rhx-understand' }, [el('strong', { text: '내가 이해한 고민 ' }), r.understanding]));
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
    box.appendChild(step(4, '변수와 개념', '글에서 다루고 싶어 하는 변수와 그 개념, 그리고 함께 고려해 볼 수 있는 변수를 정리했어요.', [
      el('h4', { class: 'rhx-subhead', text: '사용하고자 하는 변수' }), varTable(v.core, false),
      v.extra && v.extra.length ? el('h4', { class: 'rhx-subhead', text: '추가로 고려해 볼 수 있는 변수' }) : null, varTable(v.extra, true)
    ]));
    box.appendChild(step(5, '연구모형과 연구방법', '지금 연구방법을 정확하게 이해하기 어려운 것은 정상입니다. 그래도 이런 연구모형이라면 이런 방법을 고려해 볼 수 있어요.', [
      modelDiagram(r.model)
    ].concat((r.methods || []).map(function (m) {
      return el('article', { class: 'rhx-card' }, [el('h4', { text: m.name }), el('p', {}, [el('b', { text: '왜 이 방법인가 ' }), m.why]), el('p', {}, [el('b', { text: '어떻게 진행하나 ' }), m.how])]);
    }))));
    box.appendChild(step(6, '앞으로 고민해야 할 부분', '연구계획을 쓰기 전에 아래 질문에 스스로 답해 보세요.', [
      el('ol', { class: 'rhx-consider' }, (r.considerations || []).map(function (k) { return el('li', {}, [el('b', { text: k.topic }), el('span', { text: k.detail })]); }))
    ]));
    if ((r.keywords || []).length) box.appendChild(el('div', { class: 'rhx-kw' }, [el('b', { text: '선행연구 검색어 ' }),
      el('ul', { class: 'rhx-keywords' }, r.keywords.map(function (k) {
        return el('li', {}, [el('a', { href: 'https://scholar.google.com/scholar?q=' + encodeURIComponent(k), target: '_blank', rel: 'noopener', text: k })]);
      }))]));
    box.appendChild(el('p', { class: 'rhx-note', text: '이 정리는 출발점입니다. 이론과 척도는 반드시 원문을 찾아 확인하고, 지도교수와 상의해 주제를 정하세요. (' + (r.generatedBy || 'AI') + ')' }));
    box.appendChild(el('div', { class: 'rhx-actions' }, [
      el('button', { type: 'button', class: 'rh-btn', text: '다시 써서 추천받기', onclick: function () { document.getElementById('rhx-text').focus(); window.scrollTo({ top: document.getElementById('rh-explore').offsetTop - 80, behavior: 'smooth' }); } }),
      el('button', { type: 'button', class: 'rh-btn', text: '인쇄 · PDF로 저장', onclick: function () { window.print(); } })
    ]));
  }

  function mount(root) {
    var endpoint = root.getAttribute('data-endpoint');
    var text = root.querySelector('#rhx-text'), name = root.querySelector('#rhx-name'), count = root.querySelector('#rhx-count');
    var go = root.querySelector('#rhx-go'), statusEl = root.querySelector('#rhx-status'), result = root.querySelector('#rhx-result');
    function status(msg, isError) { statusEl.textContent = msg || ''; statusEl.className = 'rh-status' + (isError ? ' is-error' : '') + (msg ? '' : ' is-empty'); }
    text.value = store();
    function counted() { count.textContent = text.value.length + ' / 4000'; }
    counted();
    text.addEventListener('input', function () { counted(); store(text.value); });
    go.addEventListener('click', function () {
      var v = text.value.trim();
      if (!name.value.trim()) { status('이름을 입력해 주세요.', true); name.focus(); return; }
      if (v.length < 30) { status('고민하는 내용을 30자 이상 적어 주세요. 떠오르는 대로 편하게 써도 됩니다.', true); text.focus(); return; }
      if (!endpoint) { status('서버 연결이 설정되지 않았습니다.', true); return; }
      go.disabled = true; go.textContent = '추천을 만드는 중…';
      status('글을 읽고 문제의식부터 연구모형까지 정리하는 중입니다. 1~2분 걸릴 수 있으니 창을 닫지 말아 주세요.');
      post(endpoint, { action: 'explore', name: name.value.trim(), text: v }, 180000).then(function (res) {
        go.disabled = false; go.textContent = '연구주제 추천받기';
        if (!res || res.ok !== true) { status((res && res.message) || '추천을 만들지 못했습니다.', true); return; }
        status('');
        render(result, res.result);
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  function start() { var root = document.getElementById('rh-explore'); if (root) mount(root); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

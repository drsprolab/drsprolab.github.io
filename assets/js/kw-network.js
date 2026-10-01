// 대문 연구 지도: 논문(점)과 키워드(큰 점)를 잇는 네트워크.
// 데이터: _data/publications.yml, _data/keyword_map.yml (빌드 때 JSON으로 노출)
(function () {
  var root = document.getElementById('rmap');
  if (!root || !window.d3) return;

  var COLORS_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#e34948', '#4a3aa7'];
  var COLORS_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#e66767', '#9085e9'];
  var NONE = '#9aa3ad';
  var MIN_COUNT = 2;
  var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var COLORS = dark ? COLORS_DARK : COLORS_LIGHT;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var svg = d3.select('#rm-svg');
  var detail = document.getElementById('rm-detail');
  var fields = [], papers = [], kws = [], nodes = [], links = [], byId = {};
  var state = { q: '', off: new Set(), local: false, sel: null };
  var sim, zoom, gAll, linkSel, nodeSel, W, H, k = 1;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function titleOf(c) { var m = c.match(/\(\d{4}[a-z]?\)\.\s*(.+)$/); return (m ? m[1] : c).split(/\.\s+/)[0]; }
  function short(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function toRegex(p) { try { return new RegExp(p, 'i'); } catch (e) { return new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); } }

  Promise.all([fetch(root.dataset.pubs).then(function (r) { return r.json(); }), fetch(root.dataset.map).then(function (r) { return r.json(); })])
    .then(function (res) { build(res[0], res[1]); draw(); bind(); apply(); })
    .catch(function () { detail.innerHTML = '<h3>선택한 항목</h3><p class="rm-hint">데이터를 불러오지 못했습니다.</p>'; });

  // ---------- data ----------
  function build(pubs, map) {
    var seen = {};
    pubs.forEach(function (p, i) {
      if (!p.citation || seen[p.citation]) return;
      seen[p.citation] = 1;
      papers.push({ id: 'p' + i, type: 'paper', year: p.year, citation: p.citation, name: titleOf(p.citation), kws: [] });
    });
    map.forEach(function (f, fi) {
      fields.push({ fi: fi, name: f.field, en: f.en, color: COLORS[fi % COLORS.length] });
      f.keywords.forEach(function (kw, ki) {
        var res = (kw.patterns || []).map(toRegex);
        var node = { id: 'k' + fi + '_' + ki, type: 'kw', name: kw.name, en: kw.en, fi: fi, papers: [] };
        papers.forEach(function (p) { if (res.some(function (r) { return r.test(p.name); })) node.papers.push(p); });
        if (node.papers.length >= MIN_COUNT) {
          kws.push(node);
          node.papers.forEach(function (p) { p.kws.push(node); links.push({ source: node.id, target: p.id }); });
        }
      });
    });
    // 논문 색 = 가장 많이 걸린 분야
    papers.forEach(function (p) {
      var cnt = {};
      p.kws.forEach(function (kw) { cnt[kw.fi] = (cnt[kw.fi] || 0) + 1; });
      var best = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || a - b; })[0];
      p.fi = best == null ? -1 : +best;
      p.fis = new Set(p.kws.map(function (kw) { return kw.fi; }));
    });
    kws.forEach(function (kw) { kw.fis = new Set([kw.fi]); });
    nodes = kws.concat(papers);
    nodes.forEach(function (n) { byId[n.id] = n; n.nb = new Set([n.id]); n.phase = Math.random() * 6.283; });
    links.forEach(function (l) { byId[l.source].nb.add(l.target); byId[l.target].nb.add(l.source); });
    document.getElementById('rm-s-papers').textContent = papers.length;
    document.getElementById('rm-s-kws').textContent = kws.length;
    document.getElementById('rm-s-links').textContent = links.length;
    document.getElementById('rm-fields').innerHTML = fields.map(function (f) {
      return '<label class="rm-chip"><input type="checkbox" checked data-fi="' + f.fi + '"><span class="rm-sw" style="background:' + f.color + '"></span>' + esc(f.name) + '</label>';
    }).join('');
  }
  function color(n) { return n.fi < 0 ? NONE : COLORS[n.fi % COLORS.length]; }
  function radius(n) { return n.type === 'kw' ? 8 + Math.sqrt(n.papers.length) * 2.6 : 4.2 + Math.min(n.kws.length, 4) * 1.1; }

  // ---------- graph ----------
  function draw() {
    var box = svg.node().getBoundingClientRect();
    W = Math.max(box.width, 320); H = Math.max(box.height, 380);
    svg.attr('viewBox', [0, 0, W, H]);
    var anchors = fields.map(function (f, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / fields.length;
      return { x: W / 2 + Math.cos(a) * W * 0.30, y: H / 2 + Math.sin(a) * H * 0.30 };
    });
    nodes.forEach(function (n) {
      var a = n.fi >= 0 ? anchors[n.fi] : { x: W / 2, y: H / 2 };
      n.x = a.x + (Math.random() - .5) * 120; n.y = a.y + (Math.random() - .5) * 120;
    });

    gAll = svg.append('g');
    linkSel = gAll.append('g').attr('class', 'rm-links').selectAll('line').data(links).join('line')
      .attr('class', 'rm-link').attr('stroke', function (l) { return color(byId[l.source.id || l.source]); });
    nodeSel = gAll.append('g').attr('class', 'rm-nodes').selectAll('g').data(nodes).join('g')
      .attr('class', function (n) { return 'rm-node ' + n.type; })
      .attr('tabindex', function (n) { return n.type === 'kw' ? 0 : -1; }).attr('role', 'button')
      .attr('aria-label', function (n) { return n.type === 'kw' ? n.name + ', 논문 ' + n.papers.length + '편' : n.name; })
      .on('click', function (e, n) { if (e.defaultPrevented) return; select(n); })
      .on('dblclick', function (e, n) { e.stopPropagation(); n.fx = n.fy = null; n.pinned = false; d3.select(this).classed('pinned', false); sim.alpha(0.1).restart(); })
      .on('keydown', function (e, n) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n); } })
      .on('mouseenter', function (e, n) { hover(n); })
      .on('mouseleave', function () { hover(null); })
      .call(d3.drag()
        .on('start', function (e, n) { if (!e.active) sim.alphaTarget(0.06).restart(); n.fx = n.x; n.fy = n.y; })
        .on('drag', function (e, n) { n.fx = e.x; n.fy = e.y; })
        .on('end', function (e, n) { if (!e.active) sim.alphaTarget(reduceMotion ? 0 : 0.004); n.pinned = true; d3.select(this).classed('pinned', true); }));
    nodeSel.append('circle').attr('r', radius).attr('fill', color);
    nodeSel.append('text').attr('class', 'rm-label').attr('dy', function (n) { return -radius(n) - 5; })
      .text(function (n) { return n.type === 'kw' ? n.name : short(n.name, 24); });

    sim = d3.forceSimulation(nodes)
      .velocityDecay(0.6)
      .force('link', d3.forceLink(links).id(function (n) { return n.id; }).distance(34).strength(0.35))
      .force('charge', d3.forceManyBody().strength(function (n) { return n.type === 'kw' ? -180 : -26; }).distanceMax(320))
      .force('collide', d3.forceCollide().radius(function (n) { return radius(n) + (n.type === 'kw' ? 6 : 2); }))
      .force('x', d3.forceX(function (n) { return n.fi >= 0 ? anchors[n.fi].x : W / 2; }).strength(0.035))
      .force('y', d3.forceY(function (n) { return n.fi >= 0 ? anchors[n.fi].y : H / 2; }).strength(0.035));
    if (!reduceMotion) {
      // 아주 느리게 떠다니는 움직임
      sim.force('drift', function () {
        var t = Date.now() / 1000;
        nodes.forEach(function (n) { if (n.pinned) return; n.vx += Math.cos(t * 0.15 + n.phase) * 0.006; n.vy += Math.sin(t * 0.12 + n.phase) * 0.006; });
      }).alphaTarget(0.004);
    }
    sim.on('tick', function () {
      linkSel.attr('x1', function (l) { return l.source.x; }).attr('y1', function (l) { return l.source.y; })
        .attr('x2', function (l) { return l.target.x; }).attr('y2', function (l) { return l.target.y; });
      nodeSel.attr('transform', function (n) { return 'translate(' + n.x + ',' + n.y + ')'; });
    });
    for (var i = 0; i < 260; i++) sim.tick();
    sim.on('tick')();
    if (reduceMotion) sim.stop();

    zoom = d3.zoom().scaleExtent([0.4, 5]).on('zoom', function (e) {
      gAll.attr('transform', e.transform); k = e.transform.k;
      svg.classed('zoomed', k >= 1.6);
    });
    svg.call(zoom).on('dblclick.zoom', null);
    fit(false);
  }

  function fit(animate) {
    var vis = nodes.filter(function (n) { return n.visible !== false && (n.fi >= 0 || state.local); });
    if (!vis.length) return;
    var x0 = d3.min(vis, function (n) { return n.x; }), x1 = d3.max(vis, function (n) { return n.x; });
    var y0 = d3.min(vis, function (n) { return n.y; }), y1 = d3.max(vis, function (n) { return n.y; });
    var s = Math.min(3, 0.97 / Math.max((x1 - x0 + 40) / W, (y1 - y0 + 40) / H));
    var t = d3.zoomIdentity.translate(W / 2, H / 2).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    (animate && !reduceMotion ? svg.transition().duration(600) : svg).call(zoom.transform, t);
  }

  // ---------- filters & selection ----------
  function apply() {
    var q = state.q.trim().toLowerCase();
    var sel = state.sel;
    nodes.forEach(function (n) {
      var inField = n.type === 'kw' ? !state.off.has(n.fi) : (n.fi < 0 ? state.off.size === 0 : Array.from(n.fis).some(function (fi) { return !state.off.has(fi); }));
      var inLocal = !(state.local && sel) || sel.nb.has(n.id);
      n.visible = inField && inLocal;
      n.match = q && n.name.toLowerCase().indexOf(q) >= 0;
    });
    nodeSel.classed('hidden', function (n) { return !n.visible; })
      .classed('match', function (n) { return n.match; })
      .classed('faded', function (n) { return (q && !n.match && !(sel && sel.nb.has(n.id))) || (sel && !sel.nb.has(n.id) && !q); })
      .classed('sel', function (n) { return sel && n.id === sel.id; });
    linkSel.classed('hidden', function (l) { return !l.source.visible || !l.target.visible; })
      .classed('hot', function (l) { return sel && (l.source.id === sel.id || l.target.id === sel.id); })
      .classed('faded', function (l) { return (sel && l.source.id !== sel.id && l.target.id !== sel.id) || !!q; });
    document.getElementById('rm-s-visible').textContent = nodes.filter(function (n) { return n.visible; }).length;
  }
  function hover(n) {
    if (state.sel || state.q) return;
    nodeSel.classed('faded', function (m) { return n ? !n.nb.has(m.id) : false; });
    linkSel.classed('hot', function (l) { return n && (l.source.id === n.id || l.target.id === n.id); })
      .classed('faded', function (l) { return n ? l.source.id !== n.id && l.target.id !== n.id : false; });
  }
  function select(n) {
    state.sel = (n && state.sel && state.sel.id === n.id) ? null : n;
    apply(); renderDetail();
    if (state.local) fit(true);
  }
  function renderDetail() {
    var n = state.sel;
    if (!n) { detail.innerHTML = '<h3>선택한 항목</h3><p class="rm-hint">키워드나 논문 점을 누르면 여기에 관련 연구가 표시됩니다.</p>'; return; }
    var f = n.fi >= 0 ? fields[n.fi] : null;
    var head = '<h3>선택한 항목</h3><div class="rm-d-eyebrow">' + (f ? '<span class="rm-sw" style="background:' + f.color + '"></span>' + esc(f.name) : '분류 없음') + ' · ' + (n.type === 'kw' ? '키워드' : '논문') + '</div>';
    if (n.type === 'kw') {
      var list = n.papers.slice().sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
      var rel = {};
      list.forEach(function (p) { p.kws.forEach(function (o) { if (o !== n) rel[o.id] = (rel[o.id] || 0) + 1; }); });
      var relList = Object.keys(rel).sort(function (a, b) { return rel[b] - rel[a]; }).slice(0, 8).map(function (id) { return byId[id]; });
      detail.innerHTML = head + '<div class="rm-d-title">' + esc(n.name) + ' <span>' + esc(n.en) + '</span></div>' +
        '<div class="rm-d-count"><strong>' + list.length + '</strong>편의 연구</div>' +
        (relList.length ? '<div class="rm-d-rel">' + relList.map(function (o) { return '<button type="button" data-id="' + o.id + '">' + esc(o.name) + '</button>'; }).join('') + '</div>' : '') +
        '<ol class="rm-d-list">' + list.map(function (p) { return '<li><button type="button" data-id="' + p.id + '"><span class="rm-y">' + (p.year || '') + '</span><span>' + esc(p.citation) + '</span></button></li>'; }).join('') + '</ol>';
    } else {
      detail.innerHTML = head + '<p class="rm-d-cite">' + esc(n.citation) + '</p>' +
        (n.kws.length ? '<div class="rm-d-rel">' + n.kws.map(function (o) { return '<button type="button" data-id="' + o.id + '">' + esc(o.name) + '</button>'; }).join('') + '</div>' : '<p class="rm-hint">연결된 키워드가 없습니다.</p>');
    }
  }

  function bind() {
    var timer;
    document.getElementById('rm-search').addEventListener('input', function (e) {
      clearTimeout(timer); var v = e.target.value; timer = setTimeout(function () { state.q = v; apply(); }, 150);
    });
    document.getElementById('rm-search').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = state.q.trim().toLowerCase(); if (!q) return;
      var hit = kws.find(function (n) { return n.name.toLowerCase().indexOf(q) >= 0; }) || papers.find(function (n) { return n.name.toLowerCase().indexOf(q) >= 0; });
      if (hit) select(hit);
    });
    document.getElementById('rm-fields').addEventListener('change', function (e) {
      var fi = +e.target.dataset.fi; if (e.target.checked) state.off.delete(fi); else state.off.add(fi); apply();
    });
    document.getElementById('rm-local').addEventListener('change', function (e) { state.local = e.target.checked; apply(); fit(true); });
    document.getElementById('rm-reset').addEventListener('click', function () {
      state.q = ''; state.off.clear(); state.local = false; state.sel = null;
      document.getElementById('rm-search').value = ''; document.getElementById('rm-local').checked = false;
      document.querySelectorAll('#rm-fields input').forEach(function (c) { c.checked = true; });
      nodes.forEach(function (n) { n.fx = n.fy = null; n.pinned = false; }); nodeSel.classed('pinned', false);
      apply(); renderDetail(); fit(true); sim.alpha(0.2).restart();
    });
    detail.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) select(byId[b.dataset.id]); });
    document.getElementById('rm-zin').addEventListener('click', function () { svg.transition().duration(250).call(zoom.scaleBy, 1.4); });
    document.getElementById('rm-zout').addEventListener('click', function () { svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.4); });
    document.getElementById('rm-zfit').addEventListener('click', function () { fit(true); });
    svg.on('click', function (e) { if (e.target === svg.node()) select(state.sel); });
  }
})();

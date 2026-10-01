// 대문 키워드 네트워크: 논문 제목에서 키워드를 찾아 학문 분야별 네트워크로 그린다.
// 데이터: _data/publications.yml, _data/keyword_map.yml (빌드 때 JSON으로 노출)
(function () {
  var root = document.getElementById('kwnet');
  if (!root || !window.d3) return;

  // 분야 색 (어두운 배경용 범주형 팔레트, 고정 순서)
  var COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#e66767', '#9085e9'];
  var MIN_COUNT = 2;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var svg = d3.select('#kwnet-svg');
  var panel = document.getElementById('kwnet-panel');
  var papers = [], nodes = [], links = [], byId = {}, sim, selected = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function titleOf(c) {
    var m = c.match(/\(\d{4}[a-z]?\)\.\s*(.+)$/);
    var rest = m ? m[1] : c;
    return rest.split(/\.\s+/)[0];
  }
  function toRegex(p) {
    try { return new RegExp(p, 'i'); } catch (e) { return new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
  }

  Promise.all([fetch(root.dataset.pubs).then(function (r) { return r.json(); }), fetch(root.dataset.map).then(function (r) { return r.json(); })])
    .then(function (res) { build(res[0], res[1]); draw(); })
    .catch(function () { document.getElementById('kwnet-sub').textContent = '키워드 데이터를 불러오지 못했습니다.'; });

  function build(pubs, map) {
    var seen = {};
    pubs.forEach(function (p) {
      if (!p.citation || seen[p.citation]) return;
      seen[p.citation] = 1;
      papers.push({ year: p.year, citation: p.citation, title: titleOf(p.citation), kws: [] });
    });
    map.forEach(function (f, fi) {
      var fid = 'f' + fi;
      var fnode = { id: fid, type: 'field', name: f.field, en: f.en, color: COLORS[fi % COLORS.length], fi: fi, papers: [] };
      f.keywords.forEach(function (k, ki) {
        var res = (k.patterns || []).map(toRegex);
        var kid = fid + 'k' + ki;
        var kn = { id: kid, type: 'kw', name: k.name, en: k.en, color: fnode.color, fi: fi, field: fnode, papers: [] };
        papers.forEach(function (p) { if (res.some(function (r) { return r.test(p.title); })) { kn.papers.push(p); p.kws.push(kn); } });
        if (kn.papers.length >= MIN_COUNT) { nodes.push(kn); links.push({ source: fid, target: kid, type: 'field', w: 1 }); }
        else papers.forEach(function (p) { p.kws = p.kws.filter(function (x) { return x !== kn; }); });
      });
      nodes.push(fnode);
    });
    nodes.forEach(function (n) { byId[n.id] = n; });
    nodes.filter(function (n) { return n.type === 'field'; }).forEach(function (f) {
      var set = new Set();
      papers.forEach(function (p) { if (p.kws.some(function (k) { return k.fi === f.fi; })) set.add(p); });
      f.papers = Array.from(set);
    });
    // 같은 논문에 함께 나온 키워드끼리 연결
    var co = {};
    papers.forEach(function (p) {
      for (var i = 0; i < p.kws.length; i++) for (var j = i + 1; j < p.kws.length; j++) {
        var a = p.kws[i].id, b = p.kws[j].id, key = a < b ? a + '|' + b : b + '|' + a;
        co[key] = (co[key] || 0) + 1;
      }
    });
    Object.keys(co).forEach(function (key) { var ab = key.split('|'); links.push({ source: ab[0], target: ab[1], type: 'co', w: co[key] }); });
    nodes.forEach(function (n) { n.nb = new Set([n.id]); });
    links.forEach(function (l) { byId[l.source].nb.add(l.target); byId[l.target].nb.add(l.source); });
    var matched = papers.filter(function (p) { return p.kws.length; }).length;
    document.getElementById('kwnet-sub').textContent = '논문 ' + papers.length + '편의 제목에서 키워드 ' + nodes.filter(function (n) { return n.type === 'kw'; }).length + '개를 뽑아 ' +
      map.length + '개 학문 분야로 엮었습니다. 키워드를 누르면 관련 연구가 나옵니다.';
    root.dataset.matched = matched;
  }

  function radius(n) { return n.type === 'field' ? 9 + Math.sqrt(n.papers.length) * 1.6 : 4 + Math.sqrt(n.papers.length) * 2.2; }

  function draw() {
    var box = svg.node().getBoundingClientRect();
    var W = Math.max(box.width, 320), H = Math.max(box.height, 360);
    var TOP = 96, BOTTOM = 64; // 제목과 범례 자리
    var midY = TOP + (H - TOP - BOTTOM) / 2, spanY = (H - TOP - BOTTOM) / 2;
    svg.attr('viewBox', '0 0 ' + W + ' ' + H);
    var fields = nodes.filter(function (n) { return n.type === 'field'; });
    // 분야 중심을 타원 위에 고르게 배치
    fields.forEach(function (f, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / fields.length;
      f.ax = W / 2 + Math.cos(a) * W * 0.34; f.ay = midY + Math.sin(a) * spanY * 0.78;
      f.x = f.ax; f.y = f.ay;
    });
    nodes.forEach(function (n) { if (n.type === 'kw') { n.x = n.field.ax + (Math.random() - .5) * 40; n.y = n.field.ay + (Math.random() - .5) * 40; } n.phase = Math.random() * Math.PI * 2; });

    var gLinks = svg.append('g').attr('class', 'kw-links');
    var link = gLinks.selectAll('line').data(links).join('line')
      .attr('class', function (l) { return 'kw-link ' + l.type; })
      .attr('stroke-width', function (l) { return l.type === 'co' ? Math.min(0.6 + l.w * 0.5, 3) : 1; });

    var gNodes = svg.append('g').attr('class', 'kw-nodes');
    var node = gNodes.selectAll('g').data(nodes).join('g')
      .attr('class', function (n) { return 'kw-node ' + n.type; })
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', function (n) { return n.name + ' · 논문 ' + n.papers.length + '편'; })
      .on('click', function (e, n) { select(n); })
      .on('keydown', function (e, n) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n); } })
      .on('mouseenter', function (e, n) { focusOn(n); })
      .on('mouseleave', function () { focusOn(selected); })
      .call(d3.drag()
        .on('start', function (e, n) { if (!e.active) sim.alphaTarget(0.15).restart(); n.fx = n.x; n.fy = n.y; })
        .on('drag', function (e, n) { n.fx = e.x; n.fy = e.y; })
        .on('end', function (e, n) { if (!e.active) sim.alphaTarget(reduceMotion ? 0 : 0.012); n.fx = null; n.fy = null; }));

    node.append('circle').attr('class', 'kw-halo').attr('r', function (n) { return radius(n) + 6; }).attr('fill', function (n) { return n.color; });
    node.append('circle').attr('class', 'kw-dot').attr('r', radius).attr('fill', function (n) { return n.type === 'field' ? 'var(--kw-bg)' : n.color; }).attr('stroke', function (n) { return n.color; });
    node.append('text').attr('class', 'kw-label').attr('dy', function (n) { return n.type === 'field' ? -radius(n) - 8 : radius(n) + 13; })
      .text(function (n) { return n.type === 'field' ? n.en : n.name; });
    node.filter(function (n) { return n.type === 'field'; }).append('text').attr('class', 'kw-count').attr('dy', 4).text(function (n) { return n.papers.length; });

    // 범례
    document.getElementById('kwnet-legend').innerHTML = fields.map(function (f) {
      return '<button type="button" class="kw-lg" data-id="' + f.id + '"><span style="background:' + f.color + '"></span>' + esc(f.name) + '</button>';
    }).join('');
    document.getElementById('kwnet-legend').addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) select(byId[b.dataset.id]); });

    sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (n) { return n.id; })
        .distance(function (l) { return l.type === 'field' ? 46 + radius(l.target) : 120; })
        .strength(function (l) { return l.type === 'field' ? 0.55 : Math.min(0.02 * l.w, 0.12); }))
      .force('charge', d3.forceManyBody().strength(function (n) { return n.type === 'field' ? -320 : -140; }))
      .force('collide', d3.forceCollide().radius(function (n) { return radius(n) + (n.type === 'field' ? 26 : Math.min(8 + n.name.length * 4.2, 30)); }).iterations(2))
      .force('x', d3.forceX(function (n) { return n.type === 'field' ? n.ax : n.field.ax; }).strength(function (n) { return n.type === 'field' ? 0.25 : 0.06; }))
      .force('y', d3.forceY(function (n) { return n.type === 'field' ? n.ay : n.field.ay; }).strength(function (n) { return n.type === 'field' ? 0.25 : 0.06; }))
      .alphaDecay(0.03);
    if (!reduceMotion) {
      // 천천히 떠다니는 움직임
      sim.force('drift', function (alpha) {
        var t = Date.now() / 1000;
        nodes.forEach(function (n) { n.vx += Math.cos(t * 0.5 + n.phase) * 0.018; n.vy += Math.sin(t * 0.4 + n.phase) * 0.018; });
      }).alphaTarget(0.012);
    }
    sim.on('tick', function () {
      nodes.forEach(function (n) { var r = radius(n) + 14; n.x = Math.max(r, Math.min(W - r, n.x)); n.y = Math.max(TOP + r, Math.min(H - BOTTOM - r, n.y)); });
      link.attr('x1', function (l) { return l.source.x; }).attr('y1', function (l) { return l.source.y; })
        .attr('x2', function (l) { return l.target.x; }).attr('y2', function (l) { return l.target.y; });
      node.attr('transform', function (n) { return 'translate(' + n.x + ',' + n.y + ')'; });
    });
    if (reduceMotion) { sim.stop(); for (var i = 0; i < 300; i++) sim.tick(); sim.on('tick')(); }

    function focusOn(n) {
      node.classed('dim', function (m) { return n ? !n.nb.has(m.id) : false; }).classed('on', function (m) { return n && m.id === n.id; });
      link.classed('dim', function (l) { return n ? (l.source.id !== n.id && l.target.id !== n.id) : false; })
        .classed('hot', function (l) { return n ? (l.source.id === n.id || l.target.id === n.id) : false; });
    }
    window.__kwFocus = focusOn;
  }

  function select(n) {
    selected = (selected && n && selected.id === n.id) ? null : n;
    if (window.__kwFocus) window.__kwFocus(selected);
    if (!selected) { panel.hidden = true; return; }
    var list = selected.papers.slice().sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
    var related = Array.from(selected.nb).map(function (id) { return byId[id]; })
      .filter(function (m) { return m.id !== selected.id && m.type === 'kw'; })
      .sort(function (a, b) { return b.papers.length - a.papers.length; }).slice(0, 8);
    var head = selected.type === 'field'
      ? '<div class="kp-eyebrow"><span class="kp-sw" style="background:' + selected.color + '"></span>학문 분야</div><h3>' + esc(selected.name) + '</h3><div class="kp-en">' + esc(selected.en) + '</div>'
      : '<div class="kp-eyebrow"><span class="kp-sw" style="background:' + selected.color + '"></span>' + esc(selected.field.name) + '</div><h3>' + esc(selected.name) + '</h3><div class="kp-en">' + esc(selected.en) + '</div>';
    panel.innerHTML = '<button type="button" class="kp-close" aria-label="닫기">×</button>' + head +
      '<div class="kp-count"><strong>' + list.length + '</strong>편의 연구</div>' +
      (related.length ? '<div class="kp-rel">' + related.map(function (m) { return '<button type="button" data-id="' + m.id + '">' + esc(m.name) + '</button>'; }).join('') + '</div>' : '') +
      '<ol class="kp-list">' + list.map(function (p) { return '<li><span class="kp-year">' + (p.year || '') + '</span><span>' + esc(p.citation) + '</span></li>'; }).join('') + '</ol>';
    panel.hidden = false;
    panel.scrollTop = 0;
  }
  panel.addEventListener('click', function (e) {
    if (e.target.closest('.kp-close')) { select(selected); return; }
    var b = e.target.closest('[data-id]'); if (b) select(byId[b.dataset.id]);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && selected) select(selected); });
})();

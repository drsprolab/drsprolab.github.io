// Research Orbit — 키워드가 궤도를 따라 천천히 도는 그림 (대문 소개 상자, 각 메뉴 배너에서 함께 씀)
//  - 많이 나온 키워드일수록 안쪽 궤도, 같은 항목에 함께 나온 키워드는 빛나는 호로 연결
//  - 화면 밖이면 멈추고, '동작 줄이기' 설정에서는 정지 그림
//  PalOrbit.run(canvas, items, opts)   items: [['키워드', ...], ...]  항목마다 키워드 목록
//  PalOrbit.fromMap(canvas, opts)      Research Map 키워드(논문 제목 매칭)를 써서 그림
(function () {
  var MILK = '#eef4ff', GLOW = '#8fc3ff', CYAN = '#6fdcf7', LABEL = '#d3e1f3';
  var RINGS = [.17, .25, .32, .38];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clean(s) { return String(s).replace(/^\s*\d{4}\s*/, '').replace(/\s+/g, ' ').trim(); }
  function words(s) { return s.toLowerCase().split(/[\s·,()\/&]+|(?:와|과|및)\s/).filter(function (w) { return w.length >= 2; }); }

  // 항목 목록 → 상위 키워드와 연결 쌍
  function build(items, max) {
    var map = {}, order = [];
    items.forEach(function (list, i) {
      (list || []).forEach(function (raw) {
        var name = clean(raw); if (!name) return;
        if (!map[name]) { map[name] = { name: name, ids: [] }; order.push(name); }
        if (map[name].ids.indexOf(i) < 0) map[name].ids.push(i);
      });
    });
    var kws = order.map(function (n) { return map[n]; })
      .sort(function (a, b) { return b.ids.length - a.ids.length || order.indexOf(a.name) - order.indexOf(b.name); })
      .slice(0, max || 12);
    var pairs = [];
    for (var i = 0; i < kws.length; i++) for (var j = i + 1; j < kws.length; j++) {
      var n = kws[i].ids.filter(function (x) { return kws[j].ids.indexOf(x) >= 0; }).length;
      if (!n) { // 함께 나온 적이 없으면 이름에 같은 낱말이 있는지로 잇는다 (예: AHRD ↔ Asian AHRD)
        var wa = words(kws[i].name), wb = words(kws[j].name);
        if (wa.some(function (w) { return wb.indexOf(w) >= 0; })) n = 1;
      }
      if (n) pairs.push([i, j, n]);
    }
    return { kws: kws, pairs: pairs };
  }

  function run(cv, items, opts) {
    opts = opts || {};
    if (!cv || !cv.getContext) return;
    var g = build(items, opts.max || (opts.wide ? (cv.clientWidth < 360 ? 5 : cv.clientWidth < 600 ? 8 : 12) : 12));
    if (g.kws.length < 3) { cv.hidden = true; return; }
    var ctx = cv.getContext('2d'), wide = !!opts.wide, minPair = opts.minPair || 1;
    var top = g.kws[0].ids.length;
    var orb = g.kws.map(function (k, i) {
      var ring = Math.min(3, Math.floor(i / 3));
      return { name: k.name.length > 24 ? k.name.slice(0, 23) + '…' : k.name, ring: ring, a0: (i % 3) / 3 * Math.PI * 2 + ring * .9,
        speed: (ring % 2 ? -1 : 1) * (0.04 + (3 - ring) * .015) * (wide ? .6 : 1), size: .35 + .65 * k.ids.length / top };
    });
    var pairs = g.pairs.filter(function (p) { return p[2] >= minPair; });
    var seed = 11; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var stars = []; for (var s = 0; s < (wide ? 110 : 70); s++) stars.push([rnd(), rnd(), rnd() * 1.4 + .3, rnd()]);
    var t0 = performance.now(), visible = true, raf = 0, dpr = 1;

    function size() {
      if (!wide) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    }

    function frame(now) {
      var W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, t = reduce ? 0 : (now - t0) / 1000;
      var R = wide ? H : W;                           // 궤도 크기 기준
      var kx = wide ? Math.min(W / H * .9, 4.2) : 1;  // 넓은 배너는 가로로 긴 타원 궤도
      ctx.clearRect(0, 0, W, H);
      // 배경 위에서도 보이도록 은은한 어두운 판
      ctx.save(); ctx.translate(cx, cy); ctx.scale(kx, 1);
      var disc = ctx.createRadialGradient(0, 0, R * .08, 0, 0, R * .5);
      disc.addColorStop(0, 'rgba(6,16,34,.7)'); disc.addColorStop(.75, 'rgba(6,16,34,.42)'); disc.addColorStop(1, 'rgba(6,16,34,0)');
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(0, 0, R * .5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      stars.forEach(function (st) { ctx.globalAlpha = .2 + .3 * Math.abs(Math.sin(t * .6 + st[3] * 6)); ctx.fillStyle = MILK; ctx.beginPath(); ctx.arc(st[0] * W, st[1] * H, st[2] * (wide ? dpr : 1), 0, Math.PI * 2); ctx.fill(); });
      RINGS.forEach(function (r, k) {
        ctx.globalAlpha = .4; ctx.strokeStyle = k % 2 ? CYAN : GLOW; ctx.lineWidth = 1.4 * (wide ? dpr : 1);
        ctx.setLineDash(k % 2 ? [3, 9] : []); ctx.beginPath(); ctx.ellipse(cx, cy, R * r * kx, R * r, 0, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .25);
      var sc = R / 720;
      for (var k = 0; k < 140; k++) {
        var th = k * .32, rr = (4 + k * .6) * sc * (wide ? 1.6 : 1);
        ctx.globalAlpha = .12 + .55 * (1 - k / 140); ctx.fillStyle = k % 3 ? GLOW : CYAN;
        ctx.beginPath(); ctx.arc(Math.cos(th) * rr, Math.sin(th) * rr, 1.6 * Math.max(sc * (wide ? 1.6 : 1), .6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      var cr = R * .09;
      var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      core.addColorStop(0, MILK); core.addColorStop(.35, GLOW); core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
      orb.forEach(function (o) { var a = o.a0 + t * o.speed, r = R * RINGS[o.ring]; o.x = cx + Math.cos(a) * r * kx; o.y = cy + Math.sin(a) * r; });
      pairs.forEach(function (p) {
        var a = orb[p[0]], b = orb[p[1]], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.strokeStyle = CYAN; ctx.globalAlpha = Math.min(.5, .12 + p[2] * .06); ctx.lineWidth = (1 + Math.min(p[2], 6) * .3) * (wide ? dpr : 1);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx + (mx - cx) * .35, cy + (my - cy) * .35, b.x, b.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      var fs = wide ? Math.round((W / dpr < 360 ? 10 : 12) * dpr) : Math.round(W * .029);
      ctx.font = '600 ' + fs + 'px "IBM Plex Sans KR", system-ui, sans-serif';
      ctx.textAlign = 'center';
      orb.forEach(function (o) {
        var r = wide ? (3 + o.size * 4) * dpr : W * (.01 + o.size * .016);
        ctx.shadowColor = CYAN; ctx.shadowBlur = wide ? 12 * dpr : 16; ctx.fillStyle = MILK;
        ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = GLOW; ctx.lineWidth = 2 * (wide ? dpr : 1); ctx.stroke();
        var half = ctx.measureText(o.name).width / 2 + 6, lx = Math.max(half, Math.min(W - half, o.x));
        ctx.fillStyle = LABEL; ctx.fillText(o.name, lx, Math.max(fs + 2, o.y - r - 6 * (wide ? dpr : 1)));
      });
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    }
    size();
    if (wide && 'ResizeObserver' in window) new ResizeObserver(function () { size(); if (reduce || !visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }).observe(cv);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(frame);
    }).observe(cv);
    raf = requestAnimationFrame(frame);
  }

  function titleOf(c) { var m = c.match(/\(\d{4}[a-z]?\)\.\s*(.+)$/); return (m ? m[1] : c).split(/\.\s+/)[0]; }
  function toRegex(p) { try { return new RegExp(p, 'i'); } catch (e) { return new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); } }

  // 논문 제목마다 걸리는 Research Map 키워드 목록을 항목으로 만든다
  function fromMap(cv, opts) {
    if (!cv || !window.fetch) return;
    Promise.all([fetch(cv.dataset.pubs).then(function (r) { return r.json(); }), fetch(cv.dataset.map).then(function (r) { return r.json(); })])
      .then(function (res) {
        var titles = [], seen = {};
        res[0].forEach(function (p) { if (p.citation && !seen[p.citation]) { seen[p.citation] = 1; titles.push(titleOf(p.citation)); } });
        var kws = [];
        res[1].forEach(function (f) { f.keywords.forEach(function (kw) { kws.push({ name: kw.en || kw.name, res: (kw.patterns || []).map(toRegex) }); }); });
        var items = titles.map(function (t) { return kws.filter(function (k) { return k.res.some(function (r) { return r.test(t); }); }).map(function (k) { return k.name; }); });
        run(cv, items, Object.assign({ minPair: 2 }, opts));
      })
      .catch(function () { cv.hidden = true; });
  }

  window.PalOrbit = { run: run, fromMap: fromMap };

  // 페이지에 있는 궤도 캔버스를 자동으로 시작
  function boot() {
    document.querySelectorAll('canvas[data-orbit]').forEach(function (cv) {
      var wide = cv.dataset.orbit === 'wide';
      if (cv.dataset.map) return fromMap(cv, { wide: wide });
      var src = cv.dataset.items && document.getElementById(cv.dataset.items);
      var items; try { items = JSON.parse(src.textContent); } catch (e) { cv.hidden = true; return; }
      run(cv, items, { wide: wide });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

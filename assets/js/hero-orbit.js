// 대문 소개 상자 오른쪽: Research Orbit — Research Map 키워드가 궤도를 따라 천천히 돈다.
// 논문이 많은 키워드일수록 안쪽 궤도, 같은 논문을 공유하는 키워드는 빛나는 호로 연결.
// 화면 밖이면 멈추고, '동작 줄이기' 설정에서는 정지 그림으로 보인다.
(function () {
  var cv = document.getElementById('hero-orbit');
  if (!cv || !cv.getContext || !window.fetch) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MILK = '#eef4ff', GLOW = '#8fc3ff', CYAN = '#6fdcf7', LABEL = '#c9d8ec';
  var RINGS = [.17, .25, .32, .38];

  function titleOf(c) { var m = c.match(/\(\d{4}[a-z]?\)\.\s*(.+)$/); return (m ? m[1] : c).split(/\.\s+/)[0]; }
  function toRegex(p) { try { return new RegExp(p, 'i'); } catch (e) { return new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); } }

  Promise.all([fetch(cv.dataset.pubs).then(function (r) { return r.json(); }), fetch(cv.dataset.map).then(function (r) { return r.json(); })])
    .then(function (res) { start(res[0], res[1]); })
    .catch(function () { cv.hidden = true; });

  function start(pubs, map) {
    var titles = [], seen = {};
    pubs.forEach(function (p) { if (p.citation && !seen[p.citation]) { seen[p.citation] = 1; titles.push(titleOf(p.citation)); } });
    var kws = [];
    map.forEach(function (f) {
      f.keywords.forEach(function (kw) {
        var res = (kw.patterns || []).map(toRegex), hits = [];
        titles.forEach(function (t, i) { if (res.some(function (r) { return r.test(t); })) hits.push(i); });
        if (hits.length >= 2) kws.push({ name: kw.en || kw.name, hits: hits });
      });
    });
    kws.sort(function (a, b) { return b.hits.length - a.hits.length; });
    kws = kws.slice(0, 12);
    if (!kws.length) { cv.hidden = true; return; }
    var max = kws[0].hits.length;
    var orb = kws.map(function (k, i) {
      var ring = Math.min(3, Math.floor(i / 3));
      return { k: k, ring: ring, a0: (i % 3) / 3 * Math.PI * 2 + ring * .9, speed: (ring % 2 ? -1 : 1) * (0.04 + (3 - ring) * .015), size: .35 + .65 * k.hits.length / max };
    });
    var pairs = [];
    for (var i = 0; i < orb.length; i++) for (var j = i + 1; j < orb.length; j++) {
      var a = orb[i].k.hits, b = orb[j].k.hits, n = 0;
      a.forEach(function (x) { if (b.indexOf(x) >= 0) n++; });
      if (n >= 2) pairs.push([orb[i], orb[j], n]);
    }
    var seed = 11; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var stars = []; for (var s = 0; s < 70; s++) stars.push([rnd(), rnd(), rnd() * 1.4 + .3, rnd()]);
    var t0 = performance.now(), visible = true, raf = 0;

    function frame(now) {
      var S = cv.width, c = S / 2, t = reduce ? 0 : (now - t0) / 1000;
      ctx.clearRect(0, 0, S, S);
      // 배경 사진 위에서도 궤도가 보이도록 은은한 어두운 원판
      var disc = ctx.createRadialGradient(c, c, S * .1, c, c, S * .5);
      disc.addColorStop(0, 'rgba(6,16,34,.72)'); disc.addColorStop(.75, 'rgba(6,16,34,.45)'); disc.addColorStop(1, 'rgba(6,16,34,0)');
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(c, c, S * .5, 0, Math.PI * 2); ctx.fill();
      stars.forEach(function (st) { ctx.globalAlpha = .2 + .3 * Math.abs(Math.sin(t * .6 + st[3] * 6)); ctx.fillStyle = MILK; ctx.beginPath(); ctx.arc(st[0] * S, st[1] * S, st[2], 0, Math.PI * 2); ctx.fill(); });
      RINGS.forEach(function (r, k) {
        ctx.globalAlpha = .4; ctx.strokeStyle = k % 2 ? CYAN : GLOW; ctx.lineWidth = 1.4;
        ctx.setLineDash(k % 2 ? [3, 9] : []); ctx.beginPath(); ctx.arc(c, c, S * r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.save(); ctx.translate(c, c); ctx.rotate(t * .25);
      for (var k = 0; k < 140; k++) {
        var th = k * .32, rr = 4 + k * .6;
        ctx.globalAlpha = .12 + .55 * (1 - k / 140); ctx.fillStyle = k % 3 ? GLOW : CYAN;
        ctx.beginPath(); ctx.arc(Math.cos(th) * rr, Math.sin(th) * rr, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      var core = ctx.createRadialGradient(c, c, 0, c, c, S * .09);
      core.addColorStop(0, MILK); core.addColorStop(.35, GLOW); core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(c, c, S * .09, 0, Math.PI * 2); ctx.fill();
      orb.forEach(function (o) { var a = o.a0 + t * o.speed, r = S * RINGS[o.ring]; o.x = c + Math.cos(a) * r; o.y = c + Math.sin(a) * r; });
      pairs.forEach(function (p) {
        var a = p[0], b = p[1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.strokeStyle = CYAN; ctx.globalAlpha = Math.min(.5, .1 + p[2] * .05); ctx.lineWidth = 1 + Math.min(p[2], 6) * .3;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c + (mx - c) * .35, c + (my - c) * .35, b.x, b.y); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.font = '600 ' + Math.round(S * .029) + 'px "IBM Plex Sans KR", system-ui, sans-serif';
      ctx.textAlign = 'center';
      orb.forEach(function (o) {
        var r = S * (.01 + o.size * .016);
        ctx.shadowColor = CYAN; ctx.shadowBlur = 16; ctx.fillStyle = MILK;
        ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = GLOW; ctx.lineWidth = 2; ctx.stroke();
        var half = ctx.measureText(o.k.name).width / 2 + 6, lx = Math.max(half, Math.min(S - half, o.x));
        ctx.fillStyle = LABEL; ctx.fillText(o.k.name, lx, Math.max(S * .04, o.y - r - 8));
      });
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(frame);
    }).observe(cv);
    raf = requestAnimationFrame(frame);
  }
})();

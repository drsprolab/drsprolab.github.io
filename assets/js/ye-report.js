// 청년 기업가정신 리포트: 집단 프로파일(레이더)과 하위요인별 사전·사후 변화만 그린다.
(function () {
  var root = document.getElementById('ye-report');
  if (!root) return;
  var tip = document.getElementById('ye-tip');
  var D;

  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function f2(v) { return v.toFixed(2); }
  function signed(v) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function groupMeans(pt) {
    return D.factors.map(function (fc) {
      return mean(D.respondents.map(function (r) { return mean(fc.items.map(function (n) { return r[pt][n - 1]; })); }));
    });
  }

  function radar(series, label) {
    var n = D.factors.length, W = 440, H = 400, cx = W / 2, cy = H / 2 + 6, R = 138;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * (v - 1) / 4; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="radar" role="img" aria-label="' + esc(label) + '">';
    for (var g = 1; g <= 5; g++) {
      s += '<polygon points="' + D.factors.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '" class="rd-grid' + (g === 5 ? ' rd-outer' : '') + '"/>';
      if (g > 1) { var q = pt(0, g); s += '<text x="' + (q[0] + 5) + '" y="' + (q[1] + 4) + '" class="rd-tick">' + g + '</text>'; }
    }
    D.factors.forEach(function (fc, i) {
      var e = pt(i, 5), l = pt(i, 5.62);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="rd-axis"/>';
      var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      s += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="' + anchor + '" class="rd-label">' + esc(fc.name) + '</text>';
    });
    series.forEach(function (se) { s += '<polygon points="' + se.values.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" class="rd-area ' + se.cls + '"/>'; });
    series.forEach(function (se) {
      se.values.forEach(function (v, i) {
        var p = pt(i, v);
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" class="rd-dot ' + se.cls + '"/>';
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" class="rd-hit" data-tip="' + esc(se.label + ' · ' + D.factors[i].name + ' ' + f2(v)) + '"/>';
      });
    });
    return s + '</svg>';
  }
  function legend(items) {
    return items.map(function (it) { return '<span class="lg"><span class="lg-key ' + it.cls + '"></span>' + esc(it.label) + '</span>'; }).join('');
  }

  function render() {
    var pre = groupMeans('pre'), post = groupMeans('post');
    var series = [{ label: '사전', values: pre, cls: 's2' }, { label: '사후', values: post, cls: 's1' }];
    document.getElementById('ye-legend-group').innerHTML = legend(series);
    document.getElementById('ye-radar-group').innerHTML = radar(series, '하위요인별 평균: ' + D.factors.map(function (f, i) { return f.name + ' 사전 ' + f2(pre[i]) + ' 사후 ' + f2(post[i]); }).join(', '));

    var rows = D.factors.map(function (f, i) { return { name: f.name, pre: pre[i], post: post[i], d: post[i] - pre[i] }; }).sort(function (a, b) { return b.d - a.d; });
    var lo = 2.5, hi = 4.5;
    function x(v) { return Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); }
    var h = '<div class="dumbbell"><div class="db-scale"><span></span><span class="db-axis">' +
      [2.5, 3, 3.5, 4, 4.5].map(function (t) { return '<i style="left:' + x(t) + '%">' + t.toFixed(1) + '</i>'; }).join('') + '</span><span></span></div>';
    rows.forEach(function (r) {
      var a = x(Math.min(r.pre, r.post)), b = x(Math.max(r.pre, r.post));
      h += '<div class="db-row" data-tip="' + esc(r.name + ' · 사전 ' + f2(r.pre) + ' → 사후 ' + f2(r.post)) + '"><span class="db-name">' + esc(r.name) + '</span>' +
        '<span class="db-track"><span class="db-bar" style="left:' + a + '%;width:' + (b - a) + '%"></span>' +
        '<span class="db-dot s2" style="left:' + x(r.pre) + '%"></span><span class="db-dot s1" style="left:' + x(r.post) + '%"></span></span>' +
        '<span class="db-val">' + signed(r.d) + '</span></div>';
    });
    document.getElementById('ye-change').innerHTML = h + '</div><div class="legend">' + legend(series) + '</div>';
  }

  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (data) { D = data; render(); })
    .catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();

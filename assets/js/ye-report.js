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
    if (D.factors.length < 3 || D.factors.length > 8) {
      return '<div class="factor-profile" role="img" aria-label="' + esc(label) + '">' + D.factors.map(function (fc, i) {
        return '<div class="factor-profile-row"><strong>' + esc(fc.name) + '</strong>' + series.map(function (se) {
          return '<div class="factor-profile-value"><span>' + esc(se.label) + '</span><meter min="1" max="5" value="' + se.values[i] + '">' + f2(se.values[i]) + '</meter><span>' + f2(se.values[i]) + '</span></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }
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
      // 긴 요인 이름은 두 줄로 나눈다
      var words = fc.name.split(' '), lines = [fc.name];
      if (fc.name.length > 7 && words.length > 1) { var cut = Math.ceil(words.length / 2); lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]; }
      var y0 = l[1] + 4 - (lines.length - 1) * 7;
      s += '<text x="' + l[0] + '" y="' + y0 + '" text-anchor="' + anchor + '" class="rd-label">' + lines.map(function (t, li) { return '<tspan x="' + l[0] + '" dy="' + (li ? 15 : 0) + '">' + esc(t) + '</tspan>'; }).join('') + '</text>';
    });
    series.forEach(function (se) { s += '<polygon points="' + se.values.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" class="rd-area ' + se.cls + (se.dashed ? ' rd-dashed' : '') + '"/>'; });
    series.forEach(function (se) {
      if (se.dashed) return;
      se.values.forEach(function (v, i) {
        var p = pt(i, v);
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" class="rd-dot ' + se.cls + '"/>';
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" class="rd-hit" data-tip="' + esc(se.label + ' · ' + D.factors[i].name + ' ' + f2(v)) + '"/>';
      });
    });
    return s + '</svg>';
  }
  function legend(items) {
    return items.map(function (it) { return '<span class="lg"><span class="lg-key ' + it.cls + (it.dashed ? ' lg-dashed' : '') + '"></span>' + esc(it.label) + '</span>'; }).join('');
  }

  function render() {
    var pre = groupMeans('pre'), post = groupMeans('post');
    var series = [{ label: D.points.pre, values: pre, cls: 's2' }, { label: D.points.post, values: post, cls: 's1' }];
    document.getElementById('ye-legend-group').innerHTML = legend(series);
    document.getElementById('ye-radar-group').innerHTML = radar(series, '하위요인별 평균: ' + D.factors.map(function (f, i) { return f.name + ' 사전 ' + f2(pre[i]) + ' 사후 ' + f2(post[i]); }).join(', '));

    var rows = D.factors.map(function (f, i) { return { name: f.name, pre: pre[i], post: post[i], d: post[i] - pre[i] }; }).sort(function (a, b) { return b.d - a.d; });
    var lo = 1, hi = 5;
    function x(v) { return Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); }
    var h = '<div class="dumbbell"><div class="db-scale"><span></span><span class="db-axis">' +
      [1, 2, 3, 4, 5].map(function (t) { return '<i style="left:' + x(t) + '%">' + t.toFixed(1) + '</i>'; }).join('') + '</span><span></span></div>';
    rows.forEach(function (r) {
      var a = x(Math.min(r.pre, r.post)), b = x(Math.max(r.pre, r.post));
      h += '<div class="db-row" data-tip="' + esc(r.name + ' · 사전 ' + f2(r.pre) + ' → 사후 ' + f2(r.post)) + '"><span class="db-name">' + esc(r.name) + '</span>' +
        '<span class="db-track"><span class="db-bar" style="left:' + a + '%;width:' + (b - a) + '%"></span>' +
        '<span class="db-dot s2" style="left:' + x(r.pre) + '%"></span><span class="db-dot s1" style="left:' + x(r.post) + '%"></span></span>' +
        '<span class="db-val">' + signed(r.d) + '</span></div>';
    });
    document.getElementById('ye-change').innerHTML = h + '</div><div class="legend">' + legend(series) + '</div>';
  }


  // ---------- 페르소나 진단 ----------
  var P, selected = null, groupPost;
  function renderPersonaCards() {
    document.getElementById('ye-personas').innerHTML = P.personas.map(function (p) {
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (selected === p.id) + '" data-pid="' + p.id + '">' +
        '<span class="persona-avatar" aria-hidden="true">' + esc(p.name.slice(0, 1)) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + esc(p.type) + '</span>' +
        '<span class="persona-name">' + esc(p.name) + ' <small>' + p.age + '세 · ' + esc(p.role) + '</small></span></span></button>';
    }).join('');
  }
  function renderPersona() {
    var p = P.personas.find(function (x) { return x.id === selected; });
    var box = document.getElementById('ye-persona-result');
    if (!p) { box.innerHTML = ''; return; }
    var rank = P.factors.map(function (f, i) { return { f: f, v: p.scores[i], d: p.scores[i] - groupPost[i] }; });
    var take = P.neutral ? Math.max(1, Math.min(2, Math.floor(rank.length / 2))) : 2;
    var top = rank.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, take);
    var low = rank.slice().filter(function (x) { return !P.neutral || top.indexOf(x) < 0; }).sort(function (a, b) { return a.v - b.v; }).slice(0, take);
    var series = [{ label: '집단 평균(사후)', values: groupPost, cls: 'ref', dashed: true }, { label: p.name, values: p.scores, cls: 's1' }];
    function item(x) { return '<strong>' + esc(x.f) + '</strong> <span class="pd-score">' + x.v.toFixed(1) + '</span> <span class="pd-diff ' + (x.d >= 0 ? 'up' : 'down') + '">평균 대비 ' + signed(x.d) + '</span>'; }
    box.innerHTML =
      '<div class="pr-grid"><div><div class="legend">' + legend(series) + '</div><div class="radar-box">' +
      radar(series, p.name + ' 하위요인 점수와 집단 평균 비교') + '</div></div>' +
      '<div class="pr-diag"><p class="pr-summary"><span class="chip">' + esc(p.type) + '</span> ' + esc(p.summary) + '</p>' +
      '<div class="pd-block"><h3><span class="chip good">' + (P.neutral ? (rank.length === 1 ? '응답 수준' : '상대적으로 높은 응답') : '강점') + '</span></h3><ul>' + top.map(function (x) { return '<li>' + item(x) + '</li>'; }).join('') + '</ul></div>' +
      (low.length ? '<div class="pd-block"><h3><span class="chip warn">' + (P.neutral ? '상대적으로 낮은 응답' : '성장 요소') + '</span></h3><ul>' + low.map(function (x) { return '<li>' + item(x) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="pd-block"><h3>추천 활동</h3><ul class="pd-acts">' +
      top.map(function (x) { return '<li><span class="pd-tag">' + (P.neutral ? '지원 활동 · ' : '강점 강화 · ') + esc(x.f) + '</span>' + esc(P.activities[x.f].strengthen) + '</li>'; }).join('') +
      low.map(function (x) { return '<li><span class="pd-tag">' + (P.neutral ? '지원 활동 · ' : '성장 요소 극복 · ') + esc(x.f) + '</span>' + esc(P.activities[x.f].grow) + '</li>'; }).join('') +
      '</ul></div><div class="pd-plan"><strong>종합 제안</strong> ' + esc(p.plan) + '</div></div></div>';
  }
  function selectPersona(id) { selected = id; renderPersonaCards(); renderPersona(); }
  document.getElementById('ye-personas').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pid]'); if (b) selectPersona(b.dataset.pid);
  });
  function loadPersonas() {
    if (!root.dataset.personas) return;
    groupPost = groupMeans('post');
    fetch(root.dataset.personas).then(function (r) { return r.json(); }).then(function (data) { P = data; selectPersona(P.personas[0].id); });
  }

  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (data) { D = data; render(); loadPersonas(); })
    .catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();

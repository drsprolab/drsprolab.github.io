// 심리적 특권의식 진단 리포트: 사람마다 다른 수준(분포), 원인 단서, 유형별 개인·팀·조직 처방.
// 데이터: assets/data/pe-data.json (가상 예시)
(function () {
  var root = document.getElementById('pe-report');
  if (!root) return;
  var tip = document.getElementById('pe-tip');
  var D, sel = null;
  var CLS = ['s1', 's2', 's3', 's4'];

  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function typeIdx(id) { return D.types.findIndex(function (t) { return t.id === id; }); }

  // ---------- 1. 사람마다 다른 특권의식 (팀별 점 분포) ----------
  function renderSwarm() {
    var lo = D.scale[0], hi = D.scale[1], W = 900, rowH = 74, padL = 90, padR = 20, top = 30;
    var H = top + D.teams.length * rowH + 30;
    function x(v) { return padL + (v - lo) / (hi - lo) * (W - padL - padR); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="pe-swarm" role="img" aria-label="팀별 구성원 심리적 특권의식 분포">';
    s += '<rect x="' + x(D.cut) + '" y="' + (top - 10) + '" width="' + (x(hi) - x(D.cut)) + '" height="' + (D.teams.length * rowH + 4) + '" class="pe-hiband"/>';
    s += '<text x="' + (x(hi) - 6) + '" y="' + (top - 14) + '" text-anchor="end" class="pe-band-label">상위 25% (특권의식 높음)</text>';
    for (var v = lo; v <= hi; v++) {
      s += '<line x1="' + x(v) + '" y1="' + (top - 6) + '" x2="' + x(v) + '" y2="' + (top + D.teams.length * rowH - 6) + '" class="pe-grid"/>';
      s += '<text x="' + x(v) + '" y="' + (H - 8) + '" text-anchor="middle" class="pe-tick">' + v + '</text>';
    }
    D.teams.forEach(function (team, r) {
      var cy = top + r * rowH + rowH / 2 - 6;
      s += '<text x="' + (padL - 14) + '" y="' + (cy + 4) + '" text-anchor="end" class="pe-team">' + esc(team) + '</text>';
      var list = D.people.filter(function (p) { return p.team === team; }).sort(function (a, b) { return a.score - b.score; });
      var placed = [];
      list.forEach(function (p) {
        var px = x(p.score), py = cy, k = 0;
        // 겹치지 않도록 위아래로 번갈아 쌓기
        while (placed.some(function (q) { return Math.abs(q[0] - px) < 11 && Math.abs(q[1] - py) < 11; }) && k < 8) { k++; py = cy + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 11; }
        placed.push([px, py]);
        var ti = p.type ? typeIdx(p.type) : -1;
        s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5" class="pe-dot ' + (ti >= 0 ? CLS[ti] : 'none') + '" data-tip="' + esc(p.id + ' · ' + team + ' · 특권의식 ' + p.score.toFixed(1) + (ti >= 0 ? ' · ' + D.types[ti].name : '')) + '"' + (ti >= 0 ? ' data-type="' + p.type + '"' : '') + '/>';
      });
    });
    s += '</svg>';
    document.getElementById('pe-swarm').innerHTML = s;
    document.getElementById('pe-swarm-legend').innerHTML = '<span class="lg"><span class="pe-key none"></span>그 밖의 구성원</span>' +
      D.types.map(function (t, i) { return '<span class="lg"><span class="pe-key ' + CLS[i] + '"></span>' + esc(t.name) + '</span>'; }).join('');
    var byTeam = D.teams.map(function (t) { var l = D.people.filter(function (p) { return p.team === t; }); return { t: t, hi: l.filter(function (p) { return p.type; }).length, n: l.length }; });
    document.getElementById('pe-swarm-note').textContent = '같은 팀 안에서도 특권의식의 정도는 크게 다릅니다. 팀별 상위 25% 인원: ' + byTeam.map(function (b) { return b.t + ' ' + b.hi + '명/' + b.n + '명'; }).join(' · ');
  }

  // ---------- 2. 원인 단서 ----------
  function renderCauses() {
    var hiP = D.people.filter(function (p) { return p.type; }), rest = D.people.filter(function (p) { return !p.type; });
    var rows = D.causes.map(function (c, j) { return { c: c, d: mean(hiP.map(function (p) { return p.traits[j]; })) - mean(rest.map(function (p) { return p.traits[j]; })) }; })
      .sort(function (a, b) { return b.d - a.d; });
    var maxD = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.d); })) || 1;
    document.getElementById('pe-causes').innerHTML = '<div class="pe-cause-list">' + rows.map(function (r) {
      var w = Math.abs(r.d) / maxD * 100;
      return '<div class="pe-cause-row" data-tip="' + esc(r.c + ' · 특권의식 높은 집단이 나머지보다 ' + (r.d >= 0 ? '+' : '') + r.d.toFixed(2) + ' 표준편차') + '"><span class="pe-cause-name">' + esc(r.c) + '</span>' +
        '<span class="pe-cause-track"><span class="pe-cause-bar ' + (r.d >= 0 ? 'pos' : 'neg') + '" style="width:' + w.toFixed(0) + '%"></span></span><span class="pe-cause-val">' + (r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '</span></div>';
    }).join('') + '</div>';
  }

  // ---------- 3. 유형별 처방 ----------
  function renderCards() {
    document.getElementById('pe-types').innerHTML = D.types.map(function (t, i) {
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (sel === t.id) + '" data-pid="' + t.id + '">' +
        '<span class="persona-avatar sc-av-' + CLS[i] + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + t.n + '명 · 평균 ' + t.score.toFixed(1) + '</span><span class="persona-name">' + esc(t.name) + '</span></span></button>';
    }).join('');
  }
  function renderType() {
    var t = D.types.find(function (x) { return x.id === sel; }), i = typeIdx(sel);
    var maxA = 2.2;
    function bar(v) {
      var w = Math.min(Math.abs(v) / maxA, 1) * 50;
      return '<span class="pe-tbar"><span class="pe-tbar-fill ' + (v >= 0 ? 'pos' : 'neg') + '" style="' + (v >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(0) + '%"></span><span class="pe-tbar-mid"></span></span>';
    }
    function block(title, tag, list) { return '<div class="pd-block"><h3>' + title + '</h3><ul class="pd-acts">' + list.map(function (a) { return '<li><span class="pd-tag">' + tag + '</span>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }
    document.getElementById('pe-type-result').innerHTML =
      '<div class="pr-grid"><div><h3 class="gl-sub">배경 특성 조합 <span>· 조직 평균(가운데선) 대비</span></h3><div class="pe-tprofile">' +
      D.causes.map(function (c, j) { var key = t.cause.indexOf(j) >= 0; return '<div class="pe-trow' + (key ? ' key' : '') + '"><span class="pe-tname">' + esc(c) + (key ? ' <span class="chip warn">핵심 원인</span>' : '') + '</span>' + bar(t.traits[j]) + '<span class="pe-tval">' + (t.traits[j] >= 0 ? '+' : '') + t.traits[j].toFixed(2) + '</span></div>'; }).join('') +
      '</div><p class="lvr-note">값은 조직 평균과의 차이(표준편차 단위)입니다. 오른쪽으로 길수록 그 특성이 강합니다.</p></div>' +
      '<div class="pr-diag"><div class="la-level"><span class="la-level-k">유형</span><strong class="lm-pname">' + esc(t.name) + '</strong><span class="la-level-type">' + t.n + '명 · 특권의식 평균 ' + t.score.toFixed(1) + '</span></div>' +
      '<p class="pr-summary"><strong>왜 이런 특권의식을 갖게 되었나?</strong> ' + esc(t.why) + '</p>' +
      block('개인: 무엇을 해야 하나', '개인', t.individual) + block('팀: 함께 바꿀 것', '팀', t.team) + block('조직: 구조적으로 처방할 것', '조직', t.org) +
      '</div></div>';
    document.querySelectorAll('#pe-swarm .pe-dot').forEach(function (d) { d.classList.toggle('dim', !!d.dataset.type && d.dataset.type !== sel); });
  }
  function select(id) { sel = id; renderCards(); renderType(); }

  root.addEventListener('click', function (e) { var b = e.target.closest('[data-pid]'); if (b) select(b.dataset.pid); });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (d) {
    D = d; renderSwarm(); renderCauses(); select(D.types[0].id);
  }).catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();

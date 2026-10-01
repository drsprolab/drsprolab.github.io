// 청소년 기업가정신 리포트 샘플: 데이터(JSON)를 읽어 집단/개인 프로파일을 그린다.
(function () {
  var root = document.getElementById('ye-report');
  if (!root) return;

  // 문항 원문 대신 짧은 키워드만 보여 준다 (원 문항은 원 논문 참고).
  var ITEM_KW = ['자신의 장점 인식', '일을 해낼 능력', '스스로의 존재 가치', '계획 실행 자신감',
    '스스로 목표 설정', '목표 달성 노력', '나에게 맞는 방법 탐색', '할 일 끝까지 수행',
    '어제보다 나은 나', '노력하면 나아진다', '실패 후 다시 노력', '노력에 따른 발전',
    '변화 앞의 용기', '어려움을 이기는 마음', '극복 자신감', '어려워도 성취',
    '당연한 것에 의문', '새 제품·콘텐츠 관심', '새로운 정보 관심', '다른 방식 시도', '일상 속 새 시도',
    '다른 생각 존중', '타인의 선택 존중', '끝까지 경청', '의견 나누기', '감정 배려',
    '여러 각도로 고민', '아이디어 떠올리기', '아이디어 모아 발전', '정보 먼저 수집', '막히면 더 알아보기'];
  var GAP = 0.3; // 강점/성장 과제 판정 기준 (집단 평균 대비)

  var state = { point: 'post', school: 'all', selected: null, sort: { key: 'id', dir: 1 } };
  var D, people = [];
  var tip = document.getElementById('ye-tip');

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function f2(v) { return v.toFixed(2); }
  function signed(v) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- data ----------
  function score(resp, items) { return mean(items.map(function (n) { return resp[n - 1]; })); }
  function prepare(data) {
    D = data;
    people = data.respondents.map(function (r) {
      var p = { id: r.id, school: r.school, grade: r.grade, raw: { pre: r.pre, post: r.post }, f: { pre: [], post: [] } };
      ['pre', 'post'].forEach(function (pt) {
        p.f[pt] = data.factors.map(function (fc) { return score(r[pt], fc.items); });
        p['total_' + pt] = mean(r[pt]);
      });
      p.change = p.total_post - p.total_pre;
      return p;
    });
  }
  function filtered(school) {
    var sc = school || state.school;
    return sc === 'all' ? people : people.filter(function (p) { return p.school === sc; });
  }
  function groupMeans(list, pt) {
    return D.factors.map(function (_, i) { return mean(list.map(function (p) { return p.f[pt][i]; })); });
  }

  // ---------- radar ----------
  // series: [{label, values, cls, dashed}]
  function radar(series, opts) {
    var n = D.factors.length, W = 440, H = 400, cx = W / 2, cy = H / 2 + 6, R = 138, lo = 1, hi = 5;
    function pt(i, v) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * (v - lo) / (hi - lo);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="radar" role="img" aria-label="' + esc(opts.label) + '">';
    for (var g = 1; g <= 5; g++) {
      var ring = D.factors.map(function (_, i) { return pt(i, g).join(','); }).join(' ');
      s += '<polygon points="' + ring + '" class="rd-grid' + (g === 5 ? ' rd-outer' : '') + '"/>';
      if (g > 1) { var q = pt(0, g); s += '<text x="' + (q[0] + 5) + '" y="' + (q[1] + 4) + '" class="rd-tick">' + g + '</text>'; }
    }
    D.factors.forEach(function (fc, i) {
      var e = pt(i, 5), l = pt(i, 5.62);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="rd-axis"/>';
      var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      s += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="' + anchor + '" class="rd-label">' + esc(fc.name) + '</text>';
    });
    series.forEach(function (se) {
      var pts = se.values.map(function (v, i) { return pt(i, v).join(','); }).join(' ');
      s += '<polygon points="' + pts + '" class="rd-area ' + se.cls + (se.dashed ? ' rd-dashed' : '') + '"/>';
    });
    series.forEach(function (se, si) {
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
    return items.map(function (it) {
      return '<span class="lg"><span class="lg-key ' + it.cls + (it.dashed ? ' lg-dashed' : '') + '"></span>' + esc(it.label) + '</span>';
    }).join('');
  }

  // ---------- sections ----------
  function renderKpis(list) {
    var cur = mean(list.map(function (p) { return p['total_' + state.point]; }));
    var chg = mean(list.map(function (p) { return p.change; }));
    var gm = groupMeans(list, state.point);
    var hiI = gm.indexOf(Math.max.apply(null, gm)), loI = gm.indexOf(Math.min.apply(null, gm));
    var improved = list.filter(function (p) { return p.change > 0; }).length;
    var label = D.points[state.point];
    document.getElementById('ye-kpis').innerHTML =
      tile('응답자', list.length + '<small>명</small>', state.school === 'all' ? '중·고등학생 전체' : state.school) +
      tile(label + ' 전체 평균', f2(cur) + '<small>/ 5</small>', '31문항 평균') +
      tile('사전 → 사후 변화', signed(chg), improved + '명(' + Math.round(improved / Math.max(list.length, 1) * 100) + '%) 상승') +
      tile('가장 높은 요인', esc(D.factors[hiI].name), label + ' ' + f2(gm[hiI]) + ' · 가장 낮은 요인 ' + esc(D.factors[loI].name) + ' ' + f2(gm[loI]));
    function tile(k, v, sub) { return '<div class="kpi"><div class="kpi-k">' + k + '</div><div class="kpi-v">' + v + '</div><div class="kpi-s">' + sub + '</div></div>'; }
  }

  function renderGroup(list) {
    var pre = groupMeans(list, 'pre'), post = groupMeans(list, 'post');
    var series = [{ label: '사전', values: pre, cls: 's2' }, { label: '사후', values: post, cls: 's1' }];
    document.getElementById('ye-legend-group').innerHTML = legend(series);
    document.getElementById('ye-radar-group').innerHTML = radar(series, { label: '집단 하위요인 평균: ' + D.factors.map(function (f, i) { return f.name + ' 사전 ' + f2(pre[i]) + ' 사후 ' + f2(post[i]); }).join(', ') });

    // 변화량: 사전→사후 점 연결(덤벨)
    var rows = D.factors.map(function (f, i) { return { name: f.name, pre: pre[i], post: post[i], d: post[i] - pre[i] }; })
      .sort(function (a, b) { return b.d - a.d; });
    var lo = 2.5, hi = 4.5;
    function x(v) { return Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); }
    var h = '<div class="dumbbell"><div class="db-scale"><span></span><span class="db-axis">' +
      [2.5, 3, 3.5, 4, 4.5].map(function (t) { return '<i style="left:' + x(t) + '%">' + t.toFixed(1) + '</i>'; }).join('') + '</span><span></span></div>';
    rows.forEach(function (r) {
      var a = x(Math.min(r.pre, r.post)), b = x(Math.max(r.pre, r.post));
      h += '<div class="db-row" data-tip="' + esc(r.name + ' · 사전 ' + f2(r.pre) + ' → 사후 ' + f2(r.post)) + '">' +
        '<span class="db-name">' + esc(r.name) + '</span>' +
        '<span class="db-track"><span class="db-bar" style="left:' + a + '%;width:' + (b - a) + '%"></span>' +
        '<span class="db-dot s2" style="left:' + x(r.pre) + '%"></span><span class="db-dot s1" style="left:' + x(r.post) + '%"></span></span>' +
        '<span class="db-val">' + signed(r.d) + '</span></div>';
    });
    document.getElementById('ye-change').innerHTML = h + '</div><div class="legend">' + legend([{ label: '사전', cls: 's2' }, { label: '사후', cls: 's1' }]) + '</div>';
  }

  function renderTable(list) {
    var pt = state.point, k = state.sort.key, dir = state.sort.dir;
    var rows = list.slice().sort(function (a, b) {
      var va = k === 'id' ? a.id : k === 'total' ? a['total_' + pt] : k === 'change' ? a.change : a.f[pt][k];
      var vb = k === 'id' ? b.id : k === 'total' ? b['total_' + pt] : k === 'change' ? b.change : b.f[pt][k];
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
    function th(key, label, cls) {
      var cur = state.sort.key === key;
      return '<th class="' + (cls || '') + '" aria-sort="' + (cur ? (dir > 0 ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-sort="' + key + '">' + label + (cur ? (dir > 0 ? ' ▲' : ' ▼') : '') + '</button></th>';
    }
    var h = '<thead><tr>' + th('id', 'ID') + '<th>학교급</th><th class="num">학년</th>' + th('total', D.points[pt] + ' 평균', 'num') +
      D.factors.map(function (f, i) { return th(i, esc(f.name), 'num'); }).join('') + th('change', '사전→사후', 'num') + '</tr></thead><tbody>';
    rows.forEach(function (p) {
      h += '<tr' + (p.id === state.selected ? ' class="is-sel"' : '') + '><td><button type="button" class="id-btn" data-id="' + p.id + '" aria-pressed="' + (p.id === state.selected) + '">' + p.id + '</button></td>' +
        '<td>' + p.school + '</td><td class="num">' + p.grade + '</td><td class="num strong">' + f2(p['total_' + pt]) + '</td>' +
        p.f[pt].map(function (v) { return '<td class="num"><span class="cell" style="--v:' + ((v - 1) / 4) + '">' + v.toFixed(1) + '</span></td>'; }).join('') +
        '<td class="num ' + (p.change > 0 ? 'up' : p.change < 0 ? 'down' : '') + '">' + signed(p.change) + '</td></tr>';
    });
    document.getElementById('ye-table').innerHTML = h + '</tbody>';
  }

  function renderProfile() {
    var box = document.getElementById('ye-profile');
    var p = people.find(function (x) { return x.id === state.selected; });
    if (!p) { box.hidden = true; box.innerHTML = ''; return; }
    var pt = state.point, peers = filtered(p.school), gm = groupMeans(peers, pt);
    var mine = p.f[pt];
    var diffs = mine.map(function (v, i) { return { i: i, d: v - gm[i] }; });
    var strengths = diffs.filter(function (x) { return x.d >= GAP; }).sort(function (a, b) { return b.d - a.d; });
    var growth = diffs.filter(function (x) { return x.d <= -GAP; }).sort(function (a, b) { return a.d - b.d; });
    var rank = peers.slice().sort(function (a, b) { return b['total_' + pt] - a['total_' + pt]; }).findIndex(function (x) { return x.id === p.id; }) + 1;
    var series = [{ label: p.school + ' 평균', values: gm, cls: 'ref', dashed: true }, { label: p.id + ' (' + D.points[pt] + ')', values: mine, cls: 's1' }];
    function names(list) { return list.length ? list.map(function (x) { return '<strong>' + esc(D.factors[x.i].name) + '</strong> (' + signed(x.d) + ')'; }).join(', ') : '해당 없음'; }

    var h = '<div class="panel-head"><div><div class="eyebrow">개인 프로파일 · ' + D.points[pt] + '</div>' +
      '<h2 class="panel-title profile-id">' + p.id + ' <span>' + p.school + ' ' + p.grade + '학년</span></h2></div>' +
      '<button type="button" class="close-btn" id="ye-close">닫기</button></div>' +
      '<div class="profile-grid"><div><div class="legend">' + legend(series) + '</div><div class="radar-box">' +
      radar(series, { label: p.id + ' 하위요인 점수와 ' + p.school + ' 평균 비교' }) + '</div></div><div class="profile-side">' +
      '<div class="kpis mini"><div class="kpi"><div class="kpi-k">' + D.points[pt] + ' 평균</div><div class="kpi-v">' + f2(p['total_' + pt]) + '</div><div class="kpi-s">' + p.school + ' ' + peers.length + '명 중 ' + rank + '위</div></div>' +
      '<div class="kpi"><div class="kpi-k">사전 → 사후</div><div class="kpi-v">' + signed(p.change) + '</div><div class="kpi-s">' + f2(p.total_pre) + ' → ' + f2(p.total_post) + '</div></div></div>' +
      '<p class="insight"><span class="chip good">강점</span> ' + names(strengths) + '</p>' +
      '<p class="insight"><span class="chip warn">성장 과제</span> ' + names(growth) + '</p>' +
      '<table class="mini-table"><thead><tr><th>하위요인</th><th class="num">점수</th><th class="num">집단 평균</th><th class="num">차이</th><th class="num">사전→사후</th></tr></thead><tbody>' +
      D.factors.map(function (f, i) {
        var d = mine[i] - gm[i], c = p.f.post[i] - p.f.pre[i];
        return '<tr><td>' + esc(f.name) + '</td><td class="num strong">' + f2(mine[i]) + '</td><td class="num">' + f2(gm[i]) + '</td><td class="num ' + (d >= GAP ? 'up' : d <= -GAP ? 'down' : '') + '">' + signed(d) + '</td><td class="num">' + signed(c) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<h3 class="items-title">문항별 응답 <span>사전 / 사후 (1–5)</span></h3><div class="items-grid">' +
      D.factors.map(function (f) {
        return '<div class="item-group"><div class="ig-name">' + esc(f.name) + '</div>' + f.items.map(function (n) {
          var a = p.raw.pre[n - 1], b = p.raw.post[n - 1];
          return '<div class="ir"><span class="ir-no">' + (n < 10 ? '0' : '') + n + '</span><span class="ir-kw">' + esc(ITEM_KW[n - 1]) + '</span>' +
            '<span class="ir-v">' + a + '</span><span class="ir-arrow ' + (b > a ? 'up' : b < a ? 'down' : '') + '">' + (b > a ? '▲' : b < a ? '▼' : '–') + '</span><span class="ir-v strong">' + b + '</span></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    box.innerHTML = h;
    box.hidden = false;
    document.getElementById('ye-close').addEventListener('click', function () { select(null); });
  }

  function render() {
    var list = filtered();
    document.querySelectorAll('#ye-report [data-point]').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.point === state.point); });
    document.querySelectorAll('#ye-report [data-school]').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.school === state.school); });
    renderKpis(list); renderGroup(list); renderTable(list); renderProfile();
  }

  function select(id, scroll) {
    state.selected = id;
    if (history.replaceState) history.replaceState(null, '', id ? '#' + id : location.pathname + location.search);
    render();
    if (id && scroll) { var box = document.getElementById('ye-profile'); box.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); box.focus({ preventScroll: true }); }
  }

  // ---------- events ----------
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.point) { state.point = b.dataset.point; render(); }
    else if (b.dataset.school) { state.school = b.dataset.school; render(); }
    else if (b.dataset.sort != null) {
      var key = isNaN(+b.dataset.sort) ? b.dataset.sort : +b.dataset.sort;
      state.sort = { key: key, dir: state.sort.key === key ? -state.sort.dir : (key === 'id' ? 1 : -1) }; render();
    } else if (b.dataset.id) { select(b.dataset.id === state.selected ? null : b.dataset.id, true); }
  });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    var x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  // ---------- load ----------
  fetch(root.dataset.src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
    prepare(data);
    document.getElementById('ye-note').innerHTML = '<span class="chip">예시 데이터</span> ' + esc(data.note) + ' 응답자 ' + people.length + '명 · ' + esc(data.scale);
    var h = location.hash.slice(1);
    if (h && people.some(function (p) { return p.id === h; })) state.selected = h;
    render();
  }).catch(function () {
    document.getElementById('ye-note').textContent = '데이터 파일을 불러오지 못했습니다. assets/data/youth-entrepreneurship-sample.json 경로를 확인하세요.';
  });
})();

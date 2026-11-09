/* LO_Review — 대문(보드)
 * 논문 리뷰 카드와 Conceptual Map 카드를 각각 불러와 박스형으로 보여 줍니다.
 * 카드를 누르면 본문 페이지로 이동하며, 누구나 열람할 수 있습니다.
 * 주차별로 묶고, 마감이 지난 주는 접힌 묶음으로 숨깁니다.
 */
(function () {
  'use strict';

  var PL = window.PL;
  var BEST_ADMIN_MODE = new URLSearchParams(window.location.search).get('best-admin') === '1';

  var state = {
    reviews: [],
    maps: []
  };
  var savingBest = false;

  var els = {
    reviewEntries: document.getElementById('reviewEntries'),
    reviewSub: document.getElementById('reviewSub'),
    mapEntries: document.getElementById('mapEntries'),
    mapSub: document.getElementById('mapSub')
  };

  function tags(values) {
    var list = values.filter(Boolean);
    if (!list.length) return '';
    return '<div class="tags">' + list.map(function (v) {
      return '<span class="badge">' + PL.esc(v) + '</span>';
    }).join('') + '</div>';
  }

  // 제출자 이름 — 카드 맨 위에 크게
  function who(name) {
    return '<div class="inst-who">' + PL.esc(name || '이름 없음') + '</div>';
  }

  function isBest(row) {
    // 예전 임시 선정에는 선정 시각이 없다. 새로 선택한 제출물만 배지로 표시한다.
    return String(row.best_of_week).toLowerCase() === 'true' && !!row.best_selected_at;
  }

  // 그 주에 이미 BEST가 정해졌는지 (논문 리뷰·Conceptual Map 통틀어 한 주에 하나)
  function weekHasBest(weekKey) {
    return state.reviews.concat(state.maps).some(function (r) {
      return String(r.week_key || '') === String(weekKey || '') && isBest(r);
    });
  }

  function bestControl(row, kind) {
    var best = isBest(row);
    if (!BEST_ADMIN_MODE || !PL.isBestAdmin()) {
      return best ? '<span class="best-week-badge">Best Review of Week</span>' : '';
    }
    // BEST가 정해진 주에는 다른 카드의 체크박스를 숨긴다(선정을 풀면 다시 보임)
    if (!best && weekHasBest(row.week_key)) return '';
    return '<label class="best-checkbox" title="' + (best ? 'Best Review of Week 선정 해제' : 'Best Review of Week 선정') + '">' +
      '<input type="checkbox" data-best-kind="' + kind + '" data-best-id="' + PL.esc(row.id) +
      '" aria-label="' + PL.esc((row.student || '이름 없음') + ' · Best Review of Week') +
      '"' + (best ? ' checked' : '') + (savingBest ? ' disabled' : '') + ' />' +
      '<span class="best-week-badge"' + (best ? '' : ' hidden') + '>Best Review of Week</span></label>';
  }

  function summaryOf(row) {
    return PL.snippet(row.r5_message || row.r2_problem || row.r1_reason || '', 200);
  }

  /* ---------- 주차 묶음 ----------
   * 한 주(월~일) 단위로 묶습니다. 제출 주차의 목록은 모두 펼쳐 두고,
   * 다음 주 목요일 오전 10시가 되면 그 주는 접힌 묶음이 됩니다. (예: 9주차 10.19~10.25 → 10.29(목) 오전 10시)
   * 제출물은 자동으로 지우지 않습니다(삭제는 교수님 요청 시 구글 시트에서 직접).
   */
  var FOLD_AFTER = { reviews: 10, maps: 10 }; // 주 시작(월요일)부터 며칠 뒤 = 다음 주 목요일
  var FOLD_HOUR = 10;

  function foldAt(key, kind) {
    var d = PL.weekKeyToDate(key);
    if (!d) return null;
    d.setDate(d.getDate() + FOLD_AFTER[kind]);
    d.setHours(FOLD_HOUR, 0, 0, 0);
    return d;
  }

  function weekTitle(key) {
    var n = PL.courseWeek(key);
    return n ? n + '주차' : (key || '주차 없음');
  }

  function foldNote(d) {
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    return (d.getMonth() + 1) + '.' + d.getDate() + '(' + days[d.getDay()] + ') 오전 ' + FOLD_HOUR + '시에 한 묶음으로 정리';
  }

  // list → [{ key, rows }] 최신 주차부터, 주 안에서는 이름순
  function groupByWeek(list) {
    var groups = {};
    list.forEach(function (r) {
      var k = r.week_key || '';
      (groups[k] = groups[k] || []).push(r);
    });
    return Object.keys(groups)
      .sort(function (a, b) { return b.localeCompare(a); })
      .map(function (k) {
        return {
          key: k,
          rows: groups[k].sort(function (a, b) {
            return String(a.student || '').localeCompare(String(b.student || ''), 'ko');
          })
        };
      });
  }

  function countLabel(list) {
    return '전체 ' + list.length + '편';
  }

  function renderWeeks(container, list, kind, gridClass, card) {
    var now = new Date();
    container.innerHTML = groupByWeek(list).map(function (g) {
      var at = foldAt(g.key, kind);
      var cards = '<div class="' + gridClass + '">' + g.rows.map(card).join('') + '</div>';
      var count = '<small>' + g.rows.length + '편</small>';
      if (at && now < at) {
        return '<section class="wk-open">' +
          '<h3 class="wk-head">' + PL.esc(weekTitle(g.key)) + count +
            '<span class="wk-note">' + PL.esc(foldNote(at)) + '</span></h3>' +
          cards +
        '</section>';
      }
      return '<details class="wk-fold">' +
        '<summary class="wk-head">' + PL.esc(weekTitle(g.key)) + count + '</summary>' +
        cards +
      '</details>';
    }).join('');
  }

  /* ---------- 논문 리뷰 ---------- */

  function renderReviews() {
    var list = state.reviews;
    els.reviewEntries.setAttribute('aria-busy', 'false');
    els.reviewSub.textContent = countLabel(list, 'reviews');

    if (!list.length) {
      els.reviewEntries.innerHTML = '<div class="empty"><strong>아직 제출된 논문 리뷰가 없습니다</strong>' +
        '첫 리뷰를 제출하면 이곳에 카드로 표시되고, 누구나 클릭해 전체 내용을 읽을 수 있습니다. ' +
        '<a href="submit.html">첫 리뷰 제출하기</a></div>';
      return;
    }

    renderWeeks(els.reviewEntries, list, 'reviews', 'entries', function (r) {
      var sum = summaryOf(r);
      var best = isBest(r);
      return '<div class="review-card-wrap' + (best ? ' is-best' : '') + '"><div class="best-card-head">' +
        who(r.student) + bestControl(r, 'reviews') + '</div><a class="inst" href="review.html?id=' + encodeURIComponent(r.id) + '">' +
        tags([r.journal_name, r.pub_year]) +
        '<h3 class="review-title">' + PL.esc(r.paper_title || '(제목 없음)') +
          '</h3>' +
        (sum ? '<p>' + PL.esc(sum) + '</p>' : '') +
      '</a></div>';
    });
  }

  /* ---------- Conceptual Map ---------- */

  function thumb(row) {
    var ref = String(row.cm_diagram_ref || '').trim();
    if (!ref) return '';
    var src = PL.fileUrl('concept-maps', ref);
    return '<img class="cm-thumb" src="' + PL.esc(src) + '" alt="' +
      PL.esc((row.student || '') + ' ' + PL.weekShort(row.week_key) + ' Conceptual Map 도식') + '" loading="lazy" />';
  }

  function renderMaps() {
    var list = state.maps;
    els.mapEntries.setAttribute('aria-busy', 'false');
    els.mapSub.textContent = countLabel(list, 'maps');

    if (!list.length) {
      els.mapEntries.innerHTML = '<div class="empty"><strong>아직 제출된 Conceptual Map이 없습니다</strong>' +
        'Conceptual Map을 제출하면 이곳에 도식과 함께 표시됩니다. ' +
        '<a href="concept.html">첫 Conceptual Map 제출하기</a></div>';
      return;
    }

    renderWeeks(els.mapEntries, list, 'maps', 'cm-grid', function (m) {
      var best = isBest(m);
      return '<div class="review-card-wrap' + (best ? ' is-best' : '') + '"><div class="best-card-head">' +
        who(m.student) + bestControl(m, 'maps') + '</div><a class="inst" href="concept-detail.html?id=' + encodeURIComponent(m.id) + '">' +
        '<h3 class="review-title">' + PL.esc(PL.snippet(m.cm_theory || 'Conceptual Map', 60)) +
          '</h3>' +
        thumb(m) +
        (m.cm_explanation ? '<p>' + PL.esc(PL.snippet(m.cm_explanation, 200)) + '</p>' : '') +
      '</a></div>';
    });
  }

  /* ---------- 방금 제출한 글 표시 ----------
   * 제출 화면이 index.html?submitted=<id>&kind=reviews|maps 로 보내면
   * 그 카드가 든 묶음을 펼치고, 카드를 강조해 화면 가운데로 가져옵니다.
   */
  function markSubmitted(kind, container) {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('submitted');
    if (!id || params.get('kind') !== kind) return;

    var card = container.querySelector('a.inst[href$="id=' + encodeURIComponent(id) + '"]');
    if (card) {
      var fold = card.closest('details');
      if (fold) fold.open = true;
      card.classList.add('is-mine');
      card.insertAdjacentHTML('afterbegin', '<span class="mine-flag">방금 제출</span>');
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    PL.toast('제출이 완료되었습니다. 방금 제출한 글을 확인하세요.', 'ok');
    // 새로고침해도 다시 뜨지 않게 주소에서 지웁니다.
    window.history.replaceState(null, '', window.location.pathname);
  }

  /* ---------- 이벤트 ---------- */

  function boot() {
    PL.table('reviews').list()
      .then(function (rows) {
        state.reviews = rows || [];
        renderReviews();
        renderMaps();
        markSubmitted('reviews', els.reviewEntries);
      })
      .catch(function (err) {
        els.reviewEntries.setAttribute('aria-busy', 'false');
        els.reviewEntries.innerHTML = '<div class="empty"><strong>논문 리뷰를 불러오지 못했습니다</strong>' +
          PL.esc(err.message || '네트워크 오류') + '</div>';
      });

    PL.table('concept_maps').list()
      .then(function (rows) {
        state.maps = rows || [];
        renderMaps();
        renderReviews();
        markSubmitted('maps', els.mapEntries);
      })
      .catch(function (err) {
        els.mapEntries.setAttribute('aria-busy', 'false');
        els.mapEntries.innerHTML = '<div class="empty"><strong>Conceptual Map을 불러오지 못했습니다</strong>' +
          PL.esc(err.message || '네트워크 오류') + '</div>';
      });
  }

  function attachBestToggle(container, kind) {
    // 기존 제출 시간 옆의 빨간 점으로도 같은 체크박스를 선택할 수 있습니다.
    container.addEventListener('click', function (event) {
      if (!event.target.closest('.late-dot')) return;
      var card = event.target.closest('.review-card-wrap');
      var input = card && card.querySelector('[data-best-id]');
      if (!input) return;
      event.preventDefault();
      if (!input.disabled) input.click();
    });
    container.addEventListener('change', function (event) {
      var input = event.target.closest('[data-best-id]');
      if (!input || !container.contains(input)) return;
      var id = input.getAttribute('data-best-id');
      // 목록 로딩 때 state 배열이 교체되므로 클릭 시점의 최신 목록을 읽습니다.
      var row = state[kind].filter(function (r) { return String(r.id) === String(id); })[0];
      if (!row || input.disabled || savingBest) return;
      var next = input.checked;
      var before = state.reviews.concat(state.maps).map(function (r) {
        return { row: r, best: r.best_of_week, selectedAt: r.best_selected_at };
      });
      savingBest = true;
      if (next) state.reviews.concat(state.maps).forEach(function (r) {
        if (String(r.week_key || '') === String(row.week_key || '')) {
          r.best_of_week = false; r.best_selected_at = '';
        }
      });
      row.best_of_week = next;
      row.best_selected_at = next ? 'pending' : '';
      renderReviews();
      renderMaps();
      PL.table(kind === 'maps' ? 'concept_maps' : 'reviews').update(id, {
        best_of_week: next,
        submitted_time: row.submitted_time || row.updated_at || row.created_at || null
      }).then(function (updated) {
        if (!updated || !Object.prototype.hasOwnProperty.call(updated, 'best_of_week') || isBest(updated) !== next) {
          throw new Error('저장 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
        }
        Object.assign(row, updated);
        savingBest = false;
        renderReviews();
        renderMaps();
      }).catch(function (err) {
        before.forEach(function (old) {
          old.row.best_of_week = old.best; old.row.best_selected_at = old.selectedAt;
        });
        savingBest = false;
        renderReviews();
        renderMaps();
        PL.toast('BEST 표시를 저장하지 못했습니다: ' + (err.message || '네트워크 오류'), 'error');
      });
    });
  }

  attachBestToggle(els.reviewEntries, 'reviews');
  attachBestToggle(els.mapEntries, 'maps');

  // 관리자 버튼: 관리자 화면에서는 '관리자 나가기'로 바뀐다.
  var adminLink = document.querySelector('[data-best-admin-link]');
  if (adminLink && BEST_ADMIN_MODE) { adminLink.textContent = '관리자 나가기'; adminLink.href = 'index.html'; adminLink.classList.add('is-admin'); }

  function start() {
    if (!BEST_ADMIN_MODE) { boot(); return; }
    PL.activateBestAdmin().catch(function (err) {
      PL.toast('Best Review 관리자 인증을 완료하지 못했습니다: ' + (err.message || '확인 실패'), 'error');
    }).then(boot);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

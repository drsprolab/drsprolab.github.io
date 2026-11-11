/* LO_Review — 관리자용 주차별 Conceptual Map PDF 내보내기
 * PDF 변환은 관리자 브라우저 안에서 처리하며 제출 데이터를 외부 서비스로 보내지 않습니다.
 */
(function () {
  'use strict';

  var PL = window.PL;
  var CDN = {
    html2canvas: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      integrity: 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H'
    },
    jspdf: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.0.0/jspdf.umd.min.js',
      integrity: 'sha384-O5lMb4MDjtn5zz9DSqizqf3JK5ne6jnTbRh523aaJiE4fpejSlmaEaksvdfbbCiC'
    }
  };
  var loaders = {};
  var busy = false;
  var currentRows = [];
  var currentAdminMode = false;

  function esc(value) { return PL.esc(value === null || value === undefined ? '' : value); }

  function groupsByWeek(rows) {
    var groups = {};
    (rows || []).forEach(function (row) {
      var key = String(row.week_key || '');
      (groups[key] = groups[key] || []).push(row);
    });
    return Object.keys(groups).sort(function (a, b) { return b.localeCompare(a); }).map(function (key) {
      return {
        key: key,
        rows: groups[key].sort(function (a, b) {
          return String(a.student || '').localeCompare(String(b.student || ''), 'ko');
        })
      };
    });
  }

  function loadScript(name, asset) {
    if (name === 'html2canvas' && window.html2canvas) return Promise.resolve();
    if (name === 'jspdf' && window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if (loaders[name]) return loaders[name];

    loaders[name] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = asset.src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.integrity = asset.integrity;
      script.onload = resolve;
      script.onerror = function () {
        delete loaders[name];
        reject(new Error('PDF 변환 도구를 불러오지 못했습니다. 인터넷 연결 후 다시 시도해 주세요.'));
      };
      document.head.appendChild(script);
    });
    return loaders[name];
  }

  function loadPdfTools() {
    return loadScript('html2canvas', CDN.html2canvas).then(function () {
      return loadScript('jspdf', CDN.jspdf);
    }).then(function () {
      if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('PDF 변환 도구가 준비되지 않았습니다. 페이지를 새로고침하고 다시 시도해 주세요.');
      }
    });
  }

  function waitForImages(root) {
    return Promise.all(Array.prototype.slice.call(root.querySelectorAll('img')).map(function (img) {
      if (img.complete) {
        return img.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error('도식 이미지를 불러오지 못했습니다. Drive 링크 공유 설정을 확인해 주세요.'));
      }
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          reject(new Error('도식 이미지 로딩 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'));
        }, 30000);
        img.addEventListener('load', function () { clearTimeout(timer); resolve(); }, { once: true });
        img.addEventListener('error', function () {
          clearTimeout(timer);
          reject(new Error('도식 이미지를 불러오지 못했습니다. Drive 링크 공유 설정을 확인해 주세요.'));
        }, { once: true });
      });
    }));
  }

  function entryHtml(row, index) {
    var theory = window.MD ? window.MD.render(row.cm_theory || '') : '<p>' + esc(row.cm_theory || '') + '</p>';
    var explanation = window.MD ? window.MD.render(row.cm_explanation || '') : '<p>' + esc(row.cm_explanation || '') + '</p>';
    var diagram = String(row.cm_diagram_ref || '').trim();
    var diagramBlock = diagram
      ? '<figure class="pdf-diagram"><img crossorigin="anonymous" src="' + esc(PL.fileUrl('concept-maps', diagram)) + '" alt="' + esc(row.cm_diagram_name || '제출 도식') + '">' +
          (row.cm_diagram_name ? '<figcaption>' + esc(row.cm_diagram_name) + '</figcaption>' : '') + '</figure>'
      : '<p class="pdf-empty">도식 이미지가 제출되지 않았습니다.</p>';

    return '<article class="pdf-entry">' +
      '<div class="pdf-entry-kicker">CONCEPTUAL MAP · ' + String(index + 1).padStart(2, '0') + '</div>' +
      '<h2>' + esc(row.student || '이름 없음') + '</h2>' +
      '<p class="pdf-meta">' + esc(PL.weekLabel(row.week_key)) + ' · 제출일 ' + esc(PL.fmtDate(row.submitted_at) || '–') + '</p>' +
      '<section><h3>1. 중점적으로 보는 이론과 개념</h3><div class="pdf-body">' + (theory || '<p>작성되지 않았습니다.</p>') + '</div></section>' +
      '<section><h3>2. 도식화</h3>' + diagramBlock + '</section>' +
      '<section><h3>3. Conceptual Map 설명</h3><div class="pdf-body">' + (explanation || '<p>작성되지 않았습니다.</p>') + '</div></section>' +
    '</article>';
  }

  function makeStage(week, rows) {
    var stage = document.createElement('div');
    stage.className = 'admin-pdf-stage';
    stage.innerHTML = '<style>' +
      '.admin-pdf-stage{position:absolute;left:-10000px;top:0;width:794px;background:#fff;color:#192331;font-family:"IBM Plex Sans KR",Arial,sans-serif;font-size:16px;line-height:1.65}' +
      '.pdf-entry{box-sizing:border-box;width:794px;padding:42px 48px;background:#fff;color:#192331}' +
      '.pdf-entry-kicker{margin:0 0 7px;color:#667587;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.08em}' +
      '.pdf-entry h2{margin:0;font-size:25px;line-height:1.35;color:#16202b}' +
      '.pdf-meta{margin:7px 0 23px;color:#667587;font-size:13px}' +
      '.pdf-entry section{margin:20px 0 0;padding-top:15px;border-top:1px solid #dce2e8}' +
      '.pdf-entry h3{margin:0 0 9px;font-size:16px;line-height:1.45;color:#1d4f86}' +
      '.pdf-body{overflow-wrap:anywhere;word-break:keep-all}' +
      '.pdf-body p{margin:0 0 9px}.pdf-body h1,.pdf-body h2,.pdf-body h3,.pdf-body h4{margin:12px 0 7px;font-size:16px}' +
      '.pdf-body ul,.pdf-body ol{margin:0 0 10px;padding-left:24px}.pdf-body blockquote{margin:10px 0;padding:5px 12px;border-left:3px solid #9eafbf;color:#566577}' +
      '.pdf-diagram{margin:8px 0 0;text-align:center}.pdf-diagram img{display:block;max-width:100%;max-height:780px;margin:0 auto;object-fit:contain}.pdf-diagram figcaption{margin-top:6px;color:#667587;font-size:12px}' +
      '.pdf-empty{margin:0;color:#667587;font-size:13px}' +
      '</style>' + rows.map(entryHtml).join('');
    document.body.appendChild(stage);
    return stage;
  }

  function addCanvasPages(pdf, canvas, isFirst, margin) {
    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    var contentW = pageW - margin * 2;
    var contentH = pageH - margin * 2;
    var pxPerMm = canvas.width / contentW;
    var sliceHeight = Math.max(1, Math.floor(contentH * pxPerMm));
    var y = 0;
    var first = isFirst;

    while (y < canvas.height) {
      if (!first) pdf.addPage();
      first = false;
      var h = Math.min(sliceHeight, canvas.height - y);
      var page = document.createElement('canvas');
      page.width = canvas.width;
      page.height = h;
      page.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      pdf.addImage(page.toDataURL('image/jpeg', 0.94), 'JPEG', margin, margin, contentW, h / pxPerMm, undefined, 'FAST');
      y += h;
    }
    return first;
  }

  function saveWeekPdf(week, rows) {
    var stage = makeStage(week, rows);
    var Pdf = window.jspdf.jsPDF;
    var pdf = new Pdf({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    var margin = 12;
    var chain = Promise.resolve(true);

    if (document.fonts && document.fonts.ready) chain = chain.then(function (ready) { return document.fonts.ready.then(function () { return ready; }); });
    chain = chain.then(function (firstPage) { return waitForImages(stage).then(function () { return firstPage; }); });
    rows.forEach(function (row, index) {
      var entry = stage.querySelectorAll('.pdf-entry')[index];
      chain = chain.then(function (firstPage) {
        return window.html2canvas(entry, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0
        }).then(function (canvas) {
          var nextFirst;
          try { nextFirst = addCanvasPages(pdf, canvas, firstPage, margin); }
          catch (err) { throw new Error('PDF 이미지 변환에 실패했습니다. 도식 이미지의 CORS/공유 권한을 확인해 주세요.'); }
          canvas.width = 0; canvas.height = 0;
          return nextFirst;
        });
      });
    });

    return chain.then(function () {
      var key = String(week || '주차없음').replace(/[^0-9A-Za-z가-힣_-]+/g, '-');
      pdf.save('LO_Review_' + key + '_ConceptualMap.pdf');
    }).finally(function () {
      stage.remove();
    });
  }

  function renderAdminMapPdf(panel, buttons, rows, adminMode) {
    if (!panel || !buttons) return;
    currentRows = rows || [];
    currentAdminMode = !!adminMode;
    if (!adminMode || !PL.isBestAdmin()) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    var groups = groupsByWeek(rows);
    buttons.innerHTML = groups.length ? groups.map(function (group) {
      var label = group.key ? PL.weekShort(group.key) : '주차 미지정';
      return '<button type="button" class="btn btn-primary" data-map-pdf-week="' + esc(group.key) + '" aria-label="' + esc(label) + ' 제출물 전체 PDF 다운로드">' +
        esc(label) + ' PDF 다운로드 · ' + group.rows.length + '건</button>';
    }).join('') : '<p class="admin-pdf-empty">아직 제출된 Conceptual Map이 없습니다.</p>';

    if (!buttons.dataset.bound) {
      buttons.dataset.bound = 'true';
      panel.addEventListener('click', function (event) {
        var button = event.target.closest('[data-map-pdf-week]');
        if (!button || !buttons.contains(button) || busy) return;
        if (!currentAdminMode || !PL.isBestAdmin()) {
          PL.toast('관리자 인증이 필요합니다.', 'err');
          return;
        }
        var week = button.getAttribute('data-map-pdf-week');
        var selected = currentRows.filter(function (row) { return String(row.week_key || '') === String(week || ''); });
        if (!selected.length) {
          PL.toast('해당 주차 제출물이 없습니다.', 'err');
          return;
        }
        busy = true;
        var status = document.getElementById('mapPdfStatus');
        var label = button.textContent;
        button.disabled = true;
        button.textContent = 'PDF 만드는 중…';
        if (status) status.textContent = '제출물 ' + selected.length + '건을 PDF로 묶고 있습니다. 이 창을 닫지 마세요.';
        loadPdfTools().then(function () {
          return saveWeekPdf(week, selected);
        }).then(function () {
          PL.toast(PL.weekShort(week) + ' PDF를 저장했습니다.', 'ok');
          if (status) status.textContent = PL.weekShort(week) + ' PDF 저장을 마쳤습니다.';
        }).catch(function (err) {
          PL.toast(err.message || 'PDF를 만들지 못했습니다.', 'err');
          if (status) status.textContent = err.message || 'PDF를 만들지 못했습니다.';
        }).finally(function () {
          busy = false;
          button.disabled = false;
          button.textContent = label;
        });
      });
    }
  }

  PL.renderAdminMapPdf = renderAdminMapPdf;
})();

// 네 진단에서 공통으로 사용하는 결과 탭 PDF 저장. 응답은 브라우저 안에서만 처리한다.
(function () {
  'use strict';
  var script = document.currentScript;
  var assetBase = new URL('.', script.src).href;
  var libraries;
  var WIDTH = 720, PAGE_HEIGHT = 1060, SCALE = 2;

  function load(name, ready) {
    if (ready()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      var timer = setTimeout(function () { el.remove(); reject(new Error('PDF 도구를 불러오지 못했습니다.')); }, 20000);
      el.src = assetBase + 'pdf-libs/' + name;
      el.onload = function () { clearTimeout(timer); ready() ? resolve() : reject(new Error('PDF 도구를 시작하지 못했습니다.')); };
      el.onerror = function () { clearTimeout(timer); el.remove(); reject(new Error('PDF 도구를 불러오지 못했습니다.')); };
      document.head.appendChild(el);
    });
  }
  function tools() {
    if (!libraries) libraries = Promise.all([
      load('html2canvas-1.4.1.min.js', function () { return !!window.html2canvas; }),
      load('jspdf-2.5.1.umd.min.js', function () { return !!(window.jspdf && window.jspdf.jsPDF); })
    ]).catch(function (err) { libraries = null; throw err; });
    return libraries;
  }
  function toolbar() {
    return '<div class="aidx-dl diagnosis-pdf-toolbar"><button type="button" class="aidx-btn primary" data-act="pdf">PDF 저장하기</button>' +
      '<span class="aidx-small">현재 선택한 결과 탭을 PDF로 저장합니다.</span>' +
      '<span class="aidx-err diagnosis-pdf-status" role="status"></span></div>';
  }
  function text(parent, tag, value, className) {
    var el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  }
  function snapshot(root, title, code) {
    var panel = root.querySelector('[role="tabpanel"]');
    if (!panel) throw new Error('먼저 진단 결과를 열어 주세요.');
    var selected = root.querySelector('[role="tab"][aria-selected="true"] .aidx-tl');
    var tab = selected ? selected.textContent : '진단 결과';
    var host = document.createElement('div');
    host.className = 'diagnosis-pdf-host prose';
    host.setAttribute('aria-hidden', 'true');
    host.inert = true;
    var report = document.createElement('div');
    report.className = root.className + ' diagnosis-pdf-report';
    var header = document.createElement('header');
    header.className = 'diagnosis-pdf-heading';
    text(header, 'p', 'PRO AnalytiX Lab · 진단 결과 보고서', 'diagnosis-pdf-kicker');
    text(header, 'h1', title);
    text(header, 'h2', tab);
    text(header, 'p', new Date().toLocaleDateString('ko-KR') + (code ? ' · 결과 코드 ' + code : ''), 'diagnosis-pdf-meta');
    report.appendChild(header);
    // 복사본을 즉시 만들어 저장 도중 다른 탭으로 이동해도 결과가 섞이지 않게 한다.
    var clone = panel.cloneNode(true);
    var sourceSelects = panel.querySelectorAll('select');
    clone.querySelectorAll('select').forEach(function (select, i) {
      var label = document.createElement('span');
      var source = sourceSelects[i];
      label.textContent = source && source.selectedOptions.length ? source.selectedOptions[0].textContent : '';
      select.replaceWith(label);
    });
    clone.querySelectorAll('button, script, [hidden], .aidx-dl').forEach(function (el) { el.remove(); });
    clone.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
    // 두 열의 패널을 한 열로 정리해 A4에서 표와 차트를 읽을 수 있게 한다.
    clone.querySelectorAll('.report-grid').forEach(function (grid) { grid.replaceWith.apply(grid, Array.from(grid.children)); });
    while (clone.firstChild) report.appendChild(clone.firstChild);
    var foot = root.querySelector('.report-foot');
    if (foot) {
      foot = foot.cloneNode(true);
      foot.querySelectorAll('button').forEach(function (el) { el.remove(); });
      var tail = document.createElement('div');
      tail.className = 'diagnosis-pdf-tail';
      if (report.lastElementChild !== header) tail.appendChild(report.lastElementChild);
      tail.appendChild(foot);
      report.appendChild(tail);
    }
    host.appendChild(report);
    document.body.appendChild(host);
    return { host: host, report: report, tab: tab };
  }

  // html2canvas 1.4가 해석하지 못하는 color-mix()/color()를 브라우저로 RGB 변환한다.
  function normalizeColors(host) {
    var context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    var cache = {};
    function rgb(value) {
      if (!/color\(|color-mix\(|oklch\(|oklab\(|lab\(|lch\(/.test(value)) return value;
      if (!cache[value]) {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        var c = context.getImageData(0, 0, 1, 1).data;
        cache[value] = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (c[3] / 255) + ')';
      }
      return cache[value];
    }
    host.querySelectorAll('*').forEach(function (el) {
      var style = getComputedStyle(el);
      ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'fill', 'stroke'].forEach(function (prop) {
        var value = style.getPropertyValue(prop);
        if (value && value !== 'none') el.style.setProperty(prop, rgb(value));
      });
    });
  }
  function charts(host) {
    return Promise.all(Array.from(host.querySelectorAll('svg')).map(function (svg) {
      var copy = svg.cloneNode(true);
      var originals = [svg].concat(Array.from(svg.querySelectorAll('*')));
      var copies = [copy].concat(Array.from(copy.querySelectorAll('*')));
      originals.forEach(function (el, i) {
        var style = getComputedStyle(el);
        ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline'].forEach(function (prop) {
          copies[i].style.setProperty(prop, style.getPropertyValue(prop));
        });
      });
      var bounds = svg.getBoundingClientRect();
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      copy.setAttribute('width', Math.ceil(bounds.width));
      copy.setAttribute('height', Math.ceil(bounds.height));
      var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' }));
      return new Promise(function (resolve, reject) {
        var image = new Image();
        image.onload = function () {
          var canvas = document.createElement('canvas');
          canvas.width = Math.ceil(bounds.width * SCALE); canvas.height = Math.ceil(bounds.height * SCALE);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          var replacement = new Image();
          replacement.width = Math.ceil(bounds.width); replacement.height = Math.ceil(bounds.height);
          replacement.alt = svg.getAttribute('aria-label') || '진단 결과 차트';
          replacement.src = canvas.toDataURL('image/png');
          replacement.style.cssText = 'display:block;max-width:100%;height:auto';
          svg.replaceWith(replacement);
          URL.revokeObjectURL(url);
          replacement.decode().then(resolve, reject);
        };
        image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('결과 차트를 변환하지 못했습니다.')); };
        image.src = url;
      });
    }));
  }
  // 줄·표 행·그림을 자르지 않도록 쪽 경계에 걸치는 요소의 위쪽에서 나눈다.
  function protectedRanges(block) {
    var base = block.getBoundingClientRect().top, ranges = [];
    var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      var range = document.createRange(); range.selectNodeContents(walker.currentNode);
      Array.from(range.getClientRects()).forEach(function (rect) { ranges.push([rect.top - base - 1, rect.bottom - base + 1]); });
    }
    block.querySelectorAll('img, tr, h2, h3, h4, .aidx-plan-top, .aidx-plan-card, .aidx-prio-card, .aidx-swcard, .aidx-cmpbox').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.height < PAGE_HEIGHT - 100) ranges.push([rect.top - base - 2, rect.bottom - base + (/^H/.test(el.tagName) ? 35 : 2)]);
    });
    // 마지막 안내 문구만 별도 페이지에 남지 않도록 마지막 권고 카드와 묶는다.
    var foot = block.querySelector('.report-foot');
    var cards = block.querySelectorAll('.aidx-plan-card, .aidx-prio-card');
    if (foot && cards.length) {
      var last = cards[cards.length - 1].getBoundingClientRect();
      var bottom = foot.getBoundingClientRect().bottom;
      if (bottom - last.top < PAGE_HEIGHT - 40) ranges.push([last.top - base - 2, bottom - base + 1]);
    }
    return ranges;
  }
  function safeEnd(start, desired, ranges) {
    var end = desired, changed = true;
    while (changed) {
      changed = false;
      ranges.forEach(function (range) {
        if (range[0] < end && end < range[1]) {
          var next = Math.max(start, Math.floor(range[0]));
          if (next < end) { end = next; changed = true; }
        }
      });
    }
    return Math.floor(end);
  }
  async function renderPdf(snapshot, filename) {
    var pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    pdf.setProperties({ title: filename.replace(/\.pdf$/, ''), author: 'PRO AnalytiX Lab' });
    var cursor = 0, blocks = Array.from(snapshot.report.children);
    function nextPage() { pdf.addPage(); cursor = 0; }
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i], height = Math.ceil(block.getBoundingClientRect().height);
      if (!height) continue;
      var ranges = protectedRanges(block);
      var canvas = await window.html2canvas(block, { scale: SCALE, backgroundColor: '#ffffff', logging: false, windowWidth: 1200, scrollX: 0, scrollY: 0 });
      var offset = 0;
      if (height <= PAGE_HEIGHT && cursor + height > PAGE_HEIGHT) nextPage();
      while (offset < height) {
        var remaining = PAGE_HEIGHT - cursor;
        if (remaining < 90) { nextPage(); remaining = PAGE_HEIGHT; }
        var end = Math.min(height, offset + remaining);
        if (end < height) end = safeEnd(offset, end, ranges);
        if (end <= offset) {
          if (cursor) { nextPage(); continue; }
          end = Math.min(height, offset + PAGE_HEIGHT);
        }
        var from = Math.round(offset * canvas.height / height), to = Math.round(end * canvas.height / height);
        var slice = document.createElement('canvas');
        slice.width = canvas.width; slice.height = to - from;
        slice.getContext('2d').drawImage(canvas, 0, from, canvas.width, to - from, 0, 0, slice.width, slice.height);
        pdf.addImage(slice.toDataURL('image/jpeg', .94), 'JPEG', 15, 15 + cursor * 180 / WIDTH, 180, (end - offset) * 180 / WIDTH);
        cursor += end - offset;
        offset = end;
        slice.width = slice.height = 0;
        if (offset < height) nextPage();
      }
      cursor += 14;
      canvas.width = canvas.height = 0;
    }
    var count = pdf.getNumberOfPages();
    for (var page = 1; page <= count; page++) {
      pdf.setPage(page); pdf.setFontSize(9); pdf.setTextColor(95);
      pdf.text('PRO AnalytiX Lab', 15, 289);
      pdf.text(page + ' / ' + count, 195, 289, { align: 'right' });
    }
    await pdf.save(filename, { returnPromise: true });
  }
  async function save(options) {
    var root = options.root, button = options.button;
    if (root.dataset.pdfBusy) return;
    root.dataset.pdfBusy = 'true'; button.disabled = true; button.setAttribute('aria-busy', 'true');
    var status = root.querySelector('.diagnosis-pdf-status'), saved;
    status.textContent = 'PDF를 만드는 중…';
    try {
      saved = snapshot(root, options.title, options.code);
      await tools();
      if (document.fonts) await document.fonts.ready;
      normalizeColors(saved.host);
      await charts(saved.host);
      var filename = options.title + '_' + saved.tab + '_' + new Date().toLocaleDateString('sv-SE') + '.pdf';
      await renderPdf(saved, filename.replace(/[\\/:*?"<>|]/g, '_'));
      status.textContent = 'PDF 파일을 저장했습니다.';
    } catch (err) {
      status.textContent = 'PDF를 저장하지 못했습니다. 다시 눌러 주세요.';
      console.error('Diagnosis PDF:', err);
    } finally {
      if (saved) saved.host.remove();
      delete root.dataset.pdfBusy; button.disabled = false; button.removeAttribute('aria-busy');
    }
  }
  window.DiagnosisPdf = { toolbar: toolbar, save: save };
})();

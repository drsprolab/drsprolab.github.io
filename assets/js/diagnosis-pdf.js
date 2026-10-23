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
  // 결과지 글꼴: 제목·표는 Pretendard, 본문은 Noto Serif KR. PDF를 만들 때만 불러온다.
  var FONT_CSS = ['https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css',
    'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap'];
  var fontsReady;
  function fonts() {
    if (!fontsReady) fontsReady = Promise.all(FONT_CSS.map(function (href) {
      if (document.querySelector('link[href="' + href + '"]')) return Promise.resolve();
      return new Promise(function (resolve) {
        var link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
        link.onload = link.onerror = function () { resolve(); };
        document.head.appendChild(link);
      });
    })).then(function () {
      if (!document.fonts) return;
      var t = setTimeout.bind(window);
      return Promise.race([Promise.all(['400 15px Pretendard', '700 15px Pretendard', '600 15px Pretendard', '400 15px "Noto Serif KR"', '600 15px "Noto Serif KR"']
        .map(function (f) { return document.fonts.load(f, '가나다 ABC 123'); })), new Promise(function (r) { t(r, 8000); })]);
    }).catch(function () { /* 글꼴을 못 불러오면 기본 글꼴로 만든다 */ });
    return fontsReady;
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
  function cleanText(node) {
    return (typeof node === 'string' ? node : node.textContent)
      .replace(/\p{Extended_Pictographic}|[\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim();
  }
  function paragraph(parent, value, level) {
    if (!value) return;
    return text(parent, 'p', value, 'dr-paragraph dr-' + (level || 'circle'));
  }
  // 결과 화면의 계산값·해석을 가져와 의견서의 문단·표·그림 구조로 다시 편집한다.
  function reportContent(parent, source, counters, depth) {
    if (source.nodeType === Node.TEXT_NODE) {
      var value = cleanText(source);
      if (value) paragraph(parent, value, depth > 1 ? 'dash' : 'circle');
      return;
    }
    if (source.nodeType !== Node.ELEMENT_NODE) return;
    if (source.matches('button, script, [hidden], [data-report-control], .aidx-icon, .aidx-tags, .aidx-dl')) return;
    if (source.matches('[data-report-domain-summary]')) {
      var domains = document.createElement('table'); domains.className = 'dr-table';
      var domainHead = domains.createTHead().insertRow();
      ['기술 영역', '교육 구분', 'Borich', '중요도 · 수행 · 차이 · n', '교육 주제'].forEach(function (label) { var th = document.createElement('th'); th.textContent = label; domainHead.appendChild(th); });
      var domainBody = domains.createTBody();
      source.querySelectorAll('.agn-domain-card').forEach(function (card) {
        var row = domainBody.insertRow();
        ['.panel-title', '.agn-module', '.agn-domain-score strong', '.agn-domain-metrics', '.agn-course'].forEach(function (selector) { var cell = card.querySelector(selector); row.insertCell().textContent = cell ? cleanText(cell) : '분석 대기'; });
      });
      addTable(parent, domains, '7개 기술 영역과 교육과정 설계 요약', counters); return;
    }
    if (source.matches('.kpis')) {
      var table = document.createElement('table'); table.className = 'dr-table';
      var head = table.createTHead().insertRow();
      ['항목', '진단 결과', '해석 및 비교'].forEach(function (label) { var th = document.createElement('th'); th.textContent = label; head.appendChild(th); });
      var body = table.createTBody();
      source.querySelectorAll('.kpi').forEach(function (kpi) {
        var row = body.insertRow();
        ['.kpi-k', '.kpi-v', '.kpi-s'].forEach(function (selector) {
          var value = kpi.querySelector(selector); row.insertCell().textContent = value ? cleanText(value) : '-';
        });
      });
      addTable(parent, table, '핵심 진단 결과', counters);
      return;
    }
    if (source.matches('dl')) {
      var table = document.createElement('table'); table.className = 'dr-table dr-definition-table';
      source.querySelectorAll('dt').forEach(function (dt) {
        var row = table.insertRow(); row.insertCell().textContent = cleanText(dt);
        row.insertCell().textContent = Array.from(dt.parentElement.querySelectorAll('dd')).map(cleanText).join(' / ');
      });
      addTable(parent, table, '진단 결과 해석', counters);
      return;
    }
    if (source.matches('table')) {
      var table = source.cloneNode(true);
      [table].concat(Array.from(table.querySelectorAll('*'))).forEach(function (el) {
        el.removeAttribute('style'); el.removeAttribute('class'); el.removeAttribute('id');
      });
      table.className = 'dr-table';
      var panelTitle = source.closest('.panel');
      panelTitle = panelTitle && panelTitle.querySelector('.panel-title');
      addTable(parent, table, panelTitle ? cleanText(panelTitle) : '분석 결과', counters);
      return;
    }
    if (source.matches('.radar-box, .axr-stairs-box, .aidx-rank, .aidx-hbars, .aidx-stack, .aidx-gbars, .axr-dist, .axr-div, .axr-diffs, .aidx-school-bars, svg')) {
      var figure = document.createElement('figure'); figure.className = 'dr-figure';
      var graph = source.cloneNode(true);
      graph.querySelectorAll('.axr-sicon').forEach(function (el) { el.remove(); });
      figure.appendChild(graph);
      var title = source.closest('.panel'); title = title && title.querySelector('.panel-title');
      var svg = source.matches('svg') ? source : source.querySelector('svg');
      if (svg) figure.classList.add('dr-plot');
      text(figure, 'figcaption', '[그림 ' + (++counters.figures) + '] ' + (title ? cleanText(title) : (svg && svg.getAttribute('aria-label')) || '진단 결과 비교'));
      parent.appendChild(figure); return;
    }
    if (source.matches('.legend')) { var legend = source.cloneNode(true); legend.classList.add('dr-legend'); parent.appendChild(legend); return; }
    if (source.matches('h2, h3, h4')) {
      text(parent, 'h3', (++counters.subsections) + '. ' + cleanText(source), 'dr-subtitle'); return;
    }
    if (source.matches('.aidx-switem')) {
      var item = document.createElement('div'); item.className = 'dr-item'; parent.appendChild(item);
      var label = source.querySelector('strong');
      if (label) paragraph(item, cleanText(label), 'circle');
      source.querySelectorAll('p').forEach(function (p) { paragraph(item, cleanText(p), label ? 'dash' : 'circle'); });
      return;
    }
    if (source.matches('p')) {
      var level = source.matches('.aidx-plan-h, .aidx-swh') ? 'square' : source.matches('.panel-sub, .aidx-eyebrow, .aidx-small') ? 'note' : 'circle';
      paragraph(parent, cleanText(source), level); return;
    }
    if (source.matches('strong, b, em, span, small') && !source.querySelector('p, div, ul, ol, table, svg')) {
      paragraph(parent, cleanText(source), depth > 1 ? 'dash' : 'circle'); return;
    }
    if (source.matches('li')) {
      var group = document.createElement('div'); group.className = 'dr-item';
      parent.appendChild(group);
      if (!source.querySelector('p, ul, ol, h2, h3, h4')) { paragraph(group, cleanText(source), depth > 1 ? 'dash' : 'circle'); return; }
      Array.from(source.childNodes).forEach(function (child) { reportContent(group, child, counters, depth); });
      return;
    }
    var deeper = source.matches('ul, ol') ? depth + 1 : depth;
    Array.from(source.childNodes).forEach(function (child) { reportContent(parent, child, counters, deeper); });
  }
  function addTable(parent, table, label, counters) {
    var group = document.createElement('div'); group.className = 'dr-table-block';
    text(group, 'p', '<표 ' + (++counters.tables) + '> ' + label, 'dr-caption');
    group.appendChild(table); parent.appendChild(group);
  }
  function snapshot(root, title, code) {
    var panel = root.querySelector('[role="tabpanel"]');
    if (!panel) throw new Error('먼저 진단 결과를 열어 주세요.');
    var selected = root.querySelector('[role="tab"][aria-selected="true"] .aidx-tl');
    var tab = selected ? selected.textContent : '진단 결과';
    var host = document.createElement('div');
    host.className = 'diagnosis-pdf-host prose'; host.setAttribute('aria-hidden', 'true'); host.inert = true;
    var report = document.createElement('div'); report.className = root.className + ' diagnosis-pdf-report';
    var header = document.createElement('header'); header.className = 'diagnosis-pdf-heading';
    var heading = text(header, 'h1', title + ' 결과 보고서');
    text(heading, 'span', 'BETA', 'dr-beta');
    text(header, 'p', tab + (code ? ' · 결과 코드 ' + code.slice(0, 4) + '-' + code.slice(4) : ''), 'diagnosis-pdf-meta');
    text(header, 'p', new Date().toLocaleDateString('ko-KR'), 'dr-date');
    report.appendChild(header);
    var chapter = 0, counters = { tables: 0, figures: 0, subsections: 0 };
    var numerals = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
    function section(label) {
      var section = document.createElement('section'); section.className = 'dr-section';
      text(section, 'h2', numerals[chapter++] + '. ' + label, 'dr-section-title');
      report.appendChild(section); counters.subsections = 0; return section;
    }
    var overview = section('진단 개요');
    var readiness = /준비/.test(title), school = /학교/.test(title), needs = /요구도/.test(title);
    if (needs) {
      paragraph(overview, '조사 목적: 대학생에게 우선 가르칠 AI·AI Agent 기술을 교육 필요성(중요도)과 현재 수행수준의 차이로 도출함.', 'square');
      paragraph(overview, '조사 구성: 공통 5개 영역 15문항 및 Agent 심화 2개 영역 6문항(조건부), 문항마다 중요도·수행수준 5점 척도.', 'square');
      paragraph(overview, '분석 범위: ' + tab + '. Borich 요구도, IPA, Locus for Focus로 우선순위를 판단함.', 'square');
    } else {
    paragraph(overview, '진단 목적: ' + (readiness ? (school ? '우리 학교의 AI 전환 준비 수준과 인식 차이를 진단하고, 발전 과제를 도출함.' : '우리 회사의 AX 준비 수준과 구성원 간 인식 차이를 진단하고, 실행 과제를 도출함.') : 'AI 활용 과정에서의 실천과 태도를 진단하고, 강점·보완점과 행동 과제를 도출함.'), 'square');
    paragraph(overview, '진단 구성: ' + (readiness ? '5단계 준비도 30문항 및 전반 인식 2문항, 총 32문항.' : '실천 5개 영역 25문항 및 태도 6문항, 총 31문항.'), 'square');
    paragraph(overview, '분석 범위: ' + tab + '. 점수는 자기 보고 응답을 바탕으로 산출함.', 'square');
    paragraph(overview, '점수 산출: (문항 평균 − 1) × 25, 0~100점.' + (readiness ? ' “잘 모르겠다” 응답은 평균에서 제외함.' : ''), 'square');
    }
    var clone = panel.cloneNode(true), selects = panel.querySelectorAll('select');
    clone.querySelectorAll('select').forEach(function (el, i) {
      var value = document.createElement('span'); value.textContent = selects[i].selectedOptions[0] ? selects[i].selectedOptions[0].textContent : ''; el.replaceWith(value);
    });
    clone.querySelectorAll('button, script, [hidden], .aidx-dl').forEach(function (el) { el.remove(); });
    clone.querySelectorAll('.report-grid').forEach(function (grid) { grid.replaceWith.apply(grid, Array.from(grid.children)); });
    var groups = { summary: [], details: [], advice: [] };
    Array.from(clone.children).forEach(function (node) {
      if (node.matches('.aidx-context, .aidx-note')) { paragraph(overview, cleanText(node), 'circle'); return; }
      var group = node.matches('.aidx-plan') ? 'advice' : node.matches('.aidx-type, .kpis, .aidx-insight') ? 'summary' : 'details';
      groups[group].push(node);
    });
    [['summary', '종합 결과'], ['details', '세부 분석'], ['advice', '행동 제언']].forEach(function (group) {
      if (!groups[group[0]].length) return;
      var target = section(group[1]);
      groups[group[0]].forEach(function (node) { reportContent(target, node, counters, 0); });
    });
    var foot = root.querySelector('.report-foot');
    if (foot) {
      var note = document.createElement('div'); note.className = 'dr-report-note';
      foot = foot.cloneNode(true); foot.querySelectorAll('button').forEach(function (el) { el.remove(); });
      text(note, 'p', '※ ' + cleanText(foot));
      text(note, 'p', '※ PRO AnalytiX Lab · 한양대학교 교육공학과');
      report.lastElementChild.appendChild(note);
    }
    host.appendChild(report); document.body.appendChild(host);
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
    block.querySelectorAll('img, tr, h2, h3, h4, .aidx-plan-top, .aidx-plan-card, .aidx-prio-card, .aidx-swcard, .aidx-cmpbox, .dr-item, .dr-figure, .dr-table-block, .dr-subtitle').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var after = el.matches('.dr-section-title') ? 120 : /^H/.test(el.tagName) ? 55 : 2;
      if (rect.height < PAGE_HEIGHT - 100) ranges.push([rect.top - base - 2, rect.bottom - base + after]);
    });
    // 마지막 안내 문구만 별도 페이지에 남지 않도록 마지막 권고 카드와 묶는다.
    var foot = block.querySelector('.report-foot, .dr-report-note');
    var cards = block.querySelectorAll('.aidx-plan-card, .aidx-prio-card, .dr-item');
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
      if (!block.classList.contains('dr-section') && height <= PAGE_HEIGHT && cursor + height > PAGE_HEIGHT) nextPage();
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
      pdf.text('- ' + page + ' -', 105, 289, { align: 'center' });
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
      await Promise.all([tools(), fonts()]);
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

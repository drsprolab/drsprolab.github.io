// Research help PDF 저장. 문단을 A4 페이지 상자에 직접 배치해 긴 글은 줄 단위로 다음 장에 이어 쓰고,
// 사이트 글꼴로 그린 페이지를 이미지로 담아 한글이 깨지지 않게 한다. 라이브러리는 PDF를 만들 때만 불러온다.
(function () {
  'use strict';
  var script = document.currentScript;
  var assetBase = new URL('.', script.src).href;
  var PAGE_W = 794, PAGE_H = 1123, PAD = 64, SCALE = 2;
  var libraries;

  function load(name, ready) {
    if (ready()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      var timer = setTimeout(function () { tag.remove(); reject(new Error('PDF 도구를 불러오지 못했습니다.')); }, 20000);
      tag.src = assetBase + 'pdf-libs/' + name;
      tag.onload = function () { clearTimeout(timer); ready() ? resolve() : reject(new Error('PDF 도구를 시작하지 못했습니다.')); };
      tag.onerror = function () { clearTimeout(timer); tag.remove(); reject(new Error('PDF 도구를 불러오지 못했습니다.')); };
      document.head.appendChild(tag);
    });
  }
  // 의견서 글꼴: 제목은 Pretendard, 본문은 Noto Serif KR. PDF를 만들 때만 불러온다.
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
      return Promise.race([Promise.all(['700 25px Pretendard', '400 14px "Noto Serif KR"'].map(function (f) { return document.fonts.load(f, '가나다 ABC'); })),
        new Promise(function (r) { setTimeout(r, 8000); })]);
    }).catch(function () { /* 글꼴을 못 불러오면 기본 글꼴로 만든다 */ });
    return fontsReady;
  }
  function tools() {
    if (!libraries) libraries = Promise.all([
      load('html2canvas-1.4.1.min.js', function () { return !!window.html2canvas; }),
      load('jspdf-2.5.1.umd.min.js', function () { return !!(window.jspdf && window.jspdf.jsPDF); })
    ]).catch(function (err) { libraries = null; throw err; });
    return libraries;
  }

  function newPage(host, pages) {
    var page = document.createElement('div');
    page.className = 'rhp-page';
    var body = document.createElement('div');
    body.className = 'rhp-body';
    var foot = document.createElement('div');
    foot.className = 'rhp-foot';
    page.appendChild(body);
    page.appendChild(foot);
    host.appendChild(page);
    pages.push(page);
    return body;
  }
  function fits(body) {
    return body.scrollHeight <= body.clientHeight + 0.5;
  }
  function block(tag, cls, text) {
    var node = document.createElement(tag);
    node.className = cls;
    node.textContent = text;
    return node;
  }

  // doc: { title, subtitle, date, blocks: [{ type: 'h2'|'h3'|'p'|'sq'|'ci'|'dash'|'note', text, pageBreak }] } → 화면 밖에 배치한 페이지 요소들
  function layout(doc) {
    var host = document.createElement('div');
    host.className = 'rhp-host';
    document.body.appendChild(host);
    var pages = [];
    var body = newPage(host, pages);
    var head = document.createElement('header');
    head.className = 'rhp-head';
    head.appendChild(block('h1', 'rhp-title', doc.title));
    if (doc.subtitle) head.appendChild(block('p', 'rhp-subtitle', doc.subtitle));
    body.appendChild(head);
    if (doc.date) body.appendChild(block('p', 'rhp-date', doc.date));

    function place(node, keepWithNext) {
      body.appendChild(node);
      // 제목은 다음 문단 첫 줄들과 같은 장에 두도록 여유 공간을 함께 본다.
      if (keepWithNext) node.style.marginBottom = '96px';
      var ok = fits(body);
      if (keepWithNext) node.style.marginBottom = '';
      if (ok) return;
      if (keepWithNext || node.textContent.length < 2 || node.getAttribute('data-atomic')) {
        body.removeChild(node);
        if (body.childNodes.length) { body = newPage(host, pages); place(node, keepWithNext); } else body.appendChild(node);
        return;
      }
      // 넘치는 문단: 이 장에 들어가는 만큼 채우고 나머지를 다음 장으로 넘긴다. 두어 줄도 안 들어가면 통째로 넘긴다.
      var text = node.textContent, lo = 0, hi = text.length;
      while (lo < hi) {
        var mid = Math.ceil((lo + hi) / 2);
        node.textContent = text.slice(0, mid);
        if (fits(body)) lo = mid; else hi = mid - 1;
      }
      var cut = lo, space = text.lastIndexOf(' ', lo), nl = text.lastIndexOf('\n', lo);
      var soft = Math.max(space, nl);
      if (soft > lo * 0.8) cut = soft + 1;
      if (cut < Math.min(80, text.length) && body.childNodes.length > 1) {
        body.removeChild(node);
        node.textContent = text;
        body = newPage(host, pages);
        place(node, false);
        return;
      }
      node.textContent = text.slice(0, cut);
      var rest = node.cloneNode(false);
      rest.textContent = text.slice(cut).replace(/^\s+/, '');
      body = newPage(host, pages);
      if (rest.textContent) place(rest, false);
    }

    doc.blocks.forEach(function (b) {
      if (b.pageBreak && body.childNodes.length) body = newPage(host, pages);
      var tag = b.type === 'h2' ? 'h2' : b.type === 'h3' ? 'h3' : 'p';
      if (b.type === 'sq') { place(block('p', 'rhp-sq', b.text), true); return; }
      if (b.type === 'img') {
        // 연구 모형 그림: 쪽 너비에 맞추고 쪽 높이의 절반을 넘지 않게 줄인다. 크기를 미리 정해 두어 쪽 나눔 계산이 맞게 한다.
        var maxW = PAGE_W - PAD * 2, maxH = Math.round(PAGE_H * 0.5);
        var k = Math.min(1, maxW / (b.width || maxW), maxH / (b.height || maxH));
        var fig = document.createElement('figure');
        fig.className = 'rhp-fig';
        fig.setAttribute('data-atomic', '1');
        var im = document.createElement('img');
        im.src = b.src; im.alt = b.text || '';
        im.style.width = Math.round((b.width || maxW) * k) + 'px';
        im.style.height = Math.round((b.height || maxH) * k) + 'px';
        fig.appendChild(im);
        place(fig, false);
        return;
      }
      if (b.type === 'ref') {
        var ref = document.createElement('p');
        ref.className = 'rhp-ref';
        ref.setAttribute('data-atomic', '1');
        b.parts.forEach(function (part) { ref.appendChild(part.em ? block('em', '', part.text) : document.createTextNode(part.text)); });
        place(ref, false);
        return;
      }
      place(block(tag, 'rhp-' + b.type, b.text || ' '), b.type === 'h2' || b.type === 'h3');
    });
    pages.forEach(function (p, i) { p.lastChild.textContent = '- ' + (i + 1) + ' -'; });
    return { host: host, pages: pages };
  }

  function measure(doc) {
    return Promise.all(doc.blocks.filter(function (b) { return b.type === 'img' && b.src; }).map(function (b) {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () { b.width = im.naturalWidth; b.height = im.naturalHeight; resolve(); };
        im.onerror = function () { b.type = 'note'; b.text = '(연구 모형 그림을 불러오지 못했습니다)'; resolve(); };
        im.src = b.src;
      });
    }));
  }

  function save(doc, filename) {
    return Promise.all([tools(), fonts(), measure(doc)]).then(function () {
      var laid = layout(doc);
      var pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
      var chain = Promise.resolve();
      laid.pages.forEach(function (page, i) {
        chain = chain.then(function () {
          return window.html2canvas(page, { scale: SCALE, backgroundColor: '#ffffff', logging: false, useCORS: true });
        }).then(function (canvas) {
          if (i > 0) pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
        });
      });
      return chain.then(function () {
        laid.host.remove();
        pdf.save(filename);
        return laid.pages.length;
      }, function (err) {
        laid.host.remove();
        throw err;
      });
    });
  }

  var style = document.createElement('style');
  var SANS = 'Pretendard,"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif';
  style.textContent =
    '.rhp-host{position:fixed;left:-20000px;top:0;z-index:-1}' +
    '.rhp-page{width:' + PAGE_W + 'px;height:' + PAGE_H + 'px;padding:' + PAD + 'px ' + PAD + 'px 40px;box-sizing:border-box;background:#fff;color:#111;' +
    'font-family:"Noto Serif KR","AppleMyungjo","Batang",serif;display:flex;flex-direction:column;margin-bottom:16px}' +
    '.rhp-body{flex:1;overflow:hidden;min-height:0}' +
    '.rhp-foot{height:24px;font-family:' + SANS + ';font-size:10.5px;color:#666;text-align:center;padding-top:8px}' +
    '.rhp-head{border-top:3.2px solid #111;padding-top:24px;text-align:center}' +
    '.rhp-title{font-family:' + SANS + ';font-size:25px;font-weight:700;line-height:1.45;color:#222;margin:0 0 12px;word-break:keep-all}' +
    '.rhp-subtitle{font-family:' + SANS + ';font-size:12.5px;color:#444;margin:0;padding-bottom:15px;border-bottom:1px solid #222}' +
    '.rhp-date{margin:10px 0 18px;text-align:right;font-size:12px;color:#444}' +
    '.rhp-h2{font-family:' + SANS + ';font-size:18px;font-weight:700;line-height:1.5;color:#111;margin:20px 0 10px;padding:0 0 7px;border-bottom:1px solid #222}' +
    '.rhp-h3{font-family:' + SANS + ';font-size:14.5px;font-weight:700;line-height:1.6;color:#222;margin:14px 0 4px}' +
    '.rhp-p{font-size:14px;line-height:1.85;margin:0 0 6px;text-indent:1em;text-align:justify;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}' +
    '.rhp-sq{font-size:14px;line-height:1.85;margin:8px 0 2px;padding-left:1.2em;text-indent:-1.2em;font-weight:600}' +
    '.rhp-sq::before{content:"□ "}' +
    '.rhp-fig{margin:10px 0 14px;text-align:center}.rhp-fig img{display:inline-block;max-width:100%}' +
    '.rhp-ci{font-size:14px;line-height:1.85;margin:0 0 3px;padding-left:2.4em;text-indent:-1.2em;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}' +
    '.rhp-ci::before{content:"○ "}' +
    '.rhp-dash{font-size:13.5px;line-height:1.8;margin:0 0 3px;padding-left:3.4em;text-indent:-1em;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}' +
    '.rhp-dash::before{content:"- "}' +
    '.rhp-ref{font-size:13.5px;line-height:1.75;margin:10px 0 2px;padding-left:2em;text-indent:-2em;overflow-wrap:anywhere}' +
    '.rhp-note{font-size:11.5px;line-height:1.65;margin:0 0 5px;padding-left:2.4em;color:#555;white-space:pre-wrap;overflow-wrap:anywhere}';
  document.head.appendChild(style);

  window.ResearchHelpPDF = { layout: layout, save: save };
})();

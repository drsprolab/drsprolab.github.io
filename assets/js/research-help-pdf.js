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

  // doc: { title, meta: [..], blocks: [{ type: 'h2'|'h3'|'p'|'note', text, pageBreak }] } → 화면 밖에 배치한 페이지 요소들
  function layout(doc) {
    var host = document.createElement('div');
    host.className = 'rhp-host';
    document.body.appendChild(host);
    var pages = [];
    var body = newPage(host, pages);
    body.appendChild(block('h1', 'rhp-title', doc.title));
    (doc.meta || []).forEach(function (m) { body.appendChild(block('p', 'rhp-meta', m)); });

    function place(node, keepWithNext) {
      body.appendChild(node);
      // 제목은 다음 문단 첫 줄들과 같은 장에 두도록 여유 공간을 함께 본다.
      if (keepWithNext) node.style.marginBottom = '96px';
      var ok = fits(body);
      if (keepWithNext) node.style.marginBottom = '';
      if (ok) return;
      if (keepWithNext || node.textContent.length < 2) {
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
      place(block(tag, 'rhp-' + b.type, b.text || ' '), b.type === 'h2' || b.type === 'h3');
    });
    pages.forEach(function (p, i) { p.lastChild.textContent = 'PRO AnalytiX Lab · Research help    ' + (i + 1) + ' / ' + pages.length; });
    return { host: host, pages: pages };
  }

  function save(doc, filename) {
    return tools().then(function () {
      return document.fonts && document.fonts.ready;
    }).then(function () {
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
  style.textContent =
    '.rhp-host{position:fixed;left:-20000px;top:0;z-index:-1}' +
    '.rhp-page{width:' + PAGE_W + 'px;height:' + PAGE_H + 'px;padding:' + PAD + 'px ' + PAD + 'px 40px;box-sizing:border-box;background:#fff;color:#16202b;' +
    'font-family:"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;display:flex;flex-direction:column;margin-bottom:16px}' +
    '.rhp-body{flex:1;overflow:hidden;min-height:0}' +
    '.rhp-foot{height:24px;font-size:11px;color:#5a6573;text-align:right;padding-top:8px;border-top:1px solid #dde2e8}' +
    '.rhp-title{font-size:22px;line-height:1.4;margin:0 0 10px;color:#1d4f86}' +
    '.rhp-meta{font-size:12.5px;color:#5a6573;margin:0 0 2px}' +
    '.rhp-h2{font-size:17px;margin:26px 0 8px;padding-bottom:6px;border-bottom:2px solid #1d4f86;color:#1d4f86}' +
    '.rhp-h3{font-size:14.5px;margin:16px 0 4px;color:#16202b}' +
    '.rhp-p{font-size:13px;line-height:1.75;margin:0 0 6px;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}' +
    '.rhp-note{font-size:11.5px;line-height:1.6;margin:0 0 6px;color:#5a6573;white-space:pre-wrap;overflow-wrap:anywhere}';
  document.head.appendChild(style);

  window.ResearchHelpPDF = { layout: layout, save: save };
})();

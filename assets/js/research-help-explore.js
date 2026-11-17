// 어서와, 연구는 처음이지? — 자유 서술을 받아 연구주제·변수·이론적 근거를 추천한다. 추천은 서버(research-help-backend/Code.gs의 explore)가 만든다.
(function () {
  'use strict';
  var DRAFT_KEY = 'research-help-explore-draft';
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    [].concat(children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }
  function store(v) {
    try { if (v === undefined) return localStorage.getItem(DRAFT_KEY) || ''; if (v) localStorage.setItem(DRAFT_KEY, v); else localStorage.removeItem(DRAFT_KEY); } catch (e) { return ''; }
  }
  function post(url, body, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, ms);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, message: '서버에 연결하지 못했거나 시간이 너무 오래 걸렸습니다. 잠시 후 다시 시도해 주세요.' }; })
      .then(function (res) { if (timer) clearTimeout(timer); return res; });
  }

  function section(title, sub, body) {
    return el('section', { class: 'rhx-block' }, [el('h3', { text: title }), sub ? el('p', { class: 'rhx-sub', text: sub }) : null].concat(body));
  }
  function render(box, r) {
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'rhx-head' }, [el('h2', { text: '추천 결과' }), el('span', { class: 'rhx-badge', text: 'AI 생성 · 참고용' })]));
    if (r.understanding) box.appendChild(el('p', { class: 'rhx-understand' }, [el('strong', { text: '내가 이해한 고민 ' }), r.understanding]));
    box.appendChild(section('1. 가능한 연구주제', '서로 다른 각도에서 세 가지를 제안했습니다. 마음이 가는 주제를 골라 다듬어 보세요.',
      (r.topics || []).map(function (t, i) {
        return el('article', { class: 'rhx-card' }, [
          el('h4', {}, [el('span', { class: 'rhx-no', text: '주제 ' + (i + 1) }), t.title]),
          el('p', {}, [el('b', { text: '연구문제 ' }), t.question]),
          el('p', {}, [el('b', { text: '왜 이 주제인가 ' }), t.why]),
          el('p', {}, [el('b', { text: '어떻게 확인할까 ' }), t.approach])
        ]);
      })));
    box.appendChild(section('2. 사용할 수 있는 변수', '변수의 역할은 연구문제에 따라 바뀔 수 있습니다. 측정 검색어로 기존 척도를 찾아보세요.', [
      el('div', { class: 'rhx-table-wrap' }, [el('table', { class: 'rhx-table' }, [
        el('thead', {}, [el('tr', {}, ['변수', '역할', '이 연구에서의 의미', '측정 방법 · 척도 검색어'].map(function (h) { return el('th', { scope: 'col', text: h }); }))]),
        el('tbody', {}, (r.variables || []).map(function (v) {
          return el('tr', {}, [el('td', { class: 'rhx-var', text: v.name }), el('td', {}, [el('span', { class: 'rhx-role', text: v.role })]), el('td', { text: v.meaning }), el('td', { text: v.measure })]);
        }))
      ])])
    ]));
    box.appendChild(section('3. 사용 가능한 이론적 근거', '이론 이름만 붙이지 말고, 이론의 논리가 어떤 변수 관계를 설명하는지 원전을 읽고 확인하세요.',
      (r.theories || []).map(function (t) {
        return el('article', { class: 'rhx-card' }, [
          el('h4', { text: t.name }),
          t.scholars ? el('p', { class: 'rhx-scholar', text: '대표 학자: ' + t.scholars }) : null,
          el('p', { text: t.logic }),
          t.caution ? el('p', { class: 'rhx-caution' }, [el('b', { text: '주의 ' }), t.caution]) : null
        ]);
      })));
    if ((r.keywords || []).length) box.appendChild(section('4. 선행연구 검색어', 'Google Scholar, RISS, Web of Science 등에서 검색해 보세요.', [
      el('ul', { class: 'rhx-keywords' }, r.keywords.map(function (k) {
        return el('li', {}, [el('a', { href: 'https://scholar.google.com/scholar?q=' + encodeURIComponent(k), target: '_blank', rel: 'noopener', text: k })]);
      }))]));
    if ((r.nextSteps || []).length) box.appendChild(section('5. 이번 주에 해 볼 일', null, [el('ol', { class: 'rhx-steps' }, r.nextSteps.map(function (s) { return el('li', { text: s }); }))]));
    box.appendChild(el('p', { class: 'rhx-note', text: '이 추천은 AI가 만든 출발점입니다. 이론과 척도는 반드시 원문을 찾아 확인하고, 지도교수와 상의해 주제를 정하세요. (' + (r.generatedBy || 'AI') + ')' }));
    box.appendChild(el('div', { class: 'rhx-actions' }, [
      el('button', { type: 'button', class: 'rh-btn', text: '다시 써서 추천받기', onclick: function () { document.getElementById('rhx-text').focus(); window.scrollTo({ top: document.getElementById('rh-explore').offsetTop - 80, behavior: 'smooth' }); } }),
      el('button', { type: 'button', class: 'rh-btn', text: '인쇄 · PDF로 저장', onclick: function () { window.print(); } })
    ]));
  }

  function mount(root) {
    var endpoint = root.getAttribute('data-endpoint');
    var text = root.querySelector('#rhx-text'), name = root.querySelector('#rhx-name'), count = root.querySelector('#rhx-count');
    var go = root.querySelector('#rhx-go'), statusEl = root.querySelector('#rhx-status'), result = root.querySelector('#rhx-result');
    function status(msg, isError) { statusEl.textContent = msg || ''; statusEl.className = 'rh-status' + (isError ? ' is-error' : '') + (msg ? '' : ' is-empty'); }
    text.value = store();
    function counted() { count.textContent = text.value.length + ' / 4000'; }
    counted();
    text.addEventListener('input', function () { counted(); store(text.value); });
    go.addEventListener('click', function () {
      var v = text.value.trim();
      if (!name.value.trim()) { status('이름을 입력해 주세요.', true); name.focus(); return; }
      if (v.length < 30) { status('고민하는 내용을 30자 이상 적어 주세요. 떠오르는 대로 편하게 써도 됩니다.', true); text.focus(); return; }
      if (!endpoint) { status('서버 연결이 설정되지 않았습니다.', true); return; }
      go.disabled = true; go.textContent = '추천을 만드는 중…';
      status('글을 읽고 연구주제·변수·이론을 고르는 중입니다. 1분 정도 걸릴 수 있으니 창을 닫지 말아 주세요.');
      post(endpoint, { action: 'explore', name: name.value.trim(), text: v }, 180000).then(function (res) {
        go.disabled = false; go.textContent = '연구주제 추천받기';
        if (!res || res.ok !== true) { status((res && res.message) || '추천을 만들지 못했습니다.', true); return; }
        status('');
        render(result, res.result);
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  function start() { var root = document.getElementById('rh-explore'); if (root) mount(root); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function renderedText(items, options) {
  const labels = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({
    createRadialGradient: () => gradient,
    measureText: text => ({ width: text.length * 7 }),
    fillText(text) { labels.push({ text, color: this.fillStyle }); },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const canvas = { clientWidth: 500, width: 1000, height: 400, getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 500, height: 200 }) };
  const sandbox = { window: { matchMedia: () => ({ matches: true }) },
    matchMedia: () => ({ matches: true }), document: { readyState: 'loading', addEventListener() {} },
    performance: { now: () => 0 }, requestAnimationFrame: fn => { fn(0); return 1; }, cancelAnimationFrame() {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/orbit.js'), 'utf8'), sandbox);
  sandbox.window.PalOrbit.run(canvas, items, { wide: true, max: 8, ...options });
  return labels;
}

function renderedLabels(items, options) {
  return renderedText(items, options).map(label => label.text);
}

test('Weekly Insight keywords use bright blue without recoloring other banners', () => {
  const items = [['AI와 일하기', '학습의 정의', '문화지체']];
  assert.deepEqual(renderedText(items, { priority: 'recent' }).map(label => label.color),
    ['#72b7ff', '#72b7ff', '#72b7ff']);
  assert.deepEqual(renderedText(items).map(label => label.color),
    ['#d3e1f3', '#d3e1f3', '#d3e1f3']);
});

test('recent priority represents each recent article before filling secondary keywords', () => {
  const items = [
    ['새 글 주제', '새 글 보조', '공통 주제'],
    ['둘째 글 주제', '둘째 글 보조', '공통 주제'],
    ['셋째 글 주제', '셋째 글 보조', '공통 주제'],
    ['넷째 글 주제', '넷째 글 보조', '공통 주제'],
    ['다섯째 글 주제', '공통 주제'],
    ['여섯째 글 주제', '공통 주제'],
  ];
  assert.deepEqual(renderedLabels(items, { priority: 'recent' }), [
    '새 글 주제', '둘째 글 주제', '셋째 글 주제', '넷째 글 주제', '다섯째 글 주제', '여섯째 글 주제',
    '새 글 보조', '둘째 글 보조',
  ]);
});

test('other banners retain frequency priority and deduplicate per article', () => {
  assert.deepEqual(renderedLabels([
    ['처음 주제', '공통 주제', '공통 주제'],
    ['둘째 주제', '공통 주제'],
    ['셋째 주제', '공통 주제'],
  ]), ['공통 주제', '처음 주제', '둘째 주제', '셋째 주제']);
});

test('recent priority skips missing topics and duplicates within the display limit', () => {
  assert.deepEqual(renderedLabels([
    ['첫 주제', '중복 주제', ''], null, ['첫 주제', '둘째 보조'], ['셋째 주제'],
  ], { priority: 'recent', max: 3 }), ['첫 주제', '셋째 주제', '중복 주제']);
});

test('an empty archive does not paint keywords from another section', () => {
  assert.deepEqual(renderedLabels([], { priority: 'recent' }), []);
});

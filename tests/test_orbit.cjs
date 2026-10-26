const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function renderedLabels(items, options) {
  const labels = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({
    createRadialGradient: () => gradient,
    measureText: text => ({ width: text.length * 7 }),
    fillText: text => labels.push(text),
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

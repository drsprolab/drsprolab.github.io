const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const modulePath = path.join(__dirname, '../assets/js/research-map-data.js');
const api = fs.existsSync(modulePath) ? require(modulePath) : {};

function snapshot() {
  return {
    version: 'test-version',
    fields: [{ fi: 0, name: '학습', en: 'Learning', group: 'HRD' }],
    papers: [{ id: 'p1', type: 'paper', year: 2026, citation: 'A (2026). Learning.', name: 'Learning', kws: ['k1'], fi: 0 }],
    keywords: [{ id: 'k1', type: 'kw', name: 'Learning', ko: '학습', fi: 0, also: [], papers: ['p1'], source: 'taxonomy' }],
    links: [{ source: 'k1', target: 'p1' }],
    stats: { papers: 1, keywords: 1, links: 1, visible: 2 }
  };
}

test('hydrates a single generated snapshot into an interactive graph without mutating JSON', () => {
  assert.equal(typeof api.hydrate, 'function', 'build-time snapshot hydration is not implemented');
  const input = snapshot();
  const before = JSON.stringify(input);
  const graph = api.hydrate(input, 'test-version');
  assert.equal(graph.papers[0].kws[0], graph.keywords[0]);
  assert.equal(graph.keywords[0].papers[0], graph.papers[0]);
  assert.deepEqual([...graph.papers[0].fis], [0]);
  assert.deepEqual(graph.links, [{ source: 'k1', target: 'p1' }]);
  assert.equal(JSON.stringify(input), before);
});

test('rejects stale cached snapshots instead of mixing a new page and old metrics', () => {
  assert.throws(() => api.hydrate(snapshot(), 'new-version'), /version/i);
});

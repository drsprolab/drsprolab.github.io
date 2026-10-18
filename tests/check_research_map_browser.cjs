// Optional end-to-end check: PLAYWRIGHT_MODULE=/path/to/playwright node tests/check_research_map_browser.cjs URL
// Uses an installed Chrome; Playwright remains a development-only dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.argv[2] || 'http://127.0.0.1:4012/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.rm-node.kw');
    await page.evaluate(() => document.fonts.ready);
    const graph = await page.evaluate(async () => (await fetch(document.getElementById('rmap').dataset.graph)).json());
    const counts = async () => page.locator('.rmap-stats').first().locator('dd').allTextContents();
    assert.deepEqual((await counts()).map(Number), [graph.stats.papers, graph.stats.keywords, graph.stats.links, graph.stats.visible]);
    assert.equal(await page.locator('.rm-node.paper').count(), graph.stats.papers);
    assert.equal(await page.locator('.rm-node.kw').count(), graph.stats.keywords);
    assert.equal(await page.locator('.rm-link').count(), graph.stats.links);
    await page.locator('.rm-node.kw').first().click({ force: true });
    await page.locator('#rm-local').check();
    const filtered = Number((await counts())[3]);
    assert.ok(filtered < graph.stats.visible && filtered > 1);
    assert.equal(await page.locator('.rm-node:not(.hidden)').count(), filtered);
    await page.locator('#rm-reset').click();
    assert.equal(Number((await counts())[3]), graph.stats.visible);
    await page.locator('#rm-groups [data-group]').nth(1).click();
    assert.ok(Number((await counts())[3]) < graph.stats.visible);
    await page.locator('#rm-reset').click();
    await page.locator('#rm-search').fill('Learning');
    await page.waitForSelector('.rm-node.match');
    await page.locator('#rm-search').press('Enter');
    assert.ok((await page.locator('#rm-detail').textContent()).includes('Learning'));
    await page.locator('#rm-reset').click();
    const layoutScript = fs.readFileSync(require('node:path').join(__dirname, '../scripts/check_rmap_metrics_layout.js'), 'utf8');
    const layouts = [];
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      layouts.push(await page.evaluate(layoutScript));
    }
    await page.locator('#rmap').screenshot({ path: process.env.RESEARCH_MAP_SCREENSHOT || require('node:path').join(require('node:os').tmpdir(), 'research-map-verified.png') });
    const noJs = await browser.newPage({ javaScriptEnabled: false });
    await noJs.goto(url);
    assert.deepEqual((await noJs.locator('.rmap-stats').first().locator('dd').allTextContents()).map(Number), [graph.stats.papers, graph.stats.keywords, graph.stats.links, graph.stats.visible]);
    const escaped = await browser.newPage();
    const htmlLikeGraph = JSON.parse(JSON.stringify(graph));
    const unsafe = '<img src=x onerror="window.__researchMapXss=true">';
    htmlLikeGraph.keywords[0].name = unsafe;
    htmlLikeGraph.papers[0].citation = unsafe;
    await escaped.route('**/assets/data/research-map.json*', route => route.fulfill({ json: htmlLikeGraph }));
    await escaped.goto(url);
    await escaped.waitForSelector('.rm-node.kw');
    await escaped.locator('.rm-node.kw').first().click({ force: true });
    assert.ok((await escaped.locator('#rm-detail').textContent()).includes(unsafe));
    await escaped.locator('.rm-node.paper').first().click({ force: true });
    assert.ok((await escaped.locator('#rm-detail').textContent()).includes(unsafe));
    assert.equal(await escaped.locator('#rmap img').count(), 0);
    assert.equal(await escaped.evaluate(() => window.__researchMapXss === true), false);
    const failed = await browser.newPage();
    await failed.route('**/assets/data/research-map.json*', route => route.fulfill({ status: 503, body: 'Unavailable' }));
    await failed.goto(url);
    await failed.waitForFunction(() => document.getElementById('rm-detail').textContent.includes('Please reload'));
    assert.deepEqual((await failed.locator('.rmap-stats').first().locator('dd').allTextContents()).map(Number), [graph.stats.papers, graph.stats.keywords, graph.stats.links, graph.stats.visible]);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ url, stats: graph.stats, version: graph.version, filteredVisible: filtered, layouts, consoleErrors: errors, javascriptDisabled: 'passed', htmlEscaping: 'passed', fetchFailure: 'passed', interactions: 'passed' }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

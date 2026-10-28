// Research help 브라우저 점검: PLAYWRIGHT_MODULE=/path/to/playwright node tests/check_research_help_browser.cjs [OUTPUT_DIR]
// 실제 Code.gs를 가짜 Apps Script·OpenAI·OpenAlex·Crossref 환경(테스트 데이터)에서 실행하고, Chrome으로 화면·저장·PDF를 끝까지 확인한다.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { setup, res } = require('./support/research-help-fake-apps-script.cjs');

const root = path.join(__dirname, '..');
const outputDir = process.argv[2] || require('node:os').tmpdir() + '/research-help-qa';
const KEYS = ['title', 'problem', 'purpose', 'model', 'rq', 'theory', 'method', 'implications'];
const LONG = '조직 구성원의 학습 전이는 상사의 지원과 동료의 피드백, 그리고 개인의 자기효능감이 맞물려 나타나는 과정이다. ';

let aiFail = 1;
const fb1 = () => Object.fromEntries(KEYS.map(k => [k, { focus: `작성하신 ${k} 내용에서 핵심 개념이 무엇인지 다시 살펴보면 좋겠습니다.`, questions: ['이 연구를 시작하게 된 구체적 경험은 무엇인가요?', '기존 연구와 비교해 무엇을 새롭게 밝히려 하나요?'] }]));
const fb2 = () => Object.fromEntries(KEYS.map(k => [k, k === 'theory'
  ? { status: 'reviewed', assessment: '근거 없음', suggestions: [], sources: [] }
  : { status: 'reviewed', assessment: `${k}: 상사 지원과 학습 전이의 관계는 [S1]에서 종단 자료로 보고되었습니다. 매개 경로를 명확히 하세요.`, suggestions: ['측정 시점을 분리하세요 [S1]'], sources: [{ id: 'S1', basis: '종단 표본에서 상사 지원이 전이에 미치는 영향을 보고' }] }]));
const work = {
  doi: 'https://doi.org/10.1111/test.1', title: 'Supervisor support and training transfer: a longitudinal test', publication_year: 2021,
  authorships: [{ author: { display_name: 'Test Author' } }],
  primary_location: { source: { type: 'journal', display_name: 'Test Journal of HRD', issn: ['1234-5678'], issn_l: '1234-5678', host_organization_name: 'Test Publisher' } },
  abstract_inverted_index: Object.fromEntries(Array.from({ length: 60 }, (_, i) => ['word' + i, [i]]))
};
const backend = setup({
  ai: {
    socratic_feedback: () => (aiFail-- > 0 ? { httpError: 500 } : fb1()),
    search_plan: () => ({ queries: [{ field: 'model', query: 'supervisor support training transfer' }] }),
    literature_feedback: fb2
  },
  web: url => {
    if (url.startsWith('https://api.openalex.org/')) return res(200, JSON.stringify({ results: [work] }));
    if (url.includes('api.crossref.org')) return res(200, JSON.stringify({ message: { type: 'journal-article', DOI: '10.1111/test.1', title: [work.title],
      'container-title': ['Test Journal of HRD'], ISSN: ['1234-5678'], publisher: 'Test Publisher', author: [{ given: 'Test', family: 'Author' }], issued: { 'date-parts': [[2021]] } } }));
    return res(404, '{}');
  }
});
backend.api.sheet_('SSCI_Journals').data.push(['1234-5678', '', 'Test Journal of HRD', 'TEST', '2026-10-29']);

function page(md) {
  const body = fs.readFileSync(path.join(root, md), 'utf8').replace(/^---[\s\S]*?---/, '')
    .replace(/\{\{ site\.research_help_script_url \| escape \}\}/g, '/exec')
    .replace(/\{\{ '([^']+)' \| relative_url \}\}\?v=\{\{[^}]+\}\}/g, '$1');
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<link rel="stylesheet" href="/assets/css/style.css"></head><body><main class="container"><article class="page page--wide"><div class="prose">' + body + '</div></article></main></body></html>';
}
const server = http.createServer((req, resp) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/exec') {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { resp.setHeader('Content-Type', 'application/json'); resp.end(JSON.stringify(backend.call(JSON.parse(data)))); });
    return;
  }
  if (url.pathname === '/research-help/') return resp.end(page('research-help.md'));
  if (url.pathname === '/research-help/admin/') return resp.end(page('research-help/admin.md'));
  const file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(path.join(root, 'assets')) || !fs.existsSync(file)) { resp.statusCode = 404; return resp.end(); }
  resp.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(resp);
});

function pdfPages(buf) {
  return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  await fsp.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('dialog', d => d.accept());
    await p.goto(base + '/research-help/');
    await p.waitForSelector('#rh-title');
    assert.equal(await p.locator('.rh-row').count(), 8);
    assert.equal(await p.locator('.rh-comments').count(), 0);

    await p.fill('#rh-name', '테스트 작성자');
    for (const k of KEYS) await p.fill('#rh-' + k, k === 'title' ? '상사 지원이 학습 전이에 미치는 영향: 자기효능감의 매개효과' : LONG.repeat(k === 'problem' ? 40 : 6).trim());
    await p.click('.rh-actions button:has-text("1차 저장")');
    await p.waitForSelector('.rh-status.is-error');
    assert.match(await p.textContent('.rh-status'), /동의/);

    await p.check('.rh-consent input');
    await p.click('.rh-actions button:has-text("1차 저장")');
    await p.waitForSelector('.rh-status.is-error');
    assert.match(await p.textContent('.rh-status'), /AI 피드백 생성에 실패/);
    assert.equal(await p.locator('.rh-comments').count(), 0, '실패 시 다음 단계로 넘어가지 않음');
    assert.equal(await p.inputValue('#rh-title'), '상사 지원이 학습 전이에 미치는 영향: 자기효능감의 매개효과', '실패해도 작성 내용 유지');

    await p.click('.rh-actions button:has-text("1차 저장")');
    await p.waitForSelector('.rh-comments');
    assert.equal(await p.locator('.rh-comments').count(), 8);
    assert.match(await p.textContent('.rh-ai-badge'), /AI 생성 · 1차/);
    assert.match(await p.textContent('.rh-notice'), /직접 작성한 평가가 아닙니다/);
    const box1 = await p.locator('.rh-row').first().locator('.rh-mine').boundingBox();
    const box2 = await p.locator('.rh-row').first().locator('.rh-comments').boundingBox();
    assert.ok(box2.x > box1.x + box1.width - 1, 'DrS comments가 오른쪽에 표시');
    await p.screenshot({ path: outputDir + '/round1.png', fullPage: false });

    await p.fill('#rh-title', '상사 지원과 학습 전이: 자기효능감의 매개 역할에 대한 종단 연구');
    await p.click('.rh-actions button:has-text("2차 저장")');
    await p.waitForSelector('.rh-sources');
    assert.match(await p.textContent('.rh-ai-badge'), /2차/);
    assert.match(await p.locator('.rh-row', { hasText: '이론적 근거' }).textContent(), /검증된 근거 부족으로 판단 보류/);
    assert.equal(await p.locator('.rh-sources a').first().getAttribute('href'), 'https://doi.org/10.1111/test.1');
    assert.match(await p.textContent('.rh-scope'), /원문 미확인/);
    await p.screenshot({ path: outputDir + '/round2.png', fullPage: false });

    await p.click('.rh-actions button:has-text("3차 저장")');
    await p.waitForSelector('.rh-actions button:has-text("제출")');
    assert.equal(await p.getAttribute('#rh-problem', 'readonly'), '');

    // PDF 배치: 넘침 없이 모든 글이 들어가는지 확인하고 한글 렌더링을 캡처한다.
    const laid = await p.evaluate(() => {
      const doc = window.ResearchHelp.pdfDocument({ submission: { id: 'X', name: 'n', submittedAt: '' },
        revisions: [{ round: 3, status: 'ok', savedAt: 's', fields: Object.fromEntries(window.ResearchHelp.FIELDS.map(f => [f.key, document.getElementById('rh-' + f.key).value])) }] });
      const out = window.ResearchHelpPDF.layout(doc);
      const overflow = out.pages.some(pg => pg.firstChild.scrollHeight > pg.firstChild.clientHeight + 1);
      const text = out.pages.map(pg => pg.firstChild.textContent).join('').replace(/\s+/g, '');
      const expected = doc.blocks.map(b => b.text).join('').replace(/\s+/g, '');
      out.host.style.left = '0'; out.host.style.zIndex = '9999'; out.host.style.position = 'absolute';
      return { pages: out.pages.length, overflow, complete: text.includes(expected) };
    });
    assert.ok(laid.pages >= 3, '긴 내용은 여러 페이지로 나뉨: ' + laid.pages);
    assert.equal(laid.overflow, false, '페이지 넘침 없음');
    assert.equal(laid.complete, true, '잘린 글 없음');
    await p.locator('.rhp-page').nth(1).screenshot({ path: outputDir + '/pdf-page2.png' });
    await p.evaluate(() => document.querySelector('.rhp-host').remove());

    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.rh-actions button:has-text("PDF 다운로드")')]);
    const pdfPath = outputDir + '/student.pdf';
    await dl.saveAs(pdfPath);
    const pdf = await fsp.readFile(pdfPath);
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.equal(pdfPages(pdf), laid.pages, 'PDF 페이지 수 일치');

    await p.click('.rh-actions button:has-text("제출")');
    await p.waitForSelector('.rh-done');
    await p.reload();
    await p.waitForSelector('.rh-done');
    assert.equal(await p.locator('text=PDF 다운로드').count(), 1);

    // 관리자 열람
    const a = await ctx.newPage();
    a.on('pageerror', e => errors.push(e.message));
    await a.goto(base + '/research-help/admin/');
    await a.fill('#rh-admin-pw', '0000');
    await a.click('.rh-login button');
    await a.waitForSelector('.rh-status.is-error');
    assert.match(await a.textContent('.rh-status'), /올바르지 않습니다/);
    assert.equal(await a.locator('.rh-list-item').count(), 0);
    await a.fill('#rh-admin-pw', 'test-admin-pass');
    await a.click('.rh-login button');
    await a.waitForSelector('.rh-list-item');
    await a.click('.rh-list-item');
    await a.waitForSelector('.rh-tabs');
    assert.equal(await a.locator('.rh-tabs button').count(), 3);
    await a.click('.rh-tabs button >> nth=0');
    assert.equal(await a.locator('.rh-comments').count(), 8);
    const [adl] = await Promise.all([a.waitForEvent('download'), a.click('button:has-text("PDF 다운로드")')]);
    await adl.saveAs(outputDir + '/admin.pdf');
    const adminPdf = await fsp.readFile(outputDir + '/admin.pdf');
    assert.ok(pdfPages(adminPdf) > laid.pages, '관리자 PDF는 수정 이력 포함');
    await a.screenshot({ path: outputDir + '/admin.png' });

    // 모바일 폭에서 가로 넘침 없음
    const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await m.goto(base + '/research-help/');
    await m.waitForSelector('#rh-title');
    assert.equal(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await m.screenshot({ path: outputDir + '/mobile.png' });

    assert.deepEqual(errors, []);
    const revs = backend.rows('Revisions');
    console.log(JSON.stringify({ ok: true, pdfPages: laid.pages, adminPdfPages: pdfPages(adminPdf), revisions: revs.map(r => r[1] + ':' + r[4]), outputDir }));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); process.exit(1); });

'use strict';
// Research help 화면 상태 관리 테스트. 서버는 가짜 transport(테스트 데이터)로 대체한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const RH = require(path.join(__dirname, '../assets/js/research-help.js'));

const KEYS = ['name', 'title', 'problem', 'purpose', 'model', 'rq', 'theory', 'method', 'implications'];
const fields = extra => Object.assign(Object.fromEntries(KEYS.map(k => [k, k === 'name' ? '테스트 작성자' : `${k} 연구 내용`])), extra);
const feedback = round => ({ round, kind: round === 1 ? 'socratic' : 'literature', generatedBy: 'AI (test)',
  items: Object.fromEntries(KEYS.slice(1).map(k => [k, round === 1 ? { focus: 'f', questions: ['q'] } : { status: 'reviewed', assessment: 'a', suggestions: [], sources: [] }])) });

function memoryStorage() {
  let v = null;
  return { get: () => v, set: x => { v = x; }, remove: () => { v = null; }, peek: () => v };
}
function fakeServer() {
  const s = { round: 0, calls: [], failNext: null };
  s.transport = async body => {
    s.calls.push(body);
    if (s.failNext) { const f = s.failNext; s.failNext = null; return f; }
    if (body.action === 'save') {
      if (body.round !== s.round + 1) return { ok: false, error: 'stale_round', message: '단계 불일치' };
      s.round = body.round;
      return { ok: true, id: 'RH261029ABCDEF12', token: body.id ? undefined : 't'.repeat(64), round: body.round, savedAt: `2026-10-29T0${body.round}:00:00+09:00`,
        feedback: body.round < 3 ? feedback(body.round) : null, submission: { round: body.round, status: 'draft' } };
    }
    if (body.action === 'submit') return s.round === 3 ? { ok: true, submission: { status: 'submitted' } } : { ok: false, error: 'not_ready', message: '3차 저장 필요' };
    return { ok: false, error: 'unsupported' };
  };
  return s;
}

test('서버 연결이 없으면 저장을 거절하고 단계를 올리지 않는다', async () => {
  const app = RH.createController({});
  app.setFields(fields()); app.setConsent(true);
  await assert.rejects(app.save(), /서버|연결/);
  assert.equal(app.state.round, 0);
  assert.equal(app.state.history.length, 0);
});

test('빈 항목이나 미동의 상태에서는 서버로 보내지 않는다', async () => {
  const server = fakeServer();
  const app = RH.createController({ transport: server.transport });
  app.setFields(fields({ theory: ' ' })); app.setConsent(true);
  await assert.rejects(app.save(), /이론적 근거/);
  app.setFields(fields()); app.setConsent(false);
  await assert.rejects(app.save(), /동의/);
  assert.equal(server.calls.length, 0);
});

test('1차 저장은 저장본을 고정해 보관하고, 이후 수정은 별도 편집본으로 남는다', async () => {
  const server = fakeServer(), storage = memoryStorage();
  const app = RH.createController({ transport: server.transport, storage });
  app.setFields(fields()); app.setConsent(true);
  await app.save();
  assert.equal(app.state.round, 1);
  assert.equal(app.state.feedback[1].kind, 'socratic');
  assert.deepEqual(storage.peek(), { id: 'RH261029ABCDEF12', token: 't'.repeat(64) });
  app.setField('title', '수정된 제목');
  assert.equal(app.state.history[0].fields.title, 'title 연구 내용');
  assert.ok(Object.isFrozen(app.state.history[0].fields));
});

test('서버 실패 시 단계를 유지하고, 재시도는 같은 요청 번호와 서버가 준 식별값으로 보낸다', async () => {
  const server = fakeServer(), storage = memoryStorage();
  const app = RH.createController({ transport: server.transport, storage });
  app.setFields(fields()); app.setConsent(true);
  server.failNext = { ok: false, error: 'feedback_failed', message: 'AI 피드백 생성에 실패했습니다.', id: 'RH261029ABCDEF12', token: 't'.repeat(64) };
  await assert.rejects(app.save(), /AI 피드백 생성에 실패/);
  assert.equal(app.state.round, 0);
  assert.equal(app.state.busy, false);
  assert.equal(app.state.id, 'RH261029ABCDEF12');
  await app.save();
  assert.equal(server.calls[1].requestId, server.calls[0].requestId);
  assert.equal(server.calls[1].id, 'RH261029ABCDEF12');
  assert.equal(app.state.round, 1);
  // 다음 단계는 새 요청 번호
  await app.save();
  assert.notEqual(server.calls[2].requestId, server.calls[1].requestId);
});

test('3차 저장 전에는 제출할 수 없고, 3차 저장 후 제출하면 상태가 바뀐다', async () => {
  const server = fakeServer();
  const app = RH.createController({ transport: server.transport });
  app.setFields(fields()); app.setConsent(true);
  await app.save(); await app.save();
  await assert.rejects(app.submit(), /3차 저장/);
  await app.save();
  assert.equal(app.state.round, 3);
  assert.equal(app.state.history.length, 3);
  await assert.rejects(app.save(), /3차 저장까지 완료/);
  await app.submit();
  assert.equal(app.state.status, 'submitted');
  await assert.rejects(app.save(), /이미 제출/);
});

test('이어쓰기: 저장 기록으로 단계·피드백·마지막 작성 내용을 되살린다', async () => {
  const storage = memoryStorage();
  storage.set({ id: 'RH261029ABCDEF12', token: 't'.repeat(64) });
  const transport = async body => ({ ok: true, submission: { id: body.id, round: 2, status: 'draft' }, revisions: [
    { round: 1, status: 'ok', savedAt: 'a', fields: fields(), feedback: feedback(1) },
    { round: 2, status: 'ok', savedAt: 'b', fields: fields({ title: '2차' }), feedback: feedback(2) },
    { round: 3, status: 'failed', savedAt: 'c', fields: fields({ title: '3차 시도' }), feedback: null }
  ] });
  const app = RH.createController({ transport, storage });
  assert.equal(await app.resume(), true);
  assert.equal(app.state.round, 2);
  assert.equal(app.state.history.length, 2);
  assert.equal(app.state.feedback[2].kind, 'literature');
  assert.equal(app.state.fields.title, '3차 시도');
});

test('이어쓰기 권한이 없으면 기기 기록을 지운다', async () => {
  const storage = memoryStorage();
  storage.set({ id: 'RH261029ABCDEF12', token: 'x'.repeat(64) });
  const app = RH.createController({ transport: async () => ({ ok: false, error: 'unauthorized', message: '저장 기록을 확인할 수 없습니다.' }), storage });
  await assert.rejects(app.resume(), /확인할 수 없/);
  assert.equal(storage.peek(), null);
});

test('PDF 문서: 작성자와 관리자 모두 최종 연구계획서와 1·2차 피드백·수정 이력을 기본으로 담는다', () => {
  const record = { submission: { id: 'RH261029ABCDEF12', name: '테스트 작성자', submittedAt: '2026-10-29' }, revisions: [
    { round: 1, status: 'ok', savedAt: 'a', fields: fields(), feedback: feedback(1) },
    { round: 2, status: 'failed', savedAt: 'b', fields: fields(), feedback: null },
    { round: 2, status: 'ok', savedAt: 'c', fields: fields(), feedback: feedback(2) },
    { round: 3, status: 'ok', savedAt: 'd', fields: fields({ title: '최종 제목' }), feedback: null }
  ] };
  const mine = RH.pdfDocument(record, { history: false });
  assert.match(mine.title, /최종 제목/);
  assert.deepEqual(mine.blocks.filter(b => /^h[23]$/.test(b.type)).map(b => b.text),
    ['1. 서론', '1-1. 연구의 문제의식', '1-2. 연구의 목적', '1-3. 연구 모형', '1-4. 연구 문제', '2. 이론적 근거', '3. 연구방법', '4. 기대시사점']);
  assert.match(mine.subtitle, /테스트 작성자/);
  const all = RH.pdfDocument(record);
  const history = all.blocks.slice(all.blocks.findIndex(b => b.text === '부록. 연구계획 발전 과정'));
  assert.deepEqual(history.filter(b => b.type === 'h3').map(b => b.text), [
    '1. 최초 작성본 (1차 저장) · a',
    '2. 1차 피드백 · DrS comments (AI 생성)',
    '3. 1차 피드백 반영 수정본 (2차 저장) · c',
    '4. 2차 피드백 · DrS comments (AI 생성)',
    '5. 2차 피드백 반영 최종 수정본 (3차 저장) · d'
  ]);
  assert.deepEqual(RH.pdfDocument(record, { history: true }), all);
  assert.ok(all.blocks.some(b => b.type === 'note' && b.text.includes('외부 AI(현재 Google Gemini)')));
  assert.equal(RH.pdfFileName(record), 'research-plan-테스트_작성자-RH261029ABCDEF12.pdf');
});

test('관리자: 세션이 만료되면 세션을 지운다', async () => {
  const session = memoryStorage();
  session.set('s'.repeat(64));
  const admin = RH.createAdmin({ transport: async () => ({ ok: false, error: 'admin_session', message: '만료' }), session });
  await assert.rejects(admin.list(), /만료/);
  assert.equal(admin.state.session, null);
  assert.equal(session.peek(), null);
});

test('추천 논문: APA 7판 형식으로 PDF 끝에 붙는다', () => {
  const rec = { title: 'Social support in the workplace and training transfer: A longitudinal analysis', year: 2010, journal: 'International Journal of Selection and Assessment',
    volume: '18', issue: '2', page: '187-200', doi: '10.1111/j.1468-2389.2010.00500.x', reason: '종단 자료',
    apaAuthors: [{ family: 'Chiaburu', given: 'Dan S.' }, { family: 'Van Dam', given: 'Karen' }, { family: 'Hutchins', given: 'Holly M.' }] };
  assert.equal(RH.apaText({ ...rec, title: 'A\n   B', journal: 'R &amp; P' }).includes('A B. R & P, 18(2)'), true);
  assert.ok(RH.apaText({ ...rec, title: 'Do emotions matter?' }).includes('Do emotions matter? International'));
  assert.equal(RH.apaText(rec), 'Chiaburu, D. S., Van Dam, K., & Hutchins, H. M. (2010). Social support in the workplace and training transfer: A longitudinal analysis. International Journal of Selection and Assessment, 18(2), 187–200. https://doi.org/10.1111/j.1468-2389.2010.00500.x');
  const fb2 = Object.assign(feedback(2), { recommended: [rec] });
  const doc = RH.pdfDocument({ submission: { id: 'X', name: 'n' }, revisions: [
    { round: 2, status: 'ok', savedAt: 'b', fields: fields(), feedback: fb2 }, { round: 3, status: 'ok', savedAt: 'c', fields: fields(), feedback: null }] }, { history: false });
  const refs = doc.blocks.filter(b => b.type === 'ref');
  assert.equal(refs.length, 1);
  assert.deepEqual(refs[0].parts.filter(p => p.em).map(p => p.text), ['International Journal of Selection and Assessment', '18']);
  assert.equal(doc.blocks.filter(b => b.type === 'h2').pop().text, '참고문헌: 추천 논문 1편');
});

test('연구 모형 그림: 글 없이 그림만 넣어도 저장되고, 새 그림은 한 번만 보낸 뒤 파일 id로 이어진다', async () => {
  const server = fakeServer();
  const inner = server.transport;
  server.transport = async body => { const r = await inner(body); if (r.ok && body.action === 'save') r.modelImage = body.modelImageData ? 'file00000001' : (body.fields.modelImage || ''); return r; };
  const app = RH.createController({ transport: server.transport, storage: memoryStorage() });
  app.setFields(fields({ model: '' }));
  app.setConsent(true);
  await assert.rejects(app.save(), /연구 모형/);
  app.setImage('data:image/png;base64,QUJD');
  assert.equal(app.imageUrl(), 'data:image/png;base64,QUJD');
  await app.save();
  const first = server.calls.filter(c => c.action === 'save').pop();
  assert.equal(first.modelImageData, 'data:image/png;base64,QUJD');
  assert.equal(app.state.fields.modelImage, 'file00000001');
  assert.equal(app.imageUrl(), 'data:image/png;base64,QUJD');
  await app.save();
  const second = server.calls.filter(c => c.action === 'save').pop();
  assert.equal(second.modelImageData, undefined, '같은 그림을 다시 보내지 않는다');
  assert.equal(second.fields.modelImage, 'file00000001');
  const doc = RH.pdfDocument({ submission: { id: 'x', name: 'n', round: 2, status: 'draft' },
    revisions: app.state.history.map(h => ({ round: h.round, savedAt: h.savedAt, status: 'ok', fields: h.fields, feedback: h.feedback })), images: app.state.images });
  assert.ok(doc.blocks.some(b => b.type === 'img' && b.src === 'data:image/png;base64,QUJD'), 'PDF에 연구 모형 그림이 들어가야 한다');
});

test('1·2차 피드백 뒤에도 모든 기존 작성 칸을 유지하고, 각 수정본은 독립된 원문으로 남긴다', async () => {
  const server = fakeServer();
  const app = RH.createController({ transport: server.transport });
  const original = fields();
  app.setFields(original); app.setConsent(true);
  await app.save();
  for (const key of KEYS) assert.equal(app.state.fields[key], original[key]);
  const firstEdit = fields(Object.fromEntries(KEYS.slice(1).map(key => [key, original[key] + '\n1차 피드백을 반영한 수정'])));
  app.setFields(firstEdit);
  await app.save();
  for (const key of KEYS) assert.equal(app.state.fields[key], firstEdit[key]);
  assert.deepEqual(app.state.history[0].fields, original);
  const finalEdit = fields(Object.fromEntries(KEYS.slice(1).map(key => [key, firstEdit[key] + '\n2차 피드백을 반영한 최종 수정'])));
  app.setFields(finalEdit); await app.save();
  assert.deepEqual(app.state.history[0].fields, original);
  assert.deepEqual(app.state.history[1].fields, firstEdit);
  assert.deepEqual(app.state.history[2].fields, finalEdit);
  const doc = RH.pdfDocument({ submission: { id: 'test', name: original.name }, revisions: app.state.history.map(h => ({ ...h, status: 'ok' })) });
  for (const version of [original, firstEdit, finalEdit]) {
    for (const key of KEYS) {
      const paragraphs = version[key].split('\n');
      for (const paragraph of paragraphs) assert(doc.blocks.some(b => b.text === paragraph));
    }
  }
});

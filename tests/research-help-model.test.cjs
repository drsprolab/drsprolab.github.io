'use strict';
// 연구 모형 글 문법(옵션 2) → Graphviz 변환 테스트.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const M = require(path.join(__dirname, '../assets/js/research-help-model.js'));

test('예시 틀은 모두 오류 없이 바뀐다', () => {
  M.TEMPLATES.forEach(t => assert.deepEqual(M.toDot(t.text).errors, [], t.key));
});

test('직접·매개 경로와 가설 번호', () => {
  const r = M.parse('직무 자율성 -> 일 몰입 -> 혁신 행동\n직무 자율성 -> 혁신 행동 : H3\n# 메모');
  assert.deepEqual(r.nodes, ['직무 자율성', '일 몰입', '혁신 행동']);
  assert.equal(r.edges.length, 3);
  assert.equal(r.edges[2].label, 'H3');
});

test('조절: 경로 가운데 점에 조절변수 화살표가 꽂힌다', () => {
  const { dot } = M.toDot('X -> Y\nW -> (X -> Y) : H2');
  assert.match(dot, /n0 -> p0 \[arrowhead=none\]/);
  assert.match(dot, /p0 -> n1;/);
  assert.match(dot, /n2 -> p0 \[label=" H2 "\]/);
  assert.match(dot, /rank=same; n2; p0;/);
  assert.equal((dot.match(/n0 -> n1/g) || []).length, 0, '조절되는 경로는 한 번만 그린다');
});

test('변수 이름에 "조절"이 들어가도 조절로 읽지 않는다', () => {
  const r = M.parse('정서 조절 능력 -> 성과');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.nodes, ['정서 조절 능력', '성과']);
});

test('통제변수는 결과변수에 점선으로 잇는다', () => {
  const { dot } = M.toDot('X -> M -> Y\n통제: 성별, 근속연수');
  assert.match(dot, /ctrl \[label="통제변수\\n성별, 근속연수"/);
  assert.match(dot, /ctrl -> n2 \[style=dashed/);
});

test('유니코드 화살표·전각 괄호도 받는다', () => {
  assert.deepEqual(M.parse('W → （X → Y）\nX → Y').errors, []);
});

test('따옴표와 역슬래시는 DOT에서 이스케이프된다', () => {
  const { dot } = M.toDot('A "x" \\ -> B');
  assert.match(dot, /label="A \\"x\\" \\\\"/);
});

test('잘못 쓴 줄은 줄 번호와 함께 한국어로 알려 준다', () => {
  const cases = {
    'A': '1번째 줄: 화살표(->)가 없습니다',
    'A -> ': '1번째 줄: 화살표(->) 앞뒤에 변수 이름이 비어 있습니다',
    'A -> B\nA -> B -> C : H1': '2번째 줄: 가설 번호',
    'W -> (A -> B -> C)': '괄호 안에는 화살표가 하나',
    'A -> A': '같은 변수끼리',
    'A -> (A -> B)': '조절변수는 괄호 안 경로의 변수와 달라야',
    'W -> A -> B)': '괄호로 감싸 주세요',
    '통제:': '통제변수 이름을',
    '# 메모만': '관계를 한 줄 이상'
  };
  Object.entries(cases).forEach(([text, msg]) => {
    const errs = M.toDot(text).errors;
    assert.ok(errs.some(e => e.includes(msg)), `${JSON.stringify(text)} → ${errs.join(' / ')}`);
  });
});

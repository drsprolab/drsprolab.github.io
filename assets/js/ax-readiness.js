// AX 전환 준비도 진단: 설문 응답 수집 → 분석 실시 → 내가 본 우리 회사 / 우리 회사 분석결과 / 응답자 구분별 비교.
// 문항: 기반 마련 → 개인 활용 → 업무 재설계 → 전사 확산 → AI 내재화, 5단계 × 5문항 + 전반 인식 2문항 = 27문항, 5점 동의 척도.
// 회사를 주어로 묻는 단계(기반 마련·전사 확산·AI 내재화)와 전반 인식 문항에는 '잘 모르겠다'(값 0)를 둔다. 0은 점수 계산에서 빼고, 단계별 '모르겠다' 비율로 따로 보고한다.
// 응답 저장: #axr의 data-endpoint(Google Apps Script 웹앱, tools/ax-readiness/)가 있으면 그곳에,
// 비어 있으면 시험 모드로, 응답을 이 브라우저에만 저장하고 이 브라우저의 응답끼리만 분석한다.
(function () {
  var root = document.getElementById('axr');
  if (!root) return;
  var tip = document.getElementById('axr-tip');
  var ENDPOINT = (root.dataset.endpoint || '').trim();
  var PREVIEW = !ENDPOINT;
  var GROUP = cleanGroup(new URLSearchParams(location.search).get('group'));
  var LS_ME = 'axr-v1-me' + (PREVIEW ? '-test' : ''), LS_DATA = 'axr-v1-test-responses';
  var MIN_N = 5;   // 회사 결과·비교를 보여 줄 최소 응답 수
  var MIN_ROLE = 3; // 응답자 구분별 비교에 넣을 최소 인원

  // ---------- 단계와 문항 ----------
  // ref: 문항의 주어(참조 대상). 한 단계 안에서는 주어를 통일한다.
  // unk: '잘 모르겠다' 허용 여부. 응답자가 직접 알기 어려운 회사 수준 단계에만 둔다.
  var STAGES = [
    { key: 'F', name: '기반 마련', ref: '우리 회사는', icon: '🧱', q: '회사는 AX를 시작할 바탕을 깔았나?', unk: true,
      def: '회사가 AX 목표를 밝히고, 자원·사용 지침·공식 도구·기초 교육으로 출발선을 마련한 상태.',
      ex: 'AX 목표가 업무 성과로 제시되어 있고, 공식 지침과 보안 검토를 거친 도구가 있다',
      owner: '경영진과 지원 부서', basis: 'MIT CISR 1단계 · McKinsey 경영진 의지 · NIST AI RMF 거버넌스 · 기보 기초·준비' },
    { key: 'P', name: '개인 활용', ref: '나는', icon: '🙋', q: '나는 업무에 AI를 쓰고 있나?', unk: false,
      def: '구성원 한 사람 한 사람이 반복 업무에 AI를 쓰고, 요청을 구체화하며, 결과를 확인하고, 효과를 설명할 수 있는 상태.',
      ex: '반복 업무 하나 이상을 AI로 처리하고, 결과를 원자료와 대조한다',
      owner: '구성원 개인', basis: 'Microsoft 1국면(AI 비서) · Gartner Active · 개인 변화 준비도(Holt 외, 2007)' },
    { key: 'W', name: '업무 재설계', ref: '우리 팀은', icon: '🧩', q: '팀의 일하는 방식이 AI를 넣어 바뀌었나?', unk: false,
      def: '팀이 과업을 AI와 사람에게 나누고, 사람 검토 단계를 둔 채 업무 절차 자체를 바꾸어, 효과를 지표로 확인하고 방법을 공유하는 상태.',
      ex: 'AI와 사람의 과업이 나뉘어 있고, 절차를 바꾸어 효과를 지표로 확인한다',
      owner: '팀 리더와 팀원', basis: 'McKinsey 업무 흐름 재설계 · MIT CISR 2단계 · Microsoft 2국면 · 일 설계(Parker & Grote, 2022)' },
    { key: 'E', name: '전사 확산', ref: '우리 회사는', icon: '🔗', q: '좋은 사례가 회사 전체로 퍼지고 있나?', unk: true,
      def: '검증된 사례가 다른 부서로 퍼지고, 공통 플랫폼과 통합 데이터 위에서 기능을 재사용하며, 성과를 전사 지표로 재고 평가·보상에 반영하는 상태.',
      ex: '검증된 사례가 다른 부서로 퍼지고, 데이터가 통합되어 있으며, 성과를 전사 지표로 잰다',
      owner: '경영진·IT·현업 부서', basis: 'MIT CISR 3단계 · McKinsey 성과 측정 · Cisco 데이터 · Gartner Operational · 기보 확산' },
    { key: 'N', name: 'AI 내재화', ref: '우리 회사의 업무 체계는', icon: '⚙️', q: 'AI가 회사의 업무 체계에 녹아들었나?', unk: true,
      def: '사람과 AI의 역할을 처음부터 함께 설계한 프로세스에서 AI가 감독 아래 일하고, 책임 담당자가 관리하며, 의사결정과 고객 서비스에 AI가 들어간 상태.',
      ex: 'AI가 감독 아래 부서를 넘는 프로세스를 처리하고, 의사결정에 AI 분석이 들어간다',
      owner: '전사 (경영진·IT·현업)', basis: 'MIT CISR 4단계 · Microsoft 3국면 · NIST AI RMF · Gartner Transformational · 기보 선도' }
  ];
  var RAW = [
    ['F1', '우리 회사는 AX로 달성하려는 목표를 구체적인 업무 성과(예: 처리 시간 단축, 품질 향상)로 제시했다.'],
    ['F2', '우리 회사 경영진은 AX 과제에 필요한 자원(예: 예산, 전담 인력)을 배정하고 있다.'],
    ['F3', '우리 회사는 AI 사용 기준(예: 입력하면 안 되는 정보, 결과 검토 책임)을 담은 공식 지침을 갖추고 있다.'],
    ['F4', '우리 회사는 보안 검토를 거친 AI 도구를 구성원이 업무에 쓸 수 있도록 제공한다.'],
    ['F5', '우리 회사는 직무별 AI 활용 교육을 운영한다.'],
    ['P1', '나는 매주 반복되는 내 업무 가운데 적어도 한 가지를 AI로 처리하고 있다.'],
    ['P2', '나는 AI에게 요청할 때 결과물이 갖출 조건(예: 목적, 분량, 형식)을 구체적으로 제시한다.'],
    ['P3', '나는 AI 결과를 업무에 쓰기 전에 원자료와 대조해 확인한다.'],
    ['P4', '나는 AI가 내 업무 성과를 어떻게 높였는지 구체적인 예(예: 줄어든 시간, 줄어든 오류)를 들 수 있다.'],
    ['P5', '나는 새로 알게 된 AI 기능을 내 업무에 직접 적용해 본다.'],
    ['W1', '우리 팀은 업무를 과업 단위로 나누어 AI가 맡을 부분과 사람이 맡을 부분을 정해 두었다.'],
    ['W2', '우리 팀의 업무 절차에는 AI 결과를 사람이 검토하는 단계가 명시되어 있다.'],
    ['W3', '우리 팀은 AI를 활용하기 위해 기존 업무 절차 자체를 바꾸었다(예: 단계 통합, 순서 변경).'],
    ['W4', '우리 팀은 AI를 적용한 업무의 효과를 전후 비교 지표(예: 처리 시간, 오류 건수)로 확인한다.'],
    ['W5', '우리 팀에는 효과가 확인된 AI 활용 방법이 누구나 쓸 수 있는 형태(예: 공용 요청문, 작업 안내서)로 정리되어 있다.'],
    ['E1', '우리 회사는 한 부서에서 효과가 확인된 AI 활용 사례를 다른 부서가 도입하도록 지원하는 체계(예: 전담 조직, 사례 공유 플랫폼)를 운영한다.'],
    ['E2', '우리 회사는 여러 부서가 함께 쓰는 공통 AI 플랫폼에서 검증된 기능을 재사용한다.'],
    ['E3', '우리 회사의 업무 데이터는 부서 구분 없이 AI가 안전하게 활용할 수 있도록 통합되어 있다.'],
    ['E4', '우리 회사는 AI 과제의 성과를 전사 공통 지표로 정기적으로 측정한다.'],
    ['E5', '우리 회사의 평가·보상 제도는 AI를 활용한 업무 혁신을 성과로 인정한다.'],
    ['N1', '우리 회사에서는 AI가 사람의 감독 아래 부서를 넘는 업무 프로세스의 여러 단계를 처리한다.'],
    ['N2', '우리 회사는 업무 프로세스를 설계할 때 사람과 AI가 각각 맡을 역할을 처음부터 함께 정한다.'],
    ['N3', '우리 회사는 운영 중인 AI 시스템마다 책임지는 담당자를 지정해 관리한다.'],
    ['N4', '우리 회사의 주요 의사결정 자료에는 AI 분석 결과가 기본적으로 포함된다.'],
    ['N5', '우리 회사는 AI를 활용해 고객에게 제공하는 상품이나 서비스의 방식을 바꾸었다.'],
    ['G1', '우리 회사 구성원들은 AX 전환을 해내려는 의지가 강하다.'],
    ['G2', '우리 회사는 AX 전환을 해낼 역량을 갖추고 있다.']
  ];
  var ITEMS = RAW.map(function (r, i) {
    var s = i < 25 ? STAGES[Math.floor(i / 5)] : null;
    return { code: r[0], text: r[1], idx: i, unk: s ? s.unk : true };
  });
  var NS = 25, NI = ITEMS.length; // 단계 문항 수, 전체 문항 수
  var SCALE = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
  var UNK = '잘 모르겠다';
  var ROLES = ['실무자(팀원)', '팀장·파트장', '임원·경영진', '기타'];
  // 제시 순서: 단계 순서대로, 한 쪽에 한 단계(주어가 같은 문항끼리) → 전반 인식
  var PAGES = STAGES.map(function (_, s) { return ITEMS.slice(s * 5, s * 5 + 5); });
  PAGES.push(ITEMS.slice(NS));
  var PAGE_HEAD = ['우리 회사 전체에 대한 문장입니다.', '나 자신에 대한 문장입니다.', '내가 속한 팀에 대한 문장입니다.', '우리 회사 전체에 대한 문장입니다.', '우리 회사의 업무 시스템과 프로세스에 대한 문장입니다.', '마지막으로, 우리 회사 전체를 떠올려 주세요.'];

  // ---------- 수준·단계 ----------
  var LEVELS = [{ min: 80, t: '주도' }, { min: 60, t: '정착' }, { min: 40, t: '형성' }, { min: 0, t: '시작' }];
  var CUT = 60;      // 단계 '준비 완료' 기준점(잠정)
  var MIN_ITEMS = 4; // 단계 점수를 내려면 5문항 중 이만큼 응답(모르겠다 제외)해야 함
  var GAP_NOTE = 10, GAP_BIG = 20; // 나와 다른 응답자의 차이: 눈여겨볼 차이, 큰 차이(점)
  var STAGE_NAMES = ['출발 전', '1단계 · 기반 마련', '2단계 · 개인 활용', '3단계 · 업무 재설계', '4단계 · 전사 확산', '5단계 · AI 내재화'];
  var STAGE_DESC = [
    'AX를 시작할 바탕(목표·지침·도구·교육)부터 갖추어야 하는 단계입니다.',
    '회사가 출발선은 마련했지만, 구성원이 업무에 AI를 쓰는 일이 아직 자리 잡지 않았습니다.',
    '구성원 개인은 AI를 쓰고 있지만, 팀의 일하는 방식은 아직 AI를 넣어 바뀌지 않았습니다.',
    '팀 단위로 일하는 방식이 바뀌었지만, 좋은 사례와 데이터가 회사 전체로 이어지지 않았습니다.',
    '전사로 확산되었지만, 핵심 시스템과 의사결정에 AI가 아직 녹아들지 않았습니다.',
    '다섯 단계를 모두 갖추어, AI를 전제로 일하는 회사로 전환할 준비가 된 상태입니다.'
  ];
  // 단계별로 회사(또는 팀)가 해 볼 일
  var ACTIONS = {
    F: ['AX로 이루려는 목표와 일정을 전 구성원에게 알리고, 진행 상황을 정기적으로 공유합니다.', 'AI 사용 지침(보안·개인정보·책임 범위)을 공식화하고 쉽게 찾을 수 있는 곳에 둡니다.', '업무에 쓸 수 있는 AI 도구를 공식적으로 제공하고, 직무별 기초 교육을 엽니다.'],
    P: ['직무별 실제 업무 자료로 하는 AI 실습을 열어, 모든 구성원이 기본 기능을 익히게 합니다.', '부서별로 "AI로 이만큼 줄었다"는 업무 사례를 모아 공유합니다.', '근무 시간 안에 AI를 배우고 시험해 볼 시간을 공식적으로 보장합니다.'],
    W: ['팀별로 과업 목록을 만들고, AI에게 맡길 과업과 사람이 확인할 단계를 표시합니다.', '팀 업무 절차서에 AI를 쓰는 단계와 검토 단계를 적어 넣습니다.', 'AI를 적용한 업무의 전후(걸린 시간, 오류 수)를 비교해 효과를 확인합니다.'],
    E: ['효과가 확인된 팀 사례를 모아 다른 부서가 그대로 따라 할 수 있는 형태로 공유합니다.', '부서별로 흩어진 업무 데이터를 AI가 안전하게 쓸 수 있도록 연결합니다.', 'AI 시도와 성과를 공식적으로 인정하고, 전사 성과 지표로 측정합니다.'],
    N: ['부서를 넘는 핵심 프로세스 하나를 골라 AI를 전제로 처음부터 다시 설계합니다.', '핵심 업무 시스템에 AI를 연동하고, 사람이 감독할 지점을 정해 일부 단계를 맡겨 봅니다.', '주요 의사결정 회의에 AI 분석 결과를 기본 자료로 올리는 절차를 만듭니다.']
  };
  // 개인이 직접 해 볼 일 (개인 활용·업무 재설계 단계)
  var MY_TIPS = {
    P: ['지금 하는 일 하나를 골라, 이번 주에 AI로 처리해 보세요.', 'AI가 내 업무에 도움이 된 예를 한 줄씩 기록해 두세요.', '한 주에 30분, AI 활용법을 배우는 시간을 일정에 넣어 보세요.'],
    W: ['팀 회의에서 AI에게 맡길 과업 하나를 함께 정해 보자고 제안하세요.', 'AI 결과를 사람이 반드시 확인해야 하는 지점을 팀원과 정해 두세요.', '내가 써 본 AI 활용법을 팀에 짧게 공유해 보세요.']
  };
  // 나와 다른 응답자의 인식 차이를 풀이하는 말. hi = 내가 더 높게 봄, lo = 내가 더 낮게 봄
  var GAP_READ = {
    F: { hi: { why: '내가 알고 있는 목표·지침·도구·교육을 다른 구성원은 모르거나 체감하지 못하고 있을 수 있습니다.',
          act: ['내가 알고 있는 AI 사용 지침과 공식 도구의 위치를 팀에 공유하세요.', '구성원이 잘 모르는 항목을 리더에게 알려, 공지 방식을 바꾸자고 제안하세요.', '교육 기회가 있다면 신청 방법을 동료에게 알려 주세요.'] },
        lo: { why: '다른 구성원은 아는 목표·지침·도구를 내가 놓치고 있거나, 내 부서까지 닿지 않았을 수 있습니다.',
          act: ['사내 공지와 게시판에서 AX 목표와 AI 사용 지침을 찾아 읽어 보세요.', '회사가 공식 제공하는 AI 도구와 교육이 무엇인지 리더나 담당 부서에 물어보세요.', '찾아봐도 없다면, 우리 부서에 닿지 않았다는 점을 리더에게 알리세요.'] } },
    P: { hi: { why: '나는 다른 구성원보다 AI를 더 익숙하게 쓰고 있습니다. 회사 안에서 앞서 가는 쪽입니다.',
          act: ['내가 쓰는 활용법을 동료에게 보여 주는 짧은 시간을 만들어 보세요.', '팀에서 AI 활용을 돕는 역할을 맡아 보세요.', '내가 효과를 본 사례를 기록해, 팀 업무 재설계의 재료로 쓰세요.'] },
        lo: { why: '다른 구성원보다 AI를 업무에 덜 쓰고 있습니다. 출발이 조금 늦었을 뿐, 따라잡기 가장 쉬운 단계입니다.',
          act: ['지금 하는 일 하나를 골라, 이번 주에 AI로 처리해 보세요.', 'AI를 잘 쓰는 동료에게 실제로 쓰는 장면을 보여 달라고 부탁해 보세요.', '회사가 제공하는 교육이나 공식 도구부터 써 보세요.'] } },
    W: { hi: { why: '우리 팀이 다른 팀보다 앞서 있거나, 내가 팀의 상태를 다른 구성원보다 좋게 보고 있습니다.',
          act: ['우리 팀이 AI를 쓰는 방식을 문서로 정리해 다른 팀에 공유하세요.', '팀원들도 같은 생각인지 팀 회의에서 확인해 보세요.', '효과를 숫자(걸린 시간, 오류 수)로 남겨 전사 확산의 근거로 쓰세요.'] },
        lo: { why: '우리 팀이 다른 팀보다 뒤처져 있거나, 내가 팀 안의 변화를 다른 구성원보다 덜 체감하고 있습니다.',
          act: ['팀 회의에서 AI에게 맡길 과업 하나를 함께 정해 보자고 제안하세요.', '앞서 있는 다른 팀의 업무 절차를 빌려 와 우리 팀에 맞춰 보세요.', '팀원 한 명과 짝을 지어 같은 업무에 AI를 써 보고 결과를 나눠 보세요.'] } },
    E: { hi: { why: '내 부서나 내 자리에서는 사례 확산·데이터 연결·성과 인정이 보이지만, 다른 구성원에게는 보이지 않을 수 있습니다.',
          act: ['내가 알고 있는 확산 사례와 데이터 활용 경로를 다른 부서와 나누세요.', '확산이 일부 부서에만 머무는지 리더와 함께 점검해 보세요.', 'AI 성과 인정 제도가 있다면 동료가 신청하도록 알려 주세요.'] },
        lo: { why: '다른 구성원이 보는 사례 확산·데이터 연결·성과 인정이 내 부서에는 닿지 않았을 수 있습니다.',
          act: ['다른 부서에서 효과를 본 AI 사례가 무엇인지 찾아보거나 물어보세요.', '내 업무에 필요한 데이터를 AI에 쓸 수 있는지 담당 부서에 문의하세요.', '우리 부서가 확산에서 빠져 있다면 리더를 통해 참여를 요청하세요.'] } },
    N: { hi: { why: '내가 다루는 시스템이나 업무에서는 AI 내재화가 보이지만, 회사 전체로는 아직 그렇지 않을 수 있습니다.',
          act: ['내가 아는 AI 연동 시스템과 활용 방식을 다른 부서에 알려 주세요.', '감독 아래 AI가 처리하는 단계가 있다면, 사람이 확인하는 지점을 문서로 남겨 두세요.', '이 경험을 다른 프로세스로 넓힐 수 있는지 리더에게 제안하세요.'] },
        lo: { why: '다른 구성원이 보는 시스템 연동과 AI 기반 의사결정이 내 업무에는 아직 닿지 않았을 수 있습니다.',
          act: ['회사의 핵심 시스템에 어떤 AI 기능이 있는지 IT 담당 부서에 물어보세요.', '내 업무 중 시스템 연동으로 줄일 수 있는 반복 작업을 정리해 제안하세요.', '의사결정 자료에 AI 분석을 어떻게 쓰는지 다른 부서 사례를 찾아보세요.'] } }
  };

  // ---------- 상태 ----------
  var state = { view: 'home', page: -1, answers: {}, role: '', started: 0, tab: 'me', me: null, pool: null };

  // ---------- 유틸 ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cleanGroup(g) { return String(g || '').trim().replace(/[^\w가-힣-]/g, '').slice(0, 40); }
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function variance(a) { var m = mean(a); return a.length > 1 ? a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1) : 0; }
  function sd(a) { return Math.sqrt(variance(a)); }
  function r0(v) { return Math.round(v); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function signed(v) { var r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function level(v) { for (var i = 0; i < LEVELS.length; i++) if (v >= LEVELS[i].min) return LEVELS[i].t; return '시작'; }
  function lvlCls(t) { return { '주도': 'l4', '정착': 'l3', '형성': 'l2', '시작': 'l1' }[t]; }
  function nn(a) { return a.filter(function (v) { return v !== null; }); }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
  function newId() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = '';
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < 8; i++) s += A[b[i] % A.length];
    return s;
  }
  function fmtId(id) { return id.slice(0, 4) + '-' + id.slice(4); }
  function josa(w, a, b) { var c = w.charCodeAt(w.length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); }
  function copyBtn(id, small) { return '<button type="button" class="aidx-copy' + (small ? ' small' : '') + '" data-act="copycode" data-code="' + fmtId(id) + '">복사</button>'; }
  function groupLabel(g) { return g ? '회사(그룹) ' + g : '전체 응답자'; }
  function stageTitle(k) { return k ? STAGE_NAMES[k] + '까지 준비됨' : '출발 전 · 1단계 준비 중'; }
  function sc(v) { return v === null ? '–' : r0(v); }

  // ---------- 점수 ----------
  // 단계 점수 0~100 = (응답한 문항 평균 − 1) × 25. '모르겠다'(0)는 빼고, 4문항 이상 응답해야 산출.
  function itemsScore(vals) {
    var ok = vals.filter(function (v) { return v > 0; });
    return ok.length >= Math.min(MIN_ITEMS, vals.length) ? (mean(ok) - 1) * 25 : null;
  }
  // 누적 규칙: 1단계부터 차례로 기준점(60) 이상인 단계까지를 '준비된 단계'로 본다. 판단 보류(null)에서 멈춘다.
  function stageOf(lv) {
    var k = 0;
    while (k < lv.length && lv[k] !== null && lv[k] >= CUT) k++;
    return k;
  }
  function score(a) {
    var lv = STAGES.map(function (_, s) { return itemsScore(a.slice(s * 5, s * 5 + 5)); });
    var unk = STAGES.map(function (_, s) { return a.slice(s * 5, s * 5 + 5).filter(function (v) { return v === 0; }).length; });
    return { lv: lv, unk: unk, stage: stageOf(lv), g: itemsScore(a.slice(NS)), a: a };
  }

  // ---------- 데이터 ----------
  function call(url, opts) {
    var ctl = window.AbortController ? new AbortController() : null, o = opts || {};
    if (ctl) { o.signal = ctl.signal; setTimeout(function () { ctl.abort(); }, 25000); }
    return fetch(url, o).then(function (r) { return r.json(); });
  }
  function localRows() { return load(LS_DATA) || []; }
  function submit(rec) {
    if (PREVIEW) { var rows = localRows(); rows.push(rec); save(LS_DATA, rows); return Promise.resolve(); }
    return call(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) })
      .then(function (j) { if (!j.ok && j.error !== 'duplicate') throw new Error(j.error || '저장 실패'); });
  }
  function fetchPool(group, me) {
    if (PREVIEW) {
      var rows = localRows().filter(function (r) { return !group || (r.group || '') === group; }).map(function (r) {
        return { role: r.role, g: r.group || '', a: r.answers, mine: !!(me && r.id === me.id) };
      });
      return Promise.resolve(withMine(rows, me));
    }
    var u = ENDPOINT + '?action=all&group=' + encodeURIComponent(group) + (me ? '&me=' + encodeURIComponent(me.id) : '');
    return call(u).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return withMine(j.rows.map(function (r) { return { role: r.role, g: r.g || '', a: r.a, mine: !!r.m }; }), me);
    });
  }
  function withMine(rows, me) {
    if (me && !rows.some(function (r) { return r.mine; })) rows.push({ role: me.role, g: me.group || '', a: me.answers, mine: true });
    return rows;
  }
  function fetchOne(id) {
    if (PREVIEW) return Promise.resolve(localRows().filter(function (r) { return r.id === id; })[0] || null);
    return call(ENDPOINT + '?action=one&id=' + encodeURIComponent(id))
      .then(function (j) { return j.ok && j.row ? { id: j.row.id, group: j.row.group, role: j.row.role, answers: j.row.a } : null; });
  }

  // ---------- 회사(집단) 집계 ----------
  function aggregate(rows) {
    var lvMean = STAGES.map(function (_, s) { var v = nn(rows.map(function (r) { return r.lv[s]; })); return v.length ? mean(v) : null; });
    var lvSd = STAGES.map(function (_, s) { return sd(nn(rows.map(function (r) { return r.lv[s]; }))); });
    var unkPct = STAGES.map(function (_, s) {
      var tot = 0, u = 0;
      rows.forEach(function (r) { for (var i = s * 5; i < s * 5 + 5; i++) { tot++; if (r.a[i] === 0) u++; } });
      return tot ? u / tot * 100 : 0;
    });
    var ready = STAGES.map(function (_, s) {
      var v = nn(rows.map(function (r) { return r.lv[s]; }));
      return v.length ? v.filter(function (x) { return x >= CUT; }).length / v.length * 100 : 0;
    });
    return { lvMean: lvMean, lvSd: lvSd, unkPct: unkPct, ready: ready, stage: stageOf(lvMean) };
  }
  // 집단 내 합의도 rwg(j): 균등분포 기대분산(5점 척도 = 2)과 문항 분산 평균을 비교. '모르겠다'는 뺀다.
  function rwgj(rows, from, to) {
    var J = to - from, vars = [];
    for (var i = from; i < to; i++) {
      var v = rows.map(function (r) { return r.a[i]; }).filter(function (x) { return x > 0; });
      if (v.length >= 2) vars.push(variance(v));
    }
    if (vars.length < J) return null;
    var ratio = mean(vars) / 2, k = J * (1 - ratio);
    if (ratio >= 1) return 0;
    return k / (k + ratio);
  }
  function alpha(rows, from, to) {
    var full = rows.filter(function (r) { return r.a.slice(from, to).every(function (v) { return v > 0; }); });
    if (full.length < 10) return null;
    var k = to - from, iv = 0;
    for (var i = from; i < to; i++) iv += variance(full.map(function (r) { return r.a[i]; }));
    var tv = variance(full.map(function (r) { return r.a.slice(from, to).reduce(function (s, v) { return s + v; }, 0); }));
    return tv > 0 ? k / (k - 1) * (1 - iv / tv) : null;
  }
  // 단계 순서 일치율: 다섯 단계 점수가 모두 있는 응답자 중, 앞 단계를 넘지 못했는데 뒤 단계를 넘은 경우가 없는 비율.
  function orderFit(rows) {
    var full = rows.filter(function (r) { return r.lv.every(function (v) { return v !== null; }); });
    if (full.length < 10) return null;
    var ok = full.filter(function (r) {
      var pass = r.lv.map(function (v) { return v >= CUT; });
      for (var j = 1; j < 5; j++) if (pass[j] && !pass[j - 1]) return false;
      return true;
    }).length;
    return { pct: ok / full.length * 100, n: full.length };
  }
  function pearson(x, y) {
    var mx = mean(x), my = mean(y), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }

  // ---------- 그림 ----------
  // 계단 그림: 다섯 단계를 왼쪽 아래에서 오른쪽 위로 쌓고, 준비된 단계까지 색을 채운다.
  function stairs(stage, label) {
    var W = 560, H = 236, sw = 100, sh = 30, x0 = 30, y0 = H - 22;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="axr-stairs" role="img" aria-label="' + esc(label) + '">';
    STAGES.forEach(function (st, i) {
      var x = x0 + i * sw, h = sh * (i + 1), y = y0 - h, on = i < stage, next = i === stage;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (sw - 6) + '" height="' + h + '" rx="6" class="axr-step' + (on ? ' on' : next ? ' next' : '') + '"/>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y - 26) + '" text-anchor="middle" class="axr-snum">' + (i + 1) + '단계</text>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y - 9) + '" text-anchor="middle" class="axr-sname">' + st.name + '</text>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y0 - 10) + '" text-anchor="middle" class="axr-sicon">' + st.icon + '</text>';
    });
    s += '<line x1="' + (x0 - 10) + '" y1="' + y0 + '" x2="' + (x0 + 5 * sw) + '" y2="' + y0 + '" class="axr-base"/>';
    return s + '</svg>';
  }
  // 단계별 막대: 내 점수(또는 회사 평균) 막대 + 비교 눈금 + 기준점 점선
  function stageBars(vals, cmp, cmpLabel, marks) {
    return '<div class="aidx-rank axr-bars">' + STAGES.map(function (st, i) {
      var v = vals[i], st2 = v === null ? '' : v >= CUT ? 'good' : 'warn';
      return '<div class="aidx-rrow ' + st2 + '"><span class="aidx-rname">' + (i + 1) + '. ' + st.name + '</span>' +
        '<span class="aidx-rtrack">' + (v === null ? '' : '<span class="aidx-rbar" style="width:' + v + '%"></span>') +
        '<i class="aidx-rcut" style="left:' + CUT + '%"></i>' +
        (cmp && cmp[i] !== null ? '<i class="aidx-rmean" style="left:' + cmp[i] + '%" data-tip="' + esc(cmpLabel + ' ' + r0(cmp[i]) + '점') + '"></i>' : '') + '</span>' +
        '<span class="aidx-rval">' + sc(v) + '</span>' +
        '<span class="aidx-rtag">' + (marks && marks[i] ? marks[i] : v === null ? '판단 보류' : v >= CUT ? '준비됨' : '보완 필요') + '</span></div>';
    }).join('') + '</div>';
  }
  function kpi(k, v, s) { return '<div class="kpi"><span class="kpi-k">' + k + '</span><span class="kpi-v">' + v + '</span>' + (s ? '<span class="kpi-s">' + s + '</span>' : '') + '</div>'; }
  function lvlChip(v) { if (v === null) return ''; var t = level(v); return '<span class="aidx-lv ' + lvlCls(t) + '">' + t + '</span>'; }

  // ---------- 화면: 대문 ----------
  function previewNote() {
    return PREVIEW ? '<p class="aidx-preview">시험 모드: 응답 저장소가 아직 연결되지 않아, 응답이 이 브라우저에만 저장됩니다.</p>' : '';
  }
  function viewHome() {
    var me = load(LS_ME);
    root.innerHTML = previewNote() +
      '<section class="aidx-home">' +
      '<p class="aidx-lead">우리 회사는 AI를 전제로 일하는 회사로 바뀔 준비가 얼마나 되어 있을까요?<br>기반 마련에서 AI 내재화까지, 다섯 단계로 AX 전환 준비도를 진단합니다.</p>' +
      '<ul class="aidx-meta"><li class="beta">BETA</li><li>27문항</li><li>약 6분</li><li>익명</li></ul>' +
      (GROUP ? '<p class="aidx-group">응답 회사(그룹) <strong>' + esc(GROUP) + '</strong></p>' : '') +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button></div>' +
      '<div class="aidx-actions sub">' +
      '<button type="button" class="aidx-btn" data-act="my">내가 본 우리 회사</button>' +
      '<button type="button" class="aidx-btn" data-act="group">우리 회사 분석결과 보기</button></div>' +
      (me ? '<p class="aidx-small">이 기기에 저장된 내 결과 코드: <code>' + fmtId(me.id) + '</code> ' + copyBtn(me.id, true) + '</p>' : '') +
      '<div class="aidx-gate" id="axr-gate" role="alert" hidden><p><strong id="axr-gate-msg"></strong></p>' +
      '<button type="button" class="aidx-link" data-act="code">다른 기기에서 이미 응답했다면 결과 코드 입력</button></div>' +
      '<form class="aidx-code" id="axr-code" hidden><label for="axr-code-in">결과 코드</label>' +
      '<input id="axr-code-in" autocomplete="off" placeholder="XXXX-XXXX" maxlength="9">' +
      '<button type="submit" class="aidx-btn">결과 보기</button><span class="aidx-err" id="axr-code-err"></span></form>' +
      '</section>' +
      '<section class="aidx-model"><h2 class="aidx-h">무엇을 진단하나요</h2>' +
      '<p><strong>AX(AI 전환)</strong>는 AI 도구를 들여오는 데서 끝나지 않고, 사람이 일하는 방식부터 회사의 업무 체계까지 AI를 전제로 다시 짜는 일입니다. ' +
      '이 진단은 여러 기업 AI 성숙도 모델이 공통으로 제시하는 <strong>기반 마련 → 개인 활용 → 업무 재설계 → 전사 확산 → AI 내재화</strong>의 순서로, 준비가 어디까지 갖추어졌는지 봅니다.</p>' +
      '<ol class="aidx-flow">' + STAGES.map(function (st, i) {
        return '<li><span class="aidx-when"><b>' + (i + 1) + '</b>' + st.ref.replace(/는$/, '') + '</span>' +
          '<span class="aidx-ficon" aria-hidden="true">' + st.icon + '</span>' +
          '<strong class="aidx-fname">' + st.name + '</strong>' +
          '<span class="aidx-fq">' + st.q + '</span>' +
          '<span class="aidx-fex">예) ' + st.ex + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="aidx-fsum"><span>단계별 5문항 → 25문항</span><span>+ 전반 인식 2문항</span><span>= 27문항</span></p>' +
      '<p class="aidx-small">앞 단계가 갖추어져야 다음 단계가 제대로 작동한다고 보고, 1단계부터 차례로 기준(60점)을 넘은 단계까지를 "준비된 단계"로 판정합니다.</p></section>';
  }

  // ---------- 화면: 설문 ----------
  function answered() { return Object.keys(state.answers).length; }
  function viewSurvey() {
    var p = state.page, h = '';
    var done = answered() + (state.role ? 1 : 0), total = NI + 1;
    h += '<div class="aidx-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + (done / total * 100) + '%"></span></div>';
    h += '<p class="aidx-step">' + (p + 2) + ' / ' + (PAGES.length + 1) + '</p>';
    if (p === -1) {
      h += '<h2 class="aidx-h">응답하기 전에</h2>' +
        '<ol class="aidx-guide">' +
        '<li><span class="aidx-gicon" aria-hidden="true">📍</span><strong>지금 상태를 떠올리세요</strong><span>앞으로의 계획이 아니라, 오늘 실제로 갖추어져 있는 것을 기준으로</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🔁</span><strong>주어가 바뀝니다</strong><span>우리 회사 → 나 → 우리 팀 → 우리 회사 순서로, 쪽마다 문장의 주어가 다릅니다</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🤷</span><strong>모르면 "잘 모르겠다"</strong><span>회사 전체에 관한 문항은 잘 모르면 짐작하지 말고 "잘 모르겠다"를 고르세요</span></li>' +
        '</ol>' +
        '<fieldset class="aidx-role"><legend>먼저, 나는</legend><div class="aidx-roles">' +
        ROLES.map(function (r) { return '<label><input type="radio" name="role" value="' + r + '"' + (state.role === r ? ' checked' : '') + '><span>' + r + '</span></label>'; }).join('') +
        '</div></fieldset>';
    } else {
      var items = PAGES[p], st = STAGES[p];
      h += '<h2 class="aidx-h">' + (st ? (p + 1) + '단계 · ' + st.name : '전반 인식') + '</h2>' +
        '<p class="axr-pagehead">' + PAGE_HEAD[p] + ' 각 문장이 <strong>현재 상태</strong>와 얼마나 같은가요?</p>';
      var before = PAGES.slice(0, p).reduce(function (s, x) { return s + x.length; }, 0);
      h += '<ol class="aidx-items">' + items.map(function (it, j) {
        return '<li class="aidx-item" id="q-' + it.code + '"><p class="aidx-q"><span class="aidx-no">' + (before + j + 1) + '</span>' + esc(it.text) + '</p>' +
          '<div class="aidx-scale' + (it.unk ? ' axr-has-unk' : '') + '"><span class="aidx-end">' + SCALE[0] + '</span><div class="aidx-dots" role="radiogroup" aria-label="' + esc(it.text) + '">' + SCALE.map(function (lab, v) {
            return '<label title="' + lab + '"><input type="radio" name="' + it.code + '" value="' + (v + 1) + '" aria-label="' + (v + 1) + ' ' + lab + '"' + (state.answers[it.code] === v + 1 ? ' checked' : '') + '><span>' + (v + 1) + '</span></label>';
          }).join('') + '</div><span class="aidx-end">' + SCALE[4] + '</span>' +
          (it.unk ? '<label class="axr-unk"><input type="radio" name="' + it.code + '" value="0"' + (state.answers[it.code] === 0 ? ' checked' : '') + '><span>' + UNK + '</span></label>' : '') +
          '</div></li>';
      }).join('') + '</ol>';
    }
    var last = p === PAGES.length - 1;
    h += '<div class="aidx-nav"><button type="button" class="aidx-btn" data-act="prev">' + (p === -1 ? '처음으로' : '이전') + '</button>' +
      '<span class="aidx-err" id="axr-err"></span>' +
      '<button type="button" class="aidx-btn primary" data-act="next">' + (last ? '응답 제출' : '다음') + '</button></div>';
    root.innerHTML = previewNote() + '<section class="aidx-survey">' + h + '</section>';
  }
  function pageComplete() {
    if (state.page === -1) return state.role ? null : 'role';
    var miss = PAGES[state.page].filter(function (it) { return state.answers[it.code] === undefined; });
    return miss.length ? miss[0].code : null;
  }

  // ---------- 화면: 제출 완료 / 분석 중 ----------
  function viewDone() {
    var me = state.me;
    root.innerHTML = previewNote() + '<section class="aidx-home">' +
      '<h2 class="aidx-h">응답이 저장되었습니다</h2>' +
      '<p class="aidx-codeline">결과 코드 <code class="aidx-bigcode">' + fmtId(me.id) + '</code>' + copyBtn(me.id) + '</p>' +
      '<p class="aidx-small">다른 기기에서 결과를 다시 볼 때 이 코드가 필요합니다. 복사해 두세요.</p>' +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="analyze">분석 실시</button></div></section>';
  }
  function viewAnalyzing(msg) { root.innerHTML = '<section class="aidx-home"><div class="aidx-spin" aria-hidden="true"></div><p>' + esc(msg) + '</p></section>'; }
  function viewError(msg) {
    root.innerHTML = '<section class="aidx-home"><p class="aidx-err">' + esc(msg) + '</p><div class="aidx-actions"><button type="button" class="aidx-btn" data-act="home">처음으로</button></div></section>';
  }

  // ---------- 분석 실행 ----------
  function scored(r) { var s = score(r.a); s.role = r.role; s.g0 = r.g || ''; s.mine = r.mine; return s; }
  function analyze(tab) {
    state.tab = tab;
    var me = state.me, group = me ? (me.group || '') : GROUP;
    viewAnalyzing(tab === 'me' ? '응답을 분석하고 있습니다' : '회사 응답을 모으고 있습니다');
    var t0 = Date.now();
    fetchPool(group, me).then(function (rows) {
      state.pool = { group: group, rows: rows.map(scored) };
      setTimeout(viewResult, Math.max(0, 700 - (Date.now() - t0)));
    }).catch(function () { viewError('응답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); });
  }

  // ---------- 화면: 결과 ----------
  function tabLabel(full, short) { return '<span class="aidx-tl">' + full + '</span><span class="aidx-ts">' + short + '</span>'; }
  function viewResult() {
    root.innerHTML = previewNote() +
      '<div class="aidx-tabs" role="tablist">' +
      '<button type="button" role="tab" data-tab="me" aria-selected="' + (state.tab === 'me') + '">' + tabLabel('내가 본 우리 회사', '나의 응답') + '</button>' +
      '<button type="button" role="tab" data-tab="group" aria-selected="' + (state.tab === 'group') + '">' + tabLabel('우리 회사 분석결과', '우리 회사') + '</button>' +
      '<button type="button" role="tab" data-tab="compare" aria-selected="' + (state.tab === 'compare') + '">' + tabLabel('응답자 구분별 비교', '구분별 비교') + '</button></div>' +
      '<div role="tabpanel">' + (state.tab === 'me' ? personal() : state.tab === 'group' ? companyReport() : compareReport()) + '</div>' +
      '<p class="report-foot aidx-foot"><strong>BETA 버전</strong>입니다. 준비 기준점(60점)과 단계 순서는 타당화 전의 잠정 기준입니다. 점수 = (응답한 문항 평균 − 1) × 25, 0~100점, "잘 모르겠다"는 점수에서 제외. ' +
      '<button type="button" class="aidx-link" data-act="home">처음으로</button></p>';
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 });
  }

  // 나와 다른 응답자 비교: 단계별 차이(나 − 다른 응답자 평균), 표준화 차이, 차이가 가장 큰 단계와 문항
  function gapLabel(d) {
    if (d === null) return '–';
    var a = Math.abs(d);
    return a < GAP_NOTE ? '비슷함' : (d > 0 ? (a >= GAP_BIG ? '크게 높게 봄' : '높게 봄') : (a >= GAP_BIG ? '크게 낮게 봄' : '낮게 봄'));
  }
  function gapBars(diffs) {
    var R = 50; // 막대 끝 = ±50점
    return '<div class="axr-div">' + STAGES.map(function (st, i) {
      var d = diffs[i], w = d === null ? 0 : Math.min(Math.abs(d), R) / R * 50;
      var cls = d === null ? '' : Math.abs(d) < GAP_NOTE ? 'same' : d > 0 ? 'hi' : 'lo';
      return '<div class="axr-drow ' + cls + '"><span class="axr-dname">' + (i + 1) + '. ' + st.name + '</span>' +
        '<span class="axr-dtrack"><i class="axr-dzero"></i>' + (d === null ? '' : '<span class="axr-dbar" style="' + (d >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w + '%" data-tip="' + esc(st.name + ' · 나 − 다른 응답자 = ' + signed(d) + '점') + '"></span>') + '</span>' +
        '<span class="axr-dval">' + (d === null ? '–' : signed(d)) + '</span><span class="axr-dtag">' + gapLabel(d) + '</span></div>';
    }).join('') + '<div class="axr-drow axr-daxis"><span></span><span class="axr-daxis-in"><i>← 내가 더 낮게 봄</i><i>0</i><i>내가 더 높게 봄 →</i></span><span></span><span></span></div></div>';
  }
  function itemMeanOf(rows, idx) { var v = rows.map(function (r) { return r.a[idx]; }).filter(function (x) { return x > 0; }); return v.length ? mean(v) : null; }

  function personal() {
    var P = state.pool, me = P && P.rows.filter(function (r) { return r.mine; })[0];
    if (!me) {
      return '<section class="aidx-home"><p>아직 이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p>' +
        '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="my">결과 코드 입력</button></div></section>';
    }
    var others = P.rows.filter(function (r) { return !r.mine; }), no = others.length, enough = no >= MIN_N - 1;
    var O = no ? aggregate(others) : null;
    var diffs = STAGES.map(function (_, s) { return O && me.lv[s] !== null && O.lvMean[s] !== null ? me.lv[s] - O.lvMean[s] : null; });
    var unkStages = STAGES.map(function (st, s) { return st.unk ? s : -1; }).filter(function (s) { return s >= 0; });
    var myUnk = unkStages.reduce(function (t, s) { return t + me.unk[s]; }, 0), unkItems = unkStages.length * 5;
    var othersUnk = no ? mean(others.map(function (r) { return unkStages.reduce(function (t, s) { return t + r.unk[s]; }, 0); })) : 0;
    var stageCnt = [0, 0, 0, 0, 0, 0]; others.forEach(function (r) { stageCnt[r.stage]++; });
    var modeStage = stageCnt.indexOf(Math.max.apply(null, stageCnt));
    var higher = others.filter(function (r) { return r.stage > me.stage; }).length, same = others.filter(function (r) { return r.stage === me.stage; }).length;
    var order = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
    var top = order[0], h = '';

    // 1. 내가 본 단계
    var bott = me.stage < 5 ? me.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">내가 본 우리 회사의 AX 준비 단계</p>' +
      '<h2>' + stageTitle(me.stage) + '</h2><p>' + STAGE_DESC[me.stage] + '</p>' +
      (bott >= 0 ? '<p>다음 관문은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>입니다. "' + STAGES[bott].q + '"</p>' : '') +
      (no ? '<p>다른 응답자 ' + no + '명 가운데 <strong>' + r0(same / no * 100) + '%</strong>는 나와 같은 단계로, ' + r0(higher / no * 100) + '%는 더 높은 단계로, ' + r0((no - same - higher) / no * 100) + '%는 더 낮은 단계로 보았습니다.</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(me.stage, '내가 본 준비 단계 ' + me.stage + '단계') + '</div></section>';
    if (!no) return h + '<p class="aidx-note">아직 다른 응답자가 없어 비교할 수 없습니다. 같은 회사(그룹) 링크로 다른 구성원이 응답하면 인식 차이 분석이 나타납니다.</p>' + myPlan(me, null);
    if (!enough) h += '<p class="aidx-note">다른 응답자가 ' + no + '명입니다. ' + (MIN_N - 1) + '명 이상 모이면 비교가 안정됩니다. 지금은 참고용으로 보세요.</p>';

    // 2. 핵심 숫자
    h += '<div class="kpis aidx-kpis">' +
      kpi('내가 본 단계', me.stage + '<small>/ 5단계</small>', STAGE_NAMES[me.stage]) +
      kpi('다른 응답자가 가장 많이 본 단계', modeStage + '<small>/ 5단계</small>', r0(stageCnt[modeStage] / no * 100) + '%가 ' + STAGE_NAMES[modeStage]) +
      kpi('인식 차이가 가장 큰 단계', top ? STAGES[top.s].name : '–', top ? signed(top.d) + '점 · ' + gapLabel(top.d) : '비교할 단계 없음') +
      kpi('"잘 모르겠다"', myUnk + '<small>/ ' + unkItems + '문항</small>', '다른 응답자 평균 ' + f1(othersUnk) + '문항') +
      '</div>';

    // 3. 단계별 인식 차이
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">단계별 인식 차이</h3><p class="panel-sub">나 − 다른 응답자 평균 (점) · 가운데 선이 같음 · ±' + GAP_NOTE + '점 안은 비슷함</p>' + gapBars(diffs) + '</div>' +
      '<div class="panel"><h3 class="panel-title">다른 응답자가 본 준비 단계</h3><p class="panel-sub">다른 응답자 ' + no + '명의 단계 분포 · 진한 막대가 내가 본 단계</p>' +
      '<div class="axr-dist">' + STAGE_NAMES.map(function (nm, k) {
        var p = stageCnt[k] / no * 100;
        return '<div class="axr-distrow' + (k === me.stage ? ' me' : '') + '"><span>' + nm + (k === me.stage ? ' <b>나</b>' : '') + '</span><span class="axr-disttrack"><span style="width:' + p + '%"></span></span><span class="axr-distval">' + stageCnt[k] + '명</span></div>';
      }).join('') + '</div></div></section>';

    h += '<div class="panel"><h3 class="panel-title">단계별 비교표</h3><p class="panel-sub">표준화 차이 = 차이 ÷ 다른 응답자 표준편차 (±0.5 이상이면 뚜렷한 차이) · 위치 = 다른 응답자 중 나보다 낮게 본 비율</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>나</th><th>다른 응답자 평균 (SD)</th><th>차이</th><th>표준화 차이</th><th>위치</th></tr></thead><tbody>' +
      STAGES.map(function (st, s) {
        var col = nn(others.map(function (r) { return r.lv[s]; })), d = diffs[s], sdv = O.lvSd[s];
        var below = me.lv[s] === null || !col.length ? null : col.filter(function (v) { return v < me.lv[s]; }).length / col.length * 100;
        return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(me.lv[s]) + '</strong> ' + lvlChip(me.lv[s]) + '</td><td>' + sc(O.lvMean[s]) + ' (' + r0(sdv) + ')</td>' +
          '<td class="' + (d === null ? '' : d >= GAP_NOTE ? 'up' : d <= -GAP_NOTE ? 'down' : '') + '">' + (d === null ? '–' : signed(d)) + '</td>' +
          '<td>' + (d === null || !sdv ? '–' : f1(d / sdv)) + '</td><td>' + (below === null ? '–' : r0(below) + '%') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    // 4. 차이가 가장 큰 영역과 행동지침
    if (top && Math.abs(top.d) >= GAP_NOTE) {
      var st = STAGES[top.s], dir = top.d > 0 ? 'hi' : 'lo', R = GAP_READ[st.key][dir];
      var itemGaps = ITEMS.slice(top.s * 5, top.s * 5 + 5).map(function (it) {
        var om = itemMeanOf(others, it.idx), my = me.a[it.idx];
        return { it: it, my: my, om: om, d: my > 0 && om !== null ? my - om : null };
      });
      var big = itemGaps.filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 3);
      var unkHere = itemGaps.filter(function (x) { return x.my === 0; });
      var second = order[1] && Math.abs(order[1].d) >= GAP_NOTE ? order[1] : null;
      h += '<section class="aidx-gap ' + (dir === 'hi' ? 'ahead' : 'behind') + '"><p class="aidx-eyebrow">인식 차이가 가장 큰 영역</p>' +
        '<h3>' + st.icon + ' ' + (top.s + 1) + '단계 ' + st.name + ': 다른 응답자보다 ' + r0(Math.abs(top.d)) + '점 ' + (dir === 'hi' ? '높게' : '낮게') + ' 봅니다</h3>' +
        '<div class="aidx-gbars">' +
        '<div class="aidx-grow"><span>나</span><span class="aidx-gtrack"><span style="width:' + me.lv[top.s] + '%"></span></span><b>' + r0(me.lv[top.s]) + '</b></div>' +
        '<div class="aidx-grow act"><span><small>다른 응답자</small></span><span class="aidx-gtrack"><span style="width:' + O.lvMean[top.s] + '%"></span></span><b>' + r0(O.lvMean[top.s]) + '</b></div></div>' +
        '<p><strong>무엇을 뜻하나요?</strong> ' + R.why + '</p>' +
        (big.length ? '<p class="aidx-small">차이가 큰 문항 (나 / 다른 응답자 평균, 1~5점)</p><ul class="aidx-list">' + big.map(function (x) {
          return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">나 ' + x.my + ' / ' + f1(x.om) + ' (' + (x.d > 0 ? '+' : '−') + f1(Math.abs(x.d)) + ')</span></li>';
        }).join('') + '</ul>' : '') +
        (unkHere.length ? '<p class="aidx-small">이 단계에서 내가 "잘 모르겠다"고 답한 문항이 ' + unkHere.length + '개 있습니다. 이 문항들은 점수에서 빠졌으므로, 먼저 사실을 확인해 보세요.</p>' : '') +
        '<p class="aidx-small">행동지침</p><ol class="aidx-list axr-steps">' + R.act.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
        (second ? '<p class="aidx-small">두 번째로 차이가 큰 단계는 <strong>' + STAGES[second.s].name + '</strong>(' + signed(second.d) + '점, ' + gapLabel(second.d) + ')입니다. ' + GAP_READ[STAGES[second.s].key][second.d > 0 ? 'hi' : 'lo'].why + '</p>' : '') +
        '</section>';
    } else {
      h += '<section class="aidx-gap match"><p class="aidx-eyebrow">인식 차이</p><h3>다른 응답자와 비슷하게 보고 있습니다</h3>' +
        '<p>모든 단계에서 차이가 ' + GAP_NOTE + '점 미만입니다. 회사의 상태를 다른 구성원과 같은 눈으로 보고 있으므로, 회사 전체의 병목 단계를 함께 채우는 데 힘을 보태면 됩니다.</p></section>';
    }
    return h + myPlan(me, aggregate(P.rows));
  }

  // 내가 직접 해 볼 일: 개인 활용·업무 재설계 점수가 낮을 때, 그리고 회사 병목 단계
  function myPlan(me, A) {
    var tips = '';
    [1, 2].forEach(function (s) {
      if (me.lv[s] === null || me.lv[s] >= 80) return;
      var low = ITEMS.slice(s * 5, s * 5 + 5).filter(function (it) { return me.a[it.idx] > 0 && me.a[it.idx] <= 3; }).slice(0, 2);
      tips += '<li class="aidx-plan-card"><p class="aidx-plan-h">' + STAGES[s].icon + ' ' + STAGES[s].name + ' <span class="aidx-muted">' + sc(me.lv[s]) + '점</span></p>' +
        '<ul class="aidx-list">' + MY_TIPS[STAGES[s].key].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        (low.length ? '<p class="aidx-small">아직 갖추지 못했다고 답한 것</p><ul class="aidx-list aidx-check">' + low.map(function (it) { return '<li>' + esc(it.text) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    });
    if (A && A.stage < 5) {
      var b = A.stage;
      tips += '<li class="aidx-plan-card keep"><p class="aidx-plan-h">' + STAGES[b].icon + ' 회사 전체의 병목 · ' + (b + 1) + '단계 ' + STAGES[b].name + '</p>' +
        '<p class="aidx-small">응답자 전체 평균으로 본 병목입니다. 팀과 회사에 이렇게 제안해 보세요.</p>' +
        '<ul class="aidx-list">' + ACTIONS[STAGES[b].key].slice(0, 2).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></li>';
    }
    return tips ? '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">나의 행동 추천</p><h3>지금 내가 해 볼 수 있는 것</h3>' +
      '<p>개인 활용과 업무 재설계는 내가 직접 바꿀 수 있는 부분이고, 나머지 단계는 팀과 회사에 제안할 부분입니다.</p></div><ol class="aidx-plan-list">' + tips + '</ol></section>' : '';
  }

  function companyReport() {
    var P = state.pool, rows = P.rows, n = rows.length;
    if (!n) return '<section class="aidx-home"><p>아직 응답이 없습니다.</p></section>';
    var A = aggregate(rows), h = '';
    h += '<p class="aidx-context">' + esc(groupLabel(P.group)) + ' · 응답 ' + n + '명' + (PREVIEW ? ' (시험 모드: 이 브라우저의 응답만)' : '') + '</p>';
    if (n < MIN_N) h += '<p class="aidx-note">아직 응답이 ' + n + '명입니다. ' + MIN_N + '명 이상 모이면 회사 결과가 안정됩니다. 회사 전체를 대표하려면 부서와 직급이 고르게 응답해야 합니다.</p>';

    // 1. 한 줄 요약
    var bott = A.stage < 5 ? A.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">우리 회사의 AX 준비 단계</p>' +
      '<h2>' + stageTitle(A.stage) + '</h2><p>' + STAGE_DESC[A.stage] + '</p>' +
      (bott >= 0 ? '<p>병목은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>(평균 ' + sc(A.lvMean[bott]) + '점)입니다. 이 단계에서 "준비됨"(60점 이상)이라고 본 응답자는 ' + r0(A.ready[bott]) + '%입니다.</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(A.stage, '회사 준비 단계 ' + A.stage + '단계') + '</div></section>';

    // 2. 핵심 숫자
    var g = nn(rows.map(function (r) { return r.g; }));
    var unkOrg = mean(STAGES.map(function (st, s) { return st.unk ? A.unkPct[s] : null; }).filter(function (v) { return v !== null; }));
    h += '<div class="kpis aidx-kpis">' +
      kpi('응답자', n + '<small>명</small>', esc(groupLabel(P.group))) +
      kpi('준비된 단계', A.stage + '<small>/ 5단계</small>', bott >= 0 ? '병목: ' + STAGES[bott].name : '전 단계 준비') +
      kpi('전반 인식', g.length ? r0(mean(g)) + '<small>/ 100</small>' : '–', 'AX 의지·역량에 대한 인식 (G1·G2)') +
      kpi('"잘 모르겠다"', r0(unkOrg) + '<small>%</small>', '회사 주어 문항(1·4·5단계) 평균') +
      '</div>';

    // 3. 단계별 프로파일
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">단계별 회사 평균</h3><p class="panel-sub">0~100점 · 점선은 준비 기준 60점</p>' +
      stageBars(A.lvMean, null, '', A.lvMean.map(function (v, i) { return v === null ? '판단 보류' : r0(A.ready[i]) + '% 준비'; })) +
      '<p class="aidx-small">오른쪽 비율은 그 단계를 60점 이상으로 본 응답자 비율입니다.</p></div>' +
      '<div class="panel"><h3 class="panel-title">단계별 수준 분포</h3><p class="panel-sub">각 단계에서 시작·형성·정착·주도 수준으로 본 응답자 비율</p>' +
      '<div class="legend">' + ['시작', '형성', '정착', '주도'].map(function (t) { return '<span class="lg"><span class="aidx-sw ' + lvlCls(t) + '"></span>' + t + '</span>'; }).join('') + '</div>' +
      '<div class="aidx-stack">' + STAGES.map(function (st, s) {
        var cnt = { '시작': 0, '형성': 0, '정착': 0, '주도': 0 }, m = 0;
        rows.forEach(function (r) { if (r.lv[s] !== null) { cnt[level(r.lv[s])]++; m++; } });
        return '<div class="aidx-srow"><span class="aidx-sname">' + (s + 1) + '. ' + st.name + '</span><div class="aidx-sbar">' + (m ? ['시작', '형성', '정착', '주도'].map(function (t) {
          var p = cnt[t] / m * 100;
          return p ? '<span class="' + lvlCls(t) + '" style="width:' + p + '%" data-tip="' + esc(st.name + ' · ' + t + ' ' + cnt[t] + '명 (' + Math.round(p) + '%)') + '">' + (p >= 9 ? Math.round(p) : '') + '</span>' : '';
        }).join('') : '') + '</div></div>';
      }).join('') + '</div></div></section>';

    // 4. 기초 통계
    h += '<div class="panel"><h3 class="panel-title">단계별 기초 통계</h3>' +
      '<p class="panel-sub">합의도 rwg(j)는 회사를 주어로 묻는 단계(1·4·5단계)에서, 신뢰도 α는 "모르겠다" 없이 응답한 사람이 10명 이상일 때 표시</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>평균</th><th>SD</th><th>준비됨</th><th>모르겠다</th><th>합의도</th><th>α</th></tr></thead><tbody>' +
      STAGES.map(function (st, s) {
        var rw = st.unk && n >= MIN_N ? rwgj(rows, s * 5, s * 5 + 5) : null, al = alpha(rows, s * 5, s * 5 + 5);
        return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(A.lvMean[s]) + '</strong></td><td>' + r0(A.lvSd[s]) + '</td><td>' + r0(A.ready[s]) + '%</td>' +
          '<td>' + (st.unk ? r0(A.unkPct[s]) + '%' : '–') + '</td><td>' + (rw === null ? '–' : f2(rw)) + '</td><td>' + (al === null ? '–' : f2(al)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="aidx-small">합의도가 .70 이상이면 구성원들이 회사 상태를 비슷하게 보고 있어 평균을 회사의 상태로 읽을 수 있습니다. 낮으면 부서나 직급에 따라 경험이 다르다는 뜻이므로 "응답자 구분별 비교"를 함께 보세요. "모르겠다"가 30%를 넘는 단계는 회사가 그 내용을 구성원에게 충분히 알리지 않았다는 신호입니다.</p></div>';

    // 5. 갖춘 것과 비어 있는 것
    var im = ITEMS.slice(0, NS).map(function (it) {
      var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; });
      return { it: it, m: v.length ? mean(v) : null };
    }).filter(function (x) { return x.m !== null; }).sort(function (a, b) { return b.m - a.m; });
    function itemList(list) { return '<ul class="aidx-list">' + list.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + STAGES[Math.floor(x.it.idx / 5)].name + ' · ' + f1(x.m) + '</span></li>'; }).join('') + '</ul>'; }
    var unkTop = ITEMS.slice(0, NS).filter(function (it) { return it.unk; }).map(function (it) {
      return { it: it, p: rows.filter(function (r) { return r.a[it.idx] === 0; }).length / n * 100 };
    }).sort(function (a, b) { return b.p - a.p; }).slice(0, 3).filter(function (x) { return x.p > 0; });
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">가장 잘 갖춘 것과 가장 비어 있는 것</h3><p class="panel-sub">문항 평균 (1~5점, "모르겠다" 제외)</p>' +
      '<p class="aidx-small">가장 잘 갖춘 것</p>' + itemList(im.slice(0, 3)) +
      '<p class="aidx-small">가장 비어 있는 것</p>' + itemList(im.slice(-3).reverse()) + '</div>' +
      '<div class="panel"><h3 class="panel-title">구성원이 잘 모르는 것</h3><p class="panel-sub">"잘 모르겠다" 응답 비율이 높은 문항</p>' +
      (unkTop.length ? '<ul class="aidx-list">' + unkTop.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + r0(x.p) + '%</span></li>'; }).join('') + '</ul>'
        : '<p>"잘 모르겠다" 응답이 없습니다.</p>') + '</div></section>';

    // 6. 다음 단계로 가려면
    if (bott >= 0) {
      var ahead = [bott, bott + 1].filter(function (s) { return s < 5; });
      h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">다음 단계로 가려면</p><h3>' + josa(STAGES[bott].name, '을', '를') + ' 먼저 채우세요</h3>' +
        '<p>앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작습니다. 병목 단계부터 우선순위를 두세요.</p></div>' +
        '<ol class="aidx-plan-list">' + ahead.map(function (s, i) {
          var low = ITEMS.slice(s * 5, s * 5 + 5).map(function (it) { var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; }); return { it: it, m: v.length ? mean(v) : 9 }; })
            .sort(function (a, b) { return a.m - b.m; }).slice(0, 2);
          return '<li class="aidx-plan-card' + (i ? ' keep' : '') + '"><p class="aidx-plan-h"><span class="aidx-prio">' + (i + 1) + '</span>' + STAGES[s].icon + ' ' + (s + 1) + '단계 ' + STAGES[s].name +
            ' <span class="aidx-muted">평균 ' + sc(A.lvMean[s]) + '점 · 책임: ' + STAGES[s].owner + '</span></p>' +
            '<ul class="aidx-list">' + ACTIONS[STAGES[s].key].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
            '<p class="aidx-small">점수가 가장 낮은 항목</p><ul class="aidx-list aidx-check">' + low.map(function (x) { return '<li>' + esc(x.it.text) + '</li>'; }).join('') + '</ul></li>';
        }).join('') + '</ol></section>';
    }

    // 7. 도구 점검 (타당화용)
    var fit = orderFit(rows);
    var both = rows.filter(function (r) { return r.g !== null && r.lv.every(function (v) { return v !== null; }); });
    var rg = both.length >= 10 ? pearson(both.map(function (r) { return mean(r.lv); }), both.map(function (r) { return r.g; })) : null;
    h += '<div class="panel"><h3 class="panel-title">진단 도구 점검</h3><p class="panel-sub">응답이 쌓이면 이 진단의 가정이 맞는지 확인하는 지표 (10명 이상일 때 표시)</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>지표</th><th>값</th><th>뜻</th></tr></thead><tbody>' +
      '<tr><td>단계 순서 일치율</td><td>' + (fit ? r0(fit.pct) + '% (' + fit.n + '명)' : '–') + '</td><td>단계 순서를 거스른 응답이 없는 비율 (높을수록 순서 가정이 맞음)</td></tr>' +
      '<tr><td>단계 점수와 전반 인식의 상관</td><td>' + (rg === null ? '–' : 'r = ' + f2(rg)) + '</td><td>단계 점수가 AX 의지·역량 인식과 함께 움직이는 정도</td></tr>' +
      '</tbody></table></div></div>';
    return h;
  }

  function compareReport() {
    var P = state.pool, rows = P.rows, n = rows.length;
    var groups = ROLES.map(function (rl) { return { rl: rl, rs: rows.filter(function (r) { return r.role === rl; }) }; }).filter(function (x) { return x.rs.length >= MIN_ROLE; });
    var h = '<p class="aidx-context">' + esc(groupLabel(P.group)) + ' · 응답 ' + n + '명</p>';
    if (groups.length < 2) {
      return h + '<section class="aidx-home"><p>응답자 구분별 비교는 두 구분 이상에서 각각 ' + MIN_ROLE + '명 이상 응답해야 볼 수 있습니다. 응답자를 알아볼 수 없도록 인원이 적은 구분은 표시하지 않습니다.</p></section>';
    }
    var aggs = groups.map(function (x) { return { rl: x.rl, n: x.rs.length, A: aggregate(x.rs) }; });
    h += '<div class="panel"><h3 class="panel-title">응답자 구분별 단계 평균</h3><p class="panel-sub">' + MIN_ROLE + '명 이상인 구분만 표시 · 마지막 열은 그 구분의 평균으로 판정한 준비 단계</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>n</th>' + STAGES.map(function (st, i) { return '<th>' + (i + 1) + '. ' + st.name + '</th>'; }).join('') + '<th>준비 단계</th></tr></thead><tbody>' +
      aggs.map(function (x) {
        return '<tr><td>' + x.rl + '</td><td>' + x.n + '</td>' + x.A.lvMean.map(function (v) { return '<td>' + sc(v) + '</td>'; }).join('') + '<td><strong>' + x.A.stage + '단계</strong></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    // 경영진·리더와 실무자의 인식 차이
    var staff = aggs.filter(function (x) { return x.rl === ROLES[0]; })[0];
    var lead = aggs.filter(function (x) { return x.rl === ROLES[2]; })[0] || aggs.filter(function (x) { return x.rl === ROLES[1]; })[0];
    if (staff && lead) {
      var diffs = STAGES.map(function (_, s) { return staff.A.lvMean[s] !== null && lead.A.lvMean[s] !== null ? lead.A.lvMean[s] - staff.A.lvMean[s] : null; });
      var big = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })[0];
      h += '<section class="aidx-gap ' + (big && Math.abs(big.d) >= 15 ? 'ahead' : 'match') + '"><p class="aidx-eyebrow">' + lead.rl + '과 실무자의 인식 차이</p>' +
        '<h3>' + (big && Math.abs(big.d) >= 15 ? josa(STAGES[big.s].name, '을', '를') + ' 두고 보는 눈이 ' + r0(Math.abs(big.d)) + '점 다릅니다' : '단계마다 인식 차이가 크지 않습니다') + '</h3>' +
        '<div class="aidx-gbars">' + STAGES.map(function (st, s) {
          return '<div class="aidx-grow"><span>' + st.name + '</span><span class="aidx-gtrack"><span style="width:' + (lead.A.lvMean[s] || 0) + '%"></span></span><b>' + sc(lead.A.lvMean[s]) + '</b></div>' +
            '<div class="aidx-grow act"><span><small>실무자</small></span><span class="aidx-gtrack"><span style="width:' + (staff.A.lvMean[s] || 0) + '%"></span></span><b>' + sc(staff.A.lvMean[s]) + '</b></div>';
        }).join('') + '</div>' +
        '<p>위 막대는 ' + lead.rl + ', 아래 막대는 실무자의 평균입니다. ' +
        (big && big.d >= 15 ? '리더가 실무자보다 준비 상태를 높게 보고 있습니다. 리더가 마련했다고 생각하는 제도나 도구가 현장까지 닿지 않았을 수 있습니다.'
          : big && big.d <= -15 ? '실무자가 리더보다 준비 상태를 높게 보고 있습니다. 현장의 준비가 리더에게 보이지 않거나, 리더가 기대하는 수준이 더 높을 수 있습니다.'
          : '같은 상태를 비슷하게 보고 있어, 회사 평균을 공통의 출발점으로 삼을 수 있습니다.') + '</p></section>';
    }
    h += '<p class="aidx-small">응답 수가 적으면 차이가 커 보여도 우연일 수 있습니다. 표본이 작을 때는 참고용으로 보세요.</p>';
    return h;
  }

  // ---------- 이벤트 ----------
  function render() { if (state.view === 'home') viewHome(); else if (state.view === 'survey') viewSurvey(); }
  function go(view) { state.view = view; render(); window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 }); }

  root.addEventListener('change', function (e) {
    var t = e.target;
    state.pending = null;
    if (t.name === 'role') state.role = t.value;
    else if (t.type === 'radio') {
      state.answers[t.name] = +t.value;
      var li = t.closest('.aidx-item'); if (li) li.classList.remove('is-miss');
    }
    var bar = root.querySelector('.aidx-progress');
    if (bar) { var done = answered() + (state.role ? 1 : 0); bar.firstChild.style.width = (done / (NI + 1) * 100) + '%'; bar.setAttribute('aria-valuenow', done); }
  });

  root.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-tab]');
    if (tb) { if (!state.pool) { analyze(tb.dataset.tab); return; } state.tab = tb.dataset.tab; viewResult(); return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'start') { state.answers = {}; state.role = ''; state.pending = null; state.page = -1; state.started = Date.now(); go('survey'); }
    else if (act === 'home') { go('home'); }
    else if (act === 'prev') { if (state.page === -1) go('home'); else { state.page--; go('survey'); } }
    else if (act === 'next') {
      var miss = pageComplete(), err = document.getElementById('axr-err');
      if (miss) {
        err.textContent = miss === 'role' ? '응답자 구분을 골라 주세요.' : '응답하지 않은 문항이 있습니다.';
        if (miss !== 'role') {
          PAGES[state.page].forEach(function (it) { if (state.answers[it.code] === undefined) document.getElementById('q-' + it.code).classList.add('is-miss'); });
          document.getElementById('q-' + miss).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (state.page < PAGES.length - 1) { state.page++; go('survey'); return; }
      var rec = state.pending || { id: newId(), group: GROUP, role: state.role, answers: ITEMS.map(function (it) { return state.answers[it.code]; }), seconds: Math.round((Date.now() - state.started) / 1000) };
      state.pending = rec; b.disabled = true; err.textContent = '저장하는 중…';
      submit(rec).then(function () {
        state.me = rec; state.pending = null; state.pool = null; save(LS_ME, rec); viewDone();
      }).catch(function () { b.disabled = false; err.textContent = '저장하지 못했습니다. 잠시 뒤 응답 제출을 다시 눌러 주세요.'; });
    }
    else if (act === 'analyze') { analyze('me'); }
    else if (act === 'copycode') {
      var code = b.dataset.code;
      var ok = function () { b.textContent = '복사했습니다'; b.classList.add('is-done'); setTimeout(function () { b.textContent = '복사'; b.classList.remove('is-done'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, function () { window.prompt('결과 코드를 복사하세요', code); });
      else window.prompt('결과 코드를 복사하세요', code);
    }
    else if (act === 'my' || act === 'group') {
      var me = load(LS_ME), tab = act === 'my' ? 'me' : 'group';
      if (me) { state.me = me; state.pool = null; analyze(tab); return; }
      state.gateTab = tab;
      if (state.view !== 'home' || !document.getElementById('axr-gate')) go('home');
      document.getElementById('axr-gate-msg').textContent = (tab === 'me' ? '내 결과는' : '우리 회사 분석결과는') + ' 먼저 진단을 완료해야 볼 수 있습니다.';
      document.getElementById('axr-gate').hidden = false;
      document.getElementById('axr-code').hidden = true;
    }
    else if (act === 'code') { document.getElementById('axr-code').hidden = false; document.getElementById('axr-code-in').focus(); }
  });

  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'axr-code') return;
    e.preventDefault();
    var id = document.getElementById('axr-code-in').value.toUpperCase().replace(/[^A-Z0-9]/g, ''), err = document.getElementById('axr-code-err');
    if (id.length !== 8) { err.textContent = '코드 8자리를 입력해 주세요.'; return; }
    err.textContent = '찾는 중…';
    fetchOne(id).then(function (rec) {
      if (!rec) { err.textContent = '해당 코드의 응답이 없습니다.'; return; }
      state.me = rec; state.pool = null; save(LS_ME, rec); analyze(state.gateTab || 'me');
    }).catch(function () { err.textContent = '불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; });
  });

  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  render();
})();

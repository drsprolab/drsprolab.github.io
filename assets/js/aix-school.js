// 우리학교 AIX 전환 준비·성숙도 진단: 설문 응답 수집 → 분석 실시 → 종합 결과 / 내가 본 우리 학교 / 우리 학교 분석결과 / 응답자 구분별 비교.
// 우리 학교 = 같은 학교 이름으로 응답한 사람들. 종합 결과는 같은 학교급의 다른 학교(학교 이름은 받지 않고 번호만)와도 비교한다.
// 문항: 기반 마련 → 교원 활용 → 수업·평가 재설계 → 학교 확산 → AI 내재화, 5단계 × 6문항 + 전반 인식 2문항 = 32문항, 5점 동의 척도.
// 학교를 주어로 묻는 단계(기반 마련·학교 확산·AI 내재화)와 전반 인식 문항에는 '잘 모르겠다'(값 0)를 둔다. 0은 점수 계산에서 빼고, 단계별 '모르겠다' 비율로 따로 보고한다.
// 응답 저장: #axr의 data-endpoint(Google Apps Script 웹앱, tools/aix-school/)가 있으면 그곳에,
// 비어 있으면 시험 모드로, 응답을 이 브라우저에만 저장하고 이 브라우저의 응답끼리만 분석한다.
// 화면 구성과 분석 로직은 기업용 AX 전환 준비도 진단(assets/js/ax-readiness.js)과 같다.
(function () {
  var root = document.getElementById('axr');
  if (!root) return;
  var tip = document.getElementById('axr-tip');
  var ENDPOINT = (root.dataset.endpoint || '').trim();
  var PREVIEW = !ENDPOINT;
  var GROUP = cleanGroup(new URLSearchParams(location.search).get('group'));
  var LS_ME = 'aixs-v1-me' + (PREVIEW ? '-test' : ''), LS_DATA = 'aixs-v1-test-responses';
  var MIN_N = 5;   // 학교 결과·비교를 보여 줄 최소 응답 수
  var MIN_ROLE = 3; // 응답자 구분별 비교에 넣을 최소 인원
  var MIN_SCHOOL = 3; // 같은 학교급 비교에 넣을 다른 학교의 최소 응답 수

  // ---------- 단계와 문항 ----------
  // ref: 문항의 주어(참조 대상). 한 단계 안에서는 주어를 통일한다.
  // unk: '잘 모르겠다' 허용 여부. 응답자가 직접 알기 어려운 학교 수준 단계에만 둔다.
  var STAGES = [
    { key: 'F', name: '기반 마련', ref: '우리 학교는', icon: '🧱', q: '학교는 AIX를 시작할 바탕을 깔았나?', unk: true,
      def: '학교가 AI 활용 교육 목표를 세우고, 지침·승인 도구·기반 시설·연수를 갖추며, 방침을 교원과 함께 정한 상태.',
      ex: '교육계획에 AI 활용 목표가 있고, 학교 지침과 승인된 도구 목록이 있다',
      owner: '교장·교감과 학교 운영위원회', basis: 'CoSN K-12 Gen AI 성숙도 Emerging · 미국 교육부 AI 툴킷 · UNESCO 생성형 AI 지침 · SELFIE 리더십·인프라' },
    { key: 'P', name: '교원 활용', ref: '나는', icon: '🧑‍🏫', q: '나는 수업과 업무에 AI를 쓰고 있나?', unk: false,
      def: '교원 한 사람 한 사람이 수업 준비와 업무에 AI를 쓰고, 요청을 구체화하며, 내용과 학생 정보를 확인하고, 효과를 확인하는 상태.',
      ex: '수업 자료 준비에 AI를 쓰고, 정확성과 학생 개인정보를 확인한다',
      owner: '교원 개인', basis: 'UNESCO 교사 AI 역량 프레임워크 · 학생 사용 전 교원 사용부터(Plante Moran 2단계) · 개인 변화 준비도(Holt 외)' },
    { key: 'W', name: '수업·평가 재설계', ref: '우리 협의회는', icon: '🧩', q: '협의회의 수업과 평가가 AI를 고려해 바뀌었나?', unk: false,
      def: '학년·교과 협의회가 AI와 교사의 역할을 나누어 수업을 설계하고, 학생의 AI 사용 범위를 정하며, 평가 방식을 바꾸고, 효과와 문제 사례를 함께 확인하는 상태.',
      ex: '과제마다 AI 사용 범위가 정해져 있고, 과정 중심 평가로 바꾸었다',
      owner: '학년·교과 협의회', basis: 'SELFIE 교수학습·평가 · TeachAI 학업 윤리 · Plante Moran 3단계(사용 공개·과정 중시) · UNESCO 인간 주도성' },
    { key: 'E', name: '학교 확산', ref: '우리 학교는', icon: '🔗', q: '좋은 수업이 학교 전체로 퍼지고 있나?', unk: true,
      def: '교원 학습공동체와 수업 공개로 사례가 퍼지고, 행정 업무에도 AI가 쓰이며, 데이터를 보호 기준 안에서 활용하고, 효과를 학교 차원에서 점검하며, 학부모에게 알리는 상태.',
      ex: '교원 학습공동체가 운영되고, 학교 자체 평가에서 AI 활용 효과를 점검한다',
      owner: '교감·부장교사와 교원 학습공동체', basis: 'SELFIE 협력·전문성 개발 · CoSN Developing · Plante Moran 3단계 · AI 중점학교 사례 공유' },
    { key: 'N', name: 'AI 내재화', ref: '우리 학교는', icon: '⚙️', q: 'AI가 학교의 가르침과 배움에 녹아들었나?', unk: true,
      def: '학생 AI 리터러시가 교육과정에 편성되고, 학생이 AI를 학습 도구로 쓰는 수업과 AI 기반 맞춤 지도가 일상이 되며, 위험 점검·형평성 지원·학교 운영 의사결정까지 AI를 전제로 이루어지는 상태.',
      ex: '학년별 AI 리터러시 교육과정이 있고, 학생이 AI를 학습 도구로 쓰는 수업이 일상적이다',
      owner: '학교 전체 (관리자·교원·학생·학부모)', basis: 'CoSN Mature · Plante Moran 4단계 · OECD·EC AILit · UNESCO 학생 AI 역량 · AI 중점학교 요건' }
  ];
  var RAW = [
    ['F1', '우리 학교는 AI 활용으로 이루려는 교육 목표를 학교 교육계획에 구체적으로 제시했다.'],
    ['F2', '우리 학교는 AI 활용 수업에 필요한 기반 시설(예: 학생용 기기, 무선 네트워크)을 갖추고 있다.'],
    ['F3', '우리 학교는 AI 사용 기준(예: 학생 개인정보 입력 금지, 학생 사용 연령, 과제에서의 허용 범위)을 담은 학교 지침을 갖추고 있다.'],
    ['F4', '우리 학교는 학교(또는 교육청)가 승인한 AI 도구 목록을 교원에게 안내한다.'],
    ['F5', '우리 학교는 교원이 수업에 AI를 활용하는 방법을 익히는 연수 기회를 제공한다.'],
    ['F6', '우리 학교는 AI 활용 방침을 정하는 과정에서 교원의 의견을 수렴했다.'],
    ['P1', '나는 매주 반복되는 내 업무(예: 수업 자료 준비, 행정 문서 작성) 가운데 적어도 한 가지를 AI로 처리하고 있다.'],
    ['P2', '나는 AI에게 일을 맡기기 전에 그 일이 AI에 적합한지 따져 본다.'],
    ['P3', '나는 AI에게 요청할 때 결과물이 갖출 조건(예: 학년 수준, 성취기준, 분량)을 구체적으로 제시한다.'],
    ['P4', '나는 AI가 만든 수업 자료를 쓰기 전에 내용의 정확성을 교육과정이나 원자료와 대조해 확인한다.'],
    ['P5', '나는 AI에 자료를 입력하기 전에 학생 개인정보(예: 이름, 성적, 상담 내용)가 들어 있는지 확인한다.'],
    ['P6', '나는 AI 활용으로 달라진 내 수업이나 업무의 변화(예: 줄어든 준비 시간, 늘어난 개별 피드백)를 확인한다.'],
    ['W1', '우리 협의회는 수업에서 AI가 맡을 활동과 교사가 판단할 활동을 구분해 수업을 설계한다.'],
    ['W2', '우리 협의회는 과제와 평가마다 학생의 AI 사용 허용 범위를 정해 두었다.'],
    ['W3', '우리 협의회는 학생의 AI 사용을 고려해 평가 방식을 바꾸었다(예: 과정 중심 평가, 구술 확인 추가).'],
    ['W4', '우리 협의회는 AI를 활용한 수업의 효과를 학생의 학습 결과(예: 과제 완성도, 성취 수준)로 확인한다.'],
    ['W5', '우리 협의회에는 효과가 확인된 AI 활용 수업 방법이 누구나 쓸 수 있는 형태(예: 공유 지도안, 활동지)로 정리되어 있다.'],
    ['W6', '우리 협의회는 AI 활용 수업에서 생긴 문제 사례(예: 부정확한 정보, 부적절한 결과물)를 함께 검토한다.'],
    ['E1', '우리 학교는 AI 활용 수업을 주제로 한 교원 학습공동체를 운영한다.'],
    ['E2', '우리 학교는 한 교과(학년)에서 효과가 확인된 AI 활용 수업 사례를 다른 교과(학년)와 나누는 자리(예: 수업 공개, 사례 발표회)를 운영한다.'],
    ['E3', '우리 학교는 반복되는 행정 업무(예: 공문 초안, 가정통신문)를 AI로 처리하는 방법을 학교 공통으로 정해 쓰고 있다.'],
    ['E4', '우리 학교에서는 정해진 보호 기준에 따라 여러 교과 교사가 학생 학습 데이터를 함께 학생 지도에 활용한다.'],
    ['E5', '우리 학교는 학교 자체 평가에서 AI 활용 교육의 효과를 정기적으로 점검한다.'],
    ['E6', '우리 학교는 AI 활용 교육의 내용과 방침을 학부모에게 정기적으로 안내한다.'],
    ['N1', '우리 학교는 학생의 AI 리터러시 교육(예: AI의 원리, 윤리, 책임 있는 사용)을 학년별 교육과정에 체계적으로 편성했다.'],
    ['N2', '우리 학교에서는 학생이 AI를 학습 도구로 직접 활용하는 수업이 여러 교과에서 일상적으로 이루어진다.'],
    ['N3', '우리 학교에서는 교사가 AI의 학습 분석 결과를 참고해 학생별 맞춤 지도를 한다.'],
    ['N4', '우리 학교는 사용 중인 AI 도구의 위험(예: 부적절한 콘텐츠, 편향, 개인정보 유출)을 정해진 주기로 점검한다.'],
    ['N5', '우리 학교는 가정 환경 때문에 학생 간 AI 활용 기회에 차이가 생기지 않도록 지원한다(예: 기기 대여, 방과 후 이용 공간).'],
    ['N6', '우리 학교는 학교 운영의 주요 의사결정(예: 교육과정 편성, 학생 지원 계획)에 AI 분석 결과를 근거 자료로 활용한다.'],
    ['G1', '우리 학교 교원들은 AIX 전환을 해내려는 의지가 강하다.'],
    ['G2', '우리 학교는 AIX 전환을 해낼 역량을 갖추고 있다.']
  ];
  var K = 6, NS = 30; // 단계당 문항 수, 단계 문항 수
  var ITEMS = RAW.map(function (r, i) {
    var s = i < NS ? STAGES[Math.floor(i / K)] : null;
    return { code: r[0], text: r[1], idx: i, unk: s ? s.unk : true };
  });
  var NI = ITEMS.length; // 전체 문항 수
  var SCALE = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
  var UNK = '잘 모르겠다';
  var ROLES = ['교사', '부장교사', '교감·교장', '기타 교원'];
  // 배경 문항: 학교급과 AI 사용 빈도. 비교 분석의 보조 변수로만 쓰고, 개인을 식별할 수 있는 정보는 묻지 않는다.
  var JOBS = ['초등학교', '중학교', '고등학교', '특수학교', '기타'];
  var FREQS = ['거의 쓰지 않음', '월 1~3회', '주 1~2회', '주 3회 이상', '매일'];
  var BG = [{ key: 'role', label: '직위', opts: ROLES }, { key: 'job', label: '학교급', opts: JOBS }, { key: 'freq', label: '최근 한 달 동안 수업이나 업무에 AI를 쓴 빈도', opts: FREQS }];
  // 제시 순서: 단계 순서대로, 한 쪽에 한 단계(주어가 같은 문항끼리) → 전반 인식
  var PAGES = STAGES.map(function (_, s) { return ITEMS.slice(s * K, s * K + K); });
  PAGES.push(ITEMS.slice(NS));
  var PAGE_HEAD = ['우리 학교 전체에 대한 문장입니다.', '나 자신에 대한 문장입니다.', '내가 주로 참여하는 학년 협의회(초등) 또는 교과 협의회(중등)에 대한 문장입니다.', '우리 학교 전체에 대한 문장입니다.', '우리 학교의 교육과정과 학교 운영에 대한 문장입니다.', '마지막으로, 우리 학교 전체를 떠올려 주세요.'];

  // ---------- 수준·단계 ----------
  var LEVELS = [{ min: 80, t: '주도' }, { min: 60, t: '정착' }, { min: 40, t: '형성' }, { min: 0, t: '시작' }];
  var CUT = 60;      // 단계 '준비 완료' 기준점(잠정)
  var MIN_ITEMS = 4; // 단계 점수를 내려면 6문항 중 이만큼 응답(모르겠다 제외)해야 함
  var GAP_NOTE = 10, GAP_BIG = 20; // 나와 다른 응답자의 차이: 눈여겨볼 차이, 큰 차이(점)
  var STAGE_NAMES = ['출발 전', '1단계 · 기반 마련', '2단계 · 교원 활용', '3단계 · 수업·평가 재설계', '4단계 · 학교 확산', '5단계 · AI 내재화'];
  var STAGE_DESC = [
    'AIX를 시작할 바탕(교육 목표·지침·승인 도구·기반 시설·연수)부터 갖추어야 하는 단계입니다.',
    '학교가 출발선은 마련했지만, 교원이 수업 준비와 업무에 AI를 쓰는 일이 아직 자리 잡지 않았습니다.',
    '교원 개인은 AI를 쓰고 있지만, 협의회 단위의 수업과 평가는 아직 AI를 고려해 바뀌지 않았습니다.',
    '협의회 단위로 수업과 평가가 바뀌었지만, 좋은 사례와 운영 방식이 학교 전체로 이어지지 않았습니다.',
    '학교 전체로 확산되었지만, 학생의 배움과 학교 운영에 AI가 아직 녹아들지 않았습니다.',
    '다섯 단계를 모두 갖추어, AI를 전제로 가르치고 배우는 학교로 전환할 준비가 된 상태입니다.'
  ];
  // 단계별로 학교(또는 협의회)가 해 볼 일
  var ACTIONS = {
    F: ['학교 교육계획에 AI 활용으로 이루려는 교육 목표를 구체적으로 적고, 교원과 함께 정합니다.', '학생 개인정보·사용 연령·과제 허용 범위를 담은 학교 AI 지침을 만들어 누구나 찾을 수 있게 둡니다.', '승인된 AI 도구 목록과 연수 기회를 교원에게 안내하고, 기기·네트워크 부족 지점을 점검합니다.'],
    P: ['교과별로 실제 수업 자료를 만들며 익히는 짧은 AI 실습 연수를 엽니다.', '"AI로 준비 시간이 이만큼 줄었다"는 교원 사례를 모아 공유합니다.', '학생 개인정보를 AI에 넣지 않는 기준을 연수 첫머리에서 반복해 안내합니다.'],
    W: ['협의회에서 단원별로 AI가 맡을 활동과 교사가 판단할 활동을 표시한 지도안을 함께 만듭니다.', '과제와 평가마다 학생의 AI 사용 허용 범위를 정해 학생에게 미리 알립니다.', 'AI 사용을 고려해 과정 중심 평가와 구술 확인을 넣고, 효과를 학생 결과물로 비교합니다.'],
    E: ['AI 활용 수업을 주제로 한 교원 학습공동체를 만들고, 학기마다 수업 공개를 엽니다.', '공문 초안·가정통신문처럼 반복되는 행정 업무의 AI 활용 방법을 학교 공통으로 정합니다.', '학교 자체 평가에 AI 활용 교육 효과 지표를 넣고, 결과를 학부모에게 안내합니다.'],
    N: ['학년별 AI 리터러시(원리·윤리·책임 있는 사용) 교육 내용을 교육과정에 편성합니다.', '사용 중인 AI 도구의 위험(부적절한 콘텐츠·편향·개인정보)을 학기마다 점검하는 절차를 만듭니다.', '기기 대여와 방과 후 이용 공간으로 가정 환경에 따른 AI 활용 격차를 줄입니다.']
  };
  // 학교 발전 전략(종합 결과 6번): 단계마다 3개. 담당·기간·행동 요령 3단계·점검 지표를 함께 둔다.
  var STRATEGIES = {
    F: [
      { t: 'AI 활용 교육 목표를 학교 교육계획에 넣기', who: '교장·교감, 교육과정부', when: '다음 학기 교육계획 수립 전 2~4주',
        steps: ['교원 의견과 협의회 논의를 모아 "AI로 무엇을 바꿀지" 학교 목표 2~3개로 정합니다(예: 수업 준비 시간 20% 절감, 과정 중심 평가 확대).', '목표마다 담당 부서와 학기 말 확인 방법을 정해 교육계획서에 적습니다.', '교직원 회의에서 목표를 발표하고 학교 누리집과 공유 폴더에 게시합니다.'],
        kpi: '교육계획서에 측정할 수 있는 AI 활용 목표 2개 이상' },
      { t: '한 쪽짜리 학교 AI 사용 지침 만들기', who: '교감, 정보부장, 학생부', when: '4주',
        steps: ['교육청 지침과 승인 도구 목록을 바탕으로 학생 개인정보 입력 금지, 학생 사용 연령, 과제 허용 범위를 한 쪽으로 정리합니다.', '부장 회의와 학생·학부모 의견 수렴을 거쳐 확정합니다.', '교무실·교실·누리집에 게시하고, 학기 초 교직원 연수와 학생 오리엔테이션에서 안내합니다.'],
        kpi: '1단계 "잘 모르겠다" 응답 비율 10% 이하' },
      { t: '승인 도구·기기·기초 연수 정비', who: '정보부, 행정실', when: '한 학기',
        steps: ['승인된 AI 도구 목록과 계정 발급 방법을 한 장 안내문으로 만들어 배포합니다.', '학생용 기기와 무선망이 부족한 교실을 점검해 보완 계획을 세웁니다.', '교과별 2시간 기초 연수를 학기 초에 엽니다.'],
        kpi: '승인 도구 계정 보유 교원 비율, 기초 연수 이수율 80% 이상' }
    ],
    P: [
      { t: '교과별 실습형 AI 연수 열기', who: '연구부, 교과 대표 교사', when: '월 1회, 한 학기',
        steps: ['다음 주에 쓸 실제 수업 자료(활동지·평가 문항)를 AI로 만들어 보는 90분 실습을 교과별로 엽니다.', '학년 수준과 성취기준을 넣어 요청하는 법, 교과서와 대조해 확인하는 법을 함께 연습합니다.', '만든 자료를 공유 폴더에 올려 서로 써 보고 고칩니다.'],
        kpi: '매주 수업 준비에 AI를 쓰는 교원 비율' },
      { t: '"AI로 줄인 시간" 사례 모으고 나누기', who: '부장교사', when: '학기 중 상시',
        steps: ['교원마다 AI로 처리한 업무와 줄어든 시간을 한 줄씩 적는 공유 시트를 만듭니다.', '월말 교직원 회의에서 사례 3개를 5분씩 소개합니다.', '효과가 큰 사례는 학교 공통 방법으로 정리해 신규·전입 교원에게 안내합니다.'],
        kpi: '공유된 사례 수, 교원 1인당 월 절감 시간' },
      { t: '학생 개인정보 보호 습관 들이기', who: '정보부장', when: '학기 초, 이후 분기마다',
        steps: ['AI에 넣으면 안 되는 정보(이름·성적·상담 내용) 예시를 한 장으로 만들어 교무실에 붙입니다.', '연수 첫 10분에 익명화(이름 → 학생A) 실습을 합니다.', '분기마다 짧은 점검 문항으로 실천 여부를 확인합니다.'],
        kpi: 'P5 문항 학교 평균 4점 이상' }
    ],
    W: [
      { t: '단원별 AI 활용 지도안 함께 설계하기', who: '학년·교과 협의회', when: '협의회 월 1회',
        steps: ['다음 단원 하나를 골라 AI가 맡을 활동과 교사가 판단할 활동을 표시한 지도안을 함께 만듭니다.', '한 교사가 먼저 수업하고, 협의회에서 학생 결과물을 보며 고칩니다.', '고친 지도안과 활동지를 협의회 공유 폴더에 올립니다.'],
        kpi: '협의회별 학기당 공동 설계 지도안 2개 이상' },
      { t: '과제마다 AI 사용 허용 범위 정하기', who: '교과 협의회', when: '학기 초',
        steps: ['수행평가와 과제마다 AI 사용을 "금지 / 아이디어만 / 초안까지 / 자유" 가운데 하나로 정합니다.', '허용 범위와 AI 사용 기록 방법을 과제 안내문에 적어 학생에게 미리 알립니다.', '학기 말에 위반·혼란 사례를 모아 기준을 고칩니다.'],
        kpi: 'AI 허용 범위가 적힌 과제 비율 100%' },
      { t: '과정 중심 평가로 바꾸기', who: '교과 협의회, 연구부', when: '한 학기',
        steps: ['결과물만 보는 과제 하나를 골라 초안·수정 과정·구술 확인을 평가에 넣습니다.', '평가 기준표에 "자기 말로 설명하기" 항목을 추가합니다.', '바꾼 평가의 학생 성취를 이전 학기와 비교해 협의회에서 검토합니다.'],
        kpi: '과정 중심 평가를 적용한 과목 수' }
    ],
    E: [
      { t: 'AI 수업 교원 학습공동체 운영하기', who: '교감, 학습공동체 대표 교사', when: '격주, 한 학기',
        steps: ['관심 있는 교원 5~8명으로 학습공동체를 만들고 학기 주제를 하나 정합니다.', '모임마다 한 명이 AI 활용 수업을 시연하고 함께 고칩니다.', '학기 말 수업 공개로 다른 교원에게 결과를 나눕니다.'],
        kpi: '학습공동체 참여 교원 비율, 학기당 수업 공개 횟수' },
      { t: '행정 업무 AI 활용 방법을 학교 공통으로 정하기', who: '교무부, 행정실', when: '2개월',
        steps: ['공문 초안·가정통신문·회의록처럼 반복되는 업무 3가지를 고릅니다.', '업무마다 검증된 요청문과 확인 절차(개인정보 확인 포함)를 한 장으로 정리합니다.', '공유 폴더에 두고 신규·전입 교원 연수에 넣습니다.'],
        kpi: '공통 방법이 있는 행정 업무 수, 업무 처리 시간' },
      { t: '학교 자체 평가에 넣고 학부모에게 알리기', who: '교육과정부', when: '학기 말',
        steps: ['학교 자체 평가에 AI 활용 교육 지표(수업 적용 수, 학생 만족도)를 넣습니다.', '이 진단을 학기마다 다시 실시해 단계 점수의 변화를 확인합니다.', '결과와 다음 학기 계획을 가정통신문으로 학부모에게 안내합니다.'],
        kpi: '자체 평가 지표 포함 여부, 진단 재실시 응답률' }
    ],
    N: [
      { t: '학년별 AI 리터러시 교육과정 편성하기', who: '교육과정부, 정보 교사', when: '다음 학년도 교육과정 편성 시기',
        steps: ['학년별로 AI의 원리·윤리·책임 있는 사용 가운데 다룰 내용을 정합니다.', '창의적 체험활동·정보·교과 연계 가운데 어느 시간에 넣을지 배정합니다.', '학기 말에 학생 AI 리터러시를 점검해 효과를 확인합니다.'],
        kpi: '학년별 AI 리터러시 편성 시수' },
      { t: '사용 중인 AI 도구의 위험 정기 점검', who: '정보부, 학교운영위원회', when: '학기마다',
        steps: ['학교에서 쓰는 AI 도구 목록과 도구별 담당 교원을 정리합니다.', '부적절한 콘텐츠·편향·개인정보 위험을 점검표로 확인합니다.', '문제가 있으면 사용 중단이나 대체 도구를 정해 공지합니다.'],
        kpi: '점검을 마친 도구 비율 100%' },
      { t: '가정 환경에 따른 AI 활용 격차 줄이기', who: '교육복지 담당, 행정실', when: '한 학기',
        steps: ['가정에 기기나 인터넷이 없는 학생을 파악합니다.', '기기 대여와 방과 후 이용 공간(도서실·컴퓨터실)을 운영합니다.', '지원받은 학생의 AI 활용 수업 참여를 확인합니다.'],
        kpi: '지원 대상 학생의 기기 확보 비율' }
    ]
  };
  // 교원이 직접 해 볼 일 (교원 활용·수업·평가 재설계 단계)
  var MY_TIPS = {
    P: ['이번 주 수업 자료 하나를 AI의 도움을 받아 만들어 보세요.', 'AI에게 요청할 때 학년 수준과 성취기준을 꼭 함께 적어 보세요.', 'AI가 만든 자료는 교과서나 원자료와 한 번 대조한 뒤 쓰세요.'],
    W: ['협의회에서 다음 단원의 AI 사용 허용 범위를 함께 정해 보자고 제안하세요.', '내가 써 본 AI 활용 수업 방법을 지도안이나 활동지로 정리해 나눠 보세요.', 'AI 활용 수업에서 생긴 문제 사례를 협의회에서 함께 검토해 보세요.']
  };
  // 나와 다른 응답자의 인식 차이를 풀이하는 말. hi = 내가 더 높게 봄, lo = 내가 더 낮게 봄
  var GAP_READ = {
    F: { hi: { why: '내가 알고 있는 학교 지침·승인 도구·연수를 다른 교원은 모르거나 체감하지 못하고 있을 수 있습니다.',
          act: ['내가 알고 있는 학교 AI 지침과 승인 도구 목록의 위치를 동료 교원에게 알려 주세요.', '교원들이 잘 모르는 항목을 교감·부장교사에게 알려, 안내 방식을 바꾸자고 제안하세요.', '연수 기회가 있다면 신청 방법을 협의회에 공유하세요.'] },
        lo: { why: '다른 교원은 아는 학교 지침·승인 도구·연수를 내가 놓치고 있거나, 내 학년·교과까지 안내가 닿지 않았을 수 있습니다.',
          act: ['학교 교육계획과 공지에서 AI 활용 목표와 지침을 찾아 읽어 보세요.', '승인된 AI 도구 목록과 연수 기회를 교무부나 정보부에 물어보세요.', '찾아봐도 없다면, 안내가 닿지 않았다는 점을 협의회에서 이야기해 보세요.'] } },
    P: { hi: { why: '나는 다른 교원보다 AI를 더 익숙하게 쓰고 있습니다. 학교 안에서 앞서 가는 쪽입니다.',
          act: ['내가 쓰는 활용법을 협의회에서 짧게 시연해 보세요.', '교원 학습공동체에서 AI 활용을 돕는 역할을 맡아 보세요.', '효과를 본 수업 사례를 기록해 협의회의 수업 재설계 재료로 쓰세요.'] },
        lo: { why: '다른 교원보다 수업과 업무에 AI를 덜 쓰고 있습니다. 출발이 조금 늦었을 뿐, 따라잡기 가장 쉬운 단계입니다.',
          act: ['이번 주 수업 자료 하나를 AI의 도움을 받아 만들어 보세요.', 'AI를 잘 쓰는 동료 교원에게 실제로 쓰는 장면을 보여 달라고 부탁해 보세요.', '학교가 안내하는 연수와 승인 도구부터 써 보세요.'] } },
    W: { hi: { why: '우리 협의회가 다른 협의회보다 앞서 있거나, 내가 협의회의 상태를 다른 교원보다 좋게 보고 있습니다.',
          act: ['우리 협의회의 AI 활용 수업과 평가 방식을 정리해 다른 협의회와 나누세요.', '협의회 교원들도 같은 생각인지 다음 협의회에서 확인해 보세요.', '효과를 학생 결과물로 남겨 학교 확산의 근거로 쓰세요.'] },
        lo: { why: '우리 협의회가 다른 협의회보다 뒤처져 있거나, 내가 협의회 안의 변화를 다른 교원보다 덜 체감하고 있습니다.',
          act: ['다음 협의회에서 한 단원의 AI 사용 허용 범위를 함께 정해 보자고 제안하세요.', '앞서 있는 다른 협의회의 지도안과 평가 방식을 빌려 와 우리 교과에 맞춰 보세요.', '동료 교원 한 명과 같은 단원에서 AI 활용 수업을 해 보고 결과를 나눠 보세요.'] } },
    E: { hi: { why: '내 주변에서는 학습공동체·사례 공유·행정 업무 활용이 보이지만, 다른 교원에게는 보이지 않을 수 있습니다.',
          act: ['내가 참여한 학습공동체와 수업 공개 소식을 다른 학년·교과와 나누세요.', '확산이 일부 교원에게만 머무는지 교감·부장교사와 함께 점검해 보세요.', '행정 업무 AI 활용 방법을 아직 모르는 동료에게 알려 주세요.'] },
        lo: { why: '다른 교원이 보는 학습공동체·사례 공유·행정 업무 활용이 내 학년·교과에는 닿지 않았을 수 있습니다.',
          act: ['학교에서 운영 중인 교원 학습공동체와 수업 공개 일정을 확인해 참여해 보세요.', '행정 업무에 쓰는 학교 공통 AI 활용 방법이 있는지 교무부에 물어보세요.', '우리 학년·교과가 확산에서 빠져 있다면 협의회를 통해 참여를 요청하세요.'] } },
    N: { hi: { why: '내 수업이나 학급에서는 AI 내재화가 보이지만, 학교 전체로는 아직 그렇지 않을 수 있습니다.',
          act: ['내 수업에서 학생이 AI를 학습 도구로 쓰는 방식을 다른 교원과 나누세요.', 'AI 학습 분석을 참고해 지도한 사례를 기록해, 교사가 판단한 지점을 남겨 두세요.', '이 경험을 학년별 AI 리터러시 교육과정 편성에 반영하자고 제안하세요.'] },
        lo: { why: '다른 교원이 보는 AI 리터러시 교육과정과 AI 기반 맞춤 지도가 내 수업에는 아직 닿지 않았을 수 있습니다.',
          act: ['학교 교육과정에 편성된 AI 리터러시 교육 내용을 확인해 보세요.', '학생이 AI를 학습 도구로 쓰는 다른 교과의 수업을 참관해 보세요.', '내 수업에서 쓸 수 있는 승인된 AI 학습 도구가 있는지 정보부에 물어보세요.'] } }
  };

  // ---------- 상태 ----------
  var state = { view: 'home', page: -1, answers: {}, role: '', job: '', freq: '', org: '', started: 0, tab: 'report', me: null, pool: null, peers: null };

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
  // 비교 집단 이름: 학교 이름이 있으면 같은 학교, 없으면 링크의 그룹, 둘 다 없으면 전체
  function groupLabel(P) { return P.org ? '우리 학교 ' + P.org : P.group ? '학교(그룹) ' + P.group : '전체 응답자'; }
  // 같은 학교 판단: 띄어쓰기·대소문자·문장부호 차이는 같은 학교로 본다(apps-script.gs의 normOrg_와 같은 규칙).
  function normOrg(s) { return String(s || '').toLowerCase().replace(/[\s.,·()\[\]'"-]/g, ''); }
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
    var lv = STAGES.map(function (_, s) { return itemsScore(a.slice(s * K, s * K + K)); });
    var unk = STAGES.map(function (_, s) { return a.slice(s * K, s * K + K).filter(function (v) { return v === 0; }).length; });
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
  // org가 있으면 같은 학교 응답만, 없으면 group(비면 전체).
  function fetchPool(group, me, org) {
    if (PREVIEW) {
      var rows = localRows().filter(function (r) { return org ? normOrg(r.org) === normOrg(org) : !group || (r.group || '') === group; }).map(function (r) {
        return { role: r.role, job: r.job || '', freq: r.freq || '', g: r.group || '', a: r.answers, mine: !!(me && r.id === me.id) };
      });
      return Promise.resolve(withMine(rows, me));
    }
    var u = ENDPOINT + '?action=all' + (org ? '&org=' + encodeURIComponent(org) : '&group=' + encodeURIComponent(group)) + (me ? '&me=' + encodeURIComponent(me.id) : '');
    return call(u).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return withMine(j.rows.map(function (r) { return { role: r.role, job: r.j || '', freq: r.f || '', g: r.g || '', a: r.a, mine: !!r.m }; }), me);
    });
  }
  function withMine(rows, me) {
    if (me && !rows.some(function (r) { return r.mine; })) rows.push({ role: me.role, job: me.job || '', freq: me.freq || '', g: me.group || '', a: me.answers, mine: true });
    return rows;
  }
  // 같은 학교급의 다른 학교 응답. 학교 이름 대신 학교 번호(s)만 받는다.
  function fetchPeers(job, org) {
    if (PREVIEW) {
      var ids = {}, k = 0;
      return Promise.resolve(localRows().filter(function (r) { var o = normOrg(r.org); return r.job === job && o && o !== normOrg(org); }).map(function (r) {
        var o = normOrg(r.org); if (!(o in ids)) ids[o] = ++k;
        return { role: r.role, job: r.job, freq: r.freq || '', a: r.answers, s: ids[o] };
      }));
    }
    return call(ENDPOINT + '?action=peers&job=' + encodeURIComponent(job) + '&org=' + encodeURIComponent(org)).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return j.rows.map(function (r) { return { role: r.role, job: r.j || '', freq: r.f || '', a: r.a, s: r.s }; });
    });
  }
  function fetchOne(id) {
    if (PREVIEW) return Promise.resolve(localRows().filter(function (r) { return r.id === id; })[0] || null);
    return call(ENDPOINT + '?action=one&id=' + encodeURIComponent(id))
      .then(function (j) { return j.ok && j.row ? { id: j.row.id, group: j.row.group, role: j.row.role, job: j.row.j || '', freq: j.row.f || '', org: j.row.org || '', answers: j.row.a } : null; });
  }

  // ---------- 학교(집단) 집계 ----------
  function aggregate(rows) {
    var lvMean = STAGES.map(function (_, s) { var v = nn(rows.map(function (r) { return r.lv[s]; })); return v.length ? mean(v) : null; });
    var lvSd = STAGES.map(function (_, s) { return sd(nn(rows.map(function (r) { return r.lv[s]; }))); });
    var unkPct = STAGES.map(function (_, s) {
      var tot = 0, u = 0;
      rows.forEach(function (r) { for (var i = s * K; i < s * K + K; i++) { tot++; if (r.a[i] === 0) u++; } });
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
  // 단계별 막대: 내 점수(또는 학교 평균) 막대 + 비교 눈금 + 기준점 점선
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
      '<p class="aidx-lead">우리 학교는 AI를 전제로 가르치고 배우는 학교로 바뀔 준비가 얼마나 되어 있을까요?<br>기반 마련에서 AI 내재화까지, 다섯 단계로 학교 AIX 준비 성숙도를 진단합니다.</p>' +
      '<ul class="aidx-meta"><li class="beta">BETA</li><li>32문항</li><li>약 7분</li><li>익명</li></ul>' +
      (GROUP ? '<p class="aidx-group">응답 학교(그룹) <strong>' + esc(GROUP) + '</strong></p>' : '') +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button></div>' +
      '<div class="aidx-actions sub">' +
      '<button type="button" class="aidx-btn" data-act="report">나의 종합 결과 보기</button>' +
      '<button type="button" class="aidx-btn" data-act="group">우리 학교 분석결과 보기</button></div>' +
      (me ? '<p class="aidx-small">이 기기에 저장된 내 결과 코드: <code>' + fmtId(me.id) + '</code> ' + copyBtn(me.id, true) + '</p>' : '') +
      '<div class="aidx-gate" id="axr-gate" role="alert" hidden><p><strong id="axr-gate-msg"></strong></p>' +
      '<button type="button" class="aidx-link" data-act="code">다른 기기에서 이미 응답했다면 결과 코드 입력</button></div>' +
      '<form class="aidx-code" id="axr-code" hidden><label for="axr-code-in">결과 코드</label>' +
      '<input id="axr-code-in" autocomplete="off" placeholder="XXXX-XXXX" maxlength="9">' +
      '<button type="submit" class="aidx-btn">결과 보기</button><span class="aidx-err" id="axr-code-err"></span></form>' +
      '</section>' +
      '<section class="aidx-model"><h2 class="aidx-h">무엇을 진단하나요</h2>' +
      '<p><strong>학교 AIX(AI 전환)</strong>는 AI 도구를 들여오는 데서 끝나지 않고, 교원의 수업 준비부터 수업과 평가, 학생의 배움과 학교 운영까지 AI를 전제로 다시 짜는 일입니다. ' +
      '이 진단은 학교·교육청용 AI 성숙도 모델(CoSN, SELFIE 등)이 공통으로 제시하는 <strong>기반 마련 → 교원 활용 → 수업·평가 재설계 → 학교 확산 → AI 내재화</strong>의 순서로, 준비가 어디까지 갖추어졌는지 봅니다.</p>' +
      '<ol class="aidx-flow">' + STAGES.map(function (st, i) {
        return '<li><span class="aidx-when"><b>' + (i + 1) + '</b>' + st.ref.replace(/는$/, '') + '</span>' +
          '<span class="aidx-ficon" aria-hidden="true">' + st.icon + '</span>' +
          '<strong class="aidx-fname">' + st.name + '</strong>' +
          '<span class="aidx-fq">' + st.q + '</span>' +
          '<span class="aidx-fex">예) ' + st.ex + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="aidx-fsum"><span>단계별 6문항 → 30문항</span><span>+ 전반 인식 2문항</span><span>= 32문항</span></p>' +
      '<p class="aidx-small">앞 단계가 갖추어져야 다음 단계가 제대로 작동한다고 보고, 1단계부터 차례로 기준(60점)을 넘은 단계까지를 "준비된 단계"로 판정합니다.</p></section>';
  }

  // ---------- 화면: 설문 ----------
  function answered() { return Object.keys(state.answers).length; }
  function bgDone() { return BG.filter(function (b) { return state[b.key]; }).length; }
  function viewSurvey() {
    var p = state.page, h = '';
    var done = answered() + bgDone(), total = NI + BG.length;
    h += '<div class="aidx-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + (done / total * 100) + '%"></span></div>';
    h += '<p class="aidx-step">' + (p + 2) + ' / ' + (PAGES.length + 1) + '</p>';
    if (p === -1) {
      h += '<h2 class="aidx-h">응답하기 전에</h2>' +
        '<ol class="aidx-guide">' +
        '<li><span class="aidx-gicon" aria-hidden="true">📍</span><strong>지금 상태를 떠올리세요</strong><span>앞으로의 계획이 아니라, 최근 6개월 동안 직접 경험하거나 확인한 사실을 기준으로</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🔁</span><strong>주어가 바뀝니다</strong><span>우리 학교 → 나 → 우리 협의회 → 우리 학교 순서로, 쪽마다 문장의 주어가 다릅니다</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🤷</span><strong>모르면 "잘 모르겠다"</strong><span>학교 전체에 관한 문항은 잘 모르면 짐작하지 말고 "잘 모르겠다"를 고르세요</span></li>' +
        '</ol>' +
        BG.map(function (b) {
          return '<fieldset class="aidx-role" id="bg-' + b.key + '"><legend>' + b.label + '</legend><div class="aidx-roles">' +
            b.opts.map(function (r) { return '<label><input type="radio" name="' + b.key + '" value="' + r + '"' + (state[b.key] === r ? ' checked' : '') + '><span>' + r + '</span></label>'; }).join('') +
            '</div></fieldset>' +
            // 학교급 바로 아래에 학교 이름(필수)
            (b.key === 'job' ? '<div class="aidx-org"><label for="axr-org-in">학교 이름</label>' +
              '<input id="axr-org-in" name="org" maxlength="40" autocomplete="organization" value="' + esc(state.org) + '">' +
              '<p class="aidx-hint">예) 대한초등학교 / 대한중학교 / 대한고등학교</p></div>' : '');
        }).join('');
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
    if (state.page === -1) {
      // 화면 순서대로 확인: 직위 → 학교급 → 학교 이름 → AI 사용 빈도
      for (var i = 0; i < BG.length; i++) {
        if (!state[BG[i].key]) return 'bg:' + BG[i].label;
        if (BG[i].key === 'job' && !state.org.trim()) return 'org';
      }
      return null;
    }
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
  function scored(r) { var s = score(r.a); s.role = r.role; s.job = r.job; s.freq = r.freq; s.g0 = r.g || ''; s.mine = r.mine; s.s = r.s; return s; }
  // 우리 학교 = 나와 같은 학교 이름으로 응답한 사람들(학교 이름이 없는 응답은 링크의 그룹). 같은 학교급의 다른 학교 응답도 함께 불러온다.
  function analyze(tab) {
    state.tab = tab;
    var me = state.me, org = me && normOrg(me.org) ? me.org : '', group = org ? '' : me ? (me.group || '') : GROUP;
    viewAnalyzing(tab === 'me' ? '응답을 분석하고 있습니다' : '학교 응답을 모으고 있습니다');
    var t0 = Date.now();
    // 다른 학교 응답은 학교급마다 받아 합친다. 학교 번호(s)는 학교급마다 따로 매겨지므로 앞에 학교급을 붙여 구분한다.
    var peersP = org ? Promise.all(JOBS.map(function (j) { return fetchPeers(j, org).then(function (rs) { rs.forEach(function (r) { r.s = j + ':' + r.s; }); return rs; }); }))
      .then(function (lists) { return [].concat.apply([], lists); }) : Promise.resolve([]);
    Promise.all([fetchPool(group, me, org), peersP]).then(function (res) {
      state.pool = { group: group, org: org, rows: res[0].map(scored) };
      state.peers = res[1].map(scored);
      setTimeout(viewResult, Math.max(0, 700 - (Date.now() - t0)));
    }).catch(function () { viewError('응답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); });
  }

  // ---------- 화면: 결과 ----------
  function tabLabel(full, short) { return '<span class="aidx-tl">' + full + '</span><span class="aidx-ts">' + short + '</span>'; }
  function viewResult() {
    root.innerHTML = previewNote() +
      '<div class="aidx-tabs" role="tablist">' +
      '<button type="button" role="tab" data-tab="report" aria-selected="' + (state.tab === 'report') + '">' + tabLabel('종합 결과', '종합') + '</button>' +
      '<button type="button" role="tab" data-tab="me" aria-selected="' + (state.tab === 'me') + '">' + tabLabel('내가 본 우리 학교', '나의 응답') + '</button>' +
      '<button type="button" role="tab" data-tab="group" aria-selected="' + (state.tab === 'group') + '">' + tabLabel('우리 학교 분석결과', '우리 학교') + '</button>' +
      '<button type="button" role="tab" data-tab="compare" aria-selected="' + (state.tab === 'compare') + '">' + tabLabel('응답자 구분별 비교', '구분별 비교') + '</button></div>' +
      '<div role="tabpanel">' + (state.tab === 'report' ? fullReport() : state.tab === 'me' ? personal() : state.tab === 'group' ? companyReport() : compareReport()) + '</div>' +
      '<p class="report-foot aidx-foot"><strong>BETA 버전</strong>입니다. 준비 기준점(60점)과 단계 순서는 타당화 전의 잠정 기준이며, 단계는 교원 인식을 바탕으로 한 추정입니다. 공식 성숙도 판정에는 문서·지표 같은 증거 확인을 함께 쓰세요. 점수 = (응답한 문항 평균 − 1) × 25, 0~100점, "잘 모르겠다"는 점수에서 제외. ' +
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

  // ---------- 종합 결과: 나의 준비도 → 우리 학교 준비도 → 나와 학교의 차이 → 행동 조언 → 같은 학교급 다른 학교와 비교 → 학교 행동 조언 ----------
  // 점수가 있는 단계를 높은 순으로 정렬해 강점 2개, 약점 2개를 고른다(단계가 적으면 겹치지 않게 줄인다).
  function strongWeak(lv) {
    var o = lv.map(function (v, s) { return { v: v, s: s }; }).filter(function (x) { return x.v !== null; }).sort(function (a, b) { return b.v - a.v; });
    return { strong: o.slice(0, 2), weak: o.slice(Math.max(2, o.length - 2)).reverse() };
  }
  // 한 단계 안에서 값이 가장 높은(또는 낮은) 문항. valOf(idx)가 null이면 뺀다.
  function pickItem(s, valOf, low) {
    var c = ITEMS.slice(s * K, s * K + K).map(function (it) { return { it: it, v: valOf(it.idx) }; }).filter(function (x) { return x.v !== null && x.v > 0; });
    c.sort(function (a, b) { return low ? a.v - b.v : b.v - a.v; });
    return c[0] || null;
  }
  function swPanel(title, sub, sw, valOf, scale) {
    function li(x, low) {
      var p = pickItem(x.s, valOf, low);
      return '<li><strong>' + STAGES[x.s].icon + ' ' + (x.s + 1) + '단계 ' + STAGES[x.s].name + '</strong> <span class="aidx-muted">' + r0(x.v) + '점</span> ' + lvlChip(x.v) +
        (p ? '<br><span class="aidx-muted">' + (low ? '가장 낮은 문항: ' : '가장 높은 문항: ') + esc(p.it.text) + ' (' + (scale ? f1(p.v) : p.v) + ')</span>' : '') + '</li>';
    }
    return '<div class="panel"><h3 class="panel-title">' + title + '</h3><p class="panel-sub">' + sub + '</p>' +
      '<p class="aidx-small">강점</p><ul class="aidx-list">' + (sw.strong.length ? sw.strong.map(function (x) { return li(x, false); }).join('') : '<li>점수를 낼 수 있는 단계가 없습니다.</li>') + '</ul>' +
      '<p class="aidx-small">약점</p><ul class="aidx-list">' + (sw.weak.length ? sw.weak.map(function (x) { return li(x, true); }).join('') : '<li>강점과 겹쳐 따로 표시할 약점이 없습니다.</li>') + '</ul></div>';
  }
  // 행동 조언 카드 목록. who: 'me' | 'school'
  function adviceList(list) {
    return '<ol class="aidx-list axr-advice">' + list.map(function (x) {
      return '<li><span class="axr-who' + (x.who === 'school' ? ' school' : '') + '">' + (x.who === 'school' ? '학교' : '나') + '</span>' + x.t +
        '<br><span class="aidx-muted">근거: ' + x.why + '</span></li>';
    }).join('') + '</ol>';
  }
  // 후보를 차례로 보며 같은 문장은 한 번만 넣는다.
  function takeUnique(cands, n, used) {
    var out = [];
    cands.forEach(function (c) { if (out.length < n && c && c.t && !used[c.t]) { used[c.t] = 1; out.push(c); } });
    return out;
  }
  function weakestStage(lv) { var o = strongWeak(lv).weak; return o.length ? o[0].s : 0; }

  function fullReport() {
    var P = state.pool, me = P && P.rows.filter(function (r) { return r.mine; })[0];
    if (!me) {
      return '<section class="aidx-home"><p>아직 이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p>' +
        '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="report">결과 코드 입력</button></div></section>';
    }
    var rows = P.rows, n = rows.length, S = aggregate(rows), h = '';
    var schoolItem = function (idx) { return itemMeanOf(rows, idx); }, myItem = function (idx) { return me.a[idx] || null; };
    h += '<p class="aidx-context">' + esc(groupLabel(P)) + ' · 응답 ' + n + '명 (나 포함)' + (PREVIEW ? ' · 시험 모드: 이 브라우저의 응답만' : '') + '</p>';
    if (n < MIN_N) h += '<p class="aidx-note">우리 학교 응답이 ' + n + '명입니다. ' + MIN_N + '명 이상 모이면 학교 결과가 안정됩니다. 지금은 참고용으로 보세요.</p>';

    // 1. 나의 준비도
    var mySW = strongWeak(me.lv);
    h += '<section class="aidx-type"><p class="aidx-eyebrow">1 · 나의 준비도</p><h2>' + stageTitle(me.stage) + '</h2>' +
      '<p>내 응답으로 계산한 다섯 단계 점수입니다. 2단계는 나 자신, 3단계는 내 협의회, 1·4·5단계는 내가 본 우리 학교에 대한 평가입니다.</p>' +
      '<div class="axr-stairs-box">' + stairs(me.stage, '나의 준비 단계 ' + me.stage + '단계') + '</div></section>';
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">나의 단계별 점수</h3><p class="panel-sub">0~100점 · 회색 눈금은 우리 학교 평균 · 점선은 준비 기준 60점</p>' +
      stageBars(me.lv, S.lvMean, '우리 학교 평균') + '</div>' +
      swPanel('나의 강점과 약점', '내 단계 점수가 높은 단계와 낮은 단계 · 괄호는 내 응답(1~5)', mySW, myItem, false) + '</section>';

    // 2. 우리 학교의 준비도
    var schSW = strongWeak(S.lvMean);
    h += '<section class="aidx-type"><p class="aidx-eyebrow">2 · 우리 학교의 준비도 (같은 학교 응답 ' + n + '명)</p><h2>' + stageTitle(S.stage) + '</h2><p>' + STAGE_DESC[S.stage] + '</p>' +
      '<div class="axr-stairs-box">' + stairs(S.stage, '우리 학교 준비 단계 ' + S.stage + '단계') + '</div></section>';
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">우리 학교 단계별 평균</h3><p class="panel-sub">0~100점 · 오른쪽은 그 단계를 60점 이상으로 본 응답자 비율</p>' +
      stageBars(S.lvMean, null, '', S.lvMean.map(function (v, i) { return v === null ? '판단 보류' : r0(S.ready[i]) + '% 준비'; })) + '</div>' +
      swPanel('우리 학교의 강점과 약점', '학교 평균이 높은 단계와 낮은 단계 · 괄호는 문항 평균(1~5)', schSW, schoolItem, true) + '</section>';

    // 3. 나와 우리 학교의 차이
    var diffs = STAGES.map(function (_, s) { return me.lv[s] !== null && S.lvMean[s] !== null ? me.lv[s] - S.lvMean[s] : null; });
    var order = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
    var top = order[0] && Math.abs(order[0].d) >= GAP_NOTE ? order[0] : null;
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">3 · 나와 우리 학교 준비도의 차이</h3><p class="panel-sub">나 − 우리 학교 평균 (점) · ±' + GAP_NOTE + '점 안은 비슷함</p>' + gapBars(diffs) + '</div>' +
      '<div class="panel"><h3 class="panel-title">차이가 가장 큰 단계</h3>' +
      (n < 2 ? '<p>아직 같은 학교의 다른 응답이 없어 차이를 볼 수 없습니다. 같은 학교 교원이 응답하면 나타납니다.</p>'
        : top ? '<p><strong>' + (top.s + 1) + '단계 ' + STAGES[top.s].name + '</strong>을(를) 우리 학교 평균보다 <strong>' + r0(Math.abs(top.d)) + '점 ' + (top.d > 0 ? '높게' : '낮게') + '</strong> 봅니다.</p><p>' + GAP_READ[STAGES[top.s].key][top.d > 0 ? 'hi' : 'lo'].why + '</p>'
        : '<p>모든 단계에서 차이가 ' + GAP_NOTE + '점 미만입니다. 학교의 상태를 다른 교원과 비슷하게 보고 있으므로, 학교의 약점 단계를 함께 채우는 데 힘을 보태면 됩니다.</p>') + '</div></section>';

    // 4. 내가 할 일 3 + 학교가 할 일 2
    var used = {};
    var ctrl = [1, 2].filter(function (s) { return me.lv[s] !== null; }).sort(function (a, b) { return me.lv[a] - me.lv[b]; });
    if (!ctrl.length) ctrl = [1];
    var c0 = STAGES[ctrl[0]], c1 = STAGES[ctrl[1] !== undefined ? ctrl[1] : ctrl[0]];
    var ctrlWhy = function (st) { var s = STAGES.indexOf(st); return st.name + ' ' + sc(me.lv[s]) + '점 · 내가 직접 바꿀 수 있는 단계' + (s === ctrl[0] ? ' 중 더 낮은 쪽' : ''); };
    var gapCands = top ? GAP_READ[STAGES[top.s].key][top.d > 0 ? 'hi' : 'lo'].act.map(function (t) {
      return { who: 'me', t: t, why: STAGES[top.s].name + '을(를) 학교 평균보다 ' + r0(Math.abs(top.d)) + '점 ' + (top.d > 0 ? '높게' : '낮게') + ' 봄' };
    }) : [];
    var myCands = [{ who: 'me', t: MY_TIPS[c0.key][0], why: ctrlWhy(c0) }, gapCands[0], { who: 'me', t: MY_TIPS[c0.key][1], why: ctrlWhy(c0) }, gapCands[1],
      { who: 'me', t: MY_TIPS[c1.key][0], why: ctrlWhy(c1) }, { who: 'me', t: MY_TIPS[c0.key][2], why: ctrlWhy(c0) }, { who: 'me', t: MY_TIPS[c1.key][1], why: ctrlWhy(c1) }];
    var sb = S.stage < 5 ? S.stage : weakestStage(S.lvMean);
    var sbWhy = (S.stage < 5 ? '우리 학교의 병목 단계' : '우리 학교에서 가장 낮은 단계') + ' · ' + STAGES[sb].name + ' 평균 ' + sc(S.lvMean[sb]) + '점';
    var advice = takeUnique(myCands, 3, used).concat(takeUnique(ACTIONS[STAGES[sb].key].map(function (t) { return { who: 'school', t: t, why: sbWhy }; }), 2, used));
    h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">4 · 행동 조언 5가지</p><h3>내가 할 일과 학교가 할 일</h3>' +
      '<p>내 점수가 낮은 단계(교원 활용·수업·평가 재설계)와 학교와의 인식 차이에서 내가 할 일을, 우리 학교의 병목 단계에서 학교가 할 일을 골랐습니다.</p></div>' + adviceList(advice) + '</section>';

    // 5. 우리 학교는 어느 수준인가: 같은 학교급 학교들, 전체 학교와 비교
    // 다른 학교는 응답이 MIN_SCHOOL명 이상인 학교만, 학교마다 같은 무게로 평균한다.
    function schoolsOf(list) {
      var by = {};
      list.forEach(function (r) { (by[r.s] = by[r.s] || []).push(r); });
      return Object.keys(by).map(function (k) { return by[k]; }).filter(function (rs) { return rs.length >= MIN_SCHOOL; }).map(aggregate);
    }
    function idxOf(lv) { var v = nn(lv); return v.length ? mean(v) : null; }
    function cmpOf(list) {
      if (!list.length) return null;
      var m = STAGES.map(function (_, s) { var v = nn(list.map(function (A) { return A.lvMean[s]; })); return v.length ? mean(v) : null; });
      var d = STAGES.map(function (_, s) { return S.lvMean[s] !== null && m[s] !== null ? S.lvMean[s] - m[s] : null; });
      var mine = idxOf(S.lvMean), ix = nn(list.map(function (A) { return idxOf(A.lvMean); }));
      // 우리 학교를 포함한 순위: 우리보다 높은 학교 수 + 1
      var rank = mine === null ? null : ix.filter(function (v) { return v > mine; }).length + 1;
      return { n: list.length, mean: m, diff: d, rank: rank, of: ix.length + 1, idx: idxOf(m) };
    }
    var peersAll = state.peers || [];
    var SL = P.org && me.job ? cmpOf(schoolsOf(peersAll.filter(function (r) { return r.job === me.job; }))) : null;
    var AL = P.org ? cmpOf(schoolsOf(peersAll)) : null;
    var myIdx = idxOf(S.lvMean);
    var posTxt = function (C) { return C && C.rank ? C.of + '곳 중 ' + C.rank + '위' : '–'; };
    h += '<section class="aidx-type"><p class="aidx-eyebrow">5 · 우리 학교는 어느 수준인가</p>' +
      '<h2>' + stageTitle(S.stage) + (myIdx !== null ? ' · 종합 ' + r0(myIdx) + '점(' + level(myIdx) + ')' : '') + '</h2>' +
      '<p>' + (SL ? '같은 학교급(' + esc(me.job) + ') ' + SL.of + '곳 가운데 <strong>' + SL.rank + '위</strong>' : '같은 학교급 비교는 다른 학교 응답이 모이면 나타납니다') +
      (AL ? ', 전체 학교 ' + AL.of + '곳 가운데 <strong>' + AL.rank + '위</strong>입니다.' : '.') + ' 종합 점수는 다섯 단계 평균입니다.</p></section>';
    h += '<div class="kpis aidx-kpis">' +
      kpi('준비된 단계', S.stage + '<small>/ 5단계</small>', STAGE_NAMES[S.stage]) +
      kpi('종합 점수', myIdx === null ? '–' : r0(myIdx) + '<small>/ 100</small>', myIdx === null ? '' : lvlChip(myIdx) + ' 다섯 단계 평균') +
      kpi('같은 학교급 안에서', posTxt(SL), SL ? '평균 ' + sc(SL.idx) + '점 · 우리 ' + signed(myIdx - SL.idx) + '점' : esc(me.job || '') + ' 비교 학교 없음') +
      kpi('전체 학교 안에서', posTxt(AL), AL ? '평균 ' + sc(AL.idx) + '점 · 우리 ' + signed(myIdx - AL.idx) + '점' : '비교 학교 없음') +
      '</div>';
    function cmpPanel(title, C, emptyTxt, label) {
      if (!C) return '<div class="panel"><h3 class="panel-title">' + title + '</h3><p>' + emptyTxt + '</p></div>';
      var o = C.diff.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return b.d - a.d; });
      var best = o[0], worst = o[o.length - 1];
      return '<div class="panel"><h3 class="panel-title">' + title + '</h3><p class="panel-sub">다른 학교 ' + C.n + '곳(학교마다 같은 무게) · 회색 눈금은 ' + label + ' 평균</p>' +
        stageBars(S.lvMean, C.mean, label + ' 평균') +
        '<p class="aidx-small">' + (best && best.d >= GAP_NOTE ? '앞선 단계: <strong>' + STAGES[best.s].name + '</strong> ' + signed(best.d) + '점. ' : '뚜렷하게 앞선 단계는 없습니다. ') +
        (worst && worst.d <= -GAP_NOTE ? '뒤처진 단계: <strong>' + STAGES[worst.s].name + '</strong> ' + signed(worst.d) + '점.' : '뚜렷하게 뒤처진 단계는 없습니다.') + '</p></div>';
    }
    h += '<section class="report-grid">' +
      cmpPanel('같은 학교급(' + esc(me.job || '–') + ') 학교들과 비교', SL, P.org && me.job ? '아직 같은 학교급에서 응답이 ' + MIN_SCHOOL + '명 이상 모인 다른 학교가 없습니다. 응답이 쌓이면 이 자리에 비교 결과가 나타납니다.' : '학교 이름과 학교급이 있는 응답에서만 비교할 수 있습니다.', '같은 학교급') +
      cmpPanel('전체 학교와 비교', AL, P.org ? '아직 응답이 ' + MIN_SCHOOL + '명 이상 모인 다른 학교가 없습니다.' : '학교 이름이 있는 응답에서만 비교할 수 있습니다.', '전체 학교') + '</section>';
    if (SL || AL) {
      h += '<div class="panel"><h3 class="panel-title">단계별 비교표</h3><p class="panel-sub">0~100점 · 차이 = 우리 학교 − 비교 학교 평균 · 다른 학교 이름은 보이지 않으며, 응답이 ' + MIN_SCHOOL + '명 미만인 학교는 뺍니다</p>' +
        '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>우리 학교</th><th>같은 학교급</th><th>차이</th><th>전체 학교</th><th>차이</th></tr></thead><tbody>' +
        STAGES.map(function (st, s) {
          var cell = function (C) {
            if (!C) return '<td>–</td><td>–</td>';
            var d = C.diff[s];
            return '<td>' + sc(C.mean[s]) + '</td><td class="' + (d === null ? '' : d >= GAP_NOTE ? 'up' : d <= -GAP_NOTE ? 'down' : '') + '">' + (d === null ? '–' : signed(d)) + '</td>';
          };
          return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(S.lvMean[s]) + '</strong></td>' + cell(SL) + cell(AL) + '</tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    // 6. 발전 전략 5가지: 병목 단계 → 같은 학교급보다 뒤처진 단계 → 전체 학교보다 뒤처진 단계 → 병목 다음 단계 → 나머지 낮은 단계
    var lagOf = function (C) {
      if (!C) return null;
      var x = C.diff.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null && x.d <= -GAP_NOTE; }).sort(function (a, b) { return a.d - b.d; })[0];
      return x ? x.s : null;
    };
    var why = {};
    var stOrder = [sb]; why[sb] = sbWhy;
    [[lagOf(SL), SL, '같은 학교급'], [lagOf(AL), AL, '전체 학교']].forEach(function (x) {
      if (x[0] === null) return;
      stOrder.push(x[0]);
      if (!why[x[0]]) why[x[0]] = STAGES[x[0]].name + ' · ' + x[2] + ' 평균보다 ' + r0(Math.abs(x[1].diff[x[0]])) + '점 낮음';
    });
    if (sb + 1 < 5) { stOrder.push(sb + 1); if (!why[sb + 1]) why[sb + 1] = '병목 다음 단계 · ' + STAGES[sb + 1].name + ' 평균 ' + sc(S.lvMean[sb + 1]) + '점'; }
    S.lvMean.map(function (v, s) { return { v: v === null ? 999 : v, s: s }; }).sort(function (a, b) { return a.v - b.v; }).forEach(function (x) {
      stOrder.push(x.s); if (!why[x.s]) why[x.s] = STAGES[x.s].name + ' 평균 ' + sc(S.lvMean[x.s]) + '점';
    });
    stOrder = stOrder.filter(function (s, i) { return stOrder.indexOf(s) === i; });
    var quota = [2, 1, 1, 1, 1], plan = [];
    stOrder.forEach(function (s, i) {
      STRATEGIES[STAGES[s].key].slice(0, quota[i] || 0).forEach(function (g) { if (plan.length < 5) plan.push({ g: g, s: s }); });
    });
    // 단계 수가 적어 5개가 안 되면 우선순위 단계의 남은 전략으로 채운다
    stOrder.forEach(function (s) { STRATEGIES[STAGES[s].key].forEach(function (g) { if (plan.length < 5 && !plan.some(function (p) { return p.g === g; })) plan.push({ g: g, s: s }); }); });
    h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">6 · 우리 학교 발전 전략 5가지</p><h3>앞으로 무엇을 어떻게 할까</h3>' +
      '<p>앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작습니다. 병목 단계를 먼저, 그다음 다른 학교보다 뒤처진 단계를 우선했습니다. 전략마다 담당, 기간, 행동 요령, 점검 지표를 함께 제시합니다.</p></div>' +
      '<ol class="aidx-plan-list">' + plan.map(function (p, i) {
        var g = p.g;
        return '<li class="aidx-plan-card' + (i ? ' keep' : '') + '"><p class="aidx-plan-h"><span class="aidx-prio">' + (i + 1) + '</span>' + STAGES[p.s].icon + ' ' + g.t + '</p>' +
          '<p class="aidx-small">근거: ' + why[p.s] + '</p>' +
          '<p class="aidx-small">담당: ' + g.who + ' · 기간: ' + g.when + '</p>' +
          '<ol class="aidx-list axr-steps">' + g.steps.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
          '<p class="aidx-small">점검 지표: ' + g.kpi + '</p></li>';
      }).join('') + '</ol></section>';
    return h;
  }

  function personal() {
    var P = state.pool, me = P && P.rows.filter(function (r) { return r.mine; })[0];
    if (!me) {
      return '<section class="aidx-home"><p>아직 이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p>' +
        '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="report">결과 코드 입력</button></div></section>';
    }
    var others = P.rows.filter(function (r) { return !r.mine; }), no = others.length, enough = no >= MIN_N - 1;
    var O = no ? aggregate(others) : null;
    var diffs = STAGES.map(function (_, s) { return O && me.lv[s] !== null && O.lvMean[s] !== null ? me.lv[s] - O.lvMean[s] : null; });
    var unkStages = STAGES.map(function (st, s) { return st.unk ? s : -1; }).filter(function (s) { return s >= 0; });
    var myUnk = unkStages.reduce(function (t, s) { return t + me.unk[s]; }, 0), unkItems = unkStages.length * K;
    var othersUnk = no ? mean(others.map(function (r) { return unkStages.reduce(function (t, s) { return t + r.unk[s]; }, 0); })) : 0;
    var stageCnt = [0, 0, 0, 0, 0, 0]; others.forEach(function (r) { stageCnt[r.stage]++; });
    var modeStage = stageCnt.indexOf(Math.max.apply(null, stageCnt));
    var higher = others.filter(function (r) { return r.stage > me.stage; }).length, same = others.filter(function (r) { return r.stage === me.stage; }).length;
    var order = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
    var top = order[0], h = '';

    // 1. 내가 본 단계
    var bott = me.stage < 5 ? me.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">내 응답으로 본 우리 학교의 AIX 준비 단계</p>' +
      '<h2>' + stageTitle(me.stage) + '</h2><p>' + STAGE_DESC[me.stage] + '</p>' +
      (bott >= 0 ? '<p>다음 관문은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>입니다. "' + STAGES[bott].q + '"</p>' : '') +
      (no ? '<p>다른 응답자 ' + no + '명 가운데 <strong>' + r0(same / no * 100) + '%</strong>는 나와 같은 단계로, ' + r0(higher / no * 100) + '%는 더 높은 단계로, ' + r0((no - same - higher) / no * 100) + '%는 더 낮은 단계로 보았습니다.</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(me.stage, '내가 본 준비 단계 ' + me.stage + '단계') + '</div></section>';
    if (!no) return h + '<p class="aidx-note">아직 다른 응답자가 없어 비교할 수 없습니다. 같은 학교(그룹) 링크로 다른 교원이 응답하면 인식 차이 분석이 나타납니다.</p>' + myPlan(me, null);
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
      var itemGaps = ITEMS.slice(top.s * K, top.s * K + K).map(function (it) {
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
        '<p>모든 단계에서 차이가 ' + GAP_NOTE + '점 미만입니다. 학교의 상태를 다른 교원과 같은 눈으로 보고 있으므로, 학교 전체의 병목 단계를 함께 채우는 데 힘을 보태면 됩니다.</p></section>';
    }
    return h + myPlan(me, aggregate(P.rows));
  }

  // 내가 직접 해 볼 일: 개인 활용·업무 재설계 점수가 낮을 때, 그리고 학교 병목 단계
  function myPlan(me, A) {
    var tips = '';
    [1, 2].forEach(function (s) {
      if (me.lv[s] === null || me.lv[s] >= 80) return;
      var low = ITEMS.slice(s * K, s * K + K).filter(function (it) { return me.a[it.idx] > 0 && me.a[it.idx] <= 3; }).slice(0, 2);
      tips += '<li class="aidx-plan-card"><p class="aidx-plan-h">' + STAGES[s].icon + ' ' + STAGES[s].name + ' <span class="aidx-muted">' + sc(me.lv[s]) + '점</span></p>' +
        '<ul class="aidx-list">' + MY_TIPS[STAGES[s].key].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        (low.length ? '<p class="aidx-small">아직 갖추지 못했다고 답한 것</p><ul class="aidx-list aidx-check">' + low.map(function (it) { return '<li>' + esc(it.text) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    });
    if (A && A.stage < 5) {
      var b = A.stage;
      tips += '<li class="aidx-plan-card keep"><p class="aidx-plan-h">' + STAGES[b].icon + ' 학교 전체의 병목 · ' + (b + 1) + '단계 ' + STAGES[b].name + '</p>' +
        '<p class="aidx-small">응답자 전체 평균으로 본 병목입니다. 협의회와 학교에 이렇게 제안해 보세요.</p>' +
        '<ul class="aidx-list">' + ACTIONS[STAGES[b].key].slice(0, 2).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></li>';
    }
    return tips ? '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">나의 행동 추천</p><h3>지금 내가 해 볼 수 있는 것</h3>' +
      '<p>교원 활용과 수업·평가 재설계는 내가 직접 바꿀 수 있는 부분이고, 나머지 단계는 협의회와 학교에 제안할 부분입니다.</p></div><ol class="aidx-plan-list">' + tips + '</ol></section>' : '';
  }

  function companyReport() {
    var P = state.pool, rows = P.rows, n = rows.length;
    if (!n) return '<section class="aidx-home"><p>아직 응답이 없습니다.</p></section>';
    var A = aggregate(rows), h = '';
    h += '<p class="aidx-context">' + esc(groupLabel(P)) + ' · 응답 ' + n + '명' + (PREVIEW ? ' (시험 모드: 이 브라우저의 응답만)' : '') + '</p>';
    if (n < MIN_N) h += '<p class="aidx-note">아직 응답이 ' + n + '명입니다. ' + MIN_N + '명 이상 모이면 학교 결과가 안정됩니다. 학교 전체를 대표하려면 학년·교과와 직위가 고르게 응답해야 합니다.</p>';

    // 1. 한 줄 요약
    var bott = A.stage < 5 ? A.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">교원 인식으로 본 우리 학교의 AIX 준비 단계</p>' +
      '<h2>' + stageTitle(A.stage) + '</h2><p>' + STAGE_DESC[A.stage] + '</p>' +
      (bott >= 0 ? '<p>병목은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>(평균 ' + sc(A.lvMean[bott]) + '점)입니다. 이 단계에서 "준비됨"(60점 이상)이라고 본 응답자는 ' + r0(A.ready[bott]) + '%입니다.</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(A.stage, '학교 준비 단계 ' + A.stage + '단계') + '</div></section>';

    // 2. 핵심 숫자
    var g = nn(rows.map(function (r) { return r.g; }));
    var unkOrg = mean(STAGES.map(function (st, s) { return st.unk ? A.unkPct[s] : null; }).filter(function (v) { return v !== null; }));
    h += '<div class="kpis aidx-kpis">' +
      kpi('응답자', n + '<small>명</small>', esc(groupLabel(P))) +
      kpi('준비된 단계', A.stage + '<small>/ 5단계</small>', bott >= 0 ? '병목: ' + STAGES[bott].name : '전 단계 준비') +
      kpi('전반 인식', g.length ? r0(mean(g)) + '<small>/ 100</small>' : '–', 'AIX 의지·역량에 대한 인식 (G1·G2)') +
      kpi('"잘 모르겠다"', r0(unkOrg) + '<small>%</small>', '학교 주어 문항(1·4·5단계) 평균') +
      '</div>';

    // 3. 단계별 프로파일
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">단계별 학교 평균</h3><p class="panel-sub">0~100점 · 점선은 준비 기준 60점</p>' +
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
      '<p class="panel-sub">합의도 rwg(j)는 학교를 주어로 묻는 단계(1·4·5단계)에서, 신뢰도 α는 "모르겠다" 없이 응답한 사람이 10명 이상일 때 표시</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>평균</th><th>SD</th><th>준비됨</th><th>모르겠다</th><th>합의도</th><th>α</th></tr></thead><tbody>' +
      STAGES.map(function (st, s) {
        var rw = st.unk && n >= MIN_N ? rwgj(rows, s * K, s * K + K) : null, al = alpha(rows, s * K, s * K + K);
        return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(A.lvMean[s]) + '</strong></td><td>' + r0(A.lvSd[s]) + '</td><td>' + r0(A.ready[s]) + '%</td>' +
          '<td>' + (st.unk ? r0(A.unkPct[s]) + '%' : '–') + '</td><td>' + (rw === null ? '–' : f2(rw)) + '</td><td>' + (al === null ? '–' : f2(al)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="aidx-small">합의도가 .70 이상이면 교원들이 학교 상태를 비슷하게 보고 있어 평균을 학교의 상태로 읽을 수 있습니다. 낮으면 학년·교과나 직위에 따라 경험이 다르다는 뜻이므로 "응답자 구분별 비교"를 함께 보세요. "모르겠다"가 30%를 넘는 단계는 학교가 그 내용을 교원에게 충분히 알리지 않았다는 신호입니다.</p></div>';

    // 5. 갖춘 것과 비어 있는 것
    var im = ITEMS.slice(0, NS).map(function (it) {
      var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; });
      return { it: it, m: v.length ? mean(v) : null };
    }).filter(function (x) { return x.m !== null; }).sort(function (a, b) { return b.m - a.m; });
    function itemList(list) { return '<ul class="aidx-list">' + list.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + STAGES[Math.floor(x.it.idx / K)].name + ' · ' + f1(x.m) + '</span></li>'; }).join('') + '</ul>'; }
    var unkTop = ITEMS.slice(0, NS).filter(function (it) { return it.unk; }).map(function (it) {
      return { it: it, p: rows.filter(function (r) { return r.a[it.idx] === 0; }).length / n * 100 };
    }).sort(function (a, b) { return b.p - a.p; }).slice(0, 3).filter(function (x) { return x.p > 0; });
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">가장 잘 갖춘 것과 가장 비어 있는 것</h3><p class="panel-sub">문항 평균 (1~5점, "모르겠다" 제외)</p>' +
      '<p class="aidx-small">가장 잘 갖춘 것</p>' + itemList(im.slice(0, 3)) +
      '<p class="aidx-small">가장 비어 있는 것</p>' + itemList(im.slice(-3).reverse()) + '</div>' +
      '<div class="panel"><h3 class="panel-title">교원이 잘 모르는 것</h3><p class="panel-sub">"잘 모르겠다" 응답 비율이 높은 문항</p>' +
      (unkTop.length ? '<ul class="aidx-list">' + unkTop.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + r0(x.p) + '%</span></li>'; }).join('') + '</ul>'
        : '<p>"잘 모르겠다" 응답이 없습니다.</p>') + '</div></section>';

    // 6. 다음 단계로 가려면
    if (bott >= 0) {
      var ahead = [bott, bott + 1].filter(function (s) { return s < 5; });
      h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">다음 단계로 가려면</p><h3>' + josa(STAGES[bott].name, '을', '를') + ' 먼저 채우세요</h3>' +
        '<p>앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작습니다. 병목 단계부터 우선순위를 두세요.</p></div>' +
        '<ol class="aidx-plan-list">' + ahead.map(function (s, i) {
          var low = ITEMS.slice(s * K, s * K + K).map(function (it) { var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; }); return { it: it, m: v.length ? mean(v) : 9 }; })
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
      '<tr><td>단계 점수와 전반 인식의 상관</td><td>' + (rg === null ? '–' : 'r = ' + f2(rg)) + '</td><td>단계 점수가 AIX 의지·역량 인식과 함께 움직이는 정도</td></tr>' +
      '</tbody></table></div></div>';
    return h;
  }

  function compareReport() {
    var P = state.pool, rows = P.rows, n = rows.length;
    var groups = ROLES.map(function (rl) { return { rl: rl, rs: rows.filter(function (r) { return r.role === rl; }) }; }).filter(function (x) { return x.rs.length >= MIN_ROLE; });
    var h = '<p class="aidx-context">' + esc(groupLabel(P)) + ' · 응답 ' + n + '명</p>';
    if (groups.length < 2) {
      return h + '<section class="aidx-home"><p>응답자 구분별 비교는 두 구분 이상에서 각각 ' + MIN_ROLE + '명 이상 응답해야 볼 수 있습니다. 응답자를 알아볼 수 없도록 인원이 적은 구분은 표시하지 않습니다.</p></section>';
    }
    var aggs = groups.map(function (x) { return { rl: x.rl, n: x.rs.length, A: aggregate(x.rs) }; });
    h += '<div class="panel"><h3 class="panel-title">응답자 구분별 단계 평균</h3><p class="panel-sub">' + MIN_ROLE + '명 이상인 구분만 표시 · 마지막 열은 그 구분의 평균으로 판정한 준비 단계</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>n</th>' + STAGES.map(function (st, i) { return '<th>' + (i + 1) + '. ' + st.name + '</th>'; }).join('') + '<th>준비 단계</th></tr></thead><tbody>' +
      aggs.map(function (x) {
        return '<tr><td>' + x.rl + '</td><td>' + x.n + '</td>' + x.A.lvMean.map(function (v) { return '<td>' + sc(v) + '</td>'; }).join('') + '<td><strong>' + x.A.stage + '단계</strong></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    // 관리자(교감·교장)·부장교사와 교사의 인식 차이
    var staff = aggs.filter(function (x) { return x.rl === ROLES[0]; })[0];
    var lead = aggs.filter(function (x) { return x.rl === ROLES[2]; })[0] || aggs.filter(function (x) { return x.rl === ROLES[1]; })[0];
    if (staff && lead) {
      var diffs = STAGES.map(function (_, s) { return staff.A.lvMean[s] !== null && lead.A.lvMean[s] !== null ? lead.A.lvMean[s] - staff.A.lvMean[s] : null; });
      var big = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })[0];
      h += '<section class="aidx-gap ' + (big && Math.abs(big.d) >= 15 ? 'ahead' : 'match') + '"><p class="aidx-eyebrow">' + lead.rl + '와 교사의 인식 차이</p>' +
        '<h3>' + (big && Math.abs(big.d) >= 15 ? josa(STAGES[big.s].name, '을', '를') + ' 두고 보는 눈이 ' + r0(Math.abs(big.d)) + '점 다릅니다' : '단계마다 인식 차이가 크지 않습니다') + '</h3>' +
        '<div class="aidx-gbars">' + STAGES.map(function (st, s) {
          return '<div class="aidx-grow"><span>' + st.name + '</span><span class="aidx-gtrack"><span style="width:' + (lead.A.lvMean[s] || 0) + '%"></span></span><b>' + sc(lead.A.lvMean[s]) + '</b></div>' +
            '<div class="aidx-grow act"><span><small>교사</small></span><span class="aidx-gtrack"><span style="width:' + (staff.A.lvMean[s] || 0) + '%"></span></span><b>' + sc(staff.A.lvMean[s]) + '</b></div>';
        }).join('') + '</div>' +
        '<p>위 막대는 ' + lead.rl + ', 아래 막대는 교사의 평균입니다. ' +
        (big && big.d >= 15 ? '관리자가 교사보다 준비 상태를 높게 보고 있습니다. 학교가 마련했다고 생각하는 지침이나 도구가 교실까지 닿지 않았을 수 있습니다.'
          : big && big.d <= -15 ? '교사가 관리자보다 준비 상태를 높게 보고 있습니다. 교실의 준비가 관리자에게 보이지 않거나, 관리자가 기대하는 수준이 더 높을 수 있습니다.'
          : '같은 상태를 비슷하게 보고 있어, 학교 평균을 공통의 출발점으로 삼을 수 있습니다.') + '</p></section>';
    }
    // 학교급별, AI 사용 빈도별 단계 평균 (각 구분 MIN_ROLE명 이상만)
    [{ key: 'job', label: '학교급', opts: JOBS }, { key: 'freq', label: 'AI 사용 빈도', opts: FREQS }].forEach(function (dim) {
      var gs = dim.opts.map(function (o) { return { o: o, rs: rows.filter(function (r) { return r[dim.key] === o; }) }; }).filter(function (x) { return x.rs.length >= MIN_ROLE; });
      if (gs.length < 2) return;
      h += '<div class="panel"><h3 class="panel-title">' + dim.label + '별 단계 평균</h3><p class="panel-sub">' + MIN_ROLE + '명 이상인 구분만 표시</p>' +
        '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>' + dim.label + '</th><th>n</th>' + STAGES.map(function (st, i) { return '<th>' + (i + 1) + '. ' + st.name + '</th>'; }).join('') + '<th>준비 단계</th></tr></thead><tbody>' +
        gs.map(function (x) { var A = aggregate(x.rs); return '<tr><td>' + x.o + '</td><td>' + x.rs.length + '</td>' + A.lvMean.map(function (v) { return '<td>' + sc(v) + '</td>'; }).join('') + '<td><strong>' + A.stage + '단계</strong></td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    });
    h += '<p class="aidx-small">응답 수가 적으면 차이가 커 보여도 우연일 수 있습니다. 표본이 작을 때는 참고용으로 보세요.</p>';
    return h;
  }

  // ---------- 이벤트 ----------
  function render() { if (state.view === 'home') viewHome(); else if (state.view === 'survey') viewSurvey(); }
  function go(view) { state.view = view; render(); window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 }); }

  root.addEventListener('input', function (e) {
    if (e.target.name === 'org') { state.org = e.target.value; state.pending = null; }
  });

  root.addEventListener('change', function (e) {
    var t = e.target;
    state.pending = null;
    if (t.name === 'role' || t.name === 'job' || t.name === 'freq') state[t.name] = t.value;
    else if (t.type === 'radio') {
      state.answers[t.name] = +t.value;
      var li = t.closest('.aidx-item'); if (li) li.classList.remove('is-miss');
    }
    var bar = root.querySelector('.aidx-progress');
    if (bar) { var done = answered() + bgDone(); bar.firstChild.style.width = (done / (NI + BG.length) * 100) + '%'; bar.setAttribute('aria-valuenow', done); }
  });

  root.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-tab]');
    if (tb) { if (!state.pool) { analyze(tb.dataset.tab); return; } state.tab = tb.dataset.tab; viewResult(); return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'start') { state.answers = {}; state.role = ''; state.job = ''; state.freq = ''; state.org = ''; state.pending = null; state.page = -1; state.started = Date.now(); go('survey'); }
    else if (act === 'home') { go('home'); }
    else if (act === 'prev') { if (state.page === -1) go('home'); else { state.page--; go('survey'); } }
    else if (act === 'next') {
      var miss = pageComplete(), err = document.getElementById('axr-err');
      if (miss) {
        err.textContent = miss === 'org' ? '학교 이름을 적어 주세요.' : miss.indexOf('bg:') === 0 ? josa(miss.slice(3), '을', '를') + ' 골라 주세요.' : '응답하지 않은 문항이 있습니다.';
        if (miss === 'org') document.getElementById('axr-org-in').focus();
        else if (miss.indexOf('bg:') !== 0) {
          PAGES[state.page].forEach(function (it) { if (state.answers[it.code] === undefined) document.getElementById('q-' + it.code).classList.add('is-miss'); });
          document.getElementById('q-' + miss).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (state.page < PAGES.length - 1) { state.page++; go('survey'); return; }
      var rec = state.pending || { id: newId(), group: GROUP, role: state.role, job: state.job, freq: state.freq, org: state.org.trim().slice(0, 40), answers: ITEMS.map(function (it) { return state.answers[it.code]; }), seconds: Math.round((Date.now() - state.started) / 1000) };
      state.pending = rec; b.disabled = true; err.textContent = '저장하는 중…';
      submit(rec).then(function () {
        state.me = rec; state.pending = null; state.pool = null; save(LS_ME, rec); viewDone();
      }).catch(function () { b.disabled = false; err.textContent = '저장하지 못했습니다. 잠시 뒤 응답 제출을 다시 눌러 주세요.'; });
    }
    else if (act === 'analyze') { analyze('report'); }
    else if (act === 'copycode') {
      var code = b.dataset.code;
      var ok = function () { b.textContent = '복사했습니다'; b.classList.add('is-done'); setTimeout(function () { b.textContent = '복사'; b.classList.remove('is-done'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, function () { window.prompt('결과 코드를 복사하세요', code); });
      else window.prompt('결과 코드를 복사하세요', code);
    }
    else if (act === 'my' || act === 'report' || act === 'group') {
      var me = load(LS_ME), tab = act === 'my' ? 'me' : act;
      if (me) { state.me = me; state.pool = null; analyze(tab); return; }
      state.gateTab = tab;
      if (state.view !== 'home' || !document.getElementById('axr-gate')) go('home');
      document.getElementById('axr-gate-msg').textContent = (tab === 'group' ? '우리 학교 분석결과는' : '내 결과는') + ' 먼저 진단을 완료해야 볼 수 있습니다.';
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
      state.me = rec; state.pool = null; save(LS_ME, rec); analyze(state.gateTab || 'report');
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

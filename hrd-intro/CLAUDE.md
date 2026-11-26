# HRD개론 (hrd-intro) — 작업 인수인계

HRD개론(DET1003) 수업 사이트. 주소: https://hrdpro.hanyang.ac.kr/hrd-intro/
사용자(교수님)와는 **한국어**로 대화한다. 저장소는 PUBLIC이므로 API 키·비밀번호 원문을 절대 커밋하지 않는다.

## 배포
GitHub Pages (`drsprolab/drsprolab.github.io`, main 브랜치). push 후 1~2분 뒤 반영. 작업 전 `git pull`.

## 페이지 (상단 탭 순서)
1. `index.html` — Course Materials (강의자료 PDF 목록, `MATERIALS` 배열)
2. `submit.html` — 과제 제출 (`js/submit.js` → Apps Script `hrd-intro-backend/Code.gs`)
3. `conceptualization.html` — **Conceptualization** (탭 이름은 "HRD" 빼고 이것으로, 교수님 결정)
- 공통: `js/common.js` (테마, 비밀번호 화면 — SHA-256 해시만 둠), `css/style.css`, `css/components.css`
- CSS를 고치면 세 HTML의 `?v=` 값을 함께 올린다

## Conceptualization (2026-11-26 시작)
- 페이지 제목: **인지적 멈춤을 통해 스스로 개념을 알아가는 HRD**
- 방법: 활동 기반 (소크라테스식 문답 × 스캐폴딩). 정답을 먼저 주지 않고 질문-대답-질문-대답으로 학생이 스스로 개념을 세운다
- **1주차: 나만의 HRD 개념 정립** — 9단계 (Harness)
  01 사전 개념 탐색 Prior Knowledge — HRD란 무엇이라고 생각하는가?
  02 개념의 본질 탐색 Essential Inquiry — 인간을 개발한다는 것은 무엇인가?
  03 개념 간 차이 탐색 Conceptual Differentiation — 교육, 학습, 개발은 어떻게 다른가?
  04 개념적 경계 탐색 Boundary Exploration — 어디까지를 HRD라고 할 수 있는가?
  05 개발의 과정과 조건 탐색 Mechanism & Conditions — 인간의 개발은 어떻게 이루어지는가?
  06 개발의 목적 탐색 Purpose Exploration — 왜 인간을 개발해야 하는가?
  07 개념 통합 및 구조화 Conceptual Integration — 발견한 개념들은 어떻게 연결되는가?
  08 정의 생성 및 검증 Definition Construction — 그렇다면 HRD란 무엇인가?
  09 메타인지적 성찰 Metacognitive Reflection — 나의 생각은 어떻게 변화하였는가?
- 코드: `js/concept.js`의 `STEPS` 배열. 단계마다 `title, enLong, goal, guide{check, end}, script[]`
- **현재 완료: Harness 1 (사전 개념 탐색)만 열림.** 02~09는 '준비 중'으로 잠김 (`open: true`인 단계만 열림)
  - 목적: 학생이 현재 가진 HRD 개념과 가정을 확인
  - 질문: ① HRD란 무엇이라고 생각하나요? → ② 명료화(학생 답 인용) → ③ 가정 탐색(교육은 목적인가 수단인가) → ④ 나의 첫 정의+이유 (④는 '단계 종료 조건'에 맞추려고 Claude가 추가)
  - AI가 확인할 사항: HRD를 교육·훈련과 동일시하는가 / 대상과 목적을 구분하는가 / 정의에 근거가 있는가
  - 종료 조건: 최초의 HRD 정의를 자신의 언어로 표현하고 이유를 설명할 수 있음
  - **이 단계의 답은 수정하지 않고 저장해 9단계 성찰에서 활용** (보낸 답은 고칠 수 없게 함)
- 답 저장: 지금은 학생 브라우저 localStorage에만 (`hrd-concept-w1-<단계번호>`). 교수님이 모아 볼 수 없음

## 다음 할 일
1. **Claude 연동** (교수님이 Claude Console로 연동 예정)
   - `js/concept.js`의 `ASK_URL`에 중계 서버 주소를 넣으면 정해 둔 질문 대신 Claude가 다음 질문을 만든다
   - 요청 `POST {harness, guide, history:[{role:'ai'|'me', text}]}` → 응답 `{question, label, done}`
   - 중계 코드: `hrd-intro-backend/Concept.gs` (과제 제출과 별도의 Apps Script 프로젝트, 2026-11-26 작성). 키는 스크립트 속성 `ANTHROPIC_API_KEY`에만. 설치 순서는 파일 맨 위 주석
   - 모델 claude-opus-5-5, effort low, 구조화 출력 {label, question, done}, 서버측 fallback(default) 사용
   - 진행 상태: 교수님이 Apps Script에 붙여 넣고 배포하는 중 → 받은 …/exec 주소를 `ASK_URL`에 넣고 push 하면 끝
   - `guide.check`·`guide.end`를 시스템 프롬프트에 넣어 질문 선택과 단계 종료 판단에 쓴다
2. 학생 답을 서버(구글 시트 등)에 모아 교수님이 볼 수 있게 할지 — 교수님께 확인
3. Harness 2~9 내용 — 교수님이 단계별 구성(목적, 질문 예시, 확인할 사항, 종료 조건)을 주면 같은 형식으로 추가

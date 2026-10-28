# Research help 백엔드 (Google Apps Script)

`/research-help/` 작성 화면과 `/research-help/admin/` 열람 화면의 저장·AI 피드백·열람 처리를 맡습니다.
**appointment-backend와 다른 새 Apps Script 프로젝트**로 배포합니다. 기존 예약 스크립트와 배포는 건드리지 않습니다.

Google Cloud 콘솔의 OAuth 클라이언트는 필요하지 않습니다. 웹 앱이 배포한 계정 권한으로 실행되고, 처음 실행할 때 그 계정 드라이브에 비공개 스프레드시트를 만듭니다.

## 1. 프로젝트 만들기

1. 제출물을 보관할 Google 계정으로 [script.google.com](https://script.google.com/) → **새 프로젝트**. 이름은 `Research help backend`.
2. 이 폴더의 `Code.gs` 전체를 붙여 넣습니다.
3. **프로젝트 설정 → '편집기에서 appsscript.json 매니페스트 파일 표시'**를 켜고, 이 폴더의 `appsscript.json` 내용으로 바꿉니다.

## 2. 스크립트 속성(비밀값) 넣기

**프로젝트 설정 → 스크립트 속성**에 추가합니다. 코드나 GitHub에는 넣지 않습니다.

| 속성 | 필수 | 내용 |
| --- | --- | --- |
| `GEMINI_API_KEY` | 예 | Google AI Studio(aistudio.google.com)에서 만든 API 키. 무료 등급은 결제 등록이 필요 없습니다. |
| `ADMIN_PASSWORD` | 예 | 제출물 열람 비밀번호. 첫 로그인(또는 `setupCheck` 실행) 때 솔트+SHA-256 해시로 바뀌고 원문 속성은 삭제됩니다. |
| `GEMINI_MODEL` | 아니요 | 기본 `gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite`. 앞 모델이 과부하·한도 초과면 다음 모델로 넘깁니다(Interactions API, `store:false`). |
| `AI_PROVIDERS` | 아니요 | 기본 `gemini`. `gemini,openai`로 두고 `OPENAI_API_KEY`를 넣으면 Gemini 한도 초과(429)·일시 오류 때 OpenAI(유료)로 넘깁니다. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | 아니요 | 유료 OpenAI를 쓸 때만. 기본 모델 `gpt-5-mini`. |
| `DAILY_AI_LIMIT` | 아니요 | 하루 AI 호출 상한(기본 40). 1차 저장 1회, 2차 저장 2회를 씁니다. |
| `CONTACT_EMAIL` | 아니요 | OpenAlex·Crossref 요청에 붙이는 연락 이메일(두 서비스가 권장). |
| `OPENALEX_API_KEY` | 사실상 예 | OpenAlex 무료 키(하루 $1 한도). 키가 없으면 Apps Script 서버들이 공유하는 IP 한도가 바닥나 문헌 검색이 0건이 됩니다. |

비밀번호를 바꾸려면 `ADMIN_PASSWORD`를 다시 추가하면 됩니다(다음 로그인 때 새 해시로 교체).

## 3. 점검 실행과 권한 승인

편집기 위쪽 함수 목록에서 `setupCheck` → **실행**. Google 권한 승인(스프레드시트, 외부 서비스 연결)을 계정 소유자가 직접 진행합니다.
실행 로그에 스프레드시트 주소와 설정 여부(`openaiKey`, `adminPassword`, `ssciJournals`)가 표시됩니다. 비밀값 자체는 출력하지 않습니다.

## 4. SSCI 저널 목록 등록 (2차 피드백 문헌 근거의 기준)

2차 피드백은 아래 검증을 모두 통과한 논문만 근거로 씁니다.

1. OpenAlex 학술 API 검색(초록이 있는 학술지 논문)
2. 스프레드시트 `SSCI_Journals` 탭의 ISSN/eISSN과 일치
3. MDPI·Frontiers(DOI 접두어 10.3390/10.3389, 출판사명) 제외
4. Crossref에서 DOI 실재·학술지 논문 여부·제목·ISSN 재확인
5. AI 출력의 인용 번호가 위 후보에 없으면 삭제, 서지정보는 AI가 아니라 서버 조회값 사용
6. 문제의식·연구 모형·이론적 근거·연구 방법에 검증된 근거가 없으면 "검증된 근거 부족으로 판단 보류"

SSCI 등재 여부는 Scopus나 Google Scholar로 판단하지 않고, **Clarivate Master Journal List의 공식 SSCI 목록**만 씁니다.
mjl.clarivate.com에 무료 계정으로 로그인한 뒤 컬렉션 목록 다운로드에서 Social Sciences Citation Index 목록을 받아,
`SSCI_Journals` 탭 2행부터 `issn | eissn | title | edition | checkedAt`(받은 날짜) 순서로 붙여 넣습니다. 목록은 정기적으로 바뀌므로 학기마다 갱신을 권장합니다.
**이 탭이 비어 있으면 2차 피드백의 문헌 기반 항목은 모두 판단 보류로 표시됩니다.**

한계: 근거는 초록·서지정보 범위이며 유료 원문은 읽지 않습니다(화면과 PDF에 '원문 미확인'으로 표시). Google Scholar는 공식 API가 없고 자동 수집이 이용약관상 제한되어 사용하지 않습니다.

## 5. 웹 앱 배포

**배포 → 새 배포 → 유형: 웹 앱**, 실행 계정 **나**, 액세스 **모든 사용자**. 받은 `/exec` URL을 사이트 `_config.yml`의 `research_help_script_url`에 넣고 사이트를 배포합니다.
코드를 고친 뒤에는 **배포 관리 → 기존 배포 편집 → 새 버전**으로 같은 URL을 유지합니다.

## 저장 구조

- `Submissions`: 제출 ID, 이름, 완료 단계, 상태(draft/submitted), 작성자 토큰의 해시
- `Revisions`: 저장할 때마다 새 행(1·2·3차와 실패한 시도까지 덮어쓰지 않음), 작성 내용·DrS comments(JSON)
- `SSCI_Journals`: 위 4번의 공식 SSCI 목록

## 보안 메모

- 비밀번호 검증은 서버에서만 합니다. 실패 5회마다 15분, 하루 20회 실패 시 24시간 잠깁니다. Apps Script는 접속 IP를 알 수 없어 전체 기준으로 세므로, 공격자가 일부러 실패를 반복하면 관리자도 잠시 잠길 수 있습니다.
- 숫자 4자리 비밀번호는 잠금이 있어도 장기적으로 추측될 수 있습니다. 더 긴 비밀번호로 바꾸는 것을 권장합니다.
- 작성자는 첫 저장 때 받은 무작위 토큰(브라우저에 보관)으로만 자기 기록을 이어 쓸 수 있습니다.
- 수식 주입을 막기 위해 시트에는 모든 값을 텍스트로 저장합니다.

## 비용과 개인정보

기본 설정(Gemini 무료 등급)은 비용이 들지 않습니다. 무료 등급의 분당·일일 한도는 AI Studio의 사용량 화면에서 확인하며, 한도를 넘으면 저장이 실패로 처리되고(작성 내용은 보존) 잠시 뒤 다시 저장하면 됩니다.

Gemini 무료 등급 약관(Unpaid Services)은 제출 내용과 응답을 Google이 서비스 개선에 사용하고 사람 검토자가 읽을 수 있으며, 민감·기밀·개인정보를 보내지 말라고 안내합니다.
그래서 이름은 AI로 보내지 않고, 작성 화면의 동의 문구에 이 조건을 적어 두었습니다. 미발표 연구 아이디어 보호가 중요해지면 Gemini 유료 등급(결제 연결 시 학습에 쓰지 않음)이나 OpenAI 유료로 바꾸세요.
OpenAlex·Crossref는 무료입니다.

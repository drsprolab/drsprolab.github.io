# PRO AnalytiX Lab 홈페이지

Jekyll로 만든 연구실 홈페이지입니다. `main` 브랜치에 push하면 GitHub Actions가 빌드해서 GitHub Pages에 배포합니다.

## 내용 고치기

| 바꿀 내용 | 파일 |
|---|---|
| 교수 프로필, 수상, 학회 활동 | `_data/professor.yml` |
| 구성원 (포닥, 박사, 석사, 알럼나이) | `_data/members.yml` |
| 논문 | `_data/publications.yml` (`professor: true` 교수 페이지, `lab: true` 연구실 페이지) |
| 학술대회 발표 | `_data/presentations.yml` |
| 강의 | `_data/teaching.yml` |
| 연구용역, 강연·자문 | `_data/projects.yml`, `_data/lectures.yml` |
| 연구소·센터 | `_data/institutes.yml`, `_data/institute_details.yml` |
| 구성원 수상, 갤러리 | `_data/member_awards.yml`, `_data/gallery.yml` |
| 상단 메뉴 | `_data/navigation.yml` |
| 미팅 예약 버튼·폼 | `index.html`, `appointment.md`, `assets/js/appointment.js` |

미팅 예약 메일·승인 기능은 [appointment-backend/README.md](appointment-backend/README.md)에 배포 절차가 있습니다. Apps Script 웹 앱의 `/exec` URL을 `_config.yml`에 연결해야 폼이 활성화됩니다.

## 블로그 글 쓰기

`_posts/YYYY-MM-DD-제목.md` 파일을 만들고 맨 위에 아래를 넣은 뒤 마크다운으로 본문을 씁니다.

```yaml
---
layout: post
title: 글 제목
category: 소식
---
```

## 내 컴퓨터에서 미리보기

```bash
bundle install
bundle exec jekyll serve
```
http://127.0.0.1:4000 에서 확인합니다.

## 진단 결과 PDF

In progress의 네 진단은 분석 결과 상단의 **PDF 저장하기**로 현재 선택한 결과 탭을 저장합니다. 개인 결과, 학교·회사·그룹 분석, 비교 탭을 각각 저장할 수 있습니다. 국방 AI 검토의견서의 가운데 제목·명조체 본문·로마 숫자 장 구분·□/○/- 문단 체계로 편집하며, 표·그림 번호와 하단 쪽번호를 붙입니다. 차트·표·행동 권고와 BETA 안내를 A4에 담으며 파일 이름에 진단명·결과 탭·저장 날짜를 넣습니다. PDF는 브라우저 안에서 생성합니다.

공통 저장 기능은 `assets/js/diagnosis-pdf.js`, 출력 스타일은 `assets/css/style.css`의 `diagnosis-pdf-*`에 있습니다. PDF 라이브러리는 `assets/js/pdf-libs/`에서 저장할 때만 불러옵니다.

브라우저 검증은 로컬 Jekyll 서버에서 합성 응답을 사용하며 실제 응답을 제출하지 않습니다. 설치된 Chrome과 개발용 Playwright가 필요합니다.

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node tests/check_diagnosis_pdf_browser.cjs http://127.0.0.1:4000 /tmp/diagnosis-pdf-qa
```

## Research Map 자동 갱신

- **논문 원본은 `_data/publications.yml` 하나입니다.** 논문을 추가·수정·삭제하고 `main`에 반영하면 기존 GitHub Pages 배포 과정에서 키워드, 논문–키워드 연결, Papers / Keywords / Links를 다시 생성합니다. Visible은 현재 분야·선택 필터에 보이는 논문과 키워드 노드 수이며 브라우저에서 즉시 바뀝니다.
- `_plugins/research_map.rb`가 사이트 빌드마다 계산합니다. 별도 예약 작업, API 키, 생성 JSON의 수동 편집은 필요 없습니다. 갱신은 **사이트 배포 후** 적용되며 이미 열린 페이지는 새로고침해야 합니다.
- 기존 `_data/keyword_map.yml`의 한·영 패턴을 제목에 적용하고, 반복되는 새 제목 용어도 빈도 기반으로 추출합니다. 자동 추출은 논문 원문을 이해하는 AI 분류가 아니라 **제목 기반 규칙·빈도 분석**입니다. 새 용어는 학문 분야를 임의로 추정하지 않고 `Emerging Topics`에 표시합니다.
- 기존 사전 키워드는 2편 이상 연결될 때 표시합니다. 새 제목의 한글 복합어·영문 구문은 2편 이상, 영문 단어 하나는 3편 이상일 때 후보가 되며 자동 추출은 최대 24개입니다. 한 편만으로도 꼭 표시할 새 주제는 아래 `keywords`를 명시하면 됩니다. `keywords`는 선택 사항이며 기존 논문 형식을 바꿀 필요는 없습니다.

```yaml
- year: 2026
  title: "논문의 정확한 제목"  # 선택: 없으면 citation에서 제목을 분리
  citation: "저자 (2026). 논문의 정확한 제목. 학술지명."
  journal: "학술지명"
  keywords: ["Generative AI", "새로운 연구주제"]  # 선택: 기존 사전 이름은 기존 노드로 통합
  professor: true
  lab: true
```

- 논문 중복은 정규화한 인용문 또는 제목이 일치하는 DOI로 제거합니다. 같은 DOI인데 제목이 서로 다르면 두 논문을 모두 보존하고 JSON의 `extraction.warnings`에 충돌을 기록합니다. 인용문에만 나오는 저자·학술지명은 키워드 분석 대상이 아닙니다.
- 통계와 그래프는 **동일한 버전의 `assets/data/research-map.json`**을 사용합니다. 데이터 변경 시 URL 버전도 바뀌므로 이전 캐시가 새 통계와 섞이지 않습니다. JavaScript가 꺼져 있어도 빌드 시점의 통계는 표시합니다.
- 배포 전에 생성기 회귀 테스트, 브라우저 데이터 테스트, 빌드 결과의 통계·링크 일치 검사를 실행합니다. 검사 실패 시 새 사이트를 배포하지 않습니다. Scholar·Scopus 인용 지표 갱신과는 별개입니다.

검증:

```bash
bundle exec ruby tests/test_research_map.rb
node --test tests/test_research_map_data.cjs
bundle exec jekyll build
python3 -m unittest discover -s tests -p 'test_research_map_*.py' -v
```

## Weekly Insight 배너 키워드 자동 갱신

- 돌아가는 키워드는 각 DrS / Lab 목록에 보이는 **최근 6편의 `topics`**에서 가져옵니다. 공개하지 않은 글과 다른 섹션의 글은 섞지 않습니다.
- 각 글의 첫 키워드를 최신 목록 순서로 하나씩 고른 뒤 보조 키워드를 채웁니다. 과거 연재에서 반복된 태그가 최신 주제를 밀어내지 않습니다. 화면 폭에 따라 5·8·12개를 표시하며 기존 궤도 애니메이션은 유지합니다.
- 글을 추가·수정하고 배포하면 자동으로 반영됩니다. 별도 키워드 파일을 수정할 필요가 없습니다. 다른 메뉴 배너는 기존 빈도순을 유지합니다.
- 검증: `node --test tests/test_orbit.cjs`, 빌드 후 `python3 -m unittest discover -s tests -p 'test_insight_orbit_site.py' -v`.

## Scholar · Scopus 지표 자동 갱신

- Scholar 자동 갱신: 사용자 Mac의 Hermes 예약 작업 `Google Scholar daily refresh`, **매일 09:00 한국시간** (`0 9 * * *`, 시스템 시간대 Asia/Seoul). Mac이 켜져 있고 인터넷과 Hermes 게이트웨이가 실행 중이어야 합니다. 수집·배포에 따라 실제 사이트 반영은 9시 이후일 수 있습니다.
- GitHub 수동 워크플로: `.github/workflows/research-metrics.yml` (`Manual research metrics`). GitHub 호스팅 실행 환경에서 Scholar가 HTTP 403으로 차단되어 중복 일일 예약을 제거했습니다. Actions의 **Run workflow**는 수동 진단용으로 유지합니다.
- Google Scholar: 공개 프로필의 **전체 기간** 인용 수, h-index, i10-index. CAPTCHA·차단을 우회하지 않습니다.
- Scopus: **자동 갱신하지 않습니다.** Scopus 저자 프로필 화면의 Citations, 인용 문헌 수, Documents, h-index를 `_data/scopus_metrics.yml`에 직접 입력하고 `checked_on`에 기준일을 적습니다. GitHub 워크플로와 Mac 일일 작업은 Scopus API를 호출하지 않습니다.

### 사이트 방문 수
- 대문 Research Map 위에 `Today hit`(최근 24시간)과 `Total hit`(누적)을 표시합니다. 대문과 다른 메뉴 페이지를 포함해 사이트 어느 페이지에 처음 진입해도 방문을 집계합니다.
- 새 브라우저 탭 세션에서 첫 방문을 1회 집계하고 같은 탭의 페이지 이동·새로고침은 중복 집계하지 않습니다. 브라우저 탭 세션 표식은 `sessionStorage`에만 저장하며 IP 주소나 개인 식별 정보는 수집하지 않습니다.
- 카운터 저장소는 무료 Google Apps Script 웹 앱이며, 소스는 `apps-script/research-map-hits/Code.gs`입니다. 시간별 방문 시각을 Script Properties에 저장하고 LockService로 동시 요청을 직렬화합니다.
- Apps Script에서 새 프로젝트를 만들고 위 `Code.gs`를 붙여 넣은 다음 **Deploy → New deployment → Web app**으로 배포합니다. Execute as는 본인, access는 Anyone으로 설정하고 `/exec` URL을 `_data/research_hits.yml`의 `endpoint`에 입력합니다.
- 배포 URL이 비어 있으면 카운터 값은 `—`로 남습니다. 웹 앱 배포 후 GitHub Pages를 다시 배포해야 실제 방문 수가 표시됩니다.
- Scholar 수집이 성공했을 때만 수치와 한국시간 확인 시각을 갱신합니다. 차단·불완전 응답 시 기존 수치와 확인일은 보존하며 실행은 실패로 표시됩니다.
- Mac 일일 작업은 최신 `origin/main`의 격리 작업 트리에서 Scholar만 확인하고 `_data/scholar_metrics.yml`만 커밋합니다. GitHub 수동 워크플로도 Scholar만 확인합니다.
- `main` 푸시 후 `jekyll.yml` 배포 성공 및 공개 교수 페이지를 확인합니다. 공개 화면의 시각은 **최근 성공한 확인 시각**이지 상시 실시간 연결 표시가 아닙니다. 예약 실행 결과는 로컬 Hermes cron 기록에 저장됩니다.

로컬 검증:

```bash
python3 -m unittest discover -s tests -p 'test_*_metrics.py' -v
python3 scripts/update_scholar_metrics.py
```

`--html` / `--json` 옵션은 로컬 파서 검증용입니다. 합성 fixture의 수치를 실제 연구 지표로 커밋하지 마세요.

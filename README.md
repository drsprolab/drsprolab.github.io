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

## Scholar · Scopus 지표 자동 갱신

- Scholar 자동 갱신: 사용자 Mac의 Hermes 예약 작업 `Google Scholar daily refresh`, **매일 09:00 한국시간** (`0 9 * * *`, 시스템 시간대 Asia/Seoul). Mac이 켜져 있고 인터넷과 Hermes 게이트웨이가 실행 중이어야 합니다. 수집·배포에 따라 실제 사이트 반영은 9시 이후일 수 있습니다.
- GitHub 수동 워크플로: `.github/workflows/research-metrics.yml` (`Manual research metrics`). GitHub 호스팅 실행 환경에서 Scholar가 HTTP 403으로 차단되어 중복 일일 예약을 제거했습니다. Actions의 **Run workflow**는 수동 진단용으로 유지합니다.
- Google Scholar: 공개 프로필의 **전체 기간** 인용 수, h-index, i10-index. CAPTCHA·차단을 우회하지 않습니다.
- Scopus: **자동 갱신하지 않습니다.** Scopus 저자 프로필 화면의 Citations, 인용 문헌 수, Documents, h-index를 `_data/scopus_metrics.yml`에 직접 입력하고 `checked_on`에 기준일을 적습니다. GitHub 워크플로와 Mac 일일 작업은 Scopus API를 호출하지 않습니다.
- Scholar 수집이 성공했을 때만 수치와 한국시간 확인 시각을 갱신합니다. 차단·불완전 응답 시 기존 수치와 확인일은 보존하며 실행은 실패로 표시됩니다.
- Mac 일일 작업은 최신 `origin/main`의 격리 작업 트리에서 Scholar만 확인하고 `_data/scholar_metrics.yml`만 커밋합니다. GitHub 수동 워크플로도 Scholar만 확인합니다.
- `main` 푸시 후 `jekyll.yml` 배포 성공 및 공개 교수 페이지를 확인합니다. 공개 화면의 시각은 **최근 성공한 확인 시각**이지 상시 실시간 연결 표시가 아닙니다. 예약 실행 결과는 로컬 Hermes cron 기록에 저장됩니다.

로컬 검증:

```bash
python3 -m unittest discover -s tests -p 'test_*_metrics.py' -v
python3 scripts/update_scholar_metrics.py
```

`--html` / `--json` 옵션은 로컬 파서 검증용입니다. 합성 fixture의 수치를 실제 연구 지표로 커밋하지 마세요.

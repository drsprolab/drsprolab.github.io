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

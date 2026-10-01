# Daily Insight — 로컬 검토 안내

## 현재 상태

- 작업 위치: `/Users/jihoonsong/project/drsprolab.github.io`
- 로컬 브랜치: `daily-insight-2026-10-01`
- 미리보기: http://127.0.0.1:4001/daily-insight/
- 첫 브리핑: http://127.0.0.1:4001/daily-insight/2026-10-01/
- 로컬 검토를 마친 뒤 2026-10-01 사용자 공개 요청에 따라 배포를 진행합니다.
- 이 저장소는 `main`에 push하면 자동 배포됩니다. 공개 승인은 2026-10-01 받았습니다.
- 4000번 포트의 기존 서버는 건드리지 않았습니다.

## 다시 실행하기

```bash
cd /Users/jihoonsong/project/drsprolab.github.io
bundle exec jekyll serve --config _config.yml,_config.preview.yml --host 127.0.0.1 --port 4001 --livereload --livereload-port 35730
```

`_config.preview.yml`은 로컬 검토 배너, noindex, 로컬 canonical URL을 설정합니다. GitHub Actions는 기본 `_config.yml`만 사용하므로 공개 빌드에는 이 배너가 들어가지 않습니다. 서버는 로컬 루프백 주소로만 열려 있습니다.

## 검토할 내용

1. 상단 Daily Insight 메뉴와 날짜별 브리핑 목록
2. 2026-10-01 브리핑의 소식 5건 및 공식 출처 6개
3. 각 원문의 발표일(9월 28~30일)과 브리핑 작성일의 구분
4. 모델 가격·제공 범위·발표 기업의 주장과 편집자 해석의 구분
5. PC와 모바일에서의 메뉴와 본문 읽기

## 앞으로 글 추가하기

`_insights/YYYY-MM-DD.md`에 `layout: insight`, `date`, `title`, `summary`, `news_count`, `source_count`, `reading_minutes`, `topics`를 지정한 글을 추가합니다. `Daily Insight` 목록은 날짜 역순으로 갱신됩니다. 기존 Blog와는 별도 컬렉션입니다. 자동 수집이나 자동 발행 스케줄은 설정하지 않았습니다.

## 검사

공개 빌드 검사:

```bash
bundle exec jekyll build
python3 -m unittest discover -s tests -v
```

로컬 미리보기 검사:

```bash
bundle exec jekyll build --config _config.yml,_config.preview.yml
EXPECT_PREVIEW=1 python3 -m unittest discover -s tests -v
```

실행 중인 서버와 다른 빌드를 같은 `_site`에 동시에 만들면 페이지가 잠시 바뀔 수 있습니다. 검사는 서버를 멈춘 뒤 실행하거나 별도의 `--destination`을 사용하세요.

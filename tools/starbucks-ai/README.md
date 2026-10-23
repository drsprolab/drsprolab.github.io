# 스타벅스 AI 기본 역량 진단: 응답 저장소

페이지: `in-progress/starbucks-ai-store/`(매장용), `in-progress/starbucks-ai-hq/`(본사용) · 공통 스크립트: `assets/js/starbucks-ai.js`

- 스프레드시트 하나에 Apps Script 하나. 매장용 응답은 `store` 탭, 본사용 응답은 `hq` 탭에 따로 쌓인다(탭은 첫 응답 때 자동 생성).
- 열: 제출 시각, 결과 코드, 직급(키), 직무, AI 사용 빈도, 응답 시간(초), Q01~Q24.
- `assets/js/starbucks-ai.js`의 `ENDPOINT`가 비어 있으면 시험 모드(응답이 브라우저에만 저장).

## 연결
1. 개인 Gmail로 새 스프레드시트 → 확장 프로그램 → Apps Script → `apps-script.gs` 붙여 넣고 저장.
2. 배포 → 새 배포 → 웹 앱, 실행 계정 **나**, 액세스 **모든 사용자**.
3. 웹 앱 URL을 `assets/js/starbucks-ai.js`의 `ENDPOINT`에 넣는다.

## 결과 계산
- 종합 점수: 24문항 평균을 0~100으로 환산((평균 − 1) ÷ 4 × 100).
- 비교: 같은 진단(매장용 또는 본사용) 안에서 동일 직무·동일 직급(3명 이상)·전체.
- 교육 요구도: (5 − 영역 평균) + 2 × (1~2점 응답 비율), 응답 5명 이상일 때 상위 3개 영역.

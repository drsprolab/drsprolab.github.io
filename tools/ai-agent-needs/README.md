# AI Agent 요구도 분석: 응답 저장소 연결

페이지 `in-progress/ai-agent-needs/index.html` · 스크립트 `assets/js/ai-agent-needs.js` · 문항 `assets/data/ai-agent-needs.json` · 저장소 `apps-script.gs`

1. 새 Google 스프레드시트 → 확장 프로그램 → Apps Script → `apps-script.gs` 내용을 붙여 넣고 저장
2. 배포 → 새 배포 → 유형 "웹 앱", 실행 계정 "나", 액세스 "모든 사용자" → 배포
3. 웹 앱 URL(`https://script.google.com/macros/s/.../exec`)을 페이지 front matter의 `endpoint:`에 넣는다. 비워 두면 시험 모드(이 브라우저에만 저장)
4. 코드를 고친 뒤에는 배포 관리 → 수정 → 새 버전으로 다시 배포한다(URL 유지)

시트 `responses`: 제출 시각, 결과 코드, 그룹(?group=), 배경 5문항, 심화 여부, 소요 시간, `I_A01…I_G03`(중요도), `P_A01…P_G03`(수행수준). 심화 문항은 심화 응답자만 채운다.

분석(브라우저에서 계산): 문항별 중요도·수행수준 평균, 대응표본 t 검정, Borich 요구도(= (I−P) 평균 × I 평균), Locus for Focus·IPA 사분면, 최우선(= Borich 상위 K위 ∩ LFF HH, K = HH 문항 수)·차우선.

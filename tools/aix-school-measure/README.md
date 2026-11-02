# 우리학교 AIX 전환 준비·성숙도 진단 (정식 측정도구 · 독립 복제본)

페이지: `_posts/2026-11-02-aix-school-diagnosis.md` (블로그 `/blog/` 측정도구 목록에 노출) · 스크립트: `assets/js/aix-school-measure.js` · 저장소: `apps-script.gs`

`in-progress/aix-school/`(설문 문항·채점·화면 로직)과 **완전히 같은 설문**이다. 문항 구성, 단계 구조, 채점 방식, 결과 화면은 모두 같고, 설계 근거는 `tools/aix-school/README.md`를 그대로 참고한다. 다른 점은 응답을 **별도의 스프레드시트**에 독립적으로 모은다는 것뿐이다(진행 중 진단과 데이터가 섞이지 않게).

`apps-script.gs`는 `tools/aix-school/apps-script.gs`의 변경 없는 복사본이다. 연결 방법은 `tools/ax-readiness/README.md` 7절과 같다: 새 스프레드시트를 만들고 이 폴더의 `apps-script.gs`를 붙여 넣은 뒤, 웹 앱으로 배포하고 그 URL을 `_posts/2026-11-02-aix-school-diagnosis.md`의 `endpoint`에 넣는다.

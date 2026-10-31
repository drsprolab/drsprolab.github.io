# 배포 준비 상태

## 반영된 코드

- `Code.gs`를 Apps Script 프로젝트 `Research help backend`에 반영하고 Drive 저장 완료를 확인했습니다.
- 새 버전 설명: `1차 피드백: 원고 근거·의도·근거와 가정·항목 간 정렬 기반 질문 구조`
- Apps Script 편집기의 **배포 관리 → 수정** 화면에서 `새 버전`이 선택되어 있고, 설명이 입력된 상태입니다.
- 아직 **배포** 버튼은 누르지 않았습니다. 이 버튼을 누르면 기존 웹 앱 URL의 운영 코드가 새 버전으로 바뀝니다.

## 배포 실행

배포 관리 창에서 실행 계정이 `나 (psu.jihoonsong@gmail.com)`, 접근 권한이 `모든 사용자`인지 확인한 뒤 **배포**를 누릅니다. 새 URL이 만들어지지 않도록 기존 배포의 **수정** 흐름에서 계속 진행합니다.

- 프로젝트 ID: `1egRLhY0FPe1IER_6BgwXHkO03erHyRgEfLGV0M6Zlw0h2KqxR233xVxn`
- 기존 배포 ID: `AKfycbweFpw9xGCNbvxkfRbH_fru7OocRdpsBpdJCbjC2UTiQgZdbml4u3B_j_CFXqbydStr`
- 기존 웹 앱 URL: <https://script.google.com/macros/s/AKfycbweFpw9xGCNbvxkfRbH_fru7OocRdpsBpdJCbjC2UTiQgZdbml4u3B_j_CFXqbydStr/exec>

배포가 완료되면 위 URL을 그대로 사용합니다. 이후 작성 화면에서 새 1차 피드백을 확인하고, 첫 제출 전에 빈 연구계획서용 테스트 계정을 사용해 질문 구조와 서버 응답을 점검합니다.

## 소스 기준

이 배포는 저장소의 `research-help-backend/Code.gs`를 기준으로 합니다. 앱 설정·Quiz.gs와 스크립트 속성은 변경하지 않았습니다. 저장소의 웹페이지 변경은 커밋 `38ed134`에 포함되어 있으며 GitHub Pages 배포와 Apps Script 배포는 서로 별도입니다.

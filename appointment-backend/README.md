# Appointment request 메일 백엔드

GitHub Pages는 정적 사이트이므로 메일 전송과 승인 처리는 Google Apps Script 웹 앱에서 실행합니다.

1. 확정 메일을 발송할 Google 계정으로 [script.google.com](https://script.google.com/)에서 새 프로젝트를 만듭니다. 현재 배포는 **psu.jihoonsong@gmail.com** 계정으로 실행하고, 요청 메일은 **jhsong77@hanyang.ac.kr**로 보냅니다.
2. 이 폴더의 `Code.gs` 전체를 스크립트 편집기에 붙여 넣습니다. 프로젝트 설정에서 `appsscript.json` 표시를 켜고 파일 내용도 복사합니다.
3. **배포 → 새 배포 → 웹 앱**에서 '실행 계정: 나', '액세스 권한: 모든 사용자'로 배포합니다. Google이 요구하는 메일·시트 권한을 승인합니다.
4. 배포된 **/exec URL**을 `_config.yml`의 `appointment_script_url`에 입력한 뒤 사이트를 빌드·배포합니다.
5. 실제 이메일 2개로 요청 → 교수님 메일 수신 → 승인 링크 클릭 → 학생 확정 메일 수신 및 Google 캘린더 일정 생성을 확인합니다.

첫 요청 시 해당 Google 계정 드라이브에 요청 기록용 스프레드시트가 자동 생성됩니다. 승인 링크는 무작위 토큰으로 보호되며, 링크를 여는 것만으로 승인되지는 않습니다. 이미 캘린더에 일정이 있는 시간은 요청·승인할 수 없고, 승인되면 Apps Script 실행 계정의 기본 Google 캘린더에 1시간 일정이 생성됩니다. 이 Google 계정의 캘린더가 macOS 캘린더에 동기화되어 있으면 맥 캘린더에도 자동 표시됩니다. 첨부파일은 최대 3개, 합계 4MB이며 요청 메일에 첨부됩니다. 연구 관련 미팅은 첨부파일이 필수입니다.

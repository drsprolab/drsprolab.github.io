# Appointment request 메일 백엔드

GitHub Pages는 정적 사이트이므로 메일 전송과 승인 처리는 Google Apps Script 웹 앱에서 실행합니다.

1. 확정 메일을 발송할 Google 계정으로 [script.google.com](https://script.google.com/)에서 새 프로젝트를 만듭니다. 교수님 공식 계정에서 발송하려면 **jhsong77@hanyang.ac.kr** 계정으로 로그인합니다.
2. 이 폴더의 `Code.gs` 전체를 스크립트 편집기에 붙여 넣습니다. 프로젝트 설정에서 `appsscript.json` 표시를 켜고 파일 내용도 복사합니다.
3. **배포 → 새 배포 → 웹 앱**에서 '실행 계정: 나', '액세스 권한: 모든 사용자'로 배포합니다. Google이 요구하는 메일·시트 권한을 승인합니다.
4. 배포된 **/exec URL**을 `_config.yml`의 `appointment_script_url`에 입력한 뒤 사이트를 빌드·배포합니다.
5. 실제 이메일 2개로 요청 → 교수님 메일 수신 → 승인 링크 클릭 → 학생 확정 메일 수신을 확인합니다.

첫 요청 시 해당 Google 계정 드라이브에 요청 기록용 스프레드시트가 자동 생성됩니다. 승인 링크는 무작위 토큰으로 보호되며, 링크를 여는 것만으로 승인되지는 않습니다. 동일한 시간은 한 건만 승인할 수 있습니다. 사이트는 실제 Google Calendar 일정과 연동하지 않습니다.

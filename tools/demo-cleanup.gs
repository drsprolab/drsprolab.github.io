// 가상(데모) 응답 정리: 각 진단 시트의 Apps Script 편집기에 붙여 넣고, 함수 목록에서 고른 뒤 ▶ 실행한다.
// 웹앱 재배포는 필요 없다. 실행 결과는 [실행 로그]에 남는다.
// 1) previewDemoRows: 지울 행과 남을 행을 세어 보여 준다(아무것도 지우지 않음).
// 2) deleteDemoRows: group이 DEMO·CONNECTTEST이거나 id가 TEST로 시작하는 행을 지운다.

var DEMO_GROUPS = ['DEMO', 'CONNECTTEST'];

function demoSheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('responses');
  if (!sh) throw new Error('responses 시트를 찾지 못했습니다.');
  return sh;
}
function isDemo_(row, gi, ii) {
  return (gi >= 0 && DEMO_GROUPS.indexOf(String(row[gi]).trim()) >= 0) || (ii >= 0 && /^TEST/.test(String(row[ii])));
}
function previewDemoRows() {
  var vals = demoSheet_().getDataRange().getDisplayValues(), head = vals[0];
  var gi = head.indexOf('group'), ii = head.indexOf('id'), byGroup = {}, n = 0;
  for (var r = 1; r < vals.length; r++) {
    var g = gi >= 0 ? vals[r][gi] || '(빈칸)' : '(group 열 없음)';
    byGroup[g] = (byGroup[g] || 0) + 1;
    if (isDemo_(vals[r], gi, ii)) n++;
  }
  Logger.log('group별 행 수: ' + JSON.stringify(byGroup));
  Logger.log('지울 가상 행: ' + n + ' / 남을 행: ' + (vals.length - 1 - n));
}
function deleteDemoRows() {
  var sh = demoSheet_(), vals = sh.getDataRange().getDisplayValues(), head = vals[0];
  var gi = head.indexOf('group'), ii = head.indexOf('id'), removed = 0;
  // 아래에서 위로, 이어진 행은 한 번에 지운다(행 번호가 밀리지 않게).
  for (var r = vals.length - 1; r >= 1; r--) {
    if (!isDemo_(vals[r], gi, ii)) continue;
    var end = r;
    while (r - 1 >= 1 && isDemo_(vals[r - 1], gi, ii)) r--;
    sh.deleteRows(r + 1, end - r + 1);
    removed += end - r + 1;
  }
  Logger.log('지운 가상 행: ' + removed + ' / 남은 응답: ' + Math.max(0, sh.getLastRow() - 1));
}

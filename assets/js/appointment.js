(function () {
  var select = document.getElementById('appointment-date');
  if (!select) return;
  var formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'long'
  });
  var todayParts = formatter.formatToParts(new Date());
  var values = {};
  todayParts.forEach(function (part) { values[part.type] = part.value; });
  var today = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  for (var offset = 1; offset <= 56; offset++) {
    var day = new Date(today + offset * 86400000);
    if ([1, 2, 4].indexOf(day.getUTCDay()) === -1) continue;
    var iso = day.toISOString().slice(0, 10);
    var option = document.createElement('option');
    option.value = iso;
    option.textContent = formatter.format(day);
    select.appendChild(option);
  }
})();

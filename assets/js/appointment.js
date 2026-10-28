(function () {
  var form = document.getElementById('appointment-form');
  if (!form) return;

  var dateInput = document.getElementById('appointment-date');
  var timeInput = document.getElementById('appointment-time');
  var grid = document.getElementById('appointment-calendar-grid');
  var monthLabel = document.getElementById('appointment-month');
  var previous = document.getElementById('appointment-prev-month');
  var next = document.getElementById('appointment-next-month');
  var filesInput = document.getElementById('appointment-files');
  var attachmentsInput = document.getElementById('appointment-attachments');
  var error = document.getElementById('appointment-error');
  var submit = form.querySelector('.appointment-submit');
  var kst = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  var parts = {};
  kst.formatToParts(new Date()).forEach(function (part) { parts[part.type] = part.value; });
  var today = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  var first = today + 86400000;
  var last = today + 56 * 86400000;
  var month = new Date(first).getUTCMonth();
  var year = new Date(first).getUTCFullYear();
  var firstMonth = year * 12 + month;
  var lastDate = new Date(last);
  var lastMonth = lastDate.getUTCFullYear() * 12 + lastDate.getUTCMonth();
  var weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  function renderCalendar() {
    var start = new Date(Date.UTC(year, month, 1));
    var days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    monthLabel.textContent = year + '년 ' + (month + 1) + '월';
    grid.textContent = '';
    weekdays.forEach(function (day) {
      var label = document.createElement('span');
      label.className = 'appointment-weekday';
      label.textContent = day;
      grid.appendChild(label);
    });
    for (var blank = 0; blank < start.getUTCDay(); blank++) {
      var spacer = document.createElement('span');
      spacer.setAttribute('aria-hidden', 'true');
      grid.appendChild(spacer);
    }
    for (var day = 1; day <= days; day++) {
      var date = new Date(Date.UTC(year, month, day));
      var value = date.toISOString().slice(0, 10);
      var allowed = date.getTime() >= first && date.getTime() <= last &&
        [1, 2, 4].indexOf(date.getUTCDay()) !== -1;
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = day;
      button.disabled = !allowed;
      button.setAttribute('aria-label', year + '년 ' + (month + 1) + '월 ' + day + '일 ' + weekdays[date.getUTCDay()] + '요일');
      button.setAttribute('aria-pressed', String(dateInput.value === value));
      if (dateInput.value === value) button.className = 'selected';
      if (allowed) button.addEventListener('click', function (chosen) {
        return function () { dateInput.value = chosen; showError(''); renderCalendar(); };
      }(value));
      grid.appendChild(button);
    }
    previous.disabled = year * 12 + month <= firstMonth;
    next.disabled = year * 12 + month >= lastMonth;
  }

  previous.addEventListener('click', function () {
    month--;
    if (month < 0) { month = 11; year--; }
    renderCalendar();
  });
  next.addEventListener('click', function () {
    month++;
    if (month > 11) { month = 0; year++; }
    renderCalendar();
  });
  document.querySelectorAll('#appointment-time-options button').forEach(function (button) {
    button.addEventListener('click', function () {
      timeInput.value = button.dataset.time;
      document.querySelectorAll('#appointment-time-options button').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      showError('');
    });
  });
  renderCalendar();

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve({ name: file.name, data: String(reader.result).split(',')[1] });
      };
      reader.onerror = function () { reject(new Error('첨부파일을 읽을 수 없습니다. 다시 선택해 주세요.')); };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    if (!dateInput.value || !timeInput.value) {
      showError('달력에서 날짜와 시간을 선택해 주세요.');
      return;
    }
    var files = Array.from(filesInput.files);
    var meetingType = form.querySelector('input[name="meetingType"]:checked').value;
    if (meetingType === 'research' && !files.length) {
      showError('연구 관련 미팅은 미리 볼 수 있는 자료를 첨부해 주세요.');
      filesInput.focus();
      return;
    }
    if (files.length > 3 || files.reduce(function (sum, file) { return sum + file.size; }, 0) > 4 * 1024 * 1024 ||
        files.some(function (file) { return !file.size || !/\.(pdf|doc|docx|ppt|pptx|txt|png|jpe?g)$/i.test(file.name); })) {
      showError('첨부파일은 PDF·문서·발표자료·텍스트·이미지 최대 3개, 합계 4MB까지 가능합니다.');
      filesInput.focus();
      return;
    }
    showError('');
    submit.disabled = true;
    submit.textContent = '파일 준비 중…';
    try {
      attachmentsInput.value = JSON.stringify(await Promise.all(files.map(readFile)));
      submit.textContent = '요청 전송 중…';
      HTMLFormElement.prototype.submit.call(form);
    } catch (err) {
      showError(err.message || '파일을 읽는 중 오류가 발생했습니다.');
      submit.disabled = false;
      submit.textContent = '미팅 요청 보내기';
    }
  });
})();

(function () {
  var form = document.getElementById('appointment-form');
  if (!form) return;

  var dateInput = document.getElementById('appointment-date');
  var timeInput = document.getElementById('appointment-time');
  var grid = document.getElementById('appointment-calendar-grid');
  var monthLabel = document.getElementById('appointment-month');
  var previous = document.getElementById('appointment-prev-month');
  var next = document.getElementById('appointment-next-month');
  var dropzone = document.getElementById('appointment-dropzone');
  var fileList = document.getElementById('appointment-file-list');
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
  var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var droppedFiles = [];
  var inquiryMode = new URLSearchParams(window.location.search).get('inquiry') === '1';
  if (inquiryMode) {
    document.querySelector('.page-head h1').textContent = "Graduate admissions and consulting inquiries";
    document.querySelector('.page-head .lede').textContent = "Request a meeting about graduate admissions or consulting. Your meeting is confirmed only after approval.";
    document.getElementById('appointment-availability').innerHTML = "Available meeting times: <strong>Monday–Friday, 1–6 p.m.</strong>Select a one-hour slot. All times are Korea Standard Time (KST).";
    document.getElementById('appointment-date-note').textContent = "Choose an available date, Monday–Friday.";
    document.getElementById('appointment-attachment-note').textContent = "Attach any supporting materials as PDFs. Convert other file types to PDF before submitting.";
    var standardTypes = document.getElementById('appointment-standard-types');
    var inquiryTypes = document.getElementById('appointment-inquiry-types');
    standardTypes.hidden = true;
    standardTypes.querySelectorAll('input').forEach(function (input) { input.disabled = true; input.checked = false; });
    inquiryTypes.hidden = false;
    inquiryTypes.querySelectorAll('input').forEach(function (input) { input.disabled = false; });
    var requestedType = new URLSearchParams(window.location.search).get('type');
    inquiryTypes.querySelector('input[value="' + (requestedType === 'consulting' ? 'consulting' : 'admissions') + '"]').checked = true;
    var times = document.getElementById('appointment-time-options');
    ['15:00', '16:00', '17:00'].forEach(function (start) {
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.time = start;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = start + '–' + String(Number(start.slice(0, 2)) + 1).padStart(2, '0') + ':00';
      times.appendChild(button);
    });
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  function renderCalendar() {
    var start = new Date(Date.UTC(year, month, 1));
    var days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    monthLabel.textContent = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(start);
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
        (inquiryMode ? [1, 2, 3, 4, 5] : [1, 2, 4]).indexOf(date.getUTCDay()) !== -1;
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = day;
      button.disabled = !allowed;
      button.setAttribute('aria-label', new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeZone:'UTC'}).format(date));
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

  function renderFiles() {
    fileList.textContent = '';
    droppedFiles.forEach(function (file, index) {
      var item = document.createElement('li');
      var name = document.createElement('span');
      name.textContent = file.name + ' (' + Math.ceil(file.size / 1024) + 'KB)';
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = "Remove";
      remove.setAttribute('aria-label', file.name + " Remove");
      remove.addEventListener('click', function () {
        droppedFiles.splice(index, 1);
        renderFiles();
      });
      item.appendChild(name);
      item.appendChild(remove);
      fileList.appendChild(item);
    });
  }

  dropzone.addEventListener('dragover', function (event) {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
  dropzone.addEventListener('dragleave', function () {
    dropzone.classList.remove('is-dragging');
  });
  dropzone.addEventListener('drop', function (event) {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    var incoming = Array.from(event.dataTransfer.files);
    if (!incoming.length) return;
    if (incoming.some(function (file) { return !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf'); })) {
      showError("Only PDF attachments are accepted. Convert other file types to PDF before submitting.");
      return;
    }
    var combined = droppedFiles.concat(incoming);
    if (combined.length > 3 || combined.some(function (file) { return !file.size; }) ||
        combined.reduce(function (sum, file) { return sum + file.size; }, 0) > 4 * 1024 * 1024) {
      showError("Attach up to three PDFs, with a combined size of 4 MB or less.");
      return;
    }
    droppedFiles = combined;
    showError('');
    renderFiles();
  });

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve({ name: file.name, data: String(reader.result).split(',')[1] });
      };
      reader.onerror = function () { reject(new Error("The attachment could not be read. Please select it again.")); };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    if (!dateInput.value || !timeInput.value) {
      showError("Please choose a date and a time.");
      return;
    }
    var files = droppedFiles;
    var meetingType = form.querySelector('input[name="meetingType"]:checked').value;
    if (meetingType === 'research' && !files.length) {
      showError("For research meetings, please attach materials for review in advance.");
      return;
    }
    if (files.length > 3 || files.reduce(function (sum, file) { return sum + file.size; }, 0) > 4 * 1024 * 1024 ||
        files.some(function (file) { return !file.size || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf'); })) {
      showError("Attach up to three PDFs, totaling no more than 4 MB. Convert other file types to PDF first.");
      return;
    }
    showError('');
    submit.disabled = true;
    submit.textContent = "Preparing attachments…";
    try {
      attachmentsInput.value = JSON.stringify(await Promise.all(files.map(readFile)));
      submit.textContent = "Sending request…";
      HTMLFormElement.prototype.submit.call(form);
    } catch (err) {
      showError(err.message || "An error occurred while reading the file.");
      submit.disabled = false;
      submit.textContent = "Send meeting request";
    }
  });
})();

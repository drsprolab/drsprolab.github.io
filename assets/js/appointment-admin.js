(function () {
  'use strict';
  var root = document.getElementById('appointment-admin');
  if (!root) return;
  var endpoint = root.getAttribute('data-endpoint');
  var key = 'appointment-admin-session';
  var session = sessionStorage.getItem(key);

  function node(tag, text, className) {
    var item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function status(message) {
    var element = root.querySelector('[role="status"]');
    if (element) element.textContent = message || '';
  }

  function call(action, data) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action, session: session }, data || {}))
    }).then(function (response) { return response.json(); }).then(function (result) {
      if (!result.ok) {
        var error = new Error(result.message || '요청에 실패했습니다.');
        error.code = result.error;
        throw error;
      }
      return result;
    });
  }

  function error(err) {
    if (err.code === 'admin_session') {
      session = null;
      sessionStorage.removeItem(key);
      login();
    }
    status(err.message || '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }

  function login() {
    root.replaceChildren();
    var form = node('form', undefined, 'appointment-admin-login');
    var label = node('label', '열람 비밀번호');
    var input = node('input');
    input.type = 'password';
    input.inputMode = 'numeric';
    input.autocomplete = 'current-password';
    input.required = true;
    label.appendChild(input);
    var button = node('button', '열람');
    button.type = 'submit';
    form.append(label, button);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      button.disabled = true;
      status('확인 중…');
      call('adminLogin', { password: input.value }).then(function (result) {
        input.value = '';
        session = result.session;
        sessionStorage.setItem(key, session);
        list();
      }).catch(error).finally(function () { button.disabled = false; });
    });
    root.append(form, node('p', '', 'appointment-admin-status'));
    root.lastChild.setAttribute('role', 'status');
    if (!endpoint) status('서버 연결이 설정되지 않았습니다.');
  }

  function download(meeting, attachment, button) {
    button.disabled = true;
    status('첨부파일을 불러오는 중…');
    call('adminFile', { id: meeting.id, index: attachment.index }).then(function (result) {
      var raw = atob(result.data);
      var bytes = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      var link = node('a');
      link.href = url;
      link.download = result.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      status('');
    }).catch(error).finally(function () { button.disabled = false; });
  }

  function list() {
    var loadingStatus = node('p', '확정 미팅을 불러오는 중…', 'appointment-admin-status');
    loadingStatus.setAttribute('role', 'status');
    root.replaceChildren(loadingStatus);
    call('adminList').then(function (result) {
      root.replaceChildren();
      var bar = node('div', undefined, 'appointment-admin-bar');
      bar.appendChild(node('strong', '확정 미팅 ' + result.meetings.length + '건'));
      var logout = node('button', '로그아웃');
      logout.type = 'button';
      logout.addEventListener('click', function () {
        session = null;
        sessionStorage.removeItem(key);
        login();
      });
      bar.appendChild(logout);
      root.appendChild(bar);
      var statusNode = node('p', '', 'appointment-admin-status');
      statusNode.setAttribute('role', 'status');
      if (!result.meetings.length) root.appendChild(node('p', '확정된 미팅이 없습니다.'));
      result.meetings.forEach(function (meeting) {
        var card = node('article', undefined, 'appointment-admin-card');
        card.appendChild(node('h2', meeting.date + ' ' + meeting.time + ' · ' + meeting.name));
        card.appendChild(node('p', meeting.email + ' · ' + meeting.message));
        if (meeting.attachments.length) {
          var files = node('ul');
          meeting.attachments.forEach(function (attachment) {
            var item = node('li');
            var button = node('button', attachment.name + ' 다운로드');
            button.type = 'button';
            button.addEventListener('click', function () { download(meeting, attachment, button); });
            item.appendChild(button);
            files.appendChild(item);
          });
          card.appendChild(files);
        } else card.appendChild(node('p', '보관된 첨부파일 없음', 'appointment-note'));
        root.appendChild(card);
      });
      root.appendChild(statusNode);
    }).catch(error);
  }

  if (session) list(); else login();
})();

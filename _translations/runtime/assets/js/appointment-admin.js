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
        var error = new Error(result.message || "Your request could not be completed.");
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
    status(err.message || "Could not connect. Please try again shortly.");
  }

  function login() {
    root.replaceChildren();
    var form = node('form', undefined, 'appointment-admin-login');
    var label = node('label', "Access password");
    var input = node('input');
    input.type = 'password';
    input.inputMode = 'numeric';
    input.autocomplete = 'current-password';
    input.required = true;
    label.appendChild(input);
    var button = node('button', "View meetings");
    button.type = 'submit';
    form.append(label, button);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      button.disabled = true;
      status("Checking…");
      call('adminLogin', { password: input.value }).then(function (result) {
        input.value = '';
        session = result.session;
        sessionStorage.setItem(key, session);
        list();
      }).catch(error).finally(function () { button.disabled = false; });
    });
    root.append(form, node('p', '', 'appointment-admin-status'));
    root.lastChild.setAttribute('role', 'status');
    if (!endpoint) status("The server connection has not been configured.");
  }

  function download(meeting, attachment, button) {
    button.disabled = true;
    status("Loading attachment…");
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
    var loadingStatus = node('p', "Loading confirmed meetings…", 'appointment-admin-status');
    loadingStatus.setAttribute('role', 'status');
    root.replaceChildren(loadingStatus);
    call('adminList').then(function (result) {
      root.replaceChildren();
      var bar = node('div', undefined, 'appointment-admin-bar');
      bar.appendChild(node('strong', "Confirmed meetings " + result.meetings.length + " meetings"));
      var logout = node('button', "Sign out");
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
      if (!result.meetings.length) root.appendChild(node('p', "No confirmed meetings."));
      result.meetings.forEach(function (meeting) {
        var card = node('article', undefined, 'appointment-admin-card');
        card.appendChild(node('h2', meeting.date + ' ' + meeting.time + ' · ' + meeting.name));
        card.appendChild(node('p', meeting.email + ' · ' + meeting.message));
        if (meeting.attachments.length) {
          var files = node('ul');
          meeting.attachments.forEach(function (attachment) {
            var item = node('li');
            var button = node('button', attachment.name + " Download");
            button.type = 'button';
            button.addEventListener('click', function () { download(meeting, attachment, button); });
            item.appendChild(button);
            files.appendChild(item);
          });
          card.appendChild(files);
        } else card.appendChild(node('p', "No attachments stored", 'appointment-note'));
        root.appendChild(card);
      });
      root.appendChild(statusNode);
    }).catch(error);
  }

  if (session) list(); else login();
})();

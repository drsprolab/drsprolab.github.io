(function () {
  'use strict';

  var section = document.getElementById('rmap');
  if (!section) return;

  var endpoint = (section.getAttribute('data-hit-api') || '').trim();
  var today = document.getElementById('rm-hit-today');
  var total = document.getElementById('rm-hit-total');
  if (!endpoint || !today || !total) return;

  function show(data) {
    if (!data || !Number.isFinite(data.today) || !Number.isFinite(data.total)) return;
    today.textContent = data.today.toLocaleString('en-US');
    total.textContent = data.total.toLocaleString('en-US');
  }

  var counted = false;
  try {
    counted = window.sessionStorage.getItem('proax-rmap-hit-v1') === '1';
  } catch (_) {
    // Private browsing modes may disable sessionStorage; count this page view.
  }

  var callback = '__proaxResearchMapHit_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
  var script = document.createElement('script');
  var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
  window[callback] = function (data) {
    show(data);
    if (!counted && data && Number.isFinite(data.total)) {
      try { window.sessionStorage.setItem('proax-rmap-hit-v1', '1'); } catch (_) { /* no-op */ }
    }
    delete window[callback];
    script.remove();
  };
  script.onerror = function () {
    delete window[callback];
    script.remove();
  };
  script.src = endpoint + separator + 'action=' + (counted ? 'stats' : 'hit') +
    '&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
  document.head.appendChild(script);
}());

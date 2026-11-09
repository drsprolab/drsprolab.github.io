/* First-visit country selection; a manual choice always takes precedence. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.mount(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var KEY = 'proax-language-v1';
  function preferred(country, languages, timeZone) {
    if (country === 'KR') return 'ko';
    if (/^[A-Z]{2}$/.test(country || '')) return 'en';
    var first = (languages || [])[0] || '';
    if (/^ko(?:-|$)/i.test(first)) return 'ko';
    if (/^en(?:-|$)/i.test(first)) return 'en';
    return timeZone === 'Asia/Seoul' ? 'ko' : 'en';
  }
  function mount(win) {
    var doc = win.document, root = doc.documentElement;
    var raw = doc.getElementById('language-routing');
    if (!raw) return;
    var routes = JSON.parse(raw.textContent), current = root.lang === 'en' ? 'en' : 'ko';
    var path = win.location.pathname, original = path.replace(/^\/en(?=\/)/, '').replace(/\/index\.html$/, '/');
    var manuallySelected = false, interacted = false;
    var search = new URLSearchParams(win.location.search);
    var explicit = search.get('lang');
    function read(key) { try { return win.localStorage.getItem(key); } catch (_) { return null; } }
    function save(lang) { manuallySelected = true; try { win.localStorage.setItem(KEY, lang); } catch (_) {} }
    function visit(lang) {
      if (lang === current || interacted) return;
      // Preserve query strings and anchors; never let a late geo response move
      // a visitor after they have started interacting with the page.
      var target = (lang === 'en' ? routes[original] : original);
      win.location.replace(target + win.location.search + win.location.hash);
    }
    doc.addEventListener('click', function (event) {
      var link = event.target.closest('[data-language-choice]');
      if (!link) return;
      save(link.dataset.languageChoice);
      // Counterpart links retain query parameters and section anchors.
      if (link.getAttribute('href').split(/[?#]/)[0] === (link.dataset.languageChoice === 'en' ? routes[original] : original)) {
        link.href = link.getAttribute('href').split(/[?#]/)[0] + win.location.search.replace(/([?&])lang=(?:ko|en)(&|$)/, '$1').replace(/[?&]$/, '') + win.location.hash;
      }
    });
    if (!routes[original]) return; // Excluded tools and forms never redirect.
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (type) {
      doc.addEventListener(type, function () { interacted = true; }, { once: true, passive: true });
    });
    if (explicit === 'ko' || explicit === 'en') { save(explicit); visit(explicit); return; }
    var saved = read(KEY);
    if (saved === 'ko' || saved === 'en') { visit(saved); return; }
    // An explicitly shared /en/ URL remains English for a first-time visitor.
    if (current === 'en' || /bot|crawler|spider|lighthouse/i.test(win.navigator.userAgent || '')) return;
    try { if (win.sessionStorage.getItem('proax-language-visited')) return; } catch (_) {}
    function finish(country) {
      if (manuallySelected) return;
      var zone = ''; try { zone = win.Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) {}
      var lang = preferred(country, win.navigator.languages || [win.navigator.language], zone);
      try { win.sessionStorage.setItem('proax-language-visited', '1'); } catch (_) {}
      visit(lang);
    }
    // Query country only, never precise location. Do not send page URLs/referrers.
    if (!win.fetch || !win.AbortController) { finish(''); return; }
    var controller = new win.AbortController(), timer = win.setTimeout(function () { controller.abort(); }, 1200);
    win.fetch('https://get.geojs.io/v1/ip/country.json', { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (res) { if (!res.ok) throw new Error('Country lookup unavailable'); return res.json(); })
      .then(function (data) { win.clearTimeout(timer); finish(data.country); }, function () { win.clearTimeout(timer); finish(''); });
  }
  return { preferred: preferred, mount: mount };
});

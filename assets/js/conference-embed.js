// Resize only the matching same-origin atlas frame; the page owns scrolling.
(function () {
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || !event.data || event.data.type !== 'conference-atlas-height') return;
    var height = Number(event.data.height);
    if (!Number.isFinite(height) || height < 100 || height > 200000) return;
    document.querySelectorAll('iframe[data-conference-atlas]').forEach(function (frame) {
      if (event.source === frame.contentWindow) frame.style.height = Math.ceil(height) + 'px';
    });
  });
})();

// Pilot: only the first gallery photo opens a larger, uncropped preview.
(function () {
  var photo = document.querySelector('.gal-years-wrap .gcard img');
  var dialog = document.getElementById('gallery-photo-dialog');
  if (!photo || !dialog || typeof dialog.showModal !== 'function') return;
  var full = dialog.querySelector('.gallery-photo-full');
  var caption = document.getElementById('gallery-photo-caption');
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'gallery-photo-trigger';
  trigger.setAttribute('aria-label', photo.alt + ' 사진 확대해서 보기');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  photo.parentNode.insertBefore(trigger, photo);
  trigger.appendChild(photo);
  var hint = document.createElement('span');
  hint.className = 'gallery-photo-hint';
  hint.textContent = '확대 ↗';
  hint.setAttribute('aria-hidden', 'true');
  trigger.appendChild(hint);
  trigger.addEventListener('click', function () {
    full.src = photo.currentSrc || photo.src;
    full.alt = photo.alt;
    caption.textContent = photo.alt;
    dialog.showModal();
    document.documentElement.classList.add('gallery-photo-open');
  });
  dialog.querySelector('.gallery-photo-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    var box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('gallery-photo-open');
    trigger.focus({ preventScroll: true });
  });
})();

---
layout: page
title: Research help
permalink: /research-help/
wide: true
lede: 연구계획의 핵심 항목을 작성하고, 단계별 DrS comments를 참고해 세 차례 다듬은 뒤 제출합니다.
---

<p class="rh-admin-entry"><a class="rh-btn" href="{{ '/research-help/admin/' | relative_url }}">제출목록 확인하기</a></p>
<section class="rh-intro" id="rh-intro">
  <p class="rh-intro-msg">여러분들의 연구는 깊은 문제의식에서 발산하여<br>실천적 이론적 시사점으로 수렴 되어야 합니다.</p>
  <a class="rh-btn primary rh-intro-go" href="#write">나의 연구 발전 시키기</a>
</section>
<div id="research-help" class="rh" hidden data-endpoint="{{ site.research_help_script_url | escape }}">
  <noscript><p>이 기능은 JavaScript가 켜져 있어야 사용할 수 있습니다.</p></noscript>
</div>
<script src="{{ '/assets/js/research-help-pdf.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
<script src="{{ '/assets/js/research-help.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
<script>
// 첫 화면은 안내 문구와 버튼만. 버튼(#write)을 누르면 작성 화면을 연다(뒤로 가기로 돌아옴).
(function () {
  var intro = document.getElementById('rh-intro'), app = document.getElementById('research-help');
  function show() { var w = location.hash === '#write'; intro.hidden = w; app.hidden = !w; if (w) window.scrollTo(0, 0); }
  window.addEventListener('hashchange', show); show();
})();
</script>

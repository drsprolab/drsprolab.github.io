---
layout: page
title: Research help 제출물
permalink: /research-help/admin/
wide: true
noindex: true
sitemap: false
lede: 제출된 연구계획서와 수정 이력을 열람합니다. 비밀번호는 서버에서 확인합니다.
---

<div id="research-help-admin" class="rh" data-endpoint="{{ site.research_help_script_url | escape }}">
  <noscript><p>이 기능은 JavaScript가 켜져 있어야 사용할 수 있습니다.</p></noscript>
</div>
<script src="{{ '/assets/js/research-help-pdf.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
<script src="{{ '/assets/js/research-help.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

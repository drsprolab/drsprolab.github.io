---
layout: page
title: 확정 미팅 확인
permalink: /appointment/admin/
wide: true
noindex: true
sitemap: false
lede: 비밀번호를 입력하면 확정된 미팅과 제출된 PDF를 확인할 수 있습니다.
---

<div id="appointment-admin" class="appointment-admin" data-endpoint="{{ site.appointment_script_url | escape }}">
  <noscript><p>이 기능은 JavaScript가 켜져 있어야 사용할 수 있습니다.</p></noscript>
</div>
<script src="{{ '/assets/js/appointment-admin.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

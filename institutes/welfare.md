---
layout: page
title: 교육복지정책중점연구소
eyebrow: Institute & Center
permalink: /institutes/welfare/
lede: 교육부 지정 연구소로 2015년부터 2021년까지 운영했고, 현재는 사업이 종료되었습니다.
---
{% assign list = site.data.institutes | where_exp: "i", "i.ended == true" %}
<ul class="ledger">
{% for i in list %}
  <li><div class="yr">종료</div><div>{{ i.name }}<div class="sub">{{ i.period }} · 총연구비 {% include won.html n=i.total %}원</div></div></li>
{% endfor %}
</ul>

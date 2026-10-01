---
layout: page
title: Institute & Center
eyebrow: Institute & Center
permalink: /institutes/
lede: 송지훈 교수가 이끌거나 참여한 연구소, 사업단, 센터입니다.
---
<div class="inst-grid">
{% for i in site.data.institutes %}
  <a class="inst{% if i.ended %} ended{% endif %}" href="{{ '/institutes/' | append: i.id | append: '/' | relative_url }}">
    <div class="tags">{% if i.ended %}<span class="badge">사업종료</span>{% endif %}{% for t in i.tags %}<span class="badge">{{ t }}</span>{% endfor %}</div>
    <h3>{{ i.name }}</h3>
    <dl class="kv">
      <dt>기간</dt><dd>{{ i.period }}</dd>
      <dt>총연구비</dt><dd>{% include won.html n=i.total %}원</dd>
      {% if i.department_share %}<dt>교육공학과 지분</dt><dd>{% include won.html n=i.department_share %}원</dd>{% endif %}
    </dl>
  </a>
{% endfor %}
</div>

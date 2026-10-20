---
layout: page
title: Teaching
eyebrow: Teaching & Research
permalink: /teaching/
wide: true
---
<nav class="tabs"><a href="{{ '/research/' | relative_url }}">Professor</a><a href="{{ '/research/lab/' | relative_url }}">Lab</a><a href="{{ '/teaching/' | relative_url }}" aria-current="page">Teaching</a><a href="{{ '/proax-lab-review/' | relative_url }}">PRO-AX Critical Review</a></nav>

<div class="teaching-grid">
  <section class="teaching-column" aria-labelledby="graduate-title">
    <h2 id="graduate-title">대학원</h2>
    <ul class="ledger">
    {% for c in site.data.teaching.graduate %}
      <li><div class="yr">{{ c.code }}</div><div>{{ c.title }}{% if c.note %} <span class="badge">{{ c.note }}</span>{% endif %}{% if c.review %} <a class="course-term" href="{{ c.review | relative_url }}" title="{{ c.review_label }} 학기 리뷰 제출 페이지로 이동">{{ c.review_label }}</a>{% endif %}</div></li>
    {% endfor %}
    </ul>
  </section>
  <section class="teaching-column" aria-labelledby="undergraduate-title">
    <h2 id="undergraduate-title">학부</h2>
    <ul class="ledger">
    {% for c in site.data.teaching.undergraduate %}
      <li><div class="yr">{{ c.code }}</div><div>{{ c.title }}</div></li>
    {% endfor %}
    </ul>
  </section>
</div>

## 전체 교육과정

<ul class="plain">
{% for l in site.data.teaching.curriculum_links %}<li><a href="{{ l.url }}">{{ l.title }}</a></li>{% endfor %}
</ul>

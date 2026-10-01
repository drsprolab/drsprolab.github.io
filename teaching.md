---
layout: page
title: Teaching
eyebrow: Teaching & Research
permalink: /teaching/
---
<nav class="tabs"><a href="{{ '/research/' | relative_url }}">Professor</a><a href="{{ '/research/lab/' | relative_url }}">Lab</a><a href="{{ '/teaching/' | relative_url }}" aria-current="page">Teaching</a></nav>

## 대학원

<ul class="ledger">
{% for c in site.data.teaching.graduate %}
  <li><div class="yr">{{ c.code }}</div><div>{{ c.title }}{% if c.note %} <span class="badge">{{ c.note }}</span>{% endif %}</div></li>
{% endfor %}
</ul>

## 학부

<ul class="ledger">
{% for c in site.data.teaching.undergraduate %}
  <li><div class="yr">{{ c.code }}</div><div>{{ c.title }}</div></li>
{% endfor %}
</ul>

## 전체 교육과정

<ul class="plain">
{% for l in site.data.teaching.curriculum_links %}<li><a href="{{ l.url }}">{{ l.title }}</a></li>{% endfor %}
</ul>

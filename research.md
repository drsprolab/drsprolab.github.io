---
layout: page
title: Research (Professor)
eyebrow: Teaching & Research
permalink: /research/
lede: 읽고, 읽고, 또 읽고 나서 쓰는 것.
---
<nav class="tabs"><a href="{{ '/research/' | relative_url }}" aria-current="page">Professor</a><a href="{{ '/research/lab/' | relative_url }}">Lab</a><a href="{{ '/teaching/' | relative_url }}">Teaching</a></nav>

## Journal

{% include publications.html scope="professor" %}

## Book

<ol class="pubs">
{% for b in site.data.books %}
  <li>
    <span class="cite">{{ b.citation }}{% if b.pages %} {{ b.pages }}쪽.{% endif %}{% if b.isbn %} ISBN {{ b.isbn }}.{% endif %}</span>
    {% if b.url %}<span class="idx"><a class="badge" href="{{ b.url }}" target="_blank" rel="noopener">도서 정보</a></span>{% endif %}
  </li>
{% endfor %}
</ol>

## Conference

{% include presentations.html %}

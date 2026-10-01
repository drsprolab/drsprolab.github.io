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

{% assign books = site.data.books | where: "type", "book" %}
{% assign chapters = site.data.books | where: "type", "chapter" %}
<h3>저서 <span class="n">{{ books.size }}</span></h3>
<ol class="pubs">
{% for b in books %}
  <li><span class="cite">{{ b.citation }}</span>{% if b.url %}<span class="idx"><a class="badge" href="{{ b.url }}" target="_blank" rel="noopener">도서 정보</a></span>{% endif %}</li>
{% endfor %}
</ol>

<h3>Book Chapter <span class="n">{{ chapters.size }}</span></h3>
<ol class="pubs">
{% for b in chapters %}
  <li><span class="cite">{{ b.citation }}</span>{% if b.url %}<span class="idx"><a class="badge" href="{{ b.url }}" target="_blank" rel="noopener">원문</a></span>{% endif %}</li>
{% endfor %}
</ol>

## Conference

{% include presentations.html %}

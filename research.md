---
layout: page
title: Research (Professor)
heading_main: Research
heading_suffix: (Professor)
eyebrow: Teaching & Research
permalink: /research/
lede: 읽고, 읽고, 또 읽고 나서 쓰는 것.
---
<nav class="tabs"><a href="{{ '/research/' | relative_url }}" aria-current="page">Professor</a><a href="{{ '/research/lab/' | relative_url }}">Lab</a><a href="{{ '/teaching/' | relative_url }}">Teaching</a></nav>

## Journal

{% include publications.html scope="professor" %}

## Book (Chapters)

{% assign books = site.data.books | sort: "year" | reverse %}
<p class="count">총 {{ books.size }}편</p>
<ol class="pubs journal-pubs book-pubs" reversed start="{{ books.size }}">
{% for b in books %}
  {% assign book_number = books.size | minus: forloop.index0 %}
  <li value="{{ book_number }}" data-tags="BOOK">
    <span class="publication-number" aria-hidden="true">{{ book_number }}.</span>
    <span class="cite">{{ b.citation }}</span>
    <span class="idx"><span class="badge">{% if b.type == 'book' %}Book{% else %}Book Chapter{% endif %}</span>{% if b.url %}<a class="badge" href="{{ b.url }}" target="_blank" rel="noopener">{% if b.type == 'book' %}도서 정보{% else %}원문{% endif %}</a>{% endif %}</span>
  </li>
{% endfor %}
</ol>

## Conference

{% include presentations.html %}

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
{% assign book_groups = books | group_by: "year" %}
{% assign book_number = books.size %}
<p class="count">총 {{ books.size }}편</p>
{% for group in book_groups %}
<section class="year-group book-year-group">
  <h3>{{ group.name }} <span class="n">{{ group.items.size }}</span></h3>
  <ol class="pubs journal-pubs book-pubs" reversed start="{{ book_number }}">
{% for b in group.items %}
  <li value="{{ book_number }}" data-tags="BOOK">
    <span class="publication-number" aria-hidden="true">{{ book_number }}.</span>
    <span class="cite">{{ b.citation }}</span>
    <span class="idx"><span class="badge">{% if b.type == 'book' %}Book{% else %}Book Chapter{% endif %}</span>{% if b.url %}<a class="badge" href="{{ b.url }}" target="_blank" rel="noopener">{% if b.type == 'book' %}도서 정보{% else %}원문{% endif %}</a>{% endif %}</span>
  </li>
  {% assign book_number = book_number | minus: 1 %}
{% endfor %}
  </ol>
</section>
{% endfor %}

## Conference

{% include presentations.html %}

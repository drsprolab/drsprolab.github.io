---
layout: page
title: Project
eyebrow: Project
permalink: /project/
lede: 농업적 근면성은 배신하지 않습니다.
---

## Lecture and Consulting (외부강연 및 자문) {#lecture}

{% include lecture-network.html %}

## Project (외부연구용역)

{% assign groups = site.data.projects | group_by: "year" %}
<p class="count">총 {{ site.data.projects.size }}건</p>
{% for g in groups %}
{% assign sum = 0 %}{% for p in g.items %}{% assign sum = sum | plus: p.amount %}{% endfor %}
<section class="year-group">
  <h3>{{ g.name }} <span class="n">{{ g.items.size }}</span></h3>
  <div class="table-wrap">
    <table class="stack">
      <thead><tr><th>사업(용역)명</th><th>발주처</th><th class="num">연구규모(원)</th><th>연구기간</th></tr></thead>
      <tbody>
        {% for p in g.items %}
        <tr><td class="st-title">{{ p.title }}</td><td data-label="발주처">{{ p.client }}</td><td class="num" data-label="연구규모">{% if p.amount %}{% include won.html n=p.amount %}원{% endif %}</td><td class="nowrap" data-label="연구기간">{{ p.period }}</td></tr>
        {% endfor %}
      </tbody>
      <tfoot><tr><td colspan="2" class="st-hide">합계</td><td class="num" data-label="합계">{% include won.html n=sum %}원</td><td class="st-hide"></td></tr></tfoot>
    </table>
  </div>
</section>
{% endfor %}

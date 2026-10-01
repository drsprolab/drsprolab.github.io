---
layout: page
title: 인문사회연구소
eyebrow: Institute & Center
permalink: /institutes/humsoc/
---
{% assign d = site.data.institute_details.humsoc %}
<dl class="kv">
  <dt>연구과제</dt><dd>양극화 등 사회구조변화 대응을 위한 사회정책 연구</dd>
  <dt>지원기관</dt><dd>(재)한국연구재단</dd>
  <dt>주무부처</dt><dd>교육부</dd>
  <dt>소장</dt><dd>송지훈 교수</dd>
  <dt>문의</dt><dd>한국교육문제연구소 · 02-2220-4190 · <a href="https://aml.hanyang.ac.kr/web/iedu/home">홈페이지</a></dd>
</dl>

## 사업기간

{% include funding.html rows=d.funding label=true %}

## 연구과제

{% assign groups = d.tasks | group_by: "phase" %}
{% for g in groups %}
<h3>{{ g.name }} <span class="n">{{ g.items.size }}</span></h3>
<ul class="ledger">
{% for t in g.items %}<li><div class="yr">{{ t.code | default: "—" | remove: "기본연구 " }}</div><div>{{ t.title }}</div></li>{% endfor %}
</ul>
{% endfor %}

---
layout: page
title: EduTech Center for Digital Intelligence
eyebrow: Institute & Center · ECDI
permalink: /institutes/ecdi/
lede: 한양대학교 지정 센터로, 가상·확장현실 기반 교육 모델과 데이터 기반 연구, 사회문제 해결을 위한 정책 연구를 통해 디지털 시대에 새로운 가치를 만드는 인재를 기르고자 합니다.
---
{% assign d = site.data.institute_details.ecdi %}
<dl class="kv">
  <dt>센터장</dt><dd>송지훈 교수</dd>
</dl>

## 사업기간

{% include funding.html rows=d.funding %}

## 연구논문 <span class="n">{{ d.papers.size }}</span>

<ol class="pubs">
{% for p in d.papers %}<li><span class="cite">{{ p }}</span></li>{% endfor %}
</ol>

## 해외 학술대회 발표 <span class="n">{{ d.international_talks.size }}</span>

<ol class="pubs">
{% for t in d.international_talks %}<li><span class="cite">{{ t.authors }}. <strong>{{ t.title }}</strong>. {{ t.venue }}, {{ t.date }}</span></li>{% endfor %}
</ol>

## 국내 학술대회 발표 <span class="n">{{ d.domestic_talks.size }}</span>

<ol class="pubs">
{% for t in d.domestic_talks %}<li><span class="cite">{{ t.authors }}. <strong>{{ t.title }}</strong>. {{ t.venue }}, {{ t.date }}</span></li>{% endfor %}
</ol>

## 교육활동

<ul class="ledger">
{% for s in d.seminars %}<li><div class="yr">{{ s.date }}</div><div>{{ s.title }}{% if s.speaker != "" %}<div class="sub">{{ s.speaker }}</div>{% endif %}</div></li>{% endfor %}
</ul>

## 산학협력 프로젝트

<ul class="ledger">
{% for p in d.projects %}<li><div class="yr">{{ p.period | slice: 0, 7 }}</div><div>{{ p.title }}<div class="sub">{{ p.client }} · {{ p.period }}</div></div></li>{% endfor %}
</ul>

## MOU

<ul class="ledger">
{% for m in d.mou %}<li><div class="yr">{{ m.year }}</div><div>{{ m.name }}</div></li>{% endfor %}
</ul>

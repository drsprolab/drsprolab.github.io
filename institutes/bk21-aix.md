---
layout: page
title: BK21 4단계 AIX 융합교육단
eyebrow: Institute & Center
permalink: /institutes/bk21-aix/
banner: bk21-aix
lede: AI를 중심으로 교육공학·기계공학·데이터사이언스·미디어커뮤니케이션을 연결하는 융합연구 시범사업입니다.
---
{% assign aix = site.data.institute_details['bk21-aix'] %}
<dl class="kv">
  <dt>사업팀장</dt><dd>{{ aix.leader.name }} ({{ aix.leader.department }})</dd>
  <dt>공동연구원</dt><dd>{% for researcher in aix.researchers %}{{ researcher.name }} ({{ researcher.department }}){% unless forloop.last %} · {% endunless %}{% endfor %}</dd>
  <dt>사업</dt><dd>BK21 4단계 AIX 융합교육단</dd>
</dl>

## 참여학과

<ul class="tags big">
{% for department in aix.departments %}<li>{{ department }}</li>{% endfor %}
</ul>

## 사업기간 및 사업비

<div class="table-wrap">
  <table>
    <thead><tr><th>사업기간</th><th class="num">총사업비(원)</th><th class="num">교육공학과 지분(원)</th></tr></thead>
    <tbody>
    {% for funding in aix.funding %}
      <tr><td>{{ funding.period }}</td><td class="num">{% include won.html n=funding.amount %}</td><td class="num">{% include won.html n=funding.department_share %}</td></tr>
    {% endfor %}
    </tbody>
  </table>
</div>

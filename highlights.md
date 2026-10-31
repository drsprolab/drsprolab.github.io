---
layout: page
title: Awards & Gallery
eyebrow: Awards & Gallery
permalink: /highlights/
wide: true
lede: 우리가 함께 꿈꾸고 바라보는 것.
---

## Member Awards {#awards}

<ul class="ledger member-awards">
{% for a in site.data.member_awards %}
  <li><div class="yr">{{ a.year }}</div><div>{{ a.title }}<div class="sub">{{ a.org }} · {{ a.recipients }}</div>{% if a.paper %}<div class="sub">「{{ a.paper }}」</div>{% endif %}{% if a.note %}<div class="sub">{{ a.note }}</div>{% endif %}</div></li>
{% endfor %}
</ul>

<div class="gal-head">
<h2 id="gallery">Gallery</h2>
<div class="gal-years" role="group" aria-label="연도별 사진 보기">
  <button type="button" data-year="" aria-pressed="true">전체</button>
  {%- for y in (2016..2026) reversed %}
  <button type="button" data-year="{{ y }}" aria-pressed="false">{{ y }}</button>
  {%- endfor %}
</div>
</div>
<div class="gal-year-view" id="gal-year-view" hidden><h3><span class="gal-year-label"></span> <span class="n"></span></h3><div class="gallery"></div></div>

{% assign gal = site.data.gallery %}
{% assign sections = "conferences:Conferences,workshops:Workshop,daily:Daily" | split: "," %}
{% for s in sections %}
{% assign key = s | split: ":" | first %}{% assign label = s | split: ":" | last %}
{% assign list = gal[key] %}
<h3 class="gal-sec">{{ label }} <span class="n">{{ list.size }}</span></h3>
<div class="gallery gal-sec">
  {% for g in list %}
  {%- comment -%} 연도: year 값, 없으면 제목 앞 네 자리(예: "2026-2 …") {%- endcomment -%}
  {%- assign gy = g.year -%}
  {%- unless gy -%}{%- assign t4 = g.title | slice: 0, 4 | plus: 0 -%}{%- if t4 > 2000 -%}{%- assign gy = t4 -%}{%- endif -%}{%- endunless -%}
  <article class="gcard" data-year="{{ gy }}">
    {% if g.image %}<img src="{{ '/assets/images/gallery/' | append: g.image | relative_url }}" alt="{{ g.title }}" loading="lazy" decoding="async" width="480" height="360">{% else %}<div class="ph" aria-hidden="true"></div>{% endif %}
    <div class="gcard-title">{{ g.title }}</div>
    {% if g.year %}<div class="gcard-meta">{{ g.year }}{% if g.month %}.{{ g.month | prepend: '0' | slice: -2, 2 }}{% endif %}</div>{% endif %}
  </article>
  {% endfor %}
</div>
{% endfor %}

<script>
// 연도 버튼: 컨퍼런스·워크샵·데일리 구분 없이 그 해 사진을 한곳에 모아 보여 준다.
(function () {
  var bar = document.querySelector('.gal-years'); if (!bar) return;
  var view = document.getElementById('gal-year-view'), grid = view.querySelector('.gallery');
  var secs = document.querySelectorAll('.gal-sec'), cards = document.querySelectorAll('.gal-sec .gcard');
  function show(year) {
    [].forEach.call(bar.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-year') === year)); });
    [].forEach.call(secs, function (el) { el.hidden = !!year; });
    view.hidden = !year; grid.innerHTML = '';
    if (!year) return;
    var picked = [].filter.call(cards, function (c) { return c.getAttribute('data-year') === year; });
    picked.forEach(function (c) { grid.appendChild(c.cloneNode(true)); });
    view.querySelector('.gal-year-label').textContent = year;
    view.querySelector('.n').textContent = picked.length;
    if (!picked.length) grid.innerHTML = '<p class="gal-empty">이 해의 사진이 아직 없습니다.</p>';
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var y = b.getAttribute('data-year');
    show(b.getAttribute('aria-pressed') === 'true' ? '' : y);
  });
})();
</script>

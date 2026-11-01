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
// 바뀔 때 빠지는 사진은 흐려지며 사라지고, 남는 사진은 새 자리로 미끄러지고, 새 사진은 차례로 떠오른다.
(function () {
  var bar = document.querySelector('.gal-years'); if (!bar) return;
  var view = document.getElementById('gal-year-view'), grid = view.querySelector('.gallery');
  var secs = document.querySelectorAll('.gal-sec'), cards = document.querySelectorAll('.gal-sec .gcard');
  [].forEach.call(cards, function (c, i) { c.setAttribute('data-gid', i); });
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = 'cubic-bezier(.2,.7,.2,1)', run = 0;
  function shown() {
    return [].filter.call(document.querySelectorAll('.gal-sec .gcard, #gal-year-view .gcard'), function (c) { return c.offsetParent !== null; });
  }
  function swap(year) {
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
  function show(year) {
    if (calm || !Element.prototype.animate) { swap(year); return; }
    var me = ++run, before = {}, keep = {};
    var now = shown();
    now.forEach(function (c) { before[c.getAttribute('data-gid')] = c.getBoundingClientRect(); });
    [].forEach.call(cards, function (c) { if (!year || c.getAttribute('data-year') === year) keep[c.getAttribute('data-gid')] = 1; });
    var leaving = now.filter(function (c) { return !keep[c.getAttribute('data-gid')]; });
    leaving.forEach(function (c) {
      c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    });
    setTimeout(function () {
      if (me !== run) return;
      swap(year);
      var k = 0;
      shown().forEach(function (c) {
        var r = c.getBoundingClientRect(), o = before[c.getAttribute('data-gid')];
        if (o) {
          var dx = o.left - r.left, dy = o.top - r.top, s = o.width / r.width;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < .01) return;
          c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: 520, easing: ease });
        } else {
          c.animate([{ opacity: 0, transform: 'translateY(18px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: Math.min(k++ * 45, 540), easing: ease, fill: 'backwards' });
        }
      });
    }, leaving.length ? 200 : 0);
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var y = b.getAttribute('data-year');
    show(b.getAttribute('aria-pressed') === 'true' ? '' : y);
  });
})();
</script>

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
{%- comment -%}
갤러리는 연도별로 묶어 보여 준다(컨퍼런스·워크샵·데일리 순서). 연도: year 값, 없으면 제목 앞 네 자리(예: "2026-2 …").
{%- endcomment -%}
{% assign gal = site.data.gallery %}
{% assign gal_keys = "conferences,workshops,daily" | split: "," %}
<div class="gal-years-wrap">
{% for y in (2016..2026) reversed %}
{%- assign n = 0 -%}
{%- capture cards -%}
{%- for key in gal_keys -%}{%- for g in gal[key] -%}
  {%- assign gy = g.year -%}
  {%- unless gy -%}{%- assign t4 = g.title | slice: 0, 4 | plus: 0 -%}{%- if t4 > 2000 -%}{%- assign gy = t4 -%}{%- endif -%}{%- endunless -%}
  {%- if gy == y -%}{%- assign n = n | plus: 1 %}
  <article class="gcard">
    {% if g.image %}<img src="{{ '/assets/images/gallery/' | append: g.image | relative_url }}" alt="{{ g.title }}" loading="lazy" decoding="async" width="480" height="360">{% else %}<div class="ph" aria-hidden="true"></div>{% endif %}
    <div class="gcard-title">{{ g.title }}</div>
    {% if g.year %}<div class="gcard-meta">{{ g.year }}{% if g.month %}.{{ g.month | prepend: '0' | slice: -2, 2 }}{% endif %}</div>{% endif %}
  </article>
  {%- endif -%}
{%- endfor -%}{%- endfor -%}
{%- endcapture -%}
{%- if n > 0 %}
<section class="gal-yg" data-year="{{ y }}">
<h3>{{ y }} <span class="n">{{ n }}</span></h3>
<div class="gallery">{{ cards }}
</div>
</section>
{%- endif %}
{% endfor %}
<p class="gal-empty" hidden>이 해의 사진이 아직 없습니다.</p>
</div>

<script>
// 연도 버튼: 전체는 모든 사진을 연도별로, 연도를 고르면 그 해 사진만 보여 준다.
// 바뀔 때 빠지는 사진은 흐려지며 사라지고, 남는 사진은 새 자리로 미끄러지고, 새 사진은 차례로 떠오른다.
(function () {
  var bar = document.querySelector('.gal-years'); if (!bar) return;
  var groups = document.querySelectorAll('.gal-yg'), empty = document.querySelector('.gal-years-wrap .gal-empty');
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = 'cubic-bezier(.2,.7,.2,1)', run = 0;
  function visible() {
    return [].filter.call(document.querySelectorAll('.gal-yg h3, .gal-yg .gcard'), function (el) { return el.offsetParent !== null; });
  }
  function swap(year) {
    [].forEach.call(bar.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-year') === year)); });
    var any = false;
    [].forEach.call(groups, function (g) { var on = !year || g.getAttribute('data-year') === year; g.hidden = !on; any = any || on; });
    empty.hidden = any;
  }
  function show(year) {
    if (calm || !Element.prototype.animate) { swap(year); return; }
    var me = ++run, before = new Map(), now = visible();
    now.forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); before.set(el, el.getBoundingClientRect()); });
    var leaving = now.filter(function (el) { var g = el.closest('.gal-yg'); return year && g.getAttribute('data-year') !== year; });
    leaving.forEach(function (el) { el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }); });
    setTimeout(function () {
      if (me !== run) return;
      leaving.forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); }); // 다시 보일 때 투명하게 남지 않도록
      swap(year);
      var k = 0, vh = window.innerHeight;
      visible().forEach(function (el) {
        var r = el.getBoundingClientRect(), o = before.get(el);
        if (r.bottom < -200 || r.top > vh + 200) return;
        if (o) {
          var dx = o.left - r.left, dy = o.top - r.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 520, easing: ease });
        } else {
          el.animate([{ opacity: 0, transform: 'translateY(18px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: Math.min(k++ * 45, 540), easing: ease, fill: 'backwards' });
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

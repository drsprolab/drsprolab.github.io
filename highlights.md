---
layout: page
title: Highlights
eyebrow: Highlights
permalink: /highlights/
lede: 우리가 함께 꿈꾸고 바라보는 것.
---

## Member Awards {#awards}

<ul class="ledger">
{% for a in site.data.member_awards %}
  <li><div class="yr">{{ a.year }}</div><div>{{ a.title }}<div class="sub">{{ a.org }} · {{ a.recipients }}</div>{% if a.paper %}<div class="sub">「{{ a.paper }}」</div>{% endif %}{% if a.note %}<div class="sub">{{ a.note }}</div>{% endif %}</div></li>
{% endfor %}
</ul>

## Gallery {#gallery}

{% assign gal = site.data.gallery %}
{% assign sections = "conferences:Conferences,workshops:Workshop,daily:Daily" | split: "," %}
{% for s in sections %}
{% assign key = s | split: ":" | first %}{% assign label = s | split: ":" | last %}
{% assign list = gal[key] %}
<h3>{{ label }} <span class="n">{{ list.size }}</span></h3>
<div class="gallery">
  {% for g in list %}
  <figure class="shot">
    {% if g.image %}<img src="{{ '/assets/images/gallery/' | append: g.image | relative_url }}" alt="{{ g.title }}" loading="lazy">{% else %}<div class="ph" aria-hidden="true"></div>{% endif %}
    <figcaption>{{ g.title }}</figcaption>
  </figure>
  {% endfor %}
</div>
{% endfor %}

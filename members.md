---
layout: page
title: Members
eyebrow: People
permalink: /members/
wide: true
lede: 안녕, 윙맨. 같이 날아봅시다.
---
{% assign prof = site.data.professor %}

## Professor-in-charge {#professor}

<div class="profile">
  <figure class="profile-portrait">
    <img src="{{ '/assets/images/people/ji-hoon-song.png' | relative_url }}" alt="송지훈 교수" width="302" height="429" decoding="async">
  </figure>
  <div class="profile-details">
  <div class="profile-intro">
    <h3 class="profile-name">{{ prof.name }} <span>{{ prof.name_en }}</span></h3>
    <ul class="plain">
      {% for p in prof.positions %}<li>{{ p }}</li>{% endfor %}
      {% for p in prof.past_positions %}<li class="past">(전) {{ p }}</li>{% endfor %}
    </ul>
  </div>
  <dl class="kv">
    <dt>Office</dt><dd>{{ prof.office }}</dd>
    <dt>Tel</dt><dd>{{ prof.tel }}</dd>
    <dt>E-mail</dt><dd>{{ prof.email }}</dd>
    <dt>Links</dt><dd>{% for l in prof.links %}<a href="{{ l.url }}">{{ l.title }}</a>{% unless forloop.last %} · {% endunless %}{% endfor %}</dd>
  </dl>
  </div>
</div>

### Research Areas
{{ prof.research_areas }}

### Education
<ul class="ledger">
{% for e in prof.education %}
  <li><div class="yr">{{ e.year }}</div><div>{{ e.degree }}<div class="sub">{{ e.school }} · {{ e.dept }}</div></div></li>
{% endfor %}
</ul>

### Research Awards
<ul class="ledger">
{% for a in prof.awards %}
  <li><div class="yr">{{ a.year }}</div><div>{{ a.title }}{% if a.org %}<div class="sub">{{ a.org }}</div>{% endif %}</div></li>
{% endfor %}
</ul>

### Professional Service
<ul class="plain">
{% for s in prof.service %}<li>{{ s }}</li>{% endfor %}
</ul>

## Lab Members {#lab-members}

{% assign groups = "postdoc:Post-Doc,phd:Ph.D. Students,ma:M.A. Students" | split: "," %}
{% for g in groups %}
{% assign key = g | split: ":" | first %}{% assign label = g | split: ":" | last %}
{% assign list = site.data.members[key] %}
<h3>{{ label }} <span class="n">{{ list.size }}</span></h3>
<div class="member-grid">
  {% for m in list %}
  {% assign member_photo = site.data.member_photos[m.name] %}
  <article class="member">
    {% if member_photo %}
    <img class="member-photo" src="{{ member_photo.image | relative_url }}" alt="{{ m.name | escape }} 사진" style="object-position: {{ member_photo.position | default: 'center' | escape }};" width="240" height="180" loading="lazy" decoding="async">
    {% else %}
    <div class="member-photo member-photo--empty" aria-hidden="true"><span>{{ m.name | slice: 0 }}</span></div>
    {% endif %}
    <div class="member-info">
    <div class="member-name">{{ m.name }}{% if m.name_en %} <span>{{ m.name_en }}</span>{% endif %}</div>
    {% if m.affiliation %}<div class="sub">{{ m.affiliation }}</div>{% endif %}
    {% if m.interests %}<ul class="tags">{% for i in m.interests %}<li>{{ i }}</li>{% endfor %}</ul>{% endif %}
    </div>
  </article>
  {% endfor %}
</div>
{% endfor %}

### Undergraduate Internship
현재 학부 인턴은 없습니다.

## Alumni {#alumni}

{% assign agroups = "alumni_phd:Ph.D.,alumni_ma:Master's" | split: "," %}
{% for g in agroups %}
{% assign key = g | split: ":" | first %}{% assign label = g | split: ":" | last %}
{% assign list = site.data.members[key] %}
<h3>{{ label }} <span class="n">{{ list.size }}</span></h3>
<ul class="alumni">
  {% for m in list %}<li><strong>{{ m.name }}</strong>{% if m.affiliation %}<span class="sub">{{ m.affiliation }}</span>{% endif %}</li>{% endfor %}
</ul>
{% endfor %}

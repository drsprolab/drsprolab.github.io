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
    <img src="{{ '/assets/images/people/ji-hoon-song.png' | relative_url }}" alt="송지훈 교수" width="300" height="426" decoding="async">
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
    <dt>Research</dt><dd>{% for l in prof.links %}<a href="{{ l.url }}" target="_blank" rel="noopener noreferrer">{{ l.title }}</a> · {% endfor %}<a href="{{ site.data.scopus_metrics.profile_url }}" target="_blank" rel="noopener noreferrer">Scopus</a></dd>
  </dl>
  </div>
</div>

### Research Areas
<ul class="tags big">{% for a in prof.research_areas %}<li>{{ a }}</li>{% endfor %}</ul>

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

{% assign groups = "postdoc:연구교수 / Post-Doc,phd:Doctoral Students,ma:M.A. Students" | split: "," %}
{% for g in groups %}
{% assign key = g | split: ":" | first %}{% assign label = g | split: ":" | last %}
{% assign list = site.data.members[key] %}
<h3>{{ label }} <span class="n">{{ list.size }}</span></h3>
<div class="member-grid">
  {% for m in list %}
  {% assign member_photo = site.data.member_photos[m.name] %}
  <article class="member">
    {% if m.photo %}
    <img class="member-photo" src="{{ m.photo | relative_url }}" alt="" width="240" height="180" loading="lazy" decoding="async">
    {% elsif member_photo %}
    <img class="member-photo" src="{{ member_photo.image | relative_url }}" alt="{{ m.name | escape }} 사진" style="object-position: {{ member_photo.position | default: 'center' | escape }};" width="240" height="180" loading="lazy" decoding="async">
    {% else %}
    <div class="member-photo member-photo--empty{% if m.photo_label %} member-photo--label{% endif %}" aria-hidden="true"><span>{% if m.photo_label %}{{ m.photo_label }}{% else %}{{ m.name | slice: 0 }}{% endif %}</span></div>
    {% endif %}
    <div class="member-info">
    {% if m.name_image %}<div class="member-name member-name--img" data-nosnippet><img class="member-name-img" src="{{ m.name_image | relative_url }}" alt="" width="77" height="46"></div>
    {% else %}<div class="member-name">{{ m.name }}{% if m.credential %} ({{ m.credential }}){% endif %}{% if m.homepage %}<a class="member-home" href="{{ m.homepage | escape }}" target="_blank" rel="noopener" aria-label="{{ m.name | escape }} 홈페이지" title="홈페이지"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9v11h5v-6h3v6h5V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></a>{% endif %}{% if m.name_en %} <span>{{ m.name_en }}</span>{% endif %}</div>{% endif %}
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
  {% for m in list %}<li{% if m.highlight %} class="alumni-hl"{% endif %}><strong>{{ m.name }}</strong>{% if m.affiliation %}<span class="sub">{{ m.affiliation }}</span>{% endif %}</li>{% endfor %}
</ul>
{% endfor %}

---
layout: page
title: Appointment request
permalink: /appointment/
lede: 송지훈 교수님과의 미팅을 요청하세요. 요청은 승인 후 확정됩니다.
---

<div class="appointment-panel">
  <p>가능 시간은 <strong>월·화·목, 오후 1–3시</strong>입니다. 한국시간(KST) 기준 1시간 단위로 선택해 주세요.</p>
  {% if site.appointment_script_url != "" %}
  <form id="appointment-form" action="{{ site.appointment_script_url | escape }}" method="post">
    <input type="hidden" name="action" value="request">
    <div class="appointment-field">
      <label for="appointment-name">이름</label>
      <input id="appointment-name" name="name" type="text" maxlength="80" autocomplete="name" required>
    </div>
    <div class="appointment-field">
      <label for="appointment-email">본인 이메일</label>
      <input id="appointment-email" name="email" type="email" maxlength="254" autocomplete="email" required>
    </div>
    <div class="appointment-field">
      <label for="appointment-date">희망 날짜</label>
      <select id="appointment-date" name="date" required>
        <option value="">날짜를 선택해 주세요</option>
      </select>
    </div>
    <div class="appointment-field">
      <label for="appointment-time">희망 시간</label>
      <select id="appointment-time" name="time" required>
        <option value="">시간을 선택해 주세요</option>
        <option value="13:00">13:00–14:00</option>
        <option value="14:00">14:00–15:00</option>
      </select>
    </div>
    <div class="appointment-field">
      <label for="appointment-message">미팅 목적 <span class="appointment-optional">(선택)</span></label>
      <textarea id="appointment-message" name="message" rows="4" maxlength="1000"></textarea>
    </div>
    <div class="appointment-trap" aria-hidden="true">
      <label for="appointment-website">Website</label>
      <input id="appointment-website" name="website" type="text" tabindex="-1" autocomplete="off">
    </div>
    <button class="appointment-submit" type="submit">미팅 요청 보내기</button>
    <p class="appointment-note">요청이 교수님께 이메일로 전달됩니다. 승인 후 입력한 이메일로 확정 알림을 보내드립니다.</p>
  </form>
  <script src="{{ '/assets/js/appointment.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
  {% else %}
  <p class="appointment-note">온라인 예약 시스템을 준비 중입니다. 문의는 <a href="mailto:jhsong77@hanyang.ac.kr">jhsong77@hanyang.ac.kr</a>로 보내 주세요.</p>
  {% endif %}
</div>

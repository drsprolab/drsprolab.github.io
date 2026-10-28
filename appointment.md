---
layout: page
title: Appointment request
permalink: /appointment/
lede: 송지훈 교수님과의 미팅을 요청하세요. 요청은 승인 후 확정됩니다.
---

<div class="appointment-panel">
  <p id="appointment-availability">가능 시간은 <strong>월·화·목, 오후 1–3시</strong>입니다. 한국시간(KST) 기준 1시간 단위로 선택해 주세요.</p>
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
      <span class="appointment-label">미팅 종류</span>
      <div class="appointment-type-options" id="appointment-standard-types">
        <label><input type="radio" name="meetingType" value="general" checked> 일반 미팅</label>
        <label><input type="radio" name="meetingType" value="research"> 연구 관련 미팅</label>
      </div>
      <div class="appointment-type-options" id="appointment-inquiry-types" hidden>
        <label><input type="radio" name="meetingType" value="admissions" disabled> 진학문의</label>
        <label><input type="radio" name="meetingType" value="consulting" disabled> 컨설팅 문의</label>
      </div>
    </div>
    <div class="appointment-field" id="appointment-calendar-field">
      <span class="appointment-label">희망 날짜</span>
      <div class="appointment-calendar" aria-label="미팅 날짜 선택">
        <div class="appointment-calendar-head">
          <button type="button" id="appointment-prev-month" aria-label="이전 달">‹</button>
          <strong id="appointment-month"></strong>
          <button type="button" id="appointment-next-month" aria-label="다음 달">›</button>
        </div>
        <div class="appointment-calendar-grid" id="appointment-calendar-grid"></div>
      </div>
      <input id="appointment-date" name="date" type="hidden">
      <span class="appointment-note" id="appointment-date-note">예약 가능한 월·화·목 날짜를 선택해 주세요.</span>
    </div>
    <div class="appointment-field">
      <span class="appointment-label">희망 시간</span>
      <div class="appointment-time-options" id="appointment-time-options" role="group" aria-label="희망 시간">
        <button type="button" data-time="13:00" aria-pressed="false">13:00–14:00</button>
        <button type="button" data-time="14:00" aria-pressed="false">14:00–15:00</button>
      </div>
      <input id="appointment-time" name="time" type="hidden">
    </div>
    <div class="appointment-field">
      <label for="appointment-message">미팅 목적 <span class="appointment-optional">(선택)</span></label>
      <textarea id="appointment-message" name="message" rows="4" maxlength="1000"></textarea>
    </div>
    <div class="appointment-field">
      <span class="appointment-label">첨부파일 <span class="appointment-optional">(일반 미팅은 선택)</span></span>
      <div class="appointment-dropzone" id="appointment-dropzone" aria-label="PDF 첨부파일 드래그 앤 드롭 영역">
        <strong>PDF 파일을 이곳에 드래그해 놓아 주세요</strong>
        <span>PDF만 가능 · 최대 3개 · 합계 4MB</span>
      </div>
      <ul class="appointment-file-list" id="appointment-file-list" aria-live="polite"></ul>
      <input id="appointment-attachments" name="attachments" type="hidden">
      <span class="appointment-note" id="appointment-attachment-note">연구 관련 미팅은 연구 주제·질문을 간단히 정리한 PDF를 첨부해 주세요. 다른 형식의 파일은 PDF로 변환한 뒤 제출해 주세요.</span>
    </div>
    <div class="appointment-trap" aria-hidden="true">
      <label for="appointment-website">Website</label>
      <input id="appointment-website" name="website" type="text" tabindex="-1" autocomplete="off">
    </div>
    <button class="appointment-submit" type="submit">미팅 요청 보내기</button>
    <p class="appointment-error" id="appointment-error" role="alert" hidden></p>
    <p class="appointment-note">요청이 교수님께 이메일로 전달됩니다. 승인 후 입력한 이메일로 확정 알림을 보내드립니다.</p>
  </form>
  <script src="{{ '/assets/js/appointment.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
  {% else %}
  <p class="appointment-note">온라인 예약 시스템을 준비 중입니다. 문의는 <a href="mailto:jhsong77@hanyang.ac.kr">jhsong77@hanyang.ac.kr</a>로 보내 주세요.</p>
  {% endif %}
</div>

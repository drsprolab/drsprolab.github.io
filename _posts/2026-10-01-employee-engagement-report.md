---
layout: post
title: "직원열의 (Employee Engagement) 진단"
category: 측정도구
wide: true
measurement_order: 9
measurement_badge: 열의 진단
measurement_target: 조직구성원·팀·조직 단위
measurement_factors: 4개 요인 · 21문항
measurement_summary: 개인과 팀의 열의 수준을 함께 진단하고, 열의를 높이기 위한 개인·팀·조직 차원의 방안을 제안합니다.
measurement_use: 개인·팀 열의 수준 진단 및 열의 향상 지원
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>열의(Engagement)는 구성원이 일에 에너지를 쏟고, 동료와 연결되며, 조직의 목표에 마음을 두는 상태입니다. 열의가 높은 조직은 성과와 혁신이 꾸준히 이어지지만, 열의가 낮아지면 조용한 퇴사와 이직이 먼저 나타납니다.</p>
  <p>열의는 한 가지 모습이 아닙니다. 일에는 몰입하지만 조직에는 애착이 없는 사람도 있고, 동료 관계 덕분에 버티는 사람도 있습니다. 그래서 <strong>개인 열의, 직무 열의, 관계 열의, 조직 열의</strong>를 나눠 보고, <strong>개인 수준과 팀 수준</strong>을 함께 진단해야 무엇을 바꿔야 할지 보입니다.</p>
  <p><strong>활용:</strong> 개인·팀 열의 수준 진단 및 열의 향상 지원</p>
</div>

<div class="report" id="ee-report" data-src="{{ '/assets/data/ee-data.json' | relative_url }}">
  <section class="report-grid">
    <div class="panel">
      <h2 class="panel-title">개인 수준 열의</h2>
      <p class="panel-sub">가상의 구성원 3명의 열의 프로파일</p>
      <div class="legend" id="ee-legend-person"></div>
      <div class="radar-box" id="ee-radar-person"></div>
    </div>
    <div class="panel">
      <h2 class="panel-title">팀 수준 열의</h2>
      <p class="panel-sub">가상의 3개 팀의 평균 열의</p>
      <div class="legend" id="ee-legend-team"></div>
      <div class="radar-box" id="ee-radar-team"></div>
    </div>
  </section>

  <section class="panel">
    <h2 class="panel-title">LPA 군집 분류</h2>
    <p class="panel-sub">4개 열의 요인의 높고 낮음이 비슷한 구성원끼리 묶은 4개 군집입니다. 행을 누르면 해당 군집의 조언으로 이동합니다.</p>
    <div id="ee-pattern"></div>
  </section>

  <section class="panel persona-panel" id="ee-advice-panel">
    <h2 class="panel-title">수준별 열의 향상 조언</h2>
    <p class="panel-sub">개인 군집 또는 팀을 골라, 열의를 높이기 위해 무엇을 할 수 있는지 확인하세요.</p>
    <div class="pub-filter" id="ee-mode" role="group" aria-label="보기 선택"><button type="button" class="pf-chip" data-mode="person" aria-pressed="true">개인 군집</button><button type="button" class="pf-chip" data-mode="team" aria-pressed="false">팀 수준</button></div>
    <div class="persona-cards lm-cards" id="ee-cards" role="tablist" aria-label="선택"></div>
    <div class="persona-result" id="ee-advice" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="ee-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/ee-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

<p class="report-foot">구성원, 팀, 군집 점수는 모두 설명을 위한 가상 예시입니다.</p>

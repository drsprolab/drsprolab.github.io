---
layout: post
title: "Goal Orientation과 성과 향상 진단"
category: 측정도구
wide: true
measurement_order: 5
measurement_badge: 목표·성과 진단
measurement_target: 조직 구성원
measurement_factors: 3개 요인 · 13문항
measurement_summary: 조직 내 목표설정과 구성원의 목표지향적 역량을 진단하고, 수행과 학습의 격차를 줄이는 솔루션을 제공합니다.
measurement_use: 목표지향 역량 진단 및 조직 목표설정·성과 향상 지원
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>AI 시대에는 기술이 일을 대신해 주는 만큼, 구성원이 실제로 해내는 <strong>수행 수준</strong>과 새로 배우는 <strong>학습 수준</strong> 사이에 격차가 생기기 쉽습니다. 이때 <strong>분명한 업무 목표와 학습 목표가 없다면</strong> AI는 업무를 바꾸는 힘이 되지 못하고 단순한 기술 활용에 그칠 수 있습니다.</p>
  <p>이 격차를 줄이는 대안은 조직 안에서 목표를 제대로 세우고, 구성원이 그 목표를 향해 배우고 성과를 내는 <strong>목표지향적 역량</strong>을 키우는 것입니다.</p>
  <p>Goal Orientation과 성과 향상 진단은 학습목표지향, 성과증명 목표지향, 성과회피 목표지향의 3개 요인으로 <strong>조직 내 목표설정과 구성원의 목표지향적 역량</strong>을 진단하고, 유형별로 목표설정과 성과 향상을 위한 솔루션을 제공합니다.</p>
  <p><strong>활용:</strong> 목표지향 역량 진단 및 조직 목표설정·성과 향상 지원</p>
</div>

<div class="report" id="gl-report" data-src="{{ '/assets/data/gl-profiles.json' | relative_url }}">
  <section class="panel">
    <h2 class="panel-title">목표지향성 3×3 조합 지도</h2>
    <p class="panel-sub">학습목표지향과 성과증명 목표지향을 각각 낮음·보통·높음으로 나눠 구성원 80명(가상 예시)이 어디에 분포하는지 보여 줍니다. 칸이 진할수록 사람이 많고, 번호는 아래 LPA 유형의 평균 위치입니다.</p>
    <div class="legend" id="gl-legend"></div>
    <div id="gl-matrix"></div>
    <p class="lvr-note">'회피 높음'은 그 칸 구성원들의 성과회피 목표지향 평균이 3.5 이상이라는 뜻입니다. 낮음·보통·높음 구분(3.0 미만 · 3.0–3.9 · 4.0 이상)은 설명을 위한 예시 기준입니다.</p>
  </section>

  <section class="panel persona-panel">
    <h2 class="panel-title">LPA 유형별 페르소나 진단</h2>
    <p class="panel-sub">세 요인의 조합이 비슷한 구성원끼리 묶은 4개 유형입니다. 유형을 누르면 성과 향상 준비도, 요인 조합, 조직·팀·개인 차원의 지원 방안이 나옵니다.</p>
    <div class="persona-cards lm-cards" id="gl-personas" role="tablist" aria-label="유형 선택"></div>
    <div class="persona-result" id="gl-persona-result" role="tabpanel" aria-live="polite"></div>
    <p class="lvr-note">* 성과회피 목표지향은 점수가 높을수록 실패를 피하려는 경향이 강하다는 뜻입니다. 성과 향상 준비도는 학습목표지향, 성과증명 목표지향, (6 − 성과회피)의 평균으로 계산한 예시 지표입니다.</p>
  </section>
</div>
<div class="viz-tip" id="gl-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/gl-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

<div class="report-intro"><h2>측정도구 출처</h2><ul><li>이진주, 문찬영, 이진주 (2024). Rasch 분석을 활용한 일터에서의 목표지향성 측정도구 타당화 연구. 경영교육연구, 39(3), 199-226. https://doi.org/10.23839/kabe.2024.39.3.199</li><li>VandeWalle, D., &amp; Cummings, L. L. (1997). A test of the influence of goal orientation on the feedback-seeking process. Journal of Applied Psychology, 82(3), 390-400.</li></ul><p>구성원 점수와 4개 유형은 LPA 결과를 설명하기 위한 가상 예시입니다.</p></div>

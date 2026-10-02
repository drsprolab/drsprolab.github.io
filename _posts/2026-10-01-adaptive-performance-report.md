---
layout: post
title: "Adaptive Performance 역량 진단 및 맞춤형 조직지원"
category: 측정도구
wide: true
measurement_order: 4
measurement_badge: 역량·조직 진단
measurement_target: 조직·팀 단위
measurement_factors: 5개 요인 · 18문항
measurement_summary: 구성원이 변화 속에서 최상의 성과를 내는 조직환경인지 진단하고, 맞춤형 학습과 조직문화 방안을 제시합니다.
measurement_use: 변화 주도·신기술 학습 환경 진단 및 맞춤형 학습·조직문화 구축
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p><strong>어떤 환경에서 구성원들이 가장 좋은 성과를 만들어 낼 수 있을까요?</strong> AI 시대에는 정해진 일을 잘하는 것만으로는 부족합니다. 구성원이 변화를 주도하고 새로운 기술을 빠르게 익힐 수 있는 조직환경이 성과를 좌우합니다.</p>
  <p>변화의 과정에는 늘 <strong>저항과 스트레스</strong>가 따릅니다. 중요한 것은 이를 피하는 것이 아니라, 무엇이 어려운지 돌아보고 대처 방법을 찾아가는 <strong>성찰적 대처</strong>입니다.</p>
  <p>Adaptive Performance 역량 진단은 창의성, 위기상황 대응, 대인관계 적응성, 학습, 스트레스 대처의 5개 요인으로 구성원과 팀의 적응수행 역량을 진단합니다. 이를 바탕으로 변화를 주도하는 환경, 신기술 학습, 저항과 스트레스에 대한 대처 수준을 확인하고 <strong>맞춤형 학습과 조직문화 구축 방안</strong>을 제시합니다.</p>
  <p><strong>활용:</strong> 변화 주도·신기술 학습 환경 진단 및 맞춤형 학습·조직문화 구축</p>
</div>

<div class="report" id="la-report" data-src="{{ '/assets/data/ap-teams.json' | relative_url }}" data-label="적응수행" data-level-label="적응수행 수준">
  <h2 class="report-section-title">집단 프로파일</h2>
  <section class="report-grid">
    <div class="panel">
      <h3 class="panel-title">개인 수준 진단</h3>
      <p class="panel-sub">전체 구성원 평균과 상위·하위 25% 구성원 비교 (5점 척도)</p>
      <div class="legend" id="la-legend-indiv"></div>
      <div class="radar-box" id="la-radar-indiv"></div>
      <p class="lvr-note" id="la-indiv-note"></p>
    </div>
    <div class="panel">
      <h3 class="panel-title">팀 수준 진단</h3>
      <p class="panel-sub">팀 평균 비교 (5점 척도)</p>
      <div class="legend" id="la-legend-team"></div>
      <div class="radar-box" id="la-radar-team"></div>
    </div>
  </section>

  <section class="panel">
    <h2 class="panel-title">하위요인별 팀 수준과 구성원 간 차이</h2>
    <p class="panel-sub">팀을 고르면 요인별 팀 평균과 구성원들의 점수 분포가 나옵니다.</p>
    <div class="pub-filter" id="la-spread-tabs" role="group" aria-label="팀 선택"></div>
    <div id="la-spread"></div>
  </section>

  <section class="panel persona-panel">
    <h2 class="panel-title">팀 페르소나 진단</h2>
    <p class="panel-sub">가상의 3개 팀을 예로 들었습니다. 팀을 누르면 적응수행 수준, 높은 영역과 낮은 영역의 조합, 조직·팀·개인 차원의 지원 방안이 나옵니다.</p>
    <div class="persona-cards" id="la-personas" role="tablist" aria-label="팀 선택"></div>
    <div class="persona-result" id="la-persona-result" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="la-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/la-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

<div class="report-intro"><h2>측정도구 출처</h2><ul><li>이진주, 박민정, 송지훈 (2023). Rasch 모형을 활용한 적응수행 측정도구 타당화 연구. 기업교육과 인재연구, 25(2), 37-71. https://doi.org/10.46260/KSLP.25.2.2</li><li>Charbonnier‐Voirin, A., &amp; Roussel, P. (2012). Adaptive performance: A new scale to measure individual performance in organizations. Canadian Journal of Administrative Sciences, 29(3), 280-293. https://doi.org/10.1002/cjas.232</li></ul><p>팀과 구성원 점수는 모두 가상 예시이며, 수준 구분(높음·보통·낮음)도 설명을 위한 예시 기준입니다.</p></div>

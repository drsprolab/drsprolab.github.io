---
layout: post
title: "Learning Motivation 측정 진단"
category: 측정도구
wide: true
measurement_order: 3
measurement_badge: 학습동기 진단
measurement_target: 조직 구성원
measurement_factors: 11개 요인 · 47문항
measurement_summary: 구성원이 어느 정도의 학습동기를 지니고 있는지 진단하고, 동기 유형에 맞는 HRD 지원과 교육환경을 제안합니다.
measurement_use: 구성원 학습동기 수준 진단 및 HRD 지원·교육환경 구축
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>일을 하려는 <strong>일반적인 동기</strong>와 새로운 것을 <strong>배우려는 학습동기</strong>는 서로 다르게 작동하기 때문에 따로 측정해야 합니다. 업무에 성실한 구성원도 학습에는 부담을 느낄 수 있고, 그 반대도 있습니다.</p>
  <p>학습에 대한 동기는 <strong>학습성과와 수행 수준 향상을 이끄는 가장 기본적인 요인</strong>입니다. 구성원이 학습에서 기대하는 결과와 가치, 학습에 드는 시간·노력·심리적 부담, 학습 목표를 함께 살펴야 교육이 실제 변화로 이어집니다.</p>
  <p>Learning Motivation 측정 진단은 조직 구성원이 어느 정도의 학습동기를 지니고 있는지를 11개 요인으로 진단하고, 동기 유형별로 필요한 <strong>HRD 지원 수준과 교육환경 구축 방안</strong>을 솔루션으로 제공합니다.</p>
  <p><strong>측정 요인:</strong> 자기효능감 · 결과기대 · 흥미가치 · 효용가치 · 달성가치 · 노력비용 · 기회비용 · 심리비용 · 숙달목표 · 수행접근목표 · 수행회피목표 (47문항)</p>
</div>

<div class="report" id="lm-report" data-src="{{ '/assets/data/lm-profiles.json' | relative_url }}">
  <section class="panel">
    <div class="panel-head">
      <div>
        <h2 class="panel-title">개인별 학습동기 프로파일</h2>
        <p class="panel-sub">구성원을 고르면 그 사람의 11개 요인 점수(실선)와 소속 프로파일 평균(점선)이 나옵니다.</p>
      </div>
      <label class="lm-select"><span>구성원</span><select id="lm-person-select"></select></label>
    </div>
    <div id="lm-person"></div>
  </section>

  <section class="report-grid">
    <div class="panel">
      <h2 class="panel-title">잠재프로파일(LPA) 유형</h2>
      <p class="panel-sub">11개 요인의 응답 조합이 비슷한 구성원끼리 묶은 4개 유형의 평균</p>
      <div class="legend" id="lm-legend-lpa"></div>
      <div class="radar-box" id="lm-radar-lpa"></div>
    </div>
    <div class="panel">
      <h2 class="panel-title">유형별 구성 비율</h2>
      <p class="panel-sub">구성원 60명(가상 예시) 중 각 유형의 비율</p>
      <div id="lm-share" class="lm-share"></div>
      <p class="lvr-note">잠재프로파일분석(LPA)은 점수의 높고 낮음만이 아니라 요인들의 조합 패턴이 비슷한 사람들을 찾아냅니다. 같은 평균 점수라도 유형에 따라 필요한 지원이 다릅니다.</p>
    </div>
  </section>

  <section class="panel persona-panel" id="lm-solution-panel">
    <h2 class="panel-title">유형별 맞춤 솔루션</h2>
    <p class="panel-sub">유형을 누르면 동기 조합의 특징, HRD 지원 수준, 교육환경 구축 방안과 구성원 학습 활동이 나옵니다.</p>
    <div class="persona-cards lm-cards" id="lm-profiles" role="tablist" aria-label="유형 선택"></div>
    <div class="persona-result" id="lm-solution" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="lm-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/lm-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

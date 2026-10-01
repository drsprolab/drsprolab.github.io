---
layout: post
title: "청년 기업가정신"
category: 측정도구
wide: true
---

<p class="report-source">출처: PRO AnalytiX Lab</p>

<div class="report" id="ye-report" data-src="{{ '/assets/data/youth-entrepreneurship-sample.json' | relative_url }}">
  <section class="report-grid">
    <div class="panel">
      <h2 class="panel-title">집단 프로파일</h2>
      <p class="panel-sub">하위요인별 평균 (5점 척도)</p>
      <div class="legend" id="ye-legend-group"></div>
      <div class="radar-box" id="ye-radar-group"></div>
    </div>
    <div class="panel">
      <h2 class="panel-title">하위요인별 변화</h2>
      <p class="panel-sub">사전·사후 평균, 변화량이 큰 순서</p>
      <div id="ye-change"></div>
    </div>
  </section>
</div>
<div class="viz-tip" id="ye-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/ye-report.js' | relative_url }}" defer></script>

<p class="report-foot">예시 데이터로 만든 샘플입니다. 측정도구: 정승환·노아영·하선민(2023), 7요인 31문항.</p>

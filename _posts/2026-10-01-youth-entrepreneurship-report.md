---
layout: post
title: "청년 기업가정신"
category: 측정도구
wide: true
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report" id="ye-report" data-src="{{ '/assets/data/youth-entrepreneurship-sample.json' | relative_url }}" data-personas="{{ '/assets/data/ye-personas.json' | relative_url }}">
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

  <section class="panel persona-panel">
    <h2 class="panel-title">페르소나 진단</h2>
    <p class="panel-sub">가상의 청년 3명을 예로 들었습니다. 인물을 누르면 그 사람의 점수와 진단이 나옵니다.</p>
    <div class="persona-cards" id="ye-personas" role="tablist" aria-label="페르소나 선택"></div>
    <div class="persona-result" id="ye-persona-result" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="ye-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/ye-report.js' | relative_url }}" defer></script>


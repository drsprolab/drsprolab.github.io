---
layout: post
title: "청년 기업가정신"
category: 측정도구
measurement_order: 2
measurement_target: 대학생·청년
measurement_factors: 7개 요인
measurement_summary: 낯선 환경에 도전하고 새로운 가치를 만들어 내는 역량을 진단합니다.
wide: true
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>측정도구 소개</h2>
  <p>인공지능이 일하고 배우는 방식을 빠르게 바꾸면서, 대학생에게는 정해진 답을 찾는 능력보다 낯선 환경에 먼저 뛰어드는 <strong>도전정신</strong>과 새로운 방식을 떠올리는 <strong>혁신적 마인드</strong>가 더 중요해졌습니다.</p>
  <p>청년 기업가정신 진단도구는 AI 시대에 학생이 <strong>스스로 가치를 만들어 낼 수 있는 역량</strong>을 자기유능감, 자기주도성, 성장의지, 도전정신, 혁신적 사고, 협업능력, 문제해결의 7개 요인으로 확인합니다. 진단 결과로 개인과 집단의 강점과 성장 요소를 파악하고, 이를 바탕으로 어떤 <strong>교육과 지원이 필요한지</strong> 과제를 찾을 수 있습니다.</p>
</div>

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

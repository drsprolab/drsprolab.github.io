---
layout: post
title: "학습민첩성"
category: 측정도구
measurement_order: 1
measurement_target: 직장인·조직 구성원
measurement_factors: 6개 요인
measurement_summary: 새로운 경험에서 배우고 다른 상황에 적용하는 역량을 진단합니다.
wide: true
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>측정도구 소개</h2>
  <p>인공지능이 일하는 방식을 빠르게 바꾸면서, 이미 알고 있는 지식보다 <strong>새로운 경험에서 빨리 배우고 다른 상황에 적용하는 힘</strong>이 더 중요해졌습니다. 정답이 정해지지 않은 환경에서 구성원이 스스로 배우고 방식을 바꿔 나가는 능력이 곧 개인과 조직의 경쟁력이 됩니다.</p>
  <p>학습민첩성 진단도구는 이 능력을 자기주도적 학습, 비판적 성찰, 생산적 피드백 추구, 도전적 경험, 합리적 문제 해결, 직무환경에 대한 적응의 6개 요인으로 확인합니다. 진단 결과로 개인과 조직의 강점과 성장 요소를 파악하고, 이를 바탕으로 어떤 <strong>교육과 지원이 필요한지</strong> 과제를 찾을 수 있습니다.</p>
</div>

<div class="report" id="ye-report" data-src="{{ '/assets/data/learning-agility-sample.json' | relative_url }}" data-personas="{{ '/assets/data/la-personas.json' | relative_url }}">
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
    <p class="panel-sub">가상의 직장인 3명을 예로 들었습니다. 인물을 누르면 그 사람의 점수와 진단이 나옵니다.</p>
    <div class="persona-cards" id="ye-personas" role="tablist" aria-label="페르소나 선택"></div>
    <div class="persona-result" id="ye-persona-result" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="ye-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/ye-report.js' | relative_url }}" defer></script>

---
layout: post
title: "자기자비 (Self-Compassion) 진단"
category: 측정도구
wide: true
measurement_order: 6
measurement_badge: 마음 상태 진단
measurement_target: 조직 구성원
measurement_factors: 6개 요인 · 18문항
measurement_summary: 구성원이 지금 직면한 마음의 상태를 진단하고, 직무·관계 스트레스를 극복할 수 있도록 맞춤형 지원을 제안합니다.
measurement_use: 구성원 마음 상태 진단 및 맞춤형 심리·조직 지원
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>조직 안에서 겪는 <strong>직무 스트레스와 관계 스트레스</strong>를 어떻게 극복하느냐는 개인의 행복감을 좌우하고, 나아가 <strong>장기적인 조직의 성과</strong>를 떠받치는 기반이 됩니다. 어려움 앞에서 자신을 몰아세우기보다 따뜻하게 대하고, 그 경험을 누구나 겪을 수 있는 일로 받아들이는 힘이 회복과 성장을 만듭니다.</p>
  <p>이를 위해서는 먼저 구성원이 <strong>지금 직면하고 있는 마음의 상태</strong>를 정확히 진단하고, 그 상태에 맞는 <strong>맞춤형 지원</strong>을 제공하는 것이 필수적입니다.</p>
  <p>자기자비(Self-Compassion) 진단은 자기친절, 자기비판, 보편적 인간성, 고립, 마음챙김, 과잉동일시의 6개 요인으로 현재의 마음 상태를 확인하고, 상태 유형별로 조직 차원의 지원과 개인이 실천할 수 있는 행동을 제안합니다.</p>
  <p><strong>활용:</strong> 구성원 마음 상태 진단 및 맞춤형 심리·조직 지원</p>
</div>

<div class="report" id="sc-report" data-src="{{ '/assets/data/sc-profiles.json' | relative_url }}">
  <section class="panel">
    <h2 class="panel-title">세 사람의 마음 상태 비교</h2>
    <p class="panel-sub">가상의 구성원 3명의 자기자비 프로파일을 하나의 방사형 차트에 겹쳐, 서로 얼마나 다른 상태인지 보여 줍니다.</p>
    <div class="sc-compare">
      <div><div class="legend" id="sc-legend"></div><div class="radar-box" id="sc-radar"></div></div>
      <div class="sc-persona-list" id="sc-persona-list"></div>
    </div>
    <p class="lvr-note">* 표시 요인(자기비판, 고립, 과잉동일시)은 점수가 높을수록 마음의 부담이 크다는 뜻입니다. 사람을 누르면 해당 군집의 맞춤 지원으로 이동합니다.</p>
  </section>

  <section class="panel">
    <h2 class="panel-title">LPA 군집 분류</h2>
    <p class="panel-sub">6개 요인의 높고 낮음이 비슷한 구성원끼리 묶은 4개 군집입니다. 초록은 마음을 지켜 주는 방향, 주황은 돌봐야 할 방향입니다.</p>
    <div id="sc-pattern"></div>
  </section>

  <section class="panel persona-panel" id="sc-solution-panel">
    <h2 class="panel-title">군집별 맞춤 지원</h2>
    <p class="panel-sub">군집을 누르면 상태 설명, 조직 내 지원 요소, 현 상태를 극복하는 데 도움이 되는 행동 조언이 나옵니다.</p>
    <div class="persona-cards lm-cards" id="sc-clusters" role="tablist" aria-label="군집 선택"></div>
    <div class="persona-result" id="sc-solution" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="sc-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/sc-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

<div class="report-intro"><h2>References</h2><div class="references"><p>배재현, 송지훈, 홍소정 (2024). 한국판 자기자비 상태 측정도구의 타당화 연구: 대학생과 성인을 중심으로. <em>사회과학연구, 17</em>(2), 7–45.</p><p>Neff, K. D., Tóth-Király, I., Knox, M. C., Kuchar, A., &amp; Davidson, O. (2021). The development and validation of the State Self-Compassion Scale (long- and short form). <em>Mindfulness, 12</em>(1), 121–140. https://doi.org/10.1007/s12671-020-01505-4</p></div><p>세 사람과 군집 점수는 모두 LPA 결과를 설명하기 위한 가상 예시입니다.</p></div>

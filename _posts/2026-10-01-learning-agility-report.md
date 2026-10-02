---
layout: post
title: "Agile 조직문화 진단"
category: 측정도구
measurement_order: 1
measurement_badge: 조직문화 진단
measurement_target: 조직·팀 단위
measurement_factors: 6개 요인 · 18문항
measurement_summary: 조직이 얼마나 Agile하게 학습하고 성과를 만들어 가는 조직문화인지 진단합니다.
measurement_use: 조직의 Agile 수준 진단 및 Agile 조직문화 구축 지원
wide: true
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>환경이 빠르게 바뀌는 시대에 조직의 경쟁력은 계획을 얼마나 잘 지키느냐보다, <strong>새로운 상황에서 얼마나 빨리 배우고 일하는 방식을 바꿔 성과로 연결하느냐</strong>에서 나옵니다. 이런 힘은 몇몇 뛰어난 개인이 아니라, 구성원 모두가 배우고 시도하고 피드백을 주고받는 조직문화에서 만들어집니다.</p>
  <p>Agile 조직문화 진단은 조직이 얼마나 <strong>Agile하게 학습하고 성과를 만들어 갈 수 있는 조직문화</strong>인지를 자기주도적 학습, 비판적 성찰, 생산적 피드백 추구, 도전적 경험, 합리적 문제 해결, 직무환경에 대한 적응의 6개 요인으로 진단합니다. 개인, 팀, 조직 수준의 결과를 함께 보고 강점과 보완할 영역을 찾습니다.</p>
  <p><strong>활용:</strong> 조직의 Agile 수준 진단 및 Agile 조직문화 구축 지원</p>
</div>

<div class="report" id="la-report" data-src="{{ '/assets/data/la-teams.json' | relative_url }}">
  <h2 class="report-section-title">집단 프로파일</h2>
  <section class="report-grid">
    <div class="panel">
      <h3 class="panel-title">개인별 Agility 진단</h3>
      <p class="panel-sub">전체 구성원 평균과 상위·하위 25% 구성원 비교 (5점 척도)</p>
      <div class="legend" id="la-legend-indiv"></div>
      <div class="radar-box" id="la-radar-indiv"></div>
      <p class="lvr-note" id="la-indiv-note"></p>
    </div>
    <div class="panel">
      <h3 class="panel-title">팀별 Agility 진단</h3>
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
    <p class="panel-sub">가상의 3개 팀을 예로 들었습니다. 팀을 누르면 Agile 수준, 높은 영역과 낮은 영역의 조합, 조직·팀·개인 차원의 지원 방안이 나옵니다.</p>
    <div class="persona-cards" id="la-personas" role="tablist" aria-label="팀 선택"></div>
    <div class="persona-result" id="la-persona-result" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="la-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/la-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

<div class="report-intro"><h2>측정도구 출처</h2><ul><li>Lee, J., &amp; Song, J. H. (2022). Developing a measurement of employee learning agility. European Journal of Training and Development, 46(5/6), 585-606. https://doi.org/10.1108/EJTD-01-2021-0018</li></ul><p>학습민첩성 측정도구를 조직·팀 수준의 Agile 조직문화 진단에 활용한 예시입니다. 팀과 구성원 점수는 모두 가상 예시이며, 수준 구분(높음·보통·낮음)도 설명을 위한 예시 기준입니다.</p></div>

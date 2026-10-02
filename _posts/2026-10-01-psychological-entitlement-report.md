---
layout: post
title: "심리적 특권의식 (Psychological Entitlement) 진단"
category: 측정도구
wide: true
measurement_order: 7
measurement_badge: 조직문화 위험 진단
measurement_target: 조직 구성원
measurement_factors: 1개 요인 · 8문항
measurement_summary: 누가, 왜 자신만 특별한 대우를 받아야 한다고 느끼는지 확인하고, 개인·팀·조직 차원의 처방을 제안합니다.
measurement_use: 특권의식 수준과 원인 진단 및 개인·팀·조직 맞춤 처방
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>조직은 수많은 다양한 사람들이 모여 일하는 곳입니다. 그런데 그중 <strong>단 한 명, 혹은 소수의 구성원</strong>이 "나는 남들과 다르게 대우받아야 한다"는 특권의식으로 행동하기 시작하면 어떻게 될까요? 처음에는 사소한 예외 요구나 불만처럼 보이지만, 그 행동은 동료의 공정성 인식과 신뢰를 조금씩 갉아먹습니다. 그리고 어느 순간 <strong>조직문화 전체에 되돌리기 어려운 피해</strong>로 번집니다.</p>
  <p>그래서 물어야 합니다. <strong>누가, 그리고 왜</strong> 자신만 특별한 권한과 권리를 가지고 있고 남보다 우월한 대접을 받아야 한다고 생각하게 되었을까요? 특권의식은 성격의 문제로만 끝나지 않습니다. 과거의 보상 경험, 불공정하다고 느낀 기억, 직위와 연차, 자기평가와 비교 습관이 서로 다른 조합으로 얽혀 만들어집니다.</p>
  <p>심리적 특권의식(Psychological Entitlement) 진단은 구성원마다 다른 특권의식의 정도를 확인하고, 그 <strong>원인이 되는 개인적 특성의 조합</strong>을 찾아 <strong>개인, 팀, 조직 차원에서 무엇을 해야 하는지</strong> 처방합니다. 진단 결과는 사람을 낙인찍는 데가 아니라 갈등을 예방하고 공정한 문화를 만드는 데 사용합니다.</p>
  <p><strong>활용:</strong> 특권의식 수준과 원인 진단 및 개인·팀·조직 맞춤 처방</p>
</div>

<div class="report" id="pe-report" data-src="{{ '/assets/data/pe-data.json' | relative_url }}">
  <section class="panel">
    <h2 class="panel-title">사람마다 다른 특권의식</h2>
    <p class="panel-sub">가상의 구성원 96명을 팀별로 놓았습니다. 점 하나가 한 사람이고, 오른쪽으로 갈수록 특권의식이 높습니다(예시 점수 1–7).</p>
    <div class="legend" id="pe-swarm-legend"></div>
    <div class="table-wrap pe-swarm-wrap" id="pe-swarm"></div>
    <p class="lvr-note" id="pe-swarm-note"></p>
  </section>

  <section class="report-grid">
    <div class="panel">
      <h2 class="panel-title">왜 그렇게 되었나: 원인 단서</h2>
      <p class="panel-sub">특권의식이 높은 상위 25%가 나머지 구성원보다 어떤 배경 특성이 강한지 비교했습니다(표준편차 단위).</p>
      <div id="pe-causes"></div>
    </div>
    <div class="panel">
      <h2 class="panel-title">원인을 읽는 법</h2>
      <ul class="pe-howto">
        <li><strong>과거 보상 경험</strong>: 특별 대우를 받아 온 경험이 기대로 굳어짐</li>
        <li><strong>불공정 지각</strong>: 손해 본다는 느낌을 특권 요구로 보상받으려 함</li>
        <li><strong>직위·재직 기간</strong>: 지위를 예외의 근거로 여김</li>
        <li><strong>자기평가 격차</strong>: 내 기여를 동료가 보는 것보다 크게 평가함</li>
        <li><strong>사회적 비교</strong>: 늘 남과 비교하며 더 받아야 한다고 느낌</li>
      </ul>
      <p class="lvr-note">배경 특성은 원인을 설명하기 위한 예시 변수로, 특권의식 척도 문항이 직접 측정하는 내용은 아닙니다. 실제 진단에서는 인사 자료나 추가 설문과 함께 봅니다.</p>
    </div>
  </section>

  <section class="panel persona-panel">
    <h2 class="panel-title">유형별 처방: 개인 · 팀 · 조직</h2>
    <p class="panel-sub">특권의식이 높은 구성원을 원인 특성의 조합에 따라 4개 유형으로 나눴습니다. 유형을 누르면 원인 조합과 개인·팀·조직이 해야 할 일이 나오고, 위 분포에서 해당 유형만 강조됩니다.</p>
    <div class="persona-cards lm-cards" id="pe-types" role="tablist" aria-label="유형 선택"></div>
    <div class="persona-result" id="pe-type-result" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="pe-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/pe-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

<div class="report-intro"><h2>References</h2><div class="references"><p>Campbell, W. K., Bonacci, A. M., Shelton, J., Exline, J. J., &amp; Bushman, B. J. (2004). Psychological entitlement: Interpersonal consequences and validation of a self-report measure. <em>Journal of Personality Assessment, 83</em>(1), 29–45. https://doi.org/10.1207/s15327752jpa8301_04</p><p>Joo, J., Park, M., Yim, S. M., &amp; Song, J. H. (2025). Validation of psychological entitlement measurement in South Korea. <em>Asian Journal of Social Psychology, 28</em>(3), Article e70042. https://doi.org/10.1111/ajsp.70042</p></div><p>구성원, 배경 특성, 유형은 모두 설명을 위한 가상 예시입니다.</p></div>

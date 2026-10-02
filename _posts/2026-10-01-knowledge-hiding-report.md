---
layout: post
title: "지식은폐 (Knowledge Hiding) 진단"
category: 측정도구
wide: true
measurement_order: 8
measurement_badge: 조직학습 진단
measurement_target: 조직구성원·팀·조직 단위
measurement_factors: 3개 요인 · 10문항
measurement_summary: 구성원이 왜, 어떤 상황에서, 어떤 방식으로 지식을 숨기는지 진단하고 지식 공유를 활성화할 방안을 제안합니다.
measurement_use: 지식은폐 원인 진단 및 조직학습·혁신 활성화
---

<p class="report-source"><span class="chip">진단도구 활용 예시</span> 출처: PRO AnalytiX Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>조직의 진짜 경쟁력은 구성원 머릿속에 있는 <strong>암묵지</strong>가 말과 문서로 표현된 <strong>형식지</strong>로 바뀌고, 그것이 다시 조직 전체의 지식으로 <strong>내재화</strong>될 때 만들어집니다. 이것이 조직학습(Organizational Learning)의 과정입니다.</p>
  <p>지식은폐는 이 과정을 막는 <strong>가장 고질적인 요인</strong>입니다. 동료가 도움을 요청해도 아는 것을 숨기거나, 모르는 척하거나, 그럴듯한 이유를 대며 넘어가는 순간 지식은 한 사람 안에 갇히고 조직은 같은 실수를 되풀이합니다.</p>
  <p>그래서 <strong>왜 구성원들이 자신의 암묵지가 공유되는 것을 두려워하는지</strong>를 파악하고, 그 원인을 진단해 공유를 활성화할 방법을 찾는 것이 <strong>조직 변화와 혁신(Org. Change &amp; Innovation)의 핵심</strong>입니다. 이 진단은 <strong>왜, 어느 상황에서, 어떤 행동으로</strong> 지식을 숨기는지 확인하고 개인·팀·조직 차원에서 할 수 있는 활동을 추천합니다.</p>
  <p><strong>활용:</strong> 지식은폐 원인 진단 및 조직학습·혁신 활성화</p>
</div>

<div class="report" id="kh-report" data-src="{{ '/assets/data/kh-data.json' | relative_url }}">
  <section class="panel">
    <h2 class="panel-title">어느 상황에서, 어떤 행동으로 숨기는가</h2>
    <p class="panel-sub">상황별로 세 가지 은폐 행동이 얼마나 나타나는지 보여 줍니다(1–5, 진할수록 많이 나타남).</p>
    <ul class="kh-legend">
      <li><strong>회피적 은폐</strong>: 일부만 알려 주거나 나중에 주겠다며 미룸</li>
      <li><strong>모르는 척하기</strong>: 알고 있으면서 모른다고 함</li>
      <li><strong>합리화된 은폐</strong>: 규정이나 사정을 들어 공유하지 않는 것을 정당화함</li>
    </ul>
    <div id="kh-heat"></div>
  </section>

  <section class="panel">
    <h2 class="panel-title">왜 숨기는가: 공유를 두려워하는 이유</h2>
    <p class="panel-sub">은폐 행동과 관련이 큰 원인 순서입니다(예시 관련 정도 0–1).</p>
    <div id="kh-reasons"></div>
  </section>

  <section class="panel persona-panel">
    <h2 class="panel-title">유형별 처방: 개인 · 팀 · 조직</h2>
    <p class="panel-sub">은폐 행동의 조합에 따라 구성원을 4개 유형으로 나눴습니다. 유형을 누르면 어떤 상황에서 왜 숨기는지와 개인·팀·조직 차원의 활동이 나옵니다.</p>
    <div class="persona-cards lm-cards" id="kh-types" role="tablist" aria-label="유형 선택"></div>
    <div class="persona-result" id="kh-type-result" role="tabpanel" aria-live="polite"></div>
  </section>
</div>
<div class="viz-tip" id="kh-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/kh-report.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

<div class="report-intro"><h2>References</h2><div class="references"><p>Connelly, C. E., Zweig, D., Webster, J., &amp; Trougakos, J. P. (2012). Knowledge hiding in organizations. <em>Journal of Organizational Behavior, 33</em>(1), 64–88. https://doi.org/10.1002/job.737</p><p>Joo, J., Lee, Y., &amp; Song, J. H. (2025). Validation of knowledge hiding measurement in South Korea. <em>European Journal of Training and Development, 49</em>(5/6), 533–551. https://doi.org/10.1108/EJTD-01-2024-0004</p></div><p>상황별 점수, 원인 관련 정도, 유형은 모두 설명을 위한 가상 예시입니다.</p></div>

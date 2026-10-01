---
layout: post
title: "측정도구 리포트 샘플: 청소년 기업가정신 사전·사후 진단"
category: 측정도구
wide: true
---

청소년 기업가정신 측정도구(정승환·노아영·하선민, 2023; 7요인 31문항)로 진로교육 프로그램 전후를 진단했다고 가정한 **결과 보고서 샘플**입니다. 측정 시점과 학교급을 바꾸면 모든 수치와 차트가 다시 계산되고, 응답자 ID를 누르면 그 학생의 프로파일이 열립니다.

<div class="report" id="ye-report" data-src="{{ '/assets/data/youth-entrepreneurship-sample.json' | relative_url }}">
  <p class="report-note" id="ye-note">데이터를 불러오는 중입니다…</p>

  <div class="report-controls" role="group" aria-label="보고서 필터">
    <div class="seg" role="radiogroup" aria-label="측정 시점">
      <span class="seg-label">측정 시점</span>
      <button type="button" id="ye-pt-pre" data-point="pre" role="radio" aria-checked="false">사전</button>
      <button type="button" id="ye-pt-post" data-point="post" role="radio" aria-checked="true">사후</button>
    </div>
    <div class="seg" role="radiogroup" aria-label="학교급">
      <span class="seg-label">학교급</span>
      <button type="button" id="ye-sc-all" data-school="all" role="radio" aria-checked="true">전체</button>
      <button type="button" id="ye-sc-mid" data-school="중학교" role="radio" aria-checked="false">중학교</button>
      <button type="button" id="ye-sc-high" data-school="고등학교" role="radio" aria-checked="false">고등학교</button>
    </div>
  </div>

  <section class="kpis" id="ye-kpis" aria-live="polite"></section>

  <section class="report-grid">
    <div class="panel">
      <h2 class="panel-title">집단 프로파일</h2>
      <p class="panel-sub">하위요인별 평균 (5점 척도)</p>
      <div class="legend" id="ye-legend-group"></div>
      <div class="radar-box" id="ye-radar-group"></div>
    </div>
    <div class="panel">
      <h2 class="panel-title">하위요인별 사전·사후 변화</h2>
      <p class="panel-sub">집단 평균 기준, 변화량이 큰 순서</p>
      <div id="ye-change"></div>
    </div>
  </section>

  <section class="panel profile-panel" id="ye-profile" hidden tabindex="-1" aria-live="polite"></section>

  <section class="panel">
    <div class="panel-head">
      <div>
        <h2 class="panel-title">응답자 목록</h2>
        <p class="panel-sub">ID를 누르면 개인 프로파일이 열립니다. 열 제목을 누르면 정렬됩니다.</p>
      </div>
    </div>
    <div class="table-wrap"><table class="resp-table" id="ye-table"></table></div>
  </section>
</div>
<div class="viz-tip" id="ye-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/ye-report.js' | relative_url }}" defer></script>

## 이 보고서를 읽는 법

- **집단 프로파일**의 레이더 차트는 7개 하위요인의 평균을 한 번에 보여 줍니다. 바깥으로 갈수록 점수가 높습니다.
- **개인 프로파일**에서는 학생의 점수를 같은 학교급 집단 평균(점선)과 겹쳐 봅니다. 집단보다 0.3점 이상 높은 요인은 강점, 0.3점 이상 낮은 요인은 성장 과제로 표시합니다.
- 점수는 하위요인에 속한 문항 응답의 평균입니다. 원 척도가 제시한 채점 기준이 따로 있다면 그 기준을 따르세요.
- 이 페이지의 응답자는 모두 **가상의 예시 데이터**입니다. 실제 데이터는 같은 형식의 JSON 파일(`assets/data/`)만 바꾸면 그대로 반영됩니다.

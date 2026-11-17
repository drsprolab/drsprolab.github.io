---
layout: page
title: 어서와, 연구는 처음이지?
permalink: /research-help/start/
wide: true
research_practice: true
lede: 무엇을 연구하고 싶은지 아직 정리되지 않아도 괜찮습니다. 고민하는 내용을 생각나는 대로 적으면 가능한 연구주제, 사용할 수 있는 변수, 이론적 근거를 추천해 드립니다.
---

{% include research-help-tabs.html %}

<div id="rh-explore" class="rhx" data-endpoint="{{ site.research_help_script_url | escape }}">
  <section class="rhx-write" aria-labelledby="rhx-write-title">
    <h2 id="rhx-write-title">뭔지는 모르겠는데 연구가 하고 싶다!</h2>
    <p>연구가 무엇인지 몰라도 됩니다. 조금씩 알아가면 여러분들도 논문을 쓸 수 있습니다.</p>
    <div class="rhx-tips">
      <ul>
        <li>내가 수업을 들으면서 궁금했던 것</li>
        <li>내가 공부를 하면서 궁금했던 것</li>
        <li>뭔지는 알겠는데 주제를 어떻게 생각해 봐야 할지 모를 때</li>
        <li>뭔지 조금은 감이 오는데 어떻게 시작할지 모를 때</li>
      </ul>
      <p>여기에서 시작해 보세요.</p>
    </div>
    <label class="rhx-label" for="rhx-text">고민하는 내용</label>
    <textarea id="rhx-text" class="rhx-text" rows="12" maxlength="4000" placeholder="예: 회사에 들어온 지 1년도 안 된 신입사원들이 생각보다 빨리 그만두는 것을 자주 봤습니다. 선배가 잘 챙겨 주는 팀은 덜 그만두는 것 같은데, 정말 그런지, 왜 그런지 궁금합니다…"></textarea>
    <div class="rhx-meta"><span id="rhx-count">0 / 4000</span></div>
    <p class="rhx-consent">작성한 내용은 추천을 만들기 위해 외부 AI 서비스(Anthropic Claude API)로 전송되며, 연구실의 비공개 저장소에 보관됩니다. 민감한 개인정보는 적지 마세요.</p>
    <div class="rhx-actions"><button type="button" class="rh-btn primary" id="rhx-go">연구주제 추천받기</button></div>
  </section>
  <p class="rh-status is-empty" id="rhx-status" role="status" aria-live="polite"></p>
  <section class="rhx-result" id="rhx-result" hidden aria-live="polite"></section>
  <p class="rhx-next">주제가 어느 정도 잡혔다면 <a href="{{ '/research-help/basics/' | relative_url }}">논문작성법(기초)</a>을 읽고 <a href="{{ '/research-help/#write' | relative_url }}">나의 연구 발전시키기(실습)</a>로 연구계획을 써 보세요.</p>
</div>
<script src="{{ '/assets/js/research-help-explore.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

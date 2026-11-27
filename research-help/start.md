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
    <p class="rhx-callout"><strong>💡 <mark>단순한 질문보다 구체적인 내용을 기입할수록 더 나에게 맞는 연구가 추천됩니다.</mark></strong><br>간단한 질문보다 <strong>한 단계만 더 생각해 보고</strong> 추천받아 보길 권장합니다.</p>
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
    <textarea id="rhx-text" class="rhx-text" rows="14" maxlength="4000" placeholder="예: 저는 제조 회사 인사팀에서 3년째 신입사원 교육을 맡고 있습니다. 매년 40명 정도 입사하는데, 그중 10명 가까이가 1년 안에 그만둡니다.&#10;&#10;(무엇을 봤나요?) 퇴사 면담을 해 보면 '일이 힘들어서'보다 '물어볼 사람이 없어서', '내가 잘하고 있는지 몰라서'라는 말을 더 자주 듣습니다. 그런데 사수(선배)가 매주 따로 시간을 내서 이야기를 들어 주는 팀은 신입사원이 거의 그만두지 않았습니다.&#10;&#10;(내 생각은?) 선배의 관심과 도움이 신입사원이 회사에 적응하고 자신감을 갖게 해서 계속 다니게 만드는 것 같습니다. 다만 그 팀들은 원래 분위기가 좋아서 그런 것일 수도 있습니다.&#10;&#10;(무엇이 궁금한가요?) 선배의 도움이 정말 신입사원의 퇴사 생각을 줄이는지, 줄인다면 그 사이에서 무엇이 달라지는지(적응, 자신감, 소속감 등), 그리고 팀 분위기에 따라 그 효과가 달라지는지 알고 싶습니다."></textarea>
    <div class="rhx-meta"><span id="rhx-count">0 / 4000</span></div>
    <p class="rhx-consent">작성한 내용은 추천을 만들기 위해 외부 AI 서비스(Anthropic Claude API)로 전송되며, 연구실의 비공개 저장소에 보관됩니다. 민감한 개인정보는 적지 마세요.</p>
    <div class="rhx-actions"><button type="button" class="rh-btn primary" id="rhx-go">연구주제 추천받기</button></div>
  </section>
  <p class="rh-status is-empty" id="rhx-status" role="status" aria-live="polite"></p>
  <section class="rhx-result" id="rhx-result" hidden aria-live="polite"></section>
  <section class="rhx-next" aria-label="다음 단계">
    <p class="rhx-next-lead">주제가 어느 정도 잡혔다면, 다음 단계로 이어가 보세요.</p>
    <div class="rhx-next-links">
      <a class="rhx-next-card" href="{{ '/research-help/basics/' | relative_url }}"><span class="rhx-next-tag">1단계 · 읽기</span><strong>논문작성법(기초)</strong><span class="rhx-next-desc">논문의 기본 구조와 쓰는 법 익히기</span><span class="rhx-next-go" aria-hidden="true">바로가기 →</span></a>
      <a class="rhx-next-card" href="{{ '/research-help/#write' | relative_url }}"><span class="rhx-next-tag">2단계 · 쓰기</span><strong>나의 연구 발전시키기(실습)</strong><span class="rhx-next-desc">연구계획을 직접 써 보기</span><span class="rhx-next-go" aria-hidden="true">바로가기 →</span></a>
    </div>
  </section>
</div>
<script src="{{ '/assets/js/research-help-explore.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

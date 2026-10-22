(() => {
  const root = document.getElementById('agn');
  if (!root) return;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href = (v) => { try { const u = new URL(v); return ['http:','https:'].includes(u.protocol) ? esc(u.href) : '#'; } catch { return '#'; } };
  const docs = [
    ['설문지(Word)', '대학생_설문지_검토용.docx'],
    ['문항은행·분석 워크북(Excel)', '문항은행과_요구도분석_검토용.xlsx'],
    ['설계와 분석 지침', '설계와_분석_지침.md'],
    ['문항 근거와 교육 연계', '문항근거와_교육연계.md'],
    ['응답 입력 빈 양식(CSV)', '응답입력_빈양식.csv']
  ];
  const fileBase = '/assets/downloads/ai-agent-needs/';

  function render(data) {
    const domains = data.domains || [];
    const common = domains.filter(d => d.module === '공통');
    const advanced = domains.filter(d => d.module !== '공통');
    const itemCount = (list) => list.reduce((n,d) => n + d.items.length, 0);
    const itemTotal = itemCount(domains);
    const sources = Object.fromEntries((data.sources || []).map(s => [s[0], s]));
    const programs = Object.fromEntries((data.programs || []).map(p => [p[0], p]));
    const sourceLinks = (ids) => (ids || []).map(id => {
      const s = sources[id]; return s ? `<a href="${href(s[3])}" target="_blank" rel="noopener noreferrer" title="${esc(s[2])}">${esc(id)}</a>` : '';
    }).join('');

    const domainMarkup = (d, index, expanded) => {
      const p = programs[d.program] || [];
      const id = `${d.id}`;
      const items = d.items.map((it, i) => `<article class="agn-item">
        <div class="agn-item-head"><span class="agn-id">${esc(id)}${String(i+1).padStart(2,'0')}</span><p>${esc(it[0])}</p></div>
        <div class="agn-evidence"><b>확인 가능한 수행 근거</b> · ${esc(it[1])}</div>
        <div class="agn-sources" aria-label="문항 근거 문헌">${sourceLinks(d.sources)}</div>
        ${p.length ? `<div class="agn-program">연계 교육안 ${esc(p[0])} · ${esc(p[1])}</div>` : ''}
      </article>`).join('');
      return `<details class="agn-domain" ${expanded ? 'open' : ''}><summary>${esc(d.name)} <small>· ${d.items.length}문항 · ${esc(d.module)}</small></summary><div class="agn-items">${items}</div></details>`;
    };

    root.innerHTML = `
      <ul class="agn-meta"><li>대학생 대상</li><li>${itemCount(common)}개 공통 문항</li><li>${itemCount(advanced)}개 Agent 심화 문항</li><li>중요도 × 수행수준</li></ul>
      <section class="agn-notice"><strong>개발·내용 검토용 예비 도구</strong><p>현재는 문항과 분석 설계를 검토하는 단계입니다. 이 페이지는 응답을 저장하거나 수집하지 않으며, 개인 진단 결과도 산출하지 않습니다. 정식 조사 전 전문가 내용타당도 검토, 대학생 인지면담과 예비조사, 신뢰도·타당도 검증이 필요합니다.</p></section>
      <section class="agn-block"><h2>무엇을 파악하나요?</h2><p>대학생이 수업, 학습, 과제, 팀 프로젝트에서 AI와 Agent를 책임 있게 활용하고, 작업을 위임·감독·평가하는 역량 가운데 무엇이 교육적으로 더 필요한지 파악합니다. 문항은 중요도와 수행수준을 같은 행동 기준에 대해 각각 묻도록 구성했습니다.</p><div class="agn-cards">
        <div class="agn-card"><b>공통 모듈 · ${itemCount(common)}문항</b><span class="agn-small">AI 이해, 과제 구조화, 검증, 학습, 협업, 학업윤리, 개인정보 보호 등</span></div>
        <div class="agn-card"><b>Agent 심화 · ${itemCount(advanced)}문항</b><span class="agn-small">Agent 작업 위임·통제, 실행 점검, 도구 연결, 시험·평가, 운영 개선 등</span></div>
        <div class="agn-card"><b>응답 기준</b><span class="agn-small">중요도: 다음 학기 학업 수행에 필요한 정도. 수행수준: 최근 4주 실제 수행을 우선 회상하고, 해당 경험이 없으면 최근 학기 기준으로 응답.</span></div>
      </div></section>
      <section class="agn-block"><h2>요구도 분석 방식</h2><div class="agn-method">
        <div><h3>Borich 요구도</h3><p>문항별 평균 중요도와 평균 수행수준의 차이를 중요도로 가중해 요구도 우선순위를 산출합니다. 중요도와 수행수준이 모두 유효한 동일 응답자 쌍만 계산에 사용합니다.</p></div>
        <div><h3>IPA</h3><p>중요도와 수행수준의 전체 평균을 기준선으로 두고 문항을 사분면에 배치해, 중요도와 현재 수행의 상대적 위치를 살펴봅니다.</p></div>
        <div><h3>Locus for Focus</h3><p>중요도와 중요도−수행수준 격차를 축으로 문항을 배치합니다. 중요도와 격차가 모두 높은 영역을 확인합니다.</p></div>
      </div><p class="agn-warning">세 방법은 동일한 중요도·수행수준 자료를 서로 다른 방식으로 요약하므로 독립적인 세 번의 검증으로 해석하지 않습니다. 수행수준 ‘경험 없음’은 낮은 점수로 바꾸지 않고 결측과 경험률로 별도 보고합니다. 공통·심화 모듈의 분석과 기준선은 분리합니다. 세부 판정·결측 처리·동률 규칙은 설계와 분석 지침에 공개했습니다.</p></section>
      <section class="agn-block"><h2>설문 문항</h2><p>아래 문항은 모두 “이 행동이 얼마나 중요한가?”와 “현재 어느 정도 수행하는가?”를 한 쌍으로 묻는 개발안입니다. 문항을 열면 행동 문구와 관찰 가능한 수행 근거, 관련 문헌 및 교육안을 볼 수 있습니다.</p>
        <h3>공통 모듈 (${itemCount(common)}문항)</h3>${common.map((d,i)=>domainMarkup(d,i,i===0)).join('')}
        <h3 style="margin-top:22px">Agent 심화 모듈 (${itemCount(advanced)}문항)</h3><p class="agn-small">Agent를 직접 구성·수정해 실행한 경험이 있거나, Agent 구축에 대한 관심이 보통 이상인 응답자에게 제시하는 조건부 모듈입니다. 전 학생 대상 결과와 분리해 해석합니다.</p>${advanced.map((d,i)=>domainMarkup(d,i,false)).join('')}
      </section>
      <section class="agn-block"><h2>예정 교육 프로그램</h2><p>문항별 요구 결과를 교육과정·비교과 프로그램 기획으로 연결하기 위한 초기 제안입니다. 실제 개설 우선순위와 수준은 조사 결과 및 학생·교원 의견을 반영해 결정합니다.</p>
        <div style="overflow-x:auto"><table class="agn-program-table"><thead><tr><th>프로그램</th><th>수준·시간</th><th>연계 문항</th><th>산출물·평가</th></tr></thead><tbody>${(data.programs||[]).map(p=>`<tr><td>${esc(p[1])}</td><td>${esc(p[3])} · ${esc(p[4])}</td><td>${esc(p[2])}</td><td>${esc(p[5])}<br><span class="agn-small">평가: ${esc(p[6])}</span></td></tr>`).join('')}</tbody></table></div>
      </section>
      <section class="agn-block"><h2>문항 개발의 근거</h2><p>학생 AI 리터러시·역량과 생성형 AI 활용 척도, 교육 프레임워크, Agent 설계·운영 가이드, 요구분석 및 척도개발 방법론을 검토했습니다. 기존 척도 문구를 그대로 옮기지 않고, 대학 과제 맥락에서 확인할 수 있는 행동 문항과 수행 근거로 새로 구성했습니다. 문헌 접근 범위와 문항별 연결은 내려받을 수 있는 근거 문서에 표시했습니다.</p><details class="agn-domain"><summary>검토 문헌 ${ (data.sources||[]).length }건 보기</summary><ol class="agn-sources-list">${(data.sources||[]).map(s=>`<li><a href="${href(s[3])}" target="_blank" rel="noopener noreferrer">${esc(s[1])}. ${esc(s[2])}</a> <span class="agn-small">${esc(s[4])} · 확인 범위: ${esc(s[5])}</span><br><span>${esc(s[6])}</span></li>`).join('')}</ol></details></section>
      <section class="agn-block"><h2>검토 자료 내려받기</h2><div class="agn-downloads">${docs.map(d=>`<a href="${fileBase}${encodeURIComponent(d[1]).replaceAll('%2F','/')}">${esc(d[0])} ↓</a>`).join('')}</div></section>`;
  }

  fetch(root.dataset.source).then(r => { if (!r.ok) throw new Error('자료를 불러오지 못했습니다.'); return r.json(); })
    .then(render)
    .catch(() => { root.innerHTML = '<p role="alert">문항 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>'; });
})();

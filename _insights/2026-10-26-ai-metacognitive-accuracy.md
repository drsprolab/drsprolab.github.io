---
layout: insight
published: false
title: "메타인지적 정확성과 독립적 수행능력의 상실: AI로 인한 멍청해지는 똑똑함"
date: 2026-10-26 17:30:00 +0900
summary: "AI와 함께 문제를 풀면 점수는 오르는데, 내가 얼마나 잘했는지는 더 모르게 됩니다. 메타인지적 정확성이 왜 학습의 조건인지, AI를 활용한 학습과 AI 튜터 설계에서 무엇을 고민해야 하는지 살펴봅니다."
description: "2026년 10월 26일 Weekly Insight. Fernandes 등(2026, Computers in Human Behavior)의 ‘AI makes you smarter but none the wiser’를 리뷰합니다. AI 사용과 수행 과대평가, 사라진 더닝-크루거 효과, 메타인지적 정확성이 학습에 중요한 이유, AI 튜터 설계 방향을 다룹니다."
source_count: 4
reading_minutes: 5
topics: [메타인지, 더닝-크루거 효과, AI 튜터, 자기조절학습]
---

<div class="daily-takeaway" markdown="1">
**핵심 요약**

AI와 함께 논리 문제를 푼 사람들은 혼자 푼 사람들보다 점수가 높았지만, 자기 점수를 약 4점 높게 짐작했습니다. 못하는 사람이 자신을 과대평가하는 더닝-크루거 효과는 사라졌는데, 저자들은 이것이 실력 차이가 줄어서라기보다 **모두가 비슷하게 자기 수행을 모르게 된** 결과일 수 있다고 봅니다. 무엇을 모르는지 알아야 그것을 연습합니다. AI가 수행을 높이는 대신 메타인지적 정확성을 떨어뜨린다면, AI 없이 해내는 능력도 자랄 기회를 잃을 수 있습니다.
</div>

<div class="daily-brief">
  <h3>AI는 똑똑하게 만들지만, 현명하게 만들지는 않는다</h3>
  <p class="daily-brief-cite">Fernandes, D., Villa, S., Nicholls, S., Haavisto, O., Buschek, D., Schmidt, A., Kosch, T., Shen, C., &amp; Welsch, R. (2026). AI makes you smarter but none the wiser: The disconnect between performance and metacognition. <em>Computers in Human Behavior, 175</em>, 108779.</p>
  <div class="daily-brief-body">
    <p>연구진은 미국 성인에게 법학적성시험(LSAT) 논리추론 문제 20개를 ChatGPT-4o와 함께 풀게 하고, 끝난 뒤 “몇 문제를 맞혔다고 생각하는가”를 물었습니다. 실제 점수와 예상 점수의 차이로 <strong>메타인지적 정확성(metacognitive accuracy)</strong>을 쟀고, 계산 모형으로 더닝-크루거 효과가 나타나는지 살핀 것이 연구의 뼈대입니다.</p>
    <p>연구 1(N = 246)은 AI를 쓰지 않은 기존 대규모 표본(3,543명)과 비교했고, 연구 2(N = 452)는 AI 집단과 비사용 집단을 직접 모집해 정확히 예측하면 보상을 주는 조건에서 결과를 재현했습니다. 다만 온라인 표본이 한 번 푼 논리 문제이며, AI를 쓴 뒤 AI 없이 다시 풀게 하거나 오랜 기간 학습을 추적한 연구는 아닙니다.</p>
  </div>
</div>

## 01 · 점수는 오르고, 자기 판단은 흐려졌다

| 구분 | 연구 1 (N = 246) | 연구 2 (N = 452) |
| --- | --- | --- |
| 실제 점수 (20점 만점) | AI 사용 12.98, 비사용 표본 9.45 | AI 집단 13.31, 비사용 집단 9.71 |
| 예상 점수 | 16.50, 약 4점 과대평가 | 두 집단 모두 과대평가 |
| 더닝-크루거 효과 | 비사용 표본에서는 나타나고 AI 사용자에서는 사라짐 | 같은 패턴 재현 |
| AI 리터러시 | AI 기술 이해가 높을수록 과대평가가 큼 | 같은 경향 |

AI는 점수를 끌어올렸습니다. 그런데 AI 혼자 푼 점수(평균 13.65)를 넘어선 참가자는 절반 남짓(연구 1 55.28%)뿐입니다. 참가자들이 직접 쓴 AI 사용 방식을 분류해 보니, 연구 1의 58.94%는 문제를 복사해 붙이고 AI의 답을 따져 보지 않은 채 받아들였습니다. 맞힌 문제와 틀린 문제에 대한 확신의 차이도 크지 않았습니다(평균 82.49 대 77.00). 틀린 답에도 꽤 높은 확신을 보였다는 뜻입니다.

**지금 알아둘 점 · 근거의 성격:** 과제는 법률 지식이 필요 없는 객관식 논리 문제였고, 참가자는 문제마다 AI에게 적어도 한 번 물어야 했습니다. 자연스러운 업무 상황과는 다릅니다. AI 리터러시는 자기보고로 쟀고, 저자들도 상관이 작아 조심스럽게 해석해야 한다고 밝힙니다. 저자들은 이 연구가 AI를 활용한 학습 상황에서 메타인지가 하는 역할에 대해서는 말해 주지 못한다고 명시합니다.

## 02 · 더닝-크루거 효과가 사라졌다는 것의 의미

Kruger와 Dunning(1999)은 실력이 낮은 사람일수록 자기 수행을 크게 과대평가한다는 것을 보였습니다. 틀린 답을 알아보는 능력이 바로 그 과제를 잘하는 능력이기 때문입니다. AI를 쓰자 이 패턴이 사라졌습니다. 반가운 소식처럼 들리지만, 저자들은 한계 절에서 다르게 해석할 여지를 남깁니다. AI가 참가자들을 **비슷하게 잘하지만 비슷하게 자기 수행을 모르는** 상태로 만들었을 수 있다는 것입니다. 수행은 AI에 기대고, 자기 판단은 수행과 따로 놀게 된 셈입니다. “AI는 똑똑하게 만들지만 현명하게 만들지는 않는다”는 논문 제목은 이 지점을 가리킵니다.

## 03 · 메타인지적 정확성은 왜 학습의 조건인가

배우는 사람은 끊임없이 스스로 판단합니다. 이건 알겠다, 이건 다시 봐야겠다, 이제 그만해도 되겠다. Bjork, Dunlosky와 Kornell(2013)은 이런 판단이 무엇을 더 공부할지, 언제 멈출지를 정하므로 자기조절학습의 성패를 가른다고 정리합니다. 판단이 틀리면 학습도 엇나갑니다. 술술 읽힌다는 느낌을 이해했다는 증거로 착각하면, 정작 모르는 부분은 연습하지 않고 넘어갑니다.

AI와 함께 낸 결과물은 대개 매끄럽습니다. 그 매끄러움이 “내가 잘했다”는 느낌으로 바뀌면, 무엇을 모르는지 보여 주는 신호가 꺼집니다. 모르는 줄 모르면 연습하지 않고, 연습하지 않으면 AI 없이 해내는 능력은 늘지 않습니다.

> **DrSong Opinion · 학습이론의 관점에서**
> 이 논문은 AI 없이 다시 풀게 하는 측정을 하지 않았습니다. 그래서 독립적 수행능력이 줄었다고 이 연구로 말할 수는 없습니다. 제가 보는 연결 고리는 메타인지입니다. 다른 연구에서 답을 쉽게 주는 AI로 연습한 고등학생들은 AI 없는 시험에서 AI를 쓰지 않은 학생보다 17% 낮은 점수를 받았습니다(Bastani et al., 2025). 이 논문은 그런 일이 왜 일어나는지 한 가지 경로를 보여 줍니다. AI가 수행을 대신하는 동안 자기 수행에 대한 판단이 흐려지고, 흐려진 판단은 연습이 필요한 곳을 가립니다. 제가 ‘멍청해지는 똑똑함’이라고 부르는 것은 이것입니다. **똑똑해 보이는 결과물이 실력을 키울 신호를 지웁니다.** 앞서 다룬 [AI 역설과 생성적 인지 멈춤(GCP)](/weekly-insight/2026-10-11-ai-paradox-hrd/)도 같은 문제의식에서 나왔습니다.

## 04 · AI 튜터는 어떻게 만들고 써야 하는가

저자들이 제안한 설계 원칙(신뢰도 보정, AI 불확실성 표시, 과제 후 성찰, 인지적 강제 장치)과 GPT Tutor 실험(Bastani et al., 2025)을 엮으면 AI 튜터의 방향은 이렇게 정리됩니다.

- **답보다 힌트:** 정답을 바로 주지 않고 다음 단계를 생각하게 하는 힌트를 줍니다. Bastani 등에서 이런 튜터는 학습 손실을 대부분 줄였습니다.
- **먼저 예측, 나중에 확인:** AI를 열기 전에 학습자가 자기 답과 확신 정도를 먼저 적게 합니다. AI의 답과 비교하는 순간이 메타인지 피드백이 됩니다.
- **예상과 실제의 차이를 보여 주기:** 과제가 끝나면 “몇 개 맞혔다고 생각하는가”를 묻고 실제 결과와의 차이를 보여 줍니다. 이 논문이 측정에 쓴 질문을 그대로 학습 도구로 돌리는 셈입니다.
- **AI의 불확실성 드러내기:** AI가 확신하지 못하는 답은 그렇다고 표시해, 매끄러운 문장이 곧 정답이라는 착각을 줄입니다.
- **AI 없이 해 보는 점검:** 일정 간격으로 도움 없이 풀어 보는 과제를 넣어, 수행과 학습의 차이를 학습자 스스로 보게 합니다.

> **DrSong Opinion · HRD의 관점에서**
> 조직에서 조심할 것은 두 가지입니다. 첫째, AI 리터러시 교육이 자기 점검을 대신해 주지 않습니다. 이 연구에서는 AI를 잘 안다고 답한 사람이 오히려 더 자신만만했습니다. 둘째, AI로 만든 결과물의 품질로 구성원의 역량을 판단하면, 조직도 참가자들과 같은 과대평가에 빠집니다. 교육과 평가에서 “얼마나 잘 해냈는가”와 함께 “얼마나 정확히 알고 있는가”를 따로 물어야 합니다.

---

### Insight Questions

1. 우리 구성원은 AI로 만든 결과물 중 **어디가 틀릴 수 있는지** 스스로 짚어 낼 수 있는가?
2. 우리 교육은 학습자가 **자기 수행을 예측하고 확인하는 순간**을 설계에 넣고 있는가?
3. 우리가 도입하려는 AI 튜터는 **답을 주는 도구**인가, **판단을 연습시키는 도구**인가?

### References

<div class="references" markdown="0">
<p>Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakcı, Ö., &amp; Mariman, R. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. <em>Proceedings of the National Academy of Sciences, 122</em>(26), e2422633122. https://doi.org/10.1073/pnas.2422633122</p>
<p>Bjork, R. A., Dunlosky, J., &amp; Kornell, N. (2013). Self-regulated learning: Beliefs, techniques, and illusions. <em>Annual Review of Psychology, 64</em>, 417–444. https://doi.org/10.1146/annurev-psych-113011-143823</p>
<p>Fernandes, D., Villa, S., Nicholls, S., Haavisto, O., Buschek, D., Schmidt, A., Kosch, T., Shen, C., &amp; Welsch, R. (2026). AI makes you smarter but none the wiser: The disconnect between performance and metacognition. <em>Computers in Human Behavior, 175</em>, 108779. https://doi.org/10.1016/j.chb.2025.108779</p>
<p>Kruger, J., &amp; Dunning, D. (1999). Unskilled and unaware of it: How difficulties in recognizing one’s own incompetence lead to inflated self-assessments. <em>Journal of Personality and Social Psychology, 77</em>(6), 1121–1134. https://doi.org/10.1037/0022-3514.77.6.1121</p>
</div>

---
layout: post
title: "AI 패러독스: 결과물은 좋아지는데 배움은 줄어든다"
category: 연구 노트
---

생성형 AI를 쓰면 일의 결과물은 좋아집니다. 그런데 최근 연구들은 같은 상황에서 사람의 학습과 숙련은 오히려 줄어들 수 있다고 보고합니다. 이렇게 "AI가 도울수록 사람의 역량이 약해지는" 현상을 **AI 패러독스**라고 부릅니다. 올해 나온 논문 세 편을 요약하고, 연구실에서 함께 토론해 볼 만한 비판적 질문 세 가지를 정리했습니다.

## 논문 요약

### 1. 실험: AI를 쓴 개발자가 더 빠르지도 않았고, 덜 배웠다

**Shen, J., & Tamkin, A. (2026).** *How AI assistance impacts the formation of coding skills.* Anthropic. [원문](https://www.anthropic.com/research/AI-assistance-coding-skills)

- **방법**: 전문 Python 개발자 52명에게 처음 써보는 라이브러리(Trio)로 과제를 하게 했습니다. 절반은 AI 챗 어시스턴트를, 나머지 절반은 웹 검색과 문서만 쓰게 한 무작위 통제 실험입니다.
- **결과**: AI를 쓴 집단은 과제를 유의하게 더 빨리 끝내지도 못했습니다. 그리고 직후에 본 개념 이해, 코드 읽기, 디버깅 평가에서 **17% 낮은 점수**를 받았습니다.
- **눈여겨볼 점**: AI 집단 안에서도 차이가 컸습니다. 코드만 받아 쓴 사람은 점수가 낮았고, AI에게 설명을 요청하거나 개념을 질문한 사람은 학습이 덜 손상되었습니다. AI를 썼느냐보다 **어떻게 썼느냐**가 중요했습니다.

### 2. 모형: AI가 좋아질수록 생산성이 떨어지는 조건

**Aouad, A., Lykouris, T., & Zhong, H. (2026).** *Human-AI productivity paradoxes: Modeling the interplay of skill, effort, and AI assistance.* arXiv:2605.11350. [원문](https://arxiv.org/abs/2605.11350)

MIT 연구진이 숙련, 노력, AI 지원의 관계를 수리 모형으로 분석했습니다.

- **숙련 경로**: 숙련은 노력을 들여야 쌓입니다. AI 지원이 늘면 사람은 노력을 줄이고, 그만큼 숙련이 덜 쌓입니다. 숙련 감소의 영향이 AI가 주는 이득보다 크면, **AI 지원이 늘수록 장기 생산성이 떨어집니다.**
- **신뢰도 경로**: AI가 어설플 때는 사람이 꼼꼼히 검토합니다. AI가 "꽤 괜찮아지면" 사람은 검토를 줄입니다. 그래서 AI 성능이 오르는 초기 구간에서는 오히려 성과가 떨어질 수 있습니다. 저자들은 이것을 **노력 잠식(effort cannibalization)**이라고 부릅니다.
- **양극화**: AI 결과물의 오류를 알아보는 능력, 즉 AI 리터러시가 높은 사람은 AI로 더 성장하고 낮은 사람은 더 뒤처집니다. 시간이 지나면 숙련 분포가 **양극화**됩니다. 일종의 마태 효과입니다.

### 3. 이론: 결과물과 학습 과정이 분리된다

**Lin, J., & Al-Hada, N. M. (2026).** The critical-thinking paradox in generative AI-integrated learning: Distinguishing efficiency from cognitive depth. *Frontiers in Psychology, 17.* [원문](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1906070/full)

실증 연구가 아니라, 검증 가능한 가설을 제안한 이론 논문입니다.

- **핵심 개념**: 결과물의 질은 올라가는데 학습의 깊이는 따라오지 않는 현상을 **산출물–과정 분리(product–process dissociation)**라고 부릅니다. 과제 점수는 높아도, 나중에 AI 없이 비슷한 문제를 풀게 하면 더 못할 수 있다는 것입니다.
- **3수준 틀**: AI를 어디에 쓰느냐에 따라 효과가 달라진다고 봅니다.
  - 검색, 서식, 번역 같은 **표면 작업**을 맡기면 효율만 오르고 학습 손실은 적습니다.
  - **중간 수준**에서는 자기설명 같은 메타인지 장치가 있을 때만 AI가 도움이 됩니다.
  - 분석과 평가 같은 **심층 작업**까지 맡기면 과제는 좋아지지만 전이 학습은 떨어진다고 예측합니다.
- **인지 부채(cognitive debt) 가설**: 처음에는 필요할 때만 AI에 기대다가 점차 습관적으로 기대게 되고, 이것이 쌓이면 AI를 치운 뒤에도 사고력이 회복되지 않는다는 가설입니다.

## 함께 생각해 볼 비판적 질문 3가지

### Q1. 산출물이 좋아졌는데 배움이 줄었다면, 우리의 평가는 지금 무엇을 재고 있는가?

세 논문 모두 **결과물의 질과 사람의 역량이 따로 움직일 수 있다**고 말합니다. 그런데 학교의 과제 채점, 기업의 성과평가와 교육 효과성 평가는 대부분 결과물을 봅니다. 그렇다면 AI 시대의 평가는 결과물의 질 대신 무엇을 측정해야 할까요? AI를 뺀 상태의 수행, 지연된 전이 과제, AI와 나눈 대화 기록 같은 과정 지표가 후보가 될 수 있습니다. 반대로, 사람이 AI와 함께 일하는 것이 이미 기본값이라면 "AI 없이 할 수 있는가"를 묻는 것 자체가 시대착오일 수도 있습니다. 둘 중 어느 관점이 더 설득력 있을까요?

### Q2. AI 리터러시 교육은 격차를 줄이는가, 오히려 키우는가?

Aouad 등의 모형에서 AI의 혜택은 AI 리터러시가 높은 사람에게 몰립니다. Shen과 Tamkin의 실험에서도 질문하고 설명을 요구한 사람만 학습을 지켜냈습니다. 문제는 이렇게 "AI를 잘 쓰는 능력"이 이미 기초 지식과 메타인지가 탄탄한 사람에게서 더 잘 길러진다는 점입니다. 그렇다면 조직이 일괄적으로 제공하는 AI 교육은 출발선이 다른 구성원들 사이의 격차를 오히려 벌리지 않을까요? 격차를 줄이려면 AI 사용법보다 무엇을 먼저 가르쳐야 할까요?

### Q3. 개인은 덜 배우는데 조직은 더 잘 일한다면, 그것은 조직학습인가?

분산인지 관점에서 보면 지식은 사람뿐 아니라 도구와 시스템에도 저장됩니다. AI가 업무 지식을 담고 있고 신입도 AI 덕분에 같은 수준으로 일한다면, Crossan의 4I 모형이 말하는 **제도화(Institutionalizing)**가 이루어진 것처럼 보입니다. 하지만 4I의 출발점인 **직관(Intuiting)**, 즉 경험 속에서 새로운 패턴을 알아차리는 일은 여전히 사람의 몫입니다. 구성원들이 AI에 기대 숙련을 쌓지 못하면, 기존 방식을 의심하고 바꾸는 이중순환학습(Double-loop)은 누가 하게 될까요? AI는 조직의 기억을 강화하는 걸까요, 조직이 새로 배우는 능력을 갉아먹는 걸까요?

---

**참고문헌**

- Aouad, A., Lykouris, T., & Zhong, H. (2026). Human-AI productivity paradoxes: Modeling the interplay of skill, effort, and AI assistance. *arXiv preprint arXiv:2605.11350*.
- Lin, J., & Al-Hada, N. M. (2026). The critical-thinking paradox in generative AI-integrated learning: Distinguishing efficiency from cognitive depth—a differentiated framework and testable propositions. *Frontiers in Psychology, 17*. https://doi.org/10.3389/fpsyg.2026.1906070
- Shen, J., & Tamkin, A. (2026). *How AI assistance impacts the formation of coding skills*. Anthropic.

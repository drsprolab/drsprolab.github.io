# 1차 소크라테스식 피드백 설계 근거

검토 기준일: 2026-10-31

## 검토 범위와 한계

AI·LLM 기반 교육에서 소크라테스식 질문, 대화형 튜터, 질문형 글쓰기 피드백을 다룬 실증 연구와 지능형 튜터링의 선행 연구를 중심으로 검색했다. 출판사·학술 데이터베이스의 원문 또는 초록, 학술대회 원문, 공개 연구 저장소를 확인했다. 논문작성 피드백에 바로 적용할 수 있는 질문 설계와 학습 결과를 중심으로 아래 문헌을 추렸다.

이는 검색식과 선정 절차를 사전 등록하고 여러 데이터베이스를 중복 제거해 전수 집계한 PRISMA 체계적 문헌고찰은 아니다. 인덱스되지 않은 연구, 다른 언어의 문헌, 2026년 하반기 신규 출판물은 누락될 수 있다. 또한 AI 소크라테스 피드백을 직접 비교한 실증 연구 자체가 아직 적고, 대부분 중·고등 수학이나 특정 전공 수업에 관한 연구여서 HRD 연구계획서 지도에 그대로 일반화할 수 없다.

## 설계에 적용한 근거

1. **질문은 학습자의 실제 생각을 발판으로 삼아야 한다.** AutoTutor는 정해 둔 정답을 바로 말하기보다 학습자 응답을 살피고 추가 설명 요청, 힌트, 구체적인 프롬프트, 필요한 설명 순으로 개입을 조절한다. 응답에 따라 다음 질문과 도움 수준을 바꾸는 것이 핵심이다. 같은 review는 질문과 힌트를 과도하게 반복하면 학습자가 답답해할 수 있다고 보고한다. 따라서 이 기능은 원고의 짧은 근거를 먼저 짚고, 항목당 세 개의 짧고 서로 다른 질문으로 제한한다.

2. **소크라테스식 질문은 질문의 기능이 분명해야 한다.** Paul–Elder 계열 질문법과 교육 연구는 개념을 분명히 하는 질문, 근거와 이유를 검토하는 질문, 전제나 다른 관점을 살피는 질문, 함의와 질문 자체를 돌아보는 질문을 구분한다. 이 도구에서는 이를 한 번의 피드백에서 사용할 수 있도록 `의도 확인 → 근거·가정 탐색 → 정렬·수정 결정`의 세 단계로 묶었다. 각 질문은 서로 다른 한 가지 사고를 이끌어야 하며, 답을 미리 암시하거나 작성문을 대신 만들어 주지 않는다.

3. **질문을 넣었다는 사실만으로 학습 효과를 보장할 수 없다.** Blasco와 Charisi의 122명 무작위 연구에서 소크라테스식 AI는 상호작용과 참여를 늘렸지만 측정한 학습 성취 차이는 유의하지 않았고, AI 도움 없이 새 문제에 적용하는 데 어려움이 관찰되었다. 반면 Xi 등은 교육공학 연구방법 과목의 대학생 94명에게 소크라테스 에이전트를 사용해 비소크라테스 에이전트보다 성취와 성찰 지표가 높았다고 보고했다. 결과 차이는 연구 맥락과 설계에 따라 달라진다.

4. **연구계획 지도에 가장 가까운 근거는 단계형 검증이다.** Mikaelyan 등(2026)은 학부 생태학 수업의 연구질문 개발에 AI 탐색과 문헌 확인, 지식 공백 점검, 수정, 교원 피드백을 번갈아 배치한 8단계 흐름을 적용했다. 45명의 소규모 단일 수업 연구로 학습 성취를 직접 측정하지는 않았지만, 학생들은 AI를 생각을 좁히고 다듬는 동료로 인식했고, 근거 확인과 수정을 포함한 전체 흐름을 유용하다고 평가했다. 따라서 이 기능에서는 1차 질문을 최종 판단이나 인용 근거로 쓰지 않고, 학생의 직접 수정과 2차 문헌 검토로 연결한다.

5. **작성 분야와 과제에 맞는 질문 및 실제 수정 단계가 중요하다.** Wang의 2026년 준실험에서는 74명의 EFL 대학생이 다회차 질문형 피드백을 사용했을 때 근거 사용과 반론 통합은 비교 집단보다 향상했지만, 주장 명료도 차이는 확인되지 않았다. Sun 등의 프로그래밍 수업 연구에서는 구조화된 질문을 받은 학습자가 직접 답을 제공받은 집단보다 반복적이고 성찰적인 디버깅을 더 보였다. Kholis 등은 95명의 공학도에게 소크라테스형 프로그래밍 튜터를 사용해 학습 성과와 메타인지가 높아졌지만, 인지 부하도 더 컸다고 보고했다. 이 결과를 바탕으로 각 연구계획 항목의 판단 기준을 다르게 두고, 질문을 받은 뒤 원고를 직접 수정하는 다음 단계와 연결한다.

6. **학습자의 혼란을 모르는 상태에서 고정 질문을 기계적으로 던지면 안 된다.** Liu 등의 GuideEval 연구는 LLM 튜터가 학생의 혼란을 알아차리고 안내 전략을 조정하는 데 자주 실패한다고 보고했다. 현재 1차 저장은 한 번의 원고 입력으로 끝나므로 학습자의 답변을 받은 적응형 대화라고 가장하지 않는다. 대신 실제 원고에서 확인된 내용을 근거로 질문하고, 다음 차수에는 수정 원고를 별도로 검토한다. 이는 완전한 대화형 지도를 구현했다는 주장이 아니다.

7. **정답을 대신 주는 도움은 독립 수행을 해칠 수 있다.** Bastani 등은 고등학교 수학 현장 실험에서 제약 없는 GPT 사용은 AI를 회수한 뒤 독립 수행을 낮췄지만, 학습을 보호하도록 설계한 튜터형 프롬프트는 부정적 효과를 대부분 완화했다고 보고했다. 따라서 1차 피드백은 대체 문장이나 결론을 제시하지 않고 작성자가 자신의 주장과 근거를 다시 구성하도록 돕는다.

## 구현된 질문 흐름

각 항목에 대해 아래 결과를 반환한다.

- **원고에서 확인한 문구 (`anchor`)**: 해당 항목의 짧은 구절을 그대로 반환한다. 백엔드는 그 구절이 실제 작성문에 포함되는지 확인해 표시하므로, 없는 문장을 인용하지 않는다. 그림만 첨부된 경우에는 텍스트 인용을 요구하지 않는다.
- **생각해 볼 지점 (`focus`)**: 인용한 문구에서 확인되는 생각과 아직 불분명한 연결을 중립적으로 설명한다. 원고에서 인용 문자열을 검증하지 못하면 구체적 판단을 보류한다.
- **의도 확인**: 작성자가 핵심 개념·주장·질문을 자기 말로 밝히게 한다.
- **근거·가정 탐색**: 해당 항목에 가장 중요한 근거, 전제, 대안 설명, 측정 또는 방법 적합성 중 하나를 살피게 한다.
- **정렬·수정 결정**: 앞뒤 연구 항목과의 연결을 생각하고, 논리를 드러내기 위해 무엇을 직접 고칠지 결정하게 한다.

기준은 제목, 문제의식, 목적, 모형, 연구문제, 이론적 근거, 방법, 기대시사점별로 나눠 적용한다. 모든 항목에 같은 질문 문장을 반복하지 않으며, 이론·자료·설계만으로 확정할 수 없는 내용을 사실처럼 판단하지 않는다.

## 주요 문헌

- Graesser, A. C., et al. (2004). [AutoTutor: A tutor with dialogue in natural language](https://doi.org/10.3758/BF03195563). *Behavior Research Methods, Instruments, & Computers, 36*, 180–192. 대화형 튜터의 응답 유도, 힌트, 교정, 설명과 요약 기능을 설명한다.
- Graesser, A. C., et al. (2014). [AutoTutor and Family: A Review of 17 Years of Natural Language Tutoring](https://doi.org/10.1007/s40593-014-0029-5). *International Journal of Artificial Intelligence in Education, 24*, 427–469. 학생 응답에 따른 발판 조정과 반복 질문의 피로 가능성을 검토한다.
- Liu, Y., et al. (2025). [Discerning minds or generic tutors? Evaluating instructional guidance capabilities in Socratic LLMs](https://arxiv.org/abs/2508.06583). GuideEval 연구 논문(preprint). 학습 상태 파악, 안내 전략 선택, 성찰 유도의 세 행동을 평가하고 LLM의 적응 실패를 보고한다.
- Blasco, A., & Charisi, V. (2024). [The Impact of Large Language Models on Students: A Randomised Study of Socratic vs. Non-Socratic AI and the Role of Step-by-Step Reasoning](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5040921). SSRN working paper. 고등학생 122명의 연구로, 소크라테스형 사용에서 참여는 증가했지만 학습 성취 효과는 유의하지 않았다고 보고한다.
- Bastani, H., et al. (2025). [Generative AI without guardrails can harm learning: Evidence from high school mathematics](https://doi.org/10.1073/pnas.2422633122). *Proceedings of the National Academy of Sciences, 122*. 대규모 현장 실험에서 AI 접근과 독립 수행 결과가 다를 수 있으며, 학습을 보호하는 설계가 중요함을 보인다.
- Xi, L., Zhang, Y., & Wang, Q. (2026). [Investigating the effects of an LLM-based Socratic conversational agent on students’ academic performance and reflective thinking in higher education](https://doi.org/10.1016/j.compedu.2025.105494). *Computers & Education, 241*, 105494. 교육공학 연구방법 수강생 94명을 대상으로 소크라테스 에이전트와 비소크라테스 에이전트를 비교했다.
- Sun, D., Zheng, Y., Xu, J., & Yang, Z. (2026). [When Generative AI Meets Socratic Method: Investigating Programming Learning Dynamics Through Behaviours, Interaction Qualities and Perceptions](https://doi.org/10.1002/jcal.70210). *Journal of Computer Assisted Learning, 42*(2), e70210. 대학생 80명의 프로그래밍 상호작용을 비교한 준실험이다.
- Wang, L.-J. (2026). [Question-only AI Socratic dialogue as dialogic feedback in L2 argumentative writing: A quasi-experimental study](https://doi.org/10.1016/j.jslw.2026.101331). *Journal of Second Language Writing, 73*, 101331. 대학생 74명의 다회차 질문형 글쓰기 피드백을 비교했다.
- Mikaelyan, A. M., McKenney, E. A., Mathieson, O. L., & Toprani, D. (2026). [The Socratic Challenger: A structured GenAI-assisted workflow for undergraduate research inquiry](https://doi.org/10.3389/feduc.2026.1913451). *Frontiers in Education*. 학부 생태학 수업 45명에게 문헌 확인과 교원 피드백을 포함한 8단계 연구질문 개발 흐름을 적용했다. 자체 보고된 유용성을 살핀 단일 수업 연구라 학습 성취의 인과 효과를 입증하지는 않는다.
- Kholis, N., Al Hakim, V. G., Heung, Y. M. E., Gumelar, A. S., & Mubarok, H. (2026). [AI chatbot as Socratic Butler: Effects on metacognitive awareness, cognitive load, and learning performance in introductory programming for engineering education](https://doi.org/10.1080/03043797.2026.2677543). *European Journal of Engineering Education*. 공학도 95명의 준실험에서 학습·메타인지 성과와 함께 인지 부하도 높았다고 보고했다.
- Sun, D., et al. (2026). [The Effects of Agent Type and Feedback Style on Self-Directed Learning: A Mixed-Methods Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC13404235/). 51명의 대학원생 과제에서 소크라테스형 피드백은 이해 점검과 관련됐고, 에이전트의 분야별 구체성이 중요했다.
- Kholis, N., Al Hakim, V. G., Heung, Y. M. E., Gumelar, A. S., & Mubarok, H. (2026). [AI chatbot as Socratic Butler: Effects on metacognitive awareness, cognitive load, and learning performance in introductory programming for engineering education](https://doi.org/10.1080/03043797.2026.2677543). *European Journal of Engineering Education*. 공학도 95명의 준실험에서 학습·메타인지 성과와 함께 인지 부하도 높았다고 보고했다.
- Kaven, A. (2019). [How Do Technology-Enhanced Learning Tools Support Critical Thinking?](https://doi.org/10.3389/feduc.2019.00126). *Frontiers in Education, 4*, 126. 교육 기술과 비판적 사고에 관한 문헌고찰로, 명료화·가정·근거·관점·함의·질문 자체를 살피는 Paul–Elder 계열 질문 분류를 정리했다.
- Paul–Elder 질문 분류의 교육 적용 사례로 [How Do Technology-Enhanced Learning Tools Support Critical Thinking?](https://doi.org/10.3389/feduc.2019.00126)을 참고했다. 이론적 분류를 그대로 나열하기보다 본 도구의 연구계획 항목에 맞는 세 단계로 줄여 사용했다.

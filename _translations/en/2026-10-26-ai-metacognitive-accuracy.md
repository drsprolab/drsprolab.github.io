---
title: "Metacognitive Accuracy and the Loss of Independent Performance: When AI Makes You Smarter but Not Wiser"
summary: "Working with AI raises scores, yet people become less sure how well they actually did. We examine why metacognitive accuracy is a condition for learning and what to consider when designing AI-supported learning and AI tutors."
description: "A review of Fernandes et al. (2026, Computers in Human Behavior), 'AI makes you smarter but none the wiser.' We discuss overestimated performance among AI users, the disappearing Dunning-Kruger effect, why metacognitive accuracy matters for learning, and design directions for AI tutors."
topics: [Metacognition, Dunning-Kruger Effect, AI Tutors, Socratic Questioning]
---

<div class="daily-takeaway" markdown="1">
**Key Takeaway**

People who solved logic problems with AI scored higher than people who worked alone, yet they overestimated their own scores by about four points. The Dunning-Kruger effect, in which weaker performers overrate themselves, disappeared. The authors suggest this may reflect not a narrower skill gap but the fact that **everyone became similarly unaware of their own performance**. We practice what we know we do not know. If AI raises performance while lowering metacognitive accuracy, people may lose the chance to build the ability to perform without AI.
</div>

<div class="daily-brief" markdown="1">
### AI Makes You Smarter, but Not Wiser

Fernandes, D., Villa, S., Nicholls, S., Haavisto, O., Buschek, D., Schmidt, A., Kosch, T., Shen, C., & Welsch, R. (2026). AI makes you smarter but none the wiser: The disconnect between performance and metacognition. *Computers in Human Behavior, 175*, 108779.

The researchers asked US adults to solve 20 Law School Admission Test (LSAT) logical reasoning problems with ChatGPT-4o, then asked how many they thought they had answered correctly. They measured **metacognitive accuracy** as the gap between actual and predicted scores, and used a computational model to examine whether a Dunning-Kruger effect appeared.

Study 1 (N = 246) compared AI users with an existing large sample (3,543 people) that had not used AI. Study 2 (N = 452) recruited AI and non-AI groups directly and replicated the results when accurate predictions earned a reward. The tasks were online logic problems solved once, however. The studies did not have participants solve problems again without AI after using it, nor did they follow learning over a long period.
</div>

## 01 · Scores Went Up, Self-Judgment Blurred

| | Study 1 (N = 246) | Study 2 (N = 452) |
| --- | --- | --- |
| Actual score (out of 20) | AI users 12.98; non-AI sample 9.45 | AI group 13.31; non-AI group 9.71 |
| Predicted score | 16.50, an overestimate of about 4 points | Both groups overestimated |
| Dunning-Kruger effect | Present in the non-AI sample; absent among AI users | Same pattern replicated |
| AI literacy | Higher understanding of AI skills, greater overestimation | Same tendency |

AI raised scores. Yet only about half of participants (55.28% in Study 1) outperformed AI working alone (mean 13.65). When the authors classified how participants described their own AI use, 58.94% in Study 1 pasted in the question and accepted AI's answer without examining it. Confidence barely differed between questions answered correctly and incorrectly (means of 82.49 and 77.00), meaning people were fairly confident even in wrong answers.

**What to keep in mind · Nature of the evidence:** The task was a multiple-choice logic test requiring no legal knowledge, and participants had to ask the AI at least once per question. That differs from natural work settings. AI literacy was self-reported, and the authors note that the correlations were small and should be interpreted cautiously. They also state explicitly that this study cannot tell us what metacognition does in AI-supported learning.

## 02 · What It Means That the Dunning-Kruger Effect Disappeared

Kruger and Dunning (1999) showed that people with lower skill overestimate their performance by a large margin, because the ability to recognize a wrong answer is the same ability that makes one good at the task. With AI, this pattern vanished. That sounds like good news, but in their limitations section the authors leave room for another reading: AI may have made participants **similarly capable but similarly unaware of their own performance**. Performance leaned on AI while self-judgment drifted away from performance. This is the point the paper's title refers to: AI makes you smarter, but not wiser.

## 03 · Why Metacognitive Accuracy Is a Condition for Learning

Learners judge themselves constantly. I understand this; I need to review that; I can stop now. Bjork, Dunlosky, and Kornell (2013) summarize that such judgments decide what to study next and when to stop, so they shape the success of self-regulated learning. When judgments are wrong, learning goes astray. If the feeling that something reads smoothly is mistaken for evidence of understanding, learners skip practice on exactly what they do not know.

Work produced with AI is usually polished. When that polish turns into a feeling that "I did well," the signal showing what one does not know switches off. If people do not know what they do not know, they do not practice, and without practice the ability to perform without AI does not grow.

> **DrSong's View · From a Learning-Theory Perspective**
>
> This paper did not measure performance when participants redid the task without AI, so it cannot show that independent performance declined. The link I see is metacognition. In other research, high school students who practiced with an AI that gave answers easily scored 17% lower on an exam without AI than students who had not used AI (Bastani et al., 2025). This paper shows one pathway by which that could happen. While AI performs for us, our judgment of our own performance blurs, and blurred judgment hides where practice is needed. This is what I call "getting dumber while looking smarter." **A polished output erases the signal that would build skill.** The earlier piece on [the AI paradox and generative cognitive pause (GCP)](/weekly-insight/2026-10-11-ai-paradox-hrd/) grew from the same concern.

## 04 · How Should AI Tutors Be Built and Used?

Combining the design principles the authors propose (confidence calibration, displaying AI uncertainty, post-task reflection, and cognitive forcing functions) with the GPT Tutor experiment (Bastani et al., 2025), the direction for AI tutors can be summarized as follows.

- **Hints over answers:** Give hints that prompt the next step instead of handing over the answer. In Bastani et al., a tutor of this kind largely removed the learning loss.
- **Predict first, check later:** Before opening the AI, have learners write their own answer and confidence level. The moment they compare it with the AI's answer becomes metacognitive feedback.
- **Show the gap between expected and actual performance:** After a task, ask "How many do you think you got right?" and show the difference from the actual result. This turns the very question the paper used for measurement into a learning tool.
- **Reveal the AI's uncertainty:** Flag answers the AI is not sure about, so that a smooth sentence is less likely to be taken for a correct one.
- **Check without AI:** Insert tasks solved without help at regular intervals, so learners can see for themselves the difference between performance and learning.

Socratic questioning asks learners to examine their reasons through questions instead of being told the answer. Scaffolding supports only the parts a learner cannot yet do alone and withdraws that support gradually (Wood et al., 1976). Layering the two in one AI tutor lets the designs above run as a single flow: the AI asks first, the learner receives only as much hint as the sticking point requires, and the hints fade over time. The strengths one can expect from this design are listed below. Items 1 and 3 are my interpretation, linking this paper with earlier research.

1. **The metacognitive signal stays alive.** Because learners must answer a question first, they reveal what they know and do not know. This blocks, at the first step, the problem of a smooth answer arriving at once and blurring self-judgment.
2. **The thinking stays with the learner.** Chi et al. (2001) prevented human tutors from giving explanations and feedback and had them guide through prompts instead, yet students learned just as effectively. The interpretation is that learning related more to what students constructed themselves than to how much tutors said.
3. **Help is sized to the learner.** If hints are layered in steps (a question, a cue, an example) and the tutor moves down only as far as the learner is stuck, the parts the learner can do stay with the learner and only the missing parts are supported. A flow that fades the hints leads directly into "checks without AI."
4. **There is a case of effects in evidence-based writing.** Wang (2026) reports that, in English argumentative writing by 74 university students, the group that used question-only AI dialogue across several sessions improved in evidence use and counterargument integration compared with the comparison group. No difference was found in claim clarity.
5. **There is a case where a research-based AI tutor was more efficient than class.** Kestin et al. (2025) report that, in a Harvard physics course, students studying with an AI tutor designed from research learned more in less time than they did in in-class active learning.

**What to keep in mind · Nature of the evidence:** These studies differ in tasks, learners, and measures. None of the literature discussed here directly tests whether an AI tutor combining Socratic questioning and scaffolding raises metacognitive accuracy. Wang (2026) found that the effect of question-based feedback varied by measure, and Kestin et al. (2025) is a study of one course at one school. That learners can give up if questions simply keep coming, and that a rule for stepping down to a hint is needed when they are stuck for long, is also only my design proposal and not a verified result.

> **DrSong's View · From an HRD Perspective**
>
> Organizations should watch for two things. First, AI literacy training does not substitute for self-checking. In this study, people who said they understood AI well were actually more confident. Second, if an organization judges employees' competence by the quality of AI-assisted outputs, it falls into the same overestimation as the participants. In education and evaluation, we need to ask separately both "How well did you do?" and "How accurately do you know?"

---

### Insight Questions

1. Can our employees point out **where an AI-produced output may be wrong**?
2. Does our training design include **moments where learners predict and then check their own performance**?
3. Is the AI tutor we plan to adopt **a tool that gives answers** or **a tool that lets people practice judgment**?

### References

{% include english-references.html original="2026-10-26-ai-metacognitive-accuracy" %}

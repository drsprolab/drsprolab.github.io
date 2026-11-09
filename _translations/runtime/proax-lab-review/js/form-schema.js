/* PRO-AX Lab Review — 작성 항목 정의
 * 제출 폼(submit.html)과 본문 보기(review.html)가 이 정의를 함께 사용합니다.
 * 필드 name 은 reviews 테이블의 컬럼명과 정확히 일치해야 합니다.
 */
(function () {
  'use strict';

  var F = function (num, name, label, prompt, rows, placeholder) {
    return {
      num: num,
      name: name,
      label: label,
      prompt: prompt,
      rows: rows || 5,
      placeholder: placeholder || ''
    };
  };

  window.REVIEW_ITEMS = [
    F('1', 'r1_reason', "Why I chose this paper",
      "Why did you choose this paper for this week's review?",
      4, "Explain its relevance to your research, its timeliness, or its theoretical or methodological importance."),
    F('2', 'r2_problem', "Research problem and purpose",
      "What problem do the authors address, and how does it lead to their purpose and research questions?",
      5, "Trace the connection from problem to purpose to research questions, and assess whether the purpose is justified."),
    F('3', 'r3_theory', "Assessing the theoretical foundation",
      "Are the theories and concepts appropriate for explaining the research problem?",
      5, "Check the definitions and foundational work behind the theory. Consider whether they adequately explain the research problem."),
    F('4', 'r4_method', "Methods and statistical reasoning",
      "Which methods and analyses were used, and how should the reported statistics be interpreted?",
      6, "Describe the sampling, measures, procedures, and analysis. Explain what the coefficients, fit statistics, and p-values mean, including the conditions under which they can be interpreted."),
    F('5', 'r5_message', "The paper's central argument",
      "What is the authors' central argument, in one sentence?",
      4, "Summarize the main claim of the conclusion in one or two sentences."),
    F('6', 'r6_critique', "My critical assessment",
      "Where do you agree, and what remains open to question?",
      6, "Support your assessment with evidence from the argument, theory, methods, and interpretation. Identify any unwarranted leaps in reasoning."),
    F('7', 'r7_application', "Applying this paper to my research",
      "Which concepts, methods, or arguments could you use, and what would need to change?",
      5, "Distinguish what transfers to your research context from what needs adaptation."),
    F('8', 'r8_learning', "What I learned and how I see it",
      "What did you learn from this review, and what do you think about it?",
      5, "Reflect on what you learned about concepts, methods, or writing, why it was new to you, and what you will read next.")
  ];

  // 0. 논문의 핵심 키워드 — 짧은 입력칸 3개
  window.REVIEW_KEYWORDS = {
    num: '0',
    label: "Key concepts in the paper",
    prompt: "Which three keywords best represent this paper?",
    names: ['keyword1', 'keyword2', 'keyword3']
  };

  // 9. 추가 도식 (옵션) — 그림 파일 1개, 드래그 앤 드롭. 구글 드라이브에 올리고 참조만 저장
  window.REVIEW_EXTRA = {
    num: '9',
    label: "Additional diagram",
    prompt: "Optionally, upload an image or diagram that helps explain your review.",
    fields: { ref: 'r9_diagram_ref', name: 'r9_diagram_name', type: 'r9_diagram_type', size: 'r9_diagram_size' }
  };

  // 제출 폼·본문 보기 공통 섹션 (한 덩어리)
  window.REVIEW_SECTIONS = [
    {
      id: 'body',
      num: '',
      title: 'Critical Review',
      subtitle: "Eight prompts, from choosing the paper to reflecting on what you learned",
      fields: window.REVIEW_ITEMS
    }
  ];

  // 모든 rich_text 필드 이름
  window.REVIEW_FIELD_NAMES = window.REVIEW_ITEMS.map(function (f) { return f.name; });

  // 이름 → 정의 조회
  window.REVIEW_FIELD_MAP = (function () {
    var map = {};
    window.REVIEW_ITEMS.forEach(function (f) { map[f.name] = f; });
    return map;
  })();

  window.REVIEW_TOTAL_FIELDS = window.REVIEW_FIELD_NAMES.length;
})();

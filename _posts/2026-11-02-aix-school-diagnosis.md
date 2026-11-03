---
layout: post
title: "우리학교 AIX 전환 준비·성숙도 진단"
category: 측정도구
wide: true
measurement_order: 10
measurement_badge: AIX 준비도 진단
measurement_target: 학교 교원 (교사·부장교사·교감·교장)
measurement_factors: 5단계 준비도 · 전반 인식 · 32문항
measurement_summary: 우리 학교는 AI를 전제로 가르치고 배우는 학교로 바뀔 준비가 얼마나 되어 있을까요? 기반 마련에서 AI 내재화까지 다섯 단계로 학교 AIX 준비 성숙도를 진단합니다.
measurement_use: 학교 AIX 준비 수준 진단 및 발전 전략 지원
# /blog/ 목록 카드에 "설문 문항과 구조 설명" 다운로드 버튼을 보여 주는 데도 쓰인다(blog/index.html).
structure_pdf_report: /assets/files/aix-school-structure-report.pdf
structure_pdf_report_name: 우리학교AIX전환준비성숙도진단_문항과구조_보고용.pdf
structure_pdf: /assets/files/aix-school-structure.pdf
structure_pdf_name: 우리학교AIX전환준비성숙도진단_문항과구조_실무자용.pdf
# 응답 저장소: Google Apps Script 웹앱 URL (tools/aix-school-measure/README.md). 비워 두면 시험 모드로, 응답이 이 브라우저에만 저장된다.
endpoint: "https://script.google.com/macros/s/AKfycbzFBQTVCz2H2jlaWRaWe9_jj8MjAptDxG3yUqvA0sCNy9wYPcNDEkdYKOS0y85BQ7DI/exec"
---

<p class="report-source"><span class="chip">정식 진단도구</span> 출처: 한양대학교 교육공학과 송지훈 교수 PRO-AnalytiX (PRO-AX) Lab</p>

<div class="report-intro">
  <h2>진단도구 소개</h2>
  <p>학교가 AI를 전제로 가르치고 배우는 학교로 바뀌려면, 기반이 마련되고, 교원이 AI를 활용할 준비가 되고, 동료 교원들과 함께 실천하고, 학교 전체로 확산되고, 끝으로 AI가 교육과 학교 생활에 자연스럽게 녹아드는 다섯 단계를 거칩니다.</p>
  <p><strong>활용:</strong> 학교 AIX 준비 수준 진단 및 발전 전략 지원</p>
  <div class="inst-docs">
    <a class="inst-doc" href="{{ '/assets/files/aix-school-structure-report.pdf' | relative_url }}" download="우리학교AIX전환준비성숙도진단_문항과구조_보고용.pdf">설문 문항과 구조 설명 (보고용)</a>
    <a class="inst-doc" href="{{ '/assets/files/aix-school-structure.pdf' | relative_url }}" download="우리학교AIX전환준비성숙도진단_문항과구조_실무자용.pdf">설문 문항과 구조 설명 (실무자용)</a>
  </div>
</div>

<div class="aidx axr" id="axr" data-endpoint="{{ page.endpoint }}" aria-live="polite">
  <noscript><p>이 진단은 JavaScript를 켜야 응답할 수 있습니다.</p></noscript>
</div>
<div class="viz-tip" id="axr-tip" role="tooltip" hidden></div>

<script src="{{ '/assets/js/diagnosis-pdf.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
<script src="{{ '/assets/js/aix-school-measure.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

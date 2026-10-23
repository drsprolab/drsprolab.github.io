# 진단 설명서 PDF (문항과 구조)

In progress의 **모든 진단 카드**에는 제목 밑에 내려받기 버튼 두 개가 있다. 새 진단을 올릴 때도 똑같이 단다.

| 버튼 | 파일 | 형식 |
| --- | --- | --- |
| 설문 문항과 구조 설명 (보고용) | `assets/files/<slug>-structure-report.pdf` | 남색·금색 보고서: 표지, 한눈에 보기, 01~06장 |
| 설문 문항과 구조 설명 (실무자용) | `assets/files/<slug>-structure.pdf` | 의견서 형식: 개조식 Ⅰ~Ⅵ장, 회색 머리행 표 |

두 판 모두 마지막 장에 **결과 예시**(가상 수치로 그린 방사형·막대·차이·사분면 그래프, 판정·해석·행동 제안 예시)를 넣는다.

## 만들기

```bash
python3 tools/diagnosis-docs/build.py            # 전부
python3 tools/diagnosis-docs/build.py aix-school # 하나만
```

- 문항은 각 진단의 JS·HTML·JSON에서 그대로 읽어 온다. 문항을 고치면 다시 실행한다.
- `ax-readiness`의 보고용은 손으로 다듬은 판이라 `report/build.py`로 따로 만든다.
- Google Chrome(헤드리스)이 필요하다. 글꼴은 CDN에서 불러온다.

## 새 진단을 추가할 때

1. `build.py`에 spec을 추가한다. 구조가 같으면 기존 builder(`readiness`, `competency`, `starbucks`, `needs`)를 쓰고, 다르면 builder를 새로 만든다. 장 구성은 Ⅰ 개요 · Ⅱ 관점과 구조 · Ⅲ 문항 · Ⅳ 점수(분석) · Ⅴ 결과의 구성과 활용 · Ⅵ 결과 예시로 맞춘다.
2. `DOCS`에 등록하고 실행해 두 PDF를 만든다.
3. `in-progress/index.html`의 카드를 `<div class="inst inst--multi">`로 만들고, 제목 링크(`inst-main`) 밑에 `inst-docs` 버튼 두 개를 단다.

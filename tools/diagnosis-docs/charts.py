"""설명서 'Ⅵ. 결과 예시'에 넣는 가상 결과 그림(정적 SVG). 색은 두 계열만 쓴다: 나(파랑) · 비교 집단(주황)."""
import math

ME, CMP, REF = '#2a6bb8', '#d9822b', '#8a929c'   # 나, 비교 집단 평균, 기준선
INK, MUTED, GRID, TRACK = '#111', '#555', '#d5d9df', '#eef0f3'
FONT = 'font-family="Pretendard, sans-serif"'


def legend(items, x, y):
    out, cx = [], x
    for label, color, dash in items:
        if dash:
            out.append(f'<line x1="{cx}" y1="{y}" x2="{cx+16}" y2="{y}" stroke="{color}" stroke-width="2" stroke-dasharray="4 3"/>')
        else:
            out.append(f'<rect x="{cx}" y="{y-5}" width="12" height="10" rx="2" fill="{color}"/>')
        out.append(f'<text x="{cx+20}" y="{y+4}" font-size="11" fill="{INK}">{label}</text>')
        cx += 30 + len(label) * 11
    return ''.join(out)


def radar(labels, series, w=400, h=300):
    """series: [(이름, 값 목록, 색)] — 0~100점 방사형."""
    cx, cy, R, n = w / 2, h / 2 + 14, 96, len(labels)
    pt = lambda i, v: (cx + R * v / 100 * math.sin(2 * math.pi * i / n), cy - R * v / 100 * math.cos(2 * math.pi * i / n))
    g = []
    for ring in (20, 40, 60, 80, 100):
        pts = ' '.join('%.1f,%.1f' % pt(i, ring) for i in range(n))
        g.append(f'<polygon points="{pts}" fill="none" stroke="{GRID}" stroke-width="{1.2 if ring == 60 else 0.8}"' + (' stroke-dasharray="3 3"' if ring == 60 else '') + '/>')
    for i, lb in enumerate(labels):
        x, y = pt(i, 100)
        g.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="{GRID}" stroke-width="0.8"/>')
        lx, ly = pt(i, 122)
        anchor = 'middle' if abs(lx - cx) < 8 else ('start' if lx > cx else 'end')
        g.append(f'<text x="{lx:.1f}" y="{ly + 4:.1f}" text-anchor="{anchor}" font-size="14" font-weight="600" fill="{INK}">{lb}</text>')
    g.append(f'<text x="{cx + 3}" y="{cy - R * .6 - 2:.1f}" font-size="9" fill="{MUTED}">60</text>')
    for k, (name, vals, color) in enumerate(series):
        pts = ' '.join('%.1f,%.1f' % pt(i, v) for i, v in enumerate(vals))
        g.append(f'<polygon points="{pts}" fill="{color}" fill-opacity="{0.16 if k == 0 else 0.08}" stroke="{color}" stroke-width="2" stroke-linejoin="round"/>')
        for i, v in enumerate(vals):
            x, y = pt(i, v)
            g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.6" fill="{color}" stroke="#fff" stroke-width="1.5"/>')
    for i, v in enumerate(series[0][1]):   # 나의 값만 직접 표시
        x, y = pt(i, v)
        dx = 8 if x >= cx else -8
        g.append(f'<text x="{x + dx:.1f}" y="{y - 6:.1f}" text-anchor="{"start" if dx > 0 else "end"}" font-size="13" font-weight="700" fill="{INK}">{v}</text>')
    lg = legend([(s[0], s[2], False) for s in series], 10, 12)
    return f'<svg viewBox="0 0 {w} {h + 30}" width="{w}" height="{h + 30}" {FONT}>{lg}{"".join(g)}</svg>'


def bars(labels, series, cut=60, w=360):
    """단계·영역별 점수: 계열마다 가로 막대, 값은 막대 끝에 표시, 기준선(cut) 점선."""
    lw, x0, x1 = 92, 98, w - 40
    sc = lambda v: x0 + (x1 - x0) * v / 100
    bh, gap, top = 9, 2, 30
    rowh = len(series) * (bh + gap) + 12
    g = [legend([(s[0], s[2], False) for s in series] + ([(f'기준 {cut}점', REF, True)] if cut else []), 4, 12)]
    for i, lb in enumerate(labels):
        y = top + i * rowh
        g.append(f'<text x="{lw}" y="{y + rowh / 2 - 3:.1f}" text-anchor="end" font-size="11.5" font-weight="600" fill="{INK}">{lb}</text>')
        for k, (name, vals, color) in enumerate(series):
            by = y + k * (bh + gap)
            g.append(f'<rect x="{x0}" y="{by}" width="{x1 - x0}" height="{bh}" rx="2" fill="{TRACK}"/>')
            g.append(f'<rect x="{x0}" y="{by}" width="{sc(vals[i]) - x0:.1f}" height="{bh}" rx="2" fill="{color}"/>')
            g.append(f'<text x="{sc(vals[i]) + 4:.1f}" y="{by + bh - 1}" font-size="10" font-weight="{700 if k == 0 else 400}" fill="{INK if k == 0 else MUTED}">{vals[i]}</text>')
    hgt = top + len(labels) * rowh
    if cut:
        g.append(f'<line x1="{sc(cut):.1f}" y1="{top - 4}" x2="{sc(cut):.1f}" y2="{hgt - 8}" stroke="{REF}" stroke-width="1.2" stroke-dasharray="4 3"/>')
    for t in (0, 50, 100):
        g.append(f'<text x="{sc(t):.1f}" y="{hgt + 4}" text-anchor="middle" font-size="9" fill="{MUTED}">{t}</text>')
    return f'<svg viewBox="0 0 {w} {hgt + 10}" width="{w}" height="{hgt + 10}" {FONT}>{"".join(g)}</svg>'


def stairs(names, stage, w=330, h=200):
    """준비 단계 계단: 준비된 단계까지 채움, 병목 단계는 점선 테두리."""
    n, bw, gap, base = len(names), 54, 8, h - 18
    g = []
    for i, nm in enumerate(names):
        x, top = 8 + i * (bw + gap), base - 28 - i * 30
        if i < stage:
            g.append(f'<rect x="{x}" y="{top}" width="{bw}" height="{base - top}" rx="3" fill="{ME}"/>')
        elif i == stage:
            g.append(f'<rect x="{x + 1}" y="{top + 1}" width="{bw - 2}" height="{base - top - 2}" rx="3" fill="#fff" stroke="{CMP}" stroke-width="2" stroke-dasharray="5 3"/>')
            g.append(f'<text x="{x + bw / 2}" y="{top + 18}" text-anchor="middle" font-size="10" font-weight="700" fill="{INK}">병목</text>')
        else:
            g.append(f'<rect x="{x}" y="{top}" width="{bw}" height="{base - top}" rx="3" fill="{TRACK}"/>')
        g.append(f'<text x="{x + bw / 2}" y="{top - 18}" text-anchor="middle" font-size="9.5" fill="{MUTED}">{i + 1}단계</text>')
        g.append(f'<text x="{x + bw / 2}" y="{top - 5}" text-anchor="middle" font-size="10.5" font-weight="600" fill="{INK}">{nm}</text>')
    g.append(f'<line x1="2" y1="{base}" x2="{8 + n * (bw + gap)}" y2="{base}" stroke="{INK}" stroke-width="1"/>')
    return f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" {FONT}>{"".join(g)}</svg>'


def diverging(labels, diffs, w=360, span=30, note=10):
    """나 − 비교 집단 평균. 오른쪽(파랑) = 내가 더 높게 봄, 왼쪽(주황) = 더 낮게 봄, 가운데 회색 띠 = 비슷함."""
    lw, x0, x1, top, rowh = 92, 98, w - 30, 28, 24
    mid = (x0 + x1) / 2
    sc = lambda v: mid + (x1 - x0) / 2 * v / span
    hgt = top + len(labels) * rowh
    g = [f'<rect x="{sc(-note):.1f}" y="{top - 6}" width="{sc(note) - sc(-note):.1f}" height="{hgt - top + 2}" fill="{TRACK}"/>',
         f'<line x1="{mid}" y1="{top - 8}" x2="{mid}" y2="{hgt}" stroke="{INK}" stroke-width="1"/>',
         f'<text x="{x0}" y="14" font-size="10.5" fill="{MUTED}">← 내가 더 낮게 봄</text>',
         f'<text x="{x1}" y="14" text-anchor="end" font-size="10.5" fill="{MUTED}">내가 더 높게 봄 →</text>']
    for i, (lb, d) in enumerate(zip(labels, diffs)):
        y = top + i * rowh
        g.append(f'<text x="{lw}" y="{y + 9}" text-anchor="end" font-size="11.5" font-weight="600" fill="{INK}">{lb}</text>')
        a, b = sorted((mid, sc(d)))
        g.append(f'<rect x="{a:.1f}" y="{y}" width="{max(b - a, 1):.1f}" height="12" rx="2" fill="{ME if d >= 0 else CMP}"/>')
        tx = sc(d) + (5 if d >= 0 else -5)
        g.append(f'<text x="{tx:.1f}" y="{y + 10}" text-anchor="{"start" if d >= 0 else "end"}" font-size="10" font-weight="700" fill="{INK}">{"+" if d > 0 else ("−" if d < 0 else "±")}{abs(d)}</text>')
    g.append(f'<text x="{mid}" y="{hgt + 10}" text-anchor="middle" font-size="9" fill="{MUTED}">±{note}점 안(회색 띠)은 비슷함</text>')
    return f'<svg viewBox="0 0 {w} {hgt + 14}" width="{w}" height="{hgt + 14}" {FONT}>{"".join(g)}</svg>'


def ranking(rows, avg, avg_label, w=360):
    """학교 간 종합 점수: 우리 학교만 파랑, 다른 학교는 옅은 회색, 평균은 점선."""
    lw, x0, x1, top, rowh = 74, 80, w - 50, 24, 22
    sc = lambda v: x0 + (x1 - x0) * v / 100
    hgt = top + len(rows) * rowh
    g = [legend([('우리 학교', ME, False), ('다른 학교', '#b7bec8', False), (avg_label, REF, True)], 4, 10)]
    for i, (name, v, mine) in enumerate(rows):
        y = top + i * rowh
        g.append(f'<text x="{lw}" y="{y + 10}" text-anchor="end" font-size="11" font-weight="{700 if mine else 400}" fill="{INK}">{name}</text>')
        g.append(f'<rect x="{x0}" y="{y}" width="{sc(v) - x0:.1f}" height="13" rx="2" fill="{ME if mine else "#b7bec8"}"/>')
        g.append(f'<text x="{sc(v) + 5:.1f}" y="{y + 11}" font-size="10" font-weight="{700 if mine else 400}" fill="{INK}">{v}점</text>')
    g.append(f'<line x1="{sc(avg):.1f}" y1="{top - 4}" x2="{sc(avg):.1f}" y2="{hgt}" stroke="{REF}" stroke-width="1.2" stroke-dasharray="4 3"/>')
    return f'<svg viewBox="0 0 {w} {hgt + 6}" width="{w}" height="{hgt + 6}" {FONT}>{"".join(g)}</svg>'

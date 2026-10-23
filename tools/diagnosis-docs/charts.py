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


def radar(labels, series, w=460, h=300, vmax=100, cut=60):
    """series: [(이름, 값 목록, 색)] — 0~vmax 방사형, cut 고리는 점선."""
    cx, cy, R, n = w / 2, h / 2 + 14, 92, len(labels)
    pt = lambda i, v: (cx + R * v / vmax * math.sin(2 * math.pi * i / n), cy - R * v / vmax * math.cos(2 * math.pi * i / n))
    g = []
    rings = sorted(set([vmax * k / 5 for k in range(1, 6)] + ([cut] if cut else [])))
    for ring in rings:
        pts = ' '.join('%.1f,%.1f' % pt(i, ring) for i in range(n))
        g.append(f'<polygon points="{pts}" fill="none" stroke="{GRID}" stroke-width="{1.2 if ring == cut else 0.8}"' + (' stroke-dasharray="3 3"' if ring == cut else '') + '/>')
    for i, lb in enumerate(labels):
        x, y = pt(i, 100)
        g.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="{GRID}" stroke-width="0.8"/>')
        lx, ly = pt(i, vmax * 1.22)
        anchor = 'middle' if abs(lx - cx) < 8 else ('start' if lx > cx else 'end')
        g.append(f'<text x="{lx:.1f}" y="{ly + 4:.1f}" text-anchor="{anchor}" font-size="14" font-weight="600" fill="{INK}">{lb}</text>')
    if cut:
        g.append(f'<text x="{cx + 3}" y="{cy - R * cut / vmax - 2:.1f}" font-size="9" fill="{MUTED}">{cut:g}</text>')
    for k, (name, vals, color) in enumerate(series):
        pts = ' '.join('%.1f,%.1f' % pt(i, v) for i, v in enumerate(vals))
        g.append(f'<polygon points="{pts}" fill="{color}" fill-opacity="{0.16 if k == 0 else 0.08}" stroke="{color}" stroke-width="2" stroke-linejoin="round"/>')
        for i, v in enumerate(vals):
            x, y = pt(i, v)
            g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.6" fill="{color}" stroke="#fff" stroke-width="1.5"/>')
    for i, v in enumerate(series[0][1]):   # 나의 값만 직접 표시: 점에서 축 바깥쪽으로 조금 띄운다
        x, y = pt(i, v)
        ang = 2 * math.pi * i / n
        tx, ty = x + 13 * math.sin(ang), y - 13 * math.cos(ang) + 4
        anchor = 'middle' if abs(math.sin(ang)) < 0.3 else ('start' if math.sin(ang) > 0 else 'end')
        g.append(f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="{anchor}" font-size="13" font-weight="700" fill="{INK}" paint-order="stroke" stroke="#fff" stroke-width="3">{v:g}</text>')
    lg = legend([(s[0], s[2], False) for s in series], 10, 12)
    return f'<svg viewBox="0 0 {w} {h + 30}" width="{w}" height="{h + 30}" {FONT}>{lg}{"".join(g)}</svg>'


def bars(labels, series, cut=60, w=360, vmax=100):
    """단계·영역별 점수: 계열마다 가로 막대, 값은 막대 끝에 표시, 기준선(cut) 점선."""
    lw = max(92, int(max(len(l) for l in labels) * 11.5) + 4)
    x0, x1 = lw + 6, w - 40
    sc = lambda v: x0 + (x1 - x0) * v / vmax
    bh, gap, top = 9, 2, 30
    rowh = len(series) * (bh + gap) + 12
    g = [legend([(s[0], s[2], False) for s in series] + ([(f'기준 {cut:g}점', REF, True)] if cut else []), 4, 12)]
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
    for t in (0, vmax / 2, vmax):
        g.append(f'<text x="{sc(t):.1f}" y="{hgt + 4}" text-anchor="middle" font-size="9" fill="{MUTED}">{t:g}</text>')
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


def diverging(labels, diffs, w=360, span=30, note=10, unit='점'):
    """나 − 비교 집단 평균. 오른쪽(파랑) = 내가 더 높게 봄, 왼쪽(주황) = 더 낮게 봄, 가운데 회색 띠 = 비슷함."""
    lw = max(92, int(max(len(l) for l in labels) * 11.5) + 4)
    x0, x1, top, rowh = lw + 6, w - 30, 28, 24
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
        g.append(f'<text x="{tx:.1f}" y="{y + 10}" text-anchor="{"start" if d >= 0 else "end"}" font-size="10" font-weight="700" fill="{INK}">{"+" if d > 0 else ("−" if d < 0 else "±")}{abs(d):g}</text>')
    g.append(f'<text x="{mid}" y="{hgt + 10}" text-anchor="middle" font-size="9" fill="{MUTED}">±{note:g}{unit} 안(회색 띠)은 비슷함</text>')
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


def scatter(points, xlab, ylab, xr, yr, xcut, ycut, quads, w=360, h=270, shade='ur'):
    """사분면 산점도. points: [(이름, x, y, 강조 여부)], quads: (오른쪽 위, 왼쪽 위, 왼쪽 아래, 오른쪽 아래) 이름."""
    l, r, t, b = 46, w - 14, 16, h - 40
    sx = lambda v: l + (r - l) * (v - xr[0]) / (xr[1] - xr[0])
    sy = lambda v: b - (b - t) * (v - yr[0]) / (yr[1] - yr[0])
    sx0, sx1 = (sx(xcut), r) if shade == 'ur' else (l, sx(xcut))
    g = [f'<rect x="{sx0:.1f}" y="{t}" width="{sx1 - sx0:.1f}" height="{sy(ycut) - t:.1f}" fill="{ME}" fill-opacity="0.07"/>',
         f'<rect x="{l}" y="{t}" width="{r - l}" height="{b - t}" fill="none" stroke="{GRID}"/>',
         f'<line x1="{sx(xcut):.1f}" y1="{t}" x2="{sx(xcut):.1f}" y2="{b}" stroke="{REF}" stroke-dasharray="4 3"/>',
         f'<line x1="{l}" y1="{sy(ycut):.1f}" x2="{r}" y2="{sy(ycut):.1f}" stroke="{REF}" stroke-dasharray="4 3"/>']
    for (qx, qy, anchor), name in zip([(r - 4, t + 12, 'end'), (l + 4, t + 12, 'start'), (l + 4, b - 6, 'start'), (r - 4, b - 6, 'end')], quads):
        g.append(f'<text x="{qx}" y="{qy}" text-anchor="{anchor}" font-size="9.5" font-weight="700" fill="{MUTED}">{name}</text>')
    for v in (xr[0], xcut, xr[1]):
        g.append(f'<text x="{sx(v):.1f}" y="{b + 12}" text-anchor="middle" font-size="9" fill="{MUTED}">{v:g}</text>')
    for v in (yr[0], ycut, yr[1]):
        g.append(f'<text x="{l - 5}" y="{sy(v) + 3:.1f}" text-anchor="end" font-size="9" fill="{MUTED}">{v:g}</text>')
    g.append(f'<text x="{(l + r) / 2}" y="{h - 8}" text-anchor="middle" font-size="10.5" font-weight="600" fill="{INK}">{xlab}</text>')
    g.append(f'<text x="12" y="{(t + b) / 2}" text-anchor="middle" font-size="10.5" font-weight="600" fill="{INK}" transform="rotate(-90 12 {(t + b) / 2})">{ylab}</text>')
    for name, x, y, hi in points:
        g.append(f'<circle cx="{sx(x):.1f}" cy="{sy(y):.1f}" r="{5.5 if hi else 4.5}" fill="{ME if hi else CMP}" stroke="#fff" stroke-width="1.5"/>')
        g.append(f'<text x="{sx(x) + 8:.1f}" y="{sy(y) + 4:.1f}" font-size="10.5" font-weight="{700 if hi else 400}" fill="{INK}">{name}</text>')
    return f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" {FONT}>{"".join(g)}</svg>'


def hbars(rows, w=360, vmax=None, unit=''):
    """한 계열 가로 막대 순위. rows: [(이름, 값, 강조 여부)]."""
    vmax = vmax or max(v for _, v, _ in rows) * 1.15
    lw = max(len(n) for n, _, _ in rows) * 10 + 8
    x0, x1, top, rowh = lw + 6, w - 44, 6, 22
    sc = lambda v: x0 + (x1 - x0) * v / vmax
    g = []
    for i, (name, v, hi) in enumerate(rows):
        y = top + i * rowh
        g.append(f'<text x="{lw}" y="{y + 10}" text-anchor="end" font-size="10.5" font-weight="{700 if hi else 400}" fill="{INK}">{name}</text>')
        g.append(f'<rect x="{x0}" y="{y}" width="{sc(v) - x0:.1f}" height="13" rx="2" fill="{ME if hi else "#b7bec8"}"/>')
        g.append(f'<text x="{sc(v) + 5:.1f}" y="{y + 11}" font-size="10" font-weight="{700 if hi else 400}" fill="{INK}">{v:g}{unit}</text>')
    hgt = top + len(rows) * rowh
    return f'<svg viewBox="0 0 {w} {hgt}" width="{w}" height="{hgt}" {FONT}>{"".join(g)}</svg>'

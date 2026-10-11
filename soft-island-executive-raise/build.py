import json, html

# 経営分析_決算データ（決算シート）ソフトアイランド 第34〜38期
P = [
    # 期, 期間, 売上高, 営業利益, 経常利益, 当期純利益, 役員報酬, 純資産, 総資産, 現預金, 長期借入金
    ("第34期", "R2.10〜R3.9", 251453121, 71486233, 75073691, 51239018, 93874992, 712640804, 1770592282, 79493322, 781034000),
    ("第35期", "R3.10〜R4.9", 254162792, 78094202, 75933667, 51452367, 91614580, 764093171, 1935611233, 51260530, 896415000),
    ("第36期", "R4.10〜R5.9", 276253230, 88839423, 83462909, 56186843, 103200000, 820280014, 1937025939, 53933774, 808151000),
    ("第37期", "R5.10〜R6.9", 282386334, 93462215, 87016152, 47712076, 103200000, 867992090, 1972183121, 90512291, 766169000),
    ("第38期", "R6.10〜R7.9", 279888279, 91741969, 83668981, 55252581, 103200000, 923244671, 2101004612, 74846454, 842090000),
]
TAX38 = 28416400
PRETAX38 = 83668981
ETR = TAX38 / PRETAX38  # 実効負担率（第38期実績）

BLUE, ORANGE, AQUA, GRAY = "#2a78d6", "#eb6834", "#1baf7a", "#a3a29c"
INK, INK2, MUTED, GRID = "#0b0b0b", "#52514e", "#8a8984", "#e6e5e0"

def m(v):  # 百万円 1桁
    return f"{v/1e6:,.1f}"

def yen(v):
    return f"{v:,.0f}"

def rr(x, y, w, h, r, fill):
    """上端のみ角丸の棒（ベースライン側は直角）"""
    r = min(r, w / 2, h)
    return (f'<path d="M{x},{y+h} L{x},{y+r} Q{x},{y} {x+r},{y} L{x+w-r},{y} '
            f'Q{x+w},{y} {x+w},{y+r} L{x+w},{y+h} Z" fill="{fill}"/>')

def axis(W, H, pad, ymax, step, fmt=lambda v: f"{v:,.0f}"):
    L, T, R, B = pad
    out = []
    v = 0
    while v <= ymax + 1e-9:
        y = T + (H - T - B) * (1 - v / ymax)
        out.append(f'<line x1="{L}" x2="{W-R}" y1="{y:.1f}" y2="{y:.1f}" stroke="{GRID}" stroke-width="1"/>')
        out.append(f'<text x="{L-6}" y="{y+3.5:.1f}" text-anchor="end" font-size="9" fill="{MUTED}">{fmt(v)}</text>')
        v += step
    return out

def sales_chart():
    W, H, pad = 330, 225, (40, 14, 8, 34)
    L, T, R, B = pad
    ymax, step = 300, 50
    ph = H - T - B
    out = [f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="売上高推移">']
    out += axis(W, H, pad, ymax, step)
    n = len(P)
    slot = (W - L - R) / n
    bw = slot * 0.52
    for i, p in enumerate(P):
        v = p[2] / 1e6
        h = ph * v / ymax
        x = L + slot * i + (slot - bw) / 2
        y = T + ph - h
        fill = BLUE
        out.append(rr(x, y, bw, h, 4, fill))
        out.append(f'<text x="{x+bw/2:.1f}" y="{y-4:.1f}" text-anchor="middle" font-size="9.5" fill="{INK}" font-weight="700">{v:,.1f}</text>')
        out.append(f'<text x="{x+bw/2:.1f}" y="{H-B+13}" text-anchor="middle" font-size="9.5" fill="{INK2}">{p[0]}</text>')
        out.append(f'<text x="{x+bw/2:.1f}" y="{H-B+25}" text-anchor="middle" font-size="8" fill="{MUTED}">{p[1].split("〜")[1]}期末</text>')
    out.append(f'<line x1="{L}" x2="{W-R}" y1="{T+ph}" y2="{T+ph}" stroke="{INK2}" stroke-width="1"/>')
    out.append('</svg>')
    return "".join(out)

def profit_chart():
    W, H, pad = 330, 225, (40, 14, 62, 34)
    L, T, R, B = pad
    ymax, step = 100, 20
    ph = H - T - B
    out = [f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="利益推移">']
    out += axis(W, H, pad, ymax, step)
    n = len(P)
    slot = (W - L - R) / n
    xs = [L + slot * i + slot / 2 for i in range(n)]
    series = [("営業利益", 3, BLUE), ("経常利益", 4, ORANGE), ("当期純利益", 5, AQUA)]
    label_y = {}
    for name, idx, col in series:
        pts = [(xs[i], T + ph * (1 - P[i][idx] / 1e6 / ymax)) for i in range(n)]
        d = " ".join(("M" if i == 0 else "L") + f"{x:.1f},{y:.1f}" for i, (x, y) in enumerate(pts))
        out.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="2" stroke-linejoin="round"/>')
        for x, y in pts:
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" fill="{col}" stroke="#fff" stroke-width="1.5"/>')
        label_y[name] = (pts[-1], col, P[-1][idx])
    # 直接ラベル（右端）— 営業と経常が近いので縦にずらす
    offs = {"営業利益": -6, "経常利益": 8, "当期純利益": 3}
    for name, ((x, y), col, v) in label_y.items():
        ly = y + offs[name]
        out.append(f'<rect x="{x+8}" y="{ly-4}" width="8" height="2.5" rx="1" fill="{col}"/>')
        out.append(f'<text x="{x+19}" y="{ly}" font-size="8.5" fill="{INK}">{name}</text>')
        out.append(f'<text x="{x+19}" y="{ly+9}" font-size="8" fill="{INK2}" font-weight="700">{v/1e6:,.1f}</text>')
    for i, p in enumerate(P):
        out.append(f'<text x="{xs[i]:.1f}" y="{H-B+13}" text-anchor="middle" font-size="9.5" fill="{INK2}">{p[0]}</text>')
        out.append(f'<text x="{xs[i]:.1f}" y="{H-B+25}" text-anchor="middle" font-size="8" fill="{MUTED}">{p[1].split("〜")[1]}期末</text>')
    out.append(f'<line x1="{L}" x2="{W-R}" y1="{T+ph}" y2="{T+ph}" stroke="{INK2}" stroke-width="1"/>')
    out.append('</svg>')
    return "".join(out)

# ---- 提案シミュレーション（第38期実績ベース）----
base = P[-1]
OP, ORD, NET, OFF = base[3], base[4], base[5], base[6]
cases = []
for key, inc_m in (("現状", 0), ("A案", 500000), ("B案", 1000000)):
    add = inc_m * 2 * 12  # 2名 × 12か月
    op = OP - add
    ordp = ORD - add
    net = NET - add * (1 - ETR)
    cases.append(dict(key=key, inc=inc_m, add=add, off=OFF + add, op=op, ord=ordp, net=net,
                      opm=op / base[2], offr=(OFF + add) / base[2]))

def sim_chart():
    W, H, pad = 680, 170, (40, 12, 8, 30)
    L, T, R, B = pad
    ymax, step = 100, 20
    ph = H - T - B
    out = [f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="報酬改定後の利益シミュレーション">']
    out += axis(W, H, pad, ymax, step)
    groups = [("営業利益", "op"), ("経常利益", "ord"), ("当期純利益（概算）", "net")]
    cols = {"現状": GRAY, "A案": BLUE, "B案": ORANGE}
    gslot = (W - L - R) / len(groups)
    bw = 46
    gap = 2
    for gi, (gname, k) in enumerate(groups):
        gx = L + gslot * gi + (gslot - (bw * 3 + gap * 2)) / 2
        for ci, c in enumerate(cases):
            v = c[k] / 1e6
            h = ph * v / ymax
            x = gx + ci * (bw + gap)
            y = T + ph - h
            out.append(rr(x, y, bw, h, 4, cols[c["key"]]))
            out.append(f'<text x="{x+bw/2:.1f}" y="{y-4:.1f}" text-anchor="middle" font-size="9.5" fill="{INK}" font-weight="700">{v:,.1f}</text>')
            out.append(f'<text x="{x+bw/2:.1f}" y="{T+ph-6:.1f}" text-anchor="middle" font-size="8.5" fill="#fff" font-weight="700">{c["key"]}</text>')
        out.append(f'<text x="{L + gslot*gi + gslot/2:.1f}" y="{H-B+15}" text-anchor="middle" font-size="10" fill="{INK2}">{gname}</text>')
    out.append(f'<line x1="{L}" x2="{W-R}" y1="{T+ph}" y2="{T+ph}" stroke="{INK2}" stroke-width="1"/>')
    out.append('</svg>')
    return "".join(out)

# ---- 表 ----
def pl_table():
    rows = [
        ("売上高", 2, False), ("営業利益", 3, False), ("経常利益", 4, False), ("当期純利益", 5, False),
        ("役員報酬", 6, True),
    ]
    th = "".join(f"<th>{p[0]}<br><span>{p[1]}</span></th>" for p in P)
    body = ""
    for name, idx, hl in rows:
        tds = "".join(f"<td>{m(p[idx])}</td>" for p in P)
        body += f'<tr class="{"hl" if hl else ""}"><th>{name}</th>{tds}</tr>'
    tds = "".join(f"<td>{m(p[3]+p[6])}</td>" for p in P)
    body += f'<tr class="sub"><th>役員報酬控除前 営業利益</th>{tds}</tr>'
    tds = "".join(f"<td>{p[3]/p[2]*100:.1f}%</td>" for p in P)
    body += f'<tr><th>営業利益率</th>{tds}</tr>'
    tds = "".join(f"<td>{p[7]/p[8]*100:.1f}%</td>" for p in P)
    body += f'<tr><th>自己資本比率</th>{tds}</tr>'
    return f'<table class="pl"><thead><tr><th>（百万円）</th>{th}</tr></thead><tbody>{body}</tbody></table>'

first, last = P[0], P[-1]
cagr = (last[2] / first[2]) ** (1 / 4) - 1
pre35 = P[1][3] + P[1][6]
pre38 = last[3] + last[6]

A, B_ = cases[1], cases[2]

html_doc = f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>ソフトアイランド 役員報酬改定案</title>
<style>
@page {{ size: A4; margin: 0; }}
* {{ box-sizing: border-box; }}
body {{ margin:0; font-family: "IPAPGothic","IPAGothic",sans-serif; color:{INK}; background:#fff; font-size:10.5px; line-height:1.55; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
.page {{ width:210mm; height:297mm; padding:14mm 14mm 11mm; position:relative; page-break-after:always; overflow:hidden; }}
.page:last-child {{ page-break-after:auto; }}
.head {{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid {INK}; padding-bottom:5px; margin-bottom:9px; }}
.head h1 {{ font-size:19px; margin:0; letter-spacing:.04em; }}
.head .meta {{ text-align:right; font-size:9.5px; color:{INK2}; }}
.conf {{ display:inline-block; border:1px solid {INK2}; padding:0 6px; font-size:9px; margin-bottom:3px; }}
h2 {{ font-size:12.5px; margin:13px 0 7px; padding-left:8px; border-left:4px solid {BLUE}; }}
h3 {{ font-size:10.5px; margin:0 0 3px; color:{INK2}; font-weight:700; }}
.lead {{ margin:0 0 6px; }}
.kpis {{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:4px; }}
.kpi {{ background:#f4f3ef; border-radius:6px; padding:6px 9px; }}
.kpi .l {{ font-size:9px; color:{INK2}; }}
.kpi .v {{ font-size:17px; font-weight:700; line-height:1.25; }}
.kpi .v small {{ font-size:9.5px; font-weight:400; color:{INK2}; margin-left:2px; }}
.kpi .s {{ font-size:8.5px; color:{INK2}; }}
.charts {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }}
.card {{ border:1px solid {GRID}; border-radius:6px; padding:7px 8px 2px; }}
.unit {{ font-size:8.5px; color:{MUTED}; font-weight:400; margin-left:4px; }}
table {{ border-collapse:collapse; width:100%; }}
table.pl th, table.pl td {{ border-bottom:1px solid {GRID}; padding:2.5px 6px; font-size:9.5px; }}
table.pl thead th {{ background:#f4f3ef; font-weight:700; text-align:right; line-height:1.25; }}
table.pl thead th span {{ font-weight:400; font-size:8px; color:{INK2}; }}
table.pl thead th:first-child {{ text-align:left; font-weight:400; color:{INK2}; }}
table.pl tbody th {{ text-align:left; font-weight:400; }}
table.pl td {{ text-align:right; font-variant-numeric:tabular-nums; }}
table.pl tr.hl {{ background:#fdf3ec; }}
table.pl tr.sub th, table.pl tr.sub td {{ font-weight:700; }}
ul.pts {{ margin:4px 0 0; padding-left:16px; }}
ul.pts li {{ margin-bottom:2px; }}
.note {{ font-size:8.5px; color:{INK2}; margin-top:3px; }}
.foot {{ position:absolute; bottom:6mm; left:14mm; right:14mm; font-size:8px; color:{MUTED}; display:flex; justify-content:space-between; }}
/* 提案表 */
table.prop th, table.prop td {{ border:1px solid #d6d5cf; padding:4px 7px; font-size:10px; text-align:right; }}
table.prop thead th {{ background:#f4f3ef; text-align:center; }}
table.prop tbody th {{ text-align:left; background:#fafaf8; font-weight:700; }}
table.prop .a {{ background:#eef4fc; }}
table.prop .b {{ background:#fdf0ea; }}
table.prop thead th.a {{ background:{BLUE}; color:#fff; }}
table.prop thead th.b {{ background:{ORANGE}; color:#fff; }}
table.prop tr.tot th, table.prop tr.tot td {{ font-weight:700; border-top:2px solid {INK2}; }}
.up {{ font-size:8.5px; color:{INK2}; display:block; }}
.hist {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }}
.hist .box {{ background:#f4f3ef; border-radius:6px; padding:6px 10px; }}
.two {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }}
.legend {{ display:flex; gap:14px; font-size:9px; color:{INK2}; margin:2px 0 0 40px; }}
.legend i {{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }}
.concl {{ border:1.5px solid {INK}; border-radius:6px; padding:7px 11px; margin-top:8px; }}
.concl b {{ font-size:11px; }}
</style></head>
<body>

<!-- ================= 1ページ目 ================= -->
<section class="page">
  <div class="head">
    <div>
      <div class="conf">社外秘</div>
      <h1>有限会社ソフトアイランド　役員報酬改定のご提案</h1>
    </div>
    <div class="meta">令和8年10月<br>1 / 2　経営状況の報告</div>
  </div>

  <h2>1. 直近5期の経営状況（第34期〜第38期）</h2>
  <p class="lead">賃料収入を柱に売上・利益とも堅調に推移しています。前回の役員報酬改定（令和4年・第36期〜、年額＋1,200万円）を吸収したうえで、営業利益は改定前の第35期を上回る水準を維持しています。</p>

  <div class="kpis">
    <div class="kpi"><div class="l">売上高（第38期）</div><div class="v">{m(last[2])}<small>百万円</small></div><div class="s">5期で＋{(last[2]/first[2]-1)*100:.1f}%（年平均＋{cagr*100:.1f}%）</div></div>
    <div class="kpi"><div class="l">営業利益（第38期）</div><div class="v">{m(last[3])}<small>百万円</small></div><div class="s">営業利益率 {last[3]/last[2]*100:.1f}%</div></div>
    <div class="kpi"><div class="l">当期純利益（第38期）</div><div class="v">{m(last[5])}<small>百万円</small></div><div class="s">5期累計 {m(sum(p[5] for p in P))}百万円</div></div>
    <div class="kpi"><div class="l">純資産（第38期末）</div><div class="v">{m(last[7])}<small>百万円</small></div><div class="s">5期で＋{m(last[7]-first[7])}百万円／自己資本比率 {last[7]/last[8]*100:.1f}%</div></div>
  </div>

  <div class="charts">
    <div class="card"><h3>売上高の推移<span class="unit">（百万円）</span></h3>{sales_chart()}</div>
    <div class="card"><h3>利益の推移<span class="unit">（百万円）</span></h3>{profit_chart()}</div>
  </div>

  <h2>2. 損益の推移（PL抜粋）</h2>
  {pl_table()}
  <p class="note">※出典：経営分析コンソール（経営分析_決算データ）。決算期は10月〜9月。第39期（R7.10〜R8.9）は決算確定前のため未掲載。<br>※役員報酬控除前 営業利益 ＝ 営業利益 ＋ 役員報酬（会社の稼ぐ力から役員報酬の影響を除いた指標）。</p>

  <h2>3. 経営状況のポイント</h2>
  <ul class="pts">
    <li><b>売上は5期で約{m(last[2]-first[2])}百万円増加。</b>第36期以降は2億7,000万円台後半で安定し、賃料収入による底堅い収益構造です。</li>
    <li><b>前回改定後も利益水準は向上。</b>役員報酬控除前 営業利益は第35期 {m(pre35)}百万円 → 第38期 {m(pre38)}百万円（＋{m(pre38-pre35)}百万円）。前回改定分（年＋12百万円）を上回る収益力の伸びがあります。</li>
    <li><b>財務基盤も強化。</b>純資産は5期で{m(first[7])}→{m(last[7])}百万円。土地取得（第38期）で借入は増えたものの、自己資本比率は{last[7]/last[8]*100:.1f}%を確保しています。</li>
    <li><b>今後の増収要素。</b>木野タウンではソフトアイランド専用地にびっくりドンキー（月額賃料70万円・年840万円）が2027年夏頃開業予定です。</li>
  </ul>

  <div class="foot"><span>有限会社ソフトアイランド　役員報酬改定のご提案</span><span>1 / 2</span></div>
</section>

<!-- ================= 2ページ目 ================= -->
<section class="page">
  <div class="head">
    <div>
      <div class="conf">社外秘</div>
      <h1>役員報酬改定案（A案・B案）</h1>
    </div>
    <div class="meta">令和8年10月<br>2 / 2　改定のご提案</div>
  </div>

  <h2>4. 前回改定の実績（令和4年）</h2>
  <div class="hist">
    <div class="box"><b>島崎 会長</b>　月額 4,500,000円 → <b>5,000,000円</b>（＋500,000円）</div>
    <div class="box"><b>島崎 朱美 氏</b>　月額 3,000,000円 → <b>3,500,000円</b>（＋500,000円）</div>
  </div>
  <p class="note">第36期（R4.10〜）より適用。役員報酬総額は年額 約91.6百万円（第35期）→ 103.2百万円（第36期〜第38期）。前回改定から約4年が経過しています。</p>

  <h2>5. 改定案（2パターン）</h2>
  <table class="prop">
    <thead><tr><th style="width:22%">対象者</th><th style="width:20%">現行（月額）</th><th class="a">A案：各 ＋500,000円</th><th class="b">B案：各 ＋1,000,000円</th></tr></thead>
    <tbody>
      <tr><th>島崎 会長</th><td>5,000,000円<span class="up">年額 60,000,000円</span></td>
          <td class="a"><b>5,500,000円</b>（＋10.0%）<span class="up">年額 66,000,000円</span></td>
          <td class="b"><b>6,000,000円</b>（＋20.0%）<span class="up">年額 72,000,000円</span></td></tr>
      <tr><th>島崎 朱美 氏</th><td>3,500,000円<span class="up">年額 42,000,000円</span></td>
          <td class="a"><b>4,000,000円</b>（＋14.3%）<span class="up">年額 48,000,000円</span></td>
          <td class="b"><b>4,500,000円</b>（＋28.6%）<span class="up">年額 54,000,000円</span></td></tr>
      <tr class="tot"><th>会社負担の増加額</th><td>—</td>
          <td class="a">月 ＋1,000,000円<span class="up">年 ＋12,000,000円</span></td>
          <td class="b">月 ＋2,000,000円<span class="up">年 ＋24,000,000円</span></td></tr>
      <tr><th>役員報酬総額（年）</th><td>{m(OFF)}百万円</td><td class="a">{m(A['off'])}百万円</td><td class="b">{m(B_['off'])}百万円</td></tr>
      <tr><th>売上高に占める割合</th><td>{cases[0]['offr']*100:.1f}%</td><td class="a">{A['offr']*100:.1f}%</td><td class="b">{B_['offr']*100:.1f}%</td></tr>
    </tbody>
  </table>
  <p class="note">※役員報酬総額にはその他の役員報酬（年1.2百万円・据置前提）を含みます。</p>

  <h2>6. 損益への影響（第38期実績にあてはめた場合）</h2>
  <div class="card">
    <div class="legend"><span><i style="background:{GRAY}"></i>現状</span><span><i style="background:{BLUE}"></i>A案（年＋12百万円）</span><span><i style="background:{ORANGE}"></i>B案（年＋24百万円）</span><span style="margin-left:auto;margin-right:8px">（百万円）</span></div>
    {sim_chart()}
  </div>
  <table class="pl" style="margin-top:6px">
    <thead><tr><th>（百万円）</th><th>現状</th><th>A案</th><th>B案</th></tr></thead>
    <tbody>
      <tr><th>営業利益（営業利益率）</th>{''.join(f"<td>{m(c['op'])}（{c['opm']*100:.1f}%）</td>" for c in cases)}</tr>
      <tr><th>経常利益</th>{''.join(f"<td>{m(c['ord'])}</td>" for c in cases)}</tr>
      <tr class="sub"><th>当期純利益（概算）</th>{''.join(f"<td>{m(c['net'])}</td>" for c in cases)}</tr>
    </tbody>
  </table>
  <p class="note">※当期純利益は第38期の税負担率（約{ETR*100:.0f}%）で概算。役員報酬は損金算入されるため、税引後の利益減少は増加額の約{(1-ETR)*100:.0f}%（A案 約{m(A['add']*(1-ETR))}百万円／B案 約{m(B_['add']*(1-ETR))}百万円）にとどまります。</p>

  <div class="two" style="margin-top:6px">
    <div>
      <h3>評価</h3>
      <ul class="pts" style="margin-top:0">
        <li><b>A案</b>：営業利益率は{A['opm']*100:.1f}%と高水準を維持。増加額（年12百万円）は、びっくりドンキー賃料（年8.4百万円）等の増収でおおむね吸収可能です。</li>
        <li><b>B案</b>：増加額（年24百万円）は前回改定後の収益力の伸び（＋{m(pre38-pre35)}百万円）の範囲内。営業利益率は{B_['opm']*100:.1f}%となりますが黒字は十分確保されます。</li>
      </ul>
    </div>
    <div>
      <h3>実施上の留意点</h3>
      <ul class="pts" style="margin-top:0">
        <li><b>改定時期</b>：定期同額給与として損金算入するため、第40期（R8.10〜）の期首から3か月以内（R8年12月末まで）に株主総会で決議し、改定月以降同額で支給。</li>
        <li><b>社会保険料</b>：両名とも標準報酬月額の上限を超えているため、会社負担は原則増加しません。</li>
        <li><b>相当性</b>：報酬額は職務内容・業績・同業他社水準に照らし不相当に高額とならないよう、議事録に改定理由を記録します。</li>
      </ul>
    </div>
  </div>

  <div class="concl"><b>ご提案</b>　好調な業績と強化された財務基盤を踏まえ、島崎会長・島崎朱美氏の役員報酬を、<b>A案（各月額＋50万円）</b>または<b>B案（各月額＋100万円）</b>にて第40期より改定することをご提案いたします。</div>

  <div class="foot"><span>有限会社ソフトアイランド　役員報酬改定のご提案</span><span>2 / 2</span></div>
</section>
</body></html>
"""

open("/tmp/claude-0/-home-user--/e271935d-15a9-5e13-be25-d1238993d701/scratchpad/report.html", "w").write(html_doc)
print("ETR", ETR, [ (c['key'], m(c['op']), m(c['ord']), m(c['net']), f"{c['opm']*100:.1f}") for c in cases])
print("pre35", m(pre35), "pre38", m(pre38))

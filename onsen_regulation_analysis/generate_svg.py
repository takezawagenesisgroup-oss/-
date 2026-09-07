#!/usr/bin/env python3
"""results.json から単体表示可能なSVG図面(svg_diagram.svg)を生成する。
folium/matplotlib非依存で、ブラウザで直接開いて確認できる。"""
import json
import math

with open("results.json", "r", encoding="utf-8") as f:
    R = json.load(f)

ONSEN = tuple(R["onsen_coords"])
SOUTH = tuple(R["target_points_latlng"]["south_end"])
CENTER = tuple(R["target_points_latlng"]["center"])
NORTH = tuple(R["target_points_latlng"]["north_end"])
RADIUS_M = 500.0
SITE_AREA_SQM = 13285.0

lat0 = ONSEN[0]
M_PER_DEG_LAT = 111320.0
M_PER_DEG_LNG = 111320.0 * math.cos(math.radians(lat0))


def to_xy(pt):
    lat, lng = pt
    return ((lng - ONSEN[1]) * M_PER_DEG_LNG, (lat - ONSEN[0]) * M_PER_DEG_LAT)


onsen_xy = to_xy(ONSEN)
south_xy = to_xy(SOUTH)
center_xy = to_xy(CENTER)
north_xy = to_xy(NORTH)

depth_m = math.hypot(north_xy[0] - south_xy[0], north_xy[1] - south_xy[1])
width_m = SITE_AREA_SQM / depth_m
cx = (south_xy[0] + north_xy[0]) / 2
site_x0, site_x1 = cx - width_m / 2, cx + width_m / 2
site_y0, site_y1 = south_xy[1], north_xy[1]

d_south = R["distance_from_kino_onsen_m"]["to_south_end"]
d_center = R["distance_from_kino_onsen_m"]["to_center"]
d_north = R["distance_from_kino_onsen_m"]["to_north_end"]

# ---- SVG座標系: メートル(東西=x, 南北=y)を画面座標(px)へ変換 ----
# 画面はy下向きが正なので南北(北=+)を反転させる。
PAD = 80
SCALE = 0.85  # px per meter
VIEW_W = 640
VIEW_H = 1000


def m_to_px(pt_m):
    x_m, y_m = pt_m
    px = PAD + (x_m + 250) * SCALE
    py = VIEW_H - PAD - (y_m + 620) * SCALE
    return px, py


onsen_px = m_to_px(onsen_xy)
south_px = m_to_px(south_xy)
center_px = m_to_px(center_xy)
north_px = m_to_px(north_xy)
site_tl = m_to_px((site_x0, site_y1))  # top-left (north-west)
site_br = m_to_px((site_x1, site_y0))  # bottom-right (south-east)
site_w_px = abs(site_br[0] - site_tl[0])
site_h_px = abs(site_br[1] - site_tl[1])
radius_px = RADIUS_M * SCALE

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" font-family="'IPAGothic','Noto Sans JP',sans-serif">
  <style>
    .lbl {{ font-size: 15px; fill: #1a202c; }}
    .lbl-small {{ font-size: 12px; fill: #4a5568; }}
    .lbl-red {{ font-size: 14px; fill: #c53030; font-weight: bold; }}
  </style>
  <rect x="0" y="0" width="{VIEW_W}" height="{VIEW_H}" fill="#fafaf7"/>
  <text x="{VIEW_W/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1a202c">
    木野温泉 半径500m規制円と対象地(木野大通東13丁目)の位置関係(概算)
  </text>

  <!-- 500m規制円 -->
  <circle cx="{onsen_px[0]:.1f}" cy="{onsen_px[1]:.1f}" r="{radius_px:.1f}"
          fill="#e53e3e" fill-opacity="0.10" stroke="#c53030" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="{onsen_px[0]+radius_px*0.55:.1f}" y="{onsen_px[1]-radius_px*0.55:.1f}" class="lbl-red">
    500m規制円(推定)
  </text>

  <!-- 対象地 概形矩形(面積等価) -->
  <rect x="{min(site_tl[0],site_br[0]):.1f}" y="{min(site_tl[1],site_br[1]):.1f}"
        width="{site_w_px:.1f}" height="{site_h_px:.1f}"
        fill="#2b6cb0" fill-opacity="0.25" stroke="#2b6cb0" stroke-width="2"/>

  <!-- 木野温泉→各点の補助線 -->
  <line x1="{onsen_px[0]:.1f}" y1="{onsen_px[1]:.1f}" x2="{south_px[0]:.1f}" y2="{south_px[1]:.1f}" stroke="#718096" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="{onsen_px[0]:.1f}" y1="{onsen_px[1]:.1f}" x2="{center_px[0]:.1f}" y2="{center_px[1]:.1f}" stroke="#718096" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="{onsen_px[0]:.1f}" y1="{onsen_px[1]:.1f}" x2="{north_px[0]:.1f}" y2="{north_px[1]:.1f}" stroke="#718096" stroke-width="1" stroke-dasharray="4,3"/>

  <!-- 木野温泉 -->
  <circle cx="{onsen_px[0]:.1f}" cy="{onsen_px[1]:.1f}" r="7" fill="#c53030"/>
  <text x="{onsen_px[0]+12:.1f}" y="{onsen_px[1]+5:.1f}" class="lbl-red">健康ハウス木野温泉(10丁目)</text>

  <!-- 南端 -->
  <rect x="{south_px[0]-6:.1f}" y="{south_px[1]-6:.1f}" width="12" height="12" fill="#1a365d"/>
  <text x="{south_px[0]+12:.1f}" y="{south_px[1]-4:.1f}" class="lbl">南端(推定) {d_south:.0f}m</text>

  <!-- 中心 -->
  <rect x="{center_px[0]-6:.1f}" y="{center_px[1]-6:.1f}" width="12" height="12" fill="#2f855a"/>
  <text x="{center_px[0]+12:.1f}" y="{center_px[1]+4:.1f}" class="lbl">中心点 {d_center:.0f}m</text>

  <!-- 北端 -->
  <rect x="{north_px[0]-6:.1f}" y="{north_px[1]-6:.1f}" width="12" height="12" fill="#553c9a"/>
  <text x="{north_px[0]+12:.1f}" y="{north_px[1]+4:.1f}" class="lbl">北端(推定) {d_north:.0f}m</text>

  <text x="20" y="{VIEW_H-40}" class="lbl-small">凡例: 赤破線円=木野温泉から半径500m(北海道温泉保護対策要綱の推定離隔距離)</text>
  <text x="20" y="{VIEW_H-22}" class="lbl-small">     青矩形=対象地の概形(面積等価 13,285㎡、実際の筆界形状ではない)</text>
</svg>
'''

with open("svg_diagram.svg", "w", encoding="utf-8") as f:
    f.write(svg)

print("saved: svg_diagram.svg")

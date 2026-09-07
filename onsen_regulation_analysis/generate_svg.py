#!/usr/bin/env python3
"""results.json から単体表示可能なSVG図面(svg_diagram.svg)を生成する。
folium/matplotlib非依存で、ブラウザで直接開いて確認できる。"""
import json
import math

with open("results.json", "r", encoding="utf-8") as f:
    R = json.load(f)

ONSEN = tuple(R["onsen_coords"])
HOSPITAL = tuple(R["hospital_coords"])  # 帯広徳洲会病院(木野西通14丁目) ※温泉の有無は未確認
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
hospital_xy = to_xy(HOSPITAL)
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
h_south = R["distance_from_hospital_m"]["to_south_end"]
h_center = R["distance_from_hospital_m"]["to_center"]
h_north = R["distance_from_hospital_m"]["to_north_end"]

# ---- SVG座標系: メートル(東西=x, 南北=y)を画面座標(px)へ変換 ----
# 画面はy下向きが正なので南北(北=+)を反転させる。木野温泉・病院候補
# 双方の500m円が収まるよう、実座標の外接範囲からPAD/SCALEを決める。
PAD = 90
SCALE = 0.45  # px per meter
X_MIN, X_MAX = -1090.0, 820.0
Y_MIN, Y_MAX = -610.0, 1540.0
RADIUS_600_M = 600.0
VIEW_W = round((X_MAX - X_MIN) * SCALE) + PAD * 2
VIEW_H = round((Y_MAX - Y_MIN) * SCALE) + PAD * 2


def m_to_px(pt_m):
    x_m, y_m = pt_m
    px = PAD + (x_m - X_MIN) * SCALE
    py = VIEW_H - PAD - (y_m - Y_MIN) * SCALE
    return px, py


onsen_px = m_to_px(onsen_xy)
hospital_px = m_to_px(hospital_xy)
south_px = m_to_px(south_xy)
center_px = m_to_px(center_xy)
north_px = m_to_px(north_xy)
site_tl = m_to_px((site_x0, site_y1))  # top-left (north-west)
site_br = m_to_px((site_x1, site_y0))  # bottom-right (south-east)
site_w_px = abs(site_br[0] - site_tl[0])
site_h_px = abs(site_br[1] - site_tl[1])
radius_px = RADIUS_M * SCALE
radius_600_px = RADIUS_600_M * SCALE

# 木野温泉の600m円に入る南端側の区間(南端→北端の代表線ベース)
bc_onsen_600 = R["boundary_crossing"]["kino_onsen"]["600"]
band_px = None
if bc_onsen_600["status"] == "partial":
    band_from_px = m_to_px((south_xy[0], south_xy[1] + bc_onsen_600["from_south_m"]))
    band_to_px = m_to_px((south_xy[0], south_xy[1] + bc_onsen_600["to_south_m"]))
    band_px = (min(band_from_px[1], band_to_px[1]), abs(band_to_px[1] - band_from_px[1]))

# 病院候補への最接近点(南端→北端の代表線上)
bc_hosp = R["boundary_crossing"]["hospital"]
_dx, _dy = north_xy[0] - south_xy[0], north_xy[1] - south_xy[1]
_sx, _sy = south_xy[0] - hospital_xy[0], south_xy[1] - hospital_xy[1]
_t = max(0.0, min(1.0, -(_sx * _dx + _sy * _dy) / (_dx * _dx + _dy * _dy)))
closest_xy = (south_xy[0] + _t * _dx, south_xy[1] + _t * _dy)
closest_px = m_to_px(closest_xy)

band_svg = ""
if band_px:
    band_width_m = bc_onsen_600["to_south_m"] - bc_onsen_600["from_south_m"]
    band_svg = (
        f'\n  <!-- 木野温泉の600m円に入る南端側の区間 -->\n'
        f'  <rect x="{min(site_tl[0], site_br[0]):.1f}" y="{band_px[0]:.1f}" '
        f'width="{site_w_px:.1f}" height="{band_px[1]:.1f}" '
        f'fill="#c98a1f" fill-opacity="0.5" stroke="#c98a1f" stroke-width="1.5"/>\n'
        f'  <text x="{min(site_tl[0], site_br[0])-10:.1f}" y="{band_px[0]+band_px[1]*0.7:.1f}" '
        f'text-anchor="end" font-size="13" font-weight="bold" fill="#9a6b1f">'
        f'南端から約{band_width_m:.0f}m区間(600m円内)</text>\n'
    )

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" font-family="'IPAGothic','Noto Sans JP',sans-serif">
  <style>
    .lbl {{ font-size: 15px; fill: #1a202c; }}
    .lbl-small {{ font-size: 12px; fill: #4a5568; }}
    .lbl-red {{ font-size: 14px; fill: #c53030; font-weight: bold; }}
    .lbl-purple {{ font-size: 14px; fill: #6b4fa0; font-weight: bold; }}
  </style>
  <rect x="0" y="0" width="{VIEW_W}" height="{VIEW_H}" fill="#fafaf7"/>
  <text x="{VIEW_W/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1a202c">
    木野温泉・病院候補の500m/600m円と対象地(木野大通東13丁目)の位置関係(概算)
  </text>

  <!-- 600m円(参考): 健康ハウス木野温泉 -->
  <circle cx="{onsen_px[0]:.1f}" cy="{onsen_px[1]:.1f}" r="{radius_600_px:.1f}"
          fill="none" stroke="#c53030" stroke-width="1.3" stroke-dasharray="2,6" stroke-opacity="0.6"/>

  <!-- 500m規制円: 健康ハウス木野温泉 -->
  <circle cx="{onsen_px[0]:.1f}" cy="{onsen_px[1]:.1f}" r="{radius_px:.1f}"
          fill="#e53e3e" fill-opacity="0.10" stroke="#c53030" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="{onsen_px[0]+radius_px*0.55:.1f}" y="{onsen_px[1]-radius_px*0.55:.1f}" class="lbl-red">
    500m規制円(推定)
  </text>
  <text x="{onsen_px[0]-radius_600_px*0.35:.1f}" y="{onsen_px[1]+radius_600_px*0.85:.1f}" class="lbl-red">
    600m円(参考)
  </text>

  <!-- 600m円(参考): 帯広徳洲会病院 -->
  <circle cx="{hospital_px[0]:.1f}" cy="{hospital_px[1]:.1f}" r="{radius_600_px:.1f}"
          fill="none" stroke="#6b4fa0" stroke-width="1.3" stroke-dasharray="2,6" stroke-opacity="0.6"/>

  <!-- 500m円(候補・未確認): 帯広徳洲会病院 -->
  <circle cx="{hospital_px[0]:.1f}" cy="{hospital_px[1]:.1f}" r="{radius_px:.1f}"
          fill="#6b4fa0" fill-opacity="0.08" stroke="#6b4fa0" stroke-width="2" stroke-dasharray="3,5"/>
  <text x="{hospital_px[0]-radius_600_px*0.95:.1f}" y="{hospital_px[1]-radius_px*0.55:.1f}" class="lbl-purple">
    500m円(未確認・候補)
  </text>
  <text x="{hospital_px[0]-radius_600_px*0.95:.1f}" y="{hospital_px[1]-radius_px*0.55+20:.1f}" class="lbl-purple">
    (外側の淡い点線=600m円)
  </text>

  <!-- 対象地 概形矩形(面積等価) -->
  <rect x="{min(site_tl[0],site_br[0]):.1f}" y="{min(site_tl[1],site_br[1]):.1f}"
        width="{site_w_px:.1f}" height="{site_h_px:.1f}"
        fill="#2b6cb0" fill-opacity="0.25" stroke="#2b6cb0" stroke-width="2"/>
{band_svg}
  <!-- 病院候補への最接近点 -->
  <circle cx="{closest_px[0]:.1f}" cy="{closest_px[1]:.1f}" r="6" fill="none" stroke="#6b4fa0" stroke-width="2"/>
  <text x="{closest_px[0]-12:.1f}" y="{closest_px[1]-8:.1f}" text-anchor="end" font-size="13" font-weight="bold" fill="#6b4fa0">最接近点 約{bc_hosp['closest_approach_m']:.1f}m(病院候補)</text>

  <!-- 木野温泉→各点の補助線 -->
  <line x1="{onsen_px[0]:.1f}" y1="{onsen_px[1]:.1f}" x2="{south_px[0]:.1f}" y2="{south_px[1]:.1f}" stroke="#718096" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="{onsen_px[0]:.1f}" y1="{onsen_px[1]:.1f}" x2="{center_px[0]:.1f}" y2="{center_px[1]:.1f}" stroke="#718096" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="{onsen_px[0]:.1f}" y1="{onsen_px[1]:.1f}" x2="{north_px[0]:.1f}" y2="{north_px[1]:.1f}" stroke="#718096" stroke-width="1" stroke-dasharray="4,3"/>

  <!-- 病院候補→各点の補助線 -->
  <line x1="{hospital_px[0]:.1f}" y1="{hospital_px[1]:.1f}" x2="{south_px[0]:.1f}" y2="{south_px[1]:.1f}" stroke="#6b4fa0" stroke-width="1" stroke-dasharray="2,3" stroke-opacity="0.6"/>
  <line x1="{hospital_px[0]:.1f}" y1="{hospital_px[1]:.1f}" x2="{center_px[0]:.1f}" y2="{center_px[1]:.1f}" stroke="#6b4fa0" stroke-width="1" stroke-dasharray="2,3" stroke-opacity="0.6"/>
  <line x1="{hospital_px[0]:.1f}" y1="{hospital_px[1]:.1f}" x2="{north_px[0]:.1f}" y2="{north_px[1]:.1f}" stroke="#6b4fa0" stroke-width="1" stroke-dasharray="2,3" stroke-opacity="0.6"/>

  <!-- 木野温泉 -->
  <circle cx="{onsen_px[0]:.1f}" cy="{onsen_px[1]:.1f}" r="7" fill="#c53030"/>
  <text x="{onsen_px[0]+12:.1f}" y="{onsen_px[1]+5:.1f}" class="lbl-red">健康ハウス木野温泉(10丁目)</text>

  <!-- 帯広徳洲会病院(未確認) -->
  <circle cx="{hospital_px[0]:.1f}" cy="{hospital_px[1]:.1f}" r="7" fill="#6b4fa0"/>
  <text x="{hospital_px[0]+12:.1f}" y="{hospital_px[1]+5:.1f}" class="lbl-purple">帯広徳洲会病院(14丁目・未確認)</text>

  <!-- 南端 -->
  <rect x="{south_px[0]-6:.1f}" y="{south_px[1]-6:.1f}" width="12" height="12" fill="#1a365d"/>
  <text x="{south_px[0]+12:.1f}" y="{south_px[1]-4:.1f}" class="lbl">南端(推定) 木野温泉{d_south:.0f}m／病院候補{h_south:.0f}m</text>

  <!-- 中心 -->
  <rect x="{center_px[0]-6:.1f}" y="{center_px[1]-6:.1f}" width="12" height="12" fill="#2f855a"/>
  <text x="{center_px[0]+12:.1f}" y="{center_px[1]+4:.1f}" class="lbl">中心点 木野温泉{d_center:.0f}m／病院候補{h_center:.0f}m</text>

  <!-- 北端 -->
  <rect x="{north_px[0]-6:.1f}" y="{north_px[1]-6:.1f}" width="12" height="12" fill="#553c9a"/>
  <text x="{north_px[0]+12:.1f}" y="{north_px[1]+4:.1f}" class="lbl">北端(推定) 木野温泉{d_north:.0f}m／病院候補{h_north:.0f}m</text>

  <text x="20" y="{VIEW_H-76}" class="lbl-small">凡例: 赤破線円=健康ハウス木野温泉から半径500m(北海道温泉保護対策要綱の推定離隔距離)</text>
  <text x="20" y="{VIEW_H-58}" class="lbl-small">     紫点線円=帯広徳洲会病院を中心と仮定した半径500m(温泉法上の源泉の有無は未確認)</text>
  <text x="20" y="{VIEW_H-40}" class="lbl-small">     外側の淡い点線=600m円(北海道内の運用で目安になり得るとの情報を踏まえた参考円)</text>
  <text x="20" y="{VIEW_H-22}" class="lbl-small">     青矩形=対象地の概形／橙色部分=木野温泉の600m円に入る区間(面積等価、実際の筆界形状ではない)</text>
</svg>
'''

with open("svg_diagram.svg", "w", encoding="utf-8") as f:
    f.write(svg)

print("saved: svg_diagram.svg")

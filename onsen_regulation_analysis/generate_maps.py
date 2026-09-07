#!/usr/bin/env python3
"""
音更町木野 温泉掘削500m規制検証 - 可視化生成スクリプト

distance_calc.py の結果(results.json)を読み込み、
  1. folium によるインタラクティブHTML地図 (map_interactive.html)
  2. matplotlib による静止画 (map_static.png)
を生成する。

対象地の敷地形状は「筆界(公図)データが未取得のため、面積等価・南北推定端点
基準の概形矩形」として描画している。実際の敷地形状・向きとは異なる可能性が
ある点に留意すること(詳細はREPORT.md参照)。
"""
import json
import math

import folium
import matplotlib
import matplotlib.font_manager as fm
import matplotlib.pyplot as plt
import matplotlib.patches as patches

_JP_FONT_PATH = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"
fm.fontManager.addfont(_JP_FONT_PATH)
matplotlib.rcParams["font.family"] = fm.FontProperties(fname=_JP_FONT_PATH).get_name()
matplotlib.rcParams["axes.unicode_minus"] = False

with open("results.json", "r", encoding="utf-8") as f:
    R = json.load(f)

ONSEN = tuple(R["onsen_coords"])
HONOMAI = tuple(R["honomai_coords"])
SOUTH = tuple(R["target_points_latlng"]["south_end"])
CENTER = tuple(R["target_points_latlng"]["center"])
NORTH = tuple(R["target_points_latlng"]["north_end"])
RADIUS_M = 500.0
SITE_AREA_SQM = 13285.0  # 対象地合計地積 (3番11 + 4番1)

# ---------------------------------------------------------------
# 1. folium インタラクティブ地図
# ---------------------------------------------------------------
fmap = folium.Map(location=CENTER, zoom_start=16, tiles="OpenStreetMap")

folium.Circle(
    location=ONSEN,
    radius=RADIUS_M,
    color="#d64550",
    weight=2,
    fill=True,
    fill_color="#d64550",
    fill_opacity=0.12,
    tooltip="健康ハウス木野温泉 半径500m規制円(北海道温泉保護対策要綱・推定)",
).add_to(fmap)

folium.Marker(
    location=ONSEN,
    tooltip="健康ハウス木野温泉(木野大通東10丁目6-1) ※10丁目代表点で近似",
    icon=folium.Icon(color="red", icon="tint"),
).add_to(fmap)

folium.Marker(
    location=HONOMAI,
    tooltip="天然温泉 鳳乃舞 音更(木野西通17丁目) ※17丁目代表点で近似",
    icon=folium.Icon(color="orange", icon="tint"),
).add_to(fmap)

for label, pt, color in [
    ("対象地 南端(推定)", SOUTH, "blue"),
    ("対象地 中心点(13丁目代表点)", CENTER, "green"),
    ("対象地 北端(推定)", NORTH, "purple"),
]:
    folium.Marker(
        location=pt,
        tooltip=f"{label}",
        icon=folium.Icon(color=color, icon="home"),
    ).add_to(fmap)

# 敷地概形(南端〜北端を結ぶ帯として簡易表示。実際の筆界とは異なる)
folium.PolyLine(
    locations=[SOUTH, CENTER, NORTH],
    color="#2b6cb0",
    weight=6,
    opacity=0.7,
    tooltip="対象地(木野大通東13丁目3番11・4番1) 概形ライン(南北方向)",
).add_to(fmap)

folium.map.LayerControl().add_to(fmap)
fmap.save("map_interactive.html")
print("saved: map_interactive.html")

# ---------------------------------------------------------------
# 2. matplotlib 静止画 (ローカル平面座標に変換して描画)
# ---------------------------------------------------------------
lat0 = ONSEN[0]
M_PER_DEG_LAT = 111320.0
M_PER_DEG_LNG = 111320.0 * math.cos(math.radians(lat0))


def to_xy(pt):
    lat, lng = pt
    x = (lng - ONSEN[1]) * M_PER_DEG_LNG
    y = (lat - ONSEN[0]) * M_PER_DEG_LAT
    return x, y


onsen_xy = to_xy(ONSEN)
honomai_xy = to_xy(HONOMAI)
south_xy = to_xy(SOUTH)
center_xy = to_xy(CENTER)
north_xy = to_xy(NORTH)

depth_m = math.hypot(north_xy[0] - south_xy[0], north_xy[1] - south_xy[1])
width_m = SITE_AREA_SQM / depth_m
cx = (south_xy[0] + north_xy[0]) / 2
site_x0, site_x1 = cx - width_m / 2, cx + width_m / 2
site_y0, site_y1 = south_xy[1], north_xy[1]

fig, ax = plt.subplots(figsize=(9, 9))

circle = patches.Circle(onsen_xy, RADIUS_M, facecolor="#d64550", alpha=0.12,
                         edgecolor="#d64550", linewidth=2,
                         label="木野温泉 半径500m規制円(推定)")
ax.add_patch(circle)

site_rect = patches.Rectangle((site_x0, site_y0), width_m, depth_m,
                               facecolor="#2b6cb0", alpha=0.25,
                               edgecolor="#2b6cb0", linewidth=2,
                               label=f"対象地 概形(面積等価 {SITE_AREA_SQM:,.0f}㎡)")
ax.add_patch(site_rect)

ax.plot(*onsen_xy, "o", color="#d64550", markersize=10)
ax.annotate("健康ハウス木野温泉\n(10丁目)", onsen_xy, textcoords="offset points",
            xytext=(10, 10), fontsize=9, color="#d64550")

ax.plot(*south_xy, "s", color="#1a365d", markersize=8)
ax.annotate(f"南端(推定)\n{R['distance_from_kino_onsen_m']['to_south_end']:.0f}m",
            south_xy, textcoords="offset points", xytext=(10, -25), fontsize=8)

ax.plot(*center_xy, "s", color="#2f855a", markersize=8)
ax.annotate(f"中心点\n{R['distance_from_kino_onsen_m']['to_center']:.0f}m",
            center_xy, textcoords="offset points", xytext=(10, 5), fontsize=8)

ax.plot(*north_xy, "s", color="#553c9a", markersize=8)
ax.annotate(f"北端(推定)\n{R['distance_from_kino_onsen_m']['to_north_end']:.0f}m",
            north_xy, textcoords="offset points", xytext=(10, 10), fontsize=8)

# 木野温泉から各点への直線
for pt_xy in (south_xy, center_xy, north_xy):
    ax.plot([onsen_xy[0], pt_xy[0]], [onsen_xy[1], pt_xy[1]], "--",
            color="gray", linewidth=1)

ax.set_xlabel("東西方向 (m) ※木野温泉を原点(0,0)とする概算平面座標")
ax.set_ylabel("南北方向 (m)")
ax.set_title("木野温泉500m規制円と対象地(木野大通東13丁目)の位置関係(概算)")
ax.set_aspect("equal")
ax.legend(loc="lower right", fontsize=8)
ax.grid(True, linestyle=":", alpha=0.5)

margin = 150
all_x = [onsen_xy[0], site_x0, site_x1]
all_y = [onsen_xy[1] - RADIUS_M, site_y1]
ax.set_xlim(min(all_x) - margin, max(all_x) + margin)
ax.set_ylim(min(all_y) - margin, max(all_y) + margin)

fig.tight_layout()
fig.savefig("map_static.png", dpi=160)
print("saved: map_static.png")

print(f"\n[参考] 敷地概形モデル: 南北奥行き={depth_m:.1f}m, 東西間口={width_m:.1f}m "
      f"(面積等価矩形、実際の筆界形状ではない)")

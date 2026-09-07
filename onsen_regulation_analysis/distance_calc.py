#!/usr/bin/env python3
"""
音更町木野 温泉掘削500m規制検証 - 距離計算スクリプト

座標データ出典:
  Geolonia 住所データ (https://github.com/geolonia/japanese-addresses, CC BY 4.0)
  国土交通省「位置参照情報」を元にした町丁目(丁目)代表点座標。
  ※ 地番(番地)単位の座標ではなく「丁目」単位の代表点であることに注意。
  実際の筆界(パーセル境界)座標ではないため、最終判断には十勝総合振興局・
  音更町への公図/実測照会が必須。

このスクリプトは:
  1. 木野温泉(健康ハウス木野温泉)と対象地(13丁目)の直線距離を算出
  2. 対象地の「南端・中心・北端」の推定座標を、隣接丁目(12丁目/14丁目)の
     代表点から街区スパンを補間して作成し、それぞれの距離を算出
  3. 参考として天然温泉 鳳乃舞 音更 (17丁目)との距離も算出
"""
import json
import math

# ---------------------------------------------------------------
# 入力座標 (Geolonia 住所データより取得した丁目代表点)
# ---------------------------------------------------------------
POINTS = {
    "kino_onsen_10chome":   (42.954908, 143.208316),  # 健康ハウス木野温泉 (木野大通東10丁目6-1)
    "target_12chome":       (42.958588, 143.209200),  # 木野大通東12丁目 代表点(補間用)
    "target_13chome":       (42.961309, 143.209271),  # 木野大通東13丁目 代表点(対象地=ここ)
    "target_14chome":       (42.964122, 143.210410),  # 木野大通東14丁目 代表点(補間用)
    "honomai_17chome":      (42.970846, 143.202172),  # 天然温泉 鳳乃舞 音更 (木野西通17丁目)
}


def haversine_m(p1, p2):
    """2点間の大圏距離(メートル)をHaversine公式で算出"""
    lat1, lon1 = p1
    lat2, lon2 = p2
    r = 6371000.0  # 地球平均半径(m)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def midpoint(p1, p2):
    """簡易中点(短距離用の線形補間で十分な精度)"""
    return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)


def main():
    onsen = POINTS["kino_onsen_10chome"]
    p12 = POINTS["target_12chome"]
    p13 = POINTS["target_13chome"]
    p14 = POINTS["target_14chome"]
    honomai = POINTS["honomai_17chome"]

    # 対象地(13丁目)の南端/北端を、隣接丁目境界の中点として推定
    south_end = midpoint(p12, p13)
    center = p13
    north_end = midpoint(p13, p14)

    results = {
        "block_span_check_m": {
            "12chome_to_13chome": haversine_m(p12, p13),
            "13chome_to_14chome": haversine_m(p13, p14),
        },
        "target_points_latlng": {
            "south_end": south_end,
            "center": center,
            "north_end": north_end,
        },
        "distance_from_kino_onsen_m": {
            "to_south_end": haversine_m(onsen, south_end),
            "to_center": haversine_m(onsen, center),
            "to_north_end": haversine_m(onsen, north_end),
        },
        "distance_from_honomai_m": {
            "to_south_end": haversine_m(honomai, south_end),
            "to_center": haversine_m(honomai, center),
            "to_north_end": haversine_m(honomai, north_end),
        },
        "onsen_coords": onsen,
        "honomai_coords": honomai,
    }

    print(json.dumps(results, indent=2, ensure_ascii=False))

    with open("results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n=== サマリー ===")
    print(f"街区スパン確認: 12→13丁目 = {results['block_span_check_m']['12chome_to_13chome']:.1f} m, "
          f"13→14丁目 = {results['block_span_check_m']['13chome_to_14chome']:.1f} m")
    print(f"木野温泉 → 対象地 南端   : {results['distance_from_kino_onsen_m']['to_south_end']:.1f} m")
    print(f"木野温泉 → 対象地 中心点 : {results['distance_from_kino_onsen_m']['to_center']:.1f} m")
    print(f"木野温泉 → 対象地 北端   : {results['distance_from_kino_onsen_m']['to_north_end']:.1f} m")
    print(f"鳳乃舞   → 対象地 南端   : {results['distance_from_honomai_m']['to_south_end']:.1f} m")
    print(f"鳳乃舞   → 対象地 中心点 : {results['distance_from_honomai_m']['to_center']:.1f} m")
    print(f"鳳乃舞   → 対象地 北端   : {results['distance_from_honomai_m']['to_north_end']:.1f} m")


if __name__ == "__main__":
    main()

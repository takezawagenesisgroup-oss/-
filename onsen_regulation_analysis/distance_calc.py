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
  4. 参考として帯広徳洲会病院(木野西通14丁目、温泉利用の有無は未確認)との距離も算出

【帯広徳洲会病院について】
利用者から「温泉のようだ」との情報提供があったが、2026年9月時点の公開ウェブ情報
(病院公式サイト・各種医療機関検索サイト等)からは、同院が北海道温泉保護対策要綱上の
「温泉」(温泉法に基づく源泉)を保有しているか確認できていない。十勝地方はモール泉の
賦存地域であり、病院・介護施設が独自に源泉を掘削している例もあるため可能性は否定でき
ないが、本スクリプトでの計算はあくまで「仮に源泉があった場合の位置関係」を把握するため
の参考値であり、実在・座標とも要確認。
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
    "hospital_14chome_west": (42.963291, 143.202452),  # 帯広徳洲会病院(木野西通14丁目2-1) ※温泉の有無は未確認
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


def to_local_xy(pt, origin):
    """originを原点(0,0)とする平面直角近似座標(東西x, 南北y メートル)に変換。
    数百m規模の範囲であれば十分な精度。"""
    lat, lng = pt
    lat0, lng0 = origin
    m_per_deg_lat = 111320.0
    m_per_deg_lng = 111320.0 * math.cos(math.radians(lat0))
    return ((lng - lng0) * m_per_deg_lng, (lat - lat0) * m_per_deg_lat)


def boundary_crossings(source_latlng, south_latlng, north_latlng, thresholds, origin):
    """南端→北端を結ぶ直線(対象地の南北方向の代表線)が、
    sourceを中心とする各半径(thresholds, メートル)の円とどこで交わるかを求める。

    戻り値: 各thresholdについて
      - "status": "clear"(線分全体が圏外) / "partial"(一部が圏内) / "engulfed"(線分全体が圏内)
      - "from_south_m" / "to_south_m": 圏内区間の南端からの距離(m)。partial時のみ。
      - "closest_approach_m": source から線分(延長含む)までの最短距離
    """
    src = to_local_xy(source_latlng, origin)
    south = to_local_xy(south_latlng, origin)
    north = to_local_xy(north_latlng, origin)

    dx, dy = north[0] - south[0], north[1] - south[1]
    seg_len = math.hypot(dx, dy)
    sx, sy = south[0] - src[0], south[1] - src[1]

    a = dx * dx + dy * dy
    b = 2 * (sx * dx + sy * dy)
    c = sx * sx + sy * sy

    t_closest = max(0.0, min(1.0, -b / (2 * a)))
    closest_approach_m = math.hypot(sx + t_closest * dx, sy + t_closest * dy)

    out = {"closest_approach_m": closest_approach_m, "segment_length_m": seg_len}
    for thresh in thresholds:
        disc = b * b - 4 * a * (c - thresh * thresh)
        dist_south = math.hypot(sx, sy)
        dist_north = math.hypot(sx + dx, sy + dy)
        if disc < 0:
            # 円は線分(延長含む)に到達しない -> 南端・北端とも同じ側のはず
            status = "engulfed" if max(dist_south, dist_north) < thresh else "clear"
            out[thresh] = {"status": status}
            continue
        sq = math.sqrt(disc)
        t1, t2 = sorted([(-b - sq) / (2 * a), (-b + sq) / (2 * a)])
        t1c, t2c = max(0.0, min(1.0, t1)), max(0.0, min(1.0, t2))
        if t1 > 1.0 or t2 < 0.0:
            status = "engulfed" if max(dist_south, dist_north) < thresh else "clear"
            out[thresh] = {"status": status}
        elif t1c <= 0.0 and t2c >= 1.0:
            out[thresh] = {"status": "engulfed"}
        else:
            out[thresh] = {
                "status": "partial",
                "from_south_m": t1c * seg_len,
                "to_south_m": t2c * seg_len,
            }
    return out


def main():
    onsen = POINTS["kino_onsen_10chome"]
    p12 = POINTS["target_12chome"]
    p13 = POINTS["target_13chome"]
    p14 = POINTS["target_14chome"]
    honomai = POINTS["honomai_17chome"]
    hospital = POINTS["hospital_14chome_west"]

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
        "distance_from_hospital_m": {
            "to_south_end": haversine_m(hospital, south_end),
            "to_center": haversine_m(hospital, center),
            "to_north_end": haversine_m(hospital, north_end),
        },
        "onsen_coords": onsen,
        "honomai_coords": honomai,
        "hospital_coords": hospital,
    }

    # 500m/600mそれぞれの円が、対象地の南北方向の代表線(南端→北端)の
    # どの区間と交わるかを算出する(北海道の運用で600mも一応の目安になり得る
    # との情報を受け、500mと600mを比較できるようにするための追加計算)。
    thresholds = (500.0, 600.0)
    results["boundary_crossing"] = {
        "kino_onsen": boundary_crossings(onsen, south_end, north_end, thresholds, origin=onsen),
        "hospital": boundary_crossings(hospital, south_end, north_end, thresholds, origin=onsen),
    }
    # JSON化のためキーを文字列化
    for src_key in results["boundary_crossing"]:
        d = results["boundary_crossing"][src_key]
        for t in thresholds:
            d[str(int(t))] = d.pop(t)

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
    print(f"徳洲会病院(未確認) → 対象地 南端   : {results['distance_from_hospital_m']['to_south_end']:.1f} m")
    print(f"徳洲会病院(未確認) → 対象地 中心点 : {results['distance_from_hospital_m']['to_center']:.1f} m")
    print(f"徳洲会病院(未確認) → 対象地 北端   : {results['distance_from_hospital_m']['to_north_end']:.1f} m")

    print("\n=== 500m/600m 円との交差(対象地 南端→北端の代表線ベース) ===")
    for src_key, src_label in [("kino_onsen", "木野温泉"), ("hospital", "病院候補(未確認)")]:
        bc = results["boundary_crossing"][src_key]
        print(f"[{src_label}] 代表線への最短距離: {bc['closest_approach_m']:.1f} m "
              f"(代表線の全長 {bc['segment_length_m']:.1f} m)")
        for t in ("500", "600"):
            info = bc[t]
            if info["status"] == "clear":
                print(f"  {t}m円: 対象地は圏外(交差なし)")
            elif info["status"] == "engulfed":
                print(f"  {t}m円: 対象地の代表線が全区間 圏内")
            else:
                print(f"  {t}m円: 南端から{info['from_south_m']:.1f}m〜{info['to_south_m']:.1f}mの区間が圏内 "
                      f"(区間幅 {info['to_south_m']-info['from_south_m']:.1f}m)")


if __name__ == "__main__":
    main()

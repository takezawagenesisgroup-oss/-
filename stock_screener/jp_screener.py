"""日本株スクリーニング (J-Quants API)。

未検証事項(引継書5節参照):
- weekly_margin_interest / short_selling / trades_spec のパス・フィールド名は
  公式ドキュメント(https://jpx-jquants.com/)を見ながら実装したが未検証。
- market_flowの閾値(MARKET_FLOW_RANGE)は実データを見ずに置いた仮の値。
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Optional

import pandas as pd
import requests

from common import Signal, composite_score, format_percent, format_ratio, format_yen, inverse_linear_score, linear_score

JQUANTS_BASE_URL = "https://api.jquants.com/v1"

WEIGHTS = {
    "volume_spike": 2.0,
    "momentum": 1.5,
    "profit_growth": 2.0,
    "margin_change": 1.0,
    "short_cover": 1.0,
    "market_flow": 1.0,
}

# 閾値は初期値(仮置き)。実データの分布を見ながら調整すること(引継書4節/5節参照)。
VOLUME_SPIKE_RANGE = (1.0, 5.0)
MOMENTUM_RANGE = (0.0, 100.0)
PROFIT_GROWTH_RANGE = (-20.0, 50.0)
MARGIN_CHANGE_RANGE = (-30.0, 30.0)
SHORT_COVER_RANGE = (-30.0, 30.0)
MARKET_FLOW_RANGE = (-1_000_000_000_000.0, 1_000_000_000_000.0)

MIN_SCORE = 55.0

PRIME_MARKET_CODE = "0111"  # プライム市場 (要確認)


class JQuantsClient:
    def __init__(self, mail: str, password: str):
        self._mail = mail
        self._password = password
        self._id_token: Optional[str] = None

    def _login(self) -> str:
        if self._id_token:
            return self._id_token
        resp = requests.post(
            f"{JQUANTS_BASE_URL}/token/auth_user",
            json={"mailaddress": self._mail, "password": self._password},
            timeout=30,
        )
        resp.raise_for_status()
        refresh_token = resp.json()["refreshToken"]

        resp = requests.post(
            f"{JQUANTS_BASE_URL}/token/auth_refresh",
            params={"refreshtoken": refresh_token},
            timeout=30,
        )
        resp.raise_for_status()
        self._id_token = resp.json()["idToken"]
        return self._id_token

    def _get(self, path: str, params: Optional[dict] = None) -> dict:
        token = self._login()
        resp = requests.get(
            f"{JQUANTS_BASE_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params or {},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def listed_info(self) -> list[dict]:
        return self._get("/listed/info").get("info", [])

    def daily_quotes(self, code: str, days: int = 60) -> pd.DataFrame:
        date_from = (date.today() - timedelta(days=days)).isoformat()
        data = self._get(
            "/prices/daily_quotes",
            {"code": code, "from": date_from, "to": date.today().isoformat()},
        ).get("daily_quotes", [])
        return pd.DataFrame(data)

    def statements(self, code: str) -> pd.DataFrame:
        data = self._get("/fins/statements", {"code": code}).get("statements", [])
        return pd.DataFrame(data)

    def weekly_margin_interest(self, code: str) -> pd.DataFrame:
        data = self._get("/markets/weekly_margin_interest", {"code": code}).get(
            "weekly_margin_interest", []
        )
        return pd.DataFrame(data)

    def short_selling(self, sector33_code: str) -> pd.DataFrame:
        data = self._get("/markets/short_selling", {"sector33code": sector33_code}).get(
            "short_selling", []
        )
        return pd.DataFrame(data)

    def trades_spec(self, section: str = "TSEPrime") -> pd.DataFrame:
        data = self._get("/markets/trades_spec", {"section": section}).get("trades_spec", [])
        return pd.DataFrame(data)


def _volume_spike_signal(quotes: pd.DataFrame) -> Signal:
    value = None
    if len(quotes) >= 21 and "Volume" in quotes.columns:
        recent = quotes.sort_values("Date").tail(21)
        avg20 = recent["Volume"].iloc[:-1].mean()
        latest = recent["Volume"].iloc[-1]
        if avg20:
            value = float(latest) / float(avg20)
    return Signal(
        "volume_spike", "出来高急増(20日平均比)", value,
        linear_score(value, *VOLUME_SPIKE_RANGE), WEIGHTS["volume_spike"], format_ratio(value),
    )


def _momentum_signal(quotes: pd.DataFrame) -> Signal:
    value = None
    if len(quotes) >= 20 and {"Low", "High", "Close"}.issubset(quotes.columns):
        recent = quotes.sort_values("Date").tail(20)
        low = recent["Low"].min()
        high = recent["High"].max()
        close = recent["Close"].iloc[-1]
        if high > low:
            value = float(close - low) / float(high - low) * 100
    return Signal(
        "momentum", "20日高安レンジ位置", value,
        linear_score(value, *MOMENTUM_RANGE), WEIGHTS["momentum"], format_percent(value),
    )


def _profit_growth_signal(statements: pd.DataFrame) -> Signal:
    value = None
    if not statements.empty and "OperatingProfit" in statements.columns:
        df = statements.dropna(subset=["OperatingProfit"]).sort_values("DisclosedDate")
        df = df[pd.to_numeric(df["OperatingProfit"], errors="coerce").notna()]
        if len(df) >= 5:
            latest = float(df["OperatingProfit"].iloc[-1])
            year_ago = float(df["OperatingProfit"].iloc[-5])  # 四半期4件前 ≈ 前年同期
            if year_ago:
                value = (latest - year_ago) / abs(year_ago) * 100
    return Signal(
        "profit_growth", "営業利益成長率(YoY)", value,
        linear_score(value, *PROFIT_GROWTH_RANGE), WEIGHTS["profit_growth"], format_percent(value),
    )


def _margin_change_signal(margin: pd.DataFrame) -> Signal:
    value = None
    if not margin.empty and "LongMarginTradeVolume" in margin.columns:
        df = margin.sort_values("Date")
        if len(df) >= 2:
            prev = float(df["LongMarginTradeVolume"].iloc[-2])
            latest = float(df["LongMarginTradeVolume"].iloc[-1])
            if prev:
                value = (latest - prev) / prev * 100
    return Signal(
        "margin_change", "信用買い残 週次変化率", value,
        linear_score(value, *MARGIN_CHANGE_RANGE), WEIGHTS["margin_change"], format_percent(value),
    )


def _short_cover_signal(short: pd.DataFrame) -> Signal:
    value = None
    required = {
        "ShortSellingWithRestrictionsTurnoverValue",
        "ShortSellingWithoutRestrictionsTurnoverValue",
        "SellingExcludingShortSellingTurnoverValue",
    }
    if not short.empty and required.issubset(short.columns):
        df = short.sort_values("Date").copy()
        short_value = df["ShortSellingWithRestrictionsTurnoverValue"] + df["ShortSellingWithoutRestrictionsTurnoverValue"]
        total_value = short_value + df["SellingExcludingShortSellingTurnoverValue"]
        df["short_ratio"] = (short_value / total_value.replace(0, pd.NA)) * 100
        df = df.dropna(subset=["short_ratio"])
        if len(df) >= 2:
            value = float(df["short_ratio"].iloc[-1] - df["short_ratio"].iloc[-2])
    return Signal(
        "short_cover", "空売り比率変化(買い戻し余地)", value,
        inverse_linear_score(value, *SHORT_COVER_RANGE), WEIGHTS["short_cover"], format_percent(value),
    )


def _market_flow_signal(trades_spec: pd.DataFrame) -> Signal:
    value = None
    required = {"ForeignersBalance", "ProprietaryBalance"}
    if not trades_spec.empty and required.issubset(trades_spec.columns):
        df = trades_spec.sort_values("PublishedDate")
        latest = df.iloc[-1]
        value = float(latest["ForeignersBalance"]) + float(latest["ProprietaryBalance"])
    return Signal(
        "market_flow", "海外+自己売買 買い越し額", value,
        linear_score(value, *MARKET_FLOW_RANGE), WEIGHTS["market_flow"], format_yen(value),
    )


def screen_real(limit: int = 30, min_score: float = MIN_SCORE) -> list[dict]:
    mail = os.environ["JQUANTS_MAIL"]
    password = os.environ["JQUANTS_PASSWORD"]
    client = JQuantsClient(mail, password)

    listed = client.listed_info()
    targets = [c for c in listed if c.get("MarketCode") == PRIME_MARKET_CODE][:limit]
    market_flow = _market_flow_signal(client.trades_spec("TSEPrime"))

    results = []
    for company in targets:
        code = company["Code"]
        sector33 = company.get("Sector33Code", "")

        quotes = client.daily_quotes(code)
        statements = client.statements(code)
        margin = client.weekly_margin_interest(code)
        short = client.short_selling(sector33) if sector33 else pd.DataFrame()

        signals = [
            _volume_spike_signal(quotes),
            _momentum_signal(quotes),
            _profit_growth_signal(statements),
            _margin_change_signal(margin),
            _short_cover_signal(short),
            market_flow,
        ]
        score = composite_score(signals)
        if score is not None and score >= min_score:
            results.append({
                "ticker": code,
                "name": company.get("CompanyName", code),
                "market": "日本株",
                "score": score,
                "signals": signals,
            })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results


_DEMO_STOCKS = [
    {"code": "7203", "name": "トヨタ自動車", "volume_spike": 2.8, "momentum": 82.0, "profit_growth": 18.5, "margin_change": 12.0, "short_cover": -8.5, "market_flow": 320_000_000_000.0},
    {"code": "9984", "name": "ソフトバンクグループ", "volume_spike": 4.1, "momentum": 91.0, "profit_growth": 35.0, "margin_change": -5.0, "short_cover": -15.0, "market_flow": 320_000_000_000.0},
    {"code": "6758", "name": "ソニーグループ", "volume_spike": 1.6, "momentum": 55.0, "profit_growth": 8.0, "margin_change": 3.0, "short_cover": 4.0, "market_flow": 320_000_000_000.0},
    {"code": "8306", "name": "三菱UFJフィナンシャル・グループ", "volume_spike": 1.2, "momentum": 40.0, "profit_growth": -3.0, "margin_change": -10.0, "short_cover": 10.0, "market_flow": 320_000_000_000.0},
    {"code": "4063", "name": "信越化学工業", "volume_spike": 3.3, "momentum": 76.0, "profit_growth": 22.0, "margin_change": 20.0, "short_cover": -20.0, "market_flow": 320_000_000_000.0},
]


def screen_demo() -> list[dict]:
    results = []
    for d in _DEMO_STOCKS:
        signals = [
            Signal("volume_spike", "出来高急増(20日平均比)", d["volume_spike"], linear_score(d["volume_spike"], *VOLUME_SPIKE_RANGE), WEIGHTS["volume_spike"], format_ratio(d["volume_spike"])),
            Signal("momentum", "20日高安レンジ位置", d["momentum"], linear_score(d["momentum"], *MOMENTUM_RANGE), WEIGHTS["momentum"], format_percent(d["momentum"])),
            Signal("profit_growth", "営業利益成長率(YoY)", d["profit_growth"], linear_score(d["profit_growth"], *PROFIT_GROWTH_RANGE), WEIGHTS["profit_growth"], format_percent(d["profit_growth"])),
            Signal("margin_change", "信用買い残 週次変化率", d["margin_change"], linear_score(d["margin_change"], *MARGIN_CHANGE_RANGE), WEIGHTS["margin_change"], format_percent(d["margin_change"])),
            Signal("short_cover", "空売り比率変化(買い戻し余地)", d["short_cover"], inverse_linear_score(d["short_cover"], *SHORT_COVER_RANGE), WEIGHTS["short_cover"], format_percent(d["short_cover"])),
            Signal("market_flow", "海外+自己売買 買い越し額", d["market_flow"], linear_score(d["market_flow"], *MARKET_FLOW_RANGE), WEIGHTS["market_flow"], format_yen(d["market_flow"])),
        ]
        score = composite_score(signals)
        results.append({"ticker": d["code"], "name": d["name"], "market": "日本株", "score": score, "signals": signals})

    results.sort(key=lambda r: r["score"], reverse=True)
    return results

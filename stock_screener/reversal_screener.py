"""短期反発(逆張り)候補スクリーニング。

jp_screener/us_screenerが「資金流入トレンドを後追いする」順張り型なのに対し、こちらは
「短期的に下落しているが下げ止まりの兆候がある」銘柄を検知する逆張り型。

「落ちるナイフを拾う」ことを避けるため、以下の2条件を _passes_reversal_gate() で
必須のゲートとして課している。合成スコアが高くても、これを満たさない銘柄は候補から
除外される:
  1. 実際に一定以上下落していること(drawdown <= MIN_DRAWDOWN_PCT)
  2. 出来高急増日の終値位置(volume_climax)か、安値の切り上げ(higher_low)の
     いずれかで下げ止まりが確認できること
"""

from __future__ import annotations

import os
from datetime import date
from typing import Optional

import pandas as pd
import yfinance as yf

from common import Signal, composite_score, format_number, format_percent, inverse_linear_score, linear_score
from jp_screener import PRIME_MARKET_CODE, JQuantsClient

WEIGHTS = {
    "drawdown": 1.5,
    "rsi_oversold": 2.0,
    "volume_climax": 2.0,
    "higher_low": 1.5,
    "volatility_contraction": 1.0,
    "short_squeeze": 1.0,
}

# 閾値は初期値(仮置き)。実データの分布を見ながら調整すること。
DRAWDOWN_RANGE = (-25.0, -5.0)
RSI_RANGE = (20.0, 50.0)
VOLUME_CLIMAX_RANGE = (30.0, 80.0)
HIGHER_LOW_RANGE = (20.0, 80.0)
VOL_CONTRACTION_RANGE = (-100.0, 50.0)
SHORT_SQUEEZE_RANGE = (0.0, 20.0)

MIN_SCORE = 55.0
MIN_DRAWDOWN_PCT = -8.0  # 20日高値から最低でもこれだけ下落していること
STABILIZATION_GATE_SCORE = 50.0  # higher_low/volume_climaxのどちらかがこの点数以上必要


def _rsi(closes: pd.Series, period: int = 14) -> Optional[float]:
    if len(closes) < period + 1:
        return None
    delta = closes.diff().dropna()
    gain = delta.clip(lower=0).tail(period).mean()
    loss = (-delta.clip(upper=0)).tail(period).mean()
    if loss == 0:
        return 100.0
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def _drawdown_signal(df: pd.DataFrame, window: int = 20) -> Signal:
    value = None
    if len(df) >= window and {"High", "Close"}.issubset(df.columns):
        recent = df.sort_values("Date").tail(window)
        high = recent["High"].max()
        close = recent["Close"].iloc[-1]
        if high:
            value = float((close - high) / high * 100)
    return Signal(
        "drawdown", "20日高値からの下落幅", value,
        inverse_linear_score(value, *DRAWDOWN_RANGE), WEIGHTS["drawdown"], format_percent(value),
    )


def _rsi_signal(df: pd.DataFrame) -> Signal:
    value = None
    if "Close" in df.columns:
        value = _rsi(df.sort_values("Date")["Close"])
    return Signal(
        "rsi_oversold", "RSI(14) 売られすぎ度", value,
        inverse_linear_score(value, *RSI_RANGE), WEIGHTS["rsi_oversold"], format_number(value),
    )


def _volume_climax_signal(df: pd.DataFrame, window: int = 10, recent_days: int = 3) -> Signal:
    value = None
    if len(df) >= window and {"Volume", "High", "Low", "Close"}.issubset(df.columns):
        recent = df.sort_values("Date").tail(window).reset_index(drop=True)
        max_pos = int(recent["Volume"].idxmax())
        if max_pos >= len(recent) - recent_days:
            row = recent.loc[max_pos]
            day_range = row["High"] - row["Low"]
            if day_range > 0:
                value = float((row["Close"] - row["Low"]) / day_range * 100)
    return Signal(
        "volume_climax", "出来高急増日の終値位置(下げ止まり確認)", value,
        linear_score(value, *VOLUME_CLIMAX_RANGE), WEIGHTS["volume_climax"], format_percent(value),
    )


def _higher_low_signal(df: pd.DataFrame, window: int = 5) -> Signal:
    value = None
    if len(df) >= window + 1 and "Low" in df.columns:
        lows = df.sort_values("Date").tail(window + 1)["Low"].reset_index(drop=True)
        higher_count = sum(1 for i in range(1, len(lows)) if lows[i] >= lows[i - 1])
        value = higher_count / (len(lows) - 1) * 100
    return Signal(
        "higher_low", "直近安値の切り上げ率", value,
        linear_score(value, *HIGHER_LOW_RANGE), WEIGHTS["higher_low"], format_percent(value),
    )


def _volatility_contraction_signal(df: pd.DataFrame, short_window: int = 5, base_window: int = 20) -> Signal:
    value = None
    if len(df) >= base_window and {"High", "Low", "Close"}.issubset(df.columns):
        recent = df.sort_values("Date").tail(base_window)
        true_range_pct = (recent["High"] - recent["Low"]) / recent["Close"] * 100
        base_vol = true_range_pct.iloc[:-short_window].mean()
        recent_vol = true_range_pct.iloc[-short_window:].mean()
        if base_vol:
            value = float((1 - recent_vol / base_vol) * 100)
    return Signal(
        "volatility_contraction", "値動きの収縮度", value,
        linear_score(value, *VOL_CONTRACTION_RANGE), WEIGHTS["volatility_contraction"], format_percent(value),
    )


def _short_squeeze_signal_jp(short: pd.DataFrame) -> Signal:
    value = None
    required = {
        "ShortSellingWithRestrictionsTurnoverValue",
        "ShortSellingWithoutRestrictionsTurnoverValue",
        "SellingExcludingShortSellingTurnoverValue",
    }
    if not short.empty and required.issubset(short.columns):
        latest = short.sort_values("Date").iloc[-1]
        short_value = latest["ShortSellingWithRestrictionsTurnoverValue"] + latest["ShortSellingWithoutRestrictionsTurnoverValue"]
        total = short_value + latest["SellingExcludingShortSellingTurnoverValue"]
        value = float(short_value / total * 100) if total else None
    return Signal(
        "short_squeeze", "空売り比率(踏み上げ余地)", value,
        linear_score(value, *SHORT_SQUEEZE_RANGE), WEIGHTS["short_squeeze"], format_percent(value),
    )


def _short_squeeze_signal_us(info: dict) -> Signal:
    value = info.get("shortPercentOfFloat")
    if value is not None:
        value = float(value) * 100
    return Signal(
        "short_squeeze", "空売り比率(踏み上げ余地)", value,
        linear_score(value, *SHORT_SQUEEZE_RANGE), WEIGHTS["short_squeeze"], format_percent(value),
    )


def _build_signals(df: pd.DataFrame, short_squeeze: Signal) -> list[Signal]:
    return [
        _drawdown_signal(df),
        _rsi_signal(df),
        _volume_climax_signal(df),
        _higher_low_signal(df),
        _volatility_contraction_signal(df),
        short_squeeze,
    ]


def _passes_reversal_gate(signals: list[Signal]) -> bool:
    by_key = {s.key: s for s in signals}

    drawdown = by_key.get("drawdown")
    if drawdown is None or drawdown.raw_value is None or drawdown.raw_value > MIN_DRAWDOWN_PCT:
        return False

    for key in ("higher_low", "volume_climax"):
        s = by_key.get(key)
        if s is not None and s.score is not None and s.score >= STABILIZATION_GATE_SCORE:
            return True
    return False


def screen_jp_real(limit: int = 30, min_score: float = MIN_SCORE) -> list[dict]:
    mail = os.environ["JQUANTS_MAIL"]
    password = os.environ["JQUANTS_PASSWORD"]
    client = JQuantsClient(mail, password)

    listed = client.listed_info()
    targets = [c for c in listed if c.get("MarketCode") == PRIME_MARKET_CODE][:limit]

    results = []
    for company in targets:
        code = company["Code"]
        sector33 = company.get("Sector33Code", "")

        quotes = client.daily_quotes(code)
        short = client.short_selling(sector33) if sector33 else pd.DataFrame()

        signals = _build_signals(quotes, _short_squeeze_signal_jp(short))
        if not _passes_reversal_gate(signals):
            continue

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


def screen_us_real(tickers: list[str], min_score: float = MIN_SCORE) -> list[dict]:
    results = []
    for ticker in tickers:
        hist = yf.Ticker(ticker).history(period="3mo").reset_index()
        try:
            info = yf.Ticker(ticker).get_info()
        except Exception:
            info = {}

        signals = _build_signals(hist, _short_squeeze_signal_us(info))
        if not _passes_reversal_gate(signals):
            continue

        score = composite_score(signals)
        if score is not None and score >= min_score:
            results.append({
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "market": "米国株",
                "score": score,
                "signals": signals,
            })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results


def _synthetic_series(pattern: str) -> pd.DataFrame:
    """pattern='bounce': 下落後に下げ止まりの兆候(出来高急増日の切り返し+安値切り上げ)が
    出るデモ用データ。pattern='falling_knife': 弱い引け(終値が安値近辺)のまま下落が続き、
    下げ止まりの兆候が出ないデモ用データ(ゲートで除外されることを確認するためのもの)。
    """
    dates = pd.date_range(end=date.today(), periods=25, freq="B")
    closes, highs, lows, volumes = [], [], [], []

    if pattern == "bounce":
        for i in range(22):  # 下落局面: 弱い引け(終値が安値近辺)が続く
            close = 1000 - i * 9
            closes.append(close)
            highs.append(close + 15)
            lows.append(close - 2)
            volumes.append(100_000)
        # 出来高急増日: 安値を大きく割り込むが引けは高値近くまで戻す(セリングクライマックス)
        closes.append(830); highs.append(835); lows.append(760); volumes.append(450_000)
        # 切り返し後: 安値を切り上げながら上昇
        closes.append(845); highs.append(850); lows.append(837); volumes.append(120_000)
        closes.append(860); highs.append(865); lows.append(852); volumes.append(110_000)
    else:
        for i in range(25):  # 一貫して弱い引けのまま下落が継続(下げ止まりの兆候なし)
            close = 1000 - i * 15
            closes.append(close)
            highs.append(close + 15)
            lows.append(close - 2)
            volumes.append(100_000 + i * 3_000)

    return pd.DataFrame({
        "Date": dates, "Open": closes, "High": highs, "Low": lows,
        "Close": closes, "Volume": volumes,
    })


_DEMO_JP = [
    {"code": "1234", "name": "反発候補デモ(下げ止まり確認)", "pattern": "bounce", "short_squeeze": 16.0},
    {"code": "5678", "name": "下落継続デモ(ゲートで除外される例)", "pattern": "falling_knife", "short_squeeze": 4.0},
]

_DEMO_US = [
    {"ticker": "DEMOA", "name": "Bounce Candidate Demo Inc.", "pattern": "bounce", "short_squeeze": 15.0},
    {"ticker": "DEMOB", "name": "Falling Knife Demo Inc.", "pattern": "falling_knife", "short_squeeze": 4.0},
]


def screen_demo_jp(min_score: float = MIN_SCORE) -> list[dict]:
    results = []
    for d in _DEMO_JP:
        df = _synthetic_series(d["pattern"])
        short_squeeze = Signal(
            "short_squeeze", "空売り比率(踏み上げ余地)", d["short_squeeze"],
            linear_score(d["short_squeeze"], *SHORT_SQUEEZE_RANGE), WEIGHTS["short_squeeze"], format_percent(d["short_squeeze"]),
        )
        signals = _build_signals(df, short_squeeze)
        if not _passes_reversal_gate(signals):
            continue
        score = composite_score(signals)
        if score is not None and score >= min_score:
            results.append({"ticker": d["code"], "name": d["name"], "market": "日本株", "score": score, "signals": signals})

    results.sort(key=lambda r: r["score"], reverse=True)
    return results


def screen_demo_us(min_score: float = MIN_SCORE) -> list[dict]:
    results = []
    for d in _DEMO_US:
        df = _synthetic_series(d["pattern"])
        short_squeeze = Signal(
            "short_squeeze", "空売り比率(踏み上げ余地)", d["short_squeeze"],
            linear_score(d["short_squeeze"], *SHORT_SQUEEZE_RANGE), WEIGHTS["short_squeeze"], format_percent(d["short_squeeze"]),
        )
        signals = _build_signals(df, short_squeeze)
        if not _passes_reversal_gate(signals):
            continue
        score = composite_score(signals)
        if score is not None and score >= min_score:
            results.append({"ticker": d["ticker"], "name": d["name"], "market": "米国株", "score": score, "signals": signals})

    results.sort(key=lambda r: r["score"], reverse=True)
    return results

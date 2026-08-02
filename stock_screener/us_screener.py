"""米国株スクリーニング (yfinance + Financial Modeling Prep任意)。

insider_buy/news_sentimentはFMP_API_KEY環境変数が設定されている場合のみ計算する
(未設定でも動作し、その場合は該当シグナルがNoneになるだけで合成スコアには影響しない)。
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Optional

import pandas as pd
import requests
import yfinance as yf

from common import Signal, composite_score, format_number, format_percent, format_ratio, linear_score

WEIGHTS = {
    "volume_spike": 2.0,
    "momentum": 1.5,
    "profit_growth": 2.0,
    "short_squeeze": 1.0,
    "institutional": 1.0,
    "insider_buy": 1.5,
    "news_sentiment": 1.0,
}

# 閾値は初期値(仮置き)。実データの分布を見ながら調整すること(引継書4節参照)。
VOLUME_SPIKE_RANGE = (1.0, 5.0)
MOMENTUM_RANGE = (0.0, 100.0)
PROFIT_GROWTH_RANGE = (-20.0, 60.0)
SHORT_SQUEEZE_RANGE = (0.0, 20.0)
INSTITUTIONAL_RANGE = (30.0, 90.0)
INSIDER_BUY_RANGE = (-1_000_000.0, 5_000_000.0)
NEWS_SENTIMENT_RANGE = (-1.0, 1.0)

MIN_SCORE = 55.0

FMP_BASE_URL = "https://financialmodelingprep.com"


def _fetch_history(ticker: str) -> pd.DataFrame:
    return yf.Ticker(ticker).history(period="3mo")


def _fetch_info(ticker: str) -> dict:
    try:
        return yf.Ticker(ticker).get_info()
    except Exception:
        return {}


def _volume_spike_signal(hist: pd.DataFrame) -> Signal:
    value = None
    if len(hist) >= 21 and "Volume" in hist.columns:
        recent = hist.tail(21)
        avg20 = recent["Volume"].iloc[:-1].mean()
        latest = recent["Volume"].iloc[-1]
        if avg20:
            value = float(latest) / float(avg20)
    return Signal(
        "volume_spike", "出来高急増(20日平均比)", value,
        linear_score(value, *VOLUME_SPIKE_RANGE), WEIGHTS["volume_spike"], format_ratio(value),
    )


def _momentum_signal(hist: pd.DataFrame) -> Signal:
    value = None
    if len(hist) >= 20 and {"Low", "High", "Close"}.issubset(hist.columns):
        recent = hist.tail(20)
        low = recent["Low"].min()
        high = recent["High"].max()
        close = recent["Close"].iloc[-1]
        if high > low:
            value = float(close - low) / float(high - low) * 100
    return Signal(
        "momentum", "20日高安レンジ位置", value,
        linear_score(value, *MOMENTUM_RANGE), WEIGHTS["momentum"], format_percent(value),
    )


def _profit_growth_signal(info: dict) -> Signal:
    value = info.get("earningsGrowth")
    if value is not None:
        value = float(value) * 100
    return Signal(
        "profit_growth", "利益成長率(YoY)", value,
        linear_score(value, *PROFIT_GROWTH_RANGE), WEIGHTS["profit_growth"], format_percent(value),
    )


def _short_squeeze_signal(info: dict) -> Signal:
    value = info.get("shortPercentOfFloat")
    if value is not None:
        value = float(value) * 100
    return Signal(
        "short_squeeze", "空売り比率(踏み上げ余地)", value,
        linear_score(value, *SHORT_SQUEEZE_RANGE), WEIGHTS["short_squeeze"], format_percent(value),
    )


def _institutional_signal(info: dict) -> Signal:
    value = info.get("heldPercentInstitutions")
    if value is not None:
        value = float(value) * 100
    return Signal(
        "institutional", "機関投資家保有比率", value,
        linear_score(value, *INSTITUTIONAL_RANGE), WEIGHTS["institutional"], format_percent(value),
    )


def _insider_buy_signal(ticker: str, api_key: Optional[str]) -> Signal:
    value = None
    if api_key:
        try:
            resp = requests.get(
                f"{FMP_BASE_URL}/api/v4/insider-trading",
                params={"symbol": ticker, "limit": 100, "apikey": api_key},
                timeout=30,
            )
            resp.raise_for_status()
            cutoff = (date.today() - timedelta(days=90)).isoformat()
            net = 0.0
            for row in resp.json():
                tx_date = row.get("transactionDate") or ""
                if tx_date < cutoff:
                    continue
                shares = row.get("securitiesTransacted") or 0
                price = row.get("price") or 0
                amount = float(shares) * float(price)
                tx_type = row.get("transactionType") or ""
                if tx_type.startswith("P"):
                    net += amount
                elif tx_type.startswith("S"):
                    net -= amount
            value = net
        except requests.RequestException:
            value = None
    return Signal(
        "insider_buy", "インサイダー買い越し額(90日)", value,
        linear_score(value, *INSIDER_BUY_RANGE), WEIGHTS["insider_buy"], format_number(value),
    )


def _news_sentiment_signal(ticker: str, api_key: Optional[str]) -> Signal:
    value = None
    if api_key:
        try:
            resp = requests.get(
                f"{FMP_BASE_URL}/api/v3/stock_news_sentiment",
                params={"symbol": ticker, "apikey": api_key},
                timeout=30,
            )
            resp.raise_for_status()
            scores = [row["sentimentScore"] for row in resp.json() if row.get("sentimentScore") is not None]
            if scores:
                value = sum(scores) / len(scores)
        except requests.RequestException:
            value = None
    return Signal(
        "news_sentiment", "ニュースセンチメント", value,
        linear_score(value, *NEWS_SENTIMENT_RANGE), WEIGHTS["news_sentiment"], format_number(value),
    )


def screen_real(tickers: list[str], min_score: float = MIN_SCORE) -> list[dict]:
    api_key = os.environ.get("FMP_API_KEY")

    results = []
    for ticker in tickers:
        hist = _fetch_history(ticker)
        info = _fetch_info(ticker)

        signals = [
            _volume_spike_signal(hist),
            _momentum_signal(hist),
            _profit_growth_signal(info),
            _short_squeeze_signal(info),
            _institutional_signal(info),
            _insider_buy_signal(ticker, api_key),
            _news_sentiment_signal(ticker, api_key),
        ]
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


_DEMO_STOCKS = [
    {"ticker": "AAPL", "name": "Apple Inc.", "volume_spike": 1.8, "momentum": 68.0, "profit_growth": 12.0, "short_squeeze": 1.2, "institutional": 62.0, "insider_buy": -200_000.0, "news_sentiment": 0.15},
    {"ticker": "MSFT", "name": "Microsoft Corp.", "volume_spike": 1.3, "momentum": 74.0, "profit_growth": 18.0, "short_squeeze": 0.8, "institutional": 72.0, "insider_buy": -50_000.0, "news_sentiment": 0.25},
    {"ticker": "NVDA", "name": "NVIDIA Corp.", "volume_spike": 3.6, "momentum": 88.0, "profit_growth": 45.0, "short_squeeze": 3.5, "institutional": 66.0, "insider_buy": 1_200_000.0, "news_sentiment": 0.4},
    {"ticker": "GOOGL", "name": "Alphabet Inc.", "volume_spike": 1.1, "momentum": 50.0, "profit_growth": 15.0, "short_squeeze": 0.9, "institutional": 78.0, "insider_buy": -300_000.0, "news_sentiment": 0.1},
    {"ticker": "AMZN", "name": "Amazon.com Inc.", "volume_spike": 2.4, "momentum": 80.0, "profit_growth": 22.0, "short_squeeze": 1.5, "institutional": 65.0, "insider_buy": 600_000.0, "news_sentiment": 0.2},
]


def screen_demo() -> list[dict]:
    results = []
    for d in _DEMO_STOCKS:
        signals = [
            Signal("volume_spike", "出来高急増(20日平均比)", d["volume_spike"], linear_score(d["volume_spike"], *VOLUME_SPIKE_RANGE), WEIGHTS["volume_spike"], format_ratio(d["volume_spike"])),
            Signal("momentum", "20日高安レンジ位置", d["momentum"], linear_score(d["momentum"], *MOMENTUM_RANGE), WEIGHTS["momentum"], format_percent(d["momentum"])),
            Signal("profit_growth", "利益成長率(YoY)", d["profit_growth"], linear_score(d["profit_growth"], *PROFIT_GROWTH_RANGE), WEIGHTS["profit_growth"], format_percent(d["profit_growth"])),
            Signal("short_squeeze", "空売り比率(踏み上げ余地)", d["short_squeeze"], linear_score(d["short_squeeze"], *SHORT_SQUEEZE_RANGE), WEIGHTS["short_squeeze"], format_percent(d["short_squeeze"])),
            Signal("institutional", "機関投資家保有比率", d["institutional"], linear_score(d["institutional"], *INSTITUTIONAL_RANGE), WEIGHTS["institutional"], format_percent(d["institutional"])),
            Signal("insider_buy", "インサイダー買い越し額(90日)", d["insider_buy"], linear_score(d["insider_buy"], *INSIDER_BUY_RANGE), WEIGHTS["insider_buy"], format_number(d["insider_buy"])),
            Signal("news_sentiment", "ニュースセンチメント", d["news_sentiment"], linear_score(d["news_sentiment"], *NEWS_SENTIMENT_RANGE), WEIGHTS["news_sentiment"], format_number(d["news_sentiment"])),
        ]
        score = composite_score(signals)
        results.append({"ticker": d["ticker"], "name": d["name"], "market": "米国株", "score": score, "signals": signals})

    results.sort(key=lambda r: r["score"], reverse=True)
    return results

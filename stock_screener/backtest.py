"""順張り(volume_spike+momentum)と短期反発候補(reversal_screener)のスコアリングロジックを、
過去の株価データに対して算出し、その後の実際のリターンと突き合わせて検証するバックテストツール。

## 検証範囲の限界(重要)
jp_screener/us_screenerが使う業績成長率・信用残変化・投資部門別売買動向・機関投資家保有比率・
インサイダー買い・ニュースセンチメントは、多くのAPIが「現在時点のスナップショット」しか提供せず
長期の時系列データを取得できないため、このバックテストの対象に含まれない。そのため「順張り」の
バックテストはvolume_spike+momentumの2シグナルのみで計算した簡易版のスコアになる(本番の
jp_screener/us_screenerが使う6〜7シグナルとは異なる)。

reversal_screenerは短期反発候補6シグナルのうちshort_squeeze以外(重み8/9)がOHLCVのみから
計算できる設計のため、このバックテストでもほぼそのままの精度で評価できる。

株価データはyfinanceから取得する(日本株はティッカーに".T"を付与、例: "7203.T")。
J-Quants/FMPのAPIキーが無くても実行できる。

## 使い方
    # 合成データでツール自体の動作確認(ネットワーク不要)
    python backtest.py --demo

    # 実データでの検証
    python backtest.py --tickers 7203.T,9984.T,AAPL,MSFT --period 2y

## 既知の限界
- 評価対象は各tickerの過去日次データのみ。上場廃止銘柄は含まれずサバイバーシップバイアスがある。
- 売買コスト・スリッページは考慮していない(理論上の株価変化率のみ)。
- 反発候補は毎日評価するため、近接する評価日同士のサンプルは同一の値動きイベントを重複して
  数えている可能性がある(厳密な独立サンプルではない)。あくまで傾向を見るための簡易ツール。
"""

from __future__ import annotations

import argparse
from datetime import date
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

from common import Signal, composite_score
from jp_screener import MIN_SCORE as MOMENTUM_MIN_SCORE
from jp_screener import _momentum_signal, _volume_spike_signal
from reversal_screener import MIN_SCORE as REVERSAL_MIN_SCORE
from reversal_screener import _build_signals as build_reversal_signals
from reversal_screener import _passes_reversal_gate as passes_reversal_gate

EVAL_INTERVAL_DAYS = 5  # 順張りスコアを何営業日おきに評価するか
FORWARD_HORIZONS = [5, 10, 20]  # 何営業日後のリターンを見るか
MIN_HISTORY_DAYS = 30  # シグナル計算に必要な最低限の過去日数


def fetch_history(ticker: str, period: str = "2y") -> pd.DataFrame:
    return yf.Ticker(ticker).history(period=period).reset_index()


def forward_return(df: pd.DataFrame, idx: int, horizon: int) -> Optional[float]:
    if idx + horizon >= len(df):
        return None
    now = df["Close"].iloc[idx]
    later = df["Close"].iloc[idx + horizon]
    if not now:
        return None
    return float((later - now) / now * 100)


def _momentum_score(window: pd.DataFrame) -> Optional[float]:
    signals = [_volume_spike_signal(window), _momentum_signal(window)]
    return composite_score(signals)


def backtest_momentum(tickers: list[str], fetch_fn) -> pd.DataFrame:
    rows = []
    for ticker in tickers:
        df = fetch_fn(ticker).sort_values("Date").reset_index(drop=True)
        last_idx = len(df) - max(FORWARD_HORIZONS) - 1
        for idx in range(MIN_HISTORY_DAYS, max(MIN_HISTORY_DAYS, last_idx), EVAL_INTERVAL_DAYS):
            score = _momentum_score(df.iloc[: idx + 1])
            if score is None:
                continue
            row = {"ticker": ticker, "date": df["Date"].iloc[idx], "score": score}
            for h in FORWARD_HORIZONS:
                row[f"fwd_{h}d"] = forward_return(df, idx, h)
            rows.append(row)
    return pd.DataFrame(rows)


def backtest_reversal(tickers: list[str], fetch_fn) -> tuple[pd.DataFrame, pd.DataFrame]:
    gated_rows = []
    baseline_rows = []
    for ticker in tickers:
        df = fetch_fn(ticker).sort_values("Date").reset_index(drop=True)
        last_idx = len(df) - max(FORWARD_HORIZONS) - 1
        for idx in range(MIN_HISTORY_DAYS, max(MIN_HISTORY_DAYS, last_idx)):
            base_row = {"ticker": ticker, "date": df["Date"].iloc[idx]}
            for h in FORWARD_HORIZONS:
                base_row[f"fwd_{h}d"] = forward_return(df, idx, h)
            baseline_rows.append(base_row)

            short_squeeze = Signal("short_squeeze", "空売り比率(踏み上げ余地)", None, None, 1.0, "-")
            signals = build_reversal_signals(df.iloc[: idx + 1], short_squeeze)
            if not passes_reversal_gate(signals):
                continue
            score = composite_score(signals)
            if score is None:
                continue
            gated_rows.append({**base_row, "score": score})

    return pd.DataFrame(gated_rows), pd.DataFrame(baseline_rows)


def _print_quintiles(df: pd.DataFrame, horizon_cols: list[str]) -> None:
    for col in horizon_cols:
        valid = df.dropna(subset=["score", col])
        if len(valid) < 10:
            print(f"  [{col}] サンプル不足(n={len(valid)})のためスキップ")
            continue
        corr = valid["score"].corr(valid[col])
        print(f"  [{col}] 相関係数(スコア vs リターン): {corr:+.3f} (n={len(valid)})")
        try:
            valid = valid.copy()
            valid["quintile"] = pd.qcut(valid["score"], 5, labels=False, duplicates="drop")
            summary = valid.groupby("quintile")[col].agg(["mean", "count"])
            summary.columns = ["平均リターン(%)", "件数"]
            print(summary.to_string())
        except ValueError:
            print("  (スコアのばらつきが少なくquintile分割不可)")


def summarize_momentum(df: pd.DataFrame) -> None:
    print("\n=== 順張り(volume_spike + momentumの簡易スコア) ===")
    print(f"評価件数: {len(df)}")
    if df.empty:
        print("該当データなし")
        return
    horizon_cols = [f"fwd_{h}d" for h in FORWARD_HORIZONS]
    _print_quintiles(df, horizon_cols)

    candidate = df[df["score"] >= MOMENTUM_MIN_SCORE]
    other = df[df["score"] < MOMENTUM_MIN_SCORE]
    print(f"\n  MIN_SCORE({MOMENTUM_MIN_SCORE})以上: {len(candidate)}件 / 未満: {len(other)}件")
    if candidate.empty:
        print("  (MIN_SCORE以上の候補がこの期間には存在しません。volume_spike+momentumの2シグナル"
              "のみで計算しているため、6〜7シグナル前提のMIN_SCOREに届きにくい点に注意)")
    else:
        for h in FORWARD_HORIZONS:
            col = f"fwd_{h}d"
            print(f"  [{col}] 候補入り平均: {candidate[col].mean():+.2f}% / 候補外平均: {other[col].mean():+.2f}%")


def summarize_reversal(gated: pd.DataFrame, baseline: pd.DataFrame) -> None:
    print("\n=== 短期反発候補(reversal_screener、下げ止まりゲート通過分) ===")
    print(f"ゲート通過件数: {len(gated)} / 全評価件数: {len(baseline)}")
    if gated.empty:
        print("該当データなし(ゲートを通過した候補がありません)")
        return
    horizon_cols = [f"fwd_{h}d" for h in FORWARD_HORIZONS]
    _print_quintiles(gated, horizon_cols)

    print("\n  ゲート通過時点の平均リターン vs 全期間平均(ベースライン):")
    for h in FORWARD_HORIZONS:
        col = f"fwd_{h}d"
        gated_mean = gated[col].mean()
        baseline_mean = baseline[col].mean()
        print(f"  [{col}] ゲート通過時: {gated_mean:+.2f}% / ベースライン: {baseline_mean:+.2f}%")


def _synthetic_history(rng: np.random.Generator, n_days: int = 500, start_price: float = 1000.0) -> pd.DataFrame:
    """デモ用の合成株価データ。約45営業日周期で下落→反発→レンジを繰り返し、下落末期に
    出来高急増を仕込むことで、順張り/反発双方のバックテスト経路を検証できるようにしている。
    """
    dates = pd.bdate_range(end=date.today(), periods=n_days)
    phase_len = 45

    closes = [start_price]
    for i in range(1, n_days):
        cycle_pos = i % phase_len
        if cycle_pos < 12:
            drift = -0.012
        elif cycle_pos < 25:
            drift = 0.010
        else:
            drift = 0.0005
        closes.append(closes[-1] * (1 + drift + rng.normal(0, 0.012)))
    closes = np.array(closes)

    volumes = np.empty(n_days)
    for i in range(n_days):
        cycle_pos = i % phase_len
        if 8 <= cycle_pos < 14:
            volumes[i] = 100_000 * rng.uniform(3.0, 5.0)
        else:
            volumes[i] = 100_000 * rng.uniform(0.8, 1.3)

    highs = closes * (1 + np.abs(rng.normal(0.01, 0.005, n_days)))
    lows = np.minimum(closes * (1 - np.abs(rng.normal(0.01, 0.005, n_days))), closes * 0.999)
    highs = np.maximum(highs, closes * 1.001)

    return pd.DataFrame({
        "Date": dates, "Open": closes, "High": highs, "Low": lows,
        "Close": closes, "Volume": volumes,
    })


def demo_fetch_factory():
    rng = np.random.default_rng(42)
    cache: dict[str, pd.DataFrame] = {}

    def fetch(ticker: str) -> pd.DataFrame:
        if ticker not in cache:
            cache[ticker] = _synthetic_history(rng)
        return cache[ticker]

    return fetch


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="スクリーニングロジックのバックテスト")
    parser.add_argument("--demo", action="store_true", help="合成データでツールの動作確認をする(ネットワーク不要)")
    parser.add_argument(
        "--tickers", type=str,
        default="7203.T,9984.T,6758.T,8306.T,4063.T,AAPL,MSFT,NVDA,GOOGL,AMZN",
        help="カンマ区切りのティッカーリスト(日本株はyfinance形式で'.T'を付与)",
    )
    parser.add_argument("--period", type=str, default="2y", help="取得する株価履歴の期間(yfinance形式)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    tickers = [t.strip() for t in args.tickers.split(",") if t.strip()]

    if args.demo:
        fetch_fn = demo_fetch_factory()
        tickers = [f"DEMO{i}" for i in range(5)]
    else:
        fetch_fn = lambda t: fetch_history(t, args.period)

    momentum_df = backtest_momentum(tickers, fetch_fn)
    summarize_momentum(momentum_df)

    reversal_gated, reversal_baseline = backtest_reversal(tickers, fetch_fn)
    summarize_reversal(reversal_gated, reversal_baseline)


if __name__ == "__main__":
    main()

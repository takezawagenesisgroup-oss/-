"""ユーザー自身が選んだ銘柄・配分金額について、実際の株価データを使って
「過去のある時点で買っていたら、今どうなっているか」を計算するバックテストツール。

jp_screener/us_screener/reversal_screenerが機械的に選ぶ候補ではなく、ユーザーが自由に
選んだ銘柄・金額配分を検証するためのもの。購入日(entry)は既に確定した過去の営業日、
評価日(exit)はデータ取得時点の最新終値なので、"これから1週間後どうなるか"という
未来の予測ではなく、"既に起きた値動きの再現"である点に注意。

## 使い方
    # 5営業日前(≒1週間前)に買ったと仮定して、直近終値時点の評価額・損益を計算
    python simulate_custom_portfolio.py --portfolio "7203.T:400000,AAPL:300000,9984.T:300000" --days-ago 5

    # 購入日を明示的に指定する場合
    python simulate_custom_portfolio.py --portfolio "AAPL:1000000" --entry-date 2026-07-20
"""

from __future__ import annotations

import argparse

import pandas as pd

from backtest import fetch_history


def parse_portfolio(spec: str) -> list[tuple[str, float]]:
    positions = []
    for part in spec.split(","):
        ticker, amount = part.split(":")
        positions.append((ticker.strip(), float(amount)))
    return positions


def simulate(
    positions: list[tuple[str, float]], days_ago: int, entry_date: str | None, period: str,
) -> pd.DataFrame:
    rows = []
    for ticker, amount in positions:
        df = fetch_history(ticker, period).sort_values("Date").reset_index(drop=True)
        if df.empty:
            rows.append({"ticker": ticker, "投資額": amount, "エラー": "株価データを取得できませんでした"})
            continue

        if entry_date:
            matches = df[df["Date"] >= pd.Timestamp(entry_date, tz=df["Date"].dt.tz)]
            if matches.empty:
                rows.append({"ticker": ticker, "投資額": amount, "エラー": "指定した購入日以降のデータがありません"})
                continue
            entry_idx = matches.index[0]
        else:
            entry_idx = max(0, len(df) - 1 - days_ago)

        exit_idx = len(df) - 1
        if entry_idx >= exit_idx:
            rows.append({"ticker": ticker, "投資額": amount, "エラー": "購入日が新しすぎて評価できません"})
            continue

        entry_price = float(df["Close"].iloc[entry_idx])
        exit_price = float(df["Close"].iloc[exit_idx])
        final_value = amount * (exit_price / entry_price)

        rows.append({
            "ticker": ticker,
            "投資額": amount,
            "購入日": df["Date"].iloc[entry_idx].strftime("%Y-%m-%d"),
            "購入時株価": entry_price,
            "評価日": df["Date"].iloc[exit_idx].strftime("%Y-%m-%d"),
            "評価時株価": exit_price,
            "評価額": final_value,
            "損益": final_value - amount,
            "損益率(%)": (exit_price / entry_price - 1) * 100,
        })

    return pd.DataFrame(rows)


def summarize(df: pd.DataFrame, capital: float) -> None:
    pd.set_option("display.float_format", lambda v: f"{v:,.1f}")
    print(df.to_string(index=False))

    valid = df[df.get("エラー").isna()] if "エラー" in df.columns else df
    if valid.empty:
        print("\n評価できた銘柄がありません。")
        return

    total_value = valid["評価額"].sum()
    invested = valid["投資額"].sum()
    total_pnl = total_value - invested
    print(f"\n評価できた投資額合計: {invested:,.0f}円 (元手全体: {capital:,.0f}円)")
    print(f"評価額合計: {total_value:,.0f}円")
    print(f"損益: {total_pnl:+,.0f}円 ({total_pnl / invested * 100:+.2f}%)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="自分で選んだ銘柄・配分でのバックテスト")
    parser.add_argument(
        "--portfolio", type=str, required=True,
        help='"ティッカー:金額,ティッカー:金額,..." 形式。日本株はyfinance形式で".T"を付与(例: 7203.T:400000)',
    )
    parser.add_argument("--days-ago", type=int, default=5, help="何営業日前を購入日とするか(デフォルト5=約1週間前)")
    parser.add_argument("--entry-date", type=str, default=None, help="購入日をYYYY-MM-DD形式で明示指定(--days-agoより優先)")
    parser.add_argument("--period", type=str, default="6mo", help="取得する株価履歴の期間(yfinance形式)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    positions = parse_portfolio(args.portfolio)
    capital = sum(amount for _, amount in positions)

    df = simulate(positions, args.days_ago, args.entry_date, args.period)
    summarize(df, capital)


if __name__ == "__main__":
    main()

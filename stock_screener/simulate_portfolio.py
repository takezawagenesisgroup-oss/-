"""元手を反発候補(reversal_screener)に均等配分した場合の、週次損益をシミュレートするツール。

重要な注意: このシミュレーションは「ある時点の候補に投資したら、その後horizon営業日で
株価がどう動いたか」を過去の値動きだけで再現したものであり、スプレッド・手数料・スリッページ・
値がさ株での端数処理・寄り付きで実際に約定できるかは考慮していない。あくまで
「シグナルにどれだけの情報量があるか」を大まかに掴むための簡易ツールで、実運用の
損益をそのまま予測するものではない。

--demoは合成データ(架空の値動き)を使うため、出てくる金額は動作確認用のダミーであり、
実際の投資成果を示すものではない。実際の金額を見るには、実データ(--tickers)で
実行すること。
"""

from __future__ import annotations

import argparse

import pandas as pd

from backtest import MIN_HISTORY_DAYS, build_reversal_signals, demo_fetch_factory, fetch_history, passes_reversal_gate
from common import Signal, composite_score


def simulate_weekly_portfolio(
    tickers: list[str], fetch_fn, capital: float = 1_000_000.0, horizon: int = 5, max_positions: int = 5,
) -> pd.DataFrame:
    dfs = {t: fetch_fn(t).sort_values("Date").reset_index(drop=True) for t in tickers}
    n_days = min(len(df) for df in dfs.values())

    rows = []
    for idx in range(MIN_HISTORY_DAYS, n_days - horizon):
        candidates = []
        for ticker, df in dfs.items():
            short_squeeze = Signal("short_squeeze", "空売り比率(踏み上げ余地)", None, None, 1.0, "-")
            signals = build_reversal_signals(df.iloc[: idx + 1], short_squeeze)
            if not passes_reversal_gate(signals):
                continue
            score = composite_score(signals)
            if score is None:
                continue
            candidates.append((ticker, df, score))

        eval_date = next(iter(dfs.values()))["Date"].iloc[idx]

        if not candidates:
            rows.append({"date": eval_date, "positions": 0, "pnl_yen": 0.0, "pnl_pct": 0.0})
            continue

        candidates.sort(key=lambda c: c[2], reverse=True)
        chosen = candidates[:max_positions]
        allocation = capital / len(chosen)

        total_value = 0.0
        for ticker, df, score in chosen:
            entry = df["Close"].iloc[idx]
            exit_ = df["Close"].iloc[idx + horizon]
            total_value += allocation * (exit_ / entry)

        pnl_yen = total_value - capital
        rows.append({
            "date": eval_date, "positions": len(chosen),
            "pnl_yen": pnl_yen, "pnl_pct": pnl_yen / capital * 100,
        })

    return pd.DataFrame(rows)


def summarize(df: pd.DataFrame, capital: float) -> None:
    print(f"\n元手: {capital:,.0f}円 / 評価週数: {len(df)}週(過去データ全体をローリングで評価)")

    traded = df[df["positions"] > 0]
    print(f"実際に候補があり投資した週: {len(traded)}週 / 候補なしで待機した週: {len(df) - len(traded)}週")

    print("\n[候補なしの週も含めた全体の週次損益(常にこのツールに従った場合の実感値)]")
    print(f"  平均: {df['pnl_yen'].mean():+,.0f}円 ({df['pnl_pct'].mean():+.2f}%)")
    print(f"  中央値: {df['pnl_yen'].median():+,.0f}円")
    print(f"  最良週: {df['pnl_yen'].max():+,.0f}円 / 最悪週: {df['pnl_yen'].min():+,.0f}円")

    if not traded.empty:
        print("\n[実際に投資した週のみの損益(シグナルが出た時の実力値)]")
        print(f"  平均: {traded['pnl_yen'].mean():+,.0f}円 ({traded['pnl_pct'].mean():+.2f}%)")
        win_rate = (traded["pnl_yen"] > 0).mean() * 100
        print(f"  勝率: {win_rate:.1f}% (n={len(traded)})")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="反発候補への資金配分シミュレーション")
    parser.add_argument("--demo", action="store_true", help="合成データで動作確認する(結果は架空の数字)")
    parser.add_argument("--tickers", type=str, default="7203.T,9984.T,6758.T,8306.T,4063.T,AAPL,MSFT,NVDA,GOOGL,AMZN")
    parser.add_argument("--period", type=str, default="2y")
    parser.add_argument("--capital", type=float, default=1_000_000.0)
    parser.add_argument("--horizon", type=int, default=5, help="何営業日後の損益を見るか(5=約1週間)")
    parser.add_argument("--max-positions", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.demo:
        fetch_fn = demo_fetch_factory()
        tickers = [f"DEMO{i}" for i in range(5)]
        print("*** --demoは合成(架空)データです。以下の金額は動作確認用のダミーであり、実際の投資成果ではありません ***")
    else:
        fetch_fn = lambda t: fetch_history(t, args.period)
        tickers = [t.strip() for t in args.tickers.split(",") if t.strip()]

    df = simulate_weekly_portfolio(tickers, fetch_fn, args.capital, args.horizon, args.max_positions)
    summarize(df, args.capital)


if __name__ == "__main__":
    main()

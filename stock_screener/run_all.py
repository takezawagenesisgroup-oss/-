"""日本株・米国株のスクリーニングをまとめて実行し、統合HTMLを出力するエントリポイント。"""

import argparse
import os

import jp_screener
import us_screener
from common import render_combined_html

DEFAULT_US_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="株式買い候補スクリーニング")
    parser.add_argument("--demo", action="store_true", help="デモデータで動作確認する(APIキー不要)")
    parser.add_argument("--jp-limit", type=int, default=30, help="日本株の対象銘柄数上限")
    parser.add_argument(
        "--us-tickers", type=str, default=",".join(DEFAULT_US_TICKERS),
        help="カンマ区切りの米国株ティッカーリスト",
    )
    parser.add_argument("--output", type=str, default="result.html", help="出力先HTMLパス")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    us_tickers = [t.strip() for t in args.us_tickers.split(",") if t.strip()]

    if args.demo:
        jp_results = jp_screener.screen_demo()
        us_results = us_screener.screen_demo()
    else:
        jp_results = jp_screener.screen_real(limit=args.jp_limit)
        us_results = us_screener.screen_real(us_tickers)

    html = render_combined_html(jp_results, us_results)
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"日本株候補: {len(jp_results)}件 / 米国株候補: {len(us_results)}件")
    print(f"出力先: {args.output}")


if __name__ == "__main__":
    main()

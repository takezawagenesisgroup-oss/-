"""スクリーニング共通ロジック: シグナルの正規化・合成スコア計算・HTML生成。"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Optional


@dataclass
class Signal:
    key: str
    label: str
    raw_value: Optional[float]
    score: Optional[float]
    weight: float
    detail: str = "-"


def linear_score(value: Optional[float], low: float, high: float) -> Optional[float]:
    """valueをlow→highの範囲で0〜100点に正規化する(範囲外はクランプ)。"""
    if value is None:
        return None
    if high == low:
        return None
    ratio = (value - low) / (high - low)
    return max(0.0, min(100.0, ratio * 100))


def inverse_linear_score(value: Optional[float], low: float, high: float) -> Optional[float]:
    """linear_scoreの逆(値が小さいほど高得点)。"""
    score = linear_score(value, low, high)
    if score is None:
        return None
    return 100.0 - score


def composite_score(signals: list[Signal]) -> Optional[float]:
    """有効な(score is not None)シグナルのみを対象に、重み付き平均で合成スコアを出す。"""
    weighted = [(s.score, s.weight) for s in signals if s.score is not None]
    total_weight = sum(w for _, w in weighted)
    if total_weight == 0:
        return None
    return sum(score * w for score, w in weighted) / total_weight


def format_ratio(value: Optional[float]) -> str:
    return "-" if value is None else f"{value:.2f}倍"


def format_percent(value: Optional[float]) -> str:
    return "-" if value is None else f"{value:+.1f}%"


def format_yen(value: Optional[float]) -> str:
    return "-" if value is None else f"{value / 1e8:+,.0f}億円"


def format_number(value: Optional[float]) -> str:
    return "-" if value is None else f"{value:+,.0f}"


def _score_color(score: Optional[float]) -> str:
    if score is None:
        return "#9aa1ab"
    if score >= 70:
        return "#16a34a"
    if score >= 55:
        return "#ca8a04"
    return "#9aa1ab"


def render_card(ticker: str, name: str, market: str, score: Optional[float], signals: list[Signal]) -> str:
    score_text = "-" if score is None else f"{score:.1f}"
    color = _score_color(score)

    rows = []
    for s in signals:
        bar_width = 0 if s.score is None else round(s.score)
        bar_color = _score_color(s.score)
        rows.append(
            f"""
            <div class="signal-row">
              <div class="signal-label">{s.label}<span class="signal-detail">{s.detail}</span></div>
              <div class="signal-bar-track">
                <div class="signal-bar-fill" style="width:{bar_width}%;background:{bar_color}"></div>
              </div>
            </div>"""
        )

    return f"""
    <div class="card">
      <div class="card-header">
        <div>
          <span class="card-market">{market}</span>
          <h3>{name} <span class="card-ticker">{ticker}</span></h3>
        </div>
        <div class="card-score" style="color:{color}">{score_text}</div>
      </div>
      <div class="signals">{''.join(rows)}</div>
    </div>"""


def render_combined_html(sections: list[tuple[str, list[dict]]]) -> str:
    generated_at = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def section(title: str, results: list[dict]) -> str:
        if not results:
            return f"<section><h2>{title}</h2><p class='empty'>候補なし</p></section>"
        cards = "".join(
            render_card(r["ticker"], r["name"], r["market"], r["score"], r["signals"])
            for r in results
        )
        return f"<section><h2>{title}</h2><div class='cards'>{cards}</div></section>"

    body = "".join(section(title, results) for title, results in sections)

    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>株式買い候補スクリーニング結果</title>
<style>
  body {{ font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; background:#f5f6f8; color:#1a1c1e; margin:0; padding:24px; }}
  .header {{ max-width:960px; margin:0 auto 24px; }}
  .header h1 {{ margin:0 0 4px; }}
  .header p {{ color:#6b7280; margin:0; }}
  .disclaimer {{ max-width:960px; margin:0 auto 24px; background:#fff7ed; border:1px solid #fdba74; color:#9a3412; padding:12px 16px; border-radius:8px; font-size:0.85rem; }}
  section {{ max-width:960px; margin:0 auto 32px; }}
  section h2 {{ font-size:1.2rem; border-bottom:2px solid #e5e7eb; padding-bottom:6px; }}
  .empty {{ color:#6b7280; }}
  .cards {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px; margin-top:16px; }}
  .card {{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }}
  .card-header {{ display:flex; justify-content:space-between; align-items:flex-start; }}
  .card-market {{ font-size:0.75rem; color:#6b7280; }}
  .card-header h3 {{ margin:2px 0 0; font-size:1.05rem; }}
  .card-ticker {{ color:#6b7280; font-weight:400; font-size:0.85rem; }}
  .card-score {{ font-size:1.6rem; font-weight:700; }}
  .signals {{ margin-top:12px; display:flex; flex-direction:column; gap:8px; }}
  .signal-row {{ font-size:0.8rem; }}
  .signal-label {{ display:flex; justify-content:space-between; color:#374151; margin-bottom:2px; }}
  .signal-detail {{ color:#6b7280; }}
  .signal-bar-track {{ background:#e5e7eb; border-radius:4px; height:6px; overflow:hidden; }}
  .signal-bar-fill {{ height:100%; }}
</style>
</head>
<body>
  <div class="header">
    <h1>株式買い候補スクリーニング結果</h1>
    <p>生成日時: {generated_at}</p>
  </div>
  <div class="disclaimer">
    本ツールは投資助言ではありません。市場シグナルを機械的にスコアリングした参考情報であり、
    最終的な投資判断・発注は必ずご自身の責任で行ってください。
    「順張り」は資金流入トレンドを後追いする軸、「短期反発」は短期的に下落しつつも
    下げ止まりの兆候がある銘柄を検知する軸です。
  </div>
  {body}
</body>
</html>"""

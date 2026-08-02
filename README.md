# 株式買い候補スクリーニングアプリ

日本株・米国株を対象に、複数の市場シグナル（出来高急増・値動き・業績成長・信用取引/空売り動向・
投資部門別売買動向・インサイダー買いなど）をスコアリングして「買い候補」を提示するスクリーニングツールです。

**本ツールは投資助言ではありません。** 市場シグナルを機械的にスコアリングした参考情報を出すだけで、
自動発注機能は意図的に実装していません。最終的な投資判断・発注は必ずご自身の責任で行ってください。

## 2つのスクリーニング軸

- **順張り(トレンド追随型)** — `jp_screener.py` / `us_screener.py`。資金流入トレンド
  (出来高急増・業績成長・投資部門別売買動向など)を後追いする、比較的長めの保有を想定した軸。
- **短期反発候補(下げ止まり確認型)** — `reversal_screener.py`。短期的に下落しているが、
  下げ止まりの兆候がある銘柄を検知する軸。「落ちるナイフを拾う」ことを避けるため、
  以下の2条件を**必須ゲート**として課しており、合成スコアが高くてもこれを満たさない銘柄は
  候補から除外される:
  1. 実際に一定以上下落していること(20日高値からの下落幅が`MIN_DRAWDOWN_PCT`以下)
  2. 出来高急増日の終値位置(セリングクライマックス後の切り返し)か、直近安値の切り上げの
     いずれかで下げ止まりが確認できること

## 設計思想

「AIが買いそうな株を先回りで買う」ことは、アルゴリズム取引が非公開ロジック・ミリ秒単位で動く以上、
技術的に不可能です。そのため本ツールは「AI/機関投資家的な買い圧力が結果として市場に現れるサイン」
（出来高急増・投資部門別売買動向・空売り比率の変化・インサイダー買いなど）を間接的に検知する方針を
とっています。同じシグナルを見ている他の市場参加者も多いため、優位性は永続的なものではありません。

運用イメージ:
1. 本ツールが定期的に買い候補をスコアリングして提示
2. ユーザーが候補を確認し、証券アプリ側で手動発注
3. 売却タイミングも同様に別途提案し、手動で決済(未実装、ロードマップ参照)

## 現状のステータス

プロトタイプ段階です。デモデータ(`--demo`)での動作確認のみ完了しており、実APIキーでの検証・
スコア閾値のチューニングはこれからです。

## ファイル構成

```
stock_screener/
├── common.py             # スコアリング共通ロジック + HTML生成
├── jp_screener.py         # 日本株スクリーニング (J-Quants API、順張り軸)
├── us_screener.py         # 米国株スクリーニング (yfinance + Financial Modeling Prep任意、順張り軸)
├── reversal_screener.py   # 短期反発候補スクリーニング (日本株/米国株、下げ止まり確認型)
├── run_all.py             # 全てまとめて実行し、統合HTMLを出力するエントリポイント
├── requirements.txt
└── result.html             # 実行結果(都度上書き、gitignore対象)
```

## シグナル設計と重み(初期値、要チューニング)

### 日本株 (`jp_screener.py` の `WEIGHTS`)

| シグナル | 内容 | 重み | データソース |
|---|---|---|---|
| volume_spike | 出来高が20日平均の何倍か | 2.0 | J-Quants `/prices/daily_quotes` |
| momentum | 直近終値が20日高安レンジのどの位置か(%) | 1.5 | 同上 |
| profit_growth | 営業利益の前年同期比成長率 | 2.0 | J-Quants `/fins/statements` |
| margin_change | 信用買い残の週次変化率 | 1.0 | J-Quants `/markets/weekly_margin_interest` |
| short_cover | 空売り比率の変化(下落=買い戻し圧力) | 1.0 | J-Quants `/markets/short_selling` |
| market_flow | 海外投資家+自己売買の買い越し額(市場区分単位) | 1.0 | J-Quants `/markets/trades_spec` |

### 米国株 (`us_screener.py` の `WEIGHTS`)

| シグナル | 内容 | 重み | データソース |
|---|---|---|---|
| volume_spike | 出来高が20日平均の何倍か | 2.0 | yfinance |
| momentum | 20日高安レンジ内位置 | 1.5 | yfinance |
| profit_growth | 利益成長率(YoY) | 2.0 | yfinance (`earningsGrowth`) |
| short_squeeze | 空売り比率(踏み上げ余地) | 1.0 | yfinance (`shortPercentOfFloat`) |
| institutional | 機関投資家保有比率 | 1.0 | yfinance (`heldPercentInstitutions`) |
| insider_buy | インサイダー買い越し額 | 1.5 | FMP `/insider-trading` (要APIキー) |
| news_sentiment | ニュースセンチメント平均 | 1.0 | FMP `/stock_news_sentiment` (要APIキー) |

### 短期反発候補 (`reversal_screener.py` の `WEIGHTS`)

| シグナル | 内容 | 重み | ゲート |
|---|---|---|---|
| drawdown | 20日高値からの下落幅 | 1.5 | 必須(`MIN_DRAWDOWN_PCT`以下でなければ即除外) |
| rsi_oversold | RSI(14)の売られすぎ度 | 2.0 | - |
| volume_climax | 出来高急増日の終値位置(セリングクライマックス後の切り返し) | 2.0 | higher_lowとのOR条件で必須 |
| higher_low | 直近安値の切り上げ率 | 1.5 | volume_climaxとのOR条件で必須 |
| volatility_contraction | 値動きの収縮度 | 1.0 | - |
| short_squeeze | 空売り比率(踏み上げ余地、日本株はJ-Quants `/markets/short_selling`、米国株はyfinance `shortPercentOfFloat`) | 1.0 | - |

重みと各シグナルの閾値(`*_RANGE`定数、何%で0点/100点になるか)はすべて仮置きです。
実データを見ながら分布を確認し、調整する必要があります。

## 未検証・要確認事項(最優先で潰すべきポイント)

1. **J-Quantsのエンドポイントパス** — `/markets/weekly_margin_interest`、`/markets/short_selling`、
   `/markets/trades_spec` の3つはドキュメントを見ながら実装したが実際に叩いて確認していません。
   パス名・レスポンスのフィールド名(`LongMarginTradeVolume`等)が実際と違う可能性が高いので、
   最新の公式リファレンス(https://jpx-jquants.com/)と首っ引きで確認・修正すること。
   フィールドが存在しない場合は当該シグナルが`None`になり合成スコアから自動的に除外される設計に
   してありますが、実際にどのシグナルが常時欠損するかは要確認です。
2. **`MARKET_FLOW_RANGE`が仮の数値** — `jp_screener.py`内の値は実データの分布を見ずに置いた仮の値
   です。実際の海外投資家売買代金の規模感(数千億円単位のはず)に合わせて再設定が必要です。
3. **yfinanceの`info`辞書のキー名は変更されることがある** — `earningsGrowth`、
   `shortPercentOfFloat`、`heldPercentInstitutions`などは非公式API由来でYahoo側の仕様変更で
   欠損・変化することがあります。`None`が返ってきても動く設計にはしてありますが、実際どの程度
   欠損するか確認が必要です。
4. **Financial Modeling Prep無料枠の制限** — 無料プランはリクエスト数・取得できるヒストリー期間に
   制限があります(要最新のプラン確認)。本格運用するなら有料プランへの切り替えを検討してください。
5. **J-Quantsのプラン制限** — フリープランは取得できるデータ期間・銘柄数に制限があります。
   `jp_screener.screen_real(limit=30)`のようにプロトタイプでは銘柄数を絞っていますが、本番運用時に
   どこまで拡張できるかプラン内容を確認してください。
6. **スコア閾値`MIN_SCORE=55`も仮置き** — 実データで何件くらい候補が出るかを見ながら調整してください。

## セットアップ

```bash
pip install -r stock_screener/requirements.txt

# 日本株用
export JQUANTS_MAIL="your_email@example.com"
export JQUANTS_PASSWORD="your_password"

# 米国株の高度なシグナル用(任意、なくても動く)
export FMP_API_KEY="your_fmp_api_key"
```

## 実行

```bash
cd stock_screener

# デモ動作確認 (APIキー不要)
python run_all.py --demo

# 実データ
python run_all.py --jp-limit 30 --us-tickers AAPL,MSFT,NVDA,GOOGL,AMZN
```

実行後、`stock_screener/result.html` をブラウザで開くと結果を確認できます。

## 今後のロードマップ(優先度順の一案)

1. 実APIキーでの動作確認(上記「未検証・要確認事項」を潰す)
2. スコア閾値・重みのチューニング(実データの分布を見ながら)
3. 自動実行の仕組み化(GAS/cronで毎朝実行 → LINE等に通知)
4. 発注導線の追加(結果HTMLから証券会社アプリを開けるようにする等、スマホでの使い勝手向上)
5. 売却タイミング提案の実装(保有銘柄を入力すると売り時シグナルを出す、別ロジックとして新規構築)
6. バックテスト(このスコアリングロジックが過去データでどの程度機能したかの検証。実運用前に必須)

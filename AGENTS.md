# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# 成果物の記録ルール(必須)

意味のある成果物(新機能の実装、重要な不具合修正、ドキュメント一式の作成など、ユーザーに「完了」として報告する単位)が1つ完了するたびに、必ず次の2つを行う。

1. **成果物ダッシュボードへの登録**
   - 実体はGoogleスプレッドシート「制作物ダッシュボードデータ」(ID: `1BGbWZq-J7QTnzMoN1foAQSvdYb3JLFIJXYYOCAKT2Q8`、Projectsシート)。列は `ID,名前,種類,URL,状態,概要,タグ,登録日,最終更新日,最終チェック日時,最終チェック結果`。
   - GAS Webアプリ(制作物ダッシュボード、URL: `https://script.google.com/macros/s/AKfycbz5fv8_6PVfqbYAOgTdbFJccs-42Ai2fAR3HH2uGfTidaJm494zTTGVU5nAlarAF_9aOQ/exec`)が `action=add` / `action=update` のクエリパラメータ経由でこのシートに行を追加・更新できる(PC側のClaude Codeセッションで動作確認済み。正確なパラメータ仕様は要追記)。
   - **このセッションが `script.google.com` へのアクセスを許可されていない場合**(クラウド版Claude Code等、ネットワークポリシーでブロックされる環境): 直接の登録はできない。その場合は登録用の行データ(上記CSV列に沿った内容)を必ずその場で提示し、「PC側のセッションでこのダッシュボードAPIへの登録をお願いします」とユーザーに明示すること。黙って省略しない。
   - PC側のClaude Codeセッション(Remote Control等でネットワーク制限のない環境)から実行できる場合は、直接 `action=add` を呼んで登録する。

2. **Googleドライブへのバックアップ**
   - 完成した成果物の内容(進捗レポート、ドキュメント、まとめ等)をGoogle Drive連携(`mcp__Google_Drive__create_file` 等)で保存する。既存ファイルを更新したい場合は、DriveのファイルID/URLをユーザーに確認してから進める。
   - このセッションでGoogle Drive連携が使えない場合は、その旨をユーザーに伝え、代替手段(手動保存を依頼する等)を提示する。

この2つは「言われたらやる」のではなく、成果物が完成するたびに**自発的に**行うこと。実行できない制約(ネットワークブロック等)がある場合も、省略するのではなく、その制約と代替手段を必ずユーザーに伝える。

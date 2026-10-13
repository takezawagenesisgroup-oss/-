/**
 * アプリ全体の設定（管理者が 1 回だけ設定する）
 *
 * googleClientId: Google Cloud で作成した OAuth クライアント ID（「ウェブ アプリケーション」）
 *   これを設定すると、利用者は「Google でログイン」するだけで自分のカレンダーに登録できる。
 *   作り方は docs/google-login-setup.md を参照。クライアント ID は公開されても問題ない値。
 */
window.VOICE_SCHEDULE_CONFIG = {
  googleClientId: ''
};

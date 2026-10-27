/**
 * 竹澤さんの Google カレンダー → ジェネシスワークシステム（GWS）のスケジュール 自動連携
 *
 * スマホの Google カレンダーアプリで予定を入力・変更・削除すると、
 * そのたびに syncToGenesis() が自動で動き、前回からの差分だけを GWS に送る。
 * （PC で入力した予定、音声スケジュールで登録した予定も同じように送られる）
 *
 * 設定（スクリプトプロパティ）:
 *   GENESIS_ENDPOINT  GWS の予定受け取り API の URL
 *   GENESIS_TOKEN     その API の認証トークン
 *   GENESIS_DRY_RUN   true にすると GWS へ送らず、送る予定をログに表示するだけ（動作確認用）
 *   CALENDAR_ID       任意。連携するカレンダー（省略時は自分のメインカレンダー）
 *
 * 使い方:
 *   1. 上の設定をしてから installGenesisTrigger() を 1 回実行
 *   2. 以降は自動。全件送り直したいときは resetGenesisSync() を実行
 *
 * ※ 「サービス」に Google Calendar API（識別子 Calendar）の追加が必要（appsscript.json に記載済み）。
 *   GWS 側の API 仕様は docs/genesis-integration.md を参照。
 */

var GENESIS_SYNC_TOKEN_KEY = 'GENESIS_SYNC_TOKEN';
var GENESIS_INITIAL_DAYS_BACK = 30;

/** 自動連携を開始する（1 回だけ実行） */
function installGenesisTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncToGenesis') ScriptApp.deleteTrigger(t);
  });
  var calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID') || Session.getEffectiveUser().getEmail();
  // カレンダーが変わったらすぐ実行
  ScriptApp.newTrigger('syncToGenesis').forUserCalendar(calendarId).onEventUpdated().create();
  // 念のため 10 分ごとにも実行（通知の取りこぼし・GWS 側の一時停止からの再送のため）
  ScriptApp.newTrigger('syncToGenesis').timeBased().everyMinutes(10).create();
  syncToGenesis();
  Logger.log('自動連携を開始しました');
}

/** 自動連携を止める */
function uninstallGenesisTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncToGenesis') ScriptApp.deleteTrigger(t);
  });
  Logger.log('自動連携を停止しました');
}

/** 次回、30 日前以降の予定を全件 GWS に送り直す */
function resetGenesisSync() {
  PropertiesService.getScriptProperties().deleteProperty(GENESIS_SYNC_TOKEN_KEY);
  syncToGenesis();
}

function syncToGenesis() {
  var props = PropertiesService.getScriptProperties();
  var endpoint = props.getProperty('GENESIS_ENDPOINT');
  var dryRun = String(props.getProperty('GENESIS_DRY_RUN')).toLowerCase() === 'true';
  if (!endpoint && !dryRun) {
    Logger.log('GENESIS_ENDPOINT が未設定のため、ジェネシスワークシステム連携はスキップしました');
    return;
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return;
  try {
    var calendarId = props.getProperty('CALENDAR_ID') || 'primary';
    var userEmail = Session.getEffectiveUser().getEmail();
    var syncToken = props.getProperty(GENESIS_SYNC_TOKEN_KEY);
    var timeMin = new Date(Date.now() - GENESIS_INITIAL_DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
    var fullSync = !syncToken;

    var result;
    try {
      result = fetchCalendarChanges_(calendarId, syncToken, timeMin);
    } catch (err) {
      if (!syncToken || !(String(err).indexOf('410') !== -1 || /sync token/i.test(String(err)))) throw err;
      // Google 側で同期位置が無効になったら全件を取り直す
      fullSync = true;
      result = fetchCalendarChanges_(calendarId, null, timeMin);
    }

    var events = result.items.map(function (item) { return toGenesisEvent_(item, userEmail); });
    if (!events.length && !fullSync) return;

    // 形式は docs/genesis-integration.md と同じ（sync/ 版とも共通）
    var payload = {
      source: 'google-calendar',
      userEmail: userEmail,
      fullSync: fullSync,
      timeMin: fullSync ? timeMin : null,
      batch: { index: 0, total: 1 },
      events: events
    };

    if (dryRun) {
      // 動作確認用: 送らずに内容をログに出す（同期位置も進めない）
      Logger.log('[DRY_RUN] ' + events.length + ' 件（fullSync=' + fullSync + '）');
      events.slice(0, 20).forEach(function (e) {
        Logger.log(e.status === 'deleted' ? '  削除 ' + e.googleEventId : '  ' + e.start + ' ' + e.title);
      });
      return;
    }

    var res = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + (props.getProperty('GENESIS_TOKEN') || '') },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) {
      // 送信に失敗したら同期位置を進めない（次回まとめて再送）
      throw new Error('ジェネシスワークシステムへの送信に失敗: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
    }
    if (result.nextSyncToken) props.setProperty(GENESIS_SYNC_TOKEN_KEY, result.nextSyncToken);
    Logger.log(events.length + ' 件をジェネシスワークシステムに送信しました' + (fullSync ? '（全件）' : ''));
  } finally {
    lock.releaseLock();
  }
}

/** syncToken があれば差分だけ、なければ timeMin 以降の全件を取得する */
function fetchCalendarChanges_(calendarId, syncToken, timeMin) {
  var options = { maxResults: 250, showDeleted: true, singleEvents: true };
  if (syncToken) options.syncToken = syncToken;
  else options.timeMin = timeMin;
  var items = [];
  var response;
  do {
    response = Calendar.Events.list(calendarId, options);
    items = items.concat(response.items || []);
    options.pageToken = response.nextPageToken;
  } while (options.pageToken);
  return { items: items, nextSyncToken: response.nextSyncToken };
}

/**
 * Google カレンダーの予定をジェネシスワークシステムに送る形式へ変換する
 * （sync/src/transform.js と同じ内容）
 */
function toGenesisEvent_(item, userEmail) {
  var base = {
    userEmail: userEmail,
    googleEventId: item.id,          // userEmail + googleEventId をキーに登録・更新・削除する
    googleCalendarId: 'primary',
    status: item.status === 'cancelled' ? 'deleted' : 'active'
  };
  if (base.status === 'deleted') return base;

  var isPrivate = item.visibility === 'private' || item.visibility === 'confidential';
  var self = (item.attendees || []).filter(function (a) { return a.self; })[0];
  var ext = item.extendedProperties && item.extendedProperties.private;
  base.title = isPrivate ? '予定あり' : (item.summary || '(タイトルなし)');
  base.location = isPrivate ? '' : (item.location || '');
  base.description = isPrivate ? '' : (item.description || '');
  base.private = isPrivate;
  base.allDay = !!(item.start && item.start.date);
  base.start = item.start ? (item.start.dateTime || item.start.date) : null;
  base.end = item.end ? (item.end.dateTime || item.end.date) : null;  // 終日の場合は翌日（排他的）
  base.timeZone = (item.start && item.start.timeZone) || null;
  base.iCalUID = item.iCalUID || null;
  base.recurringEventId = item.recurringEventId || null;
  base.organizerEmail = (item.organizer && item.organizer.email) || null;
  base.myResponseStatus = self ? self.responseStatus : null;
  base.attendees = isPrivate ? [] : (item.attendees || []).map(function (a) { return { email: a.email, responseStatus: a.responseStatus }; });
  base.busy = item.transparency !== 'transparent';
  base.source = (ext && ext.source) || null;
  base.updated = item.updated || null;
  base.htmlLink = isPrivate ? '' : (item.htmlLink || '');
  return base;
}

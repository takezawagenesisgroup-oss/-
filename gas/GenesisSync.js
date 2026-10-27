/**
 * Google カレンダー → ジェネシスワークシステム 連携（準備中）
 *
 * ジェネシスワークシステムのカレンダー機能が完成したら、スクリプトプロパティに
 *   GENESIS_ENDPOINT  予定を受け取る API の URL
 *   GENESIS_TOKEN     その API の認証トークン
 * を設定し、installGenesisTrigger() を 1 回実行する。
 *
 * 仕組み: Google カレンダーが更新されるたびに syncToGenesis() が動き、
 * 前回からの差分（追加・変更・削除）だけを Calendar API の syncToken で取得して送る。
 * 音声で登録した予定だけでなく、Google カレンダーに直接手入力した予定も同じように連携される。
 *
 * ※ 「サービス」から Google Calendar API（高度なサービス、識別子 Calendar）の追加が必要。
 *   詳しくは docs/genesis-integration.md を参照。
 */

var GENESIS_SYNC_TOKEN_KEY = 'GENESIS_SYNC_TOKEN';

function installGenesisTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncToGenesis') ScriptApp.deleteTrigger(t);
  });
  var calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID') || Session.getEffectiveUser().getEmail();
  ScriptApp.newTrigger('syncToGenesis').forUserCalendar(calendarId).onEventUpdated().create();
  syncToGenesis(); // 初回の syncToken を取得
}

function syncToGenesis() {
  var props = PropertiesService.getScriptProperties();
  var endpoint = props.getProperty('GENESIS_ENDPOINT');
  if (!endpoint) {
    Logger.log('GENESIS_ENDPOINT が未設定のため、ジェネシスワークシステム連携はスキップしました');
    return;
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return;
  try {
    var calendarId = props.getProperty('CALENDAR_ID') || 'primary';
    var syncToken = props.getProperty(GENESIS_SYNC_TOKEN_KEY);
    var userEmail = Session.getEffectiveUser().getEmail();
    var fullSync = !syncToken;
    var options = { maxResults: 250, showDeleted: true, singleEvents: true };
    if (syncToken) {
      options.syncToken = syncToken;
    } else {
      // 初回は 30 日前以降の予定を対象にする
      options.timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    var changes = [];
    var response;
    do {
      try {
        response = Calendar.Events.list(calendarId, options);
      } catch (err) {
        if (String(err).indexOf('410') !== -1 || /Sync token/i.test(String(err))) {
          // syncToken が失効したら取り直し（全件再送）
          props.deleteProperty(GENESIS_SYNC_TOKEN_KEY);
          return syncToGenesis();
        }
        throw err;
      }
      (response.items || []).forEach(function (item) { changes.push(toGenesisEvent_(item, userEmail)); });
      options.pageToken = response.nextPageToken;
    } while (options.pageToken);

    if (changes.length || fullSync) {
      var res = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + (props.getProperty('GENESIS_TOKEN') || '') },
        // 形式は sync/（全社員版）と同じ。docs/genesis-integration.md を参照
        payload: JSON.stringify({
          source: 'google-calendar',
          userEmail: userEmail,
          fullSync: fullSync,
          timeMin: fullSync ? options.timeMin : null,
          batch: { index: 0, total: 1 },
          events: changes
        }),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() >= 300) {
        // 送信に失敗したら syncToken を進めない（次回まとめて再送）
        throw new Error('ジェネシスワークシステムへの送信に失敗: ' + res.getResponseCode() + ' ' + res.getContentText());
      }
    }
    if (response.nextSyncToken) props.setProperty(GENESIS_SYNC_TOKEN_KEY, response.nextSyncToken);
  } finally {
    lock.releaseLock();
  }
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

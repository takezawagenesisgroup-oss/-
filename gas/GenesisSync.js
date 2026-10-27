/**
 * 竹澤さんの Google カレンダー ⇄ ジェネシスワークシステム（GWS）のスケジュール 双方向同期
 *
 *  Google → GWS: スマホ・PC の Google カレンダーで入力・変更・削除すると、すぐに GWS へ送る
 *  GWS → Google: GWS の画面で入力・変更・削除した予定を 5 分ごとに取りに行き、Google カレンダーへ反映する
 *
 * 設定（スクリプトプロパティ）:
 *   GENESIS_ENDPOINT          Google → GWS: 予定を送る API の URL（POST）
 *   GENESIS_CHANGES_ENDPOINT  GWS → Google: GWS で変わった予定を取得する API の URL（GET）。未設定なら片方向のみ
 *   GENESIS_TOKEN             上の 2 つの API の認証トークン
 *   GENESIS_DRY_RUN           true にすると送信・反映をせず、内容をログに表示するだけ（動作確認用）
 *   CALENDAR_ID               任意。連携するカレンダー（省略時は自分のメインカレンダー）
 *
 * 使い方:
 *   1. 上の設定をしてから installGenesisTrigger() を 1 回実行
 *   2. 以降は自動。全件送り直したいときは resetGenesisSync() を実行
 *
 * 行ったり来たりしない仕組み:
 *   - GWS から Google に登録した予定には genesisId を付けておき、Google → GWS で戻るときに同じ予定として扱われる
 *   - GWS の「変更一覧」には GWS の画面での変更だけを載せてもらう（Google から届いた変更は載せない／origin: 'google'）
 *   - 両方で変更された場合は、更新日時が新しい方を採用する
 *
 * ※ 「サービス」に Google Calendar API（識別子 Calendar）の追加が必要（appsscript.json に記載済み）。
 *   GWS 側の API 仕様は docs/genesis-integration.md を参照。
 */

var GENESIS_SYNC_TOKEN_KEY = 'GENESIS_SYNC_TOKEN';
var GENESIS_PULL_CURSOR_KEY = 'GENESIS_PULL_CURSOR';
var GENESIS_INITIAL_DAYS_BACK = 30;
var GENESIS_TIME_ZONE = 'Asia/Tokyo';
var GENESIS_HANDLERS = ['syncWithGenesis', 'syncToGenesis'];

/** 自動同期を開始する（1 回だけ実行） */
function installGenesisTrigger() {
  uninstallGenesisTrigger();
  var calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID') || Session.getEffectiveUser().getEmail();
  // Google カレンダーが変わったらすぐ実行
  ScriptApp.newTrigger('syncWithGenesis').forUserCalendar(calendarId).onEventUpdated().create();
  // GWS 側の変更の取り込み（と、通知の取りこぼし・GWS 停止からの再送）のため 5 分ごとにも実行
  ScriptApp.newTrigger('syncWithGenesis').timeBased().everyMinutes(5).create();
  syncWithGenesis();
  Logger.log('自動同期を開始しました');
}

/** 自動同期を止める */
function uninstallGenesisTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (GENESIS_HANDLERS.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
}

/** 最初からやり直す（Google の予定を全件 GWS に送り直し、GWS の変更も最初から取り込み直す） */
function resetGenesisSync() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(GENESIS_SYNC_TOKEN_KEY);
  props.deleteProperty(GENESIS_PULL_CURSOR_KEY);
  syncWithGenesis();
}

/** 以前の名前（トリガーが残っていても動くように） */
function syncToGenesis() {
  syncWithGenesis();
}

/** 双方向同期を 1 回実行する */
function syncWithGenesis() {
  var props = PropertiesService.getScriptProperties();
  var dryRun = String(props.getProperty('GENESIS_DRY_RUN')).toLowerCase() === 'true';
  var pushEndpoint = props.getProperty('GENESIS_ENDPOINT');
  var pullEndpoint = props.getProperty('GENESIS_CHANGES_ENDPOINT');
  if (!pushEndpoint && !pullEndpoint && !dryRun) {
    Logger.log('GENESIS_ENDPOINT が未設定のため、ジェネシスワークシステム連携はスキップしました');
    return;
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return;
  try {
    var ctx = {
      props: props,
      dryRun: dryRun,
      calendarId: props.getProperty('CALENDAR_ID') || 'primary',
      userEmail: Session.getEffectiveUser().getEmail(),
      token: props.getProperty('GENESIS_TOKEN') || ''
    };
    // 先に GWS → Google を反映し、その結果（genesisId 付きの予定）を同じ回で GWS に送り返して紐づける
    if (pullEndpoint) pullFromGenesis_(ctx, pullEndpoint);
    if (pushEndpoint || dryRun) pushToGenesis_(ctx, pushEndpoint);
  } finally {
    lock.releaseLock();
  }
}

// ---------- Google → GWS ----------

function pushToGenesis_(ctx, endpoint) {
  var props = ctx.props;
  var syncToken = props.getProperty(GENESIS_SYNC_TOKEN_KEY);
  var timeMin = new Date(Date.now() - GENESIS_INITIAL_DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
  var fullSync = !syncToken;

  var result;
  try {
    result = fetchCalendarChanges_(ctx.calendarId, syncToken, timeMin);
  } catch (err) {
    if (!syncToken || !(String(err).indexOf('410') !== -1 || /sync token/i.test(String(err)))) throw err;
    // Google 側で同期位置が無効になったら全件を取り直す
    fullSync = true;
    result = fetchCalendarChanges_(ctx.calendarId, null, timeMin);
  }

  var events = result.items.map(function (item) { return toGenesisEvent_(item, ctx.userEmail); });
  if (!events.length && !fullSync) return 0;

  // 形式は docs/genesis-integration.md と同じ（sync/ 版とも共通）
  var payload = {
    source: 'google-calendar',
    userEmail: ctx.userEmail,
    fullSync: fullSync,
    timeMin: fullSync ? timeMin : null,
    batch: { index: 0, total: 1 },
    events: events
  };

  if (ctx.dryRun) {
    // 動作確認用: 送らずに内容をログに出す（同期位置も進めない）
    Logger.log('[DRY_RUN] Google → GWS ' + events.length + ' 件（fullSync=' + fullSync + '）');
    events.slice(0, 20).forEach(function (e) {
      Logger.log(e.status === 'deleted' ? '  削除 ' + e.googleEventId : '  ' + e.start + ' ' + e.title);
    });
    return events.length;
  }

  var res = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ctx.token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    // 送信に失敗したら同期位置を進めない（次回まとめて再送）
    throw new Error('ジェネシスワークシステムへの送信に失敗: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  }
  if (result.nextSyncToken) props.setProperty(GENESIS_SYNC_TOKEN_KEY, result.nextSyncToken);
  Logger.log('Google → GWS: ' + events.length + ' 件を送信しました' + (fullSync ? '（全件）' : ''));
  return events.length;
}

// ---------- GWS → Google ----------

function pullFromGenesis_(ctx, endpoint) {
  var props = ctx.props;
  var cursor = props.getProperty(GENESIS_PULL_CURSOR_KEY) || '';
  var count = 0;
  var data;
  do {
    var url = endpoint + (endpoint.indexOf('?') === -1 ? '?' : '&') +
      'userEmail=' + encodeURIComponent(ctx.userEmail) + '&since=' + encodeURIComponent(cursor);
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + ctx.token },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) {
      throw new Error('ジェネシスワークシステムからの取得に失敗: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
    }
    data = JSON.parse(res.getContentText() || '{}');
    (data.schedules || []).forEach(function (s) {
      if (s.origin === 'google') return; // Google から届いた変更は Google に戻さない
      if (ctx.dryRun) {
        Logger.log('[DRY_RUN] GWS → Google ' + (s.status === 'deleted' ? '削除 ' : '') + s.start + ' ' + (s.title || ''));
      } else {
        applyGenesisSchedule_(ctx.calendarId, s);
      }
      count++;
    });
    if (ctx.dryRun) break; // 動作確認では位置を進めない
    // ページ単位で位置を進める（途中で失敗してもそのページから再開。反映は何度やっても同じ結果になる）
    if (data.cursor !== undefined && data.cursor !== null) {
      cursor = String(data.cursor);
      props.setProperty(GENESIS_PULL_CURSOR_KEY, cursor);
    }
  } while (data.hasMore);
  if (count && !ctx.dryRun) Logger.log('GWS → Google: ' + count + ' 件を反映しました');
  return count;
}

/** GWS の予定 1 件を Google カレンダーに反映する */
function applyGenesisSchedule_(calendarId, s) {
  var existing = findEventForSchedule_(calendarId, s);
  var alive = !!existing && existing.status !== 'cancelled';
  try {
    if (s.status === 'deleted') {
      if (alive) Calendar.Events.remove(calendarId, existing.id);
      return alive ? 'deleted' : 'skipped';
    }
    // 両方で変更されていたら新しい方を採用（Google の方が新しければ、その内容が GWS に送られる）
    if (alive && s.updatedAt && existing.updated && Date.parse(existing.updated) > Date.parse(s.updatedAt)) return 'skipped';

    var resource = genesisToCalendarEvent_(s, alive ? existing : null);
    if (alive) {
      Calendar.Events.patch(resource, calendarId, existing.id);
      return 'updated';
    }
    Calendar.Events.insert(resource, calendarId);
    return 'created';
  } catch (err) {
    // 権限がない予定（他の人が主催の会議など）や存在しない予定は、ログに残して先へ進む
    if (/403|404|forbidden|not found|insufficient permission/i.test(String(err))) {
      Logger.log('GWS → Google: 反映できない予定をスキップしました（' + s.genesisId + '）: ' + err);
      return 'skipped';
    }
    throw err;
  }
}

/** GWS の予定に対応する Google の予定を探す（googleEventId → なければ genesisId で検索） */
function findEventForSchedule_(calendarId, s) {
  if (s.googleEventId) {
    try {
      var ev = Calendar.Events.get(calendarId, s.googleEventId);
      if (ev) return ev;
    } catch (err) {
      if (!/404|410|not found|deleted/i.test(String(err))) throw err;
    }
  }
  if (!s.genesisId) return null;
  // 前回の反映が途中で止まった場合などに二重登録しないよう、genesisId でも探す
  var res = Calendar.Events.list(calendarId, { privateExtendedProperty: 'genesisId=' + s.genesisId, showDeleted: true, maxResults: 10 });
  var items = res.items || [];
  return items.filter(function (e) { return e.status !== 'cancelled'; })[0] || items[0] || null;
}

function addDays_(dateStr, n) {
  var p = dateStr.slice(0, 10).split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return d.toISOString().slice(0, 10);
}

/** GWS の予定 → Google カレンダーの予定（existing があれば更新用） */
function genesisToCalendarEvent_(s, existing) {
  var ext = (existing && existing.extendedProperties && existing.extendedProperties.private) || {};
  var priv = {};
  Object.keys(ext).forEach(function (k) { priv[k] = ext[k]; });
  priv.genesisId = s.genesisId;

  var resource = { extendedProperties: { private: priv } };
  // 非公開の予定は GWS では「予定あり」と表示されているので、件名などは上書きしない（日時だけ反映）
  var isPrivate = existing && (existing.visibility === 'private' || existing.visibility === 'confidential');
  if (!isPrivate) {
    resource.summary = s.title || '(タイトルなし)';
    resource.location = s.location || '';
    resource.description = s.description || '';
  }

  if (s.allDay) {
    var startDate = String(s.start).slice(0, 10);
    var endDate = s.end ? String(s.end).slice(0, 10) : '';
    if (!endDate || endDate <= startDate) endDate = addDays_(startDate, 1); // 終日の end は最終日の翌日
    resource.start = { date: startDate, dateTime: null };
    resource.end = { date: endDate, dateTime: null };
  } else {
    var end = s.end;
    if (!end || Date.parse(end) <= Date.parse(s.start)) end = new Date(Date.parse(s.start) + 60 * 60 * 1000).toISOString();
    resource.start = { dateTime: s.start, timeZone: GENESIS_TIME_ZONE, date: null };
    resource.end = { dateTime: end, timeZone: GENESIS_TIME_ZONE, date: null };
  }
  return resource;
}

// ---------- 共通 ----------

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
  base.genesisId = (ext && ext.genesisId) || null;  // GWS で作られた予定（GWS はこれで元の予定に紐づける）
  base.updated = item.updated || null;
  base.htmlLink = isPrivate ? '' : (item.htmlLink || '');
  return base;
}

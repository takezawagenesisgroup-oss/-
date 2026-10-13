/**
 * 音声スケジュール登録 - Google Apps Script（Web アプリ）
 *
 * PWA や iPhone のショートカットから POST を受け取り、Google カレンダーに予定を登録する。
 * 「自分として実行」でデプロイするので、OAuth クライアントの準備やトークンの期限切れを気にせず使える。
 *
 * ※ 合言葉（API キー）による認証は行っていない。ウェブアプリの URL を知っている人は誰でも登録できるため、
 *   URL は他人に共有しないこと。
 *
 * スクリプトプロパティ（プロジェクトの設定 → スクリプト プロパティ）:
 *   CALENDAR_ID  任意。登録先カレンダー ID（省略時はデフォルトカレンダー）
 *
 * リクエスト（POST、本文は JSON）:
 *   { "text": "明日15時から会議" }                 … サーバー側で解析して登録
 *   { "text": "...", "dryRun": true }              … 解析結果だけ返す
 *   { "event": { title, startDate, startTime, ... } } … 解析済み（PWA で確認・修正済み）の予定を登録
 */

var SOURCE_TAG = 'voice-schedule';

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var event = body.event || parseSchedule(body.text || '', new Date());
    if (body.dryRun) return json_({ ok: true, event: event });

    var created = createEvent_(event);
    return json_({ ok: true, event: event, created: created });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/** 動作確認用。ブラウザで Web アプリの URL を開くと応答する */
function doGet() {
  return json_({ ok: true, service: 'voice-schedule', time: new Date().toISOString() });
}

function getCalendar_() {
  var id = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
  var cal = id ? CalendarApp.getCalendarById(id) : CalendarApp.getDefaultCalendar();
  if (!cal) throw new Error('カレンダーが見つかりません: ' + id);
  return cal;
}

/** "2026-10-15" + "14:30" → スクリプトのタイムゾーン（Asia/Tokyo）での Date */
function toDate_(dateStr, timeStr) {
  var d = dateStr.split('-').map(Number);
  var t = (timeStr || '00:00').split(':').map(Number);
  return new Date(d[0], d[1] - 1, d[2], t[0], t[1]);
}

function createEvent_(ev) {
  if (!ev || !ev.title || !ev.startDate) throw new Error('予定の内容または日付がありません');
  var cal = getCalendar_();
  var options = {};
  if (ev.location) options.location = ev.location;
  options.description = ev.description || (ev.source ? '音声入力: ' + ev.source : '');

  var created;
  if (ev.allDay || !ev.startTime) {
    var start = toDate_(ev.startDate);
    var end = toDate_(ev.endDate || ev.startDate);
    if (end.getTime() === start.getTime()) {
      created = cal.createAllDayEvent(ev.title, start, options);
    } else {
      // createAllDayEvent の終了日は「翌日」を指定する（排他的）
      end.setDate(end.getDate() + 1);
      created = cal.createAllDayEvent(ev.title, start, end, options);
    }
  } else {
    var startAt = toDate_(ev.startDate, ev.startTime);
    var endAt = toDate_(ev.endDate || ev.startDate, ev.endTime || ev.startTime);
    if (endAt <= startAt) endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    created = cal.createEvent(ev.title, startAt, endAt, options);
  }

  // 後でジェネシスワークシステムへ連携する際の目印
  created.setTag('source', SOURCE_TAG);

  return {
    id: created.getId(),
    title: created.getTitle(),
    calendar: cal.getName(),
    start: created.getStartTime().toISOString(),
    end: created.getEndTime().toISOString(),
    url: eventUrl_(created, cal)
  };
}

function eventUrl_(event, cal) {
  // Google カレンダーで予定を開く URL（eid = base64(イベントID + ' ' + カレンダーID)）
  var eventId = event.getId().replace(/@.*$/, '');
  var eid = Utilities.base64EncodeWebSafe(eventId + ' ' + cal.getId()).replace(/=+$/, '');
  return 'https://www.google.com/calendar/event?eid=' + eid;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 初期設定用: エディタからこの関数を 1 回実行して、カレンダーへのアクセスを許可しておく */
function setup() {
  Logger.log('登録先カレンダー: ' + getCalendar_().getName());
}

/** エディタから解析結果を試す */
function testParse() {
  Logger.log(JSON.stringify(parseSchedule('明日の午後3時から1時間、田中さんと打ち合わせ、場所は渋谷オフィス', new Date()), null, 2));
}

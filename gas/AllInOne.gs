// ============================================================================
// 音声スケジュール + ジェネシスワーク同期（Apps Script 用・全部まとめたファイル）
// Apps Script エディタの「コード.gs」の中身をすべて消して、このファイルの中身を貼り付ける。
// ※ このファイルは scripts/sync-gas.sh で自動生成。直接編集しないこと。
// ============================================================================

// ----- gas/Parser.js -----
/**
 * 日本語の音声入力テキストからスケジュール情報を取り出すパーサー。
 *
 * ブラウザ（PWA）と Google Apps Script の両方で同じコードを使う。
 * そのため import / export は使わず、グローバル関数 parseSchedule を定義する。
 * gas/Parser.js はこのファイルのコピー（scripts/sync-gas.sh で更新）。
 *
 * 例: 「10月15日14時から16時まで本社会議室で営業会議」
 *   → { title: '営業会議', location: '本社会議室',
 *       startDate: '2026-10-15', startTime: '14:00',
 *       endDate: '2026-10-15', endTime: '16:00', allDay: false }
 */
(function (root) {
  'use strict';

  var MARK = '␟'; // 取り出した部分の目印（後でタイトル組み立て時に区切りとして使う）
  var WEEKDAYS = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
  var DEFAULT_DURATION_MIN = 60;

  // ---------- 日付ユーティリティ（タイムゾーンに依存しないよう UTC で計算） ----------

  function ymd(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  function addDays(date, n) {
    return ymd(date.y, date.m, date.d + n);
  }

  function weekday(date) {
    return new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
  }

  function compare(a, b) {
    return (a.y - b.y) || (a.m - b.m) || (a.d - b.d);
  }

  function isValidDate(y, m, d) {
    var dt = ymd(y, m, d);
    return dt.y === y && dt.m === m && dt.d === d;
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatDate(date) {
    return date.y + '-' + pad(date.m) + '-' + pad(date.d);
  }

  function formatTime(min) {
    return pad(Math.floor(min / 60)) + ':' + pad(min % 60);
  }

  // ---------- 正規化 ----------

  function kanjiToNumber(s) {
    var digits = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
    if (s.indexOf('十') === -1) {
      var v = 0;
      for (var i = 0; i < s.length; i++) v = v * 10 + digits[s[i]];
      return v;
    }
    var parts = s.split('十');
    var tens = parts[0] === '' ? 1 : digits[parts[0]];
    var ones = parts[1] === '' ? 0 : digits[parts[1]];
    return tens * 10 + ones;
  }

  function normalize(text) {
    var t = String(text || '');
    // 全角英数字・記号を半角に
    t = t.replace(/[０-９Ａ-Ｚａ-ｚ：／＠]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    });
    t = t.replace(/[　\s]+/g, ' ');
    t = t.replace(/[〜～]/g, '~');
    // 漢数字（単位付きのものだけ）を算用数字に。「一緒」などを壊さないため単位を必須にする
    t = t.replace(/([〇零一二三四五六七八九十]+)(?=年|月|日|時|分|週|時間|分間)/g, function (m) {
      return String(kanjiToNumber(m));
    });
    return t.trim();
  }

  // ---------- 抽出処理 ----------

  /** 正規表現にマッチした部分を目印に置き換えながら取り出す */
  function take(state, re, handler) {
    var found = false;
    state.text = state.text.replace(re, function () {
      if (found) return arguments[0];
      var result = handler.apply(null, arguments);
      if (result === false) return arguments[0];
      found = true;
      return MARK;
    });
    return found;
  }

  function resolveMonthDay(m, d, today, explicitYear) {
    if (explicitYear) return isValidDate(explicitYear, m, d) ? ymd(explicitYear, m, d) : null;
    if (!isValidDate(today.y, m, d) && !isValidDate(today.y + 1, m, d)) return null;
    var date = ymd(today.y, m, d);
    // 年の指定がなく、すでに過ぎた日付なら来年とみなす
    if (compare(date, today) < 0) date = ymd(today.y + 1, m, d);
    return date;
  }

  function resolveDay(d, today) {
    var date = { y: today.y, m: today.m, d: d };
    if (!isValidDate(date.y, date.m, d) || compare(date, today) < 0) {
      var next = ymd(today.y, today.m + 1, 1);
      if (!isValidDate(next.y, next.m, d)) return null;
      return { y: next.y, m: next.m, d: d };
    }
    return date;
  }

  function resolveWeekday(prefix, wd, today) {
    var todayWd = weekday(today);
    if (!prefix) {
      // 「金曜」だけなら今日以降で最初の金曜
      return addDays(today, (wd - todayWd + 7) % 7);
    }
    // 週は月曜始まりで考える
    var mondayOffset = (todayWd + 6) % 7;
    var monday = addDays(today, -mondayOffset);
    var weeks = prefix === '再来週' ? 2 : prefix === '来週' ? 1 : 0;
    return addDays(monday, weeks * 7 + (wd + 6) % 7);
  }

  /** 日付表現を 1 つ取り出す。見つからなければ null */
  function takeDate(state, today) {
    var date = null;
    var rules = [
      [/(\d{4})年(\d{1,2})月(\d{1,2})日/, function (_, y, m, d) {
        date = resolveMonthDay(+m, +d, today, +y);
        return !!date;
      }],
      [/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, function (_, y, m, d) {
        date = resolveMonthDay(+m, +d, today, +y);
        return !!date;
      }],
      [/(\d{1,2})月(\d{1,2})日/, function (_, m, d) {
        date = resolveMonthDay(+m, +d, today);
        return !!date;
      }],
      [/(\d{1,2})\/(\d{1,2})(?!\d)/, function (_, m, d) {
        date = resolveMonthDay(+m, +d, today);
        return !!date;
      }],
      [/(今日|本日|きょう)/, function () { date = today; }],
      [/(明々後日|しあさって)/, function () { date = addDays(today, 3); }],
      [/(明後日|あさって)/, function () { date = addDays(today, 2); }],
      [/(明日|あした|あす)/, function () { date = addDays(today, 1); }],
      [/(再来週|来週|今週)?の?([日月火水木金土])曜日?/, function (_, prefix, wd) {
        date = resolveWeekday(prefix, WEEKDAYS[wd], today);
      }],
      [/(\d{1,2})日(?!間)/, function (_, d) {
        date = resolveDay(+d, today);
        return !!date;
      }]
    ];
    for (var i = 0; i < rules.length; i++) {
      if (take(state, rules[i][0], rules[i][1])) return date;
    }
    return null;
  }

  var PERIOD = '(午前|午後|朝|昼|夕方|夕|夜|AM|PM|am|pm)?';
  var TIME_RE = new RegExp(PERIOD + ' ?(\\d{1,2})(?:時(?!間)(?:(\\d{1,2})分|(半))?|:(\\d{2}))');

  function toMinutes(period, h, m, half) {
    h = +h;
    var min = half ? 30 : (m ? +m : 0);
    if (h > 24 || min > 59) return null;
    var explicit = !!period;
    if (/午後|夕|夜|PM|pm/.test(period || '') && h < 12) h += 12;
    else if (/昼/.test(period || '') && h <= 6) h += 12;
    else if (/午前|朝|AM|am/.test(period || '') && h === 12) h = 0;
    return { min: h * 60 + min, explicit: explicit };
  }

  /** 時刻を 1 つ取り出す */
  function takeTime(state) {
    var result = null;
    if (take(state, /正午/, function () { result = { min: 12 * 60, explicit: true }; })) return result;
    take(state, TIME_RE, function (_, period, h, m, half, colonMin) {
      result = toMinutes(period, h, m || colonMin, half);
      return !!result;
    });
    return result;
  }

  /** 午前/午後の指定がない時刻を、ビジネス時間帯として自然な値に補正する */
  function adjustAmbiguous(start, end) {
    if (start && !start.explicit && start.min >= 60 && start.min < 8 * 60) {
      // 「3時から」→ 15:00（深夜・早朝の予定は午前を明示してもらう）
      start.min += 12 * 60;
    }
    if (start && end && end.min <= start.min) {
      // 「3時から5時」→ 15:00〜17:00、「22時から2時」→ 翌 2:00
      if (!end.explicit && end.min + 12 * 60 > start.min && end.min + 12 * 60 <= 24 * 60) end.min += 12 * 60;
      else end.min += 24 * 60;
    }
  }

  function takeDuration(state) {
    var minutes = null;
    take(state, /(\d+(?:\.\d+)?)時間(半)?/, function (_, h, half) {
      minutes = Math.round(parseFloat(h) * 60) + (half ? 30 : 0);
    }) || take(state, /(\d+)分(?:間)?/, function (_, m) {
      minutes = +m;
    });
    return minutes;
  }

  function takeLocation(state) {
    var location = null;
    var explicit = [
      /場所(?:は|:| )\s*([^、。,␟]+?)(?:で|にて|(?=[、。,␟]|$))/,
      /@\s*([^、。,\s␟]+)/,
      /(?:^|[、。,␟ ])([^、。,␟ ]+?)にて/
    ];
    for (var i = 0; i < explicit.length; i++) {
      if (take(state, explicit[i], function (all, loc) {
        location = loc.trim();
        // 先頭の区切り文字は残す
        return !!location;
      })) {
        return location;
      }
    }
    return null;
  }

  /** 「本社会議室で営業会議」のような「〇〇で△△」から場所を推定する */
  function splitImplicitLocation(segments) {
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      var m = seg.match(/^(.+?)で(?!す|き|は|も)(.+)$/);
      if (m && m[1].length <= 30 && m[2].length > 0) {
        segments[i] = m[2];
        return m[1];
      }
    }
    return null;
  }

  function cleanTitle(segments) {
    var title = segments.join(' ')
      .replace(/^[\s、。,:の に は を]+/, '')
      .replace(/(?:の)?予定を?(?:入れて|登録して|追加して)?(?:ください|下さい|おいて|お願いします)?[。.]?$/, '')
      .replace(/を?(?:入れて|登録して|追加して)(?:ください|下さい|おいて|お願いします)?[。.]?$/, '')
      .replace(/(?:です|お願いします)[。.]?$/, '')
      .replace(/[\s、。,:の に は を]+$/, '')
      .replace(/^[\s、。,:の に は を]+/, '')
      .trim();
    return title;
  }

  /**
   * テキストを解析してスケジュールを返す。
   * @param {string} text 音声入力の文字起こし
   * @param {Date} [now] 基準日時（省略時は現在時刻）
   */
  function parseSchedule(text, now) {
    now = now || new Date();
    var today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    var state = { text: normalize(text) };
    var warnings = [];

    var allDay = take(state, /終日|1日中|丸1日/, function () {});

    var startDate = takeDate(state, today);
    var endDate = null;
    if (startDate) {
      // 「10月20日から22日まで」のような複数日の予定
      var before = state.text;
      var second = takeDate(state, startDate);
      if (second && compare(second, startDate) >= 0) endDate = second;
      else if (second) state.text = before;
    }

    var start = takeTime(state);
    var end = start ? takeTime(state) : null;
    var duration = takeDuration(state);

    // 場所は日付・時刻を取り除いた後で探す（区切りがはっきりするため）
    var location = takeLocation(state);

    if (!startDate) {
      startDate = today;
      warnings.push('日付が聞き取れなかったため今日の日付にしました');
    }

    // タイトル組み立て
    var cleaned = state.text
      .replace(new RegExp(MARK + '(?:\\s|、|,|から|まで|より|の|に|~|-|ー|–)*', 'g'), MARK)
      .replace(/(?:\s|、|,|から|まで|より|の)+(?=␟)/g, '');
    var segments = cleaned.split(MARK).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!location) location = splitImplicitLocation(segments);
    var title = cleanTitle(segments);
    if (!title) {
      title = '予定';
      warnings.push('予定の内容が聞き取れなかったため「予定」としました');
    }

    var result = {
      title: title,
      location: location || '',
      startDate: formatDate(startDate),
      startTime: null,
      endDate: formatDate(endDate || startDate),
      endTime: null,
      allDay: true,
      warnings: warnings,
      source: String(text || '')
    };

    if (start && !allDay) {
      adjustAmbiguous(start, end);
      var endMin = end ? end.min : start.min + (duration || DEFAULT_DURATION_MIN);
      var endDay = endDate || startDate;
      if (endMin >= 24 * 60 && !endDate) {
        // 日付をまたぐ予定
        endDay = addDays(startDate, Math.floor(endMin / (24 * 60)));
        endMin = endMin % (24 * 60);
      }
      if (start.min >= 24 * 60) start.min = 24 * 60 - 1;
      result.allDay = false;
      result.startTime = formatTime(start.min);
      result.endTime = formatTime(endMin);
      result.endDate = formatDate(endDay);
      if (!end && !duration) warnings.push('終了時刻がないため' + DEFAULT_DURATION_MIN + '分の予定にしました');
    }

    return result;
  }

  root.parseSchedule = parseSchedule;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseSchedule: parseSchedule, normalize: normalize };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ----- gas/Code.js -----
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

// ----- gas/GenesisSync.js -----
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

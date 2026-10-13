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

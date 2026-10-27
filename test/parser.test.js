const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseSchedule } = require('../web/parser.js');

// 基準日: 2026年10月12日（月）9:00
const NOW = new Date(2026, 9, 12, 9, 0);
const parse = (text) => parseSchedule(text, NOW);

function pick(r) {
  return {
    title: r.title, location: r.location,
    startDate: r.startDate, startTime: r.startTime,
    endDate: r.endDate, endTime: r.endTime, allDay: r.allDay
  };
}

const cases = [
  ['10月15日14時から16時まで本社会議室で営業会議', {
    title: '営業会議', location: '本社会議室',
    startDate: '2026-10-15', startTime: '14:00', endDate: '2026-10-15', endTime: '16:00', allDay: false
  }],
  ['明日の午後3時から1時間、田中さんと打ち合わせ、場所は渋谷オフィス', {
    title: '田中さんと打ち合わせ', location: '渋谷オフィス',
    startDate: '2026-10-13', startTime: '15:00', endDate: '2026-10-13', endTime: '16:00', allDay: false
  }],
  ['来週月曜10時から12時まで新宿で取引先と商談', {
    title: '取引先と商談', location: '新宿',
    startDate: '2026-10-19', startTime: '10:00', endDate: '2026-10-19', endTime: '12:00', allDay: false
  }],
  ['今週金曜3時から5時 役員会議', {
    title: '役員会議', location: '',
    startDate: '2026-10-16', startTime: '15:00', endDate: '2026-10-16', endTime: '17:00', allDay: false
  }],
  ['10月20日から22日まで大阪出張', {
    title: '大阪出張', location: '',
    startDate: '2026-10-20', startTime: null, endDate: '2026-10-22', endTime: null, allDay: true
  }],
  ['十月二十日 終日 社員研修', {
    title: '社員研修', location: '',
    startDate: '2026-10-20', startTime: null, endDate: '2026-10-20', endTime: null, allDay: true
  }],
  ['１０月１５日　１４：３０〜１５：００　歯医者', {
    title: '歯医者', location: '',
    startDate: '2026-10-15', startTime: '14:30', endDate: '2026-10-15', endTime: '15:00', allDay: false
  }],
  ['1月5日9時半 年始の挨拶回り', {
    title: '年始の挨拶回り', location: '',
    startDate: '2027-01-05', startTime: '09:30', endDate: '2027-01-05', endTime: '10:30', allDay: false
  }],
  ['あさって午前11時から午後1時までランチミーティング@銀座', {
    title: 'ランチミーティング', location: '銀座',
    startDate: '2026-10-14', startTime: '11:00', endDate: '2026-10-14', endTime: '13:00', allDay: false
  }],
  ['25日の夜7時から懇親会、場所は新橋の居酒屋', {
    title: '懇親会', location: '新橋の居酒屋',
    startDate: '2026-10-25', startTime: '19:00', endDate: '2026-10-25', endTime: '20:00', allDay: false
  }],
  ['5日 13時 本社にて全体朝礼の予定を入れて', {
    title: '全体朝礼', location: '本社',
    startDate: '2026-11-05', startTime: '13:00', endDate: '2026-11-05', endTime: '14:00', allDay: false
  }],
  ['明日22時から2時までシステムメンテナンス', {
    title: 'システムメンテナンス', location: '',
    startDate: '2026-10-13', startTime: '22:00', endDate: '2026-10-14', endTime: '02:00', allDay: false
  }],
  ['2026年12月1日正午から30分 電話会議', {
    title: '電話会議', location: '',
    startDate: '2026-12-01', startTime: '12:00', endDate: '2026-12-01', endTime: '12:30', allDay: false
  }]
];

for (const [input, expected] of cases) {
  test(input, () => {
    assert.deepEqual(pick(parse(input)), expected);
  });
}

test('日付がない場合は今日にして警告を出す', () => {
  const r = parse('15時から定例会議');
  assert.equal(r.startDate, '2026-10-12');
  assert.equal(r.startTime, '15:00');
  assert.equal(r.title, '定例会議');
  assert.ok(r.warnings.length > 0);
});

test('gas/Parser.js は web/parser.js と同じ内容', () => {
  const web = fs.readFileSync(path.join(__dirname, '../web/parser.js'), 'utf8');
  const gas = fs.readFileSync(path.join(__dirname, '../gas/Parser.js'), 'utf8');
  assert.equal(gas, web, 'scripts/sync-gas.sh を実行してください');
});

test('gas/AllInOne.gs が最新で、Apps Script 上で動く', () => {
  const vm = require('node:vm');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const bundle = read('gas/AllInOne.gs');
  for (const f of ['gas/Parser.js', 'gas/Code.js', 'gas/GenesisSync.js']) {
    assert.ok(bundle.includes(read(f)), `${f} が反映されていません。scripts/sync-gas.sh を実行してください`);
  }
  const calls = [];
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    CalendarApp: { getDefaultCalendar: () => ({
      getName: () => 'takezawa', getId: () => 'takezawa@example.com',
      createEvent: (t, s, e, o) => {
        calls.push(t);
        return { getId: () => 'id@google.com', getTitle: () => t, getStartTime: () => s, getEndTime: () => e, setTag: () => {} };
      }
    }) },
    ContentService: { createTextOutput: (s) => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } },
    Utilities: { base64EncodeWebSafe: (s) => Buffer.from(s).toString('base64url') },
    Logger: { log: () => {} }
  };
  vm.createContext(ctx);
  vm.runInContext(bundle, ctx);
  const res = JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ text: '明日15時から会議' }) } }));
  assert.equal(res.ok, true);
  assert.deepEqual(calls, ['会議']);
  assert.equal(typeof ctx.syncWithGenesis, 'function');
});

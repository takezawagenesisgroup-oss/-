const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEventResource } = require('../web/google-calendar.js');

const TZ = 'Asia/Tokyo';

test('時間指定の予定', () => {
  const r = buildEventResource({
    title: '営業会議', location: '本社会議室', startDate: '2026-10-15', endDate: '2026-10-15',
    startTime: '14:00', endTime: '16:00', allDay: false, source: '10月15日14時から16時まで本社会議室で営業会議'
  }, TZ);
  assert.equal(r.summary, '営業会議');
  assert.equal(r.location, '本社会議室');
  assert.deepEqual(r.start, { dateTime: '2026-10-15T14:00:00', timeZone: TZ });
  assert.deepEqual(r.end, { dateTime: '2026-10-15T16:00:00', timeZone: TZ });
  assert.equal(r.extendedProperties.private.source, 'voice-schedule');
  assert.match(r.description, /^音声入力: /);
});

test('終日・複数日の予定は終了日の翌日を end にする', () => {
  const r = buildEventResource({ title: '大阪出張', startDate: '2026-10-31', endDate: '2026-11-02', allDay: true }, TZ);
  assert.deepEqual(r.start, { date: '2026-10-31' });
  assert.deepEqual(r.end, { date: '2026-11-03' });
  assert.equal(r.location, undefined);
});

test('日付をまたぐ予定', () => {
  const r = buildEventResource({ title: 'メンテ', startDate: '2026-10-13', endDate: '2026-10-14', startTime: '22:00', endTime: '02:00', allDay: false }, TZ);
  assert.equal(r.end.dateTime, '2026-10-14T02:00:00');
});

test('終了時刻がない・開始以前なら 1 時間後', () => {
  const r = buildEventResource({ title: 'x', startDate: '2026-12-31', endDate: '2026-12-31', startTime: '23:30', endTime: null, allDay: false }, TZ);
  assert.equal(r.end.dateTime, '2027-01-01T00:30:00');
});

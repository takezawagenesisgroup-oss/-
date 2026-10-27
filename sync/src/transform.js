'use strict';
/**
 * Google カレンダーの予定 → ジェネシスワークシステム（GWS）へ送る形式への変換。
 * 形式は docs/genesis-integration.md の「GWS 側で用意してほしい API」と同じ。
 */

const PRIVATE_TITLE = '予定あり';

function toGenesisEvent(item, userEmail) {
  const base = {
    userEmail,                       // 誰のカレンダーの予定か（GWS ではこの人のスケジュールに表示）
    googleEventId: item.id,          // userEmail + googleEventId で一意（同じ会議でも参加者ごとに別の予定として届く）
    googleCalendarId: 'primary',
    status: item.status === 'cancelled' ? 'deleted' : 'active'
  };
  if (base.status === 'deleted') return base;

  const allDay = !!(item.start && item.start.date);
  // 「非公開」の予定は社内共有で中身を見せない
  const isPrivate = item.visibility === 'private' || item.visibility === 'confidential';
  const self = (item.attendees || []).find((a) => a.self);

  return Object.assign(base, {
    title: isPrivate ? PRIVATE_TITLE : (item.summary || '(タイトルなし)'),
    location: isPrivate ? '' : (item.location || ''),
    description: isPrivate ? '' : (item.description || ''),
    private: isPrivate,
    allDay,
    start: item.start ? (item.start.dateTime || item.start.date) : null,
    end: item.end ? (item.end.dateTime || item.end.date) : null, // 終日の場合は最終日の翌日（排他的）
    timeZone: (item.start && item.start.timeZone) || null,
    iCalUID: item.iCalUID || null,                 // 同じ会議を参加者間で名寄せしたいときに使える
    recurringEventId: item.recurringEventId || null,
    organizerEmail: (item.organizer && item.organizer.email) || null,
    myResponseStatus: self ? self.responseStatus : null, // accepted / declined / tentative / needsAction
    attendees: isPrivate ? [] : (item.attendees || []).map((a) => ({ email: a.email, responseStatus: a.responseStatus })),
    busy: item.transparency !== 'transparent',
    source: (item.extendedProperties && item.extendedProperties.private && item.extendedProperties.private.source) || null,
    updated: item.updated || null,
    htmlLink: isPrivate ? '' : (item.htmlLink || '')
  });
}

module.exports = { toGenesisEvent, PRIVATE_TITLE };

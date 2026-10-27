'use strict';
const { readJson } = require('./google-auth');

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
const DIRECTORY_SCOPE = 'https://www.googleapis.com/auth/admin.directory.user.readonly';

class SyncTokenExpiredError extends Error {}

/**
 * 社員のカレンダーの変更を取得する。
 * syncToken があれば前回からの差分だけ、なければ timeMin 以降の全件（初回）。
 * @returns {Promise<{items: object[], nextSyncToken: string}>}
 */
async function listCalendarChanges({ fetch, token, syncToken, timeMin }) {
  const items = [];
  let pageToken;
  let nextSyncToken;
  do {
    const params = new URLSearchParams({ maxResults: '250', singleEvents: 'true', showDeleted: 'true' });
    if (syncToken) params.set('syncToken', syncToken);
    else if (timeMin) params.set('timeMin', timeMin);
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 410) throw new SyncTokenExpiredError('syncToken の有効期限切れ');
    const data = await readJson(res, 'カレンダーの取得');
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
}

/** Workspace の有効な（停止・アーカイブされていない）ユーザーのメールアドレス一覧 */
async function listWorkspaceUsers({ fetch, token, customer = 'my_customer', domain }) {
  const emails = [];
  let pageToken;
  do {
    const params = new URLSearchParams({ maxResults: '500', query: 'isSuspended=false', fields: 'nextPageToken,users(primaryEmail,suspended,archived)' });
    if (domain) params.set('domain', domain);
    else params.set('customer', customer);
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await readJson(res, 'Workspace ユーザー一覧の取得');
    for (const u of data.users || []) {
      if (!u.suspended && !u.archived) emails.push(u.primaryEmail.toLowerCase());
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return emails;
}

module.exports = { listCalendarChanges, listWorkspaceUsers, SyncTokenExpiredError, CALENDAR_SCOPE, DIRECTORY_SCOPE };

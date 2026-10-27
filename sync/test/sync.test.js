'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { GoogleAuth } = require('../src/google-auth');
const { createStateStore } = require('../src/state');
const { runOnce } = require('../src/sync');
const { toGenesisEvent } = require('../src/transform');
const mock = require('../dev/mock-genesis');

// ---------- テスト用の偽 Google / 偽 GWS ----------

function makeKeyFile(dir) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const file = path.join(dir, 'key.json');
  fs.writeFileSync(file, JSON.stringify({
    client_email: 'sync@example.iam.gserviceaccount.com',
    private_key_id: 'k1',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' })
  }));
  return file;
}

function decodeJwt(jwt) {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * calendars: { email: { items: [...], token: 'tok-n', expired: bool } }
 */
function fakeWorld() {
  const world = {
    calendars: {},
    directory: [],
    genesisFail: false,
    posts: [],
    calendarRequests: [],
    tokenSubjects: []
  };
  world.fetch = async (url, opts = {}) => {
    url = String(url);
    if (url === 'https://oauth2.googleapis.com/token') {
      const assertion = new URLSearchParams(opts.body).get('assertion');
      const claims = decodeJwt(assertion);
      world.tokenSubjects.push(claims.sub);
      return json(200, { access_token: `at:${claims.sub}:${claims.scope}`, expires_in: 3600 });
    }
    if (url.startsWith('https://admin.googleapis.com/admin/directory/v1/users')) {
      assert.match(opts.headers.Authorization, /admin@example\.com:.*admin\.directory\.user\.readonly/);
      return json(200, { users: world.directory });
    }
    if (url.startsWith('https://www.googleapis.com/calendar/v3/calendars/primary/events')) {
      const email = opts.headers.Authorization.split(':')[1];
      const params = new URL(url).searchParams;
      world.calendarRequests.push({ email, syncToken: params.get('syncToken'), timeMin: params.get('timeMin') });
      const cal = world.calendars[email];
      if (params.get('syncToken') && cal.expired) {
        cal.expired = false;
        return json(410, { error: { message: 'Sync token is no longer valid' } });
      }
      const items = params.get('syncToken') ? cal.changes : cal.items;
      return json(200, { items, nextSyncToken: `sync-${email}-${world.calendarRequests.length}` });
    }
    if (url === 'https://gws.example.com/api/schedules/google-sync') {
      if (world.genesisFail) return new Response('down', { status: 503 });
      const payload = JSON.parse(opts.body);
      assert.equal(opts.headers.Authorization, 'Bearer gws-secret');
      world.posts.push(payload);
      mock.handleSync(payload);
      return json(200, { ok: true });
    }
    throw new Error(`想定外のリクエスト: ${url}`);
  };
  return world;
}

function setup(configOverrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gws-sync-'));
  const world = fakeWorld();
  const auth = new GoogleAuth({ keyFile: makeKeyFile(dir), fetch: world.fetch });
  const stateStore = createStateStore(path.join(dir, 'state.json'));
  const config = Object.assign({
    genesisEndpoint: 'https://gws.example.com/api/schedules/google-sync',
    genesisToken: 'gws-secret',
    users: ['tanaka@example.com', 'suzuki@example.com'],
    excludeUsers: [],
    adminEmail: '',
    initialDaysBack: 30,
    dryRun: false
  }, configOverrides);
  const run = () => runOnce({ config, auth, stateStore, fetch: world.fetch, log: () => {}, now: Date.parse('2026-10-26T00:00:00Z') });
  return { world, run, stateStore };
}

const meeting = {
  id: 'ev1', status: 'confirmed', summary: '営業会議', location: '本社会議室',
  start: { dateTime: '2026-10-27T14:00:00+09:00', timeZone: 'Asia/Tokyo' },
  end: { dateTime: '2026-10-27T16:00:00+09:00', timeZone: 'Asia/Tokyo' },
  iCalUID: 'ev1@google.com', updated: '2026-10-25T00:00:00Z'
};

test.beforeEach(() => mock.schedules.clear());

test('初回は全件、2 回目以降は差分だけを社員ごとに GWS へ送る', async () => {
  const { world, run, stateStore } = setup();
  world.calendars['tanaka@example.com'] = { items: [meeting], changes: [] };
  world.calendars['suzuki@example.com'] = { items: [], changes: [] };

  let r = await run();
  assert.deepEqual(r, { users: 2, sent: 1, failed: [] });
  // 社員本人として（sub = 社員）トークンを取っている
  assert.ok(world.tokenSubjects.includes('tanaka@example.com'));
  assert.ok(world.tokenSubjects.includes('suzuki@example.com'));
  assert.equal(world.calendarRequests[0].syncToken, null);
  assert.equal(world.calendarRequests[0].timeMin, '2026-09-26T00:00:00.000Z');
  assert.equal(world.posts.length, 2); // 予定 0 件の人も fullSync は送る
  assert.equal(world.posts[0].fullSync, true);
  assert.equal(world.posts[0].events[0].title, '営業会議');
  assert.equal(world.posts[0].events[0].userEmail, 'tanaka@example.com');
  assert.equal(mock.schedules.size, 1);

  // スマホで予定を追加・削除した想定
  world.posts = [];
  world.calendars['tanaka@example.com'].changes = [
    { id: 'ev1', status: 'cancelled' },
    Object.assign({}, meeting, { id: 'ev2', summary: '歯医者' })
  ];
  r = await run();
  assert.equal(r.sent, 2);
  assert.equal(world.posts.length, 1); // 変更のない鈴木さんは送らない
  assert.equal(world.posts[0].fullSync, false);
  const saved = await stateStore.load();
  assert.match(saved.users['tanaka@example.com'].syncToken, /^sync-tanaka/);
  assert.deepEqual([...mock.schedules.values()].map((e) => e.title), ['歯医者']);
});

test('GWS への送信に失敗したら同期位置を進めず、次回再送する', async () => {
  const { world, run, stateStore } = setup({ users: ['tanaka@example.com'] });
  world.calendars['tanaka@example.com'] = { items: [meeting], changes: [] };
  world.genesisFail = true;

  const r = await run();
  assert.deepEqual(r.failed, ['tanaka@example.com']);
  assert.equal((await stateStore.load()).users['tanaka@example.com'], undefined);

  world.genesisFail = false;
  await run();
  assert.equal(world.calendarRequests.at(-1).syncToken, null); // もう一度全件から
  assert.equal(world.posts.length, 1);
});

test('Google の同期位置が失効したら全件を取り直して fullSync で送る', async () => {
  const { world, run } = setup({ users: ['tanaka@example.com'] });
  world.calendars['tanaka@example.com'] = { items: [meeting], changes: [] };
  await run();
  world.calendars['tanaka@example.com'].expired = true;
  world.posts = [];
  await run();
  assert.equal(world.posts.length, 1);
  assert.equal(world.posts[0].fullSync, true);
});

test('ADMIN_EMAIL を指定すると Workspace の全社員（停止中を除く）を同期する', async () => {
  const { world, run } = setup({ users: [], adminEmail: 'admin@example.com', excludeUsers: ['bot@example.com'] });
  world.directory = [
    { primaryEmail: 'Tanaka@example.com' },
    { primaryEmail: 'old@example.com', suspended: true },
    { primaryEmail: 'bot@example.com' }
  ];
  world.calendars['tanaka@example.com'] = { items: [], changes: [] };
  const r = await run();
  assert.equal(r.users, 1);
  assert.equal(world.posts[0].userEmail, 'tanaka@example.com');
});

test('非公開の予定は中身を隠して送る', () => {
  const ev = toGenesisEvent(Object.assign({}, meeting, { visibility: 'private', description: '通院' }), 'tanaka@example.com');
  assert.equal(ev.title, '予定あり');
  assert.equal(ev.location, '');
  assert.equal(ev.description, '');
  assert.equal(ev.private, true);
  assert.equal(ev.start, '2026-10-27T14:00:00+09:00');
});

test('終日予定・出欠の情報', () => {
  const ev = toGenesisEvent({
    id: 'x', status: 'confirmed', summary: '出張', start: { date: '2026-10-20' }, end: { date: '2026-10-23' },
    attendees: [{ email: 'tanaka@example.com', self: true, responseStatus: 'declined' }],
    extendedProperties: { private: { source: 'voice-schedule' } }
  }, 'tanaka@example.com');
  assert.equal(ev.allDay, true);
  assert.equal(ev.end, '2026-10-23');
  assert.equal(ev.myResponseStatus, 'declined');
  assert.equal(ev.source, 'voice-schedule');
});

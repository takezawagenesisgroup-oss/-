const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/** Apps Script の環境を最小限まねて gas/GenesisSync.js を読み込む */
function load({ props = {}, calendar }) {
  const store = Object.assign({}, props);
  const posts = [];
  const logs = [];
  const world = { store, posts, logs, calendar, httpStatus: 200, listCalls: [] };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in store ? store[k] : null),
      setProperty: (k, v) => { store[k] = v; },
      deleteProperty: (k) => { delete store[k]; }
    }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'takezawa@genesis.example' }) },
    Logger: { log: (m) => logs.push(String(m)) },
    Calendar: { Events: { list: (id, opts) => {
      world.listCalls.push(Object.assign({}, opts));
      if (opts.syncToken && world.calendar.expired) {
        world.calendar.expired = false;
        throw new Error('API call to calendar.events.list failed with error: Sync token is no longer valid, a full sync is required. (410)');
      }
      return { items: opts.syncToken ? world.calendar.changes : world.calendar.items, nextSyncToken: 'tok' + world.listCalls.length };
    } } },
    UrlFetchApp: { fetch: (url, opts) => {
      posts.push({ url, opts, body: JSON.parse(opts.payload) });
      return { getResponseCode: () => world.httpStatus, getContentText: () => '' };
    } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas/GenesisSync.js'), 'utf8'), ctx);
  return { ctx, world };
}

const meeting = {
  id: 'ev1', status: 'confirmed', summary: '営業会議', location: '本社',
  start: { dateTime: '2026-10-28T14:00:00+09:00' }, end: { dateTime: '2026-10-28T15:00:00+09:00' }
};
const PROPS = { GENESIS_ENDPOINT: 'https://gws.example/api/schedules/google-sync', GENESIS_TOKEN: 'secret' };

test('初回は全件、以降はスマホで変えた分だけ送る', () => {
  const { ctx, world } = load({ props: PROPS, calendar: { items: [meeting], changes: [] } });
  ctx.syncToGenesis();
  assert.equal(world.posts.length, 1);
  const first = world.posts[0];
  assert.equal(first.url, PROPS.GENESIS_ENDPOINT);
  assert.equal(first.opts.headers.Authorization, 'Bearer secret');
  assert.equal(first.body.fullSync, true);
  assert.equal(first.body.userEmail, 'takezawa@genesis.example');
  assert.equal(first.body.events[0].title, '営業会議');
  assert.equal(world.store.GENESIS_SYNC_TOKEN, 'tok1');

  // 変更なし → 送らない
  ctx.syncToGenesis();
  assert.equal(world.posts.length, 1);

  // スマホで削除・追加
  world.calendar.changes = [{ id: 'ev1', status: 'cancelled' }, Object.assign({}, meeting, { id: 'ev2', summary: '歯医者' })];
  ctx.syncToGenesis();
  assert.equal(world.posts.length, 2);
  assert.equal(world.posts[1].body.fullSync, false);
  assert.deepEqual(world.posts[1].body.events.map((e) => e.status), ['deleted', 'active']);
});

test('GWS が失敗したら同期位置を進めず、次回まとめて再送', () => {
  const { ctx, world } = load({ props: PROPS, calendar: { items: [meeting], changes: [] } });
  world.httpStatus = 503;
  assert.throws(() => ctx.syncToGenesis(), /送信に失敗/);
  assert.equal(world.store.GENESIS_SYNC_TOKEN, undefined);
  world.httpStatus = 200;
  ctx.syncToGenesis();
  assert.equal(world.posts.at(-1).body.fullSync, true);
  assert.equal(world.store.GENESIS_SYNC_TOKEN, 'tok2');
});

test('同期位置が失効したら全件を取り直す', () => {
  const { ctx, world } = load({ props: Object.assign({ GENESIS_SYNC_TOKEN: 'old' }, PROPS), calendar: { items: [meeting], changes: [], expired: true } });
  ctx.syncToGenesis();
  assert.equal(world.posts.length, 1);
  assert.equal(world.posts[0].body.fullSync, true);
  assert.ok(world.listCalls[1].timeMin);
});

test('DRY_RUN では送らず、同期位置も進めない', () => {
  const { ctx, world } = load({ props: { GENESIS_DRY_RUN: 'true' }, calendar: { items: [meeting], changes: [] } });
  ctx.syncToGenesis();
  assert.equal(world.posts.length, 0);
  assert.equal(world.store.GENESIS_SYNC_TOKEN, undefined);
  assert.ok(world.logs.some((l) => l.includes('営業会議')));
});

test('送り先が未設定なら何もしない', () => {
  const { ctx, world } = load({ props: {}, calendar: { items: [meeting], changes: [] } });
  ctx.syncToGenesis();
  assert.equal(world.listCalls.length, 0);
});

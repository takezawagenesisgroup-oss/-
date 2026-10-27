const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const gws = require('../sync/dev/mock-genesis');

const PUSH = 'https://gws.example/api/schedules/google-sync';
const PULL = 'https://gws.example/api/schedules/changes';
const ME = 'takezawa@genesis.example';

/** syncToken・拡張プロパティ検索に対応した、メモリ上の Google カレンダー */
class FakeCalendar {
  constructor() {
    this.events = new Map();
    this.seq = 0;
    this.nextId = 1;
    this.expired = false;
  }
  touch(ev) {
    ev.updated = new Date().toISOString();
    ev._seq = ++this.seq;
    return ev;
  }
  /** スマホの Google カレンダーアプリでの操作の代わり */
  add(fields) {
    const ev = Object.assign({ id: `g${this.nextId++}`, status: 'confirmed' }, fields);
    this.events.set(ev.id, this.touch(ev));
    return ev;
  }
  edit(id, fields) { this.touch(Object.assign(this.events.get(id), fields)); }
  active() { return [...this.events.values()].filter((e) => e.status !== 'cancelled'); }

  api() {
    const clone = (e) => JSON.parse(JSON.stringify(e));
    return {
      list: (calId, opts) => {
        let items = [...this.events.values()];
        if (opts.privateExtendedProperty) {
          const [k, v] = opts.privateExtendedProperty.split('=');
          items = items.filter((e) => e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private[k] === v);
          return { items: items.map(clone) };
        }
        if (opts.syncToken) {
          if (this.expired) {
            this.expired = false;
            throw new Error('Sync token is no longer valid, a full sync is required. (410)');
          }
          const n = Number(opts.syncToken.split(':')[1]);
          items = items.filter((e) => e._seq > n);
        }
        return { items: items.map(clone), nextSyncToken: `seq:${this.seq}` };
      },
      get: (calId, id) => {
        if (!this.events.has(id)) throw new Error('API call to calendar.events.get failed with error: Not Found (404)');
        return clone(this.events.get(id));
      },
      insert: (res) => clone(this.add(JSON.parse(JSON.stringify(res)))),
      patch: (res, calId, id) => {
        const ev = this.events.get(id);
        for (const [k, v] of Object.entries(JSON.parse(JSON.stringify(res)))) ev[k] = v;
        return clone(this.touch(ev));
      },
      remove: (calId, id) => { this.edit(id, { status: 'cancelled' }); }
    };
  }
}

/** Apps Script の環境を最小限まねて gas/GenesisSync.js を読み込む（GWS は見本サーバーの処理につなぐ） */
function load(props) {
  const store = Object.assign({}, props);
  const cal = new FakeCalendar();
  const world = { store, cal, posts: [], pulls: 0, logs: [], pushStatus: 200 };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in store ? store[k] : null),
      setProperty: (k, v) => { store[k] = v; },
      deleteProperty: (k) => { delete store[k]; }
    }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => ME }) },
    Logger: { log: (m) => world.logs.push(String(m)) },
    Calendar: { Events: cal.api() },
    UrlFetchApp: { fetch: (url, opts) => {
      assert.equal(opts.headers.Authorization, 'Bearer secret');
      const reply = (code, body) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(body) });
      if (url === PUSH) {
        const body = JSON.parse(opts.payload);
        world.posts.push(body);
        if (world.pushStatus !== 200) return reply(world.pushStatus, { error: 'down' });
        return reply(200, gws.handleGoogleSync(body));
      }
      if (url.startsWith(PULL)) {
        world.pulls++;
        const q = new URL(url).searchParams;
        return reply(200, gws.listChanges({ userEmail: q.get('userEmail'), since: q.get('since'), limit: 2 }));
      }
      throw new Error(`想定外の URL: ${url}`);
    } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas/GenesisSync.js'), 'utf8'), ctx);
  world.sync = () => ctx.syncWithGenesis();
  world.ctx = ctx;
  return world;
}

const TWO_WAY = { GENESIS_ENDPOINT: PUSH, GENESIS_CHANGES_ENDPOINT: PULL, GENESIS_TOKEN: 'secret' };
const meeting = {
  summary: '営業会議', location: '本社',
  start: { dateTime: '2026-10-28T14:00:00+09:00' }, end: { dateTime: '2026-10-28T15:00:00+09:00' }
};
const mine = () => gws.activeSchedules().filter((r) => r.userEmail === ME);

test.beforeEach(() => gws.reset());

// ---------- Google → GWS ----------

test('Google → GWS: 初回は全件、以降はスマホで変えた分だけ送る', () => {
  const w = load({ GENESIS_ENDPOINT: PUSH, GENESIS_TOKEN: 'secret' });
  const ev = w.cal.add(meeting);
  w.sync();
  assert.equal(w.posts.length, 1);
  assert.equal(w.posts[0].fullSync, true);
  assert.equal(w.posts[0].userEmail, ME);
  assert.deepEqual(mine().map((r) => r.title), ['営業会議']);

  w.sync(); // 変更なし → 送らない
  assert.equal(w.posts.length, 1);
  assert.equal(w.pulls, 0); // GWS → Google は未設定

  w.cal.edit(ev.id, { status: 'cancelled' });
  w.cal.add(Object.assign({}, meeting, { summary: '歯医者' }));
  w.sync();
  assert.equal(w.posts[1].fullSync, false);
  assert.deepEqual(mine().map((r) => r.title), ['歯医者']);
});

test('Google → GWS: GWS が失敗したら同期位置を進めず、次回まとめて再送', () => {
  const w = load(TWO_WAY);
  w.cal.add(meeting);
  w.pushStatus = 503;
  assert.throws(() => w.sync(), /送信に失敗/);
  assert.equal(w.store.GENESIS_SYNC_TOKEN, undefined);
  w.pushStatus = 200;
  w.sync();
  assert.equal(w.posts.at(-1).fullSync, true);
  assert.equal(mine().length, 1);
});

test('Google → GWS: 同期位置が失効したら全件を取り直す', () => {
  const w = load(TWO_WAY);
  w.cal.add(meeting);
  w.sync();
  w.cal.expired = true;
  w.sync();
  assert.equal(w.posts.at(-1).fullSync, true);
  assert.equal(mine().length, 1);
});

// ---------- GWS → Google ----------

test('GWS → Google: GWS で登録した予定が Google に入り、二重登録されない', () => {
  const w = load(TWO_WAY);
  w.sync();
  const s = gws.saveFromGenesisUi({ userEmail: ME, title: '取引先訪問', location: '札幌', allDay: false,
    start: '2026-10-29T10:00:00+09:00', end: '2026-10-29T11:30:00+09:00' });
  w.sync();

  const events = w.cal.active();
  assert.equal(events.length, 1);
  assert.equal(events[0].summary, '取引先訪問');
  assert.equal(events[0].location, '札幌');
  assert.equal(events[0].start.dateTime, '2026-10-29T10:00:00+09:00');
  assert.equal(events[0].extendedProperties.private.genesisId, s.genesisId);
  // 同じ回で Google → GWS に送り返され、元の予定に紐づく（GWS 側も 1 件のまま）
  assert.equal(mine().length, 1);
  assert.equal(gws.schedules.get(s.genesisId).googleEventId, events[0].id);

  // 何度回しても増えない・行ったり来たりしない
  const posts = w.posts.length;
  w.sync();
  w.sync();
  assert.equal(w.cal.active().length, 1);
  assert.equal(mine().length, 1);
  assert.equal(w.posts.length, posts);
});

test('GWS → Google: GWS での変更・削除が Google に反映される', () => {
  const w = load(TWO_WAY);
  const s = gws.saveFromGenesisUi({ userEmail: ME, title: '研修', allDay: true, start: '2026-11-02', end: '2026-11-04' });
  w.sync();
  const [ev] = w.cal.active();
  assert.deepEqual(ev.start.date, '2026-11-02');
  assert.deepEqual(ev.end.date, '2026-11-04');

  gws.saveFromGenesisUi({ genesisId: s.genesisId, title: '新人研修', allDay: false,
    start: '2026-11-02T09:00:00+09:00', end: '2026-11-02T17:00:00+09:00' });
  w.sync();
  const edited = w.cal.events.get(ev.id);
  assert.equal(edited.summary, '新人研修');
  assert.equal(edited.start.dateTime, '2026-11-02T09:00:00+09:00');
  assert.equal(edited.start.date, null);

  gws.saveFromGenesisUi({ genesisId: s.genesisId, status: 'deleted' });
  w.sync();
  assert.equal(w.cal.active().length, 0);
  assert.equal(mine().length, 0);
});

test('Google で予定を変えたものも GWS に反映され、元の GWS の予定が更新される', () => {
  const w = load(TWO_WAY);
  const s = gws.saveFromGenesisUi({ userEmail: ME, title: '会議', allDay: false,
    start: '2026-10-30T13:00:00+09:00', end: '2026-10-30T14:00:00+09:00' });
  w.sync();
  const [ev] = w.cal.active();
  w.cal.edit(ev.id, { summary: '会議（場所変更）', location: '支店' }); // スマホで変更
  w.sync();
  assert.equal(gws.schedules.get(s.genesisId).title, '会議（場所変更）');
  assert.equal(mine().length, 1);

  w.cal.edit(ev.id, { status: 'cancelled' }); // スマホで削除
  w.sync();
  assert.equal(gws.schedules.get(s.genesisId).status, 'deleted');
});

test('反映の途中で止まっても、やり直しで二重登録しない', () => {
  const w = load(TWO_WAY);
  gws.saveFromGenesisUi({ userEmail: ME, title: 'A', allDay: true, start: '2026-11-10', end: '2026-11-11' });
  w.sync();
  delete w.store.GENESIS_PULL_CURSOR; // 位置を保存できなかった想定
  w.sync();
  assert.equal(w.cal.active().length, 1);
});

test('変更が多いときはページに分けて全部取り込む', () => {
  const w = load(TWO_WAY);
  for (let i = 1; i <= 5; i++) {
    gws.saveFromGenesisUi({ userEmail: ME, title: `予定${i}`, allDay: true, start: `2026-11-1${i}`, end: `2026-11-1${i + 1}` });
  }
  w.sync();
  assert.equal(w.cal.active().length, 5);
  assert.equal(w.pulls, 3); // 2 件ずつ 3 ページ
});

test('非公開の予定は GWS 側で変えても Google の件名を「予定あり」で上書きしない', () => {
  const w = load(TWO_WAY);
  const ev = w.cal.add(Object.assign({}, meeting, { summary: '通院', visibility: 'private' }));
  w.sync();
  const [rec] = mine();
  assert.equal(rec.title, '予定あり');
  gws.saveFromGenesisUi({ genesisId: rec.genesisId, start: '2026-10-28T16:00:00+09:00', end: '2026-10-28T17:00:00+09:00' });
  w.sync();
  const after = w.cal.events.get(ev.id);
  assert.equal(after.summary, '通院');
  assert.equal(after.start.dateTime, '2026-10-28T16:00:00+09:00');
});

test('両方で変更されたら新しい方を採用する', () => {
  const w = load(TWO_WAY);
  const ev = w.cal.add(meeting);
  w.sync();
  const [rec] = mine();
  // GWS で変更 → その後スマホでも変更（Google の方が新しい）
  gws.saveFromGenesisUi({ genesisId: rec.genesisId, title: 'GWSで変更' });
  gws.schedules.get(rec.genesisId).updatedAt = new Date(Date.now() - 60_000).toISOString();
  w.cal.edit(ev.id, { summary: 'スマホで変更' });
  w.sync();
  assert.equal(w.cal.events.get(ev.id).summary, 'スマホで変更');
  assert.equal(gws.schedules.get(rec.genesisId).title, 'スマホで変更');
});

test('DRY_RUN では送信・反映せず、位置も進めない', () => {
  const w = load(Object.assign({ GENESIS_DRY_RUN: 'true' }, TWO_WAY));
  w.cal.add(meeting);
  gws.saveFromGenesisUi({ userEmail: ME, title: '試し', allDay: true, start: '2026-11-01', end: '2026-11-02' });
  w.sync();
  assert.equal(w.posts.length, 0);
  assert.equal(w.cal.active().length, 1);
  assert.equal(w.store.GENESIS_SYNC_TOKEN, undefined);
  assert.equal(w.store.GENESIS_PULL_CURSOR, undefined);
  assert.ok(w.logs.some((l) => l.includes('営業会議')));
  assert.ok(w.logs.some((l) => l.includes('試し')));
});

test('送り先が未設定なら何もしない', () => {
  const w = load({});
  w.cal.add(meeting);
  w.sync();
  assert.equal(w.posts.length, 0);
  assert.equal(w.pulls, 0);
});

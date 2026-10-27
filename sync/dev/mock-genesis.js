#!/usr/bin/env node
'use strict';
/**
 * ジェネシスワークシステム（GWS）側 API の「お手本」兼テスト用サーバー（双方向同期）。
 *
 *   node sync/dev/mock-genesis.js
 *
 *   POST /api/schedules/google-sync   Google → GWS（Apps Script が Google カレンダーの変更を送ってくる）
 *   GET  /api/schedules/changes       GWS → Google（Apps Script が GWS で変わった予定を取りに来る）
 *   POST /api/schedules               （お試し用）GWS の画面で予定を登録・変更・削除した想定
 *   GET  /                            いまのスケジュール一覧
 *
 * GWS で実装するときは handleGoogleSync() / listChanges() / saveFromGenesisUi() を参考にする。
 * 仕様: docs/genesis-integration.md
 */
const http = require('node:http');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.GENESIS_TOKEN || '';

// GWS のスケジュール表（genesisId → 予定）。削除は status: 'deleted' で残す（変更一覧で削除を伝えるため）
const schedules = new Map();
// 変更の通し番号（changes の cursor に使う）
let seq = 0;
// fullSync のバッチをまたいで「今回届いた予定」を覚えておく
const fullSyncSeen = new Map();

const FIELDS = ['title', 'location', 'description', 'private', 'allDay', 'start', 'end', 'timeZone',
  'iCalUID', 'recurringEventId', 'organizerEmail', 'myResponseStatus', 'attendees', 'busy', 'source', 'htmlLink'];

function save(record, origin) {
  record.seq = ++seq;
  record.origin = origin; // 'google' = Google から届いた変更 / 'genesis' = GWS の画面での変更
  record.updatedAt = new Date().toISOString();
  schedules.set(record.genesisId, record);
  return record;
}

function findByGoogleId(userEmail, googleEventId) {
  for (const r of schedules.values()) {
    if (r.userEmail === userEmail && r.googleEventId === googleEventId) return r;
  }
  return null;
}

/** Google → GWS */
function handleGoogleSync(payload) {
  const user = payload.userEmail;
  let upserted = 0;
  let deleted = 0;
  if (payload.fullSync && payload.batch.index === 0) fullSyncSeen.set(user, new Set());

  for (const ev of payload.events) {
    // GWS で作った予定が Google に登録されたものは genesisId 付きで戻ってくる → その予定に紐づける
    let record = (ev.genesisId && schedules.get(ev.genesisId)) || findByGoogleId(ev.userEmail, ev.googleEventId);
    if (payload.fullSync) fullSyncSeen.get(user).add(ev.googleEventId);

    if (ev.status === 'deleted') {
      if (record && record.status !== 'deleted') {
        save(Object.assign(record, { status: 'deleted' }), 'google');
        deleted++;
      }
      continue;
    }
    if (!record) record = { genesisId: crypto.randomUUID(), userEmail: ev.userEmail };
    record.googleEventId = ev.googleEventId;
    record.status = 'active';
    for (const f of FIELDS) record[f] = ev[f];
    save(record, 'google');
    upserted++;
  }

  // fullSync の最後のバッチ: Google に紐づいているのに今回届かなかった予定は Google 側で消えているので削除
  if (payload.fullSync && payload.batch.index === payload.batch.total - 1) {
    const seen = fullSyncSeen.get(user);
    for (const r of schedules.values()) {
      if (r.userEmail === user && r.status === 'active' && r.googleEventId && !seen.has(r.googleEventId) &&
          (r.end || '') >= payload.timeMin.slice(0, 10)) {
        save(Object.assign(r, { status: 'deleted' }), 'google');
        deleted++;
      }
    }
    fullSyncSeen.delete(user);
  }
  return { upserted, deleted };
}

/** GWS → Google: since より後に「GWS の画面で」変わった予定（Google から届いた変更は含めない） */
function listChanges({ userEmail, since, limit = 100 }) {
  const after = Number(since || 0);
  const items = [...schedules.values()]
    .filter((r) => r.userEmail === userEmail && r.origin === 'genesis' && r.seq > after)
    .sort((a, b) => a.seq - b.seq);
  const page = items.slice(0, limit);
  return {
    cursor: String(page.length ? page[page.length - 1].seq : Math.max(after, 0)),
    hasMore: items.length > page.length,
    schedules: page.map((r) => ({
      genesisId: r.genesisId,
      googleEventId: r.googleEventId || null,
      userEmail: r.userEmail,
      status: r.status,
      title: r.title,
      location: r.location || '',
      description: r.description || '',
      allDay: !!r.allDay,
      start: r.start,
      end: r.end,
      updatedAt: r.updatedAt,
      origin: r.origin
    }))
  };
}

/** （お試し用）GWS の画面で予定を登録・変更・削除した想定 */
function saveFromGenesisUi(body) {
  const record = (body.genesisId && schedules.get(body.genesisId)) ||
    { genesisId: crypto.randomUUID(), userEmail: body.userEmail, status: 'active' };
  for (const f of ['title', 'location', 'description', 'allDay', 'start', 'end', 'status']) {
    if (f in body) record[f] = body[f];
  }
  return save(record, 'genesis');
}

function activeSchedules() {
  return [...schedules.values()].filter((r) => r.status === 'active');
}

function reset() {
  schedules.clear();
  fullSyncSeen.clear();
  seq = 0;
}

function start() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body, null, 2));
    };
    if (req.method === 'GET' && url.pathname === '/') return send(200, activeSchedules());
    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { error: 'unauthorized' });

    if (req.method === 'GET' && url.pathname === '/api/schedules/changes') {
      return send(200, listChanges({ userEmail: url.searchParams.get('userEmail'), since: url.searchParams.get('since') }));
    }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        if (req.method === 'POST' && url.pathname === '/api/schedules/google-sync') {
          const result = handleGoogleSync(JSON.parse(body));
          console.log(`${new Date().toLocaleTimeString('ja-JP')} Google から受信: 登録・更新 ${result.upserted} 件 / 削除 ${result.deleted} 件`);
          return send(200, Object.assign({ ok: true }, result));
        }
        if (req.method === 'POST' && url.pathname === '/api/schedules') {
          return send(200, saveFromGenesisUi(JSON.parse(body)));
        }
        send(404, { error: 'not found' });
      } catch (err) {
        send(400, { error: err.message });
      }
    });
  }).listen(PORT, () => {
    console.log(`GWS モック: http://localhost:${PORT}/（一覧）で起動しました`);
  });
}

if (require.main === module) start();

module.exports = { handleGoogleSync, handleSync: handleGoogleSync, listChanges, saveFromGenesisUi, activeSchedules, schedules, reset };

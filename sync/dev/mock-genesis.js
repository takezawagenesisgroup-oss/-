#!/usr/bin/env node
'use strict';
/**
 * ジェネシスワークシステム（GWS）の受け口の「お手本」兼テスト用サーバー。
 *
 *   node dev/mock-genesis.js            → http://localhost:8787/api/schedules/google-sync で待ち受け
 *   GENESIS_ENDPOINT=http://localhost:8787/api/schedules/google-sync node index.js
 *
 * 受け取った予定をメモリ上の「スケジュール表」に反映し、GET で中身を確認できる。
 * GWS 側で実装するときは handleSync() の処理（upsert / delete / fullSync）を参考にする。
 */
const http = require('node:http');

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.GENESIS_TOKEN || '';
const PATH = '/api/schedules/google-sync';

// key: userEmail + googleEventId
const schedules = new Map();
// fullSync のバッチをまたいで「今回届いた予定」を覚えておく
const fullSyncSeen = new Map();

function handleSync(payload) {
  const user = payload.userEmail;
  let upserted = 0;
  let deleted = 0;

  if (payload.fullSync && payload.batch.index === 0) fullSyncSeen.set(user, new Set());

  for (const ev of payload.events) {
    const key = `${ev.userEmail}/${ev.googleEventId}`;
    if (ev.status === 'deleted') {
      if (schedules.delete(key)) deleted++;
    } else {
      schedules.set(key, ev);
      upserted++;
    }
    if (payload.fullSync) fullSyncSeen.get(user).add(key);
  }

  // fullSync の最後のバッチ: timeMin 以降で今回届かなかったこの人の予定は Google 側に存在しないので消す
  if (payload.fullSync && payload.batch.index === payload.batch.total - 1) {
    const seen = fullSyncSeen.get(user);
    for (const [key, ev] of schedules) {
      if (ev.userEmail === user && !seen.has(key) && (ev.end || '') >= payload.timeMin.slice(0, 10)) {
        schedules.delete(key);
        deleted++;
      }
    }
    fullSyncSeen.delete(user);
  }
  return { upserted, deleted };
}

function start() {
  return http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify([...schedules.values()], null, 2));
    }
    if (req.method !== 'POST' || req.url !== PATH) {
      res.writeHead(404);
      return res.end();
    }
    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.writeHead(401);
      return res.end('unauthorized');
    }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const result = handleSync(JSON.parse(body));
        console.log(`${new Date().toLocaleTimeString('ja-JP')} 受信: 登録・更新 ${result.upserted} 件 / 削除 ${result.deleted} 件 / 合計 ${schedules.size} 件`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (err) {
        res.writeHead(400);
        res.end(String(err.message));
      }
  });
  }).listen(PORT, () => {
    console.log(`GWS モック: http://localhost:${PORT}${PATH} で待ち受け中（GET http://localhost:${PORT}/ で一覧）`);
  });
}

if (require.main === module) start();

module.exports = { handleSync, schedules };

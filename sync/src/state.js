'use strict';
/**
 * 同期の進み具合（社員ごとの syncToken）の保存先。
 *  - ファイル: STATE_STORE=./state.json（サーバーや PC で常駐させる場合）
 *  - Cloud Storage: STATE_STORE=gs://バケット名/voice-schedule/state.json（Cloud Run で動かす場合）
 */
const fs = require('node:fs');
const path = require('node:path');
const { readJson } = require('./google-auth');

const STORAGE_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_write';

function createStateStore(location, { auth, fetch = globalThis.fetch } = {}) {
  const m = /^gs:\/\/([^/]+)\/(.+)$/.exec(location || '');
  if (!m) {
    const file = path.resolve(location || 'state.json');
    return {
      describe: () => file,
      async load() {
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
          if (e.code === 'ENOENT') return {};
          throw e;
        }
      },
      async save(state) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(`${file}.tmp`, JSON.stringify(state, null, 2));
        fs.renameSync(`${file}.tmp`, file);
      }
    };
  }

  const [, bucket, object] = m;
  return {
    describe: () => location,
    async load() {
      const token = await auth.getToken([STORAGE_SCOPE]);
      const res = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 404) return {};
      return readJson(res, '同期状態の読み込み');
    },
    async save(state) {
      const token = await auth.getToken([STORAGE_SCOPE]);
      const res = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(object)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      await readJson(res, '同期状態の保存');
    }
  };
}

module.exports = { createStateStore };

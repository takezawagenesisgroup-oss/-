#!/usr/bin/env node
'use strict';
/**
 * 使い方:
 *   node index.js              1 回だけ同期（Cloud Run ジョブ + Cloud Scheduler で定期実行する想定）
 *   node index.js --loop 120   120 秒ごとに同期し続ける（社内サーバーなどで常駐させる場合）
 *
 * 設定は環境変数で行う（一覧は .env.example / docs/workspace-sync-setup.md）。
 */
const { GoogleAuth } = require('./src/google-auth');
const { createStateStore } = require('./src/state');
const { runOnce } = require('./src/sync');

function list(value) {
  return (value || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function loadConfig(env = process.env) {
  return {
    genesisEndpoint: env.GENESIS_ENDPOINT || '',
    genesisToken: env.GENESIS_TOKEN || '',
    users: list(env.SYNC_USERS),
    excludeUsers: list(env.EXCLUDE_USERS),
    adminEmail: env.ADMIN_EMAIL || '',
    domain: env.SYNC_DOMAIN || '',
    initialDaysBack: Number(env.INITIAL_DAYS_BACK || 30),
    dryRun: env.DRY_RUN === '1' || env.DRY_RUN === 'true',
    stateStore: env.STATE_STORE || 'state.json',
    keyFile: env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || '',
    serviceAccountEmail: env.SERVICE_ACCOUNT_EMAIL || ''
  };
}

async function main() {
  const config = loadConfig();
  const auth = new GoogleAuth({ keyFile: config.keyFile || undefined, serviceAccountEmail: config.serviceAccountEmail || undefined });
  const stateStore = createStateStore(config.stateStore, { auth });

  const loopIndex = process.argv.indexOf('--loop');
  const interval = loopIndex !== -1 ? Number(process.argv[loopIndex + 1] || 120) : 0;

  do {
    const started = Date.now();
    try {
      const result = await runOnce({ config, auth, stateStore });
      if (!interval && result.failed.length) process.exitCode = 1;
    } catch (err) {
      console.error(`同期を実行できませんでした: ${err.message}`);
      if (!interval) process.exitCode = 1;
    }
    if (interval) await new Promise((r) => setTimeout(r, Math.max(0, interval * 1000 - (Date.now() - started))));
  } while (interval);
}

if (require.main === module) main();

module.exports = { loadConfig };

'use strict';
/**
 * Google Workspace の社員全員のカレンダー → ジェネシスワークシステム（GWS）同期の本体。
 *
 * 1 回の実行で、社員ごとに「前回からの変更（追加・変更・削除）」だけを Google から取得し、GWS に送る。
 * スマホの Google カレンダーアプリで入力した予定も、音声アプリで登録した予定も、同じように反映される。
 * GWS への送信が成功したときだけ同期位置（syncToken）を進めるので、失敗しても次回まとめて再送される。
 */
const { toGenesisEvent } = require('./transform');
const {
  listCalendarChanges, listWorkspaceUsers, SyncTokenExpiredError, CALENDAR_SCOPE, DIRECTORY_SCOPE
} = require('./google-api');

const BATCH_SIZE = 500;

async function postToGenesis({ fetch, endpoint, token, payload, dryRun, log }) {
  if (dryRun) {
    log(`[DRY_RUN] ${payload.userEmail}: ${payload.events.length} 件（fullSync=${payload.fullSync}）`);
    return;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GWS への送信に失敗しました (HTTP ${res.status}) ${text.slice(0, 200)}`);
  }
}

async function resolveUsers(config, auth, fetch) {
  if (config.users && config.users.length) return config.users;
  if (!config.adminEmail) throw new Error('SYNC_USERS か ADMIN_EMAIL のどちらかを設定してください');
  const token = await auth.getToken([DIRECTORY_SCOPE], config.adminEmail);
  return listWorkspaceUsers({ fetch, token, domain: config.domain });
}

/**
 * 1 人分を同期する。成功したら新しい状態を返す。
 */
async function syncUser({ email, userState, config, auth, fetch, log, now }) {
  const token = await auth.getToken([CALENDAR_SCOPE], email);
  const timeMin = new Date(now - config.initialDaysBack * 24 * 60 * 60 * 1000).toISOString();

  let fullSync = !userState.syncToken;
  let changes;
  try {
    changes = await listCalendarChanges({ fetch, token, syncToken: userState.syncToken, timeMin });
  } catch (err) {
    if (!(err instanceof SyncTokenExpiredError)) throw err;
    // Google 側で同期位置が無効になったら取り直す（GWS には全件を fullSync として送る）
    log(`${email}: 同期位置が無効になったため全件を取り直します`);
    fullSync = true;
    changes = await listCalendarChanges({ fetch, token, timeMin });
  }

  const events = changes.items.map((item) => toGenesisEvent(item, email));
  if (events.length || fullSync) {
    for (let i = 0; i < Math.max(events.length, 1); i += BATCH_SIZE) {
      await postToGenesis({
        fetch,
        endpoint: config.genesisEndpoint,
        token: config.genesisToken,
        dryRun: config.dryRun,
        log,
        payload: {
          source: 'google-calendar',
          userEmail: email,
          // fullSync=true のとき: timeMin 以降のこの人の予定は、届いたもの（全バッチ合計）がすべて
          fullSync,
          timeMin: fullSync ? timeMin : null,
          batch: { index: Math.floor(i / BATCH_SIZE), total: Math.max(1, Math.ceil(events.length / BATCH_SIZE)) },
          events: events.slice(i, i + BATCH_SIZE)
        }
      });
    }
  }
  return { count: events.length, fullSync, state: { syncToken: changes.nextSyncToken, lastSyncAt: new Date(now).toISOString() } };
}

/**
 * 全員分を 1 回同期する。
 * @returns {Promise<{users: number, sent: number, failed: string[]}>}
 */
async function runOnce({ config, auth, stateStore, fetch = globalThis.fetch, log = console.log, now = Date.now() }) {
  if (!config.genesisEndpoint && !config.dryRun) throw new Error('GENESIS_ENDPOINT を設定してください（試すだけなら DRY_RUN=1）');

  const users = (await resolveUsers(config, auth, fetch)).filter((e) => !config.excludeUsers.includes(e));
  const state = await stateStore.load();
  state.users = state.users || {};

  let sent = 0;
  const failed = [];
  try {
    for (const email of users) {
      try {
        const result = await syncUser({ email, userState: state.users[email] || {}, config, auth, fetch, log, now });
        state.users[email] = result.state;
        sent += result.count;
        if (result.count || result.fullSync) log(`${email}: ${result.count} 件を送信${result.fullSync ? '（全件）' : ''}`);
      } catch (err) {
        // 1 人の失敗で全体を止めない（同期位置は進めないので次回再試行される）
        failed.push(email);
        log(`${email}: 失敗 - ${err.message}`);
      }
    }
  } finally {
    state.lastRunAt = new Date(now).toISOString();
    await stateStore.save(state);
  }
  log(`完了: ${users.length} 人 / ${sent} 件送信 / 失敗 ${failed.length} 人`);
  return { users: users.length, sent, failed };
}

module.exports = { runOnce, syncUser };

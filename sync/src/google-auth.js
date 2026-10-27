'use strict';
/**
 * Google のアクセストークン取得（外部ライブラリなし）。
 *
 * ドメイン全体の委任（Domain-wide Delegation）で「社員本人として」Calendar API を呼ぶため、
 * サービスアカウントで sub（社員のメールアドレス）入りの JWT を作り、トークンに交換する。
 *
 * 2 つの方式に対応:
 *  - 鍵ファイル方式: GOOGLE_SERVICE_ACCOUNT_KEY_FILE（JSON 鍵）で JWT をローカル署名
 *  - 鍵なし方式（Cloud Run 推奨）: 実行中のサービスアカウントで IAM Credentials API の signJwt を使って署名
 *    → 鍵ファイルを作らずに済む（Workspace 組織では鍵の作成が禁止されていることが多い）
 */
const crypto = require('node:crypto');
const fs = require('node:fs');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const METADATA = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function readJson(res, what) {
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { /* JSON 以外 */ }
  if (!res.ok) {
    const detail = (data.error && (data.error_description || data.error.message || data.error)) || text.slice(0, 200);
    const err = new Error(`${what} に失敗しました (HTTP ${res.status}): ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

class GoogleAuth {
  /**
   * @param {{keyFile?: string, serviceAccountEmail?: string, fetch?: typeof fetch}} opts
   */
  constructor(opts = {}) {
    this.fetch = opts.fetch || globalThis.fetch;
    this.key = opts.keyFile ? JSON.parse(fs.readFileSync(opts.keyFile, 'utf8')) : null;
    this.serviceAccountEmail = opts.serviceAccountEmail || (this.key && this.key.client_email) || null;
    this.cache = new Map();
  }

  /** メタデータサーバーから、実行中サービスアカウント自身のトークンを取得（Cloud Run などで有効） */
  async metadataToken() {
    const cached = this.cache.get('__self__');
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
    const res = await this.fetch(`${METADATA}/token`, { headers: { 'Metadata-Flavor': 'Google' } });
    const data = await readJson(res, 'メタデータサーバーからのトークン取得');
    this.cache.set('__self__', { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
    return data.access_token;
  }

  async selfEmail() {
    if (this.serviceAccountEmail) return this.serviceAccountEmail;
    const res = await this.fetch(`${METADATA}/email`, { headers: { 'Metadata-Flavor': 'Google' } });
    if (!res.ok) throw new Error('サービスアカウントのメールアドレスを取得できません（SERVICE_ACCOUNT_EMAIL を設定してください）');
    this.serviceAccountEmail = (await res.text()).trim();
    return this.serviceAccountEmail;
  }

  async signJwt(claims) {
    if (this.key) {
      const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: this.key.private_key_id }));
      const body = base64url(JSON.stringify(claims));
      const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${body}`), this.key.private_key);
      return `${header}.${body}.${base64url(signature)}`;
    }
    const email = await this.selfEmail();
    const res = await this.fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(email)}:signJwt`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await this.metadataToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: JSON.stringify(claims) })
      }
    );
    const data = await readJson(res, 'signJwt（サービスアカウント トークン作成者 の権限を確認してください）');
    return data.signedJwt;
  }

  /**
   * アクセストークンを取得する。
   * @param {string[]} scopes
   * @param {string|null} subject なりすます社員のメールアドレス（null ならサービスアカウント自身）
   */
  async getToken(scopes, subject = null) {
    if (!subject && !this.key) return this.metadataToken();

    const cacheKey = `${subject || ''}|${scopes.join(' ')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: await this.selfEmail(),
      scope: scopes.join(' '),
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600
    };
    if (subject) claims.sub = subject;
    const assertion = await this.signJwt(claims);
    const res = await this.fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString()
    });
    const data = await readJson(res, `${subject || 'サービスアカウント'} のトークン取得（ドメイン全体の委任の設定を確認してください）`);
    this.cache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
    return data.access_token;
  }
}

module.exports = { GoogleAuth, readJson };

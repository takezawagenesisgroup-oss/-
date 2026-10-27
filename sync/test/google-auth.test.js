'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleAuth } = require('../src/google-auth');

test('鍵なし方式: メタデータサーバー + signJwt で社員としてのトークンを取る', async () => {
  const calls = [];
  const fetch = async (url, opts = {}) => {
    calls.push(String(url));
    if (url.endsWith('/default/email')) return new Response('sync@proj.iam.gserviceaccount.com');
    if (url.endsWith('/default/token')) {
      assert.equal(opts.headers['Metadata-Flavor'], 'Google');
      return Response.json({ access_token: 'self-token', expires_in: 3600 });
    }
    if (url.includes(':signJwt')) {
      assert.match(url, /serviceAccounts\/sync%40proj\.iam\.gserviceaccount\.com:signJwt$/);
      assert.equal(opts.headers.Authorization, 'Bearer self-token');
      const claims = JSON.parse(JSON.parse(opts.body).payload);
      assert.equal(claims.sub, 'tanaka@example.com');
      assert.equal(claims.iss, 'sync@proj.iam.gserviceaccount.com');
      return Response.json({ signedJwt: 'signed.jwt.value' });
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.equal(new URLSearchParams(opts.body).get('assertion'), 'signed.jwt.value');
      return Response.json({ access_token: 'user-token', expires_in: 3600 });
    }
    throw new Error(url);
  };
  const auth = new GoogleAuth({ fetch });
  assert.equal(await auth.getToken(['scope'], 'tanaka@example.com'), 'user-token');
  // 2 回目はキャッシュ
  const n = calls.length;
  assert.equal(await auth.getToken(['scope'], 'tanaka@example.com'), 'user-token');
  assert.equal(calls.length, n);
  // sub なしは自分自身のトークン
  assert.equal(await auth.getToken(['scope']), 'self-token');
});

test('委任が未設定のときは分かりやすいエラーにする', async () => {
  const fetch = async (url) => {
    if (url.endsWith('/default/email')) return new Response('sync@proj.iam.gserviceaccount.com');
    if (url.endsWith('/default/token')) return Response.json({ access_token: 't', expires_in: 3600 });
    if (url.includes(':signJwt')) return Response.json({ signedJwt: 'x' });
    return Response.json({ error: 'unauthorized_client', error_description: 'Client is unauthorized to retrieve access tokens using this method' }, { status: 401 });
  };
  await assert.rejects(new GoogleAuth({ fetch }).getToken(['s'], 'a@example.com'), /ドメイン全体の委任/);
});

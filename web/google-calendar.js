/**
 * Google アカウントでログインして、その人自身の Google カレンダーに予定を登録する。
 *
 * Google Identity Services（GIS）でアクセストークンを取得し、ブラウザから Calendar API を直接呼ぶ。
 * サーバーは不要で、誰が使っても「ログインした人のカレンダー」に登録される。
 * 必要なのは管理者が 1 回だけ作る OAuth クライアント ID（web/config.js に設定）だけ。
 */
(function (root) {
  'use strict';

  var SCOPES = 'https://www.googleapis.com/auth/calendar.events openid email';
  var TOKEN_KEY = 'voiceSchedule.googleToken';
  var API = 'https://www.googleapis.com/calendar/v3';
  var SOURCE_TAG = 'voice-schedule';

  function addOneDay(dateStr) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
    return d.toISOString().slice(0, 10);
  }

  /** アプリ内の予定データ → Calendar API の Event リソース */
  function buildEventResource(ev, timeZone) {
    var resource = {
      summary: ev.title,
      description: ev.description || (ev.source ? '音声入力: ' + ev.source : ''),
      extendedProperties: { private: { source: SOURCE_TAG } }
    };
    if (ev.location) resource.location = ev.location;

    var endDate = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
    if (ev.allDay || !ev.startTime) {
      // 終日予定の end は「最終日の翌日」を指定する（排他的）
      resource.start = { date: ev.startDate };
      resource.end = { date: addOneDay(endDate) };
    } else {
      var endTime = ev.endTime || ev.startTime;
      // 終了が開始以前なら 1 時間後にする（Code.js と同じ扱い）
      if (endDate === ev.startDate && endTime <= ev.startTime) {
        var p = ev.startTime.split(':').map(Number);
        var m = p[0] * 60 + p[1] + 60;
        if (m >= 24 * 60) { endDate = addOneDay(endDate); m -= 24 * 60; }
        endTime = ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
      }
      resource.start = { dateTime: ev.startDate + 'T' + ev.startTime + ':00', timeZone: timeZone };
      resource.end = { dateTime: endDate + 'T' + endTime + ':00', timeZone: timeZone };
    }
    return resource;
  }

  // ---------- ログイン（ブラウザのみ） ----------

  var clientId = '';
  var tokenClient = null;
  var pending = null;
  var gisLoading = null;

  function loadGis() {
    if (root.google && root.google.accounts && root.google.accounts.oauth2) return Promise.resolve();
    if (gisLoading) return gisLoading;
    gisLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { gisLoading = null; reject(new Error('Google ログインの読み込みに失敗しました')); };
      document.head.appendChild(s);
    });
    return gisLoading;
  }

  function readToken() {
    try {
      var t = JSON.parse(localStorage.getItem(TOKEN_KEY));
      return t && t.accessToken ? t : null;
    } catch (e) { return null; }
  }

  function writeToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* 保存できなくても動作は続ける */ }
  }

  var state = readToken() || {};

  function hasValidToken() {
    // 余裕を見て期限の 1 分前までを有効とする
    return !!(state.accessToken && state.expiresAt && state.expiresAt - 60 * 1000 > Date.now());
  }

  function init(id) {
    clientId = id || '';
    if (clientId) loadGis().catch(function () { /* 実際にログインするときに再試行する */ });
  }

  function isAvailable() {
    return !!clientId;
  }

  function fetchEmail(accessToken) {
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken }
    }).then(function (res) { return res.ok ? res.json() : {}; })
      .then(function (info) { return info.email || ''; })
      .catch(function () { return ''; });
  }

  /**
   * アクセストークンを取得する。期限内なら保存済みのものを返す。
   * 期限切れのときはポップアップが開くため、ボタンのタップなどユーザー操作の中で呼ぶこと。
   * @param {{selectAccount?: boolean}} [opts]
   */
  function getToken(opts) {
    opts = opts || {};
    if (!opts.selectAccount && hasValidToken()) return Promise.resolve(state.accessToken);
    if (!clientId) return Promise.reject(new Error('Google ログインが設定されていません（web/config.js）'));
    if (pending) return pending;

    pending = loadGis().then(function () {
      return new Promise(function (resolve, reject) {
        tokenClient = root.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: function (res) {
            if (res.error) return reject(new Error('ログインできませんでした: ' + res.error));
            if (!root.google.accounts.oauth2.hasGrantedAllScopes(res, 'https://www.googleapis.com/auth/calendar.events')) {
              return reject(new Error('カレンダーへのアクセスが許可されませんでした。もう一度ログインして、カレンダーの項目にチェックを入れてください'));
            }
            var accessToken = res.access_token;
            fetchEmail(accessToken).then(function (email) {
              state = {
                accessToken: accessToken,
                expiresAt: Date.now() + (Number(res.expires_in) || 3600) * 1000,
                email: email || state.email || ''
              };
              writeToken(state);
              resolve(accessToken);
            });
          },
          error_callback: function (err) {
            var type = err && err.type;
            reject(new Error(type === 'popup_closed' ? 'ログインがキャンセルされました'
              : type === 'popup_failed_to_open' ? 'ポップアップがブロックされました。ボタンをもう一度押してください'
              : 'ログインできませんでした'));
          }
        });
        tokenClient.requestAccessToken({
          prompt: opts.selectAccount ? 'select_account' : '',
          login_hint: opts.selectAccount ? undefined : (state.email || undefined)
        });
      });
    }).then(function (token) {
      pending = null;
      return token;
    }, function (err) {
      pending = null;
      throw err;
    });
    return pending;
  }

  function signOut() {
    var token = state.accessToken;
    state = {};
    writeToken(null);
    if (token && root.google && root.google.accounts && root.google.accounts.oauth2) {
      root.google.accounts.oauth2.revoke(token, function () {});
    }
  }

  function api(path, options, retried) {
    return getToken().then(function (token) {
      options = options || {};
      return fetch(API + path, {
        method: options.method || 'GET',
        headers: Object.assign({ Authorization: 'Bearer ' + token }, options.body ? { 'Content-Type': 'application/json' } : {}),
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    }).then(function (res) {
      if (res.status === 401 && !retried) {
        // トークンが無効になっていたら取り直して 1 回だけ再試行
        state.expiresAt = 0;
        return api(path, options, true);
      }
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + res.status));
        return data;
      });
    });
  }

  function insertEvent(ev) {
    var tz = 'Asia/Tokyo';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* 既定値のまま */ }
    return api('/calendars/primary/events', { method: 'POST', body: buildEventResource(ev, tz) })
      .then(function (created) {
        return { id: created.id, url: created.htmlLink, calendar: state.email };
      });
  }

  /** 接続テスト（予定は作らず、直近 1 件を読めるか確認する） */
  function check() {
    return api('/calendars/primary/events?maxResults=1&timeMin=' + encodeURIComponent(new Date().toISOString()));
  }

  root.GoogleCalendar = {
    init: init,
    isAvailable: isAvailable,
    isSignedIn: hasValidToken,
    hasAccount: function () { return !!state.email; },
    email: function () { return state.email || ''; },
    getToken: getToken,
    signOut: signOut,
    insertEvent: insertEvent,
    check: check,
    buildEventResource: buildEventResource
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildEventResource: buildEventResource };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

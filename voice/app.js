/* global parseSchedule, GoogleCalendar */
(function () {
  'use strict';

  var SETTINGS_KEY = 'voiceSchedule.settings';
  var HISTORY_KEY = 'voiceSchedule.history';

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    mic: $('mic'), status: $('status'), transcript: $('transcript'), parse: $('parse'),
    form: $('eventForm'), warnings: $('warnings'), title: $('title'), startDate: $('startDate'),
    allDay: $('allDay'), timeRow: $('timeRow'), startTime: $('startTime'), endTime: $('endTime'),
    endDate: $('endDate'), location: $('location'), retry: $('retry'), submit: $('submit'),
    result: $('result'), history: $('history'),
    settings: $('settings'), settingsForm: $('settingsForm'), openSettings: $('openSettings'),
    account: $('account'), modeGoogle: $('modeGoogle'), modeGas: $('modeGas'),
    googleSection: $('googleSection'), gasSection: $('gasSection'), googleAccount: $('googleAccount'),
    signIn: $('signIn'), switchAccount: $('switchAccount'), signOut: $('signOut'),
    gasUrl: $('gasUrl'), autoRegister: $('autoRegister'), autoStart: $('autoStart'),
    settingsStatus: $('settingsStatus'), testConnection: $('testConnection')
  };

  var current = null; // 解析結果（フォームの元データ）

  // ---------- 保存領域（プライベートブラウズなどで使えない場合も動くようにする） ----------

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できなくても続行 */ }
  }

  var config = window.VOICE_SCHEDULE_CONFIG || {};
  GoogleCalendar.init(config.googleClientId);

  var settings = load(SETTINGS_KEY, { gasUrl: '', autoRegister: false, autoStart: false });
  // 登録方法: 'google'（ログインした人のカレンダー）/ 'gas'（Apps Script 経由）
  if (!settings.mode) settings.mode = settings.gasUrl || !GoogleCalendar.isAvailable() ? 'gas' : 'google';

  // ?gas=... 付きの URL で開くと設定を取り込む（スマホへの設定を楽にするため）
  (function importSettingsFromUrl() {
    var params = new URLSearchParams(location.search);
    if (!params.get('gas')) return;
    settings.gasUrl = params.get('gas');
    settings.mode = 'gas';
    save(SETTINGS_KEY, settings);
    history.replaceState(null, '', location.pathname);
  })();

  function setStatus(text, kind) {
    els.status.textContent = text;
    els.status.className = 'status' + (kind ? ' ' + kind : '');
  }

  // ---------- 音声認識 ----------

  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognizer = null;
  var listening = false;

  function startListening() {
    if (!Recognition) {
      setStatus('このブラウザは音声認識に対応していません。下の欄でキーボードのマイクを使ってください', 'error');
      els.transcript.focus();
      return;
    }
    if (listening) { recognizer.stop(); return; }

    recognizer = new Recognition();
    recognizer.lang = 'ja-JP';
    recognizer.interimResults = true;
    recognizer.continuous = false;
    recognizer.maxAlternatives = 1;

    var finalText = '';
    recognizer.onstart = function () {
      listening = true;
      els.mic.classList.add('listening');
      setStatus('聞き取り中…（話し終えると自動で止まります）');
      els.result.hidden = true;
    };
    recognizer.onresult = function (event) {
      var interim = '';
      finalText = '';
      for (var i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      els.transcript.value = finalText + interim;
    };
    recognizer.onerror = function (event) {
      var messages = {
        'not-allowed': 'マイクの使用が許可されていません。ブラウザの設定で許可してください',
        'no-speech': '音声が聞き取れませんでした。もう一度タップしてください',
        'network': 'ネットワークエラーで音声認識できませんでした'
      };
      setStatus(messages[event.error] || ('音声認識エラー: ' + event.error), 'error');
    };
    recognizer.onend = function () {
      listening = false;
      els.mic.classList.remove('listening');
      var text = (finalText || els.transcript.value).trim();
      if (text) handleText(text, true);
      else if (els.status.className.indexOf('error') === -1) setStatus('タップして予定を話してください');
    };

    try {
      recognizer.start();
    } catch (e) {
      setStatus('音声認識を開始できませんでした: ' + e.message, 'error');
    }
  }

  // ---------- 解析とフォーム ----------

  function handleText(text, fromVoice) {
    current = parseSchedule(text, new Date());
    fillForm(current);
    // 日付や内容が聞き取れなかったときは自動登録せず確認画面を出す（終了時刻の補完は問題なし）
    var uncertain = current.warnings.some(function (w) { return w.indexOf('終了時刻') === -1; });
    var timed = !current.allDay && !uncertain;
    // Google ログインの再確認が必要なとき（ポップアップが出る）はタップが必要なので自動登録しない
    var ready = settings.mode === 'google' ? GoogleCalendar.isSignedIn() : isConfigured();
    if (fromVoice && settings.autoRegister && timed && ready) {
      setStatus('登録しています…');
      register();
    } else {
      setStatus('内容を確認して「登録する」を押してください');
      els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function fillForm(ev) {
    els.form.hidden = false;
    els.title.value = ev.title;
    els.startDate.value = ev.startDate;
    els.endDate.value = ev.endDate;
    els.allDay.checked = ev.allDay;
    els.startTime.value = ev.startTime || '';
    els.endTime.value = ev.endTime || '';
    els.location.value = ev.location;
    els.warnings.innerHTML = '';
    ev.warnings.forEach(function (w) {
      var li = document.createElement('li');
      li.textContent = w;
      els.warnings.appendChild(li);
    });
    updateTimeRow();
  }

  function updateTimeRow() {
    els.timeRow.hidden = els.allDay.checked;
  }

  function readForm() {
    var allDay = els.allDay.checked || !els.startTime.value;
    var startDate = els.startDate.value;
    var endDate = els.endDate.value && els.endDate.value >= startDate ? els.endDate.value : startDate;
    return {
      title: els.title.value.trim(),
      startDate: startDate,
      endDate: endDate,
      allDay: allDay,
      startTime: allDay ? null : els.startTime.value,
      endTime: allDay ? null : (els.endTime.value || null),
      location: els.location.value.trim(),
      source: current ? current.source : els.transcript.value.trim()
    };
  }

  // ---------- 登録 ----------

  function isConfigured() {
    return settings.mode === 'google' ? GoogleCalendar.isAvailable() : !!settings.gasUrl;
  }

  /** 選択中の登録方法で予定を登録し、{ url, calendar } を返す */
  function insertEvent(ev) {
    if (settings.mode === 'google') {
      return GoogleCalendar.insertEvent(ev).then(function (created) {
        renderAccount();
        return created;
      });
    }
    return callApi({ event: ev }).then(function (data) { return data.created; });
  }

  function callApi(payload) {
    // text/plain で送るとプリフライトが発生せず、Apps Script でも CORS エラーにならない
    return fetch(settings.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data.ok) throw new Error(data.error || '不明なエラー');
      return data;
    });
  }

  function register() {
    if (!isConfigured()) {
      setStatus(settings.mode === 'google'
        ? 'Google ログインが未設定です（管理者が web/config.js を設定する必要があります）'
        : '先に設定（⚙）で Apps Script の URL を入力してください', 'error');
      openSettings();
      return;
    }
    var ev = readForm();
    if (!ev.title || !ev.startDate) {
      setStatus('予定と日付を入力してください', 'error');
      return;
    }
    els.submit.disabled = true;
    insertEvent(ev).then(function (created) {
      showResult(true, ev, created);
      addHistory(ev, created);
      els.form.hidden = true;
      els.transcript.value = '';
      setStatus('登録しました。続けて登録する場合はもう一度タップ', 'ok');
    }).catch(function (err) {
      showResult(false, ev, null, err.message);
      setStatus('登録に失敗しました', 'error');
    }).then(function () {
      els.submit.disabled = false;
    });
  }

  function describe(ev) {
    var when = ev.startDate.replace(/-/g, '/');
    if (ev.allDay) {
      when += (ev.endDate !== ev.startDate ? '〜' + ev.endDate.replace(/-/g, '/') : '') + ' 終日';
    } else {
      when += ' ' + ev.startTime + (ev.endTime ? '〜' + ev.endTime : '');
    }
    return when + '　' + ev.title + (ev.location ? '（' + ev.location + '）' : '');
  }

  function showResult(ok, ev, created, message) {
    els.result.hidden = false;
    els.result.className = 'card result ' + (ok ? 'ok' : 'error');
    els.result.innerHTML = '';
    var h = document.createElement('h2');
    h.textContent = ok ? '✓ Googleカレンダーに登録しました' : '登録できませんでした';
    var p = document.createElement('p');
    p.textContent = ok ? describe(ev) + (created && created.calendar ? '\n登録先: ' + created.calendar : '') : message;
    p.style.whiteSpace = 'pre-line';
    els.result.appendChild(h);
    els.result.appendChild(p);
    if (ok && created && created.url) {
      var a = document.createElement('a');
      a.href = created.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Googleカレンダーで開く';
      els.result.appendChild(a);
    }
  }

  function addHistory(ev, created) {
    var list = load(HISTORY_KEY, []);
    list.unshift({ text: describe(ev), url: created && created.url, account: created && created.calendar, at: new Date().toISOString() });
    save(HISTORY_KEY, list.slice(0, 10));
    renderHistory();
  }

  function renderHistory() {
    var list = load(HISTORY_KEY, []);
    els.history.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('li');
      empty.textContent = 'まだありません';
      els.history.appendChild(empty);
      return;
    }
    list.forEach(function (item) {
      var li = document.createElement('li');
      var when = document.createElement('span');
      when.className = 'when';
      when.textContent = new Date(item.at).toLocaleString('ja-JP') + ' 登録' + (item.account ? '（' + item.account + '）' : '');
      li.appendChild(when);
      if (item.url) {
        var a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.text;
        li.appendChild(a);
      } else {
        li.appendChild(document.createTextNode(item.text));
      }
      els.history.appendChild(li);
    });
  }

  // ---------- 設定 ----------

  /** 画面上部に「どのアカウントのカレンダーに登録されるか」を表示する */
  function renderAccount() {
    els.account.innerHTML = '';
    if (settings.mode !== 'google' || !GoogleCalendar.isAvailable()) {
      els.account.textContent = settings.mode === 'gas' && settings.gasUrl ? '登録先: Apps Script のカレンダー' : '';
      return;
    }
    if (GoogleCalendar.hasAccount()) {
      els.account.appendChild(document.createTextNode('登録先: ' + GoogleCalendar.email() + ' '));
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = GoogleCalendar.hasAccount() ? '切替' : 'Google でログイン';
    btn.addEventListener('click', function () {
      signIn(GoogleCalendar.hasAccount());
    });
    els.account.appendChild(btn);
  }

  function renderGoogleSection() {
    var google = els.modeGoogle.checked;
    els.googleSection.hidden = !google;
    els.gasSection.hidden = google;
    if (!GoogleCalendar.isAvailable()) {
      els.googleAccount.textContent = 'Google ログインはまだ使えません（管理者が web/config.js に OAuth クライアント ID を設定する必要があります）';
      els.signIn.hidden = els.switchAccount.hidden = els.signOut.hidden = true;
      return;
    }
    var has = GoogleCalendar.hasAccount();
    els.googleAccount.textContent = has ? 'ログイン中: ' + GoogleCalendar.email() : '未ログイン';
    els.signIn.hidden = has;
    els.switchAccount.hidden = els.signOut.hidden = !has;
  }

  function signIn(selectAccount) {
    return GoogleCalendar.getToken({ selectAccount: !!selectAccount }).then(function () {
      settings.mode = 'google';
      save(SETTINGS_KEY, settings);
      renderAccount();
      renderGoogleSection();
      setStatus('タップして予定を話してください');
    }).catch(function (err) {
      els.googleAccount.textContent = err.message;
      setStatus(err.message, 'error');
    });
  }

  function openSettings() {
    els.modeGoogle.checked = settings.mode === 'google';
    els.modeGas.checked = settings.mode !== 'google';
    renderGoogleSection();
    els.gasUrl.value = settings.gasUrl;
    els.autoRegister.checked = settings.autoRegister;
    els.autoStart.checked = settings.autoStart;
    els.settingsStatus.textContent = '';
    if (typeof els.settings.showModal === 'function') els.settings.showModal();
  }

  function readSettingsForm() {
    return {
      mode: els.modeGoogle.checked ? 'google' : 'gas',
      gasUrl: els.gasUrl.value.trim(),
      autoRegister: els.autoRegister.checked,
      autoStart: els.autoStart.checked
    };
  }

  els.settingsForm.addEventListener('submit', function () {
    settings = readSettingsForm();
    save(SETTINGS_KEY, settings);
    renderAccount();
    setStatus(isConfigured() ? 'タップして予定を話してください' : '設定が未完了です', isConfigured() ? '' : 'error');
  });

  els.testConnection.addEventListener('click', function () {
    var backup = settings;
    settings = readSettingsForm();
    els.settingsStatus.className = 'status small';
    els.settingsStatus.textContent = '確認中…';
    var test = settings.mode === 'google'
      ? GoogleCalendar.check()
      : callApi({ text: '明日10時 接続テスト', dryRun: true });
    test.then(function () {
      renderGoogleSection();
      els.settingsStatus.className = 'status small ok';
      els.settingsStatus.textContent = '接続できました（予定は登録していません）';
    }).catch(function (err) {
      els.settingsStatus.className = 'status small error';
      els.settingsStatus.textContent = '接続できません: ' + err.message;
    }).then(function () {
      settings = backup;
    });
  });

  // ---------- イベント ----------

  els.mic.addEventListener('click', startListening);
  els.parse.addEventListener('click', function () {
    var text = els.transcript.value.trim();
    if (text) handleText(text, false);
  });
  els.allDay.addEventListener('change', updateTimeRow);
  els.retry.addEventListener('click', function () {
    els.form.hidden = true;
    els.transcript.value = '';
    startListening();
  });
  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    register();
  });
  els.openSettings.addEventListener('click', openSettings);
  els.modeGoogle.addEventListener('change', renderGoogleSection);
  els.modeGas.addEventListener('change', renderGoogleSection);
  els.signIn.addEventListener('click', function () { signIn(false); });
  els.switchAccount.addEventListener('click', function () { signIn(true); });
  els.signOut.addEventListener('click', function () {
    GoogleCalendar.signOut();
    renderGoogleSection();
    renderAccount();
  });

  renderHistory();
  renderAccount();
  if (!isConfigured()) {
    setStatus('最初に設定（⚙）を行ってください', 'error');
  } else if (settings.mode === 'google' && !GoogleCalendar.hasAccount()) {
    setStatus('最初に「Google でログイン」を押してください');
  } else if (settings.autoStart && Recognition) {
    // ブラウザによってはタップなしでは開始できない（その場合はボタンを押せば OK）
    startListening();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* オフライン非対応でも動作には影響なし */ });
  }
})();

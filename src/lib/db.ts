import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'app.db');

declare global {
  // eslint-disable-next-line no-var
  var __db__: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function getDb(): Database.Database {
  if (!global.__db__) {
    global.__db__ = createConnection();
    init(global.__db__);
    try {
      seed(global.__db__);
    } catch (err) {
      // Concurrent processes (e.g. Next.js build workers) may race to seed
      // the same fresh database; the data is already present either way.
      if (!(err instanceof Error) || !err.message.includes('UNIQUE constraint failed')) {
        throw err;
      }
    }
  }
  return global.__db__;
}

function init(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT,
      icon TEXT NOT NULL DEFAULT '🏢',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS trouble_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📋',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS item_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('tool','supply')),
      icon TEXT NOT NULL DEFAULT '🧰',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES item_categories(id),
      name TEXT NOT NULL,
      tier INTEGER NOT NULL CHECK(tier IN (1,2,3)),
      icon TEXT NOT NULL DEFAULT '🔧',
      storage_location TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      icon TEXT NOT NULL DEFAULT '🚚',
      plate_no TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS work_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL REFERENCES facilities(id),
      trouble_type_id INTEGER REFERENCES trouble_types(id),
      parent_id INTEGER REFERENCES work_records(id),
      title TEXT NOT NULL,
      description TEXT,
      raw_transcript TEXT,
      work_date TEXT NOT NULL,
      assignee_id INTEGER REFERENCES users(id),
      duration_minutes INTEGER,
      status TEXT NOT NULL DEFAULT 'done',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS work_record_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_record_id INTEGER NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS work_record_items (
      work_record_id INTEGER NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (work_record_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS work_record_vehicles (
      work_record_id INTEGER NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      PRIMARY KEY (work_record_id, vehicle_id)
    );
  `);
}

function seed(db: Database.Database) {
  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (username, name, password_hash, role) VALUES (?,?,?,?)'
    );
    insertUser.run('admin', '管理者', bcrypt.hashSync('admin1234', 10), 'admin');
    insertUser.run('sato', '佐藤', bcrypt.hashSync('staff1234', 10), 'staff');
    insertUser.run('suzuki', '鈴木', bcrypt.hashSync('staff1234', 10), 'staff');
    insertUser.run('takahashi', '高橋', bcrypt.hashSync('staff1234', 10), 'staff');
  }

  const facCount = db.prepare('SELECT COUNT(*) c FROM facilities').get() as { c: number };
  if (facCount.c === 0) {
    const ins = db.prepare(
      'INSERT INTO facilities (name, type, address, icon, notes) VALUES (?,?,?,?,?)'
    );
    const facilities: [string, string, string, string, string][] = [
      ['パチンコ店 帯広本店', 'pachinko', '北海道帯広市', '🎰', ''],
      ['パチンコ店 音更店', 'pachinko', '北海道音更町', '🎰', ''],
      ['パチンコ店 帯広西店', 'pachinko', '北海道帯広市', '🎰', ''],
      ['マンション 帯広第一', 'mansion', '北海道帯広市', '🏢', ''],
      ['マンション 音更グリーン', 'mansion', '北海道音更町', '🏢', ''],
      ['マンション 帯広第二', 'mansion', '北海道帯広市', '🏢', ''],
      ['戸建て住宅 帯広（庭付き）', 'house', '北海道帯広市', '🏡', '庭あり'],
      ['戸建て住宅 音更（庭付き）', 'house', '北海道音更町', '🏡', '庭あり'],
      ['空き地 帯広A', 'lot', '北海道帯広市', '🌾', ''],
      ['空き地 音更B', 'lot', '北海道音更町', '🌾', ''],
      ['倉庫 帯広', 'warehouse', '北海道帯広市', '🏭', ''],
      ['倉庫 音更', 'warehouse', '北海道音更町', '🏭', ''],
      ['本社', 'hq', '北海道帯広市', '🏬', ''],
    ];
    for (const f of facilities) ins.run(...f);
  }

  const ttCount = db.prepare('SELECT COUNT(*) c FROM trouble_types').get() as { c: number };
  if (ttCount.c === 0) {
    const ins = db.prepare('INSERT INTO trouble_types (name, icon, sort_order) VALUES (?,?,?)');
    const types: [string, string, number][] = [
      ['舗装・アスファルト補修', '🛣️', 1],
      ['屋根修理', '🏚️', 2],
      ['外壁補修・塗装', '🧱', 3],
      ['水道トラブル', '🚰', 4],
      ['電気トラブル', '💡', 5],
      ['除雪', '❄️', 6],
      ['雪害対応', '🌨️', 7],
      ['草刈り・剪定', '🌿', 8],
      ['害獣・害虫対応', '🐾', 9],
      ['清掃・共用部', '🧹', 10],
      ['その他', '📋', 99],
    ];
    for (const t of types) ins.run(...t);
  }

  const catCount = db.prepare('SELECT COUNT(*) c FROM item_categories').get() as { c: number };
  if (catCount.c === 0) {
    const insCat = db.prepare(
      'INSERT INTO item_categories (name, kind, icon, sort_order) VALUES (?,?,?,?)'
    );
    const insItem = db.prepare(
      'INSERT INTO items (category_id, name, tier, icon, storage_location, notes) VALUES (?,?,?,?,?,?)'
    );

    type ItemSeed = [string, number, string, string];
    const categories: { name: string; kind: 'tool' | 'supply'; icon: string; items: ItemSeed[] }[] = [
      {
        name: '大工道具',
        kind: 'tool',
        icon: '🔨',
        items: [
          ['金づち', 1, '🔨', '倉庫A棚1手前'],
          ['ドライバーセット', 1, '🪛', '倉庫A棚1手前'],
          ['メジャー', 1, '📏', '倉庫A棚1手前'],
          ['カッター', 1, '🔪', '倉庫A棚1手前'],
          ['ペンチ', 1, '🔧', '倉庫A棚1手前'],
          ['インパクトドライバー', 2, '🛠️', '倉庫A棚1中段'],
          ['丸のこ', 2, '🪚', '倉庫A棚1中段'],
          ['電動サンダー', 2, '🛠️', '倉庫A棚1中段'],
          ['水平器', 2, '📐', '倉庫A棚1中段'],
          ['卓上丸のこ盤', 3, '🪚', '倉庫A奥'],
          ['脚立（大型）', 3, '🪜', '倉庫A奥'],
          ['コンプレッサー', 3, '🛠️', '倉庫A奥'],
        ],
      },
      {
        name: '配管・水道',
        kind: 'tool',
        icon: '🚿',
        items: [
          ['モンキーレンチ', 1, '🔧', '倉庫A棚2手前'],
          ['パイプレンチ', 1, '🔧', '倉庫A棚2手前'],
          ['シールテープ', 1, '🧻', '倉庫A棚2手前'],
          ['電動ドレンクリーナー', 2, '🛠️', '倉庫A棚2中段'],
          ['パイプカッター', 2, '🔧', '倉庫A棚2中段'],
          ['高圧洗浄機', 3, '🚿', '倉庫A奥'],
        ],
      },
      {
        name: '電気工事',
        kind: 'tool',
        icon: '⚡',
        items: [
          ['テスター', 1, '🔋', '倉庫A棚3手前'],
          ['絶縁ドライバー', 1, '🪛', '倉庫A棚3手前'],
          ['圧着ペンチ', 1, '🔧', '倉庫A棚3手前'],
          ['検電器', 2, '🔌', '倉庫A棚3中段'],
          ['ケーブルストリッパー', 2, '🔧', '倉庫A棚3中段'],
          ['発電機', 3, '⚡', '倉庫A奥'],
        ],
      },
      {
        name: '外壁・屋根',
        kind: 'tool',
        icon: '🧱',
        items: [
          ['コーキングガン', 1, '🔧', '倉庫B棚1手前'],
          ['ヘラ', 1, '🔧', '倉庫B棚1手前'],
          ['防水シート', 2, '🧻', '倉庫B棚1中段'],
          ['下地材一式', 2, '📦', '倉庫B棚1中段'],
          ['足場材（大型）', 3, '🏗️', '倉庫B奥'],
        ],
      },
      {
        name: '舗装・アスファルト補修',
        kind: 'tool',
        icon: '🛣️',
        items: [
          ['常温合材（補修材）', 1, '🪨', '倉庫B棚2手前'],
          ['コテ', 1, '🔧', '倉庫B棚2手前'],
          ['ほうき', 1, '🧹', '倉庫B棚2手前'],
          ['タンパー（転圧機）', 2, '🛠️', '倉庫B棚2中段'],
          ['バーナー', 2, '🔥', '倉庫B棚2中段'],
          ['アスファルトカッター', 3, '🛠️', '倉庫B奥'],
        ],
      },
      {
        name: '除雪・雪害対応',
        kind: 'tool',
        icon: '❄️',
        items: [
          ['スノーダンプ', 1, '🛷', '倉庫B棚3手前'],
          ['角スコップ', 1, '🥄', '倉庫B棚3手前'],
          ['融雪剤', 1, '🧂', '倉庫B棚3手前'],
          ['氷割り棒', 2, '🧊', '倉庫B棚3中段'],
          ['チェーンソー（倒木用）', 2, '🪚', '倉庫B棚3中段'],
          ['大型ブロワー', 3, '🌀', '倉庫B奥'],
        ],
      },
      {
        name: '草刈り・造園',
        kind: 'tool',
        icon: '🌿',
        items: [
          ['剪定ばさみ', 1, '✂️', '倉庫B棚4手前'],
          ['鎌', 1, '🔪', '倉庫B棚4手前'],
          ['刈払機', 2, '🛠️', '倉庫B棚4中段'],
          ['チェーンソー', 2, '🪚', '倉庫B棚4中段'],
          ['ハンマーナイフモア', 3, '🚜', '倉庫B奥'],
        ],
      },
      {
        name: '消耗品・電球',
        kind: 'supply',
        icon: '💡',
        items: [
          ['LED電球（一般型）', 1, '💡', '本社倉庫棚1手前'],
          ['乾電池セット', 1, '🔋', '本社倉庫棚1手前'],
          ['蛍光灯（直管）', 2, '💡', '本社倉庫棚1中段'],
          ['安定器', 2, '🔌', '本社倉庫棚1中段'],
          ['特殊電球（業務用）', 3, '💡', '本社倉庫棚1奥'],
        ],
      },
      {
        name: '清掃用品',
        kind: 'supply',
        icon: '🧹',
        items: [
          ['ゴミ袋', 1, '🗑️', '本社倉庫棚2手前'],
          ['洗剤・モップ', 1, '🧴', '本社倉庫棚2手前'],
          ['業務用掃除機', 2, '🧹', '本社倉庫棚2中段'],
          ['高所清掃用具', 3, '🪜', '本社倉庫棚2奥'],
        ],
      },
    ];

    for (const cat of categories) {
      const res = insCat.run(cat.name, cat.kind, cat.icon, 0);
      const categoryId = res.lastInsertRowid as number;
      for (const [name, tier, icon, loc] of cat.items) {
        insItem.run(categoryId, name, tier, icon, loc, null);
      }
    }
  }

  const vehCount = db.prepare('SELECT COUNT(*) c FROM vehicles').get() as { c: number };
  if (vehCount.c === 0) {
    const ins = db.prepare('INSERT INTO vehicles (name, type, icon, plate_no) VALUES (?,?,?,?)');
    const vehicles: [string, string, string, string][] = [
      ['高所作業車', 'special', '🚡', ''],
      ['2トン車', 'truck', '🚛', ''],
      ['4トン車', 'truck', '🚛', ''],
      ['軽バン', 'van', '🚐', ''],
      ['ハイエース', 'van', '🚐', ''],
      ['軽トラック', 'truck', '🛻', ''],
      ['除雪車 1号車', 'snow', '🚜', ''],
      ['除雪車 2号車', 'snow', '🚜', ''],
    ];
    for (const v of vehicles) ins.run(...v);
  }

  const wrCount = db.prepare('SELECT COUNT(*) c FROM work_records').get() as { c: number };
  if (wrCount.c === 0) {
    seedDemoWorkRecords(db);
  }
}

function seedDemoWorkRecords(db: Database.Database) {
  const facilities = db.prepare('SELECT id, name, type FROM facilities').all() as {
    id: number;
    name: string;
    type: string;
  }[];
  const troubleTypes = db.prepare('SELECT id, name FROM trouble_types').all() as {
    id: number;
    name: string;
  }[];
  const items = db.prepare('SELECT id, name FROM items').all() as { id: number; name: string }[];
  const vehicles = db.prepare('SELECT id, name FROM vehicles').all() as {
    id: number;
    name: string;
  }[];
  const users = db.prepare('SELECT id FROM users').all() as { id: number }[];

  const findFacility = (name: string) => facilities.find((f) => f.name === name)!.id;
  const findTrouble = (name: string) => troubleTypes.find((t) => t.name === name)!.id;
  const findItem = (name: string) => items.find((i) => i.name === name)!.id;
  const findVehicle = (name: string) => vehicles.find((v) => v.name === name)!.id;

  const insRecord = db.prepare(`
    INSERT INTO work_records
      (facility_id, trouble_type_id, parent_id, title, description, raw_transcript, work_date, assignee_id, duration_minutes, status, created_by)
    VALUES (@facility_id, @trouble_type_id, @parent_id, @title, @description, @raw_transcript, @work_date, @assignee_id, @duration_minutes, 'done', @created_by)
  `);
  const insItemLink = db.prepare(
    'INSERT INTO work_record_items (work_record_id, item_id, quantity) VALUES (?,?,1)'
  );
  const insVehicleLink = db.prepare(
    'INSERT INTO work_record_vehicles (work_record_id, vehicle_id) VALUES (?,?)'
  );

  const staff1 = users[1]?.id ?? users[0].id;
  const staff2 = users[2]?.id ?? users[0].id;

  const r1 = insRecord.run({
    facility_id: findFacility('マンション 帯広第一'),
    trouble_type_id: findTrouble('舗装・アスファルト補修'),
    parent_id: null,
    title: '駐車場アスファルト陥没補修',
    description: '駐車場出入口付近のアスファルトが陥没。常温合材で補修しタンパーで転圧。',
    raw_transcript:
      '駐車場の入り口のアスファルトが陥没していたので常温合材とコテとタンパーを使って補修しました。ほうきで掃除してから作業しました。',
    work_date: '2026-05-12',
    assignee_id: staff1,
    duration_minutes: 90,
    created_by: staff1,
  }).lastInsertRowid as number;
  [
    findItem('常温合材（補修材）'),
    findItem('コテ'),
    findItem('ほうき'),
    findItem('タンパー（転圧機）'),
  ].forEach((id) => insItemLink.run(r1, id));
  insVehicleLink.run(r1, findVehicle('軽トラック'));

  const r2 = insRecord.run({
    facility_id: findFacility('マンション 音更グリーン'),
    trouble_type_id: findTrouble('舗装・アスファルト補修'),
    parent_id: r1,
    title: '共用通路アスファルトひび割れ補修',
    description: '通路のひび割れを常温合材で補修。範囲が狭いため大型工具は不要だった。',
    raw_transcript:
      '通路に細いひび割れがあったので常温合材とコテで簡単に補修しました。範囲が小さいので大きい工具は使いませんでした。',
    work_date: '2026-06-03',
    assignee_id: staff2,
    duration_minutes: 40,
    created_by: staff2,
  }).lastInsertRowid as number;
  [findItem('常温合材（補修材）'), findItem('コテ')].forEach((id) => insItemLink.run(r2, id));
  insVehicleLink.run(r2, findVehicle('軽バン'));

  const r3 = insRecord.run({
    facility_id: findFacility('空き地 帯広A'),
    trouble_type_id: findTrouble('除雪'),
    parent_id: null,
    title: '積雪後の空き地除雪対応',
    description: '大雪後、隣地への雪の越境を防ぐためスノーダンプで除雪し融雪剤を散布。',
    raw_transcript:
      'まとまった雪が降ったのでスノーダンプと角スコップで除雪しました。凍結防止のために融雪剤も撒きました。',
    work_date: '2026-01-20',
    assignee_id: staff1,
    duration_minutes: 120,
    created_by: staff1,
  }).lastInsertRowid as number;
  [findItem('スノーダンプ'), findItem('角スコップ'), findItem('融雪剤')].forEach((id) =>
    insItemLink.run(r3, id)
  );
  insVehicleLink.run(r3, findVehicle('除雪車 1号車'));

  const r4 = insRecord.run({
    facility_id: findFacility('空き地 帯広A'),
    trouble_type_id: findTrouble('草刈り・剪定'),
    parent_id: null,
    title: '夏季定期草刈り',
    description: '空き地全体の草刈りを刈払機で実施。境界付近は鎌で仕上げ。',
    raw_transcript:
      '空き地の草が伸びていたので刈払機で全体を刈りました。境界のフェンス際は鎌で丁寧に仕上げました。',
    work_date: '2026-07-15',
    assignee_id: staff2,
    duration_minutes: 150,
    created_by: staff2,
  }).lastInsertRowid as number;
  [findItem('刈払機'), findItem('鎌')].forEach((id) => insItemLink.run(r4, id));
  insVehicleLink.run(r4, findVehicle('軽トラック'));

  const r5 = insRecord.run({
    facility_id: findFacility('マンション 帯広第一'),
    trouble_type_id: findTrouble('水道トラブル'),
    parent_id: null,
    title: '共用部給水管からの水漏れ修理',
    description: 'パイプレンチとシールテープで接続部を締め直し、水漏れ停止を確認。',
    raw_transcript:
      '共用部の給水管の接続部から水が漏れていたのでパイプレンチで締め直してシールテープを巻き直しました。',
    work_date: '2026-03-08',
    assignee_id: staff1,
    duration_minutes: 60,
    created_by: staff1,
  }).lastInsertRowid as number;
  [findItem('パイプレンチ'), findItem('シールテープ'), findItem('モンキーレンチ')].forEach((id) =>
    insItemLink.run(r5, id)
  );
  insVehicleLink.run(r5, findVehicle('軽バン'));
}

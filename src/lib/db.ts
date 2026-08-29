import { Pool, types } from 'pg';
import bcrypt from 'bcryptjs';

// Keep DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
types.setTypeParser(1082, (val: string) => val);

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __dbReady__: Promise<void> | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'POSTGRES_URL (or DATABASE_URL) environment variable is not set. See README for setup.'
    );
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  return new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

function getPool(): Pool {
  if (!global.__pgPool__) global.__pgPool__ = createPool();
  return global.__pgPool__;
}

async function rawQuery<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

function ensureReady(): Promise<void> {
  if (!global.__dbReady__) {
    global.__dbReady__ = initSchema()
      .then(() => seed())
      .catch((err) => {
        // Allow a retry on the next request instead of caching a failed init forever.
        global.__dbReady__ = undefined;
        throw err;
      });
  }
  return global.__dbReady__;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  await ensureReady();
  return rawQuery<T>(text, params);
}

export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

async function initSchema() {
  await rawQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT,
      icon TEXT NOT NULL DEFAULT '🏢',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS trouble_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📋',
      sort_order INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS item_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('tool','supply')),
      icon TEXT NOT NULL DEFAULT '🧰',
      sort_order INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      category_id INT NOT NULL REFERENCES item_categories(id),
      name TEXT NOT NULL,
      tier INT NOT NULL CHECK (tier IN (1,2,3)),
      icon TEXT NOT NULL DEFAULT '🔧',
      storage_location TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      icon TEXT NOT NULL DEFAULT '🚚',
      plate_no TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS work_records (
      id SERIAL PRIMARY KEY,
      facility_id INT NOT NULL REFERENCES facilities(id),
      trouble_type_id INT REFERENCES trouble_types(id),
      parent_id INT REFERENCES work_records(id),
      title TEXT NOT NULL,
      description TEXT,
      raw_transcript TEXT,
      work_date DATE NOT NULL,
      assignee_id INT REFERENCES users(id),
      duration_minutes INT,
      status TEXT NOT NULL DEFAULT 'done',
      created_by INT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS work_record_photos (
      id SERIAL PRIMARY KEY,
      work_record_id INT NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS work_record_items (
      work_record_id INT NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
      item_id INT NOT NULL REFERENCES items(id),
      quantity INT NOT NULL DEFAULT 1,
      PRIMARY KEY (work_record_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS work_record_vehicles (
      work_record_id INT NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
      vehicle_id INT NOT NULL REFERENCES vehicles(id),
      PRIMARY KEY (work_record_id, vehicle_id)
    );
  `);
}

async function seed() {
  const [{ count: userCount }] = await rawQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM users');
  if (Number(userCount) === 0) {
    const insertUser = async (username: string, name: string, password: string, role: string) =>
      rawQuery(
        'INSERT INTO users (username, name, password_hash, role) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO NOTHING',
        [username, name, bcrypt.hashSync(password, 10), role]
      );
    await insertUser('admin', '管理者', 'admin1234', 'admin');
    await insertUser('sato', '佐藤', 'staff1234', 'staff');
    await insertUser('suzuki', '鈴木', 'staff1234', 'staff');
    await insertUser('takahashi', '高橋', 'staff1234', 'staff');
  }

  const [{ count: facCount }] = await rawQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM facilities');
  if (Number(facCount) === 0) {
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
    for (const [name, type, address, icon, notes] of facilities) {
      await rawQuery(
        'INSERT INTO facilities (name, type, address, icon, notes) VALUES ($1,$2,$3,$4,$5)',
        [name, type, address, icon, notes]
      );
    }
  }

  const [{ count: ttCount }] = await rawQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM trouble_types');
  if (Number(ttCount) === 0) {
    const types_: [string, string, number][] = [
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
    for (const [name, icon, sortOrder] of types_) {
      await rawQuery('INSERT INTO trouble_types (name, icon, sort_order) VALUES ($1,$2,$3)', [
        name,
        icon,
        sortOrder,
      ]);
    }
  }

  const [{ count: catCount }] = await rawQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM item_categories');
  if (Number(catCount) === 0) {
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
      const [{ id: categoryId }] = await rawQuery<{ id: number }>(
        'INSERT INTO item_categories (name, kind, icon, sort_order) VALUES ($1,$2,$3,0) RETURNING id',
        [cat.name, cat.kind, cat.icon]
      );
      for (const [name, tier, icon, loc] of cat.items) {
        await rawQuery(
          'INSERT INTO items (category_id, name, tier, icon, storage_location) VALUES ($1,$2,$3,$4,$5)',
          [categoryId, name, tier, icon, loc]
        );
      }
    }
  }

  const [{ count: vehCount }] = await rawQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM vehicles');
  if (Number(vehCount) === 0) {
    const vehicles: [string, string, string][] = [
      ['高所作業車', 'special', '🚡'],
      ['2トン車', 'truck', '🚛'],
      ['4トン車', 'truck', '🚛'],
      ['軽バン', 'van', '🚐'],
      ['ハイエース', 'van', '🚐'],
      ['軽トラック', 'truck', '🛻'],
      ['除雪車 1号車', 'snow', '🚜'],
      ['除雪車 2号車', 'snow', '🚜'],
    ];
    for (const [name, type, icon] of vehicles) {
      await rawQuery('INSERT INTO vehicles (name, type, icon) VALUES ($1,$2,$3)', [name, type, icon]);
    }
  }

  const [{ count: wrCount }] = await rawQuery<{ count: string }>('SELECT COUNT(*)::int as count FROM work_records');
  if (Number(wrCount) === 0) {
    await seedDemoWorkRecords();
  }
}

async function seedDemoWorkRecords() {
  const facilities = await rawQuery<{ id: number; name: string }>('SELECT id, name FROM facilities');
  const troubleTypes = await rawQuery<{ id: number; name: string }>('SELECT id, name FROM trouble_types');
  const items = await rawQuery<{ id: number; name: string }>('SELECT id, name FROM items');
  const vehicles = await rawQuery<{ id: number; name: string }>('SELECT id, name FROM vehicles');
  const users = await rawQuery<{ id: number }>('SELECT id FROM users ORDER BY id');

  const findFacility = (name: string) => facilities.find((f) => f.name === name)!.id;
  const findTrouble = (name: string) => troubleTypes.find((t) => t.name === name)!.id;
  const findItem = (name: string) => items.find((i) => i.name === name)!.id;
  const findVehicle = (name: string) => vehicles.find((v) => v.name === name)!.id;

  const staff1 = users[1]?.id ?? users[0].id;
  const staff2 = users[2]?.id ?? users[0].id;

  async function insertRecord(rec: {
    facility_id: number;
    trouble_type_id: number;
    parent_id: number | null;
    title: string;
    description: string;
    raw_transcript: string;
    work_date: string;
    assignee_id: number;
    duration_minutes: number;
    created_by: number;
  }): Promise<number> {
    const [{ id }] = await rawQuery<{ id: number }>(
      `INSERT INTO work_records
        (facility_id, trouble_type_id, parent_id, title, description, raw_transcript, work_date, assignee_id, duration_minutes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'done',$10)
       RETURNING id`,
      [
        rec.facility_id,
        rec.trouble_type_id,
        rec.parent_id,
        rec.title,
        rec.description,
        rec.raw_transcript,
        rec.work_date,
        rec.assignee_id,
        rec.duration_minutes,
        rec.created_by,
      ]
    );
    return id;
  }
  async function linkItem(recordId: number, itemId: number) {
    await rawQuery('INSERT INTO work_record_items (work_record_id, item_id, quantity) VALUES ($1,$2,1)', [
      recordId,
      itemId,
    ]);
  }
  async function linkVehicle(recordId: number, vehicleId: number) {
    await rawQuery('INSERT INTO work_record_vehicles (work_record_id, vehicle_id) VALUES ($1,$2)', [
      recordId,
      vehicleId,
    ]);
  }

  const r1 = await insertRecord({
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
  });
  for (const name of ['常温合材（補修材）', 'コテ', 'ほうき', 'タンパー（転圧機）']) {
    await linkItem(r1, findItem(name));
  }
  await linkVehicle(r1, findVehicle('軽トラック'));

  const r2 = await insertRecord({
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
  });
  for (const name of ['常温合材（補修材）', 'コテ']) {
    await linkItem(r2, findItem(name));
  }
  await linkVehicle(r2, findVehicle('軽バン'));

  const r3 = await insertRecord({
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
  });
  for (const name of ['スノーダンプ', '角スコップ', '融雪剤']) {
    await linkItem(r3, findItem(name));
  }
  await linkVehicle(r3, findVehicle('除雪車 1号車'));

  const r4 = await insertRecord({
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
  });
  for (const name of ['刈払機', '鎌']) {
    await linkItem(r4, findItem(name));
  }
  await linkVehicle(r4, findVehicle('軽トラック'));

  const r5 = await insertRecord({
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
  });
  for (const name of ['パイプレンチ', 'シールテープ', 'モンキーレンチ']) {
    await linkItem(r5, findItem(name));
  }
  await linkVehicle(r5, findVehicle('軽バン'));
}

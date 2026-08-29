import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query, queryOne } from '@/lib/db';
import { tierLabel } from '@/lib/labels';

export default async function RecordDetailPage({ params }: { params: { id: string } }) {
  const recordId = Number(params.id);
  const record = await queryOne<any>(
    `SELECT wr.*, f.id as facility_id, f.name as facility_name, f.icon as facility_icon,
            tt.name as trouble_name, tt.icon as trouble_icon, u.name as assignee_name,
            p.id as parent_record_id, p.title as parent_title
     FROM work_records wr
     LEFT JOIN facilities f ON f.id = wr.facility_id
     LEFT JOIN trouble_types tt ON tt.id = wr.trouble_type_id
     LEFT JOIN users u ON u.id = wr.assignee_id
     LEFT JOIN work_records p ON p.id = wr.parent_id
     WHERE wr.id = $1`,
    [recordId]
  );

  if (!record) notFound();

  const [items, vehicles, photos, children] = await Promise.all([
    query<any>(
      `SELECT i.id, i.name, i.icon, i.tier, c.name as category_name, c.kind as category_kind
       FROM work_record_items wri JOIN items i ON i.id = wri.item_id
       JOIN item_categories c ON c.id = i.category_id
       WHERE wri.work_record_id = $1
       ORDER BY i.tier`,
      [recordId]
    ),
    query<any>(
      `SELECT v.id, v.name, v.icon FROM work_record_vehicles wrv JOIN vehicles v ON v.id = wrv.vehicle_id
       WHERE wrv.work_record_id = $1`,
      [recordId]
    ),
    query<{ id: number; url: string }>(
      'SELECT id, url FROM work_record_photos WHERE work_record_id = $1',
      [recordId]
    ),
    query<any>(
      'SELECT id, title, work_date FROM work_records WHERE parent_id = $1 ORDER BY work_date DESC',
      [recordId]
    ),
  ]);

  const itemsByTier = new Map<number, any[]>();
  for (const it of items) {
    if (!itemsByTier.has(it.tier)) itemsByTier.set(it.tier, []);
    itemsByTier.get(it.tier)!.push(it);
  }

  return (
    <div className="py-4">
      <Link href={`/facilities/${record.facility_id}`} className="text-brand-700 font-bold text-lg">
        ← {record.facility_name} の履歴へ戻る
      </Link>

      <div className="card p-5 mt-3 mb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-3xl">{record.trouble_icon || '📋'}</span>
              <h1 className="text-2xl font-bold">{record.title}</h1>
            </div>
            <p className="text-lg text-gray-500 mt-1">
              {record.facility_icon} {record.facility_name}
              {record.trouble_name ? ` ／ ${record.trouble_name}` : ''}
            </p>
          </div>
          <Link href={`/records/${record.id}/edit`} className="tag-pill bg-brand-600 text-white text-lg px-5 py-2">
            ✏️ 修正する
          </Link>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-lg mt-4">
          <span>📅 作業日：{record.work_date}</span>
          {record.assignee_name && <span>👤 担当：{record.assignee_name}</span>}
          {record.duration_minutes != null && <span>⏱ 作業時間：約{record.duration_minutes}分</span>}
        </div>

        {record.parent_record_id && (
          <p className="mt-2 text-base">
            🔗 関連元：
            <Link href={`/records/${record.parent_record_id}`} className="text-brand-700 font-bold underline ml-1">
              {record.parent_title}
            </Link>
          </p>
        )}

        {record.description && (
          <div className="mt-4">
            <h2 className="font-bold text-lg mb-1">対処方法・メモ</h2>
            <p className="text-lg whitespace-pre-wrap">{record.description}</p>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="font-bold text-xl mb-3">📷 写真</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt="作業写真"
                className="rounded-xl border-2 border-gray-200 aspect-square object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="card p-5 mb-5">
        <h2 className="font-bold text-xl mb-3">🧰 使った道具・備品</h2>
        {items.length === 0 && vehicles.length === 0 ? (
          <p className="text-lg text-gray-400">記録なし</p>
        ) : (
          <>
            {[1, 2, 3].map((tier) => {
              const list = itemsByTier.get(tier) || [];
              if (list.length === 0) return null;
              return (
                <div key={tier} className="mb-3">
                  <h3 className="font-bold text-lg mb-2">{tierLabel(list[0].category_kind, tier)}</h3>
                  <div className="flex flex-wrap gap-2">
                    {list.map((it) => (
                      <span key={it.id} className="tag-pill bg-gray-100">
                        {it.icon} {it.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {vehicles.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-2">🚚 使った車両</h3>
                <div className="flex flex-wrap gap-2">
                  {vehicles.map((v) => (
                    <span key={v.id} className="tag-pill bg-gray-100">
                      {v.icon} {v.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {children.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-xl mb-3">🌳 関連する作業（類似作業）</h2>
          <div className="space-y-2">
            {children.map((c) => (
              <Link key={c.id} href={`/records/${c.id}`} className="card block p-3">
                <span className="font-bold text-lg">{c.title}</span>
                <span className="block text-base text-gray-500">{c.work_date}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

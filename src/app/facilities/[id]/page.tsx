import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { FACILITY_TYPE_LABELS } from '@/lib/labels';
import RecordTree, { type RecordNode } from '@/components/RecordTree';

type Facility = { id: number; name: string; type: string; address: string; icon: string; notes: string };
type RecordRow = {
  id: number;
  parent_id: number | null;
  title: string;
  description: string | null;
  work_date: string;
  duration_minutes: number | null;
  trouble_name: string | null;
  trouble_icon: string | null;
  assignee_name: string | null;
  photo_count: number;
};

export default function FacilityDetailPage({ params }: { params: { id: string } }) {
  const db = getDb();
  const facility = db
    .prepare('SELECT id, name, type, address, icon, notes FROM facilities WHERE id = ?')
    .get(params.id) as Facility | undefined;

  if (!facility) notFound();

  const rows = db
    .prepare(
      `SELECT wr.id, wr.parent_id, wr.title, wr.description, wr.work_date, wr.duration_minutes,
              tt.name as trouble_name, tt.icon as trouble_icon,
              u.name as assignee_name,
              (SELECT COUNT(*) FROM work_record_photos p WHERE p.work_record_id = wr.id) as photo_count
       FROM work_records wr
       LEFT JOIN trouble_types tt ON tt.id = wr.trouble_type_id
       LEFT JOIN users u ON u.id = wr.assignee_id
       WHERE wr.facility_id = ?
       ORDER BY wr.work_date DESC`
    )
    .all(facility.id) as RecordRow[];

  const idsInFacility = new Set(rows.map((r) => r.id));
  const byParent = new Map<number | null, RecordRow[]>();
  const roots: RecordRow[] = [];
  for (const r of rows) {
    // A record whose parent lives at a different facility has no local
    // parent to nest under, so it is shown as a root here too.
    if (r.parent_id === null || !idsInFacility.has(r.parent_id)) {
      roots.push(r);
      continue;
    }
    const key = r.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(r);
  }

  function buildTree(parentId: number | null): RecordNode[] {
    const list = parentId === null ? roots : byParent.get(parentId) || [];
    return list.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      workDate: r.work_date,
      durationMinutes: r.duration_minutes,
      troubleName: r.trouble_name,
      troubleIcon: r.trouble_icon,
      assigneeName: r.assignee_name,
      photoCount: r.photo_count,
      children: buildTree(r.id),
    }));
  }

  const tree = buildTree(null);
  const meta = FACILITY_TYPE_LABELS[facility.type] ?? { label: facility.type, icon: '🏢' };

  return (
    <div className="py-4">
      <Link href="/facilities" className="text-brand-700 font-bold text-lg">
        ← 施設一覧へ戻る
      </Link>

      <div className="card p-5 mt-3 mb-6 flex items-center gap-4">
        <span className="text-5xl">{facility.icon}</span>
        <div>
          <h1 className="text-2xl font-bold">{facility.name}</h1>
          <p className="text-lg text-gray-500">
            {meta.icon} {meta.label} ／ {facility.address}
          </p>
        </div>
        <Link
          href={`/register?facility_id=${facility.id}`}
          className="ml-auto big-btn bg-brand-600 text-white text-lg px-6 py-3"
        >
          📝 この施設で登録
        </Link>
      </div>

      <h2 className="text-xl font-bold mb-3">作業履歴（関連する作業はツリーで表示）</h2>
      {tree.length === 0 ? (
        <p className="text-lg text-gray-500">まだ作業記録がありません。</p>
      ) : (
        <RecordTree nodes={tree} />
      )}
    </div>
  );
}

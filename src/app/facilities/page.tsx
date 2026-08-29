import Link from 'next/link';
import { getDb } from '@/lib/db';
import { FACILITY_TYPE_LABELS } from '@/lib/labels';

type Facility = { id: number; name: string; type: string; address: string; icon: string };

export default function FacilitiesPage() {
  const db = getDb();
  const facilities = db
    .prepare('SELECT id, name, type, address, icon FROM facilities ORDER BY type, id')
    .all() as Facility[];

  const grouped = new Map<string, Facility[]>();
  for (const f of facilities) {
    if (!grouped.has(f.type)) grouped.set(f.type, []);
    grouped.get(f.type)!.push(f);
  }

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-1">🏢 施設一覧</h1>
      <p className="text-lg text-gray-500 mb-6">施設をタップすると過去の作業履歴が見られます</p>

      {[...grouped.entries()].map(([type, list]) => {
        const meta = FACILITY_TYPE_LABELS[type] ?? { label: type, icon: '🏢' };
        return (
          <div key={type} className="mb-8">
            <h2 className="text-xl font-bold mb-3">
              {meta.icon} {meta.label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {list.map((f) => (
                <Link key={f.id} href={`/facilities/${f.id}`} className="icon-tile">
                  <span className="text-4xl">{f.icon}</span>
                  <span>{f.name}</span>
                  <span className="text-sm font-normal text-gray-400">{f.address}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

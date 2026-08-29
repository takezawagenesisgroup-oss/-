import Link from 'next/link';
import { query } from '@/lib/db';
import { FACILITY_TYPE_LABELS, tierLabel } from '@/lib/labels';
import { getRecommendation } from '@/lib/recommend';

type Facility = { id: number; name: string; type: string; icon: string };
type TroubleType = { id: number; name: string; icon: string };

function buildHref(params: { facility_id?: number | null; trouble_type_id?: number | null }) {
  const qs = new URLSearchParams();
  if (params.facility_id) qs.set('facility_id', String(params.facility_id));
  if (params.trouble_type_id) qs.set('trouble_type_id', String(params.trouble_type_id));
  const s = qs.toString();
  return `/search${s ? `?${s}` : ''}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { facility_id?: string; trouble_type_id?: string };
}) {
  const [facilities, troubleTypes] = await Promise.all([
    query<Facility>('SELECT id, name, type, icon FROM facilities ORDER BY type, id'),
    query<TroubleType>('SELECT id, name, icon FROM trouble_types ORDER BY sort_order, id'),
  ]);

  const facilityId = searchParams.facility_id ? Number(searchParams.facility_id) : null;
  const troubleTypeId = searchParams.trouble_type_id ? Number(searchParams.trouble_type_id) : null;

  const groupedFacilities = new Map<string, Facility[]>();
  for (const f of facilities) {
    if (!groupedFacilities.has(f.type)) groupedFacilities.set(f.type, []);
    groupedFacilities.get(f.type)!.push(f);
  }

  const result = troubleTypeId ? await getRecommendation(troubleTypeId, facilityId) : null;

  const itemsByTier = new Map<number, any[]>();
  if (result) {
    for (const it of result.items) {
      if (!itemsByTier.has(it.tier)) itemsByTier.set(it.tier, []);
      itemsByTier.get(it.tier)!.push(it);
    }
  }

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-1">🔍 検索</h1>
      <p className="text-lg text-gray-500 mb-6">
        施設と作業内容を選ぶと、必要な道具・車両の一覧が出てきます。
      </p>

      <div className="card p-5 mb-5">
        <h2 className="text-xl font-bold mb-3">施設（任意で絞り込み）</h2>
        {[...groupedFacilities.entries()].map(([type, list]) => {
          const meta = FACILITY_TYPE_LABELS[type] ?? { label: type, icon: '🏢' };
          return (
            <div key={type} className="mb-4">
              <h3 className="font-bold text-lg mb-2">
                {meta.icon} {meta.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {list.map((f) => (
                  <Link
                    key={f.id}
                    href={buildHref({
                      facility_id: facilityId === f.id ? null : f.id,
                      trouble_type_id: troubleTypeId,
                    })}
                    className={`icon-tile ${facilityId === f.id ? 'selected' : ''}`}
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <span className="text-base">{f.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5 mb-6">
        <h2 className="text-xl font-bold mb-3">② どんな作業ですか？</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {troubleTypes.map((t) => (
            <Link
              key={t.id}
              href={buildHref({ facility_id: facilityId, trouble_type_id: t.id })}
              className={`icon-tile ${troubleTypeId === t.id ? 'selected' : ''}`}
            >
              <span className="text-3xl">{t.icon}</span>
              <span>{t.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {!troubleTypeId && (
        <p className="text-lg text-gray-400 text-center">
          「どんな作業ですか？」から選ぶと結果が表示されます。
        </p>
      )}

      {result && (
        <div>
          {result.items.length === 0 ? (
            <p className="text-lg text-gray-500">
              まだこの作業の記録がありません。作業後に「登録」から記録してください。
            </p>
          ) : (
            <>
              {result.matchLevel !== 'facility' && (
                <p className="text-base text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4">
                  {result.matchLevel === 'facility_type'
                    ? 'この施設そのものの記録がないため、同じ種類の施設の実績から推薦しています。'
                    : '施設をまだ選んでいないため、この作業内容の全施設の実績から推薦しています。'}
                </p>
              )}

              <div className="card p-5 mb-5 bg-brand-50 border-brand-200">
                <h2 className="text-2xl font-bold mb-4">🎒 持って行くものリスト</h2>
                {[1, 2, 3].map((tier) => {
                  const list = itemsByTier.get(tier) || [];
                  if (list.length === 0) return null;
                  return (
                    <div key={tier} className="mb-4">
                      <h3 className="font-bold text-lg mb-2">
                        {tierLabel(list[0].category_kind, tier)}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {list.map((it: any) => (
                          <div key={it.id} className="icon-tile !border-brand-300 !bg-white">
                            <span className="text-3xl">{it.icon}</span>
                            <span>{it.name}</span>
                            <span className="text-xs font-normal text-gray-400">
                              過去{it.count}回使用
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {result.vehicles.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">🚚 必要な車両</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {result.vehicles.map((v) => (
                        <div key={v.id} className="icon-tile !border-brand-300 !bg-white">
                          <span className="text-3xl">{v.icon}</span>
                          <span>{v.name}</span>
                          <span className="text-xs font-normal text-gray-400">
                            過去{v.count}回使用
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold mb-3">参考にした過去の作業</h2>
              <div className="space-y-2">
                {result.records.map((r) => (
                  <Link key={r.id} href={`/records/${r.id}`} className="card block p-4">
                    <span className="font-bold text-lg">{r.title}</span>
                    <span className="block text-base text-gray-500">
                      {r.facility_name} ／ {r.work_date}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

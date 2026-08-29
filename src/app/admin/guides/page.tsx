import { query } from '@/lib/db';
import { FACILITY_TYPE_LABELS } from '@/lib/labels';
import { addGuide, deleteGuide } from './actions';

export default async function AdminGuidesPage() {
  const [guides, troubleTypes, items, vehicles] = await Promise.all([
    query<{
      id: number;
      facility_type: string | null;
      title: string;
      procedure: string;
      caution_note: string | null;
      est_duration_min: number | null;
      est_duration_max: number | null;
      trouble_name: string;
      trouble_icon: string;
    }>(
      `SELECT g.id, g.facility_type, g.title, g.procedure, g.caution_note, g.est_duration_min, g.est_duration_max,
              tt.name as trouble_name, tt.icon as trouble_icon
       FROM reference_guides g JOIN trouble_types tt ON tt.id = g.trouble_type_id
       ORDER BY g.facility_type NULLS LAST, tt.sort_order, g.id`
    ),
    query<{ id: number; name: string; icon: string }>('SELECT id, name, icon FROM trouble_types ORDER BY sort_order, id'),
    query<{ id: number; name: string; icon: string; category_name: string }>(
      `SELECT i.id, i.name, i.icon, c.name as category_name FROM items i
       JOIN item_categories c ON c.id = i.category_id ORDER BY c.sort_order, i.tier, i.id`
    ),
    query<{ id: number; name: string; icon: string }>('SELECT id, name, icon FROM vehicles ORDER BY id'),
  ]);

  const guideItems = await query<{ reference_guide_id: number; name: string; icon: string }>(
    `SELECT gi.reference_guide_id, i.name, i.icon FROM reference_guide_items gi JOIN items i ON i.id = gi.item_id`
  );
  const guideVehicles = await query<{ reference_guide_id: number; name: string; icon: string }>(
    `SELECT gv.reference_guide_id, v.name, v.icon FROM reference_guide_vehicles gv JOIN vehicles v ON v.id = gv.vehicle_id`
  );

  const itemsByCategory = new Map<string, typeof items>();
  for (const it of items) {
    if (!itemsByCategory.has(it.category_name)) itemsByCategory.set(it.category_name, []);
    itemsByCategory.get(it.category_name)!.push(it);
  }

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-2">📖 一般知見（参考ガイド）管理</h1>
      <p className="text-lg text-gray-500 mb-6">
        社内の実績記録がまだない組み合わせで、検索画面に表示される一般的な参考情報です。実績が蓄積されたら、そちらが優先して表示されます。
      </p>

      <div className="space-y-3 mb-8">
        {guides.map((g) => {
          const meta = g.facility_type ? FACILITY_TYPE_LABELS[g.facility_type] : null;
          return (
            <div key={g.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="tag-pill bg-gray-100 mr-2">
                    {meta ? `${meta.icon} ${meta.label}` : '共通（全施設タイプ）'}
                  </span>
                  <span className="tag-pill bg-brand-100">
                    {g.trouble_icon} {g.trouble_name}
                  </span>
                  <p className="font-bold text-lg mt-2">{g.title}</p>
                  <p className="text-base text-gray-600 mt-1 whitespace-pre-wrap">{g.procedure}</p>
                  {g.caution_note && <p className="text-base text-amber-700 mt-1">⚠️ {g.caution_note}</p>}
                  {(g.est_duration_min || g.est_duration_max) && (
                    <p className="text-base text-gray-500 mt-1">
                      ⏱ 目安：約{g.est_duration_min}〜{g.est_duration_max}分
                    </p>
                  )}
                  <p className="text-base text-gray-500 mt-1">
                    🧰{' '}
                    {guideItems
                      .filter((gi) => gi.reference_guide_id === g.id)
                      .map((gi) => `${gi.icon}${gi.name}`)
                      .join('　')}
                  </p>
                  {guideVehicles.some((gv) => gv.reference_guide_id === g.id) && (
                    <p className="text-base text-gray-500">
                      🚚{' '}
                      {guideVehicles
                        .filter((gv) => gv.reference_guide_id === g.id)
                        .map((gv) => `${gv.icon}${gv.name}`)
                        .join('　')}
                    </p>
                  )}
                </div>
                <form action={deleteGuide}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-red-600 font-bold shrink-0">削除</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-bold mb-3">参考ガイドを追加</h2>
        <form action={addGuide} className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-sm font-bold">対象の施設タイプ</label>
              <select name="facility_type" className="border-2 border-gray-300 rounded-lg px-3 py-2">
                <option value="">共通（全施設タイプ）</option>
                {Object.entries(FACILITY_TYPE_LABELS).map(([type, meta]) => (
                  <option key={type} value={type}>
                    {meta.icon} {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold">作業内容</label>
              <select name="trouble_type_id" className="border-2 border-gray-300 rounded-lg px-3 py-2">
                {troubleTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold">目安時間（分）</label>
              <div className="flex items-center gap-2">
                <input name="est_duration_min" type="number" min={0} className="border-2 border-gray-300 rounded-lg px-3 py-2 w-24" />
                〜
                <input name="est_duration_max" type="number" min={0} className="border-2 border-gray-300 rounded-lg px-3 py-2 w-24" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold">タイトル</label>
            <input name="title" required className="w-full border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">対処方法</label>
            <textarea name="procedure" required rows={3} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">注意事項（任意）</label>
            <textarea name="caution_note" rows={2} className="w-full border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>

          <div>
            <p className="text-sm font-bold mb-2">必要な道具・備品</p>
            {[...itemsByCategory.entries()].map(([catName, list]) => (
              <div key={catName} className="mb-2">
                <p className="text-sm text-gray-500">{catName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {list.map((it) => (
                    <label key={it.id} className="text-base flex items-center gap-1">
                      <input type="checkbox" name="item_ids" value={it.id} /> {it.icon} {it.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm font-bold mb-2">必要な車両</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {vehicles.map((v) => (
                <label key={v.id} className="text-base flex items-center gap-1">
                  <input type="checkbox" name="vehicle_ids" value={v.id} /> {v.icon} {v.name}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="tag-pill bg-brand-600 text-white px-4 py-2">追加</button>
        </form>
      </div>
    </div>
  );
}

import { query } from '@/lib/db';
import { tierLabel } from '@/lib/labels';
import { addCategory, addItem, deleteItem } from './actions';

export default async function AdminItemsPage() {
  const categories = await query<{ id: number; name: string; kind: 'tool' | 'supply'; icon: string }>(
    'SELECT id, name, kind, icon FROM item_categories ORDER BY sort_order, id'
  );
  const items = await query<{
    id: number;
    category_id: number;
    name: string;
    tier: number;
    icon: string;
    storage_location: string | null;
  }>('SELECT id, category_id, name, tier, icon, storage_location FROM items ORDER BY category_id, tier, id');

  const itemsByCategory = new Map<number, typeof items>();
  for (const it of items) {
    if (!itemsByCategory.has(it.category_id)) itemsByCategory.set(it.category_id, []);
    itemsByCategory.get(it.category_id)!.push(it);
  }

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">⚙️ 道具・備品マスタ管理</h1>

      <div className="card p-5 mb-6">
        <h2 className="text-xl font-bold mb-3">カテゴリーを追加</h2>
        <form action={addCategory} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-bold">カテゴリー名</label>
            <input name="name" required className="border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">種別</label>
            <select name="kind" className="border-2 border-gray-300 rounded-lg px-3 py-2">
              <option value="tool">工具（保管3段階）</option>
              <option value="supply">備品（使用頻度3段階）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold">アイコン(絵文字)</label>
            <input name="icon" defaultValue="🧰" className="border-2 border-gray-300 rounded-lg px-3 py-2 w-20" />
          </div>
          <button type="submit" className="tag-pill bg-brand-600 text-white px-4 py-2">追加</button>
        </form>
      </div>

      {categories.map((cat) => (
        <div key={cat.id} className="card p-5 mb-5">
          <h2 className="text-xl font-bold mb-3">
            {cat.icon} {cat.name}{' '}
            <span className="text-base font-normal text-gray-400">
              （{cat.kind === 'tool' ? '工具・保管3段階' : '備品・使用頻度3段階'}）
            </span>
          </h2>

          <table className="w-full text-left mb-4">
            <thead>
              <tr className="text-base text-gray-500">
                <th className="py-1">アイコン</th>
                <th>名前</th>
                <th>段階</th>
                <th>保管場所</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(itemsByCategory.get(cat.id) || []).map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="py-2 text-2xl">{it.icon}</td>
                  <td className="font-bold">{it.name}</td>
                  <td>{tierLabel(cat.kind, it.tier)}</td>
                  <td className="text-gray-500">{it.storage_location}</td>
                  <td>
                    <form action={deleteItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="text-red-600 font-bold">削除</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form action={addItem} className="flex flex-wrap gap-3 items-end">
            <input type="hidden" name="category_id" value={cat.id} />
            <div>
              <label className="block text-sm font-bold">名前</label>
              <input name="name" required className="border-2 border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-bold">段階</label>
              <select name="tier" className="border-2 border-gray-300 rounded-lg px-3 py-2">
                <option value="1">{tierLabel(cat.kind, 1)}</option>
                <option value="2">{tierLabel(cat.kind, 2)}</option>
                <option value="3">{tierLabel(cat.kind, 3)}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold">アイコン</label>
              <input name="icon" defaultValue="🔧" className="border-2 border-gray-300 rounded-lg px-3 py-2 w-20" />
            </div>
            <div>
              <label className="block text-sm font-bold">保管場所</label>
              <input name="storage_location" className="border-2 border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <button type="submit" className="tag-pill bg-brand-600 text-white px-4 py-2">追加</button>
          </form>
        </div>
      ))}
    </div>
  );
}

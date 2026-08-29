import { query } from '@/lib/db';
import { addVehicle, deleteVehicle } from './actions';

export default async function AdminVehiclesPage() {
  const vehicles = await query<{
    id: number;
    name: string;
    type: string | null;
    icon: string;
    plate_no: string | null;
  }>('SELECT id, name, type, icon, plate_no FROM vehicles ORDER BY id');

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">🚚 車両マスタ管理</h1>

      <div className="card p-5 mb-6">
        <table className="w-full text-left">
          <thead>
            <tr className="text-base text-gray-500">
              <th className="py-1">アイコン</th>
              <th>車両名</th>
              <th>種別</th>
              <th>ナンバー</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="py-2 text-2xl">{v.icon}</td>
                <td className="font-bold">{v.name}</td>
                <td className="text-gray-500">{v.type}</td>
                <td className="text-gray-500">{v.plate_no}</td>
                <td>
                  <form action={deleteVehicle}>
                    <input type="hidden" name="id" value={v.id} />
                    <button className="text-red-600 font-bold">削除</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-bold mb-3">車両を追加</h2>
        <form action={addVehicle} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-bold">車両名</label>
            <input name="name" required className="border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">種別</label>
            <input name="type" placeholder="例：truck / van / snow" className="border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">アイコン</label>
            <input name="icon" defaultValue="🚚" className="border-2 border-gray-300 rounded-lg px-3 py-2 w-20" />
          </div>
          <div>
            <label className="block text-sm font-bold">ナンバー（任意）</label>
            <input name="plate_no" className="border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="tag-pill bg-brand-600 text-white px-4 py-2">追加</button>
        </form>
      </div>
    </div>
  );
}

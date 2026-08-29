import { query } from '@/lib/db';
import { addUser, toggleActive } from './actions';

export default async function AdminUsersPage() {
  const users = await query<{ id: number; username: string; name: string; role: string; active: boolean }>(
    'SELECT id, username, name, role, active FROM users ORDER BY id'
  );

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-2">👤 アカウント管理</h1>
      <p className="text-lg text-gray-500 mb-6">利用者数の目安：最大20名程度</p>

      <div className="card p-5 mb-6">
        <table className="w-full text-left">
          <thead>
            <tr className="text-base text-gray-500">
              <th className="py-1">名前</th>
              <th>ユーザー名</th>
              <th>権限</th>
              <th>状態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2 font-bold">{u.name}</td>
                <td className="text-gray-500">{u.username}</td>
                <td>{u.role === 'admin' ? '管理者' : '担当者'}</td>
                <td>{u.active ? '有効' : '停止中'}</td>
                <td>
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-brand-700 font-bold">
                      {u.active ? '停止する' : '再開する'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-bold mb-3">アカウントを追加</h2>
        <form action={addUser} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-bold">名前</label>
            <input name="name" required className="border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">ユーザー名（ログインID）</label>
            <input name="username" required className="border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">初期パスワード</label>
            <input name="password" required minLength={4} className="border-2 border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold">権限</label>
            <select name="role" className="border-2 border-gray-300 rounded-lg px-3 py-2">
              <option value="staff">担当者</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <button type="submit" className="tag-pill bg-brand-600 text-white px-4 py-2">追加</button>
        </form>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link href="/admin/items" className="tag-pill bg-gray-200">🧰 道具・備品</Link>
        <Link href="/admin/vehicles" className="tag-pill bg-gray-200">🚚 車両</Link>
        <Link href="/admin/users" className="tag-pill bg-gray-200">👤 アカウント</Link>
      </div>
      {children}
    </div>
  );
}

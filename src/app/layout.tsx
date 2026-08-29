import type { Metadata } from 'next';
import './globals.css';
import { getSession } from '@/lib/auth';
import HeaderNav from '@/components/HeaderNav';

export const metadata: Metadata = {
  title: '設備・備品管理ツール',
  description: 'サービスメンテナンス部 設備・工具・作業記録管理システム',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="ja">
      <body>
        {session && <HeaderNav name={session.name} role={session.role} />}
        <main className="max-w-5xl mx-auto px-4 pb-16 pt-4">{children}</main>
      </body>
    </html>
  );
}

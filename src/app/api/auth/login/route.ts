import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryOne } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'ユーザー名とパスワードを入力してください' }, { status: 400 });
  }

  const user = await queryOne<{
    id: number;
    username: string;
    name: string;
    password_hash: string;
    role: 'admin' | 'staff';
  }>('SELECT * FROM users WHERE username = $1 AND active = true', [username]);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: 'ユーザー名またはパスワードが違います' }, { status: 401 });
  }

  await createSessionCookie({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ ok: true });
}

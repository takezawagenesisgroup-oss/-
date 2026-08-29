'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

export async function addUser(formData: FormData) {
  const username = String(formData.get('username') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || 'staff');
  if (!username || !name || password.length < 4) return;

  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return;

  db.prepare('INSERT INTO users (username, name, password_hash, role) VALUES (?,?,?,?)').run(
    username,
    name,
    bcrypt.hashSync(password, 10),
    role
  );
  revalidatePath('/admin/users');
}

export async function toggleActive(formData: FormData) {
  const id = Number(formData.get('id'));
  const db = getDb();
  const user = db.prepare('SELECT active FROM users WHERE id = ?').get(id) as { active: number };
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(user.active ? 0 : 1, id);
  revalidatePath('/admin/users');
}

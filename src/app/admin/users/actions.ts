'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';

export async function addUser(formData: FormData) {
  const username = String(formData.get('username') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || 'staff');
  if (!username || !name || password.length < 4) return;

  const exists = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
  if (exists) return;

  await query('INSERT INTO users (username, name, password_hash, role) VALUES ($1,$2,$3,$4)', [
    username,
    name,
    bcrypt.hashSync(password, 10),
    role,
  ]);
  revalidatePath('/admin/users');
}

export async function toggleActive(formData: FormData) {
  const id = Number(formData.get('id'));
  await query('UPDATE users SET active = NOT active WHERE id = $1', [id]);
  revalidatePath('/admin/users');
}

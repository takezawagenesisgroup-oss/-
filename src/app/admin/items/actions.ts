'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';

export async function addCategory(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const kind = String(formData.get('kind') || 'tool');
  const icon = String(formData.get('icon') || '🧰').trim() || '🧰';
  if (!name) return;
  const db = getDb();
  db.prepare('INSERT INTO item_categories (name, kind, icon, sort_order) VALUES (?,?,?,0)').run(
    name,
    kind,
    icon
  );
  revalidatePath('/admin/items');
}

export async function addItem(formData: FormData) {
  const category_id = Number(formData.get('category_id'));
  const name = String(formData.get('name') || '').trim();
  const tier = Number(formData.get('tier'));
  const icon = String(formData.get('icon') || '🔧').trim() || '🔧';
  const storage_location = String(formData.get('storage_location') || '').trim();
  if (!category_id || !name || !tier) return;
  const db = getDb();
  db.prepare(
    'INSERT INTO items (category_id, name, tier, icon, storage_location) VALUES (?,?,?,?,?)'
  ).run(category_id, name, tier, icon, storage_location || null);
  revalidatePath('/admin/items');
}

export async function deleteItem(formData: FormData) {
  const id = Number(formData.get('id'));
  const db = getDb();
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  revalidatePath('/admin/items');
}

'use server';

import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';

export async function addCategory(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const kind = String(formData.get('kind') || 'tool');
  const icon = String(formData.get('icon') || '🧰').trim() || '🧰';
  if (!name) return;
  await query('INSERT INTO item_categories (name, kind, icon, sort_order) VALUES ($1,$2,$3,0)', [
    name,
    kind,
    icon,
  ]);
  revalidatePath('/admin/items');
}

export async function addItem(formData: FormData) {
  const category_id = Number(formData.get('category_id'));
  const name = String(formData.get('name') || '').trim();
  const tier = Number(formData.get('tier'));
  const icon = String(formData.get('icon') || '🔧').trim() || '🔧';
  const storage_location = String(formData.get('storage_location') || '').trim();
  if (!category_id || !name || !tier) return;
  await query(
    'INSERT INTO items (category_id, name, tier, icon, storage_location) VALUES ($1,$2,$3,$4,$5)',
    [category_id, name, tier, icon, storage_location || null]
  );
  revalidatePath('/admin/items');
}

export async function deleteItem(formData: FormData) {
  const id = Number(formData.get('id'));
  await query('DELETE FROM items WHERE id = $1', [id]);
  revalidatePath('/admin/items');
}

'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';

export async function addVehicle(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const type = String(formData.get('type') || '').trim();
  const icon = String(formData.get('icon') || '🚚').trim() || '🚚';
  const plate_no = String(formData.get('plate_no') || '').trim();
  if (!name) return;
  const db = getDb();
  db.prepare('INSERT INTO vehicles (name, type, icon, plate_no) VALUES (?,?,?,?)').run(
    name,
    type || null,
    icon,
    plate_no || null
  );
  revalidatePath('/admin/vehicles');
}

export async function deleteVehicle(formData: FormData) {
  const id = Number(formData.get('id'));
  const db = getDb();
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
  revalidatePath('/admin/vehicles');
}

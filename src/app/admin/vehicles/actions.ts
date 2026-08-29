'use server';

import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';

export async function addVehicle(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const type = String(formData.get('type') || '').trim();
  const icon = String(formData.get('icon') || '🚚').trim() || '🚚';
  const plate_no = String(formData.get('plate_no') || '').trim();
  if (!name) return;
  await query('INSERT INTO vehicles (name, type, icon, plate_no) VALUES ($1,$2,$3,$4)', [
    name,
    type || null,
    icon,
    plate_no || null,
  ]);
  revalidatePath('/admin/vehicles');
}

export async function deleteVehicle(formData: FormData) {
  const id = Number(formData.get('id'));
  await query('DELETE FROM vehicles WHERE id = $1', [id]);
  revalidatePath('/admin/vehicles');
}

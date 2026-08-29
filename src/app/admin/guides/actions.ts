'use server';

import { revalidatePath } from 'next/cache';
import { query, queryOne } from '@/lib/db';

export async function addGuide(formData: FormData) {
  const facilityType = String(formData.get('facility_type') || '').trim();
  const troubleTypeId = Number(formData.get('trouble_type_id'));
  const title = String(formData.get('title') || '').trim();
  const procedure = String(formData.get('procedure') || '').trim();
  const cautionNote = String(formData.get('caution_note') || '').trim();
  const min = formData.get('est_duration_min') ? Number(formData.get('est_duration_min')) : null;
  const max = formData.get('est_duration_max') ? Number(formData.get('est_duration_max')) : null;
  const itemIds = formData.getAll('item_ids').map(Number).filter(Boolean);
  const vehicleIds = formData.getAll('vehicle_ids').map(Number).filter(Boolean);

  if (!troubleTypeId || !title || !procedure) return;

  const guide = await queryOne<{ id: number }>(
    `INSERT INTO reference_guides (facility_type, trouble_type_id, title, procedure, caution_note, est_duration_min, est_duration_max)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [facilityType || null, troubleTypeId, title, procedure, cautionNote || null, min, max]
  );
  const guideId = guide!.id;

  for (const itemId of itemIds) {
    await query('INSERT INTO reference_guide_items (reference_guide_id, item_id) VALUES ($1,$2)', [
      guideId,
      itemId,
    ]);
  }
  for (const vehicleId of vehicleIds) {
    await query('INSERT INTO reference_guide_vehicles (reference_guide_id, vehicle_id) VALUES ($1,$2)', [
      guideId,
      vehicleId,
    ]);
  }

  revalidatePath('/admin/guides');
}

export async function deleteGuide(formData: FormData) {
  const id = Number(formData.get('id'));
  await query('DELETE FROM reference_guides WHERE id = $1', [id]);
  revalidatePath('/admin/guides');
}

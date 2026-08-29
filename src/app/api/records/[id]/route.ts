import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { saveUploadedPhoto } from '@/lib/uploads';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const recordId = Number(params.id);
  const record = await queryOne(
    `SELECT wr.*, f.name as facility_name, tt.name as trouble_name
     FROM work_records wr
     LEFT JOIN facilities f ON f.id = wr.facility_id
     LEFT JOIN trouble_types tt ON tt.id = wr.trouble_type_id
     WHERE wr.id = $1`,
    [recordId]
  );
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [items, vehicles, photos] = await Promise.all([
    query(
      `SELECT i.id, i.name, i.tier, i.icon, c.name as category_name
       FROM work_record_items wri JOIN items i ON i.id = wri.item_id
       JOIN item_categories c ON c.id = i.category_id
       WHERE wri.work_record_id = $1`,
      [recordId]
    ),
    query(
      `SELECT v.id, v.name, v.icon FROM work_record_vehicles wrv JOIN vehicles v ON v.id = wrv.vehicle_id
       WHERE wrv.work_record_id = $1`,
      [recordId]
    ),
    query('SELECT id, url FROM work_record_photos WHERE work_record_id = $1', [recordId]),
  ]);

  return NextResponse.json({ record, items, vehicles, photos });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const recordId = Number(params.id);
  const form = await req.formData();

  const facility_id = Number(form.get('facility_id'));
  const trouble_type_id = form.get('trouble_type_id') ? Number(form.get('trouble_type_id')) : null;
  const parent_id = form.get('parent_id') ? Number(form.get('parent_id')) : null;
  const title = String(form.get('title') || '').trim();
  const description = String(form.get('description') || '').trim();
  const raw_transcript = String(form.get('raw_transcript') || '').trim();
  const work_date = String(form.get('work_date') || '');
  const assignee_id = form.get('assignee_id') ? Number(form.get('assignee_id')) : null;
  const duration_minutes = form.get('duration_minutes') ? Number(form.get('duration_minutes')) : null;
  const itemIds: number[] = JSON.parse(String(form.get('item_ids') || '[]'));
  const vehicleIds: number[] = JSON.parse(String(form.get('vehicle_ids') || '[]'));

  if (parent_id === recordId) {
    return NextResponse.json({ error: '自分自身を関連元にはできません' }, { status: 400 });
  }

  await query(
    `UPDATE work_records SET facility_id=$1, trouble_type_id=$2, parent_id=$3, title=$4, description=$5,
       raw_transcript=$6, work_date=$7, assignee_id=$8, duration_minutes=$9, updated_at=NOW()
     WHERE id=$10`,
    [
      facility_id,
      trouble_type_id,
      parent_id,
      title,
      description,
      raw_transcript,
      work_date,
      assignee_id,
      duration_minutes,
      recordId,
    ]
  );

  await query('DELETE FROM work_record_items WHERE work_record_id = $1', [recordId]);
  for (const itemId of itemIds) {
    await query('INSERT INTO work_record_items (work_record_id, item_id, quantity) VALUES ($1,$2,1)', [
      recordId,
      itemId,
    ]);
  }

  await query('DELETE FROM work_record_vehicles WHERE work_record_id = $1', [recordId]);
  for (const vId of vehicleIds) {
    await query('INSERT INTO work_record_vehicles (work_record_id, vehicle_id) VALUES ($1,$2)', [
      recordId,
      vId,
    ]);
  }

  const photos = form.getAll('photos').filter((p): p is File => p instanceof File && p.size > 0);
  for (const photo of photos) {
    const url = await saveUploadedPhoto(photo);
    await query('INSERT INTO work_record_photos (work_record_id, url) VALUES ($1,$2)', [recordId, url]);
  }

  return NextResponse.json({ ok: true });
}

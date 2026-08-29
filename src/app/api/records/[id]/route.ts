import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveUploadedPhoto } from '@/lib/uploads';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const record = db
    .prepare(
      `SELECT wr.*, f.name as facility_name, tt.name as trouble_name
       FROM work_records wr
       LEFT JOIN facilities f ON f.id = wr.facility_id
       LEFT JOIN trouble_types tt ON tt.id = wr.trouble_type_id
       WHERE wr.id = ?`
    )
    .get(params.id);
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const items = db
    .prepare(
      `SELECT i.id, i.name, i.tier, i.icon, c.name as category_name
       FROM work_record_items wri JOIN items i ON i.id = wri.item_id
       JOIN item_categories c ON c.id = i.category_id
       WHERE wri.work_record_id = ?`
    )
    .all(params.id);
  const vehicles = db
    .prepare(
      `SELECT v.id, v.name, v.icon FROM work_record_vehicles wrv JOIN vehicles v ON v.id = wrv.vehicle_id
       WHERE wrv.work_record_id = ?`
    )
    .all(params.id);
  const photos = db
    .prepare('SELECT id, filename FROM work_record_photos WHERE work_record_id = ?')
    .all(params.id);

  return NextResponse.json({ record, items, vehicles, photos });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const form = await req.formData();
  const db = getDb();

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

  if (parent_id === Number(params.id)) {
    return NextResponse.json({ error: '自分自身を関連元にはできません' }, { status: 400 });
  }

  db.prepare(
    `UPDATE work_records SET facility_id=?, trouble_type_id=?, parent_id=?, title=?, description=?,
       raw_transcript=?, work_date=?, assignee_id=?, duration_minutes=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(
    facility_id,
    trouble_type_id,
    parent_id,
    title,
    description,
    raw_transcript,
    work_date,
    assignee_id,
    duration_minutes,
    params.id
  );

  db.prepare('DELETE FROM work_record_items WHERE work_record_id = ?').run(params.id);
  const insItem = db.prepare(
    'INSERT INTO work_record_items (work_record_id, item_id, quantity) VALUES (?,?,1)'
  );
  for (const itemId of itemIds) insItem.run(params.id, itemId);

  db.prepare('DELETE FROM work_record_vehicles WHERE work_record_id = ?').run(params.id);
  const insVehicle = db.prepare(
    'INSERT INTO work_record_vehicles (work_record_id, vehicle_id) VALUES (?,?)'
  );
  for (const vId of vehicleIds) insVehicle.run(params.id, vId);

  const photos = form.getAll('photos').filter((p): p is File => p instanceof File && p.size > 0);
  const insPhoto = db.prepare(
    'INSERT INTO work_record_photos (work_record_id, filename) VALUES (?,?)'
  );
  for (const photo of photos) {
    const filename = await saveUploadedPhoto(photo);
    insPhoto.run(params.id, filename);
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { saveUploadedPhoto } from '@/lib/uploads';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get('facility_id');
  const troubleTypeId = searchParams.get('trouble_type_id');

  const clauses: string[] = [];
  const args: (string | number)[] = [];
  if (facilityId) {
    args.push(Number(facilityId));
    clauses.push(`wr.facility_id = $${args.length}`);
  }
  if (troubleTypeId) {
    args.push(Number(troubleTypeId));
    clauses.push(`wr.trouble_type_id = $${args.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await query(
    `SELECT wr.id, wr.title, wr.work_date, wr.description, f.name as facility_name
     FROM work_records wr JOIN facilities f ON f.id = wr.facility_id
     ${where}
     ORDER BY wr.work_date DESC
     LIMIT 20`,
    args
  );

  return NextResponse.json({ records: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const form = await req.formData();

  const facility_id = Number(form.get('facility_id'));
  const trouble_type_id = form.get('trouble_type_id') ? Number(form.get('trouble_type_id')) : null;
  const parent_id = form.get('parent_id') ? Number(form.get('parent_id')) : null;
  const title = String(form.get('title') || '').trim();
  const description = String(form.get('description') || '').trim();
  const raw_transcript = String(form.get('raw_transcript') || '').trim();
  const work_date = String(form.get('work_date') || new Date().toISOString().slice(0, 10));
  const assignee_id = form.get('assignee_id') ? Number(form.get('assignee_id')) : session.userId;
  const duration_minutes = form.get('duration_minutes') ? Number(form.get('duration_minutes')) : null;

  const itemIds: number[] = JSON.parse(String(form.get('item_ids') || '[]'));
  const vehicleIds: number[] = JSON.parse(String(form.get('vehicle_ids') || '[]'));

  if (!facility_id || !title) {
    return NextResponse.json({ error: '施設とタイトルは必須です' }, { status: 400 });
  }

  const record = await queryOne<{ id: number }>(
    `INSERT INTO work_records
      (facility_id, trouble_type_id, parent_id, title, description, raw_transcript, work_date, assignee_id, duration_minutes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
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
      session.userId,
    ]
  );
  const recordId = record!.id;

  for (const itemId of itemIds) {
    await query('INSERT INTO work_record_items (work_record_id, item_id, quantity) VALUES ($1,$2,1)', [
      recordId,
      itemId,
    ]);
  }
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

  return NextResponse.json({ ok: true, id: recordId });
}

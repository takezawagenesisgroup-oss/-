import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const db = getDb();
  const facilities = db
    .prepare('SELECT id, name, type, address, icon FROM facilities ORDER BY type, id')
    .all();
  const troubleTypes = db
    .prepare('SELECT id, name, icon FROM trouble_types ORDER BY sort_order, id')
    .all();
  const categories = db
    .prepare('SELECT id, name, kind, icon FROM item_categories ORDER BY sort_order, id')
    .all();
  const items = db
    .prepare(
      `SELECT i.id, i.category_id, i.name, i.tier, i.icon, i.storage_location, c.name as category_name, c.kind as category_kind
       FROM items i JOIN item_categories c ON c.id = i.category_id
       ORDER BY c.sort_order, i.category_id, i.tier, i.id`
    )
    .all();
  const vehicles = db.prepare('SELECT id, name, type, icon FROM vehicles ORDER BY id').all();
  const users = db
    .prepare("SELECT id, name FROM users WHERE active = 1 ORDER BY id")
    .all();

  return NextResponse.json({
    facilities,
    troubleTypes,
    categories,
    items,
    vehicles,
    users,
    me: session ? { id: session.userId, name: session.name } : null,
  });
}

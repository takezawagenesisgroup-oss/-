import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  const [facilities, troubleTypes, categories, items, vehicles, users] = await Promise.all([
    query('SELECT id, name, type, address, icon FROM facilities ORDER BY type, id'),
    query('SELECT id, name, icon FROM trouble_types ORDER BY sort_order, id'),
    query('SELECT id, name, kind, icon FROM item_categories ORDER BY sort_order, id'),
    query(
      `SELECT i.id, i.category_id, i.name, i.tier, i.icon, i.storage_location, c.name as category_name, c.kind as category_kind
       FROM items i JOIN item_categories c ON c.id = i.category_id
       ORDER BY c.sort_order, i.category_id, i.tier, i.id`
    ),
    query('SELECT id, name, type, icon FROM vehicles ORDER BY id'),
    query("SELECT id, name FROM users WHERE active = true ORDER BY id"),
  ]);

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

import { getDb } from '@/lib/db';

export type RecommendedItem = {
  id: number;
  name: string;
  icon: string;
  tier: number;
  category_name: string;
  category_kind: 'tool' | 'supply';
  count: number;
};
export type RecommendedVehicle = { id: number; name: string; icon: string; count: number };
export type MatchedRecord = {
  id: number;
  title: string;
  work_date: string;
  facility_name: string;
  description: string | null;
};

export function getRecommendation(troubleTypeId: number, facilityId?: number | null) {
  const db = getDb();

  let matchLevel: 'facility' | 'facility_type' | 'trouble_only' = 'trouble_only';
  let recordIds: number[] = [];

  if (facilityId) {
    const exact = db
      .prepare(
        'SELECT id FROM work_records WHERE trouble_type_id = ? AND facility_id = ?'
      )
      .all(troubleTypeId, facilityId) as { id: number }[];
    if (exact.length > 0) {
      recordIds = exact.map((r) => r.id);
      matchLevel = 'facility';
    }
  }

  if (recordIds.length === 0 && facilityId) {
    const facility = db.prepare('SELECT type FROM facilities WHERE id = ?').get(facilityId) as
      | { type: string }
      | undefined;
    if (facility) {
      const byType = db
        .prepare(
          `SELECT wr.id FROM work_records wr JOIN facilities f ON f.id = wr.facility_id
           WHERE wr.trouble_type_id = ? AND f.type = ?`
        )
        .all(troubleTypeId, facility.type) as { id: number }[];
      if (byType.length > 0) {
        recordIds = byType.map((r) => r.id);
        matchLevel = 'facility_type';
      }
    }
  }

  if (recordIds.length === 0) {
    const all = db
      .prepare('SELECT id FROM work_records WHERE trouble_type_id = ?')
      .all(troubleTypeId) as { id: number }[];
    recordIds = all.map((r) => r.id);
    matchLevel = 'trouble_only';
  }

  if (recordIds.length === 0) {
    return { matchLevel, items: [] as RecommendedItem[], vehicles: [] as RecommendedVehicle[], records: [] as MatchedRecord[] };
  }

  const placeholders = recordIds.map(() => '?').join(',');

  const items = db
    .prepare(
      `SELECT i.id, i.name, i.icon, i.tier, c.name as category_name, c.kind as category_kind, COUNT(*) as count
       FROM work_record_items wri
       JOIN items i ON i.id = wri.item_id
       JOIN item_categories c ON c.id = i.category_id
       WHERE wri.work_record_id IN (${placeholders})
       GROUP BY i.id
       ORDER BY i.tier ASC, count DESC`
    )
    .all(...recordIds) as RecommendedItem[];

  const vehicles = db
    .prepare(
      `SELECT v.id, v.name, v.icon, COUNT(*) as count
       FROM work_record_vehicles wrv
       JOIN vehicles v ON v.id = wrv.vehicle_id
       WHERE wrv.work_record_id IN (${placeholders})
       GROUP BY v.id
       ORDER BY count DESC`
    )
    .all(...recordIds) as RecommendedVehicle[];

  const records = db
    .prepare(
      `SELECT wr.id, wr.title, wr.work_date, wr.description, f.name as facility_name
       FROM work_records wr JOIN facilities f ON f.id = wr.facility_id
       WHERE wr.id IN (${placeholders})
       ORDER BY wr.work_date DESC
       LIMIT 10`
    )
    .all(...recordIds) as MatchedRecord[];

  return { matchLevel, items, vehicles, records };
}

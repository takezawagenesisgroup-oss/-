import { query, queryOne } from '@/lib/db';

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

export async function getRecommendation(troubleTypeId: number, facilityId?: number | null) {
  let matchLevel: 'facility' | 'facility_type' | 'trouble_only' = 'trouble_only';
  let recordIds: number[] = [];

  if (facilityId) {
    const exact = await query<{ id: number }>(
      'SELECT id FROM work_records WHERE trouble_type_id = $1 AND facility_id = $2',
      [troubleTypeId, facilityId]
    );
    if (exact.length > 0) {
      recordIds = exact.map((r) => r.id);
      matchLevel = 'facility';
    }
  }

  if (recordIds.length === 0 && facilityId) {
    const facility = await queryOne<{ type: string }>('SELECT type FROM facilities WHERE id = $1', [
      facilityId,
    ]);
    if (facility) {
      const byType = await query<{ id: number }>(
        `SELECT wr.id FROM work_records wr JOIN facilities f ON f.id = wr.facility_id
         WHERE wr.trouble_type_id = $1 AND f.type = $2`,
        [troubleTypeId, facility.type]
      );
      if (byType.length > 0) {
        recordIds = byType.map((r) => r.id);
        matchLevel = 'facility_type';
      }
    }
  }

  if (recordIds.length === 0) {
    const all = await query<{ id: number }>('SELECT id FROM work_records WHERE trouble_type_id = $1', [
      troubleTypeId,
    ]);
    recordIds = all.map((r) => r.id);
    matchLevel = 'trouble_only';
  }

  if (recordIds.length === 0) {
    return {
      matchLevel,
      items: [] as RecommendedItem[],
      vehicles: [] as RecommendedVehicle[],
      records: [] as MatchedRecord[],
    };
  }

  const items = await query<RecommendedItem>(
    `SELECT i.id, i.name, i.icon, i.tier, c.name as category_name, c.kind as category_kind, COUNT(*)::int as count
     FROM work_record_items wri
     JOIN items i ON i.id = wri.item_id
     JOIN item_categories c ON c.id = i.category_id
     WHERE wri.work_record_id = ANY($1::int[])
     GROUP BY i.id, c.name, c.kind
     ORDER BY i.tier ASC, count DESC`,
    [recordIds]
  );

  const vehicles = await query<RecommendedVehicle>(
    `SELECT v.id, v.name, v.icon, COUNT(*)::int as count
     FROM work_record_vehicles wrv
     JOIN vehicles v ON v.id = wrv.vehicle_id
     WHERE wrv.work_record_id = ANY($1::int[])
     GROUP BY v.id
     ORDER BY count DESC`,
    [recordIds]
  );

  const records = await query<MatchedRecord>(
    `SELECT wr.id, wr.title, wr.work_date, wr.description, f.name as facility_name
     FROM work_records wr JOIN facilities f ON f.id = wr.facility_id
     WHERE wr.id = ANY($1::int[])
     ORDER BY wr.work_date DESC
     LIMIT 10`,
    [recordIds]
  );

  return { matchLevel, items, vehicles, records };
}

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
export type Guide = {
  title: string;
  procedure: string;
  cautionNote: string | null;
  estMin: number | null;
  estMax: number | null;
};

export type MatchLevel = 'facility' | 'facility_type' | 'reference_facility_type' | 'reference_general' | 'trouble_only' | 'none';

async function itemsForRecords(recordIds: number[]): Promise<RecommendedItem[]> {
  return query<RecommendedItem>(
    `SELECT i.id, i.name, i.icon, i.tier, c.name as category_name, c.kind as category_kind, COUNT(*)::int as count
     FROM work_record_items wri
     JOIN items i ON i.id = wri.item_id
     JOIN item_categories c ON c.id = i.category_id
     WHERE wri.work_record_id = ANY($1::int[])
     GROUP BY i.id, c.name, c.kind
     ORDER BY i.tier ASC, count DESC`,
    [recordIds]
  );
}

async function vehiclesForRecords(recordIds: number[]): Promise<RecommendedVehicle[]> {
  return query<RecommendedVehicle>(
    `SELECT v.id, v.name, v.icon, COUNT(*)::int as count
     FROM work_record_vehicles wrv
     JOIN vehicles v ON v.id = wrv.vehicle_id
     WHERE wrv.work_record_id = ANY($1::int[])
     GROUP BY v.id
     ORDER BY count DESC`,
    [recordIds]
  );
}

async function itemsForGuide(guideId: number): Promise<RecommendedItem[]> {
  return query<RecommendedItem>(
    `SELECT i.id, i.name, i.icon, i.tier, c.name as category_name, c.kind as category_kind, 0 as count
     FROM reference_guide_items gi
     JOIN items i ON i.id = gi.item_id
     JOIN item_categories c ON c.id = i.category_id
     WHERE gi.reference_guide_id = $1
     ORDER BY i.tier ASC`,
    [guideId]
  );
}

async function vehiclesForGuide(guideId: number): Promise<RecommendedVehicle[]> {
  return query<RecommendedVehicle>(
    `SELECT v.id, v.name, v.icon, 0 as count
     FROM reference_guide_vehicles gv
     JOIN vehicles v ON v.id = gv.vehicle_id
     WHERE gv.reference_guide_id = $1`,
    [guideId]
  );
}

export async function getRecommendation(troubleTypeId: number, facilityId?: number | null) {
  const facility = facilityId
    ? await queryOne<{ type: string }>('SELECT type FROM facilities WHERE id = $1', [facilityId])
    : undefined;

  // 1. Real past work at this exact facility.
  if (facilityId) {
    const exact = await query<{ id: number }>(
      'SELECT id FROM work_records WHERE trouble_type_id = $1 AND facility_id = $2',
      [troubleTypeId, facilityId]
    );
    if (exact.length > 0) {
      const recordIds = exact.map((r) => r.id);
      return {
        matchLevel: 'facility' as MatchLevel,
        items: await itemsForRecords(recordIds),
        vehicles: await vehiclesForRecords(recordIds),
        records: await recordsByIds(recordIds),
        guide: undefined as Guide | undefined,
      };
    }
  }

  // 2. Real past work at other facilities of the same type.
  if (facility) {
    const byType = await query<{ id: number }>(
      `SELECT wr.id FROM work_records wr JOIN facilities f ON f.id = wr.facility_id
       WHERE wr.trouble_type_id = $1 AND f.type = $2`,
      [troubleTypeId, facility.type]
    );
    if (byType.length > 0) {
      const recordIds = byType.map((r) => r.id);
      return {
        matchLevel: 'facility_type' as MatchLevel,
        items: await itemsForRecords(recordIds),
        vehicles: await vehiclesForRecords(recordIds),
        records: await recordsByIds(recordIds),
        guide: undefined as Guide | undefined,
      };
    }
  }

  // 3. General reference guide written for this facility type.
  if (facility) {
    const guide = await queryOne<{
      id: number;
      title: string;
      procedure: string;
      caution_note: string | null;
      est_duration_min: number | null;
      est_duration_max: number | null;
    }>(
      'SELECT * FROM reference_guides WHERE trouble_type_id = $1 AND facility_type = $2 LIMIT 1',
      [troubleTypeId, facility.type]
    );
    if (guide) {
      return {
        matchLevel: 'reference_facility_type' as MatchLevel,
        items: await itemsForGuide(guide.id),
        vehicles: await vehiclesForGuide(guide.id),
        records: [] as MatchedRecord[],
        guide: toGuide(guide),
      };
    }
  }

  // 4. General reference guide not tied to a specific facility type.
  const generalGuide = await queryOne<{
    id: number;
    title: string;
    procedure: string;
    caution_note: string | null;
    est_duration_min: number | null;
    est_duration_max: number | null;
  }>('SELECT * FROM reference_guides WHERE trouble_type_id = $1 AND facility_type IS NULL LIMIT 1', [
    troubleTypeId,
  ]);
  if (generalGuide) {
    return {
      matchLevel: 'reference_general' as MatchLevel,
      items: await itemsForGuide(generalGuide.id),
      vehicles: await vehiclesForGuide(generalGuide.id),
      records: [] as MatchedRecord[],
      guide: toGuide(generalGuide),
    };
  }

  // 5. Last resort: any real record with this trouble type, any facility.
  const anyRecords = await query<{ id: number }>('SELECT id FROM work_records WHERE trouble_type_id = $1', [
    troubleTypeId,
  ]);
  if (anyRecords.length > 0) {
    const recordIds = anyRecords.map((r) => r.id);
    return {
      matchLevel: 'trouble_only' as MatchLevel,
      items: await itemsForRecords(recordIds),
      vehicles: await vehiclesForRecords(recordIds),
      records: await recordsByIds(recordIds),
      guide: undefined as Guide | undefined,
    };
  }

  return {
    matchLevel: 'none' as MatchLevel,
    items: [] as RecommendedItem[],
    vehicles: [] as RecommendedVehicle[],
    records: [] as MatchedRecord[],
    guide: undefined as Guide | undefined,
  };
}

function toGuide(g: {
  title: string;
  procedure: string;
  caution_note: string | null;
  est_duration_min: number | null;
  est_duration_max: number | null;
}): Guide {
  return {
    title: g.title,
    procedure: g.procedure,
    cautionNote: g.caution_note,
    estMin: g.est_duration_min,
    estMax: g.est_duration_max,
  };
}

async function recordsByIds(recordIds: number[]): Promise<MatchedRecord[]> {
  return query<MatchedRecord>(
    `SELECT wr.id, wr.title, wr.work_date, wr.description, f.name as facility_name
     FROM work_records wr JOIN facilities f ON f.id = wr.facility_id
     WHERE wr.id = ANY($1::int[])
     ORDER BY wr.work_date DESC
     LIMIT 10`,
    [recordIds]
  );
}

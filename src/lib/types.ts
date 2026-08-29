export type Facility = { id: number; name: string; type: string; address: string; icon: string };
export type TroubleType = { id: number; name: string; icon: string };
export type Category = { id: number; name: string; kind: 'tool' | 'supply'; icon: string };
export type Item = {
  id: number;
  category_id: number;
  name: string;
  tier: 1 | 2 | 3;
  icon: string;
  storage_location: string | null;
  category_name: string;
  category_kind: 'tool' | 'supply';
};
export type Vehicle = { id: number; name: string; type: string; icon: string };
export type UserLite = { id: number; name: string };

export type MetaResponse = {
  facilities: Facility[];
  troubleTypes: TroubleType[];
  categories: Category[];
  items: Item[];
  vehicles: Vehicle[];
  users: UserLite[];
  me: { id: number; name: string } | null;
};

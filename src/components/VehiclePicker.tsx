'use client';

import type { Vehicle } from '@/lib/types';

export default function VehiclePicker({
  vehicles,
  selectedIds,
  suggestedIds,
  onToggle,
}: {
  vehicles: Vehicle[];
  selectedIds: Set<number>;
  suggestedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {vehicles.map((v) => {
        const selected = selectedIds.has(v.id);
        const suggested = suggestedIds.has(v.id);
        return (
          <button
            type="button"
            key={v.id}
            onClick={() => onToggle(v.id)}
            className={`icon-tile relative ${selected ? 'selected' : ''}`}
          >
            {suggested && (
              <span className="absolute top-1 left-1 text-xs bg-amber-400 text-amber-900 font-bold rounded-full px-2 py-0.5">
                検出
              </span>
            )}
            {selected && <span className="absolute top-1 right-1 text-2xl">✅</span>}
            <span className="text-3xl">{v.icon}</span>
            <span>{v.name}</span>
          </button>
        );
      })}
    </div>
  );
}

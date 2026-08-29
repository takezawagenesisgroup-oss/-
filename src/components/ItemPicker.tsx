'use client';

import type { Item } from '@/lib/types';
import { tierShort } from '@/lib/labels';

export default function ItemPicker({
  items,
  selectedIds,
  suggestedIds,
  onToggle,
}: {
  items: Item[];
  selectedIds: Set<number>;
  suggestedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const byCategory = new Map<string, Item[]>();
  for (const it of items) {
    const key = `${it.category_kind}::${it.category_name}`;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(it);
  }

  return (
    <div className="space-y-6">
      {[...byCategory.entries()].map(([key, list]) => {
        const [, categoryName] = key.split('::');
        return (
          <div key={key}>
            <h3 className="font-bold text-lg mb-2">{list[0].icon ? '' : ''}{categoryName}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {list.map((it) => {
                const selected = selectedIds.has(it.id);
                const suggested = suggestedIds.has(it.id);
                return (
                  <button
                    type="button"
                    key={it.id}
                    onClick={() => onToggle(it.id)}
                    className={`icon-tile relative ${selected ? 'selected' : ''}`}
                  >
                    {suggested && (
                      <span className="absolute top-1 left-1 text-xs bg-amber-400 text-amber-900 font-bold rounded-full px-2 py-0.5">
                        音声で検出
                      </span>
                    )}
                    {selected && (
                      <span className="absolute top-1 right-1 text-2xl">✅</span>
                    )}
                    <span className="text-3xl">{it.icon}</span>
                    <span>{it.name}</span>
                    <span className="text-xs font-normal text-gray-400">{tierShort(it.tier)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

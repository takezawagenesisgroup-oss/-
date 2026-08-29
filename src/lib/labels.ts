export const FACILITY_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  pachinko: { label: 'パチンコ店', icon: '🎰' },
  mansion: { label: 'マンション', icon: '🏢' },
  house: { label: '戸建て住宅', icon: '🏡' },
  lot: { label: '空き地', icon: '🌾' },
  warehouse: { label: '倉庫', icon: '🏭' },
  hq: { label: '本社', icon: '🏬' },
};

export function tierLabel(kind: 'tool' | 'supply', tier: number): string {
  if (kind === 'tool') {
    return (
      { 1: '① 手前：よく使う手持ち工具', 2: '② 中：よく使う備品・専用工具', 3: '③ 奥：大型工具・大型品' }[
        tier
      ] || `${tier}`
    );
  }
  return (
    { 1: '① 手前：よく使う', 2: '② 中：そこそこ使う', 3: '③ 奥：めったに使わない' }[tier] ||
    `${tier}`
  );
}

export function tierShort(tier: number): string {
  return { 1: '①手前', 2: '②中', 3: '③奥' }[tier] || `${tier}`;
}

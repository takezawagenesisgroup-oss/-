export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function formatPace(paceMinPerKm: number | null): string {
  if (paceMinPerKm === null || !Number.isFinite(paceMinPerKm)) return '--\'--"';
  const totalSec = Math.round(paceMinPerKm * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}'${s.toString().padStart(2, '0')}"`;
}

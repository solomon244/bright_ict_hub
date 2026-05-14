/** Format minutes for UI (course totals, estimates). */
export function formatMinutesRounded(totalMinutes: number | undefined | null): string {
  if (totalMinutes == null || !Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return '—';
  }
  const m = Math.round(totalMinutes);
  if (m < 60) {
    return `${m} min`;
  }
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) {
    return `${h}h`;
  }
  return `${h}h ${rest}m`;
}

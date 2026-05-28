export const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'kremlin', label: 'Kremlin' },
  { value: 'duma', label: 'State Duma' },
  { value: 'federation', label: 'Federation Council' },
  { value: 'telegram', label: 'Official Telegram' },
] as const;

export type SourceFilterValue = typeof SOURCE_OPTIONS[number]['value'];

/** Returns true if a record's source/db matches the selected filter.
 *  Works for both monthly aggregates (source = 'kremlin.ru') and
 *  statement-level data (db = 'kremlin', source = channel name). */
export function matchesSource(
  recordSource: string | undefined,
  recordDb: string | undefined,
  filter: SourceFilterValue,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'kremlin') {
    return recordSource === 'kremlin.ru' || recordDb === 'kremlin';
  }
  if (filter === 'duma') {
    return recordSource === 'duma.gov.ru' || recordDb === 'state_duma';
  }
  if (filter === 'federation') {
    return recordSource === 'council.gov.ru' || recordDb === 'federation_council';
  }
  if (filter === 'telegram') {
    return recordDb === 'telegram_official';
  }
  return true;
}

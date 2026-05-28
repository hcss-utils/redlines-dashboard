export const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'kremlin', label: 'Kremlin' },
  { value: 'duma', label: 'State Duma' },
  { value: 'federation', label: 'Federation Council' },
  { value: 'telegram', label: 'Official Telegram' },
] as const;

export type SourceFilterValue = typeof SOURCE_OPTIONS[number]['value'];

export function matchesSource(
  recordSource: string | undefined,
  recordDb: string | undefined,
  filter: SourceFilterValue,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'kremlin') return recordSource === 'kremlin.ru';
  if (filter === 'duma') return recordSource === 'duma.gov.ru';
  if (filter === 'federation') return recordSource === 'council.gov.ru';
  if (filter === 'telegram') {
    if (recordDb === 'telegram_official') return true;
    const s = recordSource || '';
    return s.includes('МИД') || s.includes('Marina') || s.includes('Захарова') || s.includes('Медин') || s.includes('Embassy') || s.includes('Миноборон') || s.includes('Мэр') || s.includes('Володин') || s.includes('Русский') || s.includes('Минстрой');
  }
  return true;
}

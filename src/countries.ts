// Canonical country / bloc extractor for the free-text speaker and target
// fields in the RRLS / NTS statement datasets.
//
// The annotation schema captures speaker and target as long natural-language
// strings (e.g. "Maria V. Zakharova (Russian Foreign Ministry spokesperson)",
// "United Kingdom and France (and actors assisting Ukraine)"). That yields
// 900+ / 1700+ near-duplicate distinct values which are useless as a select
// dropdown. This module resolves each free-text string to a small set of
// canonical entities via case-insensitive substring matching against alias
// lists, so the UI can offer ~25 sensible country / bloc options.
//
// Aliases are intentionally permissive: a statement by Medvedev is resolved
// to "Russia"; "the West" is its own bloc; mentions of NATO, EU, Baltic
// states surface the super-entity even when individual members aren't named.

export type Canonical = string;

// Ordered most-specific first so that e.g. "North Korea" wins over "Korea"
// in a shared substring scan. Each alias is matched case-insensitively
// against the full field via .includes().
const ALIASES: Array<[Canonical, string[]]> = [
  // Primary protagonists
  ['Russia',          ['russia', 'russian federation', 'moscow', 'kremlin', 'rosgvard', 'putin', 'medvedev', 'lavrov', 'zakharova', 'peskov', 'patrushev', 'shoigu', 'gerasimov', 'belousov', 'volodin', 'naryshkin', 'matviyenko']],
  ['Ukraine',         ['ukraine', 'ukrainian', 'kyiv', 'kiev', 'zelensky', 'zelenskyy', 'zaluzhny', 'syrsky']],
  // NATO + Western capitals
  ['United States',   ['united states', ' usa', 'usa ', 'u.s.', 'u.s ', 'u.s,', 'america', 'american', 'washington', 'pentagon', 'white house', 'biden', 'trump', 'blinken', 'austin', 'sullivan', 'burns']],
  ['United Kingdom',  ['united kingdom', 'britain', 'british', ' uk ', 'uk,', 'uk.', 'uk)', 'uk;', 'london', 'downing street', 'starmer', 'sunak', 'cameron', 'johnson']],
  ['France',          ['france', 'french', 'paris', 'macron', 'barnier', 'attal', 'élysée', 'elysee']],
  ['Germany',         ['germany', 'german', 'berlin', 'scholz', 'merz', 'baerbock', 'pistorius']],
  ['Poland',          ['poland', 'polish', 'warsaw', 'tusk', 'duda']],
  ['Italy',           ['italy', 'italian', 'rome', 'meloni']],
  ['Netherlands',     ['netherlands', 'dutch', 'the hague', 'rutte', 'amsterdam']],
  ['Spain',           ['spain', 'spanish', 'madrid', 'sanchez']],
  ['Czech Republic',  ['czech', 'prague', 'fiala']],
  ['Romania',         ['romania', 'romanian', 'bucharest']],
  // Baltics
  ['Baltic states',   ['baltic', 'lithuania', 'lithuanian', 'vilnius', 'latvia', 'latvian', 'riga', 'estonia', 'estonian', 'tallinn']],
  // Nordics
  ['Finland',         ['finland', 'finnish', 'helsinki']],
  ['Sweden',          ['sweden', 'swedish', 'stockholm']],
  ['Norway',          ['norway', 'norwegian', 'oslo']],
  ['Denmark',         ['denmark', 'danish', 'copenhagen']],
  // Other Europe
  ['Switzerland',     ['switzerland', 'swiss', 'geneva', 'bern']],
  ['Austria',         ['austria', 'austrian', 'vienna']],
  ['Hungary',         ['hungary', 'hungarian', 'budapest', 'orban']],
  ['Slovakia',        ['slovakia', 'slovak', 'bratislava', 'fico']],
  ['Turkey',          ['turkey', 'turkish', 'türkiye', 'turkiye', 'ankara', 'erdogan']],
  // Asia-Pacific
  ['Japan',           ['japan', 'japanese', 'tokyo']],
  ['South Korea',     ['south korea', 'korean', 'seoul', 'roK ', 'republic of korea']],
  ['North Korea',     ['north korea', 'dprk', 'pyongyang']],
  ['China',           ['china', 'chinese', 'beijing', 'xi jinping', 'prc']],
  // Middle East
  ['Israel',          ['israel', 'israeli', 'tel aviv', 'netanyahu']],
  ['Iran',            ['iran', 'iranian', 'tehran']],
  // Post-Soviet
  ['Belarus',         ['belarus', 'belarusian', 'minsk', 'lukashenko']],
  ['Kazakhstan',      ['kazakhstan', 'kazakh', 'astana', 'tokayev']],
  ['Georgia',         [' georgia', 'georgian', 'tbilisi']],
  ['Moldova',         ['moldova', 'moldovan', 'chisinau']],
  ['Armenia',         ['armenia', 'armenian', 'yerevan', 'pashinyan']],
  // Super-entities
  ['NATO',            ['nato', 'north atlantic', 'alliance']],
  ['European Union',  ['european union', ' eu ', 'eu,', 'eu.', 'eu)', 'eu;', 'brussels', 'von der leyen', 'borrell', 'kallas']],
  ['The West',        ['the west', 'western countries', 'western states', 'collective west']],
  ['G7',              [' g7', 'g-7', 'group of seven']],
  ['G20',             ['g20', 'g-20', 'group of twenty']],
  ['UN',              ['united nations', ' un ', 'un,', 'un.', 'un security council', 'unsc', 'guterres']],
  ['OSCE',            ['osce', 'organization for security and co-operation']],
];

export function extractCountries(text: string | undefined | null): Canonical[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<Canonical>();
  for (const [canonical, aliases] of ALIASES) {
    for (const alias of aliases) {
      if (lower.includes(alias)) {
        found.add(canonical);
        break;
      }
    }
  }
  return [...found];
}

// Sorted canonical list, useful for building a select dropdown.
export function canonicalList(): Canonical[] {
  return ALIASES.map(([c]) => c).sort();
}

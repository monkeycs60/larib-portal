type CentreRule = { match: RegExp; centre: string }

// Curated keyword map for the team's known centres. Extend as curation reveals more.
const CENTRE_RULES: CentreRule[] = [
  { match: /lariboisi[eè]re/i, centre: 'Lariboisière – APHP' },
  { match: /institut cardiovasculaire paris sud|\bICPS\b|jacques cartier|ramsay/i, centre: 'Institut Cardiovasculaire Paris Sud' },
  { match: /bichat/i, centre: 'Bichat – APHP' },
  { match: /piti[eé][- ]salp[eê]tri[eè]re/i, centre: 'Pitié-Salpêtrière – APHP' },
  { match: /pompidou|\bHEGP\b/i, centre: 'HEGP – APHP' },
]

// A hospital always wins over a university / INSERM / research unit / department.
const HOSPITAL_KW = /\b(hospital|h[oô]pital|h[oô]pitaux|CHU|CHRU|CHR|clinique|clinic|klinik|klinikum|infirmary|hospices civils|medical cent(?:er|re)|centre hospitalier|AP[- ]?HP|APHP)\b/i
const UNIVERSITY_KW = /\b(university|universit[eé]|universit[aä]t|college)\b/i

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matches(pattern: RegExp, segment: string): boolean {
  return pattern.test(segment) || pattern.test(stripDiacritics(segment))
}

export function guessCentre(rawAffiliation: string): string {
  const raw = rawAffiliation.trim()
  if (!raw) return 'Unknown'

  // 1. Curated rules (highest priority).
  for (const rule of CENTRE_RULES) {
    if (rule.match.test(raw) || rule.match.test(stripDiacritics(raw))) return rule.centre
  }

  const segments = raw.split(',').map((segment) => segment.trim()).filter(Boolean)

  // 2. Prefer the hospital segment.
  const hospital = segments.find((segment) => matches(HOSPITAL_KW, segment))
  if (hospital) return hospital

  // 3. Otherwise a university.
  const university = segments.find((segment) => matches(UNIVERSITY_KW, segment))
  if (university) return university

  // 4. Fallback: the first segment (a department/lab — to be curated manually).
  return segments[0] ?? 'Unknown'
}

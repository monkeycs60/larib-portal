type CentreRule = { match: RegExp; centre: string }

// Curated keyword map for the team's known centres. Extend as curation reveals more.
const CENTRE_RULES: CentreRule[] = [
  { match: /lariboisi[eè]re/i, centre: 'Lariboisière – APHP' },
  { match: /institut cardiovasculaire paris sud|\bICPS\b|jacques cartier|ramsay/i, centre: 'Institut Cardiovasculaire Paris Sud' },
  { match: /bichat/i, centre: 'Bichat – APHP' },
  { match: /piti[eé][- ]salp[eê]tri[eè]re/i, centre: 'Pitié-Salpêtrière – APHP' },
  { match: /pompidou|\bHEGP\b/i, centre: 'HEGP – APHP' },
]

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function guessCentre(rawAffiliation: string): string {
  const raw = rawAffiliation.trim()
  if (!raw) return 'Unknown'
  const haystack = stripDiacritics(raw)
  for (const rule of CENTRE_RULES) {
    if (rule.match.test(haystack) || rule.match.test(raw)) return rule.centre
  }
  return raw.split(',')[0].trim() || 'Unknown'
}

type CentreRule = { match: RegExp; centre: string }

// Curated map for known hospital sites -> their canonical centre. Extend as curation reveals more.
const CENTRE_RULES: CentreRule[] = [
  { match: /lariboisi[eè]re/i, centre: 'Lariboisière – AP-HP' },
  { match: /institut cardiovasculaire paris sud|\bICPS\b|jacques cartier|ramsay/i, centre: 'Institut Cardiovasculaire Paris Sud' },
  { match: /bichat/i, centre: 'Bichat – AP-HP' },
  { match: /piti[eé][- ]salp[eê]tri[eè]re/i, centre: 'Pitié-Salpêtrière – AP-HP' },
  { match: /pompidou|\bHEGP\b/i, centre: 'HEGP – AP-HP' },
  { match: /\bmondor\b/i, centre: 'Henri Mondor – AP-HP' },
  { match: /saint[- ]antoine/i, centre: 'Saint-Antoine – AP-HP' },
  { match: /rangueil/i, centre: 'CHU de Toulouse' },
  { match: /nouvel h[oô]pital civil|\bNHC\b/i, centre: 'CHU de Strasbourg' },
  { match: /haut[- ]l[eé]v[eê]que/i, centre: 'CHU de Bordeaux' },
  { match: /f[eé]lix[- ]guyon/i, centre: 'CHU de La Réunion' },
  { match: /duffaut/i, centre: "CH d'Avignon" },
  { match: /cochin/i, centre: 'Cochin – AP-HP' },
  { match: /clinique[^,]{0,40}(?:ambroise|a\.?)[- ]?par[eé]/i, centre: 'Clinique Ambroise Paré' },
  { match: /\bindependent\b/i, centre: 'Independent' },
  { match: /montpied/i, centre: 'CHU de Clermont-Ferrand' },
  { match: /louis pradel/i, centre: 'CHU de Lyon' },
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

// Umbrella groups / generic labels are never a centre on their own — they must name a specific hospital.
const GENERIC_CENTRES = new Set([
  'aphp', 'universityhospital', 'universityhospitals', 'hospital', 'hopital',
  'university', 'chu', 'chru', 'chr', 'centrehospitalier', 'centrehospitalieruniversitaire',
  'centrehospitalouniversitaire', 'centrehospitalouniversitairechu',
  'medicalcenter', 'medicalcentre', 'rehabilitationcenter', 'rehabilitationcentre',
  'childrenshospital', 'chestdiseases', 'cardiovascularsciencesdepartment',
  'cardiologydivision', 'cardiology', 'cardiologue', 'cardiologist',
])
function isGenericCentre(segment: string): boolean {
  return GENERIC_CENTRES.has(stripDiacritics(segment).toLowerCase().replace(/[^a-z]/g, ''))
}

// English/French equivalences -> canonical French form.
function normalizeCentreName(name: string): string {
  const uniOf = name.match(/^university hospitals? of (.+)$/i)
  if (uniOf) return `CHU de ${uniOf[1].trim()}`
  const uniSuffix = name.match(/^(.+?) university hospitals?$/i)
  if (uniSuffix) return `CHU de ${uniSuffix[1].trim()}`
  const chuBare = name.match(/^chu\s+(?!de\b|d')(.+)$/i)
  if (chuBare) return `CHU de ${chuBare[1].trim()}`
  const chruRegional = name.match(/^centre hospitalier r[eé]gional universitaire (?:de |d'|du |des )?(.+)$/i)
  if (chruRegional) return `CHRU de ${chruRegional[1].trim()}`
  const chruBare = name.match(/^chru\s+(?!de\b|d')(.+)$/i)
  if (chruBare) return `CHRU de ${chruBare[1].trim()}`
  const chu = name.match(/^centre hospitalier universitaire (?:de |d'|du |des )?(.+)$/i)
  if (chu) return `CHU de ${chu[1].trim()}`
  const ch = name.match(/^centre hospitalier (.+)$/i)
  if (ch) return `CH ${ch[1].trim()}`
  return name
}

export function guessCentre(rawAffiliation: string): string | null {
  const raw = rawAffiliation.trim()
  if (!raw) return null

  // 1. Curated rules (highest priority).
  for (const rule of CENTRE_RULES) {
    if (rule.match.test(raw) || rule.match.test(stripDiacritics(raw))) return rule.centre
  }

  const segments = raw.split(',').map((segment) => segment.trim()).filter(Boolean)

  // 2. Prefer a specific hospital segment (never a bare umbrella / generic label).
  const hospital = segments.find((segment) => matches(HOSPITAL_KW, segment) && !isGenericCentre(segment))
  if (hospital) return normalizeCentreName(hospital)

  // 3. Otherwise a (specific) university.
  const university = segments.find((segment) => matches(UNIVERSITY_KW, segment) && !isGenericCentre(segment))
  if (university) return normalizeCentreName(university)

  // 4. No hospital/university identified -> no centre (a bare department is not a centre).
  return null
}

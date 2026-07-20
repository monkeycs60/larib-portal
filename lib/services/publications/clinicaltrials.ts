import type { StudyStatusValue } from './studies'

export type ClinicalTrialPerson = {
  firstName: string
  lastName: string
  degrees: string | null
  email: string | null
  role: 'PI' | 'CO_INVESTIGATOR'
  centreName: string | null
}

export type ClinicalTrialCentre = {
  name: string
  city: string | null
  country: string | null
}

export type ClinicalTrialImport = {
  nctId: string
  title: string
  acronym: string | null
  status: StudyStatusValue
  startDate: string | null
  endDate: string | null
  description: string | null
  domain: string | null
  funding: string | null
  enrollment: number | null
  centres: ClinicalTrialCentre[]
  investigators: ClinicalTrialPerson[]
}

const NCT_PATTERN = /^NCT\d{8}$/i

export function normaliseNctId(value: string): string | null {
  const trimmed = value.trim().toUpperCase()
  return NCT_PATTERN.test(trimmed) ? trimmed : null
}

function mapStatus(overallStatus: string | undefined): StudyStatusValue {
  switch (overallStatus) {
    case 'COMPLETED':
      return 'COMPLETED'
    case 'TERMINATED':
    case 'WITHDRAWN':
    case 'SUSPENDED':
      return 'STOPPED'
    case 'RECRUITING':
    case 'ENROLLING_BY_INVITATION':
    case 'ACTIVE_NOT_RECRUITING':
      return 'ONGOING'
    default:
      return 'PLANNED'
  }
}

function parsePerson(raw: string, email: string | null, role: ClinicalTrialPerson['role'], centreName: string | null): ClinicalTrialPerson | null {
  const [namePart, ...degreeParts] = raw.split(',')
  const degrees = degreeParts.join(',').trim() || null
  const tokens = namePart.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  const upper = tokens.filter((token) => token.length > 1 && token === token.toUpperCase() && /[A-ZÀ-Þ]/.test(token))
  let firstName: string
  let lastName: string
  if (upper.length > 0) {
    lastName = upper.join(' ')
    firstName = tokens.filter((token) => !upper.includes(token)).join(' ')
  } else if (tokens.length === 1) {
    firstName = ''
    lastName = tokens[0]
  } else {
    lastName = tokens[tokens.length - 1]
    firstName = tokens.slice(0, -1).join(' ')
  }
  return { firstName: firstName || lastName, lastName: lastName || firstName, degrees, email, role, centreName }
}

type CtgovLocation = {
  facility?: string
  city?: string
  country?: string
  contacts?: Array<{ name?: string; role?: string; email?: string }>
}

type CtgovOfficial = { name?: string; role?: string; affiliation?: string }

export function parseClinicalTrial(json: unknown): ClinicalTrialImport {
  const protocol = (json as { protocolSection?: Record<string, unknown> }).protocolSection ?? {}
  const identification = (protocol.identificationModule ?? {}) as { nctId?: string; briefTitle?: string; officialTitle?: string; acronym?: string }
  const statusModule = (protocol.statusModule ?? {}) as { overallStatus?: string; startDateStruct?: { date?: string }; completionDateStruct?: { date?: string }; primaryCompletionDateStruct?: { date?: string } }
  const conditions = (protocol.conditionsModule ?? {}) as { conditions?: string[] }
  const sponsors = (protocol.sponsorCollaboratorsModule ?? {}) as { leadSponsor?: { name?: string }; collaborators?: Array<{ name?: string }> }
  const descriptionModule = (protocol.descriptionModule ?? {}) as { briefSummary?: string }
  const designModule = (protocol.designModule ?? {}) as { enrollmentInfo?: { count?: number } }
  const contactsLocations = (protocol.contactsLocationsModule ?? {}) as { overallOfficials?: CtgovOfficial[]; locations?: CtgovLocation[] }

  const nctId = (identification.nctId ?? '').toUpperCase()
  const title = identification.officialTitle?.trim() || identification.briefTitle?.trim() || ''
  const acronym = identification.acronym?.trim() || null

  const funding = [sponsors.leadSponsor?.name, ...(sponsors.collaborators ?? []).map((collaborator) => collaborator.name)]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(', ') || null

  const domain = (conditions.conditions ?? []).map((condition) => condition.trim()).filter(Boolean).join(', ') || null

  const centreByName = new Map<string, ClinicalTrialCentre>()
  const investigators: ClinicalTrialPerson[] = []
  const seenPeople = new Set<string>()

  for (const official of contactsLocations.overallOfficials ?? []) {
    if (!official.name) continue
    const person = parsePerson(official.name, null, 'PI', null)
    if (!person) continue
    const key = `${person.firstName}|${person.lastName}`.toLowerCase()
    if (seenPeople.has(key)) continue
    seenPeople.add(key)
    investigators.push(person)
  }

  for (const location of contactsLocations.locations ?? []) {
    const facility = location.facility?.trim()
    if (facility && !centreByName.has(facility.toLowerCase())) {
      centreByName.set(facility.toLowerCase(), { name: facility, city: location.city?.trim() || null, country: location.country?.trim() || null })
    }
    for (const contact of location.contacts ?? []) {
      if (!contact.name) continue
      const person = parsePerson(contact.name, contact.email?.trim() || null, 'CO_INVESTIGATOR', facility ?? null)
      if (!person) continue
      const key = `${person.firstName}|${person.lastName}`.toLowerCase()
      if (seenPeople.has(key)) continue
      seenPeople.add(key)
      investigators.push(person)
    }
  }

  return {
    nctId,
    title,
    acronym,
    status: mapStatus(statusModule.overallStatus),
    startDate: statusModule.startDateStruct?.date ?? null,
    endDate: statusModule.completionDateStruct?.date ?? statusModule.primaryCompletionDateStruct?.date ?? null,
    description: descriptionModule.briefSummary?.trim() || null,
    domain,
    funding,
    enrollment: typeof designModule.enrollmentInfo?.count === 'number' ? designModule.enrollmentInfo.count : null,
    centres: [...centreByName.values()],
    investigators,
  }
}

const CTGOV_FIXTURE_DIR = process.env.CTGOV_FIXTURE_DIR

async function loadClinicalTrialJson(nctId: string): Promise<unknown> {
  if (CTGOV_FIXTURE_DIR) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const raw = await readFile(join(CTGOV_FIXTURE_DIR, `${nctId}.json`), 'utf8')
    return JSON.parse(raw)
  }
  const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}?format=json`
  const requestInit: RequestInit & { cache: 'no-store' } = {
    headers: { Accept: 'application/json', 'User-Agent': 'larib-portal/1.0 (publications import)' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  }

  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, requestInit)
      if (response.status === 404) throw new Error('NOT_FOUND')
      if (response.status === 429 || response.status >= 500) throw new Error(`RETRYABLE_${response.status}`)
      if (!response.ok) throw new Error('FETCH_FAILED')
      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') throw error
      lastError = error
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
    }
  }
  console.error(`[clinicaltrials] fetch failed for ${nctId}:`, lastError instanceof Error ? lastError.message : lastError)
  throw new Error('FETCH_FAILED')
}

export async function fetchClinicalTrial(nctId: string): Promise<ClinicalTrialImport> {
  const normalised = normaliseNctId(nctId)
  if (!normalised) throw new Error('INVALID_NCT_ID')
  const json = await loadClinicalTrialJson(normalised)
  const parsed = parseClinicalTrial(json)
  if (!parsed.nctId || !parsed.title) throw new Error('NOT_FOUND')
  return parsed
}

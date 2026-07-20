import { prisma } from '@/lib/prisma'
import { Prisma, type AuthorType } from '@/app/generated/prisma'
import { planAuthorshipMerge } from './authors-merge'
import { pickPrimaryCentre } from './author-centre'
import { PUBLICATIONS_AUTHORS_TAG, PUBLICATIONS_ARTICLES_TAG } from './import'

export type AuthorListItem = Prisma.AuthorGetPayload<{
  select: {
    id: true
    firstName: true
    lastName: true
    initials: true
    degrees: true
    email: true
    orcid: true
    type: true
    userId: true
    centreId: true
    user: { select: { id: true; firstName: true; lastName: true; email: true; emailVerified: true } }
    centre: { select: { id: true; name: true } }
    _count: { select: { authorships: true } }
  }
}>

export async function listAuthors(): Promise<AuthorListItem[]> {
  return prisma.author.findMany({
    orderBy: [{ authorships: { _count: 'desc' } }, { lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      initials: true,
      degrees: true,
      email: true,
      orcid: true,
      type: true,
      userId: true,
      centreId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, emailVerified: true } },
      centre: { select: { id: true, name: true } },
      _count: { select: { authorships: true } },
    },
  })
}

export async function countAuthors(): Promise<number> {
  return prisma.author.count()
}

export type AuthorDetail = {
  affiliations: { raw: string; isOurs: boolean }[]
  affiliationsDerived: boolean
  publications: { id: string; title: string; journal: string | null; year: number | null; position: number; authorsCount: number }[]
  portalUser: { name: string; email: string; position: string | null; active: boolean; applications: string[] } | null
}

const AFFILIATION_MAX = 6

const AFFILIATION_STOPWORDS = new Set([
  'the', 'and', 'for', 'of', 'de', 'des', 'du', 'la', 'le', 'les', 'et', 'cedex',
  'university', 'universite', 'hospital', 'hopital', 'department', 'departement', 'dept',
  'france', 'paris', 'assistance', 'publique', 'hopitaux', 'aphp', 'inc',
])

// Signature that collapses word-order / punctuation / accents / postal-code variants of the
// same institution into one key (distinctive tokens only, sorted, deduped).
function affiliationKey(raw: string): string {
  const words = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/electronic address.*/i, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !AFFILIATION_STOPWORDS.has(word))
  return [...new Set(words)].sort().join(' ')
}

type DerivableAuthorship = {
  article: { publishedAt: Date | null }
  affiliations: { affiliation: { raw: string | null; name: string } }[]
}

function deriveAffiliations(authorships: DerivableAuthorship[], isOurs: (raw: string) => boolean): { raw: string; isOurs: boolean }[] {
  const byKey = new Map<string, { raw: string; count: number; recency: number }>()
  const byRecency = [...authorships].sort(
    (first, second) => (second.article.publishedAt?.getTime() ?? 0) - (first.article.publishedAt?.getTime() ?? 0),
  )
  byRecency.forEach((authorship, recencyIndex) => {
    for (const link of authorship.affiliations) {
      const rawFull = link.affiliation.raw ?? link.affiliation.name
      for (const part of rawFull.split(';')) {
        const raw = part.replace(/\s*Electronic address:.*$/i, '').trim().replace(/\.$/, '').trim()
        const key = affiliationKey(raw)
        if (raw.length < 6 || key.length < 4) continue
        const existing = byKey.get(key)
        if (existing) existing.count += 1
        else byKey.set(key, { raw, count: 1, recency: recencyIndex })
      }
    }
  })
  return [...byKey.values()]
    .sort((first, second) => second.count - first.count || first.recency - second.recency)
    .slice(0, AFFILIATION_MAX)
    .map((entry) => ({ raw: entry.raw, isOurs: isOurs(entry.raw) }))
}

export async function getAuthorDetail(id: string): Promise<AuthorDetail> {
  const [author, ownCentres] = await Promise.all([
    prisma.author.findUnique({
      where: { id },
      select: {
        paperAffiliations: { orderBy: { order: 'asc' }, select: { raw: true } },
        user: { select: { firstName: true, lastName: true, email: true, position: true, emailVerified: true, applications: true } },
        authorships: {
          select: {
            order: true,
            article: { select: { id: true, title: true, publishedAt: true, publishedJournal: { select: { name: true } }, _count: { select: { authorships: true } } } },
            affiliations: { orderBy: { order: 'asc' }, select: { affiliation: { select: { raw: true, name: true } } } },
          },
        },
      },
    }),
    prisma.centre.findMany({ where: { isOwn: true }, select: { name: true } }),
  ])
  if (!author) return { affiliations: [], affiliationsDerived: false, publications: [], portalUser: null }

  const ownNames = ownCentres.map((centre) => centre.name.toLowerCase())
  const isOurs = (raw: string) => {
    const lowered = raw.toLowerCase()
    return ownNames.some((name) => lowered.includes(name)) || lowered.includes('lariboisi')
  }

  const publications = author.authorships
    .map((authorship) => ({
      id: authorship.article.id,
      title: authorship.article.title,
      journal: authorship.article.publishedJournal?.name ?? null,
      year: authorship.article.publishedAt ? authorship.article.publishedAt.getFullYear() : null,
      position: authorship.order,
      authorsCount: authorship.article._count.authorships,
    }))
    .sort((first, second) => (second.year ?? 0) - (first.year ?? 0))

  const storedAffiliations = author.paperAffiliations
    .map((affiliation) => affiliation.raw.trim())
    .filter(Boolean)
    .map((raw) => ({ raw, isOurs: isOurs(raw) }))

  let affiliations = storedAffiliations
  let affiliationsDerived = false
  if (affiliations.length === 0) {
    affiliations = deriveAffiliations(author.authorships, isOurs)
    affiliationsDerived = affiliations.length > 0
  }

  return {
    affiliations,
    affiliationsDerived,
    publications,
    portalUser: author.user
      ? {
          name: `${author.user.firstName ?? ''} ${author.user.lastName ?? ''}`.trim(),
          email: author.user.email,
          position: author.user.position,
          active: author.user.emailVerified,
          applications: author.user.applications,
        }
      : null,
  }
}

export type LinkableUser = { id: string; firstName: string | null; lastName: string | null; email: string }

export async function listLinkableUsers(): Promise<LinkableUser[]> {
  return prisma.user.findMany({
    orderBy: [{ lastName: 'asc' }, { email: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true },
  })
}

export type UpdateAuthorInput = {
  id: string
  firstName: string
  lastName: string
  degrees?: string | null
  email?: string | null
  orcid?: string | null
  userId?: string | null
  centreId?: string | null
}

export async function updateAuthor(data: UpdateAuthorInput) {
  const type = await resolveAuthorType(data.centreId ?? null)
  return prisma.author.update({
    where: { id: data.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      degrees: data.degrees ?? null,
      email: data.email ?? null,
      orcid: data.orcid ?? null,
      userId: data.userId ?? null,
      centreId: data.centreId ?? null,
      type,
    },
    select: { id: true },
  })
}

export type CreateAuthorInput = {
  firstName: string
  lastName: string
  type?: AuthorType
  degrees?: string | null
  emails?: string[]
  orcid?: string | null
  centreId?: string | null
  centreIds?: string[]
  affiliations?: string[]
  userId?: string | null
}

export function buildAuthorCreateData(input: CreateAuthorInput): Prisma.AuthorUncheckedCreateInput {
  const emails = (input.emails ?? []).map((email) => email.trim()).filter(Boolean)
  const centreIds = input.centreIds ?? (input.centreId ? [input.centreId] : [])
  const affiliations = (input.affiliations ?? []).map((raw) => raw.trim()).filter(Boolean)
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    type: input.type ?? 'OUR_TEAM',
    degrees: input.degrees ?? null,
    emails,
    email: emails[0] ?? null,
    orcid: input.orcid ?? null,
    centreId: centreIds[0] ?? null,
    userId: input.userId ?? null,
    centres: {
      create: centreIds.map((centreId, index) => ({
        centreId,
        isPrimary: index === 0,
        order: index,
      })),
    },
    paperAffiliations: {
      create: affiliations.map((raw, index) => ({ raw, order: index })),
    },
  }
}

export async function resolveAuthorType(centreId: string | null | undefined): Promise<AuthorType> {
  if (!centreId) return 'EXTERNAL'
  const centre = await prisma.centre.findUnique({ where: { id: centreId }, select: { isOwn: true } })
  return centre?.isOwn ? 'OUR_TEAM' : 'EXTERNAL'
}

export async function createAuthor(input: CreateAuthorInput) {
  const primaryCentreId = input.centreIds?.[0] ?? input.centreId ?? null
  const type = await resolveAuthorType(primaryCentreId)
  return prisma.author.create({
    data: buildAuthorCreateData({ ...input, type }),
    select: { id: true, firstName: true, lastName: true },
  })
}

export type AuthorOption = { id: string; firstName: string; lastName: string; centreId: string | null }

export async function listAuthorOptions(): Promise<AuthorOption[]> {
  return prisma.author.findMany({
    orderBy: [{ lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, centreId: true },
  })
}

export async function deleteAuthor(id: string) {
  return prisma.author.delete({ where: { id }, select: { id: true } })
}

export async function mergeAuthors(
  keepId: string,
  mergeIds: string[],
): Promise<{ reassigned: number; dropped: number; deleted: number }> {
  const sources = mergeIds.filter((id) => id !== keepId)
  if (sources.length === 0) return { reassigned: 0, dropped: 0, deleted: 0 }

  return prisma.$transaction(async (tx) => {
    const keeperArticleIds = (
      await tx.authorship.findMany({ where: { authorId: keepId }, select: { articleId: true } })
    ).map((authorship) => authorship.articleId)
    let reassigned = 0
    let dropped = 0
    for (const sourceId of sources) {
      const sourceAuthorships = await tx.authorship.findMany({
        where: { authorId: sourceId },
        select: { id: true, articleId: true },
      })
      const plan = planAuthorshipMerge(keeperArticleIds, sourceAuthorships)
      if (plan.dropIds.length) await tx.authorship.deleteMany({ where: { id: { in: plan.dropIds } } })
      if (plan.reassignIds.length) {
        await tx.authorship.updateMany({ where: { id: { in: plan.reassignIds } }, data: { authorId: keepId } })
        keeperArticleIds.push(
          ...sourceAuthorships.filter((authorship) => plan.reassignIds.includes(authorship.id)).map((authorship) => authorship.articleId),
        )
      }
      reassigned += plan.reassignIds.length
      dropped += plan.dropIds.length
    }
    const keeper = await tx.author.findUnique({ where: { id: keepId }, select: { orcid: true } })
    if (!keeper?.orcid) {
      const sourceWithOrcid = await tx.author.findFirst({
        where: { id: { in: sources }, NOT: { orcid: null } },
        select: { orcid: true },
      })
      if (sourceWithOrcid?.orcid) {
        await tx.author.update({ where: { id: keepId }, data: { orcid: sourceWithOrcid.orcid } })
      }
    }
    await tx.author.deleteMany({ where: { id: { in: sources } } })
    return { reassigned, dropped, deleted: sources.length }
  }, { timeout: 20000, maxWait: 5000 })
}

export async function recomputeAuthorCentres(): Promise<{ updated: number }> {
  const links = await prisma.authorshipAffiliation.findMany({
    select: { authorship: { select: { authorId: true } }, affiliation: { select: { centreId: true } } },
  })
  const ownCentres = new Set((await prisma.centre.findMany({ where: { isOwn: true }, select: { id: true } })).map((centre) => centre.id))
  const byAuthor = new Map<string, string[]>()
  for (const link of links) {
    if (!link.affiliation.centreId) continue
    const list = byAuthor.get(link.authorship.authorId) ?? []
    list.push(link.affiliation.centreId)
    byAuthor.set(link.authorship.authorId, list)
  }
  let updated = 0
  for (const [authorId, centreIds] of byAuthor) {
    const primary = pickPrimaryCentre(centreIds, ownCentres)
    if (primary) {
      await prisma.author.update({ where: { id: authorId }, data: { centreId: primary } })
      updated += 1
    }
  }
  return { updated }
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export { PUBLICATIONS_AUTHORS_TAG, PUBLICATIONS_ARTICLES_TAG }

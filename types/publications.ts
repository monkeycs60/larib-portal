export type PubmedCandidate = {
  pmid: string
  title: string
  journal: string
  year: number | null
  firstAuthor: string | null
  lastAuthor: string | null
  doi: string | null
}

export type PubmedAuthor = {
  lastName: string
  foreName: string | null
  initials: string | null
  affiliation: string | null
  orcid: string | null
}

export type PubmedRecord = {
  pmid: string
  title: string
  abstract: string | null
  doi: string | null
  publishedAt: string | null // ISO date or null
  receivedAt: string | null // ISO date or null (PubMed History PubStatus="received")
  acceptedAt: string | null // ISO date or null (PubMed History PubStatus="accepted")
  journal: { name: string; isoAbbrev: string | null; issn: string | null; publisher: string | null }
  authors: PubmedAuthor[]
}

export type ImportReport = {
  articlesCreated: number
  articlesSkipped: number
  authorsCreated: number
  journalsCreated: number
  errors: Array<{ pmid: string; message: string }>
}

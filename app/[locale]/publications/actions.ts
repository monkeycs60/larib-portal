'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { appAdminAction } from '@/actions/safe-action'
import { searchByAuthor, fetchByPmids } from '@/lib/services/publications/pubmed'
import {
  importRecords,
  PUBLICATIONS_JOURNALS_TAG,
  PUBLICATIONS_AUTHORS_TAG,
  PUBLICATIONS_ARTICLES_TAG,
} from '@/lib/services/publications/import'

export const searchBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ anchor: z.string().min(1), retmax: z.number().int().min(1).max(500).optional() }))
  .action(async ({ parsedInput }) => {
    return searchByAuthor(parsedInput.anchor, parsedInput.retmax ?? 200)
  })

export const importBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ pmids: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const records = await fetchByPmids(parsedInput.pmids)
    const report = await importRecords(records, ctx.userId)
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return report
  })

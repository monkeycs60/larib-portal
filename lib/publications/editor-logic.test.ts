import { describe, it, expect } from 'vitest'
import { deriveHeaderContext, isDraftDeletable, pickAuthorRequestRecipients } from './editor-logic'

describe('deriveHeaderContext', () => {
  it('uses the latest submission journal + date', () => {
    const ctx = deriveHeaderContext({
      submissions: [
        { journalName: 'N Engl J Med', submittedAt: '2025-01-12T00:00:00.000Z' },
        { journalName: 'European Heart Journal', submittedAt: '2025-05-18T00:00:00.000Z' },
      ],
      publishedJournal: null,
      publishedAt: null,
    })
    expect(ctx).toEqual({ journal: 'European Heart Journal', at: '2025-05-18T00:00:00.000Z' })
  })
  it('falls back to the published journal when there are no submissions', () => {
    const ctx = deriveHeaderContext({
      submissions: [],
      publishedJournal: 'Circulation',
      publishedAt: '2024-02-01T00:00:00.000Z',
    })
    expect(ctx).toEqual({ journal: 'Circulation', at: '2024-02-01T00:00:00.000Z' })
  })
  it('returns nulls when nothing is available', () => {
    expect(deriveHeaderContext({ submissions: [], publishedJournal: null, publishedAt: null })).toEqual({
      journal: null,
      at: null,
    })
  })
})

describe('isDraftDeletable', () => {
  it('is deletable only when empty title and IN_PREPARATION', () => {
    expect(isDraftDeletable('', 'IN_PREPARATION')).toBe(true)
    expect(isDraftDeletable('  ', 'IN_PREPARATION')).toBe(true)
    expect(isDraftDeletable('Title', 'IN_PREPARATION')).toBe(false)
    expect(isDraftDeletable('', 'UNDER_REVIEW')).toBe(false)
  })
})

describe('pickAuthorRequestRecipients', () => {
  it('keeps super-admins and PUBLICATIONS app-admins, dedups, drops others', () => {
    const emails = pickAuthorRequestRecipients([
      { email: 'a@x.io', role: 'ADMIN', adminApplications: [] },
      { email: 'b@x.io', role: 'USER', adminApplications: ['PUBLICATIONS'] },
      { email: 'c@x.io', role: 'USER', adminApplications: ['CONGES'] },
      { email: 'a@x.io', role: 'ADMIN', adminApplications: ['PUBLICATIONS'] },
    ])
    expect(emails).toEqual(['a@x.io', 'b@x.io'])
  })
})

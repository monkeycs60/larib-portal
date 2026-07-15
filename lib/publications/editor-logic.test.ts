import { describe, it, expect } from 'vitest'
import { isDraftDeletable, pickAuthorRequestRecipients } from './editor-logic'

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

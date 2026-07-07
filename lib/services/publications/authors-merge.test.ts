import { describe, it, expect } from 'vitest'
import { planAuthorshipMerge } from './authors-merge'

describe('planAuthorshipMerge', () => {
  it('reassigns authorships on articles the keeper is absent from, drops the rest', () => {
    const keeperArticleIds = ['a1', 'a2']
    const sourceAuthorships = [
      { id: 's1', articleId: 'a2' }, // keeper already on a2 -> drop
      { id: 's2', articleId: 'a3' }, // keeper absent from a3 -> reassign
    ]
    const plan = planAuthorshipMerge(keeperArticleIds, sourceAuthorships)
    expect(plan).toEqual({ reassignIds: ['s2'], dropIds: ['s1'] })
  })

  it('reassigns everything when the keeper shares no articles', () => {
    const plan = planAuthorshipMerge(['a1'], [{ id: 's1', articleId: 'a9' }, { id: 's2', articleId: 'a8' }])
    expect(plan).toEqual({ reassignIds: ['s1', 's2'], dropIds: [] })
  })
})

export type MergeAuthorship = { id: string; articleId: string }
export type AuthorshipMergePlan = { reassignIds: string[]; dropIds: string[] }

export function planAuthorshipMerge(keeperArticleIds: string[], sourceAuthorships: MergeAuthorship[]): AuthorshipMergePlan {
  const keeperArticles = new Set(keeperArticleIds)
  const reassignIds: string[] = []
  const dropIds: string[] = []
  for (const authorship of sourceAuthorships) {
    if (keeperArticles.has(authorship.articleId)) dropIds.push(authorship.id)
    else reassignIds.push(authorship.id)
  }
  return { reassignIds, dropIds }
}

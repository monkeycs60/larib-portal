export function pickPrimaryCentre(centreIds: string[], ownCentreIds: Set<string>): string | null {
  if (centreIds.length === 0) return null
  const counts = new Map<string, number>()
  for (const id of centreIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  let best: string | null = null
  let bestCount = -1
  for (const [id, count] of counts) {
    const better = count > bestCount || (count === bestCount && ownCentreIds.has(id) && !(best !== null && ownCentreIds.has(best)))
    if (better) {
      best = id
      bestCount = count
    }
  }
  return best
}

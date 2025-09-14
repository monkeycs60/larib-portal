import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type BestofAttemptState = {
  lastAttemptIdByCase: Record<string, string | undefined>
}

type BestofAttemptActions = {
  setLastAttemptId: (caseId: string, id: string) => void
  getLastAttemptId: (caseId: string) => string | undefined
}

export const useBestofAttemptStore = create<BestofAttemptState & BestofAttemptActions>()(
  devtools(
    (set, get) => ({
      lastAttemptIdByCase: {},
      setLastAttemptId: (caseId, id) => set((state) => ({
        lastAttemptIdByCase: { ...state.lastAttemptIdByCase, [caseId]: id },
      })),
      getLastAttemptId: (caseId) => get().lastAttemptIdByCase[caseId],
    }),
    { name: 'bestof-attempts' },
  ),
)


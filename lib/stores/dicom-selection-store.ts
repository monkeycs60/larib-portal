import { create } from 'zustand'

type DicomSelectionState = {
  selectedCaseIds: Set<string>
  casesWithDicoms: Set<string>
}

type DicomSelectionActions = {
  toggleCase: (caseId: string) => void
  selectAll: (caseIds: string[]) => void
  deselectAll: () => void
  setCasesWithDicoms: (caseIds: string[]) => void
}

export const useDicomSelectionStore = create<DicomSelectionState & DicomSelectionActions>((set) => ({
  selectedCaseIds: new Set(),
  casesWithDicoms: new Set(),

  toggleCase: (caseId) =>
    set((state) => {
      const next = new Set(state.selectedCaseIds)
      if (next.has(caseId)) {
        next.delete(caseId)
      } else {
        next.add(caseId)
      }
      return { selectedCaseIds: next }
    }),

  selectAll: (caseIds) =>
    set(() => ({
      selectedCaseIds: new Set(caseIds),
    })),

  deselectAll: () =>
    set(() => ({
      selectedCaseIds: new Set(),
    })),

  setCasesWithDicoms: (caseIds) =>
    set(() => ({
      casesWithDicoms: new Set(caseIds),
    })),
}))

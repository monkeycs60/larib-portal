import { create } from 'zustand'

type BestofLoadingState = {
  loading: boolean
  setLoading: (v: boolean) => void
}

export const useBestofLoadingStore = create<BestofLoadingState>((set) => ({
  loading: false,
  setLoading: (v) => set({ loading: v }),
}))


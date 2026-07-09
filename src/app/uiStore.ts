import { create } from 'zustand'

interface UiState {
  // Which training the commander/senior/admin is currently working on.
  selectedTrainingId: string | null
  setSelectedTraining: (id: string | null) => void
}

export const useUi = create<UiState>()((set) => ({
  selectedTrainingId: null,
  setSelectedTraining: (id) => set({ selectedTrainingId: id })
}))

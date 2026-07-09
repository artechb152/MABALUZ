import { create } from 'zustand'
import type { User } from '@/types'

interface SessionState {
  currentUser: User | null
  soldierPreview: boolean
  signIn: (user: User) => void
  signOut: () => void
  setSoldierPreview: (on: boolean) => void
}

export const useSession = create<SessionState>()((set) => ({
  currentUser: null,
  soldierPreview: false,
  signIn: (user) => set({ currentUser: user, soldierPreview: false }),
  signOut: () => set({ currentUser: null, soldierPreview: false }),
  setSoldierPreview: (on) => set({ soldierPreview: on })
}))

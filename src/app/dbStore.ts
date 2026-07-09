import { create } from 'zustand'
import type {
  AppNotification,
  CoursePreset,
  FaqItem,
  FeatureToggles,
  GuestLectureDetails,
  GuestLecturer,
  ImportedTrainingTemplate,
  MessageLogEntry,
  Schedule,
  SharedEventChangeRequest,
  SharedEventGroup,
  Training,
  User
} from '@/types'
import { mockUsers } from '@/data/mock/users'
import { mockTrainings } from '@/data/mock/trainings'
import { mockLecturers } from '@/data/mock/lecturers'
import {
  mockChangeRequests,
  mockGuestLectureDetails,
  mockNotifications,
  mockSchedules,
  mockSharedGroups
} from '@/data/mock/seedSchedules'
import { mockFaq } from '@/data/mock/faq'
import { mockPresets } from '@/data/mock/presets'
import { defaultFeatureToggles } from '@/data/mock/toggles'

// The in-memory "database". UI components must not mutate it directly —
// they go through src/data/services/*, which is the future MongoDB seam.
export interface DbState {
  users: User[]
  trainings: Training[]
  schedules: Schedule[]
  lecturers: GuestLecturer[]
  guestLectureDetails: GuestLectureDetails[]
  sharedGroups: SharedEventGroup[]
  changeRequests: SharedEventChangeRequest[]
  messages: MessageLogEntry[]
  notifications: AppNotification[]
  faq: FaqItem[]
  presets: CoursePreset[]
  toggles: FeatureToggles
  importedTemplates: ImportedTrainingTemplate[]
  patch: (partial: Partial<DbState>) => void
  reset: () => void
}

function seedState(): Omit<DbState, 'patch' | 'reset'> {
  return {
    users: [...mockUsers],
    trainings: mockTrainings.map((t) => ({ ...t })),
    schedules: mockSchedules.map((s) => ({ ...s, events: [...s.events] })),
    lecturers: [...mockLecturers],
    guestLectureDetails: [...mockGuestLectureDetails],
    sharedGroups: mockSharedGroups.map((g) => ({ ...g })),
    changeRequests: mockChangeRequests.map((r) => ({ ...r })),
    messages: [],
    notifications: [...mockNotifications],
    faq: [...mockFaq],
    presets: [...mockPresets],
    toggles: { ...defaultFeatureToggles },
    importedTemplates: []
  }
}

export const useDb = create<DbState>()((set) => ({
  ...seedState(),
  patch: (partial) => set(partial),
  reset: () => set(seedState())
}))

/** Convenience for services (non-React callers). */
export const db = {
  get: () => useDb.getState(),
  patch: (partial: Partial<DbState>) => useDb.getState().patch(partial),
  reset: () => useDb.getState().reset()
}

import { db } from '@/app/dbStore'
import type { FaqItem, FeatureToggles, MessageLogEntry } from '@/types'
import { newId } from '@/lib/ids'

export async function getToggles(): Promise<FeatureToggles> {
  return db.get().toggles
}

export async function setToggle<K extends keyof FeatureToggles>(
  key: K,
  value: FeatureToggles[K]
): Promise<FeatureToggles> {
  const toggles = { ...db.get().toggles, [key]: value }
  db.patch({ toggles })
  return toggles
}

export async function listFaq(): Promise<FaqItem[]> {
  return [...db.get().faq].sort((a, b) => a.order - b.order)
}

export async function upsertFaqItem(item: Omit<FaqItem, 'id'> & { id?: string }): Promise<FaqItem> {
  const existing = item.id ? db.get().faq.find((f) => f.id === item.id) : undefined
  if (existing) {
    const updated = { ...existing, ...item, id: existing.id }
    db.patch({ faq: db.get().faq.map((f) => (f.id === existing.id ? updated : f)) })
    return updated
  }
  const created: FaqItem = { ...item, id: newId('faq') }
  db.patch({ faq: [...db.get().faq, created] })
  return created
}

export async function deleteFaqItem(id: string): Promise<void> {
  db.patch({ faq: db.get().faq.filter((f) => f.id !== id) })
}

export async function listMessageLog(): Promise<MessageLogEntry[]> {
  return [...db.get().messages].sort((a, b) => b.sentAt.localeCompare(a.sentAt))
}

export function getSupportPhone(): string | null {
  const phone = import.meta.env.VITE_SUPPORT_PHONE
  return phone && phone.trim() ? phone.trim() : null
}

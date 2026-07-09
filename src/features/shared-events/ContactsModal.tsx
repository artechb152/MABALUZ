import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { Icon } from '@/assets/icons/Icon'
import { buttons } from '@/lib/hebrewCopy'
import { pendingContacts } from '@/data/services/sharedEventService'
import { sharedCopy } from './copy'

interface ContactsModalProps {
  requestId: string | null
  onClose: () => void
}

export function ContactsModal({ requestId, onClose }: ContactsModalProps) {
  const [contacts, setContacts] = useState<{ name: string; phone?: string; trainingName: string }[]>([])

  useEffect(() => {
    if (requestId) void pendingContacts(requestId).then(setContacts)
  }, [requestId])

  return (
    <Modal open={requestId != null} onClose={onClose} title={buttons.showContactDetails} size="md">
      {contacts.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">{sharedCopy.noContacts}</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-line bg-panel-solid px-4 py-3">
              <div>
                <div className="text-sm font-medium text-ink">{c.name}</div>
                <div className="text-xs text-ink-muted">{c.trainingName}</div>
              </div>
              {c.phone ? (
                <a
                  href={`tel:${c.phone}`}
                  className="focus-ring tnum flex items-center gap-1.5 rounded-xl bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-hover"
                >
                  <Icon name="phone" size={14} />
                  {c.phone}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

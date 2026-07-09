import type { EmailProvider, FeatureToggles, MessageLogEntry, SendEmailInput, SendEmailResult } from '@/types'
import { db } from '@/app/dbStore'
import { newId } from '@/lib/ids'
import { nowISO } from '@/lib/time'

/** Mock provider: "sends" by appending to the message-center log. */
export const mockEmailProvider: EmailProvider = {
  name: 'mock',
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const entry: MessageLogEntry = {
      id: newId('msg'),
      recipient: input.to,
      subject: input.subject,
      bodyPreview: input.body.slice(0, 120),
      body: input.body,
      kind: input.kind,
      eventId: input.eventId,
      trainingId: input.trainingId,
      sentAt: nowISO(),
      status: 'SENT',
      provider: 'mock',
      confirmationToken: input.confirmationToken
    }
    db.patch({ messages: [entry, ...db.get().messages] })
    return { ok: true, messageId: entry.id }
  }
}

/** Placeholder for the future Microsoft Graph integration (feature-toggled off). */
export const outlookEmailProvider: EmailProvider = {
  name: 'outlook',
  async sendEmail(): Promise<SendEmailResult> {
    throw new Error('Outlook integration is not implemented yet — enable via feature toggle in a future version.')
  }
}

export function getActiveProvider(toggles: FeatureToggles): EmailProvider {
  return toggles.enableOutlookIntegration ? outlookEmailProvider : mockEmailProvider
}

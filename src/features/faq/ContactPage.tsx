import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/assets/icons/Icon'
import { app, contact, nav, settingsCopy } from '@/lib/hebrewCopy'
import { getSupportPhone } from '@/data/services/adminService'

export function ContactPage() {
  const phone = getSupportPhone()

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={nav.contact} />
      <div className="glass p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon name="contact" size={26} />
        </div>
        <p className="mb-3 text-base font-medium leading-relaxed text-ink">{app.orgCredit}</p>
        <p className="mb-6 text-sm text-ink-muted">{contact.body}</p>
        {phone ? (
          <a
            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="focus-ring tnum inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Icon name="phone" size={16} />
            {contact.whatsappLabel}: {phone}
          </a>
        ) : (
          <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
            {settingsCopy.supportContactMissing}
          </p>
        )}
      </div>
    </div>
  )
}

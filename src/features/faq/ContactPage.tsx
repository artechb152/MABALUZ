import { PageHeader } from '@/components/PageHeader'
import { app, contact, nav, settingsCopy } from '@/lib/hebrewCopy'
import { getSupportPhone } from '@/data/services/adminService'

export function ContactPage() {
  const phone = getSupportPhone()

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={nav.contact} />
      <div className="card-tex p-8 text-center">
        <p className="mb-3 text-[18px] font-medium leading-relaxed text-ink">{app.orgCredit}</p>
        <p className="mb-6 text-[15px] text-ink-muted">{contact.body}</p>
        {phone ? (
          <a
            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="focus-ring tnum inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            {contact.whatsappLabel}: {phone}
          </a>
        ) : (
          <p className="rounded-xl bg-warning-soft px-4 py-3 text-[15px] text-warning">
            {settingsCopy.supportContactMissing}
          </p>
        )}
      </div>
    </div>
  )
}

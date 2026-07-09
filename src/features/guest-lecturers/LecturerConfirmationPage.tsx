import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Wordmark } from '@/components/Wordmark'
import { Icon } from '@/assets/icons/Icon'
import { buttons, lecturers as lecturersCopy } from '@/lib/hebrewCopy'
import { confirmLectureByToken } from '@/data/services/lecturerService'
import { lectCopy } from './copy'

/** Mock destination of the confirmation button in the reminder email. */
export function LecturerConfirmationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>(() =>
    token ? 'loading' : 'invalid'
  )
  const [lectureTitle, setLectureTitle] = useState<string | undefined>()

  useEffect(() => {
    if (!token) return
    void confirmLectureByToken(token).then((result) => {
      setLectureTitle(result.lectureTitle)
      setState(result.ok ? 'ok' : 'invalid')
    })
  }, [token])

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="glass w-full max-w-md p-8 text-center">
        <Wordmark size="lg" className="mb-4 inline-block" />

        {state === 'loading' ? (
          <p className="t-body py-6 text-ink-muted">...</p>
        ) : state === 'ok' ? (
          <div className="py-4">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-success/45 text-success">
              <Icon name="success" size={24} />
            </span>
            <p className="t-subhead">{lectCopy.confirmThanks}</p>
            {lectureTitle ? (
              <p className="t-body mt-1 text-ink-muted">
                {lectCopy.confirmFor}: {lectureTitle}
              </p>
            ) : null}
            <p className="t-body mt-2 text-success">{lecturersCopy.lecturerConfirmed}</p>
          </div>
        ) : (
          <div className="py-4">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-danger/45 text-danger">
              <Icon name="warning" size={24} />
            </span>
            <p className="t-body text-ink">{lectCopy.confirmInvalid}</p>
          </div>
        )}

        <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
          {buttons.close}
        </Button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

/**
 * Current wall-clock time, refreshed on an interval (default every minute).
 * Drives the calendar's "now" line and current-block highlight.
 */
export function useNow(intervalMs = 60000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

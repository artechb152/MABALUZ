let runtimeCounter = 0

/** Runtime id for user-created entities. Mock seed data uses literal ids. */
export function newId(prefix: string): string {
  runtimeCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${runtimeCounter}`
}

/**
 * Deterministic sequential id factory — used by the scheduling engine so a
 * given input always produces identical output (testability).
 */
export function makeIdFactory(prefix: string): () => string {
  let n = 0
  return () => {
    n += 1
    return `${prefix}_${n}`
  }
}

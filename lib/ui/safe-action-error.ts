export function getActionErrorMessage(error: unknown, fallback: string): string {
  try {
    const err = error as { serverError?: unknown; message?: unknown }
    if (typeof err?.serverError === 'string') return err.serverError
    if (typeof err?.message === 'string') return err.message
    return fallback
  } catch {
    return fallback
  }
}


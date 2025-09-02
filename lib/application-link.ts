export function applicationLink(locale: string, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  // avoid duplicating locale if already present
  if (cleanPath.startsWith(`/${locale}/`) || cleanPath === `/${locale}`) {
    return cleanPath
  }
  if (cleanPath === '/') return `/${locale}`
  return `/${locale}${cleanPath}`
}


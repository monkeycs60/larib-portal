type WelcomeEmailParams = {
  to: string
  locale: 'en' | 'fr'
  firstName?: string
  lastName?: string
  position?: string | null
  setupLink: string
  accessEndDate?: Date | null
}

function renderWelcomeEmail({ locale, firstName, lastName, position, setupLink, accessEndDate }: WelcomeEmailParams) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const subject = locale === 'fr'
    ? 'Bienvenue sur la plateforme Clinical Case Training'
    : 'Welcome to Clinical Case Training Platform'

  const greeting = locale === 'fr' ? 'Bonjour' : 'Dear'
  const nameLine = fullName ? ` ${fullName}` : ' User'
  const intro = locale === 'fr'
    ? `Bienvenue sur la plateforme Clinical Case Training ! Votre compte a été créé${position ? ` avec le poste de ${position}` : ''}.`
    : `Welcome to the Clinical Case Training Platform! Your account has been created${position ? ` with the position of ${position}` : ''}.`
  const ctaText = locale === 'fr' ? 'Définir votre mot de passe' : 'Set your password'
  const expiresText = locale === 'fr' ? 'La date de fin d\'accès est le' : 'Your account access will expire on'

  const accessLine = accessEndDate ? `\n\n${expiresText} ${accessEndDate.toISOString().slice(0,10)}.` : ''

  const text = `${greeting}${nameLine},\n\n${intro}\n\nVeuillez cliquer sur le lien ci-dessous pour définir votre mot de passe et compléter votre profil:\n\n${setupLink}${accessLine}`

  const html = `
    <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
      <p>${greeting}${nameLine},</p>
      <p>${intro}</p>
      <p><a href="${setupLink}" style="background:#111827;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;display:inline-block">${ctaText}</a></p>
      ${accessEndDate ? `<p>${expiresText} <strong>${accessEndDate.toISOString().slice(0,10)}</strong>.</p>` : ''}
    </div>
  `
  return { subject, text, html }
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ id: string } | { error: string }>
{
  const { subject, text, html } = renderWelcomeEmail(params)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const from = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      text,
      html,
    }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = await res.json() as { id?: string }
  return { id: json.id ?? '' }
}


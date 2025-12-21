type WelcomeEmailParams = {
  to: string
  locale: 'en' | 'fr'
  firstName?: string
  lastName?: string
  position?: string | null
  setupLink: string
  accessEndDate?: Date | null
}

function renderWelcomeEmail({ locale, firstName, lastName, setupLink, accessEndDate }: WelcomeEmailParams) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const subject = locale === 'fr'
    ? 'Bienvenue sur le portail Cardio Larib'
    : 'Welcome to Cardio Larib portal'

  const greeting = locale === 'fr' ? 'Bonjour' : 'Dear'
  const nameLine = fullName ? ` ${fullName}` : ''
  const intro = locale === 'fr'
    ? 'Ceci est un message automatique pour vous inviter à rejoindre la plateforme intranet de notre équipe, le portail Cardio Larib.'
    : 'This is an automatic message to invite you to join our team intranet platform, the Cardio Larib Portal.'
  const ctaText = locale === 'fr' ? 'Lien d\'accès' : 'Set up link'
  const expiresText = locale === 'fr' ? 'Votre compte sera valide jusqu\'au' : 'Your account will be valid until'

  const accessLine = accessEndDate ? `\n\n${expiresText} ${accessEndDate.toISOString().slice(0,10)}.` : ''

  const linkInstruction = locale === 'fr'
    ? 'Veuillez cliquer sur le lien ci-dessous pour configurer votre compte :'
    : 'Please click the link below to set up your account:'

  const text = `${greeting}${nameLine},\n\n${intro}\n\n${linkInstruction}\n\n${setupLink}${accessLine}`

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

type ResetPasswordEmailParams = {
  to: string
  resetUrl: string
  locale: 'en' | 'fr'
}

function renderResetPasswordEmail({ resetUrl, locale }: ResetPasswordEmailParams) {
  const subject = locale === 'fr'
    ? 'Réinitialisation de votre mot de passe'
    : 'Reset your password'

  const greeting = locale === 'fr' ? 'Bonjour,' : 'Hello,'
  const intro = locale === 'fr'
    ? 'Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe.'
    : 'You requested to reset your password. Click the link below to create a new password.'
  const ctaText = locale === 'fr' ? 'Réinitialiser mon mot de passe' : 'Reset my password'
  const expiryNote = locale === 'fr'
    ? 'Ce lien expirera dans 1 heure. Si vous n\'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail.'
    : 'This link will expire in 1 hour. If you did not request this reset, you can ignore this email.'

  const text = `${greeting}\n\n${intro}\n\n${resetUrl}\n\n${expiryNote}`

  const html = `
    <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>${intro}</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">${ctaText}</a>
      </p>
      <p style="color:#666;font-size:14px;">${expiryNote}</p>
    </div>
  `
  return { subject, text, html }
}

export async function sendResetPasswordEmail(params: ResetPasswordEmailParams): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderResetPasswordEmail(params)
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

type AccessExtendedEmailParams = {
  to: string
  locale: 'en' | 'fr'
  firstName?: string
  lastName?: string
  oldDepartureDate: Date
  newDepartureDate: Date
}

function renderAccessExtendedEmail({ locale, firstName, lastName, oldDepartureDate, newDepartureDate }: AccessExtendedEmailParams) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const subject = locale === 'fr'
    ? 'Votre accès au portail a été prolongé'
    : 'Your portal access has been extended'

  const greeting = locale === 'fr' ? 'Bonjour' : 'Dear'
  const nameLine = fullName ? ` ${fullName}` : ''
  const intro = locale === 'fr'
    ? 'Bonne nouvelle ! Un administrateur a prolongé votre accès au portail Cardio Larib.'
    : 'Good news! An administrator has extended your access to the Cardio Larib portal.'
  const oldDateLabel = locale === 'fr' ? 'Ancienne date de départ' : 'Previous departure date'
  const newDateLabel = locale === 'fr' ? 'Nouvelle date de départ' : 'New departure date'
  const formatDate = (date: Date) => date.toISOString().slice(0, 10)

  const text = `${greeting}${nameLine},\n\n${intro}\n\n${oldDateLabel}: ${formatDate(oldDepartureDate)}\n${newDateLabel}: ${formatDate(newDepartureDate)}`

  const html = `
    <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${greeting}${nameLine},</p>
      <p>${intro}</p>
      <table style="margin: 20px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #666;">${oldDateLabel}:</td>
          <td style="padding: 8px 0; text-decoration: line-through; color: #999;">${formatDate(oldDepartureDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 16px 8px 0; color: #666;">${newDateLabel}:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #16a34a;">${formatDate(newDepartureDate)}</td>
        </tr>
      </table>
    </div>
  `
  return { subject, text, html }
}

export async function sendAccessExtendedEmail(params: AccessExtendedEmailParams): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderAccessExtendedEmail(params)
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


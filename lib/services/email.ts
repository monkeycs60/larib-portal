type WelcomeEmailParams = {
  to: string
  locale: 'en' | 'fr'
  firstName?: string
  lastName?: string
  position?: string | null
  setupLink: string
  accessEndDate?: Date | null
}

const LOGO_WHITE_URL = 'https://pub-e0c9b869d4ff450c826a4c7850592995.r2.dev/larib-uploads/email/logo-white.png'

const LOGO_BASE64 = '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'

const COLORS = {
  primary: '#003b75',
  accent: '#ff5c82',
  foreground: '#07121e',
  primaryForeground: '#f6f7fa',
  secondary: '#edf2f8',
  mutedForeground: '#576574',
  border: '#ced9e5',
  background: '#fbfcfd',
}

const FONT_SERIF = "Georgia, 'Libre Baskerville', 'Times New Roman', Times, serif"
const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

function emailLayout(body: string, preheader?: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cardio Larib</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:${FONT_SANS};">
  ${preheader ? `<div style="display:none;font-size:1px;color:${COLORS.background};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.background};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <!-- Navy Header -->
          <tr>
            <td align="center" style="background-color:${COLORS.primary};padding:24px 44px;border-radius:12px 12px 0 0;">
              <img src="${LOGO_WHITE_URL}" alt="Cardio Larib" width="160" height="109" style="display:block;border:0;margin:0 auto;" />
            </td>
          </tr>
          <!-- Accent line -->
          <tr>
            <td style="background-color:${COLORS.accent};height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Body Card -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 44px 36px 44px;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};border-bottom:1px solid ${COLORS.border};border-radius:0 0 12px 12px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:18px;color:${COLORS.mutedForeground};text-align:center;">
                Portail intranet Cardio Larib
              </p>
              <p style="margin:6px 0 0 0;font-family:${FONT_SANS};font-size:11px;line-height:16px;color:#b0b5bf;text-align:center;">
                Message automatique &mdash; ne pas r&eacute;pondre
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function renderWelcomeEmail({ locale, firstName, lastName, position, setupLink, accessEndDate }: WelcomeEmailParams) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const subject = locale === 'fr'
    ? 'Bienvenue sur le portail Cardio Larib'
    : 'Welcome to Cardio Larib portal'

  const greeting = locale === 'fr' ? 'Bonjour' : 'Dear'
  const nameLine = fullName ? ` ${fullName}` : ''
  const intro = locale === 'fr'
    ? 'Ceci est un message automatique pour vous inviter à rejoindre la plateforme intranet de notre équipe, le portail Cardio Larib.'
    : 'This is an automatic message to invite you to join our team intranet platform, the Cardio Larib Portal.'
  const ctaText = locale === 'fr' ? 'Configurer votre compte' : 'Set up your account'
  const expiresText = locale === 'fr' ? 'Votre compte sera valide jusqu\'au' : 'Your account will be valid until'

  const accessLine = accessEndDate ? `\n\n${expiresText} ${accessEndDate.toISOString().slice(0,10)}.` : ''

  const linkInstruction = locale === 'fr'
    ? 'Veuillez cliquer sur le lien ci-dessous pour configurer votre compte :'
    : 'Please click the link below to set up your account:'

  const text = `${greeting}${nameLine},\n\n${intro}\n\n${linkInstruction}\n\n${setupLink}${accessLine}`

  const positionBadge = position
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="background-color:${COLORS.secondary};border-radius:6px;padding:6px 14px;font-family:${FONT_SANS};font-size:13px;font-weight:500;color:${COLORS.primary};">
            ${position}
          </td>
        </tr>
      </table>`
    : ''

  const accessEndBlock = accessEndDate
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
        <tr>
          <td style="background-color:#fef9ee;border-left:3px solid #e5a54b;border-radius:4px;padding:14px 18px;">
            <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:#7c5e20;">
              ${expiresText} <strong>${accessEndDate.toISOString().slice(0, 10)}</strong>
            </p>
          </td>
        </tr>
      </table>`
    : ''

  const preheader = locale === 'fr'
    ? 'Vous avez été invité à rejoindre le portail Cardio Larib'
    : 'You have been invited to join the Cardio Larib portal'

  const body = `
    <p style="margin:0 0 6px 0;font-family:${FONT_SERIF};font-size:22px;line-height:30px;color:${COLORS.primary};font-weight:700;">
      ${greeting}${nameLine},
    </p>
    <p style="margin:0 0 24px 0;font-family:${FONT_SERIF};font-size:14px;line-height:20px;color:${COLORS.mutedForeground};">
      ${subject}
    </p>
    <p style="margin:0 0 20px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">
      ${intro}
    </p>
    ${positionBadge}
    <p style="margin:0 0 24px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">
      ${linkInstruction}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:${COLORS.accent};border-radius:8px;">
                <a href="${setupLink}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  ${ctaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${accessEndBlock}`

  const html = emailLayout(body, preheader)
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
    ? 'Ce lien expirera dans 1 heure.'
    : 'This link will expire in 1 hour.'
  const securityNote = locale === 'fr'
    ? 'Si vous n\'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.'
    : 'If you did not request this reset, you can safely ignore this email.'

  const text = `${greeting}\n\n${intro}\n\n${resetUrl}\n\n${expiryNote} ${securityNote}`

  const preheader = locale === 'fr'
    ? 'Votre lien de réinitialisation de mot de passe'
    : 'Your password reset link'

  const body = `
    <p style="margin:0 0 6px 0;font-family:${FONT_SERIF};font-size:22px;line-height:30px;color:${COLORS.primary};font-weight:700;">
      ${greeting}
    </p>
    <p style="margin:0 0 24px 0;font-family:${FONT_SERIF};font-size:14px;line-height:20px;color:${COLORS.mutedForeground};">
      ${subject}
    </p>
    <p style="margin:0 0 32px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">
      ${intro}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:${COLORS.accent};border-radius:8px;">
                <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  ${ctaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="border-top:1px solid ${COLORS.border};padding-top:20px;">
          <p style="margin:0 0 6px 0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.mutedForeground};">
            ${expiryNote}
          </p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.mutedForeground};">
            ${securityNote}
          </p>
        </td>
      </tr>
    </table>`

  const html = emailLayout(body, preheader)
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

type LeaveNotificationEventType = 'created' | 'edited' | 'cancelled'

type LeaveNotificationParams = {
  adminEmails: string[]
  userEmail: string
  locale: 'en' | 'fr'
  eventType: LeaveNotificationEventType
  userName: string
  startDate: string
  endDate: string
  dayCount: number
  remainingDays: number
  reason: string | null
}

function eventTypePillStyle(eventType: LeaveNotificationEventType): { bgColor: string; textColor: string; borderColor: string } {
  const styles: Record<LeaveNotificationEventType, { bgColor: string; textColor: string; borderColor: string }> = {
    created: { bgColor: '#10b981', textColor: '#ffffff', borderColor: '#10b981' },
    edited: { bgColor: '#f59e0b', textColor: '#ffffff', borderColor: '#f59e0b' },
    cancelled: { bgColor: '#ef4444', textColor: '#ffffff', borderColor: '#ef4444' },
  }
  return styles[eventType]
}

function eventTypeLabel(eventType: LeaveNotificationEventType, locale: 'fr' | 'en'): string {
  const labels: Record<LeaveNotificationEventType, Record<'fr' | 'en', string>> = {
    created: { fr: 'Nouvelle demande', en: 'New request' },
    edited: { fr: 'Demande modifiée', en: 'Updated request' },
    cancelled: { fr: 'Demande annulée', en: 'Cancelled request' },
  }
  return labels[eventType][locale]
}

function renderLeaveNotificationEmail({
  locale,
  eventType,
  userName,
  startDate,
  endDate,
  dayCount,
  remainingDays,
  reason,
}: LeaveNotificationParams) {
  const subjects: Record<LeaveNotificationEventType, Record<'fr' | 'en', string>> = {
    created: {
      fr: `Nouvelle demande de congés - ${userName}`,
      en: `New leave request - ${userName}`,
    },
    edited: {
      fr: `Demande de congés modifiée - ${userName}`,
      en: `Leave request updated - ${userName}`,
    },
    cancelled: {
      fr: `Demande de congés annulée - ${userName}`,
      en: `Leave request cancelled - ${userName}`,
    },
  }

  const actions: Record<LeaveNotificationEventType, Record<'fr' | 'en', string>> = {
    created: {
      fr: 'a soumis une demande de congés',
      en: 'submitted a leave request',
    },
    edited: {
      fr: 'a modifié sa demande de congés',
      en: 'updated their leave request',
    },
    cancelled: {
      fr: 'a annulé sa demande de congés',
      en: 'cancelled their leave request',
    },
  }

  const subject = subjects[eventType][locale]
  const action = actions[eventType][locale]

  const daysLabel = locale === 'fr'
    ? (dayCount > 1 ? 'jours ouvrés' : 'jour ouvré')
    : (dayCount > 1 ? 'working days' : 'working day')
  const remainingLabel = locale === 'fr'
    ? (remainingDays > 1 ? 'jours restants' : 'jour restant')
    : (remainingDays > 1 ? 'days remaining' : 'day remaining')
  const dateRange = `${startDate} &rarr; ${endDate}`
  const balanceLine = locale === 'fr'
    ? `Solde restant : ${remainingDays} ${remainingLabel}`
    : `Remaining balance: ${remainingDays} ${remainingLabel}`
  const reasonLine = reason
    ? (locale === 'fr' ? `Raison : ${reason}` : `Reason: ${reason}`)
    : null
  const ctaText = locale === 'fr' ? 'Consulter sur le portail' : 'Review on portal'

  const textParts = [
    `${userName} ${action}`,
    `${startDate} → ${endDate} (${dayCount} ${daysLabel})`,
    balanceLine,
    ...(reasonLine ? [reasonLine] : []),
    '',
    locale === 'fr'
      ? 'Connectez-vous au portail pour consulter cette demande.'
      : 'Log in to the portal to review this request.',
  ]
  const text = textParts.join('\n')

  const pill = eventTypePillStyle(eventType)
  const pillLabel = eventTypeLabel(eventType, locale)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const portalLink = `${appUrl}/${locale}/conges`

  const reasonRow = reason
    ? `<tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};">${locale === 'fr' ? 'Raison' : 'Reason'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};">${reason}</td>
      </tr>`
    : ''

  const preheader = `${userName} ${action}`

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0 0 4px 0;font-family:${FONT_SERIF};font-size:22px;line-height:30px;color:${COLORS.primary};font-weight:700;">
            ${userName}
          </p>
          <p style="margin:0 0 16px 0;font-family:${FONT_SANS};font-size:15px;line-height:22px;color:${COLORS.mutedForeground};">
            ${action}
          </p>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;">
            <tr>
              <td style="background-color:${pill.bgColor};border:1px solid ${pill.borderColor};border-radius:6px;padding:5px 12px;font-family:${FONT_SANS};font-size:12px;font-weight:600;color:${pill.textColor};letter-spacing:0.3px;white-space:nowrap;">
                ${pillLabel}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:${COLORS.secondary};width:140px;">${locale === 'fr' ? 'Dates' : 'Dates'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:${COLORS.secondary};">${dateRange}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};">${locale === 'fr' ? 'Durée' : 'Duration'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:#ffffff;border-top:1px solid ${COLORS.secondary};"><strong>${dayCount}</strong> ${daysLabel}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:13px;color:${COLORS.mutedForeground};background-color:${COLORS.secondary};border-top:1px solid ${COLORS.secondary};">${locale === 'fr' ? 'Solde restant' : 'Remaining'}</td>
        <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};background-color:${COLORS.secondary};border-top:1px solid ${COLORS.secondary};"><strong>${remainingDays}</strong> ${remainingLabel}</td>
      </tr>
      ${reasonRow}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:${COLORS.primary};border-radius:8px;">
                <a href="${portalLink}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  ${ctaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`

  const html = emailLayout(body, preheader)

  return { subject, text, html }
}

export async function sendLeaveNotificationEmail(
  params: LeaveNotificationParams
): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderLeaveNotificationEmail(params)
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
      to: params.adminEmails,
      cc: [params.userEmail],
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

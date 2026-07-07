import { COLORS, FONT_SERIF, FONT_SANS, emailLayout } from '@/lib/email/layout'
import { renderWelcomeEmail, type WelcomeEmailParams } from '@/lib/email/welcome-template'

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

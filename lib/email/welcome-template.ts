import { COLORS, FONT_SERIF, FONT_SANS, emailLayout } from './layout'

export type WelcomeEmailParams = {
  to: string
  locale: 'en' | 'fr'
  firstName?: string
  lastName?: string
  position?: string | null
  setupLink: string
  accessEndDate?: Date | null
}

export function renderWelcomeEmail({ locale, firstName, lastName, position, setupLink, accessEndDate }: WelcomeEmailParams) {
  const isFr = locale === 'fr'
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined

  const subject = isFr ? 'Bienvenue sur le portail Cardio Larib' : 'Welcome to the Cardio Larib portal'
  const eyebrow = isFr ? 'BIENVENUE DANS L’ÉQUIPE' : 'WELCOME TO THE TEAM'
  const greeting = isFr ? 'Bonjour' : 'Dear'
  const nameLine = fullName ? ` ${fullName}` : ''
  const intro = isFr
    ? 'Votre compte sur le portail intranet Cardio Larib a été créé. En quelques clics, configurez votre accès et rejoignez la plateforme de l’équipe.'
    : 'Your account on the Cardio Larib intranet portal has been created. In just a few clicks, set up your access and join the team platform.'
  const stepsTitle = isFr ? 'Trois étapes pour démarrer' : 'Three steps to get started'
  const steps = isFr
    ? ['Cliquez sur le bouton ci-dessous', 'Choisissez votre mot de passe', 'Connectez-vous et explorez vos applications']
    : ['Click the button below', 'Choose your password', 'Sign in and explore your apps']
  const ctaText = isFr ? 'Configurer mon compte' : 'Set up my account'
  const fallbackText = isFr ? 'Le bouton ne fonctionne pas ? Copiez ce lien :' : 'Button not working? Copy this link:'
  const helpText = isFr
    ? 'Une question ? Contactez un administrateur de votre équipe.'
    : 'Any questions? Reach out to a team administrator.'
  const expiresText = isFr ? 'Votre accès est valable jusqu’au' : 'Your access is valid until'
  const linkInstruction = isFr
    ? 'Veuillez cliquer sur le lien ci-dessous pour configurer votre compte :'
    : 'Please click the link below to set up your account:'
  const preheader = isFr
    ? 'Votre accès au portail Cardio Larib est prêt à être configuré'
    : 'Your Cardio Larib portal access is ready to set up'

  const accessLine = accessEndDate ? `\n\n${expiresText} ${accessEndDate.toISOString().slice(0, 10)}.` : ''
  const text = `${greeting}${nameLine},\n\n${intro}\n\n${linkInstruction}\n\n${setupLink}${accessLine}`

  const positionBadge = position
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
        <tr>
          <td style="background-color:${COLORS.secondary};border-radius:6px;padding:6px 14px;font-family:${FONT_SANS};font-size:13px;font-weight:500;color:${COLORS.primary};">
            ${position}
          </td>
        </tr>
      </table>`
    : ''

  const stepsHtml = steps
    .map((step, index) => `
      <tr>
        <td style="padding:0 0 ${index === steps.length - 1 ? '0' : '14px'} 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="24" valign="top">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" width="24" height="24" style="width:24px;height:24px;background-color:${COLORS.accent};border-radius:12px;font-family:${FONT_SANS};font-size:12px;font-weight:700;color:#ffffff;line-height:24px;">${index + 1}</td>
                  </tr>
                </table>
              </td>
              <td style="padding-left:12px;font-family:${FONT_SANS};font-size:14px;line-height:24px;color:${COLORS.foreground};">${step}</td>
            </tr>
          </table>
        </td>
      </tr>`)
    .join('')

  const stepsBlock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.secondary};border-radius:10px;margin:0 0 28px 0;">
      <tr>
        <td style="padding:20px 22px;">
          <p style="margin:0 0 14px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${COLORS.primary};">${stepsTitle}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${stepsHtml}</table>
        </td>
      </tr>
    </table>`

  const accessEndBlock = accessEndDate
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
        <tr>
          <td style="background-color:#fef9ee;border-left:3px solid #e5a54b;border-radius:4px;padding:14px 18px;">
            <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:#7c5e20;">
              ${expiresText} <strong>${accessEndDate.toISOString().slice(0, 10)}</strong>
            </p>
          </td>
        </tr>
      </table>`
    : ''

  const body = `
    <p style="margin:0 0 8px 0;font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:1px;color:${COLORS.accent};">
      ${eyebrow}
    </p>
    <p style="margin:0 0 18px 0;font-family:${FONT_SERIF};font-size:26px;line-height:32px;color:${COLORS.primary};font-weight:700;">
      ${greeting}${nameLine},
    </p>
    ${positionBadge}
    <p style="margin:0 0 24px 0;font-family:${FONT_SANS};font-size:15px;line-height:24px;color:${COLORS.foreground};">
      ${intro}
    </p>
    ${stepsBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:${COLORS.accent};border-radius:8px;box-shadow:0 2px 6px rgba(255,92,130,0.35);">
                <a href="${setupLink}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  ${ctaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 6px 0;font-family:${FONT_SANS};font-size:12px;line-height:18px;color:${COLORS.mutedForeground};text-align:center;">
      ${fallbackText}
    </p>
    <p style="margin:0 0 4px 0;font-family:${FONT_SANS};font-size:12px;line-height:18px;text-align:center;word-break:break-all;">
      <a href="${setupLink}" target="_blank" style="color:${COLORS.primary};text-decoration:underline;">${setupLink}</a>
    </p>
    ${accessEndBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
      <tr>
        <td style="border-top:1px solid ${COLORS.border};padding-top:18px;">
          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${COLORS.mutedForeground};">
            ${helpText}
          </p>
        </td>
      </tr>
    </table>`

  const html = emailLayout(body, preheader)
  return { subject, text, html }
}

export const COLORS = {
  primary: '#003b75',
  accent: '#ff5c82',
  foreground: '#07121e',
  primaryForeground: '#f6f7fa',
  secondary: '#edf2f8',
  mutedForeground: '#576574',
  border: '#ced9e5',
  background: '#fbfcfd',
}

export const FONT_SERIF = "Georgia, 'Libre Baskerville', 'Times New Roman', Times, serif"
export const FONT_SANS = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export const LOGO_WHITE_URL = 'https://pub-e0c9b869d4ff450c826a4c7850592995.r2.dev/larib-uploads/email/logo-white.png'

export function emailLayout(body: string, preheader?: string): string {
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

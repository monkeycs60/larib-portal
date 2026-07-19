# Récap congés par email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer automatiquement aux admins congés un email récap (Resend) des personnes en congé chaque 1er du mois (mois en cours) et chaque lundi (semaine ouvrée en cours), via Vercel Cron.

**Architecture:** Deux crons Vercel appellent une route GET unique sécurisée par `CRON_SECRET`. La route calcule la période, récupère les congés `APPROVED`+`PENDING` qui la chevauchent, regroupe les admins CONGES par langue, et envoie un mail par langue. Toute la logique testable (calcul de période, mise en forme des lignes, garde d'auth, regroupement par langue) vit dans `lib/` en fonctions pures ; la route reste mince.

**Tech Stack:** Next.js 15 (App Router, route handler), Prisma, Resend (via `fetch`), date-fns v4, next-intl (déjà en place, mais emails en i18n inline), vitest.

**Références de code existant (à imiter) :**
- Envoi Resend + template : `lib/services/email.ts` (`sendLeaveNotificationEmail`, `renderLeaveNotificationEmail`).
- Layout email : `lib/email/layout.ts` (`emailLayout`, `COLORS`, `FONT_SERIF`, `FONT_SANS`).
- Requête congés + jours fériés : `lib/services/conges/index.ts` (`getLeaveCalendarData`, `getAdminEmails`, `countWorkingDays`, `fetchFrenchHolidays`).
- Pattern route GET : `app/api/bestof/dicoms/check/route.ts` (`NextRequest`/`NextResponse`, `export const runtime = 'nodejs'`).
- Config vitest : `include: ['lib/**/*.test.ts']` → **tous les tests doivent être sous `lib/`**.

---

## File Structure

| Fichier | Responsabilité |
|---------|----------------|
| `lib/services/conges/recap.ts` | **Créer.** Fonctions pures (`getWeekRange`, `getMonthRange`, `buildRecapRows`, `resolvePeriod`, `isAuthorizedCron`, `groupEmailsByLanguage`) + accès données (`getLeaveRecap`, `getCongesAdminRecipients`). Exporte les types partagés. |
| `lib/services/conges/recap.test.ts` | **Créer.** Tests vitest des fonctions pures. |
| `lib/services/email.ts` | **Modifier.** Ajouter `renderLeaveRecapEmail` (exportée, pure) + `sendLeaveRecapEmail`. |
| `lib/services/email.test.ts` | **Créer.** Tests vitest de `renderLeaveRecapEmail` (sujet localisé, lignes, état vide). |
| `app/api/cron/conges-recap/route.ts` | **Créer.** Route GET mince orchestrant les helpers. |
| `vercel.json` | **Créer.** Déclaration des 2 crons. |
| `.env` | **Modifier.** Ajouter `CRON_SECRET` (local ; + à configurer dans Vercel). |

---

## Task 1: Fonctions pures de récap (types + calcul de période + mise en forme + garde route)

**Files:**
- Create: `lib/services/conges/recap.ts`
- Test: `lib/services/conges/recap.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `lib/services/conges/recap.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { differenceInCalendarDays } from 'date-fns'
import {
  getWeekRange,
  getMonthRange,
  buildRecapRows,
  resolvePeriod,
  isAuthorizedCron,
  groupEmailsByLanguage,
} from './recap'

describe('getWeekRange', () => {
  it('returns Monday start-of-day to Friday end-of-day', () => {
    const { start, end } = getWeekRange(new Date('2026-07-08T15:00:00'))
    expect(start.getDay()).toBe(1) // Monday
    expect(end.getDay()).toBe(5) // Friday
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(differenceInCalendarDays(end, start)).toBe(4)
  })
})

describe('getMonthRange', () => {
  it('returns first day to last day of the month', () => {
    const { start, end } = getMonthRange(new Date('2026-07-15T12:00:00'))
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(6) // July, 0-indexed
    expect(end.getDate()).toBe(31)
    expect(end.getMonth()).toBe(6)
  })
})

describe('buildRecapRows', () => {
  const range = getWeekRange(new Date('2026-07-08T12:00:00')) // Mon 2026-07-06 → Fri 2026-07-10

  it('clips leaves to the range, computes working days, sorts by start then name', () => {
    const rows = buildRecapRows(
      [
        {
          userId: 'u2', firstName: 'Bob', lastName: 'B', email: 'bob@x.io', position: 'Nurse',
          startDate: new Date('2026-07-08T00:00:00'), endDate: new Date('2026-07-09T00:00:00'), status: 'PENDING',
        },
        {
          userId: 'u1', firstName: 'Alice', lastName: 'A', email: 'alice@x.io', position: 'Doctor',
          startDate: new Date('2026-07-01T00:00:00'), endDate: new Date('2026-07-31T00:00:00'), status: 'APPROVED',
        },
      ],
      range,
      {},
    )
    expect(rows.map((row) => row.userId)).toEqual(['u1', 'u2'])
    expect(rows[0].startDate.getTime()).toBe(range.start.getTime())
    expect(rows[0].endDate.getTime()).toBe(range.end.getTime())
    expect(rows[0].daysInRange).toBe(5) // full Mon–Fri
    expect(rows[0].status).toBe('APPROVED')
    expect(rows[1].daysInRange).toBe(2) // Wed–Thu
  })

  it('falls back to email when name is empty', () => {
    const rows = buildRecapRows(
      [{
        userId: 'u3', firstName: null, lastName: null, email: 'noname@x.io', position: null,
        startDate: range.start, endDate: range.start, status: 'APPROVED',
      }],
      range,
      {},
    )
    expect(rows[0].name).toBe('noname@x.io')
  })
})

describe('resolvePeriod', () => {
  it('returns monthly only for the exact "monthly" value, weekly otherwise', () => {
    expect(resolvePeriod('monthly')).toBe('monthly')
    expect(resolvePeriod('weekly')).toBe('weekly')
    expect(resolvePeriod(null)).toBe('weekly')
    expect(resolvePeriod('garbage')).toBe('weekly')
  })
})

describe('isAuthorizedCron', () => {
  it('accepts only the exact Bearer secret and requires a configured secret', () => {
    expect(isAuthorizedCron('Bearer secret123', 'secret123')).toBe(true)
    expect(isAuthorizedCron('Bearer wrong', 'secret123')).toBe(false)
    expect(isAuthorizedCron(null, 'secret123')).toBe(false)
    expect(isAuthorizedCron('Bearer secret123', undefined)).toBe(false)
  })
})

describe('groupEmailsByLanguage', () => {
  it('groups recipient emails by language preserving order', () => {
    const grouped = groupEmailsByLanguage([
      { email: 'a@x.io', language: 'FR' },
      { email: 'b@x.io', language: 'EN' },
      { email: 'c@x.io', language: 'FR' },
    ])
    expect(grouped.get('FR')).toEqual(['a@x.io', 'c@x.io'])
    expect(grouped.get('EN')).toEqual(['b@x.io'])
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm run test:unit -- lib/services/conges/recap.test.ts`
Expected: FAIL — `Cannot find module './recap'` / exports undefined.

- [ ] **Step 3: Implémenter les fonctions pures**

Créer `lib/services/conges/recap.ts` (partie pure uniquement pour l'instant) :

```ts
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { countWorkingDays } from './french-holidays'

export type DateRange = { start: Date; end: Date }
export type RecapPeriod = 'weekly' | 'monthly'
export type RecapStatus = 'APPROVED' | 'PENDING'

export type RecapLeaveInput = {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string
  position: string | null
  startDate: Date
  endDate: Date
  status: RecapStatus
}

export type RecapRow = {
  userId: string
  name: string
  position: string | null
  startDate: Date
  endDate: Date
  status: RecapStatus
  daysInRange: number
}

export type RecapRecipient = { email: string; language: 'EN' | 'FR' }

export function getWeekRange(today: Date): DateRange {
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  const friday = addDays(monday, 4)
  return { start: startOfDay(monday), end: endOfDay(friday) }
}

export function getMonthRange(today: Date): DateRange {
  return { start: startOfMonth(today), end: endOfMonth(today) }
}

export function buildRecapRows(
  leaves: RecapLeaveInput[],
  range: DateRange,
  frenchHolidays: Record<string, string>,
): RecapRow[] {
  return leaves
    .map((leave) => {
      const clippedStart = leave.startDate > range.start ? leave.startDate : range.start
      const clippedEnd = leave.endDate < range.end ? leave.endDate : range.end
      const fullName = [leave.firstName, leave.lastName].filter(Boolean).join(' ').trim()
      return {
        userId: leave.userId,
        name: fullName || leave.email,
        position: leave.position,
        startDate: clippedStart,
        endDate: clippedEnd,
        status: leave.status,
        daysInRange: countWorkingDays(clippedStart, clippedEnd, frenchHolidays),
      }
    })
    .sort((first, second) => {
      const byStart = first.startDate.getTime() - second.startDate.getTime()
      return byStart !== 0 ? byStart : first.name.localeCompare(second.name)
    })
}

export function resolvePeriod(rawPeriod: string | null): RecapPeriod {
  return rawPeriod === 'monthly' ? 'monthly' : 'weekly'
}

export function isAuthorizedCron(authorizationHeader: string | null, cronSecret: string | undefined): boolean {
  if (!cronSecret) return false
  return authorizationHeader === `Bearer ${cronSecret}`
}

export function groupEmailsByLanguage(recipients: RecapRecipient[]): Map<'EN' | 'FR', string[]> {
  const grouped = new Map<'EN' | 'FR', string[]>()
  for (const recipient of recipients) {
    const existing = grouped.get(recipient.language) ?? []
    existing.push(recipient.email)
    grouped.set(recipient.language, existing)
  }
  return grouped
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm run test:unit -- lib/services/conges/recap.test.ts`
Expected: PASS (tous les tests verts).

- [ ] **Step 5: Commit**

```bash
git add lib/services/conges/recap.ts lib/services/conges/recap.test.ts
git commit -m "feat(conges): pure helpers for leave recap (period, rows, cron guard)"
```

---

## Task 2: Accès données (congés récap + destinataires admins CONGES)

**Files:**
- Modify: `lib/services/conges/recap.ts` (ajouter les fonctions Prisma)

> Ces fonctions font des requêtes Prisma : pas de test unitaire isolé (couvertes par le typecheck + vérif manuelle en Task 6). La logique pure qu'elles utilisent (`buildRecapRows`) est déjà testée en Task 1.

- [ ] **Step 1: Ajouter les imports Prisma en tête de `recap.ts`**

En haut de `lib/services/conges/recap.ts`, ajouter sous les imports existants :

```ts
import { prisma } from '@/lib/prisma'
import { LeaveRequestStatus } from '@/app/generated/prisma'
import { fetchFrenchHolidays } from './french-holidays'
```

- [ ] **Step 2: Ajouter `getLeaveRecap` à la fin de `recap.ts`**

```ts
export async function getLeaveRecap(range: DateRange): Promise<RecapRow[]> {
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: { in: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.PENDING] },
      startDate: { lte: range.end },
      endDate: { gte: range.start },
      user: {
        role: 'USER',
        applications: { has: 'CONGES' },
      },
    },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, position: true },
      },
    },
  })

  const frenchHolidays = await fetchFrenchHolidays()

  const inputs: RecapLeaveInput[] = leaves.map((leave) => ({
    userId: leave.userId,
    firstName: leave.user.firstName,
    lastName: leave.user.lastName,
    email: leave.user.email,
    position: leave.user.position,
    startDate: leave.startDate,
    endDate: leave.endDate,
    status: leave.status === LeaveRequestStatus.APPROVED ? 'APPROVED' : 'PENDING',
  }))

  return buildRecapRows(inputs, range, frenchHolidays)
}
```

- [ ] **Step 3: Ajouter `getCongesAdminRecipients` à la fin de `recap.ts`**

```ts
export async function getCongesAdminRecipients(): Promise<RecapRecipient[]> {
  const admins = await prisma.user.findMany({
    where: { adminApplications: { has: 'CONGES' } },
    select: { email: true, language: true },
  })
  return admins.map((admin) => ({ email: admin.email, language: admin.language }))
}
```

- [ ] **Step 4: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur liée à `recap.ts` (les types Prisma `language: 'EN' | 'FR'` et `status` mappé correspondent).

- [ ] **Step 5: Commit**

```bash
git add lib/services/conges/recap.ts
git commit -m "feat(conges): data access for leave recap and CONGES admin recipients"
```

---

## Task 3: Email récap (rendu + envoi Resend)

**Files:**
- Modify: `lib/services/email.ts`
- Test: `lib/services/email.test.ts` (créer)

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `lib/services/email.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { renderLeaveRecapEmail } from './email'

describe('renderLeaveRecapEmail', () => {
  it('includes rows and a localized subject (FR weekly)', () => {
    const { subject, text, html } = renderLeaveRecapEmail({
      to: ['x@x.io'],
      locale: 'fr',
      period: 'weekly',
      rangeStart: new Date('2026-07-06T00:00:00'),
      rangeEnd: new Date('2026-07-10T23:59:59'),
      rows: [{
        userId: 'u1', name: 'Alice A', position: 'Doctor',
        startDate: new Date('2026-07-06T00:00:00'), endDate: new Date('2026-07-08T00:00:00'),
        status: 'PENDING', daysInRange: 3,
      }],
    })
    expect(subject.toLowerCase()).toContain('semaine')
    expect(text).toContain('Alice A')
    expect(html).toContain('Alice A')
    expect(html).toContain('En attente')
  })

  it('shows an empty state when nobody is on leave (FR monthly)', () => {
    const { text, html } = renderLeaveRecapEmail({
      to: ['x@x.io'],
      locale: 'fr',
      period: 'monthly',
      rangeStart: new Date('2026-07-01T00:00:00'),
      rangeEnd: new Date('2026-07-31T23:59:59'),
      rows: [],
    })
    expect(text).toContain('Personne en congé')
    expect(html).toContain('Personne en congé')
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm run test:unit -- lib/services/email.test.ts`
Expected: FAIL — `renderLeaveRecapEmail` non exporté / introuvable.

- [ ] **Step 3: Ajouter les imports en tête de `lib/services/email.ts`**

Sous les imports existants (`COLORS`, etc.), ajouter :

```ts
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import type { RecapPeriod, RecapRow, RecapStatus } from '@/lib/services/conges/recap'
```

- [ ] **Step 4: Ajouter le rendu + l'envoi à la fin de `lib/services/email.ts`**

```ts
export type LeaveRecapEmailParams = {
  to: string[]
  locale: 'en' | 'fr'
  period: RecapPeriod
  rangeStart: Date
  rangeEnd: Date
  rows: RecapRow[]
}

const RECAP_STATUS_STYLE: Record<RecapStatus, { bgColor: string; label: Record<'fr' | 'en', string> }> = {
  APPROVED: { bgColor: '#10b981', label: { fr: 'Approuvé', en: 'Approved' } },
  PENDING: { bgColor: '#f59e0b', label: { fr: 'En attente', en: 'Pending' } },
}

export function renderLeaveRecapEmail({
  locale,
  period,
  rangeStart,
  rangeEnd,
  rows,
}: LeaveRecapEmailParams): { subject: string; text: string; html: string } {
  const dateLocale = locale === 'fr' ? fr : enUS

  const subjects: Record<RecapPeriod, Record<'fr' | 'en', string>> = {
    weekly: { fr: 'Récap congés — semaine en cours', en: 'Leave recap — current week' },
    monthly: { fr: 'Récap congés — mois en cours', en: 'Leave recap — current month' },
  }
  const titles: Record<RecapPeriod, Record<'fr' | 'en', string>> = {
    weekly: { fr: 'Congés de la semaine', en: 'This week’s leave' },
    monthly: { fr: 'Congés du mois', en: 'This month’s leave' },
  }
  const emptyStates: Record<RecapPeriod, Record<'fr' | 'en', string>> = {
    weekly: { fr: 'Personne en congé cette semaine.', en: 'No one is on leave this week.' },
    monthly: { fr: 'Personne en congé ce mois-ci.', en: 'No one is on leave this month.' },
  }

  const subject = subjects[period][locale]
  const title = titles[period][locale]
  const rangeLabel = `${format(rangeStart, 'd MMM', { locale: dateLocale })} → ${format(rangeEnd, 'd MMM yyyy', { locale: dateLocale })}`

  const daysWord = (count: number) =>
    locale === 'fr' ? (count > 1 ? 'jours' : 'jour') : count > 1 ? 'days' : 'day'

  const textLines = rows.length
    ? rows.map((row) => {
        const dates = `${format(row.startDate, 'd MMM', { locale: dateLocale })} → ${format(row.endDate, 'd MMM', { locale: dateLocale })}`
        const statusLabel = RECAP_STATUS_STYLE[row.status].label[locale]
        const positionPart = row.position ? ` (${row.position})` : ''
        return `- ${row.name}${positionPart} : ${dates}, ${row.daysInRange} ${daysWord(row.daysInRange)} [${statusLabel}]`
      })
    : [emptyStates[period][locale]]
  const text = `${title}\n${rangeLabel}\n\n${textLines.join('\n')}`

  const preheader = `${title} — ${rangeLabel}`

  const rowsHtml = rows.length
    ? rows
        .map((row) => {
          const style = RECAP_STATUS_STYLE[row.status]
          const dates = `${format(row.startDate, 'd MMM', { locale: dateLocale })} → ${format(row.endDate, 'd MMM', { locale: dateLocale })}`
          const positionLine = row.position
            ? `<div style="font-size:12px;color:${COLORS.mutedForeground};">${row.position}</div>`
            : ''
          return `
    <tr>
      <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};border-top:1px solid ${COLORS.secondary};">
        <strong>${row.name}</strong>${positionLine}
      </td>
      <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};border-top:1px solid ${COLORS.secondary};white-space:nowrap;">${dates}</td>
      <td style="padding:12px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.foreground};border-top:1px solid ${COLORS.secondary};white-space:nowrap;">${row.daysInRange} ${daysWord(row.daysInRange)}</td>
      <td style="padding:12px 16px;border-top:1px solid ${COLORS.secondary};text-align:right;">
        <span style="display:inline-block;background-color:${style.bgColor};border-radius:6px;padding:4px 10px;font-family:${FONT_SANS};font-size:12px;font-weight:600;color:#ffffff;white-space:nowrap;">${style.label[locale]}</span>
      </td>
    </tr>`
        })
        .join('')
    : `
    <tr>
      <td colspan="4" style="padding:20px 16px;font-family:${FONT_SANS};font-size:14px;color:${COLORS.mutedForeground};text-align:center;border-top:1px solid ${COLORS.secondary};">
        ${emptyStates[period][locale]}
      </td>
    </tr>`

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0 0 4px 0;font-family:${FONT_SERIF};font-size:22px;line-height:30px;color:${COLORS.primary};font-weight:700;">${title}</p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:14px;line-height:22px;color:${COLORS.mutedForeground};">${rangeLabel}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
      ${rowsHtml}
    </table>`

  const html = emailLayout(body, preheader)
  return { subject, text, html }
}

export async function sendLeaveRecapEmail(
  params: LeaveRecapEmailParams,
): Promise<{ id: string } | { error: string }> {
  const { subject, text, html } = renderLeaveRecapEmail(params)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: 'RESEND_API_KEY missing' }
  const from = process.env.RESEND_FROM || 'noreply@your-domain.com'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: params.to, subject, text, html }),
  })
  if (!res.ok) {
    return { error: `RESEND_REQUEST_FAILED_${res.status}` }
  }
  const json = (await res.json()) as { id?: string }
  return { id: json.id ?? '' }
}
```

- [ ] **Step 5: Lancer les tests pour vérifier le succès**

Run: `npm run test:unit -- lib/services/email.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/services/email.ts lib/services/email.test.ts
git commit -m "feat(conges): leave recap email template and Resend sender"
```

---

## Task 4: Route API Cron (mince, orchestration)

**Files:**
- Create: `app/api/cron/conges-recap/route.ts`

- [ ] **Step 1: Créer la route**

Créer `app/api/cron/conges-recap/route.ts` :

```ts
import { NextRequest, NextResponse } from 'next/server'
import {
  getWeekRange,
  getMonthRange,
  getLeaveRecap,
  getCongesAdminRecipients,
  resolvePeriod,
  isAuthorizedCron,
  groupEmailsByLanguage,
} from '@/lib/services/conges/recap'
import { sendLeaveRecapEmail } from '@/lib/services/email'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'cron_secret_missing' }, { status: 500 })
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const period = resolvePeriod(request.nextUrl.searchParams.get('period'))
  const today = new Date()
  const range = period === 'monthly' ? getMonthRange(today) : getWeekRange(today)

  const [rows, recipients] = await Promise.all([getLeaveRecap(range), getCongesAdminRecipients()])

  if (recipients.length === 0) {
    console.warn('[conges-recap] no CONGES admin recipients')
    return NextResponse.json({ period, count: rows.length, recipients: 0, sent: 0, failures: 0 })
  }

  const emailsByLanguage = groupEmailsByLanguage(recipients)
  let sent = 0
  let failures = 0

  for (const [language, emails] of emailsByLanguage) {
    const result = await sendLeaveRecapEmail({
      to: emails,
      locale: language === 'FR' ? 'fr' : 'en',
      period,
      rangeStart: range.start,
      rangeEnd: range.end,
      rows,
    })
    if ('error' in result) {
      failures += 1
      console.error(`[conges-recap] send failed (${language}): ${result.error}`)
    } else {
      sent += 1
    }
  }

  return NextResponse.json({
    period,
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    count: rows.length,
    recipients: recipients.length,
    sent,
    failures,
  })
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Vérification manuelle locale (garde d'auth + envoi)**

Démarrer le serveur si besoin (`npm run dev`), puis :

```bash
# 401 attendu (mauvais secret)
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/cron/conges-recap?period=weekly"
# 200 + JSON résumé attendu (remplacer <SECRET> par la valeur de CRON_SECRET dans .env)
curl -s -H "Authorization: Bearer <SECRET>" "http://localhost:3000/api/cron/conges-recap?period=weekly"
```
Expected: la 1re commande renvoie `401` ; la 2e renvoie un JSON `{ period, count, recipients, sent, failures }` et (si `RESEND_API_KEY` valide) envoie le mail. Vérifier la réception.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/conges-recap/route.ts
git commit -m "feat(conges): cron route sending weekly/monthly leave recap emails"
```

---

## Task 5: Configuration Vercel Cron + variable d'environnement

**Files:**
- Create: `vercel.json`
- Modify: `.env` (local ; + configurer dans le dashboard Vercel)

- [ ] **Step 1: Créer `vercel.json`**

À la racine du repo, créer `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/conges-recap?period=monthly", "schedule": "0 6 1 * *" },
    { "path": "/api/cron/conges-recap?period=weekly", "schedule": "0 6 * * 1" }
  ]
}
```

> Rappels : Vercel Cron s'exécute en **UTC** (`0 6` ≈ 7–8h Paris). Compatible plan Hobby (2 crons, ≤ 1×/jour). Vercel injecte `Authorization: Bearer <CRON_SECRET>` automatiquement.

- [ ] **Step 2: Générer et ajouter `CRON_SECRET` en local**

```bash
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env
```
Expected: une ligne `CRON_SECRET=<64 hex>` ajoutée à `.env` (fichier gitignoré, non commité).

- [ ] **Step 3: Configurer `CRON_SECRET` dans Vercel (manuel)**

Dans le dashboard Vercel → Project → Settings → Environment Variables : ajouter `CRON_SECRET` avec la **même valeur** (ou une valeur dédiée à la prod) pour l'environnement Production. Redéployer pour activer les crons.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore(conges): declare Vercel cron jobs for leave recap emails"
```

---

## Task 6: Vérification finale

- [ ] **Step 1: Lancer toute la suite unitaire**

Run: `npm run test:unit`
Expected: PASS, incluant `recap.test.ts` et `email.test.ts`, sans régression sur les tests existants.

- [ ] **Step 2: Typecheck complet**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build OK ; la route `/api/cron/conges-recap` apparaît dans la sortie.

- [ ] **Step 4: Commit final si nécessaire**

```bash
git status
# rien à committer si tout est déjà commité
```

---

## Self-Review (rempli par l'auteur du plan)

**Couverture du spec :**
- Planificateur Vercel Cron (2 crons UTC) → Task 5. ✅
- Route GET sécurisée par `CRON_SECRET` → Task 4 + garde testée en Task 1 (`isAuthorizedCron`). ✅
- Statuts APPROVED + PENDING, PENDING marqué → Task 2 (query `in`) + Task 3 (pastille orange). ✅
- Récap vide envoyé quand même → Task 3 (état vide) + Task 4 (pas de court-circuit sur `rows.length === 0`). ✅
- Un mail par langue → Task 1 (`groupEmailsByLanguage`) + Task 4 (boucle par langue). ✅
- Semaine lundi→vendredi / mois complet → Task 1 (`getWeekRange`/`getMonthRange`). ✅
- Destinataires = admins CONGES uniquement → Task 2 (`adminApplications has 'CONGES'`, sans `role: 'ADMIN'`). ✅
- Tests vitest sous `lib/` → Task 1 & 3. ✅

**Cohérence des types :** `RecapPeriod`/`RecapRow`/`RecapStatus`/`RecapRecipient` définis en Task 1, réutilisés à l'identique en Tasks 2–4. `daysInRange` calculé via `countWorkingDays(start, end, frenchHolidays)` partout. Pas de `as any`, statut Prisma mappé explicitement.

**Placeholders :** aucun — tout le code est fourni intégralement.

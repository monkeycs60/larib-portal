# Récap congés par email (Resend + Vercel Cron)

**Date:** 2026-07-19
**Statut:** Design validé, prêt pour plan d'implémentation

## Objectif

Envoyer automatiquement aux **admins congés** un email récapitulatif des personnes
en congé :

- **Chaque 1er du mois** : récap des absences **du mois en cours**.
- **Chaque lundi matin** : récap des absences **de la semaine en cours (lundi → vendredi)**.

Le récap inclut les congés **APPROVED** et **PENDING** (les PENDING sont visuellement
marqués). L'email est envoyé **même si personne n'est en congé** sur la période.

## Décisions validées

| Sujet | Décision |
|-------|----------|
| Planificateur | **Vercel Cron** (2 crons → 1 route GET sécurisée) |
| Statuts inclus | **APPROVED + PENDING** (PENDING = pastille orange) |
| Récap vide | **Envoyer quand même** (« Personne en congé … ») |
| Localisation | **Un mail par langue** (groupé sur `User.language`) |
| Destinataires | **Admins congés uniquement** : `adminApplications has 'CONGES'` (⚠️ pas les `ADMIN` globaux) |
| Périmètre semaine | **Lundi → vendredi** (semaine ouvrée) |
| Périmètre mois | 1er → dernier jour du mois |

## Vue d'ensemble

```
Vercel Cron (UTC)
  ├─ "0 6 1 * *" → GET /api/cron/conges-recap?period=monthly
  └─ "0 6 * * 1" → GET /api/cron/conges-recap?period=weekly
        │
        ▼
  route: vérifie Bearer CRON_SECRET
       → calcule le range (semaine ou mois) depuis la date serveur
       → getLeaveRecap(range)                (congés APPROVED+PENDING chevauchant)
       → getCongesAdminRecipients()          (admins CONGES uniquement, { email, language }[])
       → groupe les destinataires par langue
       → pour chaque langue : sendLeaveRecapEmail(...)
       → renvoie { period, count, recipients, sent } (JSON, observabilité Vercel)
```

## Composants

### 1. Planification — `vercel.json` (nouveau)

```json
{
  "crons": [
    { "path": "/api/cron/conges-recap?period=monthly", "schedule": "0 6 1 * *" },
    { "path": "/api/cron/conges-recap?period=weekly",  "schedule": "0 6 * * 1" }
  ]
}
```

- **Vercel Cron s'exécute en UTC.** `6:00 UTC` ≈ 7–8h à Paris selon l'heure d'été/hiver.
  Le timing exact n'est pas critique pour un récap ; l'heure est trivialement ajustable.
- **Compatible plan Hobby** : 2 crons max, chacun déclenché ≤ 1×/jour. ✅
- Vercel injecte automatiquement `Authorization: Bearer <CRON_SECRET>` sur l'appel
  quand la variable d'env `CRON_SECRET` est définie.

### 2. Route API — `app/api/cron/conges-recap/route.ts` (nouveau)

- `export async function GET(request: Request)` — Vercel Cron n'émet que du GET.
- **Garde de sécurité** : si `request.headers.get('authorization') !== \`Bearer ${process.env.CRON_SECRET}\``
  → répondre `401`. Si `CRON_SECRET` est absent de l'env → `500` (mauvaise config).
- Lit `period` depuis l'URL (`'weekly' | 'monthly'`, défaut `'weekly'` si valeur inconnue).
- Calcule le range via les helpers purs (§3), récupère les données, groupe par langue,
  envoie, puis renvoie un JSON résumé :
  `{ period, rangeStart, rangeEnd, count, recipients, sent, failures }`.
- **Gestion d'erreur** : n'échoue jamais en 500 à cause d'un envoi Resend raté ;
  chaque échec est `console.error`-é (visible dans les logs Vercel) et compté dans
  `failures`. Répond `200` avec le résumé.

### 3. Service — `lib/services/conges/recap.ts` (nouveau)

**Helpers purs (testables sans DB) :**

```ts
type DateRange = { start: Date; end: Date }

// startOfWeek(today, { weekStartsOn: 1 }) → lundi ; end = vendredi (start + 4 j), endOfDay
export function getWeekRange(today: Date): DateRange

// startOfMonth(today) → endOfMonth(today)
export function getMonthRange(today: Date): DateRange

type RecapLeave = {
  userId: string
  firstName: string | null
  lastName: string | null
  position: string | null
  startDate: Date
  endDate: Date
  status: 'APPROVED' | 'PENDING'
}

type RecapRow = {
  userId: string
  name: string          // "Prénom Nom" (fallback email géré côté appelant si besoin)
  position: string | null
  startDate: Date       // rognée au range
  endDate: Date         // rognée au range
  status: 'APPROVED' | 'PENDING'
  daysInRange: number   // jours ouvrés chevauchant le range (réutilise countLeaveDays)
}

// Rogne chaque congé au range, calcule daysInRange, trie par startDate puis nom.
export function buildRecapRows(leaves: RecapLeave[], range: DateRange): RecapRow[]
```

**Accès données (Prisma) :**

```ts
// LeaveRequest APPROVED+PENDING chevauchant le range,
// users role:'USER' + applications has 'CONGES' (même filtre que getLeaveCalendarData)
export async function getLeaveRecap(range: DateRange): Promise<RecapRow[]>

// Admins congés UNIQUEMENT (pas les ADMIN globaux).
// where: { adminApplications: { has: 'CONGES' } }
export async function getCongesAdminRecipients(): Promise<
  { email: string; language: 'EN' | 'FR' }[]
>
```

- `countLeaveDays(start, end)` existe déjà dans `lib/services/conges/index.ts` et exclut
  les week-ends + jours fériés français ; réutilisé pour `daysInRange`.
- Chevauchement : `startDate <= range.end && endDate >= range.start`.

### 4. Email — `lib/services/email.ts` (étendu)

```ts
type LeaveRecapEmailParams = {
  to: string[]
  locale: 'en' | 'fr'
  period: 'weekly' | 'monthly'
  rangeStart: Date
  rangeEnd: Date
  rows: RecapRow[]
}

function renderLeaveRecapEmail(params): { subject; text; html }
export async function sendLeaveRecapEmail(params): Promise<{ id: string } | { error: string }>
```

- Réutilise `emailLayout`, `COLORS`, `FONT_SERIF`, `FONT_SANS`.
- **En-tête** : titre « Récap hebdomadaire / mensuel des congés » + période formatée
  (`format(..., 'd MMM', { locale: fr/enUS })`).
- **Tableau** trié par date : `Personne · Poste · Dates · Durée · Statut`.
  - `APPROVED` → pastille verte, `PENDING` → pastille orange (mêmes couleurs que
    `eventTypePillStyle`).
- **État vide** : « Personne en congé cette semaine / ce mois. » (mail envoyé quand même).
- **i18n** : textes FR/EN **inline** dans la fonction de rendu — pattern des emails
  existants (`renderLeaveNotificationEmail`), pas next-intl (rendu hors contexte requête).
- Envoi : `to: params.to` (un appel par groupe de langue). Pattern fetch Resend identique
  aux fonctions existantes (`RESEND_API_KEY`, `RESEND_FROM`).

### 5. Variables d'environnement

- **Nouveau** : `CRON_SECRET` — chaîne aléatoire, ajoutée à `.env` (local) **et** aux env
  vars Vercel. Documentée dans le `.env` d'exemple si présent.
- Déjà présents : `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL`.

## Flux de données

1. Vercel déclenche `GET /api/cron/conges-recap?period=…` (header Bearer CRON_SECRET).
2. Route vérifie le secret → `401` sinon.
3. `today = new Date()` (serveur) → `getWeekRange`/`getMonthRange`.
4. `getLeaveRecap(range)` → `RecapRow[]`.
5. `getCongesAdminRecipients()` → `{ email, language }[]`, groupés par langue.
6. Pour chaque langue non vide : `sendLeaveRecapEmail({ to, locale, period, range, rows })`.
7. Réponse JSON résumé.

## Gestion des erreurs

| Cas | Comportement |
|-----|--------------|
| `CRON_SECRET` absent de l'env | `500` (mauvaise config, visible immédiatement) |
| `Authorization` invalide/absent | `401` |
| Aucun admin destinataire | `200`, `sent: 0`, `console.warn` |
| Aucun congé sur la période | Envoi quand même (état vide), `200` |
| Échec Resend (`RESEND_API_KEY` manquant, 4xx/5xx) | `console.error`, compté dans `failures`, `200` |

## Tests (vitest — `lib/services/conges/recap.test.ts`)

Fonctions **pures**, testées sans DB :

- `getWeekRange` : depuis un mardi/dimanche donné → lundi→vendredi corrects ;
  bornes `startOfDay`/`endOfDay`.
- `getMonthRange` : 1er → dernier jour ; mois de 28/30/31 jours.
- `buildRecapRows` :
  - congé débordant avant/après le range → dates rognées ;
  - `daysInRange` exclut week-ends/fériés (via `countLeaveDays`) ;
  - tri par `startDate` puis nom ;
  - conservation du `status` (marqueur PENDING).
- **Garde de route** : `GET` sans `Authorization` → `401` (test léger de la route, en
  mockant `getLeaveRecap`/`getCongesAdminRecipients`/`sendLeaveRecapEmail`).

Pas d'e2e Playwright pour un cron (déclenchement serveur, non-UI).

## Hors périmètre (YAGNI)

- Bouton « envoyer maintenant » manuel côté admin.
- Préférences de désabonnement par admin.
- Récap cumulé annuel par personne.
- Retry automatique des envois échoués (Vercel Cron ne retry pas ; logs suffisent).

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `vercel.json` | **créer** (crons) |
| `app/api/cron/conges-recap/route.ts` | **créer** (route GET sécurisée) |
| `lib/services/conges/recap.ts` | **créer** (helpers purs + accès données) |
| `lib/services/conges/recap.test.ts` | **créer** (tests unitaires) |
| `lib/services/email.ts` | **étendre** (`renderLeaveRecapEmail` + `sendLeaveRecapEmail`) |
| `.env` (+ exemple) | **ajouter** `CRON_SECRET` |

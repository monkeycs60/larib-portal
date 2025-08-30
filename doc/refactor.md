# Guide de Refactoring - Standards du Projet

Ce document décrit les standards et processus de refactoring pour aligner les composants importés avec la stack et les conventions du projet.

## Objectifs du Refactoring

### 1. Alignement avec la Stack Actuelle
- **Next.js 15.3.3** avec App Router
- **TypeScript strict** (pas de `any`)
- **Tailwind CSS v4**
- **Shadcn/ui** pour les composants
- **Better Auth** pour l'authentification
- **Prisma** avec PostgreSQL
- **Next-intl** pour l'internationalisation
- **Zustand** pour la gestion d'état globale
- **Next-safe-action** pour les server actions

### 2. Découpage en Sous-composants

#### Règles de Découpage
- **Limite de taille** : Composants > 350 lignes doivent être divisés
- **Séparation des responsabilités** : Un composant = une responsabilité
- **Réutilisabilité** : Extraire les parties réutilisables

#### Structure de Découpage
```
components/
├── feature/
│   ├── FeatureMain.tsx          # Composant principal
│   ├── FeatureForm.tsx          # Formulaire spécifique
│   ├── FeatureList.tsx          # Liste des éléments
│   └── FeatureItem.tsx          # Élément individuel
└── ui/
    ├── CustomButton.tsx         # Composants génériques réutilisables
    └── CustomModal.tsx
```

### 3. Extraction de Helpers

#### Types de Helpers à Créer

##### Helpers de Validation
```typescript
// lib/helpers/validation.ts
export const validateEmail = (email: string): boolean => {
  // Logique de validation
}

export const sanitizeInput = (input: string): string => {
  // Logique de nettoyage
}
```

##### Helpers de Formatage
```typescript
// lib/helpers/formatting.ts
export const formatCurrency = (amount: number, locale: string): string => {
  // Logique de formatage monétaire
}

export const formatDate = (date: Date, locale: string): string => {
  // Logique de formatage de date
}
```

##### Helpers Métier
```typescript
// lib/helpers/business.ts
export const calculateTotalPrice = (items: CartItem[]): number => {
  // Logique de calcul métier
}

export const generateInvoiceNumber = (): string => {
  // Logique de génération
}
```

### 4. Hooks Customs pour la Logique Métier

#### Structure des Hooks
```typescript
// lib/hooks/useFeature.ts
interface UseFeatureReturn {
  data: FeatureData[]
  loading: boolean
  error: string | null
  actions: {
    create: (data: CreateFeatureData) => Promise<void>
    update: (id: string, data: UpdateFeatureData) => Promise<void>
    delete: (id: string) => Promise<void>
  }
}

export const useFeature = (): UseFeatureReturn => {
  // Logique du hook
}
```

#### Types de Hooks à Créer
- **Hooks de données** : Gestion des états de chargement, erreurs, données
- **Hooks de formulaires** : Logique de validation, soumission
- **Hooks d'UI** : Modals, tooltips, états visuels
- **Hooks métier** : Logique spécifique au domaine

### 5. Migration vers Server Actions

#### Structure des Server Actions
```typescript
// lib/actions/feature.ts
import { authenticatedAction } from './safe-action'
import { z } from 'zod'

const createFeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
})

export const createFeatureAction = authenticatedAction
  .schema(createFeatureSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx
    // Logique de création
  })
```

#### Migration des Mutations
1. **Identifier** toutes les mutations client-side
2. **Créer** les server actions correspondantes
3. **Migrer** la logique de validation
4. **Tester** les nouvelles actions

## Standards de Code

### Pratiques Interdites
- ❌ `useEffect` (utiliser fetch dans les server components ou event handlers)
- ❌ Type `any` (toujours typer strictement)
- ❌ Patterns OOP (éviter les classes)
- ❌ Commentaires inutiles

### Pratiques Requises
- ✅ Composants shadcn/ui exclusivement
- ✅ Authentification avec `getTypedSession()` et `authenticatedAction`
- ✅ Internationalisation avec next-intl (FR/EN)
- ✅ Types Prisma du schema
- ✅ Gestion d'erreurs traduite
- ✅ Code auto-explicatif

## Architecture

### Organisation par Features
```
app/
├── (auth)/
│   └── login/
├── dashboard/
└── settings/

lib/
├── services/          # Appels API/Prisma
├── helpers/           # Fonctions utilitaires
├── hooks/             # Hooks customs
├── stores/            # Stores Zustand
└── actions/           # Server actions
```

### Gestion d'État
- **Server state** : Préférer par défaut
- **Client state** : Seulement si nécessaire pour l'interactivité
- **Global state** : Zustand avec sélecteurs optimisés

## Processus de Refactoring

### 1. Analyse du Composant
- Identifier les responsabilités multiples
- Repérer la logique réutilisable
- Analyser les dépendances

### 2. Planification
- Définir les sous-composants à créer
- Identifier les helpers nécessaires
- Planifier les hooks customs

### 3. Refactoring Incrémental
- Découper un sous-composant à la fois
- Extraire la logique commune
- Migrer vers les server actions

### 4. Validation
- Tester chaque étape
- Vérifier la conformité avec `laser-lewis`
- Valider l'internationalisation

## Outils de Validation

### Agents Spécialisés
- **laser-lewis** : Vérification des standards
- **marwane-refacto** : Refactoring spécialisé
- **playwright** : Tests E2E

### Points de Contrôle
- Standards TypeScript respectés
- Composants < 350 lignes
- Logique extraite dans helpers/hooks
- Internationalisation complète
- Server actions utilisées pour les mutations
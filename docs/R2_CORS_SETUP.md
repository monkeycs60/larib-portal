# Configuration CORS pour Cloudflare R2

## Contexte

Les PDF sont stockés sur Cloudflare R2. Pour éviter les erreurs CORS lors de la visualisation des PDF, deux solutions sont disponibles :

### Solution actuelle : Proxy API Route ✅

Actuellement, l'application utilise une route proxy (`/api/pdf-proxy`) qui :
- Récupère les PDF depuis R2 côté serveur
- Les retourne au client avec les bons headers CORS
- **Avantage** : Fonctionne immédiatement sans configuration R2
- **Inconvénient** : Chaque requête PDF passe par Vercel (consomme de la bande passante)

### Solution optimale : Configuration CORS sur R2 (optionnel)

Pour améliorer les performances, vous pouvez configurer CORS directement sur le bucket R2.

## Étapes de configuration CORS sur R2

### 1. Accéder au dashboard Cloudflare

1. Connectez-vous à [dash.cloudflare.com](https://dash.cloudflare.com)
2. Allez dans **R2** dans le menu latéral
3. Sélectionnez votre bucket (celui défini dans `R2_BUCKET_NAME`)

### 2. Configurer CORS

1. Cliquez sur l'onglet **Settings**
2. Trouvez la section **CORS Policy**
3. Cliquez sur **Add CORS Policy** ou **Edit**

### 3. Ajouter la configuration JSON

```json
[
  {
    "AllowedOrigins": [
      "https://votre-domaine.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Remplacez** `https://votre-domaine.vercel.app` par votre vrai domaine de production.

### 4. Modifier le code (optionnel)

Si vous configurez CORS sur R2, vous pouvez modifier `pdf-viewer.tsx` pour utiliser directement `pdfUrl` au lieu de `proxyUrl` :

```typescript
// Utiliser directement l'URL R2 au lieu du proxy
<Document
  file={pdfUrl}  // Au lieu de proxyUrl
  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
  className="flex flex-col items-center gap-4 py-4"
>
```

**Note** : Le proxy reste utile comme fallback et pour les tests en local.

## Vérification

### Tester CORS depuis la console du navigateur

```javascript
fetch('https://votre-bucket-r2-url.com/path/to/file.pdf', {
  method: 'GET',
  mode: 'cors'
})
.then(response => console.log('CORS OK:', response.status))
.catch(error => console.error('CORS Error:', error))
```

Si vous obtenez une réponse 200, CORS est bien configuré !

## Recommandation

Pour l'instant, **gardez le proxy activé** car :
- Il fonctionne immédiatement
- Il ajoute une couche de sécurité (authentification)
- La configuration CORS peut être ajoutée plus tard pour optimiser

La configuration CORS sur R2 est **optionnelle** et peut être faite ultérieurement pour améliorer les performances.

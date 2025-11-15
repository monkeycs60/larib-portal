# Configuration CORS complète pour Cloudflare R2

## Pourquoi cette configuration est nécessaire

Pour que les uploads et la visualisation de PDF fonctionnent sur Vercel, R2 doit autoriser :
- **PUT requests** pour l'upload direct depuis le navigateur
- **GET requests** pour la lecture des PDF

## Configuration étape par étape

### 1. Accéder à votre bucket R2

1. Allez sur [dash.cloudflare.com](https://dash.cloudflare.com)
2. Cliquez sur **R2** dans le menu latéral gauche
3. Sélectionnez votre bucket (nom défini dans `R2_BUCKET_NAME`)
4. Cliquez sur l'onglet **Settings**

### 2. Configurer CORS

1. Trouvez la section **CORS Policy**
2. Cliquez sur **Edit CORS Policy** ou **Add CORS Policy**
3. Collez la configuration JSON suivante :

```json
[
  {
    "AllowedOrigins": [
      "https://votre-app.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "ETag",
      "x-amz-request-id"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. Personnaliser la configuration

**IMPORTANT** : Remplacez `https://votre-app.vercel.app` par :
- Votre domaine de production Vercel (ex: `https://larib-portal.vercel.app`)
- Si vous avez un domaine custom, ajoutez-le aussi (ex: `https://www.votre-domaine.com`)

**Exemple complet** :
```json
[
  {
    "AllowedOrigins": [
      "https://larib-portal.vercel.app",
      "https://larib-portal-git-main-votre-team.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "ETag",
      "x-amz-request-id"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 4. Sauvegarder

Cliquez sur **Save** ou **Update**

## Vérification

### Depuis la console du navigateur (sur votre site déployé)

Ouvrez la console développeur (F12) et testez :

```javascript
// Test GET (lecture)
fetch('https://votre-r2-url.com/test.pdf', {
  method: 'GET',
  mode: 'cors'
})
.then(r => console.log('GET OK:', r.status))
.catch(e => console.error('GET Error:', e))

// Test PUT (upload) - nécessite une signed URL valide
// Vous verrez les requêtes PUT dans l'onglet Network lors de l'upload
```

### Vérifier dans l'onglet Network

1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet **Network**
3. Essayez d'uploader un PDF
4. Cherchez la requête PUT vers R2
5. Vérifiez qu'il n'y a **pas d'erreur CORS** (rouge)

## Troubleshooting

### Erreur : "CORS policy: No 'Access-Control-Allow-Origin' header"

→ Vérifiez que votre domaine est bien dans `AllowedOrigins`

### Erreur : "Method PUT is not allowed by Access-Control-Allow-Methods"

→ Vérifiez que `PUT` est bien dans `AllowedMethods`

### Erreur : "Request header ... is not allowed"

→ Utilisez `"AllowedHeaders": ["*"]` pour autoriser tous les headers

### L'upload fonctionne mais pas la visualisation (ou inverse)

→ Vérifiez que vous avez bien `GET` et `PUT` dans `AllowedMethods`

## Notes importantes

1. **Wildcard origins (`*`) ne fonctionne pas avec credentials** : Il faut lister explicitement chaque domaine
2. **Les sous-domaines Vercel** : Ajoutez tous vos sous-domaines preview si nécessaire
3. **HTTPS uniquement en production** : R2 exige HTTPS pour les requêtes CORS (sauf localhost)
4. **Propagation** : Les changements CORS sont généralement instantanés, mais peuvent prendre jusqu'à 5 minutes

## Alternative : Utiliser uniquement le proxy

Si vous ne voulez pas configurer CORS sur R2, vous pouvez :
1. Garder l'ancienne API route (`/api/uploads/clinical-pdf`) pour l'upload (limitée à 4.5MB)
2. Utiliser le proxy (`/api/pdf-proxy`) pour la lecture

Mais vous serez **limité à 4.5MB** pour les uploads.

## Recommandation

**Configurez CORS sur R2** - C'est la solution la plus performante et permet :
- ✅ Uploads jusqu'à 30MB (ou plus)
- ✅ Lecture rapide des PDF
- ✅ Moins de charge sur Vercel
- ✅ Meilleure expérience utilisateur

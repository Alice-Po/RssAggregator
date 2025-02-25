# Backend ActivityPods RSS

## RSS Service

Le service RSS est conçu pour gérer les flux RSS dans un environnement ActivityPods. Il utilise le `PodResourcesHandlerMixin` pour gérer les ressources de type `Service`.

### Architecture

```javascript
const { PodResourcesHandlerMixin } = require('@activitypods/app');

module.exports = {
  name: 'rss',
  mixins: [PodResourcesHandlerMixin],
  settings: {
    type: 'Service', // Type de ressource géré
    containerUri: '/data/as/service' // Conteneur pour les ressources
  }
};
```

### Cycle de vie d'un flux RSS

1. **Création (`onCreate`)**

   - Déclenché quand un utilisateur ajoute une nouvelle URL
   - Vérifie et valide l'URL du flux
   - Met à jour l'URL si nécessaire avec l'URL réelle du flux

2. **Mise à jour (`onUpdate`)**

   - Gère les modifications des flux existants
   - Vérifie la validité des nouvelles URLs

3. **Suppression (`onDelete`)**
   - Nettoie les ressources associées

### Processus de découverte des flux

1. **Vérification directe**

   ```javascript
   async checkRssFeed(url) {
     // Tente de parser l'URL comme un flux RSS
     // Retourne true si c'est un flux valide
   }
   ```

2. **Inspection HTML**

   ```javascript
   async htmlBaliseInspection(url) {
     // Cherche les balises <link> dans le <head>
     // Exemple: <link rel="alternate" type="application/rss+xml" href="...">
   }
   ```

3. **Chemins communs**
   ```javascript
   async commonRssPathInspection(url) {
     // Teste des chemins prédéfinis comme /rss, /feed, etc.
   }
   ```

### Gestion des URLs

Le service maintient l'intégrité des URLs en :

1. Validant les URLs entrantes
2. Découvrant les URLs réelles des flux
3. Mettant à jour les ressources avec les bonnes URLs

```javascript
// Exemple de mise à jour d'URL
await this.actions.patch({
  resourceUri: resource.id,
  triplesToAdd: [triple(namedNode(resource.id), namedNode('apods:url'), literal(newFeedUrl))],
  triplesToRemove: [triple(namedNode(resource.id), namedNode('apods:url'), literal(oldUrl))],
  actorUri
});
```

### Chemins prédéfinis

Le service inclut une liste de chemins communs pour différents sites :

```javascript
settings: {
  commonPaths: [
    '/articles/feed', // Mediapart
    '/titres.rss', // FranceTV Info
    '/feed',
    '/rss',
    '/atom',
    '/feed.xml',
    '/rss.xml',
    '/atom.xml',
    '/rss/une.xml' // Le Monde
  ];
}
```

### Cache

Le service implémente un système de cache pour éviter les requêtes répétées :

```javascript
settings: {
  cacheTime: 15 * 60 * 1000; // 15 minutes en millisecondes
}
```

### Gestion des erreurs

1. **Erreurs HTTP**

   - 403 : Accès interdit, essaie les chemins alternatifs
   - 404 : Page non trouvée, essaie les chemins communs
   - Autres : Loggées avec contexte

2. **Flux invalides**
   - Met à jour le résumé avec un avertissement
   - Garde l'URL originale
   - Logue l'erreur pour diagnostic

### Bonnes pratiques

1. **User-Agent éthique**

   ```javascript
   settings: {
     userAgent: 'ActivityPods-RSS-Reader/1.0 (+https://activitypods.org/contact)';
   }
   ```

2. **Respect des robots.txt**

   - Vérifie les permissions avant de scraper
   - Suit les directives des sites

3. **Mise à jour atomique**
   - Les modifications d'URL sont transactionnelles
   - Les erreurs sont proprement gérées

### Intégration ActivityPods

Le service s'intègre avec :

- `PodResourcesHandlerMixin` pour la gestion des ressources
- Le système d'activités d'ActivityPods
- Le système de permissions

### Développement

Pour étendre le service :

1. Respecter le cycle de vie existant
2. Utiliser les méthodes de découverte existantes
3. Maintenir la cohérence des URLs
4. Gérer proprement les erreurs

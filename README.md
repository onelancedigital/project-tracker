# WeFam Tracker - Suivi de Projet GitHub

Application SvelteKit pour suivre les milestones et issues GitHub avec authentification par magic link.

## 🚀 Fonctionnalités

- ✨ **Authentification sécurisée** : Magic link envoyé par email
- 📊 **Tableau Kanban** : Visualisation en colonnes (À faire, En cours, Terminé)
- 📋 **Vue Liste** : Affichage détaillé des issues
- 🎯 **Milestones** : Suivi de progression avec barres de progression
- 💬 **Commentaires** : Affichage des commentaires d'issues
- 🔒 **Accès restreint** : Liste blanche d'emails autorisés

## 📋 Prérequis

- Node.js 18+ 
- Un compte GitHub avec accès au dépôt
- Un compte Resend (gratuit) pour l'envoi d'emails

## ⚙️ Configuration

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos valeurs :

```env
# GitHub Configuration
GITHUB_PAT=ghp_votreTokenPersonnel
GITHUB_REPO=votre-username/votre-repo

# Resend Configuration
RESEND_API_KEY=re_votreClefAPI
RESEND_FROM_EMAIL=onboarding@resend.dev

# JWT Secret (générez une clé aléatoire forte)
JWT_SECRET=votre-secret-jwt-super-securise

# App URL
APP_URL=http://localhost:5173
```

### 3. Obtenir un Personal Access Token GitHub

1. Allez sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Générez un nouveau token avec les permissions :
   - `repo` (accès complet au dépôt)
3. Copiez le token dans `GITHUB_PAT`

### 4. Configurer SMTP (exemple avec Gmail)

Pour Gmail, vous dResend (envoi d'emails)

1. Créez un compte gratuit sur [resend.com](https://resend.com)
2. Allez dans [API Keys](https://resend.com/api-keys)
3. Créez une nouvelle clé API
4. Copiez la clé dans `RESEND_API_KEY`
5. Pour tester, utilisez `onboarding@resend.dev` dans `RESEND_FROM_EMAIL`

📖 **Guide détaillé** : Voir [RESEND_CONFIG.md](RESEND_CONFIG.md)

Modifiez `src/config/allowedEmails.json` :

```json
{
  "allowedEmails": [
    "client@example.com",
    "votre-email@example.com"
  ]
}
```

## 🏃 Lancement

### Développement

```bash
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173)

### Production

```bash
npm run build
npm run preview
```

## 📖 Utilisation

### 1. Connexion

- Accédez à l'application
- Entrez votre email (doit être dans la liste autorisée)
- Cliquez sur "Envoyer le lien"
- Consultez votre boîte mail et cliquez sur le lien de connexion

### 2. Vue Kanban

Les issues sont organisées en 3 colonnes selon leur statut :

- **À faire** : Issues ouvertes sans label "in-progress"
- **En cours** : Issues ouvertes avec label "in-progress" ou "in progress"
- **Terminé** : Issues fermées

Pour changer le statut d'une issue, ajoutez/retirez le label "in-progress" sur GitHub.

### 3. Filtres

- Filtrez les issues par milestone via le menu déroulant
- Basculez entre vue Kanban et vue Liste

### 4. Détails des issues

Cliquez sur une issue pour voir :
- La description complète
- Les commentaires
- Les labels
- L'assigné

## 🏗️ Structure du projet

```
src/
├── config/
│   └── allowedEmails.json          # Emails autorisés
├── lib/
│   └── server/
│       ├── auth.js                 # Gestion authentification JWT
│       ├── config.js               # Variables d'environnement
│       └── email.js                # Envoi d'emails
├── routes/
│   ├── +page.svelte                # Page principale (Kanban/Liste)
│   ├── +page.server.js             # Protection de la page
│   ├── auth/
│   │   ├── login/
│   │   │   └── +page.svelte        # Page de connexion
│   │   └── verify/
│   │       └── +page.server.js     # Vérification magic link
│   └── api/
│       ├── auth/
│       │   ├── send-magic-link/
│       │   │   └── +server.js      # API envoi magic link
│       │   └── logout/
│       │       └── +server.js      # API déconnexion
│       └── github/
│           ├── data/
│           │   └── +server.js      # API milestones + issues
│           └── issues/[number]/comments/
│               └── +server.js      # API commentaires
└── hooks.server.js                 # Hook authentification global
```

## 🔒 Sécurité

- Les magic links expirent après 15 minutes
- Les tokens d'authentification sont valides 30 jours
- Les cookies sont httpOnly et secure en production
- Seuls les emails de la whitelist peuvent se connecter

## 🎨 Personnalisation

### Modifier la durée des tokens

Dans `src/lib/server/auth.js` :

```javascript
// Magic link : 15 minutes
expiresIn: '15m'

// Token d'authentification : 30 jours
expiresIn: '30d'
```

### Ajouter des statuts personnalisés

Modifiez la fonction `getIssueStatus` dans `src/routes/+page.svelte` pour reconnaître d'autres labels.

## 📝 Licence

MIT

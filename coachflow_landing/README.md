# TrainFlow — Landing page

Page d'accueil statique pour **trainflow.fr** (domaine racine).
L'app reste sur **app.trainflow.fr**, l'API sur **api.trainflow.fr**.

## Stack

HTML/CSS pur dans un seul fichier `index.html`. Aucune dépendance.
Hébergé sur **Cloudflare Pages** comme projet séparé du `coachflow_frontend`.

## Structure

```
coachflow_landing/
├── index.html       # Toute la page (HTML + CSS inline)
├── wrangler.toml    # Config Cloudflare Pages (build root = .)
├── _headers         # Security headers + cache
├── _redirects       # www → apex + raccourcis /login /register
└── README.md
```

## Déploiement (première fois)

### 1. Créer le projet Cloudflare Pages

```bash
cd coachflow_landing
npx wrangler pages project create trainflow-landing --production-branch=main
```

### 2. Déployer

```bash
npx wrangler pages deploy . --project-name=trainflow-landing
```

### 3. Brancher le domaine apex

Dans le dashboard Cloudflare → Pages → trainflow-landing → Custom domains :

- Ajouter `trainflow.fr` (racine)
- Ajouter `www.trainflow.fr` (sera redirigé via `_redirects`)

Cloudflare crée automatiquement les records DNS (CNAME flatten pour l'apex).

## Déploiements suivants

```bash
cd coachflow_landing
npx wrangler pages deploy . --project-name=trainflow-landing
```

(ou config un GitHub Action si tu veux auto-deploy au push)

## Modifications fréquentes

- **Changer le pricing** : section `<section id="pricing">` dans `index.html`
- **Changer la FAQ** : section `<section id="faq">`
- **Changer les features** : section `<section id="features">`
- **Désactiver la bannière "beta privée"** : retirer le `<div class="pill">` du hero

## CTAs pointent vers

- `Commencer →` / `Démarrer en Free` / `Démarrer en Pro` → `app.trainflow.fr/register`
- `Connexion` → `app.trainflow.fr/login`
- `Parler au founder` → `mailto:bouzekri@trainflow.fr` (change si besoin)

## Pas encore fait (à voir avec l'IA-builder)

- [ ] Screenshots réels de l'app (actuellement : mockup CSS animé)
- [ ] Témoignages clients (vide tant qu'il n'y a pas de beta users)
- [ ] OG image custom (actuellement : pas d'image)
- [ ] Page `/pricing` détaillée si besoin
- [ ] Page `/blog` pour SEO long-terme

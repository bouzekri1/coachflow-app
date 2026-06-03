# Déploiement TrainFlow — Hetzner + Cloudflare Pages

Setup cible : **~4,50 €/mois** + nom de domaine.

- Backend Django : VPS Hetzner CX22 (Docker, Caddy reverse-proxy, HTTPS auto)
- Frontend React : Cloudflare Pages (gratuit, CDN mondial)
- Postgres : sur le même VPS que Django (volume Docker)
- Storage media : volume Docker (migration vers Cloudflare R2 post-beta)

---

## 1. Pré-requis

- [ ] Un nom de domaine (ex: `trainflow.fr` chez OVH/Cloudflare)
- [ ] Compte Hetzner ([accounts.hetzner.com](https://accounts.hetzner.com))
- [ ] Compte Cloudflare ([cloudflare.com](https://cloudflare.com))
- [ ] Compte Sentry (optionnel, [sentry.io](https://sentry.io))
- [ ] Compte Brevo pour l'email transactionnel ([brevo.com](https://brevo.com)) — 300 mails/j gratuit

---

## 2. Création du VPS Hetzner

1. Hetzner Cloud → **+ Add Server**
2. **Location** : Falkenstein (Allemagne, RGPD)
3. **Image** : Ubuntu 24.04
4. **Type** : CX22 (4 €/mois) ou CPX21 si tu veux du x86 garanti
5. **Networking** : laisser IPv4 + IPv6 publics
6. **SSH key** : ajoute ta clé publique (`~/.ssh/id_ed25519.pub`)
7. **Volumes / Backups** : active les backups (+20% du prix, recommandé)
8. **Create & Buy**

Note l'IP publique du serveur.

---

## 3. Pointer les domaines

Sur ton registrar / Cloudflare DNS :

| Type | Nom | Cible | Note |
|---|---|---|---|
| A | `api` | `IP_HETZNER` | Backend Django |
| A ou CNAME | `app` | (à définir étape 6) | Frontend Cloudflare Pages |

Attends quelques minutes que le DNS propage.

---

## 4. Provisionner le VPS

```bash
ssh root@IP_HETZNER

# Lance le script de provisioning
curl -sSL https://raw.githubusercontent.com/bouzekri1/coachflow-app/main/deploy/setup.sh | bash
```

Le script installe Docker, configure UFW (ports 22/80/443), crée l'user `coachflow`, et clone le repo dans `/opt/coachflow`.

### 4.1 Configurer le `.env`

```bash
sudo -u coachflow -i
cd /opt/coachflow/coachflow_project
cp .env.example .env
nano .env
```

À renseigner impérativement :
- `SECRET_KEY` (génère avec `python3 -c "import secrets;print(secrets.token_urlsafe(50))"`)
- `DEBUG=False`
- `ALLOWED_HOSTS=api.trainflow.fr`
- `API_DOMAIN=api.trainflow.fr`
- `DB_PASSWORD=<un mot de passe long>`
- `CORS_ALLOWED_ORIGINS=https://app.trainflow.fr`
- `FRONTEND_URL=https://app.trainflow.fr`
- `EMAIL_*` (cf. section Brevo plus bas)
- `ANTHROPIC_API_KEY=`
- `GOOGLE_OAUTH_CLIENT_ID/SECRET=`
- `GOOGLE_CALENDAR_REDIRECT_URI=https://api.trainflow.fr/api/auth/google-calendar/callback/`
- `SENTRY_DSN=` (optionnel)

### 4.2 Premier démarrage

```bash
cd /opt/coachflow
docker compose --env-file coachflow_project/.env up -d --build
```

Caddy obtient un certificat Let's Encrypt automatiquement (vérifier que `api.trainflow.fr` pointe bien sur l'IP avant).

Suivre les logs :
```bash
docker compose logs -f
```

Tester :
```bash
curl https://api.trainflow.fr/api/auth/me/
# → 401 Unauthorized (normal sans token = la stack marche)
```

### 4.3 Créer un superuser

```bash
docker compose exec backend python manage.py createsuperuser
```

→ Admin Django accessible sur `https://api.trainflow.fr/admin/`.

### 4.4 Installer les crons

```bash
mkdir -p /var/log/coachflow
crontab -e
# Copie le contenu de deploy/crontab.example
```

---

## 5. Email transactionnel (Brevo)

1. Crée un compte sur [brevo.com](https://brevo.com)
2. Settings → SMTP & API → Generate a new SMTP key
3. Dans `.env` :
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<email du compte Brevo>
EMAIL_HOST_PASSWORD=<SMTP key Brevo>
DEFAULT_FROM_EMAIL=TrainFlow <noreply@trainflow.fr>
```
4. Brevo → Senders & IPs → ajoute `noreply@trainflow.fr` et suis la procédure SPF/DKIM (TXT records à ajouter au DNS)
5. Redémarre le backend : `docker compose restart backend`

---

## 6. Frontend Cloudflare Pages

1. Cloudflare → **Workers & Pages** → Create → Pages → Connect to Git
2. Sélectionne ton repo GitHub
3. **Build settings** :
   - Framework preset : `Create React App`
   - Build command : `cd coachflow_frontend && npm install && npm run build`
   - Build output directory : `coachflow_frontend/build`
4. **Environment variables** :
   - `REACT_APP_API_URL` = `https://api.trainflow.fr/api`
   - `REACT_APP_GOOGLE_CLIENT_ID` = ton Client ID Google
   - `REACT_APP_SENTRY_DSN` = (optionnel)
   - `REACT_APP_SENTRY_ENVIRONMENT` = `production`
5. Save & Deploy
6. Custom domain : `app.trainflow.fr` → suis les instructions Cloudflare (ils créent un CNAME pour toi)

---

## 7. GitHub Actions (déploiement auto)

Sur GitHub → Settings → Secrets and variables → Actions → New secret :

| Secret | Valeur |
|---|---|
| `DEPLOY_HOST` | IP ou domaine du VPS |
| `DEPLOY_USER` | `coachflow` |
| `DEPLOY_SSH_KEY` | clé privée SSH (générée avec `ssh-keygen -t ed25519`) |
| `DEPLOY_PORT` | `22` (ou autre si tu as changé) |

Ajoute la clé publique correspondante dans `/home/coachflow/.ssh/authorized_keys` sur le VPS.

Test : push sur `main` → l'action `Deploy backend` se lance automatiquement.

---

## 8. Backups

Hetzner Backups (activés à l'étape 2) → snapshot quotidien gardé 7 jours.

En complément, la commande `backup_db` exporte un dump Postgres + media (cron déjà installé).

Pour les récupérer en local :
```bash
scp coachflow@IP_HETZNER:/opt/coachflow/coachflow_project/backups/latest.sql.gz .
```

---

## 9. Monitoring

- **Sentry** : erreurs Django + React (cf. `.env.example`)
- **Hetzner Cloud Console** : graphes CPU/RAM/réseau intégrés
- **Logs containers** : `docker compose logs --tail 200 -f backend`

---

## 10. Checklist post-déploiement

- [ ] `https://api.trainflow.fr/admin/` accessible avec ton superuser
- [ ] `https://app.trainflow.fr/login` charge le frontend
- [ ] Inscription + email de vérification reçu
- [ ] Login Google fonctionnel (penser à ajouter `https://app.trainflow.fr` dans les origines JS autorisées Google Cloud Console + `https://api.trainflow.fr/api/auth/google-calendar/callback/` comme redirect URI)
- [ ] Cron `send_rappels` testé : `docker compose exec backend python manage.py send_rappels`
- [ ] Sentry reçoit un event test (créer une erreur volontaire)
- [ ] Backup créé : `docker compose exec backend python manage.py backup_db`

---

## 11. Coût mensuel estimé

| Poste | Coût |
|---|---|
| Hetzner CX22 | 4,51 € |
| Hetzner Backups | ~0,90 € |
| Cloudflare Pages | 0 € |
| Cloudflare DNS | 0 € |
| Brevo (300 mails/j) | 0 € |
| Sentry (5k events/mois) | 0 € |
| Domaine `.fr` (annualisé) | ~0,75 € |
| **Total** | **≈ 6 €/mois** |

Au-delà de la beta, prévoir : Stripe (1,4 % + 25c/transaction), domain emails (Brevo Pro à 19 €/mois si > 300 mails/j), VPS plus gros (CX32 à 7,90 € si trafic significatif).

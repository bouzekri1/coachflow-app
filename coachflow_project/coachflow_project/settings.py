from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

# Google OAuth : Google retourne souvent les scopes dans un ordre/format différent
# de celui demandé (ex: ajoute 'openid' ou réordonne). Sans ce flag,
# google-auth-oauthlib lève une Warning promue en exception à fetch_token.
os.environ.setdefault('OAUTHLIB_RELAX_TOKEN_SCOPE', '1')

# ── SÉCURITÉ DE BASE ───────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY manquante dans .env — génère-en une avec : "
                       "python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\"")

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ── SENTRY (monitoring d'erreurs) ──────────────────────────────────────────────
# Activé uniquement si SENTRY_DSN est défini.
SENTRY_DSN = os.environ.get('SENTRY_DSN', '').strip()
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    def _before_send(event, hint):
        # Scrub des champs sensibles supplémentaires au cas où.
        req = event.get('request') or {}
        data = req.get('data')
        if isinstance(data, dict):
            for k in ('password', 'new_password', 'old_password', 'confirm', 'id_token', 'token'):
                if k in data:
                    data[k] = '[Filtered]'
        return event

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        environment=os.environ.get('SENTRY_ENVIRONMENT', 'production' if not DEBUG else 'development'),
        release=os.environ.get('SENTRY_RELEASE', None),
        send_default_pii=True,             # user.id / username pour triager — pas le password
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        profiles_sample_rate=0.0,          # désactivé (économise les events)
        before_send=_before_send,
    )

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'core',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'coachflow_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'coachflow_project.wsgi.application'

if os.environ.get('DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME':     os.environ.get('DB_NAME'),
            'USER':     os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST':     os.environ.get('DB_HOST', 'localhost'),
            'PORT':     os.environ.get('DB_PORT', '5432'),
        }
    }
else:
    # Fallback SQLite pour le développement sans PostgreSQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'core.User'
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── DJANGO REST FRAMEWORK ──────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.auth.CookieTokenAuthentication',
        # SessionAuthentication retiré : inutile pour notre SPA et déclenche le check CSRF
        # quand l'utilisateur a une session Django active (ex: connexion à /admin/).
        # L'admin Django continue de fonctionner via son middleware propre.
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '300/hour',
        'user': '5000/hour',
        'login': '10/hour',           # 10 tentatives max par heure par IP
        'password_reset': '5/hour',   # 5 demandes max par heure par IP
        'resend_verification': '5/hour', # 5 demandes max par heure par IP
    },
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# ── CORS ───────────────────────────────────────────────────────────────────────
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOW_ALL_ORIGINS intentionnellement supprimé

# ── EN-TÊTES DE SÉCURITÉ HTTP ──────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER   = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS             = 'DENY'

# Mode prod (DEBUG=False) → on durcit HTTPS / cookies / HSTS
if not DEBUG:
    SECURE_PROXY_SSL_HEADER       = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT           = True
    SECURE_HSTS_SECONDS           = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD           = True
    SESSION_COOKIE_SECURE         = True
    CSRF_COOKIE_SECURE            = True
    SESSION_COOKIE_HTTPONLY       = True
    CSRF_COOKIE_HTTPONLY          = True

# ── UPLOAD FICHIERS ────────────────────────────────────────────────────────────
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024   # 5 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024   # 5 MB

# ── AUTH & SESSIONS ────────────────────────────────────────────────────────────
LOGIN_URL             = '/login/'
LOGIN_REDIRECT_URL    = '/dashboard/'
LOGOUT_REDIRECT_URL   = '/login/'
SESSION_COOKIE_AGE    = 86400 * 14               # 14 jours
SESSION_COOKIE_HTTPONLY = True

# ── EMAIL ──────────────────────────────────────────────────────────────────────
EMAIL_BACKEND    = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST       = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT       = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS    = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER  = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL', 'TrainFlow <noreply@trainflow.fr>')

# ── PUSH NOTIFICATIONS ─────────────────────────────────────────────────────────
VAPID_PUBLIC_KEY  = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')   # Pas de valeur par défaut
VAPID_ADMIN_EMAIL = os.environ.get('VAPID_ADMIN_EMAIL', 'admin@trainflow.fr')

# ── IA ─────────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# ── GOOGLE OAUTH ───────────────────────────────────────────────────────────────
GOOGLE_OAUTH_CLIENT_ID = os.environ.get('GOOGLE_OAUTH_CLIENT_ID', '')
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '')
GOOGLE_CALENDAR_REDIRECT_URI = os.environ.get('GOOGLE_CALENDAR_REDIRECT_URI', 'http://127.0.0.1:8000/api/auth/google-calendar/callback/')

# ── FRONTEND URL (utilisé pour redirections après OAuth) ──────────────────────
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# ── FEEDBACK / SUPPORT ────────────────────────────────────────────────────────
FEEDBACK_EMAIL = os.environ.get('FEEDBACK_EMAIL', '')  # ex: ton email pour recevoir les retours beta

# ── BACKUPS ────────────────────────────────────────────────────────────────────
BACKUP_DIR         = os.environ.get('BACKUP_DIR', str(BASE_DIR / 'backups'))
BACKUP_KEEP_DB     = int(os.environ.get('BACKUP_KEEP_DB', 14))    # 14 derniers backups DB
BACKUP_KEEP_MEDIA  = int(os.environ.get('BACKUP_KEEP_MEDIA', 7))  # 7 derniers backups media
BACKUP_ALERT_EMAIL = os.environ.get('BACKUP_ALERT_EMAIL', '')

# ── LOGGING ────────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '{levelname} {asctime} {module}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
            'level': 'WARNING',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

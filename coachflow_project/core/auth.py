"""Authentification par token stocké en cookie httpOnly + anti-CSRF custom header."""
from rest_framework.authentication import TokenAuthentication, get_authorization_header
from rest_framework import exceptions

COOKIE_NAME = 'cf_auth'
CSRF_SAFE_METHODS = {'GET', 'HEAD', 'OPTIONS'}


class CookieTokenAuthentication(TokenAuthentication):
    """
    Lit le token DRF depuis :
    1. le cookie httpOnly 'cf_auth' (priorité — usage browser standard)
    2. l'en-tête Authorization Token <key> (fallback pour clients non-browser)

    Pour les requêtes non sûres (POST/PUT/PATCH/DELETE), exige l'en-tête
    'X-Requested-With: XMLHttpRequest' (anti-CSRF par custom-header trick :
    un site tiers ne peut pas le poser sans déclencher un preflight CORS
    que notre serveur refuse).
    """

    def authenticate(self, request):
        # Header standard d'abord (clients SDK / cron / curl)
        auth = get_authorization_header(request).split()
        if auth and auth[0].lower() == b'token':
            return super().authenticate(request)

        # Sinon, cookie
        raw = request.COOKIES.get(COOKIE_NAME)
        if not raw:
            return None

        # Anti-CSRF : custom header obligatoire sur les méthodes mutantes
        if request.method not in CSRF_SAFE_METHODS:
            if request.META.get('HTTP_X_REQUESTED_WITH') != 'XMLHttpRequest':
                raise exceptions.AuthenticationFailed('CSRF: en-tête X-Requested-With requis.')

        return self.authenticate_credentials(raw)

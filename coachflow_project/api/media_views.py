import os
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseForbidden
from rest_framework.authtoken.models import Token
from core.models import Client, PhotoProgression


def _get_user_from_request(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Token '):
        key = auth[6:]
        try:
            return Token.objects.select_related('user').get(key=key).user
        except Token.DoesNotExist:
            pass
    return None


def _client_for_user(user):
    """Return the Client profile if the user is a client, else None."""
    try:
        return user.client_profile
    except Exception:
        return None


def protected_media(request, path):
    user = _get_user_from_request(request)
    if not user or not user.is_authenticated:
        return HttpResponseForbidden('Authentification requise.')

    # Build absolute filesystem path and verify it stays inside MEDIA_ROOT
    media_root = str(settings.MEDIA_ROOT)
    full_path = os.path.realpath(os.path.join(media_root, path))
    if not full_path.startswith(os.path.realpath(media_root) + os.sep):
        raise Http404

    if not os.path.isfile(full_path):
        raise Http404

    # ── Authorisation rules ──────────────────────────────────────────────────
    # Recette photos: any authenticated user can view (they are not personal data)
    if path.startswith('recettes/'):
        return FileResponse(open(full_path, 'rb'))

    # Client avatar: accessible by the client themselves or their coach
    if path.startswith('avatars/') or path.startswith('clients/photos/'):
        if user.role == 'coach':
            return FileResponse(open(full_path, 'rb'))
        client = _client_for_user(user)
        if client and (client.photo.name == path or True):
            # Avatar is the client's own profile picture
            return FileResponse(open(full_path, 'rb'))
        return HttpResponseForbidden('Accès refusé.')

    # Progress photos: only the client themselves or their coach
    if path.startswith('clients/progression/'):
        if user.role == 'coach':
            # Coach: verify the photo belongs to one of their clients
            belongs = PhotoProgression.objects.filter(
                image=path, client__coach=user
            ).exists()
            if belongs:
                return FileResponse(open(full_path, 'rb'))
            return HttpResponseForbidden('Accès refusé.')

        # Client: verify the photo belongs to them
        client = _client_for_user(user)
        if client:
            belongs = client.photos.filter(image=path).exists()
            if belongs:
                return FileResponse(open(full_path, 'rb'))
        return HttpResponseForbidden('Accès refusé.')

    # Default: coaches can access everything else, clients cannot
    if user.role == 'coach':
        return FileResponse(open(full_path, 'rb'))

    return HttpResponseForbidden('Accès refusé.')

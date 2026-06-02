"""Quota mensuel + cache 24h pour les générations IA (plan, programme)."""
import hashlib
import json
from datetime import date, timedelta
from django.utils import timezone
from .models import CoachProfile, IACache

CACHE_TTL_HOURS = 24


def _ensure_profile(coach):
    profile, _ = CoachProfile.objects.get_or_create(user=coach)
    today = date.today()
    if profile.ia_quota_reset_at is None or (
        profile.ia_quota_reset_at.year != today.year
        or profile.ia_quota_reset_at.month != today.month
    ):
        profile.ia_generations_count_mois = 0
        profile.ia_quota_reset_at = today.replace(day=1)
        profile.save(update_fields=['ia_generations_count_mois', 'ia_quota_reset_at'])
    return profile


def _hash_params(client_id, params: dict) -> str:
    payload = {'client_id': str(client_id), 'params': params}
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def lookup_cache(coach, endpoint, client_id, params):
    """Retourne (entry, params_hash). entry=None si pas de cache valide."""
    h = _hash_params(client_id, params)
    cutoff = timezone.now() - timedelta(hours=CACHE_TTL_HOURS)
    entry = (IACache.objects
             .filter(coach=coach, endpoint=endpoint, params_hash=h, created_at__gte=cutoff)
             .order_by('-created_at')
             .first())
    return entry, h


def check_quota(coach):
    """Retourne (ok, profile). Si !ok, le quota mensuel est atteint."""
    profile = _ensure_profile(coach)
    return profile.ia_generations_count_mois < profile.ia_quota_mensuel, profile


def record_generation(coach, endpoint, params_hash, result, profile=None):
    if profile is None:
        profile = _ensure_profile(coach)
    IACache.objects.create(coach=coach, endpoint=endpoint, params_hash=params_hash, result=result)
    profile.ia_generations_count_mois = (profile.ia_generations_count_mois or 0) + 1
    profile.save(update_fields=['ia_generations_count_mois'])


def quota_status(coach):
    profile = _ensure_profile(coach)
    return {
        'utilise': profile.ia_generations_count_mois,
        'quota': profile.ia_quota_mensuel,
        'restant': max(0, profile.ia_quota_mensuel - profile.ia_generations_count_mois),
        'reset_at': profile.ia_quota_reset_at,
    }

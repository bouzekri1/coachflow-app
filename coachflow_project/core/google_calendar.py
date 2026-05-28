"""
Helpers pour synchroniser le calendrier d'un coach avec Google Calendar.
Bidirectionnel : push des séances CoachFlow vers Google + lecture des
événements Google pour bloquer les créneaux de réservation.
"""
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
]


def get_credentials(token_obj):
    """Construit un objet Credentials, rafraîchit si expiré. Retourne None si invalide."""
    if not token_obj or not token_obj.refresh_token:
        return None
    creds = Credentials(
        token=token_obj.access_token,
        refresh_token=token_obj.refresh_token,
        token_uri=token_obj.token_uri,
        client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
        scopes=SCOPES,
    )
    # Rafraîchir si expiré
    if creds.expired or token_obj.expires_at <= timezone.now():
        try:
            creds.refresh(Request())
            token_obj.access_token = creds.token
            if creds.expiry:
                token_obj.expires_at = timezone.make_aware(creds.expiry) if creds.expiry.tzinfo is None else creds.expiry
            token_obj.save(update_fields=['access_token', 'expires_at', 'updated_at'])
        except Exception as e:
            logger.warning(f"Refresh token failed for user {token_obj.user_id}: {e}")
            return None
    return creds


def _service(user):
    """Retourne (service, calendar_id) ou (None, None) si non connecté."""
    token = getattr(user, 'google_calendar', None)
    if not token or not token.sync_enabled:
        return None, None
    creds = get_credentials(token)
    if not creds:
        return None, None
    try:
        return build('calendar', 'v3', credentials=creds, cache_discovery=False), token.calendar_id
    except Exception as e:
        logger.warning(f"Failed to build Google Calendar service: {e}")
        return None, None


def _seance_to_event(seance):
    fin = seance.date_heure + timedelta(minutes=seance.duree_minutes)
    client_nom = f"{seance.client.prenom} {seance.client.nom}".strip()
    return {
        'summary': seance.titre or f"Séance — {client_nom}",
        'description': (
            f"Client : {client_nom}\n"
            f"Type : {seance.get_type_seance_display()}\n"
            f"Statut : {seance.get_statut_display()}\n"
            f"{seance.notes_avant or ''}"
        ).strip(),
        'start': {'dateTime': seance.date_heure.isoformat(), 'timeZone': str(timezone.get_current_timezone())},
        'end':   {'dateTime': fin.isoformat(),               'timeZone': str(timezone.get_current_timezone())},
        'extendedProperties': {
            'private': {'coachflow_seance_id': str(seance.id)},
        },
    }


def push_seance(seance):
    """Crée ou met à jour l'événement Google pour cette séance."""
    service, cal_id = _service(seance.coach)
    if not service:
        return None
    event_body = _seance_to_event(seance)
    try:
        if seance.google_event_id:
            service.events().update(calendarId=cal_id, eventId=seance.google_event_id, body=event_body).execute()
            return seance.google_event_id
        else:
            ev = service.events().insert(calendarId=cal_id, body=event_body).execute()
            return ev.get('id')
    except HttpError as e:
        # Si l'event a disparu côté Google, on recrée
        if e.resp.status in (404, 410) and seance.google_event_id:
            try:
                ev = service.events().insert(calendarId=cal_id, body=event_body).execute()
                return ev.get('id')
            except Exception as e2:
                logger.warning(f"Re-insert failed for séance {seance.id}: {e2}")
        logger.warning(f"push_seance failed for séance {seance.id}: {e}")
    except Exception as e:
        logger.warning(f"push_seance failed for séance {seance.id}: {e}")
    return None


def delete_seance(coach, google_event_id):
    """Supprime l'événement Google d'une séance."""
    if not google_event_id:
        return
    service, cal_id = _service(coach)
    if not service:
        return
    try:
        service.events().delete(calendarId=cal_id, eventId=google_event_id).execute()
    except HttpError as e:
        if e.resp.status not in (404, 410):
            logger.warning(f"delete_seance failed: {e}")
    except Exception as e:
        logger.warning(f"delete_seance failed: {e}")


def list_busy(coach, date_start, date_end):
    """
    Retourne les périodes occupées dans Google Calendar du coach entre deux dates.
    Format : [(datetime_start, datetime_end), ...]
    Exclut les événements créés par CoachFlow (pour éviter de bloquer nos propres créneaux).

    Respecte le toggle CoachProfile.gcal_block_allday :
    - True (défaut)  → bloque tous les events all-day, peu importe leur transparency
    - False          → respecte la transparency Google (les all-day par défaut 'transparent' ne bloquent pas)
    """
    service, cal_id = _service(coach)
    if not service:
        return []

    profile = getattr(coach, 'coach_profile', None)
    block_allday = profile.gcal_block_allday if profile else True

    t_min = datetime.combine(date_start, datetime.min.time())
    t_max = datetime.combine(date_end, datetime.max.time())
    t_min = timezone.make_aware(t_min) if t_min.tzinfo is None else t_min
    t_max = timezone.make_aware(t_max) if t_max.tzinfo is None else t_max
    try:
        events = service.events().list(
            calendarId=cal_id,
            timeMin=t_min.isoformat(),
            timeMax=t_max.isoformat(),
            singleEvents=True,
            orderBy='startTime',
            maxResults=250,
        ).execute()
    except Exception as e:
        logger.warning(f"list_busy failed: {e}")
        return []

    busy = []
    for ev in events.get('items', []):
        # Skip nos propres séances pour ne pas double-bloquer
        priv = (ev.get('extendedProperties') or {}).get('private') or {}
        if priv.get('coachflow_seance_id'):
            continue
        start = ev.get('start', {}).get('dateTime')
        end = ev.get('end', {}).get('dateTime')
        is_allday = not start or not end
        is_transparent = ev.get('transparency') == 'transparent'

        if is_allday:
            # Si le coach a désactivé le blocage all-day, on respecte la transparency
            if not block_allday and is_transparent:
                continue
            d_start = ev.get('start', {}).get('date')
            d_end = ev.get('end', {}).get('date')
            if d_start and d_end:
                from datetime import date as _date
                ds = timezone.make_aware(datetime.combine(_date.fromisoformat(d_start), datetime.min.time()))
                de = timezone.make_aware(datetime.combine(_date.fromisoformat(d_end), datetime.min.time()))
                busy.append((ds, de))
            continue

        # Events timés : on respecte toujours le flag transparency
        if is_transparent:
            continue
        try:
            ds = datetime.fromisoformat(start.replace('Z', '+00:00'))
            de = datetime.fromisoformat(end.replace('Z', '+00:00'))
            busy.append((ds, de))
        except ValueError:
            continue
    return busy


def fetch_user_email(creds):
    """Récupère l'email Google de l'utilisateur connecté."""
    try:
        oauth_service = build('oauth2', 'v2', credentials=creds, cache_discovery=False)
        info = oauth_service.userinfo().get().execute()
        return info.get('email', '')
    except Exception as e:
        logger.warning(f"fetch_user_email failed: {e}")
        return ''

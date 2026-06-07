from django.db.models import Sum, Q
from django.utils import timezone
from django.conf import settings
from django.shortcuts import get_object_or_404
from datetime import timedelta, date, datetime
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle

# ── VALIDATION MOT DE PASSE ───────────────────────────────────────────────────
def _validate_password(password, user=None):
    """
    Exécute tous les AUTH_PASSWORD_VALIDATORS Django.
    Retourne None si valide, ou un message d'erreur lisible sinon.
    """
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError
    try:
        validate_password(password, user=user)
        return None
    except ValidationError as e:
        return ' '.join(e.messages)


# ── VALIDATION UPLOAD IMAGE ────────────────────────────────────────────────────
_ALLOWED_MIME  = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
_ALLOWED_EXT   = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
_MAX_SIZE      = 5 * 1024 * 1024   # 5 MB

def _validate_image(image):
    """Retourne (True, None) si valide, (False, message) sinon."""
    if image.size > _MAX_SIZE:
        return False, 'Fichier trop volumineux (max 5 Mo).'
    if image.content_type not in _ALLOWED_MIME:
        return False, f'Format non autorisé. Acceptés : JPEG, PNG, WebP, GIF.'
    ext = image.name.rsplit('.', 1)[-1].lower() if '.' in image.name else ''
    if ext not in _ALLOWED_EXT:
        return False, 'Extension de fichier non autorisée.'
    return True, None

class RecettePagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
from django.contrib.auth import authenticate
from django.http import HttpResponse
from core.models import *
from .serializers import *
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER


def generer_alertes(coach):
    """Génère automatiquement les alertes manquantes pour un coach."""
    today = date.today()

    # Factures passées en retard
    for f in Facture.objects.filter(coach=coach, date_echeance__lt=today, statut='envoyee'):
        f.statut = 'retard'
        f.save(update_fields=['statut'])
        if not Alerte.objects.filter(coach=coach, client=f.client, type_alerte='facture_retard', traitee=False).exists():
            Alerte.objects.create(
                coach=coach, client=f.client, type_alerte='facture_retard',
                titre=f'Facture en retard : {f.numero}',
                description=f'La facture {f.numero} de {f.montant_ttc} € est en retard de {f.jours_retard} jour(s).',
                priorite='haute',
            )

    # Programmes se terminant dans 7 jours
    for a in AssignationProgramme.objects.filter(
        client__coach=coach, statut='en_cours',
        date_fin_prevue__lte=today + timedelta(days=7),
        date_fin_prevue__gte=today,
    ):
        if not Alerte.objects.filter(coach=coach, client=a.client, type_alerte='fin_programme', traitee=False).exists():
            Alerte.objects.create(
                coach=coach, client=a.client, type_alerte='fin_programme',
                titre=f'Programme bientôt terminé : {a.programme.nom}',
                description=f'Le programme de {a.client.prenom} se termine le {a.date_fin_prevue.strftime("%d/%m/%Y")}.',
                priorite='moyenne',
            )

    # Clients actifs sans séance réalisée depuis 14 jours
    seuil = timezone.now() - timedelta(days=14)
    for c in Client.objects.filter(coach=coach, statut='actif'):
        last = c.seances.filter(statut='realisee').order_by('-date_heure').first()
        if last is None or last.date_heure < seuil:
            if not Alerte.objects.filter(coach=coach, client=c, type_alerte='inactivite', traitee=False).exists():
                Alerte.objects.create(
                    coach=coach, client=c, type_alerte='inactivite',
                    titre=f'Client inactif : {c.nom_complet}',
                    description=f'{c.prenom} n\'a pas eu de séance réalisée depuis plus de 14 jours.',
                    priorite='moyenne',
                )

    # Facture mensuelle manquante (clients en mode 'mensuel' actifs, à partir du 5 du mois)
    if today.day >= 5:
        month_start = today.replace(day=1)
        for c in Client.objects.filter(
            coach=coach,
            statut__in=['actif', 'nouveau'],
            mode_facturation='mensuel',
            tarif__isnull=False,
        ):
            has_facture = Facture.objects.filter(
                coach=coach, client=c, date_emission__gte=month_start,
            ).exists()
            if not has_facture and not Alerte.objects.filter(
                coach=coach, client=c, type_alerte='facture_mensuelle_manquante',
                created_at__gte=month_start, traitee=False,
            ).exists():
                Alerte.objects.create(
                    coach=coach, client=c, type_alerte='facture_mensuelle_manquante',
                    titre=f'Facture du mois à émettre : {c.nom_complet}',
                    description=f'Aucune facture émise ce mois-ci pour {c.prenom} ({c.tarif} €/mois).',
                    priorite='moyenne',
                )


def coach_required(view_func):
    """Vérifie que l'user est bien un coach."""
    def wrapper(self, request, *args, **kwargs):
        if request.user.role != 'coach':
            return Response({'error': 'Accès réservé aux coachs.'}, status=403)
        return view_func(self, request, *args, **kwargs)
    return wrapper


# ─── AUTH ─────────────────────────────────────────────────────────────────────

def _set_auth_cookie(response, token_key):
    """Pose le cookie d'auth httpOnly. Secure en prod uniquement."""
    response.set_cookie(
        'cf_auth',
        token_key,
        max_age=60 * 60 * 24 * 30,                 # 30 jours
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path='/',
    )
    return response


def _clear_auth_cookie(response):
    response.delete_cookie('cf_auth', path='/')
    return response


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'

class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'

class ResendVerificationThrottle(AnonRateThrottle):
    scope = 'resend_verification'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    identifier = request.data.get('username', '')
    password   = request.data.get('password')
    if '@' in identifier:
        # Si plusieurs comptes partagent le même email, on prend le coach en priorité
        matches = User.objects.filter(email=identifier)
        if not matches.exists():
            return Response({'error': 'Identifiants invalides.'}, status=400)
        user_match = matches.filter(role='coach').first() or matches.first()
        identifier = user_match.username
    user = authenticate(username=identifier, password=password)
    if not user:
        # Compte existant mais bloqué : on distingue les cas
        candidate = User.objects.filter(username=identifier).first() \
            or User.objects.filter(email=identifier).first()
        if candidate and candidate.check_password(password or ''):
            if candidate.deleted_at:
                return Response({'error': 'Ce compte a été supprimé. Contactez support@trainflow.fr pour le réactiver (sous 30 jours).'}, status=400)
            if not candidate.email_verified:
                return Response({
                    'error': 'Vérifiez votre email avant de vous connecter. Un lien de confirmation vous a été envoyé.',
                    'code': 'email_not_verified',
                    'email': candidate.email,
                }, status=403)
        return Response({'error': 'Identifiants invalides.'}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    resp = Response({'user': UserSerializer(user).data})
    return _set_auth_cookie(resp, token.key)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """Supprime le token côté serveur + clear cookie."""
    if request.user.is_authenticated:
        Token.objects.filter(user=request.user).delete()
    resp = Response({'status': 'ok'})
    return _clear_auth_cookie(resp)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def register_view(request):
    from django.core import signing
    data = request.data

    if not data.get('email'):
        return Response({'error': 'L\'adresse email est obligatoire.'}, status=400)
    if User.objects.filter(username=data.get('username')).exists():
        return Response({'error': 'Nom d\'utilisateur déjà pris.'}, status=400)
    if User.objects.filter(email=data.get('email')).exists():
        return Response({'error': 'Email déjà utilisé.'}, status=400)

    pw_error = _validate_password(data.get('password', ''))
    if pw_error:
        return Response({'error': pw_error}, status=400)

    user = User.objects.create_user(
        username=data['username'],
        email=data['email'],
        password=data['password'],
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        role='coach',
        is_active=False,
        email_verified=False,
    )
    CoachProfile.objects.create(user=user)

    token = signing.dumps({'user_id': str(user.id)}, salt='email-verification')
    from .email_service import envoyer_verification_email
    envoyer_verification_email(user, token)

    return Response({'status': 'pending_verification', 'email': user.email}, status=201)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email_view(request):
    from django.core import signing
    from django.core.signing import SignatureExpired, BadSignature

    token = request.GET.get('token')
    if not token:
        return Response({'error': 'Token manquant.'}, status=400)
    try:
        data = signing.loads(token, salt='email-verification', max_age=86400)
    except SignatureExpired:
        return Response({'error': 'Ce lien a expiré. Veuillez vous réinscrire.'}, status=400)
    except BadSignature:
        return Response({'error': 'Lien invalide.'}, status=400)

    try:
        user = User.objects.get(id=data['user_id'])
    except User.DoesNotExist:
        return Response({'error': 'Compte introuvable.'}, status=404)

    if user.email_verified:
        return Response({'status': 'already_verified'})

    user.is_active = True
    user.email_verified = True
    user.save(update_fields=['is_active', 'email_verified'])

    if user.role == 'coach':
        try:
            from .email_service import envoyer_bienvenue_coach
            envoyer_bienvenue_coach(user)
        except Exception:
            pass

    auth_token, _ = Token.objects.get_or_create(user=user)
    resp = Response({
        'status': 'verified',
        'user': UserSerializer(user).data,
    })
    return _set_auth_cookie(resp, auth_token.key)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ResendVerificationThrottle])
def resend_verification_view(request):
    from django.core import signing
    from .email_service import envoyer_verification_email
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'Email requis.'}, status=400)
    user = User.objects.filter(email__iexact=email, deleted_at__isnull=True).first()
    # Réponse identique si le user existe ou pas → évite l'énumération d'emails
    if user and not user.email_verified:
        token = signing.dumps({'user_id': str(user.id)}, salt='email-verification')
        try:
            envoyer_verification_email(user, token)
        except Exception:
            pass
    return Response({'status': 'sent'})


@api_view(['POST'])
def onboarding_done_view(request):
    profile, _ = CoachProfile.objects.get_or_create(user=request.user)
    profile.onboarding_completed = True
    profile.save(update_fields=['onboarding_completed'])
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_request_view(request):
    from django.core import signing
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'Email obligatoire.'}, status=400)
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user:
        token = signing.dumps({'user_id': str(user.id)}, salt='password-reset')
        from .email_service import envoyer_reset_password
        envoyer_reset_password(user, token)
    # Toujours répondre OK pour ne pas révéler si l'email existe
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_confirm_view(request):
    from django.core import signing
    from django.core.signing import SignatureExpired, BadSignature
    token = request.data.get('token')
    password = request.data.get('password', '')
    if not token or not password:
        return Response({'error': 'Token et mot de passe obligatoires.'}, status=400)
    pw_error = _validate_password(password)
    if pw_error:
        return Response({'error': pw_error}, status=400)
    try:
        data = signing.loads(token, salt='password-reset', max_age=3600)
    except SignatureExpired:
        return Response({'error': 'Ce lien a expiré (valable 1 heure). Faites une nouvelle demande.'}, status=400)
    except BadSignature:
        return Response({'error': 'Lien invalide.'}, status=400)
    try:
        user = User.objects.get(id=data['user_id'])
    except User.DoesNotExist:
        return Response({'error': 'Compte introuvable.'}, status=404)
    user.set_password(password)
    user.save(update_fields=['password'])
    Token.objects.filter(user=user).delete()
    return Response({'status': 'ok'})


@api_view(['GET', 'PATCH', 'DELETE'])
def me_view(request):
    user = request.user

    if request.method == 'GET':
        from core.ia_quota import quota_status
        data = UserSerializer(user).data
        if user.role == 'coach':
            profile, _ = CoachProfile.objects.get_or_create(user=user)
            data['plan'] = profile.plan
            data['onboarding_completed'] = profile.onboarding_completed
            data['reservation_active']   = profile.reservation_active
            data['reservation_preavis_h']= profile.reservation_preavis_h
            data['reservation_horizon_j']= profile.reservation_horizon_j
            data['reservation_duree_min']= profile.reservation_duree_min
            data['gcal_block_allday']    = profile.gcal_block_allday
            data['ia_quota']             = quota_status(user)
        return Response(data)

    if request.method == 'PATCH':
        first_name = request.data.get('first_name', user.first_name)
        last_name  = request.data.get('last_name',  user.last_name)
        user.first_name = first_name
        user.last_name  = last_name
        # Changement de mot de passe optionnel
        old_pw  = request.data.get('old_password')
        new_pw  = request.data.get('new_password')
        if old_pw or new_pw:
            if not user.check_password(old_pw or ''):
                return Response({'error': 'Mot de passe actuel incorrect.'}, status=400)
            pw_error = _validate_password(new_pw or '', user=user)
            if pw_error:
                return Response({'error': pw_error}, status=400)
            user.set_password(new_pw)
            Token.objects.filter(user=user).delete()
        user.save()

        # Paramètres réservation (coach uniquement)
        if user.role == 'coach':
            profile, _ = CoachProfile.objects.get_or_create(user=user)
            for field in ['reservation_active', 'reservation_preavis_h', 'reservation_horizon_j', 'reservation_duree_min', 'gcal_block_allday']:
                if field in request.data:
                    setattr(profile, field, request.data[field])
            profile.save()

        data = UserSerializer(user).data
        if user.role == 'coach':
            from core.ia_quota import quota_status
            data['plan'] = profile.plan
            data['reservation_active']   = profile.reservation_active
            data['reservation_preavis_h']= profile.reservation_preavis_h
            data['reservation_horizon_j']= profile.reservation_horizon_j
            data['reservation_duree_min']= profile.reservation_duree_min
            data['gcal_block_allday']    = profile.gcal_block_allday
            data['ia_quota']             = quota_status(user)
        # Renouveler le cookie d'auth si le mot de passe a changé
        resp = Response(data)
        if old_pw and new_pw:
            token, _ = Token.objects.get_or_create(user=user)
            _set_auth_cookie(resp, token.key)
        return resp

    if request.method == 'DELETE':
        from core.rgpd import soft_delete_user
        from api.email_service import envoyer_confirmation_suppression
        confirm = request.data.get('confirm', '')
        if confirm != 'SUPPRIMER':
            return Response({'error': 'Confirmation invalide.'}, status=400)
        try:
            envoyer_confirmation_suppression(user)
        except Exception:
            pass
        soft_delete_user(user)
        resp = Response(status=204)
        return _clear_auth_cookie(resp)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data_view(request):
    """Export RGPD : ZIP contenant toutes les données du user en JSON."""
    from core.rgpd import build_user_export
    from django.http import HttpResponse
    from datetime import datetime
    payload = build_user_export(request.user)
    resp = HttpResponse(payload, content_type='application/zip')
    fn = f"coachflow_export_{request.user.username}_{datetime.now().strftime('%Y%m%d')}.zip"
    resp['Content-Disposition'] = f'attachment; filename="{fn}"'
    return resp


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def google_login_view(request):
    from google.oauth2 import id_token
    from google.auth.transport import requests as grequests
    from django.conf import settings as django_settings

    credential = request.data.get('id_token')
    if not credential:
        return Response({'error': 'id_token manquant.'}, status=400)

    client_id = django_settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id or client_id.startswith('REMPLACER'):
        return Response({'error': 'Google OAuth non configuré sur le serveur.'}, status=503)

    try:
        idinfo = id_token.verify_oauth2_token(credential, grequests.Request(), client_id)
    except ValueError as e:
        return Response({'error': f'Token Google invalide : {e}'}, status=400)

    email = idinfo.get('email')
    if not email:
        return Response({'error': 'Email non fourni par Google.'}, status=400)

    first_name = idinfo.get('given_name', '')
    last_name = idinfo.get('family_name', '')

    # Trouver l'utilisateur existant (coach en priorité)
    user = User.objects.filter(email=email, role='coach').first() \
           or User.objects.filter(email=email).first()

    if not user:
        # Générer un username unique à partir de l'email
        base = email.split('@')[0].replace('.', '_').lower()
        username = base
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{suffix}'
            suffix += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=None,
            first_name=first_name,
            last_name=last_name,
            role='coach',
            is_active=True,
            email_verified=True,
        )
        CoachProfile.objects.create(user=user)
        from .email_service import envoyer_bienvenue_coach_google
        envoyer_bienvenue_coach_google(user)
    else:
        # Activer un compte en attente de vérification
        if not user.email_verified or not user.is_active:
            user.is_active = True
            user.email_verified = True
            user.save(update_fields=['is_active', 'email_verified'])

    token, _ = Token.objects.get_or_create(user=user)
    resp = Response({'user': UserSerializer(user).data})
    return _set_auth_cookie(resp, token.key)


# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@api_view(['GET'])
def dashboard_view(request):
    user = request.user
    generer_alertes(user)
    now = timezone.now()
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    clients_actifs = Client.objects.filter(coach=user, statut__in=['actif', 'nouveau']).count()

    seances_semaine = Seance.objects.filter(
        coach=user,
        date_heure__gte=week_start,
        date_heure__lt=week_end,
    ).count()

    seances_restantes = Seance.objects.filter(
        coach=user,
        date_heure__gte=now,
        date_heure__lt=week_end,
        statut='planifiee',
    ).count()

    revenus_mois = Facture.objects.filter(
        coach=user,
        date_emission__gte=month_start,
        statut__in=['payee', 'envoyee'],
    ).aggregate(total=Sum('montant_ttc'))['total'] or 0

    # MRR estimé : somme des tarifs des clients mensuels actifs/nouveaux
    mrr_recurrent = Client.objects.filter(
        coach=user,
        statut__in=['actif', 'nouveau'],
        mode_facturation='mensuel',
        tarif__isnull=False,
    ).aggregate(total=Sum('tarif'))['total'] or 0

    # Revenu variable : tarif × séances réalisées le mois dernier pour les clients séance
    last_month_end = month_start
    last_month_start = (last_month_end - timedelta(days=1)).replace(day=1)
    seance_clients = Client.objects.filter(
        coach=user,
        statut__in=['actif', 'nouveau'],
        mode_facturation='seance',
        tarif__isnull=False,
    )
    mrr_seance_estime = 0
    for c in seance_clients:
        nb = c.seances.filter(
            statut='realisee',
            date_heure__date__gte=last_month_start,
            date_heure__date__lt=last_month_end,
        ).count()
        mrr_seance_estime += float(c.tarif) * nb
    mrr_total = float(mrr_recurrent) + mrr_seance_estime

    assignations = AssignationProgramme.objects.filter(
        client__coach=user, statut='en_cours'
    )
    taux = 0
    if assignations.exists():
        taux = round(sum(a.progression_pct for a in assignations) / assignations.count(), 1)

    alertes_non_lues = Alerte.objects.filter(coach=user, lue=False).count()
    messages_non_lus = Message.objects.filter(
        conversation__coach=user, lu=False, expediteur_role='client'
    ).count()

    prochaines = Seance.objects.filter(
        coach=user, date_heure__gte=now, statut='planifiee'
    ).order_by('date_heure')[:6]

    clients_avancement = Client.objects.filter(
        coach=user, statut='actif'
    ).prefetch_related('assignations__programme')[:5]

    # Croissance clients (12 derniers mois)
    clients_par_mois = []
    for i in range(11, -1, -1):
        m_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end   = (m_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        count   = Client.objects.filter(coach=user, created_at__gte=m_start, created_at__lt=m_end).count()
        clients_par_mois.append({
            'mois': m_start.strftime('%b'),
            'clients': count,
        })

    # MRR estimé (12 derniers mois) : clients mensuels créés avant la fin du mois
    # + clients séance × séances réalisées ce mois-là
    mrr_par_mois = []
    clients_mensuels = list(Client.objects.filter(
        coach=user, mode_facturation='mensuel', tarif__isnull=False,
    ).values('id', 'tarif', 'created_at', 'statut'))
    clients_seance = list(Client.objects.filter(
        coach=user, mode_facturation='seance', tarif__isnull=False,
    ).values('id', 'tarif'))
    for i in range(11, -1, -1):
        m_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end   = (m_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        # Récurrent : clients existant avant la fin du mois et non-inactifs
        recurrent = sum(
            float(c['tarif']) for c in clients_mensuels
            if c['created_at'] < m_end and c['statut'] != 'inactif'
        )
        # Variable séance : count des séances réalisées ce mois × tarif
        variable = 0.0
        for c in clients_seance:
            nb = Seance.objects.filter(
                client_id=c['id'], statut='realisee',
                date_heure__gte=m_start, date_heure__lt=m_end,
            ).count()
            variable += float(c['tarif']) * nb
        mrr_par_mois.append({
            'mois': m_start.strftime('%b %y'),
            'recurrent': round(recurrent, 2),
            'seance': round(variable, 2),
            'total': round(recurrent + variable, 2),
        })

    # Revenus mensuels (6 derniers mois)
    revenus_par_mois = []
    for i in range(5, -1, -1):
        m_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end   = (m_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        total   = Facture.objects.filter(
            coach=user, date_emission__gte=m_start, date_emission__lt=m_end,
            statut__in=['payee', 'envoyee'],
        ).aggregate(t=Sum('montant_ttc'))['t'] or 0
        revenus_par_mois.append({
            'mois': m_start.strftime('%b'),
            'revenus': float(total),
        })

    # Séances réalisées (8 dernières semaines)
    seances_par_semaine = []
    for i in range(7, -1, -1):
        w_start = (now - timedelta(weeks=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        w_start -= timedelta(days=w_start.weekday())
        w_end   = w_start + timedelta(days=7)
        done    = Seance.objects.filter(coach=user, date_heure__gte=w_start, date_heure__lt=w_end, statut='realisee').count()
        planned = Seance.objects.filter(coach=user, date_heure__gte=w_start, date_heure__lt=w_end).count()
        seances_par_semaine.append({
            'semaine': f"S{w_start.strftime('%V')}",
            'realisees': done,
            'planifiees': planned,
        })

    # Répartition clients par statut
    from django.db.models import Count
    repartition = list(Client.objects.filter(coach=user).values('statut').annotate(n=Count('id')))

    # Heatmap d'activité (90 derniers jours) : 7 jours × 4 créneaux horaires
    # Slots : 0=matin (5-12h), 1=midi (12-14h), 2=après-midi (14-18h), 3=soir (18-24h)
    heatmap_start = now - timedelta(days=90)
    heatmap = [[0]*4 for _ in range(7)]
    seances_recentes = Seance.objects.filter(
        coach=user, date_heure__gte=heatmap_start,
    ).values_list('date_heure', flat=True)
    for dt in seances_recentes:
        local_dt = timezone.localtime(dt)
        day = local_dt.weekday()  # 0 = lundi
        h = local_dt.hour
        if   h < 12: slot = 0
        elif h < 14: slot = 1
        elif h < 18: slot = 2
        else:        slot = 3
        heatmap[day][slot] += 1

    return Response({
        'clients_actifs': clients_actifs,
        'seances_semaine': seances_semaine,
        'seances_restantes': seances_restantes,
        'revenus_mois': float(revenus_mois),
        'mrr_recurrent': float(mrr_recurrent),
        'mrr_seance_estime': round(mrr_seance_estime, 2),
        'mrr_total': round(mrr_total, 2),
        'taux_completion': taux,
        'alertes_non_lues': alertes_non_lues,
        'messages_non_lus': messages_non_lus,
        'prochaines_seances': SeanceListSerializer(prochaines, many=True).data,
        'clients_avancement': ClientListSerializer(clients_avancement, many=True).data,
        'clients_par_mois': clients_par_mois,
        'mrr_par_mois': mrr_par_mois,
        'revenus_par_mois': revenus_par_mois,
        'seances_par_semaine': seances_par_semaine,
        'repartition_clients': repartition,
        'heatmap_activite': heatmap,
    })


# ─── CLIENTS ──────────────────────────────────────────────────────────────────

class ClientViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Client.objects.filter(coach=self.request.user)
        statut = self.request.query_params.get('statut')
        search = self.request.query_params.get('search')
        if statut:
            qs = qs.filter(statut=statut)
        if search:
            qs = qs.filter(Q(prenom__icontains=search) | Q(nom__icontains=search) | Q(email__icontains=search))
        return qs.prefetch_related('assignations__programme', 'mesures', 'objectifs_list')

    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return ClientDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ClientCreateSerializer
        return ClientListSerializer

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        profile, _ = CoachProfile.objects.get_or_create(user=self.request.user)
        if not profile.can_add_client:
            raise PermissionDenied("Limite de 5 clients atteinte. Passez au plan Pro.")
        serializer.save(coach=self.request.user)

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request, pk=None):
        client = self.get_object()
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Aucune image fournie.'}, status=400)
        ok, err = _validate_image(image)
        if not ok:
            return Response({'error': err}, status=400)
        photo = PhotoProgression.objects.create(
            client=client,
            image=image,
            date=request.data.get('date', date.today()),
            angle=request.data.get('angle', 'face'),
            semaine_programme=request.data.get('semaine_programme'),
            legende=request.data.get('legende', ''),
        )
        return Response(PhotoSerializer(photo).data, status=201)

    @action(detail=True, methods=['post'], url_path='upload-avatar')
    def upload_avatar(self, request, pk=None):
        client = self.get_object()
        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'Aucune image fournie.'}, status=400)
        ok, err = _validate_image(image)
        if not ok:
            return Response({'error': err}, status=400)
        client.photo = image
        client.save()
        return Response(ClientListSerializer(client).data)

    @action(detail=True, methods=['get', 'post'], url_path='notes')
    def notes(self, request, pk=None):
        client = self.get_object()
        if request.method == 'GET':
            notes = client.notes.all()
            return Response(NoteSuiviSerializer(notes, many=True).data)
        serializer = NoteSuiviSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(client=client, coach=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['get', 'post'], url_path='mesures')
    def mesures(self, request, pk=None):
        client = self.get_object()
        if request.method == 'GET':
            return Response(MesureSerializer(client.mesures.all(), many=True).data)
        serializer = MesureSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(client=client)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['get'], url_path='historique-seances')
    def historique_seances(self, request, pk=None):
        client = self.get_object()
        seances = client.seances.all()
        return Response(SeanceListSerializer(seances, many=True).data)

    @action(detail=True, methods=['get'], url_path='facturation-prefill')
    def facturation_prefill(self, request, pk=None):
        from datetime import date
        client = self.get_object()
        periode = request.query_params.get('periode', 'mois_courant')

        today = date.today()
        if periode == 'mois_precedent':
            mois_fin = today.replace(day=1)
            mois_debut = (mois_fin - timedelta(days=1)).replace(day=1)
        else:
            periode = 'mois_courant'
            mois_debut = today.replace(day=1)
            mois_fin = (mois_debut.replace(day=28) + timedelta(days=4)).replace(day=1)

        mois_label = mois_debut.strftime('%B %Y').capitalize()
        tarif = float(client.tarif) if client.tarif else 0.0

        if client.mode_facturation == 'seance':
            nb = client.seances.filter(
                statut='realisee',
                date_heure__date__gte=mois_debut,
                date_heure__date__lt=mois_fin,
            ).count()
            montant = round(tarif * nb, 2)
            description = f'Coaching — {nb} séance{"s" if nb != 1 else ""} en {mois_label}'
            lignes = [{'description': description, 'quantite': nb, 'prix_unitaire': tarif}]
        else:
            nb = 1
            montant = tarif
            description = f'Forfait coaching mensuel — {mois_label}'
            lignes = [{'description': description, 'quantite': 1, 'prix_unitaire': tarif}]

        return Response({
            'mode_facturation': client.mode_facturation,
            'tarif': tarif,
            'nb_seances': nb,
            'montant_ht': montant,
            'montant_ttc': montant,
            'description': description,
            'lignes': lignes,
            'periode': periode,
            'periode_label': mois_label,
            'periode_debut': mois_debut.isoformat(),
            'periode_fin': (mois_fin - timedelta(days=1)).isoformat(),
        })

    @action(detail=True, methods=['get'], url_path='performances')
    def performances(self, request, pk=None):
        from collections import defaultdict
        client = self.get_object()
        logs = (SerieLog.objects
                .filter(seance__client=client, poids_kg__isnull=False, repetitions__isnull=False)
                .select_related('seance')
                .order_by('seance__date_heure'))

        by_exercice = defaultdict(list)
        for log in logs:
            by_exercice[log.exercice_nom].append({
                'date': log.seance.date_heure.date().isoformat(),
                'poids_kg': float(log.poids_kg),
                'reps': log.repetitions,
            })

        result = []
        for nom, entries in by_exercice.items():
            by_date = defaultdict(list)
            for e in entries:
                by_date[e['date']].append(e)
            data = []
            for date_str, day in sorted(by_date.items()):
                max_kg = max(e['poids_kg'] for e in day)
                volume = sum(e['poids_kg'] * e['reps'] for e in day)
                data.append({'date': date_str, 'max_kg': round(max_kg, 1), 'volume': round(volume)})
            if data:
                result.append({'nom': nom, 'nb_sessions': len(data), 'data': data})

        result.sort(key=lambda x: x['nb_sessions'], reverse=True)
        return Response(result[:15])

    @action(detail=True, methods=['get', 'post'], url_path='objectifs')
    def objectifs(self, request, pk=None):
        client = self.get_object()
        if request.method == 'GET':
            return Response(ObjectifSerializer(client.objectifs_list.all(), many=True).data)
        serializer = ObjectifSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(client=client)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['patch'], url_path='objectifs/(?P<objectif_id>[^/.]+)')
    def update_objectif(self, request, pk=None, objectif_id=None):
        client = self.get_object()
        try:
            obj = client.objectifs_list.get(id=objectif_id)
        except Objectif.DoesNotExist:
            return Response({'error': 'Objectif introuvable.'}, status=404)
        serializer = ObjectifSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'], url_path='creer-compte')
    def creer_compte(self, request, pk=None):
        client = self.get_object()
        if client.user_account:
            return Response({
                'error': 'Ce client a déjà un compte.',
                'username': client.user_account.username,
            }, status=400)
        import secrets, string
        base = request.data.get('username') or client.email.split('@')[0]
        password = request.data.get('password') or ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
        username = base
        n = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{n}"
            n += 1
        user = User.objects.create_user(
            username=username, email=client.email, password=password,
            first_name=client.prenom, last_name=client.nom, role='client',
        )
        client.user_account = user
        client.save(update_fields=['user_account'])
        Conversation.objects.get_or_create(coach=self.request.user, client=client)

        from .email_service import envoyer_bienvenue_client
        envoyer_bienvenue_client(client, username, password, self.request.user)

        return Response({'username': username, 'password': password}, status=201)


# ─── PROGRAMMES ───────────────────────────────────────────────────────────────

class ProgrammeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProgrammeSerializer

    def get_queryset(self):
        qs = Programme.objects.filter(coach=self.request.user)
        if self.request.query_params.get('templates') == '1':
            qs = qs.filter(est_template=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    @action(detail=True, methods=['post'], url_path='assigner')
    def assigner(self, request, pk=None):
        programme = self.get_object()
        client_id = request.data.get('client_id')
        date_debut = request.data.get('date_debut', date.today())
        try:
            client = Client.objects.get(id=client_id, coach=request.user)
        except Client.DoesNotExist:
            return Response({'error': 'Client introuvable.'}, status=404)
        from datetime import timedelta
        date_fin = date.fromisoformat(str(date_debut)) + timedelta(weeks=programme.duree_semaines)
        assignation = AssignationProgramme.objects.create(
            client=client, programme=programme,
            date_debut=date_debut, date_fin_prevue=date_fin,
        )
        if client.statut in ['nouveau', 'inactif']:
            client.statut = 'actif'
            client.save(update_fields=['statut'])
        return Response(AssignationSerializer(assignation).data, status=201)

    @action(detail=True, methods=['get'], url_path='plan')
    def plan(self, request, pk=None):
        prog = self.get_object()
        jours = prog.jours.prefetch_related('exercices__exercice')
        return Response(ProgrammeJourSerializer(jours, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='jours')
    def add_jour(self, request, pk=None):
        prog = self.get_object()
        s = ProgrammeJourSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        jour = s.save(programme=prog)
        return Response(ProgrammeJourSerializer(jour, context={'request': request}).data, status=201)

    @action(detail=True, methods=['delete'], url_path='jours/(?P<jour_id>[^/.]+)')
    def delete_jour(self, request, pk=None, jour_id=None):
        try:
            ProgrammeJour.objects.get(id=jour_id, programme=self.get_object()).delete()
        except ProgrammeJour.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(status=204)

    @action(detail=True, methods=['post'], url_path='jours/(?P<jour_id>[^/.]+)/exercices')
    def add_exercice(self, request, pk=None, jour_id=None):
        try:
            jour = ProgrammeJour.objects.get(id=jour_id, programme=self.get_object())
        except ProgrammeJour.DoesNotExist:
            return Response({'error': 'Jour introuvable.'}, status=404)
        s = ProgrammeJourExerciceSerializer(data=request.data, context={'request': request})
        s.is_valid(raise_exception=True)
        ex = s.save(jour=jour)
        return Response(ProgrammeJourExerciceSerializer(ex, context={'request': request}).data, status=201)

    @action(detail=True, methods=['delete'], url_path='jours/(?P<jour_id>[^/.]+)/exercices/(?P<ex_id>[^/.]+)')
    def delete_exercice(self, request, pk=None, jour_id=None, ex_id=None):
        try:
            ProgrammeJourExercice.objects.get(id=ex_id, jour__programme=self.get_object()).delete()
        except ProgrammeJourExercice.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(status=204)

    @action(detail=True, methods=['patch'], url_path='jours/(?P<jour_id>[^/.]+)/exercices/(?P<ex_id>[^/.]+)')
    def update_exercice(self, request, pk=None, jour_id=None, ex_id=None):
        try:
            ex = ProgrammeJourExercice.objects.get(id=ex_id, jour__programme=self.get_object())
        except ProgrammeJourExercice.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        s = ProgrammeJourExerciceSerializer(ex, data=request.data, partial=True, context={'request': request})
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


# ─── SÉANCES ──────────────────────────────────────────────────────────────────

class SeanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Seance.objects.filter(coach=self.request.user)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        client_id = self.request.query_params.get('client')
        statut = self.request.query_params.get('statut')
        if date_from:
            qs = qs.filter(date_heure__gte=date_from)
        if date_to:
            qs = qs.filter(date_heure__lte=date_to)
        if client_id:
            qs = qs.filter(client_id=client_id)
        if statut:
            qs = qs.filter(statut=statut)
        return qs.select_related('client')

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return SeanceDetailSerializer
        return SeanceListSerializer

    def perform_create(self, serializer):
        seance = serializer.save(coach=self.request.user)
        client = seance.client
        if client and client.statut in ['nouveau', 'inactif']:
            client.statut = 'actif'
            client.save(update_fields=['statut'])

    @action(detail=True, methods=['post'], url_path='marquer-realisee')
    def marquer_realisee(self, request, pk=None):
        seance = self.get_object()
        seance.statut = 'realisee'
        seance.notes_apres = request.data.get('notes_apres', seance.notes_apres)
        seance.exercices = request.data.get('exercices', seance.exercices)
        seance.save()
        return Response(SeanceDetailSerializer(seance).data)

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        seance = self.get_object()
        seance.statut = request.data.get('statut', 'annulee')
        seance.save()
        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'], url_path='planning-semaine')
    def planning_semaine(self, request):
        now = timezone.now()
        week_start = now - timedelta(days=now.weekday())
        week_end = week_start + timedelta(days=7)
        seances = self.get_queryset().filter(
            date_heure__gte=week_start,
            date_heure__lt=week_end,
        ).order_by('date_heure')
        return Response(SeanceListSerializer(seances, many=True).data)


# ─── MESSAGERIE ───────────────────────────────────────────────────────────────

class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(coach=self.request.user).order_by('-updated_at')

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        conv = self.get_object()
        if request.method == 'GET':
            conv.messages.filter(lu=False, expediteur_role='client').update(lu=True)
            qs = conv.messages.all()
            after = request.query_params.get('after')  # UUID du dernier message connu
            if after:
                qs = qs.filter(created_at__gt=Message.objects.filter(id=after).values('created_at').first().get('created_at', timezone.now()))
            return Response(MessageSerializer(qs, many=True).data)
        contenu = request.data.get('contenu', '')
        image = request.FILES.get('image')
        if not contenu and not image:
            return Response({'error': 'Message vide.'}, status=400)
        if image:
            ok, err = _validate_image(image)
            if not ok:
                return Response({'error': err}, status=400)
        msg = Message.objects.create(
            conversation=conv,
            contenu=contenu,
            image=image,
            expediteur_role='coach',
        )
        conv.updated_at = timezone.now()
        conv.save()
        return Response(MessageSerializer(msg, context={'request': request}).data, status=201)

    @action(detail=False, methods=['post'], url_path='demarrer')
    def demarrer(self, request):
        client_id = request.data.get('client_id')
        try:
            client = Client.objects.get(id=client_id, coach=request.user)
        except Client.DoesNotExist:
            return Response({'error': 'Client introuvable.'}, status=404)
        conv, _ = Conversation.objects.get_or_create(coach=request.user, client=client)
        return Response(ConversationSerializer(conv).data)


# ─── REVENUS ──────────────────────────────────────────────────────────────────

class FactureViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FactureSerializer

    def get_queryset(self):
        qs = Facture.objects.filter(coach=self.request.user)
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs.select_related('client')

    def perform_create(self, serializer):
        year = date.today().year
        prefix = f'FAC-{year}-'
        n = Facture.objects.filter(coach=self.request.user, numero__startswith=prefix).count() + 1
        while Facture.objects.filter(numero=f"{prefix}{str(n).zfill(3)}").exists():
            n += 1
        numero = f"{prefix}{str(n).zfill(3)}"
        serializer.save(coach=self.request.user, numero=numero)

    @action(detail=True, methods=['post'], url_path='marquer-payee')
    def marquer_payee(self, request, pk=None):
        facture = self.get_object()
        facture.statut = 'payee'
        facture.date_paiement = date.today()
        facture.save()
        return Response(FactureSerializer(facture).data)

    @action(detail=True, methods=['post'], url_path='envoyer')
    def envoyer(self, request, pk=None):
        facture = self.get_object()
        if facture.statut == 'brouillon':
            facture.statut = 'envoyee'
            facture.save()
        return Response(FactureSerializer(facture).data)

    @action(detail=True, methods=['post'], url_path='envoyer-email')
    def envoyer_email(self, request, pk=None):
        facture = self.get_object()
        if not facture.client.email:
            return Response({'error': 'Ce client n\'a pas d\'adresse email.'}, status=400)
        pdf_bytes = self._generer_pdf_bytes(facture)
        from .email_service import envoyer_facture_email
        envoyer_facture_email(facture, pdf_bytes)
        return Response({'status': 'ok', 'email': facture.client.email})

    def _generer_pdf_bytes(self, facture):
        """Génère le PDF d'une facture et retourne les bytes."""
        import io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_RIGHT
        coach = facture.coach
        client = facture.client
        profile = getattr(coach, 'coach_profile', None)
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
        styles = getSampleStyleSheet()
        acc = colors.HexColor('#6366F1')
        gris = colors.HexColor('#6B7280')
        noir = colors.HexColor('#111827')
        s_titre = ParagraphStyle('titre', fontSize=22, textColor=acc, fontName='Helvetica-Bold')
        s_h2    = ParagraphStyle('h2', fontSize=11, textColor=noir, fontName='Helvetica-Bold', spaceAfter=2)
        s_body  = ParagraphStyle('body', fontSize=9, textColor=noir, leading=14)
        s_small = ParagraphStyle('small', fontSize=8, textColor=gris, leading=12)
        s_right = ParagraphStyle('right', fontSize=9, textColor=noir, alignment=TA_RIGHT)
        s_total = ParagraphStyle('total', fontSize=11, textColor=acc, fontName='Helvetica-Bold', alignment=TA_RIGHT)
        statut_labels = {'brouillon':'BROUILLON','envoyee':'ENVOYÉE','payee':'PAYÉE','retard':'EN RETARD','annulee':'ANNULÉE'}
        elements = []
        header = Table([[
            Paragraph('TrainFlow', s_titre),
            Paragraph(f'FACTURE<br/><font size="14">{facture.numero}</font>',
                      ParagraphStyle('fnum', fontSize=9, textColor=gris, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
        ]], colWidths=[90*mm, 80*mm])
        header.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        elements += [header, Spacer(1, 4*mm), HRFlowable(width='100%', thickness=1, color=acc), Spacer(1, 6*mm)]
        coach_name = f"{coach.first_name} {coach.last_name}".strip() or coach.username
        coach_lines = [coach_name]
        if coach.email: coach_lines.append(coach.email)
        if coach.phone: coach_lines.append(coach.phone)
        if profile and profile.ville: coach_lines.append(profile.ville)
        if profile and profile.siret: coach_lines.append(f'SIRET : {profile.siret}')
        client_lines = [client.nom_complet]
        if client.email: client_lines.append(client.email)
        if client.phone: client_lines.append(client.phone)
        facture_lines = [
            f"<b>Date d'émission :</b> {facture.date_emission.strftime('%d/%m/%Y')}",
            f"<b>Date d'échéance :</b> {facture.date_echeance.strftime('%d/%m/%Y')}",
            f"<b>Statut :</b> {statut_labels.get(facture.statut, facture.statut)}",
        ]
        info = Table([[
            Paragraph('<b>DE</b><br/>' + '<br/>'.join(coach_lines), s_body),
            Paragraph('<b>POUR</b><br/>' + '<br/>'.join(client_lines), s_body),
            Paragraph('<br/>'.join(facture_lines), s_body),
        ]], colWidths=[57*mm, 57*mm, 56*mm])
        info.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0)]))
        elements += [info, Spacer(1, 8*mm)]
        lignes = facture.lignes or [{'description': 'Coaching', 'quantite': 1, 'prix_unitaire': float(facture.montant_ht)}]
        thead = [Paragraph(t, ParagraphStyle('th', fontSize=9, textColor=colors.white, fontName='Helvetica-Bold'))
                 for t in ['Description', 'Qté', 'Prix unitaire', 'Total']]
        rows = [thead]
        for l in lignes:
            qte = l.get('quantite', 1); pu = float(l.get('prix_unitaire', 0))
            rows.append([Paragraph(str(l.get('description', '')), s_body), Paragraph(str(qte), s_body),
                         Paragraph(f"{pu:,.2f} €".replace(',', ' '), s_body),
                         Paragraph(f"{qte*pu:,.2f} €".replace(',', ' '), s_right)])
        tbl = Table(rows, colWidths=[90*mm, 20*mm, 35*mm, 25*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), acc),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        elements += [tbl, Spacer(1, 6*mm)]
        tva = float(facture.taux_tva); ht = float(facture.montant_ht); ttc = float(facture.montant_ttc)
        totaux_data = [[Paragraph('Montant HT', s_right), Paragraph(f"{ht:,.2f} €".replace(',', ' '), s_right)]]
        if tva > 0:
            totaux_data.append([Paragraph(f'TVA ({tva}%)', s_right), Paragraph(f"{ttc-ht:,.2f} €".replace(',', ' '), s_right)])
        totaux_data.append([Paragraph('<b>TOTAL TTC</b>', s_total), Paragraph(f"<b>{ttc:,.2f} €</b>".replace(',', ' '), s_total)])
        totaux = Table(totaux_data, colWidths=[130*mm, 40*mm])
        totaux.setStyle(TableStyle([('LINEABOVE', (0,-1), (-1,-1), 1, acc), ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4)]))
        elements.append(totaux)
        if facture.notes:
            elements += [Spacer(1, 8*mm), HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#E5E7EB')),
                         Spacer(1, 4*mm), Paragraph('<b>Notes</b>', s_h2), Paragraph(facture.notes, s_small)]
        elements += [Spacer(1, 12*mm), HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#E5E7EB')),
                     Spacer(1, 3*mm), Paragraph('Généré par TrainFlow', s_small)]
        doc.build(elements)
        return buf.getvalue()

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        facture = self.get_object()
        pdf_bytes = self._generer_pdf_bytes(facture)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{facture.numero}.pdf"'
        return response

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        user = request.user
        now = date.today()
        month_start = now.replace(day=1)
        year_start = now.replace(month=1, day=1)

        mois = Facture.objects.filter(
            coach=user, date_emission__gte=month_start, statut__in=['payee','envoyee']
        ).aggregate(t=Sum('montant_ttc'))['t'] or 0

        annee = Facture.objects.filter(
            coach=user, date_emission__gte=year_start, statut__in=['payee','envoyee']
        ).aggregate(t=Sum('montant_ttc'))['t'] or 0

        en_attente = Facture.objects.filter(
            coach=user, statut__in=['envoyee','retard']
        ).aggregate(t=Sum('montant_ttc'))['t'] or 0

        # Par mois pour le graphique
        from django.db.models.functions import TruncMonth
        par_mois = (
            Facture.objects.filter(coach=user, date_emission__gte=year_start, statut__in=['payee','envoyee'])
            .annotate(mois=TruncMonth('date_emission'))
            .values('mois')
            .annotate(total=Sum('montant_ttc'))
            .order_by('mois')
        )

        return Response({
            'revenus_mois': float(mois),
            'revenus_annee': float(annee),
            'en_attente': float(en_attente),
            'par_mois': [{'mois': p['mois'].strftime('%b'), 'total': float(p['total'])} for p in par_mois],
        })


# ─── ALERTES ──────────────────────────────────────────────────────────────────

class AlerteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AlerteSerializer

    def get_queryset(self):
        if self.action == 'list':
            generer_alertes(self.request.user)
        return Alerte.objects.filter(coach=self.request.user)

    @action(detail=True, methods=['post'], url_path='marquer-lue')
    def marquer_lue(self, request, pk=None):
        alerte = self.get_object()
        alerte.lue = True
        alerte.save()
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'], url_path='traiter')
    def traiter(self, request, pk=None):
        alerte = self.get_object()
        alerte.lue = True
        alerte.traitee = True
        alerte.save()
        return Response({'status': 'ok'})


# ─── CONTRATS ─────────────────────────────────────────────────────────────────

class ContratViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratSerializer

    def get_queryset(self):
        return Contrat.objects.filter(client__coach=self.request.user)

    @action(detail=True, methods=['post'], url_path='envoyer')
    def envoyer(self, request, pk=None):
        contrat = self.get_object()
        contrat.statut = 'envoye'
        contrat.save()
        # TODO: envoyer email avec lien token_signature
        return Response({'status': 'ok', 'token': str(contrat.token_signature)})


_CONTRAT_EXPIRY_DAYS = 30

@api_view(['POST'])
@permission_classes([AllowAny])
def signer_contrat(request, token):
    """Endpoint public pour signature client."""
    try:
        contrat = Contrat.objects.get(token_signature=token, statut='envoye')
    except Contrat.DoesNotExist:
        return Response({'error': 'Contrat introuvable ou déjà signé.'}, status=404)

    if timezone.now() > contrat.created_at + timedelta(days=_CONTRAT_EXPIRY_DAYS):
        contrat.statut = 'expire'
        contrat.save(update_fields=['statut'])
        return Response({'error': 'Ce lien de signature a expiré (valable 30 jours).'}, status=410)

    contrat.statut = 'signe'
    contrat.date_signature = timezone.now()
    contrat.signature_ip = request.META.get('REMOTE_ADDR')
    contrat.save()
    return Response({'status': 'signe', 'date': contrat.date_signature})


# ─── TEMPLATES MESSAGES ───────────────────────────────────────────────────────

class TemplateMessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TemplateMessageSerializer

    def get_queryset(self):
        return TemplateMessage.objects.filter(coach=self.request.user)

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    @action(detail=True, methods=['post'], url_path='appliquer')
    def appliquer(self, request, pk=None):
        template = self.get_object()
        client_id = request.data.get('client_id')
        try:
            client = Client.objects.get(id=client_id, coach=request.user)
        except Client.DoesNotExist:
            return Response({'error': 'Client introuvable.'}, status=404)
        assignation = client.assignations.filter(statut='en_cours').first()
        seance = client.seances.filter(statut='planifiee').order_by('date_heure').first()
        facture = client.factures.filter(statut__in=['envoyee','retard']).order_by('-date_emission').first()
        variables = {
            'prenom': client.prenom,
            'nom_complet': client.nom_complet,
            'programme': assignation.programme.nom if assignation else '',
            'date_seance': seance.date_heure.strftime('%d/%m/%Y %H:%M') if seance else '',
            'montant': str(facture.montant_ttc) + ' €' if facture else '',
        }
        try:
            contenu = template.contenu.format_map(variables)
        except (KeyError, ValueError) as e:
            return Response({'error': f'Placeholder inconnu dans le template : {e}'}, status=400)
        return Response({'contenu': contenu, 'sujet': template.sujet})


# ─── PORTAIL CLIENT ───────────────────────────────────────────────────────────

def _get_client_profile(request):
    if getattr(request.user, 'role', None) != 'client':
        return None
    try:
        return request.user.client_profile
    except Exception:
        return None


@api_view(['GET'])
def portal_dashboard(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    now = timezone.now()
    prochaines = client.seances.filter(date_heure__gte=now, statut='planifiee').order_by('date_heure')[:5]
    assignations = client.assignations.filter(statut='en_cours').select_related('programme').order_by('date_debut')
    objectifs = client.objectifs_list.all()
    return Response({
        'client': ClientListSerializer(client).data,
        'prochaines_seances': SeanceListSerializer(prochaines, many=True).data,
        'programmes_actifs': AssignationSerializer(assignations, many=True).data,
        'objectifs': ObjectifSerializer(objectifs, many=True).data,
    })


@api_view(['GET'])
def portal_seances(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    seances = client.seances.all().order_by('-date_heure')[:50]
    return Response(SeanceListSerializer(seances, many=True).data)


@api_view(['GET', 'POST'])
def portal_mesures(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)

    if request.method == 'GET':
        return Response(MesureSerializer(client.mesures.order_by('-date')[:100], many=True).data)

    # Validation plages réalistes
    def _invalid_range(val, lo, hi):
        try:
            return val is not None and not (lo <= float(val) <= hi)
        except (TypeError, ValueError):
            return True

    data = request.data
    if _invalid_range(data.get('poids_kg'), 20, 500):
        return Response({'error': 'Poids invalide (20–500 kg).'}, status=400)
    if _invalid_range(data.get('tour_taille_cm'), 30, 250):
        return Response({'error': 'Tour de taille invalide (30–250 cm).'}, status=400)
    if _invalid_range(data.get('tour_hanches_cm'), 30, 250):
        return Response({'error': 'Tour de hanches invalide (30–250 cm).'}, status=400)
    if _invalid_range(data.get('taux_graisse'), 1, 70):
        return Response({'error': 'Taux de graisse invalide (1–70 %).'}, status=400)

    serializer = MesureSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    mesure = serializer.save(client=client)

    Alerte.objects.create(
        coach=client.coach,
        client=client,
        type_alerte='nouvelle_mesure',
        titre=f'Nouvelle mesure : {client.prenom} {client.nom}',
        description=(
            f'{client.prenom} a enregistré ses mesures du {mesure.date}.'
            + (f' Poids : {mesure.poids_kg} kg.' if mesure.poids_kg else '')
            + (f' Tour de taille : {mesure.tour_taille_cm} cm.' if mesure.tour_taille_cm else '')
        ),
        priorite='basse',
    )

    return Response(MesureSerializer(mesure).data, status=201)


@api_view(['POST'])
def portal_demander_annulation(request, seance_id):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    try:
        seance = client.seances.get(id=seance_id, statut='planifiee')
    except Seance.DoesNotExist:
        return Response({'error': 'Séance introuvable ou déjà annulée.'}, status=404)

    date_str = seance.date_heure.strftime('%d/%m/%Y à %H:%M')
    titre_seance = seance.titre or 'Séance'

    Alerte.objects.get_or_create(
        coach=client.coach,
        client=client,
        type_alerte='absences',
        traitee=False,
        titre=f'Demande d\'annulation : {titre_seance} du {date_str}',
        defaults={
            'description': f'{client.prenom} demande l\'annulation de la séance "{titre_seance}" prévue le {date_str}.',
            'priorite': 'haute',
        },
    )

    conv, _ = Conversation.objects.get_or_create(coach=client.coach, client=client)
    Message.objects.create(
        conversation=conv,
        contenu=f'Bonjour, je souhaite annuler la séance "{titre_seance}" prévue le {date_str}. Merci de confirmer.',
        expediteur_role='client',
    )
    conv.updated_at = timezone.now()
    conv.save()

    return Response({'status': 'demande envoyée'})


@api_view(['GET'])
def portal_seance_detail(request, seance_id):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    try:
        seance = client.seances.get(id=seance_id)
    except Seance.DoesNotExist:
        return Response({'error': 'Séance introuvable.'}, status=404)
    from .serializers import SerieLogSerializer
    planifies = seance.exercices_planifies.select_related('exercice').all()
    return Response({
        'id': str(seance.id),
        'titre': seance.titre,
        'date_heure': seance.date_heure,
        'duree_minutes': seance.duree_minutes,
        'statut': seance.statut,
        'exercices': seance.exercices,
        'exercices_planifies': ExerciceSeanceSerializer(planifies, many=True).data,
        'series_log': SerieLogSerializer(seance.series_log.all(), many=True).data,
    })


@api_view(['POST'])
def portal_log_serie(request, seance_id):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    try:
        seance = client.seances.get(id=seance_id)
    except Seance.DoesNotExist:
        return Response({'error': 'Séance introuvable.'}, status=404)
    from .serializers import SerieLogSerializer
    serializer = SerieLogSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    serie = serializer.save(seance=seance)
    return Response(SerieLogSerializer(serie).data, status=201)


@api_view(['DELETE'])
def portal_delete_serie(request, seance_id, log_id):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    try:
        seance = client.seances.get(id=seance_id)
        serie = seance.series_log.get(id=log_id)
    except (Seance.DoesNotExist, Exception):
        return Response({'error': 'Introuvable.'}, status=404)
    serie.delete()
    return Response(status=204)


@api_view(['GET', 'POST'])
def portal_conversation(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    conv = Conversation.objects.filter(client=client).first()
    if not conv:
        return Response({'error': 'Aucune conversation trouvée.'}, status=404)
    if request.method == 'GET':
        conv.messages.filter(lu=False, expediteur_role='coach').update(lu=True)
        qs = conv.messages.order_by('created_at')
        after = request.query_params.get('after')
        if after:
            qs = qs.filter(created_at__gt=Message.objects.filter(id=after).values('created_at').first().get('created_at', timezone.now()))
        else:
            qs = qs.order_by('-created_at')[:100]
            qs = sorted(qs, key=lambda m: m.created_at)
        return Response(MessageSerializer(list(qs), many=True).data)
    contenu = request.data.get('contenu', '').strip()
    image = request.FILES.get('image')
    if not contenu and not image:
        return Response({'error': 'Message vide.'}, status=400)
    if image:
        ok, err = _validate_image(image)
        if not ok:
            return Response({'error': err}, status=400)
    msg = Message.objects.create(conversation=conv, contenu=contenu, image=image, expediteur_role='client')
    conv.updated_at = timezone.now()
    conv.save()
    return Response(MessageSerializer(msg, context={'request': request}).data, status=201)


@api_view(['PATCH'])
def portal_objectif_update(request, objectif_id):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    try:
        obj = client.objectifs_list.get(id=objectif_id)
    except Objectif.DoesNotExist:
        return Response({'error': 'Objectif introuvable.'}, status=404)
    serializer = ObjectifSerializer(obj, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'POST'])
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portal_exercices(request):
    q = request.query_params.get('q', '').strip()
    qs = Exercice.objects.filter(est_personnalise=False)
    if q:
        qs = qs.filter(nom__icontains=q)
    qs = qs.order_by('groupe_musculaire', 'nom')[:50]
    return Response([{
        'id': str(e.id), 'nom': e.nom,
        'groupe': e.groupe_musculaire, 'categorie': e.categorie,
    } for e in qs])


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def portal_photos(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)

    if request.method == 'GET':
        photos = client.photos.order_by('-created_at')[:50]
        return Response(PhotoSerializer(photos, many=True, context={'request': request}).data)

    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'Aucune image fournie.'}, status=400)
    ok, err = _validate_image(image)
    if not ok:
        return Response({'error': err}, status=400)
    photo = PhotoProgression.objects.create(
        client=client,
        image=image,
        date=request.data.get('date', date.today()),
        angle=request.data.get('angle', 'face'),
        legende=request.data.get('legende', ''),
    )
    return Response(PhotoSerializer(photo, context={'request': request}).data, status=201)


@api_view(['DELETE'])
def portal_photo_delete(request, photo_id):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    try:
        photo = client.photos.get(id=photo_id)
    except PhotoProgression.DoesNotExist:
        return Response({'error': 'Photo introuvable.'}, status=404)
    if photo.image:
        photo.image.delete(save=False)
    photo.delete()
    return Response(status=204)


@api_view(['GET'])
def portal_messages_unread(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    conv = Conversation.objects.filter(client=client).first()
    count = conv.messages.filter(lu=False, expediteur_role='coach').count() if conv else 0
    return Response({'count': count})


# ══════════════════════════════════════════════════════════════
# NUTRITION
# ══════════════════════════════════════════════════════════════

class AlimentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlimentSerializer

    def get_queryset(self):
        qs = Aliment.objects.filter(Q(coach=None) | Q(coach=self.request.user))
        q = self.request.query_params.get('q', '')
        cat = self.request.query_params.get('cat', '')
        if q:
            qs = qs.filter(nom__icontains=q)
        if cat:
            qs = qs.filter(categorie=cat)
        return qs

    @action(detail=False, methods=['post'])
    def custom(self, request):
        s = AlimentSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        s.save(coach=request.user)
        return Response(s.data, status=201)

    @action(detail=False, methods=['get'], url_path='search-externe')
    def search_externe(self, request):
        """Recherche dans Open Food Facts. Renvoie une liste de candidats."""
        from core.openfoodfacts import search as off_search
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response({'results': []})
        return Response({'results': off_search(q, limit=8)})

    @action(detail=False, methods=['post'], url_path='import-externe')
    def import_externe(self, request):
        """Crée un Aliment dans la DB à partir d'un produit OFF déjà retourné par search-externe.

        Body attendu : {nom, categorie, calories_100g, proteines_100g, glucides_100g,
                        lipides_100g, fibres_100g, source_id}
        Si un aliment avec le même source_id existe déjà, le réutilise.
        """
        source_id = (request.data.get('source_id') or '').strip()
        if source_id:
            existing = Aliment.objects.filter(source='openfoodfacts', source_id=source_id).first()
            if existing:
                return Response(AlimentSerializer(existing).data, status=200)
        payload = {
            'nom': request.data.get('nom', '').strip()[:200],
            'categorie': request.data.get('categorie', 'autres'),
            'calories_100g':  request.data.get('calories_100g',  0),
            'proteines_100g': request.data.get('proteines_100g', 0),
            'glucides_100g':  request.data.get('glucides_100g',  0),
            'lipides_100g':   request.data.get('lipides_100g',   0),
            'fibres_100g':    request.data.get('fibres_100g',    0),
        }
        if not payload['nom']:
            return Response({'error': 'Nom requis.'}, status=400)
        s = AlimentSerializer(data=payload)
        if not s.is_valid():
            return Response(s.errors, status=400)
        aliment = s.save(coach=request.user, source='openfoodfacts', source_id=source_id)
        return Response(AlimentSerializer(aliment).data, status=201)


def _recette_queryset_for(user):
    """Recettes visibles pour un coach : toutes les globales + ses copies personnalisées."""
    return Recette.objects.filter(
        Q(coach__isnull=True) | Q(coach=user)
    ).prefetch_related('ingredients__aliment')


def _update_nom_personnalise(recette):
    """Recalcule le nom d'une copie avec le diff d'ingrédients vs l'original."""
    if not recette.original_id:
        return
    orig = {ing.aliment_id: ing.aliment.nom
            for ing in recette.original.ingredients.select_related('aliment').all()}
    curr = {ing.aliment_id: ing.aliment.nom
            for ing in recette.ingredients.select_related('aliment').all()}
    removed = [orig[aid] for aid in orig if aid not in curr]
    added   = [curr[aid] for aid in curr if aid not in orig]
    parts = []
    if removed:
        parts.append('sans ' + ', '.join(removed))
    if added:
        parts.append('+' + ', +'.join(added))
    base = recette.original.nom
    recette.nom = f'{base} ({", ".join(parts)})' if parts else base
    recette.save(update_fields=['nom'])


class RecetteViewSet(viewsets.ModelViewSet):
    serializer_class = RecetteSerializer
    pagination_class = RecettePagination

    def get_queryset(self):
        qs = _recette_queryset_for(self.request.user)
        # Filtre par tags : ?tags=vegan,sans_gluten (ET — la recette doit avoir tous les tags demandés)
        tags_param = self.request.query_params.get('tags', '').strip()
        if tags_param:
            wanted = [t.strip() for t in tags_param.split(',') if t.strip()]
            for tag in wanted:
                qs = qs.filter(tags__contains=[tag])
        # Recherche texte ?q=...
        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(nom__icontains=q)
        return qs

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    def destroy(self, request, *args, **kwargs):
        recette = self.get_object()
        if recette.coach is None:
            return Response({'error': 'Impossible de supprimer une recette de la bibliothèque.'}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def personnaliser(self, request, pk=None):
        """Crée une copie personnalisée d'une recette globale pour ce coach."""
        source = self.get_object()
        if source.coach is not None:
            return Response({'error': 'Seules les recettes de la bibliothèque peuvent être personnalisées.'}, status=400)
        if Recette.objects.filter(coach=request.user, original=source).exists():
            return Response({'error': 'Vous avez déjà personnalisé cette recette.'}, status=400)
        copie = Recette.objects.create(
            coach=request.user,
            original=source,
            nom=source.nom,
            description=source.description,
            instructions=source.instructions,
            portions=source.portions,
            image_url=source.image_url,
        )
        for ing in source.ingredients.select_related('aliment').all():
            IngredientRecette.objects.create(recette=copie, aliment=ing.aliment, quantite_g=ing.quantite_g)
        return Response(RecetteSerializer(copie, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request, pk=None):
        recette = self.get_object()
        if recette.coach is None:
            return Response({'error': 'Personnalisez d\'abord cette recette pour ajouter une photo.'}, status=403)
        photo = request.FILES.get('photo')
        if not photo:
            return Response({'error': 'Aucun fichier envoyé.'}, status=400)
        ok, err = _validate_image(photo)
        if not ok:
            return Response({'error': err}, status=400)
        recette.photo = photo
        recette.save(update_fields=['photo'])
        return Response(RecetteSerializer(recette, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def add_ingredient(self, request, pk=None):
        recette = self.get_object()
        if recette.coach is None:
            return Response({'error': 'Personnalisez d\'abord cette recette.'}, status=403)
        aliment_id = request.data.get('aliment')
        quantite_g = request.data.get('quantite_g')
        if not aliment_id or not quantite_g:
            return Response({'error': 'aliment et quantite_g requis.'}, status=400)
        ing = IngredientRecette.objects.create(recette=recette, aliment_id=aliment_id, quantite_g=quantite_g)
        _update_nom_personnalise(recette)
        return Response(IngredientRecetteSerializer(ing).data, status=201)

    @action(detail=True, methods=['delete'], url_path='ingredient/(?P<ing_id>[^/.]+)')
    def remove_ingredient(self, request, pk=None, ing_id=None):
        recette = self.get_object()
        if recette.coach is None:
            return Response({'error': 'Personnalisez d\'abord cette recette.'}, status=403)
        try:
            IngredientRecette.objects.get(id=ing_id, recette=recette).delete()
        except IngredientRecette.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        _update_nom_personnalise(recette)
        return Response(status=204)


class PlanAlimentaireViewSet(viewsets.ModelViewSet):
    serializer_class = PlanAlimentaireSerializer

    def get_queryset(self):
        return PlanAlimentaire.objects.filter(coach=self.request.user).prefetch_related(
            'repas__aliments__aliment',
            'repas__aliments__recette__ingredients__aliment',
            'assignations',
        )

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    # ── Gestion des repas ─────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='repas')
    def add_repas(self, request, pk=None):
        plan = self.get_object()
        type_repas = request.data.get('type_repas')
        if not type_repas:
            return Response({'error': 'type_repas requis.'}, status=400)
        ordre = plan.repas.count()
        repas = RepasTemplate.objects.create(plan=plan, type_repas=type_repas, ordre=ordre)
        return Response(RepasTemplateSerializer(repas).data, status=201)

    @action(detail=True, methods=['delete'], url_path='repas/(?P<repas_id>[^/.]+)')
    def remove_repas(self, request, pk=None, repas_id=None):
        try:
            RepasTemplate.objects.get(id=repas_id, plan=self.get_object()).delete()
        except RepasTemplate.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(status=204)

    # ── Gestion des aliments dans un repas ────────────────────
    @action(detail=True, methods=['post'], url_path='repas/(?P<repas_id>[^/.]+)/aliments')
    def add_aliment_repas(self, request, pk=None, repas_id=None):
        try:
            repas = RepasTemplate.objects.get(id=repas_id, plan=self.get_object())
        except RepasTemplate.DoesNotExist:
            return Response({'error': 'Repas introuvable.'}, status=404)
        aliment_id = request.data.get('aliment')
        recette_id = request.data.get('recette')
        quantite_g = request.data.get('quantite_g')
        if not quantite_g or (not aliment_id and not recette_id):
            return Response({'error': 'aliment (ou recette) et quantite_g requis.'}, status=400)
        ar = AlimentRepas.objects.create(
            repas=repas,
            aliment_id=aliment_id or None,
            recette_id=recette_id or None,
            quantite_g=quantite_g,
            notes=request.data.get('notes', ''),
        )
        return Response(AlimentRepasSerializer(ar).data, status=201)

    @action(detail=True, methods=['delete'],
            url_path='repas/(?P<repas_id>[^/.]+)/aliments/(?P<ar_id>[^/.]+)')
    def remove_aliment_repas(self, request, pk=None, repas_id=None, ar_id=None):
        try:
            repas = RepasTemplate.objects.get(id=repas_id, plan=self.get_object())
            AlimentRepas.objects.get(id=ar_id, repas=repas).delete()
        except (RepasTemplate.DoesNotExist, AlimentRepas.DoesNotExist):
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(status=204)

    # ── Assigner à un client ──────────────────────────────────
    @action(detail=True, methods=['post'])
    def assigner(self, request, pk=None):
        plan = self.get_object()
        client_id  = request.data.get('client_id')
        date_debut = request.data.get('date_debut')
        if not client_id or not date_debut:
            return Response({'error': 'client_id et date_debut requis.'}, status=400)
        try:
            client = Client.objects.get(id=client_id, coach=request.user)
        except Client.DoesNotExist:
            return Response({'error': 'Client introuvable.'}, status=404)
        AssignationPlan.objects.filter(client=client, actif=True).update(actif=False)
        a = AssignationPlan.objects.create(plan=plan, client=client, date_debut=date_debut)
        return Response(AssignationPlanSerializer(a).data, status=201)

    # ── Liste de courses ──────────────────────────────────────
    @action(detail=True, methods=['get'])
    def courses(self, request, pk=None):
        plan = self.get_object()
        courses = {}
        for repas in plan.repas.prefetch_related('aliments__aliment').all():
            for ar in repas.aliments.filter(aliment__isnull=False):
                key = str(ar.aliment_id)
                if key not in courses:
                    courses[key] = {
                        'aliment_id': key,
                        'nom': ar.aliment.nom,
                        'categorie': ar.aliment.get_categorie_display(),
                        'quantite_g': 0.0,
                    }
                courses[key]['quantite_g'] += float(ar.quantite_g)
        items = sorted(courses.values(), key=lambda x: x['categorie'])
        return Response({'items': items, 'total': len(items)})


# ── Calculateur calorique ──────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculateur_calorique(request):
    d = request.data
    try:
        poids = float(d['poids_kg'])
        taille = float(d['taille_cm'])
        age = int(d['age'])
        genre = d.get('genre', 'homme')
        activite = d.get('activite', 'modere')
        objectif = d.get('objectif', 'maintien')
    except (KeyError, ValueError):
        return Response({'error': 'poids_kg, taille_cm, age requis.'}, status=400)

    if genre == 'femme':
        bmr = 447.593 + (9.247 * poids) + (3.098 * taille) - (4.330 * age)
    else:
        bmr = 88.362 + (13.397 * poids) + (4.799 * taille) - (5.677 * age)

    mult = {'sedentaire': 1.2, 'leger': 1.375, 'modere': 1.55, 'actif': 1.725, 'tres_actif': 1.9}
    tdee = bmr * mult.get(activite, 1.55)

    if objectif == 'prise_masse':
        calories = round(tdee + 300)
        split = (0.30, 0.45, 0.25)
    elif objectif == 'perte_poids':
        calories = round(tdee - 400)
        split = (0.35, 0.40, 0.25)
    else:
        calories = round(tdee)
        split = (0.25, 0.50, 0.25)

    proteines_g = round(calories * split[0] / 4)
    glucides_g  = round(calories * split[1] / 4)
    lipides_g   = round(calories * split[2] / 9)

    return Response({
        'bmr': round(bmr),
        'tdee': round(tdee),
        'calories': calories,
        'proteines_g': proteines_g,
        'glucides_g': glucides_g,
        'lipides_g': lipides_g,
        'objectif': objectif,
    })


# ── Journal alimentaire (coach) ────────────────────────────────────────────────
@api_view(['GET'])
def journal_coach(request, client_id):
    try:
        client = Client.objects.get(id=client_id, coach=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Client introuvable.'}, status=404)
    date_param = request.query_params.get('date', str(timezone.now().date()))
    journal = client.journal_alimentaire.filter(date=date_param).select_related('aliment', 'recette')
    eau = client.consommation_eau.filter(date=date_param)
    return Response({
        'entries': JournalAlimentaireSerializer(journal, many=True).data,
        'eau': ConsommationEauSerializer(eau, many=True).data,
        'eau_total_ml': eau.aggregate(total=Sum('quantite_ml'))['total'] or 0,
    })


@api_view(['GET', 'POST', 'DELETE'])
def portal_eau(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)

    if request.method == 'GET':
        date_param = request.query_params.get('date', str(timezone.now().date()))
        qs = client.consommation_eau.filter(date=date_param)
        return Response({
            'entries': ConsommationEauSerializer(qs, many=True).data,
            'total_ml': qs.aggregate(total=Sum('quantite_ml'))['total'] or 0,
        })

    if request.method == 'POST':
        try:
            qml = int(request.data.get('quantite_ml', 0))
        except (TypeError, ValueError):
            qml = 0
        if not (50 <= qml <= 2000):
            return Response({'error': 'Quantité invalide (50–2000 ml par entrée).'}, status=400)
        s = ConsommationEauSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        entry = s.save(client=client)
        return Response(ConsommationEauSerializer(entry).data, status=201)

    if request.method == 'DELETE':
        entry_id = request.query_params.get('id')
        try:
            client.consommation_eau.get(id=entry_id).delete()
        except ConsommationEau.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(status=204)


# ── Portal nutrition ───────────────────────────────────────────────────────────
@api_view(['GET'])
def portal_plan_actif(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Acces reserve aux clients.'}, status=403)
    assignation = client.plans_alimentaires.filter(actif=True).select_related('plan').first()
    if not assignation:
        return Response(status=404)
    plan = PlanAlimentaire.objects.prefetch_related(
        'repas__aliments__aliment',
        'repas__aliments__recette__ingredients__aliment',
    ).get(id=assignation.plan_id)
    return Response({
        'plan': PlanAlimentaireSerializer(plan).data,
        'assignation': {
            'date_debut': assignation.date_debut,
            'calories_objectif': float(plan.objectif_calories) if plan.objectif_calories else None,
        },
    })


@api_view(['GET', 'POST', 'DELETE'])
def portal_journal(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Acces reserve aux clients.'}, status=403)

    if request.method == 'GET':
        date = request.query_params.get('date', str(timezone.now().date()))
        qs = client.journal_alimentaire.filter(date=date).select_related('aliment')
        return Response({'entries': JournalAlimentaireSerializer(qs, many=True).data})

    if request.method == 'POST':
        try:
            qg = float(request.data.get('quantite_g', 0))
        except (TypeError, ValueError):
            qg = 0
        if not (1 <= qg <= 2000):
            return Response({'error': 'Quantité invalide (1–2000 g).'}, status=400)
        s = JournalAlimentaireSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        entry = s.save(client=client)
        return Response(JournalAlimentaireSerializer(entry).data, status=201)

    if request.method == 'DELETE':
        entry_id = request.query_params.get('id')
        try:
            client.journal_alimentaire.get(id=entry_id).delete()
        except JournalAlimentaire.DoesNotExist:
            return Response({'error': 'Introuvable.'}, status=404)
        return Response(status=204)


@api_view(['GET'])
def portal_recettes(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    qs = _recette_queryset_for(client.coach)
    tags_param = request.query_params.get('tags', '').strip()
    if tags_param:
        for tag in [t.strip() for t in tags_param.split(',') if t.strip()]:
            qs = qs.filter(tags__contains=[tag])
    q = request.query_params.get('q', '').strip()
    if q:
        qs = qs.filter(nom__icontains=q)
    recettes = qs[:100]
    return Response(RecetteSerializer(recettes, many=True, context={'request': request}).data)


@api_view(['GET'])
def portal_programme(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    assignations = client.assignations.filter(statut='en_cours').select_related('programme').order_by('date_debut')
    programmes = []
    for assignation in assignations:
        jours = assignation.programme.jours.prefetch_related('exercices__exercice')
        programmes.append({
            'assignation': AssignationSerializer(assignation).data,
            'jours': ProgrammeJourSerializer(jours, many=True, context={'request': request}).data,
        })
    return Response(programmes)


@api_view(['GET'])
def portal_courses(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Acces reserve aux clients.'}, status=403)
    assignation = client.plans_alimentaires.filter(actif=True).select_related('plan').first()
    if not assignation:
        return Response(status=404)
    courses = {}
    repas_count = {}
    for repas in assignation.plan.repas.prefetch_related('aliments__aliment').all():
        for ar in repas.aliments.filter(aliment__isnull=False):
            key = str(ar.aliment_id)
            if key not in courses:
                courses[key] = {
                    'nom': ar.aliment.nom,
                    'categorie': ar.aliment.categorie,
                    'quantite_totale': 0.0,
                    'nb_repas': 0,
                }
            courses[key]['quantite_totale'] += float(ar.quantite_g)
            courses[key]['nb_repas'] += 1

    par_categorie = {}
    for item in sorted(courses.values(), key=lambda x: (x['categorie'], x['nom'])):
        cat = item['categorie']
        if cat not in par_categorie:
            par_categorie[cat] = []
        par_categorie[cat].append({
            'nom': item['nom'],
            'quantite_totale': item['quantite_totale'],
            'nb_repas': item['nb_repas'],
        })
    return Response({'par_categorie': par_categorie})


# ── CHECK-IN ──────────────────────────────────────────────────────────────────

def _lundi_semaine(d=None):
    """Retourne le lundi de la semaine de la date donnée."""
    from datetime import date, timedelta
    d = d or date.today()
    return d - timedelta(days=d.weekday())


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def coach_checkins(request, client_id):
    """Coach : liste les check-ins d'un client / en crée un manuellement."""
    try:
        client = Client.objects.get(id=client_id, coach=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Client introuvable.'}, status=404)

    if request.method == 'GET':
        checkins = client.checkins.all()
        return Response(CheckinReponseSerializer(checkins, many=True).data)

    serializer = CheckinReponseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(client=client)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def portal_checkin(request):
    """Client : get son check-in de la semaine courante + historique / soumet."""
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)

    if request.method == 'GET':
        lundi = _lundi_semaine()
        checkin_semaine = client.checkins.filter(semaine=lundi).first()
        historique = CheckinReponseSerializer(client.checkins.all()[:12], many=True).data
        return Response({
            'semaine_courante': lundi.isoformat(),
            'checkin_semaine': CheckinReponseSerializer(checkin_semaine).data if checkin_semaine else None,
            'historique': historique,
        })

    # POST — soumettre le check-in de la semaine
    lundi = _lundi_semaine()
    existing = client.checkins.filter(semaine=lundi).first()
    if existing:
        serializer = CheckinReponseSerializer(existing, data=request.data, partial=True)
    else:
        data = {**request.data, 'semaine': lundi.isoformat()}
        serializer = CheckinReponseSerializer(data=data)

    if serializer.is_valid():
        serializer.save(client=client)
        return Response(serializer.data, status=200 if existing else 201)
    return Response(serializer.errors, status=400)


# ── NUTRITION HISTORIQUE ──────────────────────────────────────────────────────

def _build_nutrition_historique(client, days):
    from datetime import date, timedelta
    date_debut = date.today() - timedelta(days=days - 1)

    journal = JournalAlimentaire.objects.filter(
        client=client, date__gte=date_debut
    ).select_related('aliment', 'recette')

    eau_qs = ConsommationEau.objects.filter(client=client, date__gte=date_debut)

    by_date = {}
    for entry in journal:
        dk = str(entry.date)
        if dk not in by_date:
            by_date[dk] = {'date': dk, 'calories': 0.0, 'proteines': 0.0, 'glucides': 0.0, 'lipides': 0.0, 'eau_ml': 0}
        m = entry.get_macros()
        by_date[dk]['calories']  += m.get('calories', 0) or 0
        by_date[dk]['proteines'] += m.get('proteines', 0) or 0
        by_date[dk]['glucides']  += m.get('glucides', 0) or 0
        by_date[dk]['lipides']   += m.get('lipides', 0) or 0

    for entry in eau_qs:
        dk = str(entry.date)
        if dk not in by_date:
            by_date[dk] = {'date': dk, 'calories': 0.0, 'proteines': 0.0, 'glucides': 0.0, 'lipides': 0.0, 'eau_ml': 0}
        by_date[dk]['eau_ml'] += entry.quantite_ml

    result = sorted(by_date.values(), key=lambda x: x['date'])
    for r in result:
        r['calories']  = round(r['calories'])
        r['proteines'] = round(r['proteines'], 1)
        r['glucides']  = round(r['glucides'], 1)
        r['lipides']   = round(r['lipides'], 1)
    return result


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nutrition_historique_coach(request, client_id):
    try:
        client = Client.objects.get(id=client_id, coach=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Client introuvable.'}, status=404)
    days = max(1, min(90, int(request.GET.get('days', 30))))
    return Response(_build_nutrition_historique(client, days))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portal_nutrition_historique(request):
    client = _get_client_profile(request)
    if not client:
        return Response({'error': 'Accès réservé aux clients.'}, status=403)
    days = max(1, min(90, int(request.GET.get('days', 30))))
    return Response(_build_nutrition_historique(client, days))


# ── EXERCICES ─────────────────────────────────────────────────────────────────

class ExerciceViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Exercice.objects.filter(
            Q(est_personnalise=False) | Q(coach=self.request.user)
        )
        groupe = self.request.query_params.get('groupe')
        if groupe:
            qs = qs.filter(groupe_musculaire=groupe)
        categorie = self.request.query_params.get('categorie')
        if categorie:
            qs = qs.filter(categorie=categorie)
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(nom__icontains=q)
        return qs

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user, est_personnalise=True)

    def destroy(self, request, *args, **kwargs):
        exercice = self.get_object()
        if not exercice.est_personnalise or exercice.coach != request.user:
            return Response({'error': 'Impossible de supprimer un exercice de la bibliothèque de base.'}, status=403)
        return super().destroy(request, *args, **kwargs)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def seance_exercices(request, seance_id):
    try:
        seance = Seance.objects.get(id=seance_id, coach=request.user)
    except Seance.DoesNotExist:
        return Response({'error': 'Séance introuvable.'}, status=404)

    if request.method == 'GET':
        items = seance.exercices_planifies.select_related('exercice').all()
        return Response(ExerciceSeanceSerializer(items, many=True).data)

    data = request.data.copy()
    data['seance'] = str(seance_id)
    serializer = ExerciceSeanceSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def seance_exercice_detail(request, seance_id, item_id):
    try:
        seance = Seance.objects.get(id=seance_id, coach=request.user)
        item = ExerciceSeance.objects.get(id=item_id, seance=seance)
    except (Seance.DoesNotExist, ExerciceSeance.DoesNotExist):
        return Response({'error': 'Introuvable.'}, status=404)

    if request.method == 'DELETE':
        item.delete()
        return Response(status=204)

    serializer = ExerciceSeanceSerializer(item, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ── Push Notifications ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def vapid_public_key(request):
    return Response({'publicKey': settings.VAPID_PUBLIC_KEY})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def push_subscribe(request):
    if request.method == 'POST':
        endpoint = request.data.get('endpoint')
        p256dh   = request.data.get('keys', {}).get('p256dh')
        auth     = request.data.get('keys', {}).get('auth')
        if not (endpoint and p256dh and auth):
            return Response({'error': 'endpoint, keys.p256dh et keys.auth requis.'}, status=400)
        sub, _ = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={'user': request.user, 'p256dh': p256dh, 'auth': auth},
        )
        return Response({'status': 'subscribed'}, status=201)

    if request.method == 'DELETE':
        endpoint = request.data.get('endpoint')
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response(status=204)


def _send_push(subscription, title, body, url='/'):
    from pywebpush import webpush, WebPushException
    import json
    try:
        webpush(
            subscription_info={'endpoint': subscription.endpoint, 'keys': {'p256dh': subscription.p256dh, 'auth': subscription.auth}},
            data=json.dumps({'title': title, 'body': body, 'url': url}),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={'sub': f'mailto:{settings.VAPID_ADMIN_EMAIL}'},
        )
    except WebPushException as e:
        if e.response and e.response.status_code in (404, 410):
            subscription.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_plans(request, client_id):
    client = get_object_or_404(Client, id=client_id, coach=request.user)
    assignations = (
        AssignationPlan.objects
        .filter(client=client)
        .select_related('plan')
        .prefetch_related(
            'plan__repas__aliments__aliment',
            'plan__repas__aliments__recette__ingredients__aliment',
        )
        .order_by('-actif', '-created_at')
    )
    def _macros(ar):
        try:
            return ar.get_macros()
        except Exception:
            return {'calories': 0, 'proteines': 0, 'glucides': 0, 'lipides': 0, 'fibres': 0}

    data = []
    for a in assignations:
        plan = a.plan
        repas_data = []
        for repas in plan.repas.all():
            items = []
            repas_macros = {'calories': 0.0, 'proteines': 0.0, 'glucides': 0.0, 'lipides': 0.0}
            for ar in repas.aliments.all():
                nom = ar.recette.nom if ar.recette else (ar.aliment.nom if ar.aliment else '')
                photo = None
                if ar.recette and ar.recette.photo:
                    photo = request.build_absolute_uri(ar.recette.photo.url)
                m = _macros(ar)
                for k in repas_macros:
                    repas_macros[k] += m.get(k, 0)
                items.append({
                    'nom': nom,
                    'quantite_g': float(ar.quantite_g),
                    'notes': ar.notes,
                    'photo': photo,
                    'macros': {k: round(v, 1) for k, v in m.items()},
                })
            repas_data.append({
                'type_repas': repas.type_repas,
                'ordre': repas.ordre,
                'items': items,
                'macros_total': {k: round(v, 1) for k, v in repas_macros.items()},
            })

        # Regrouper par jour (notes = label du jour)
        jours = {}
        for r in repas_data:
            jour = r['items'][0]['notes'] if r['items'] and r['items'][0]['notes'] else 'Plan'
            if jour not in jours:
                jours[jour] = []
            jours[jour].append({
                'type_repas': r['type_repas'],
                'items': r['items'],
                'macros_total': r['macros_total'],
            })

        # Total journalier (premier jour comme référence)
        first_day_repas = list(jours.values())[0] if jours else []
        jour_macros = {'calories': 0.0, 'proteines': 0.0, 'glucides': 0.0, 'lipides': 0.0}
        for r in first_day_repas:
            for k in jour_macros:
                jour_macros[k] += r['macros_total'].get(k, 0)

        data.append({
            'id': str(a.id),
            'plan_id': str(plan.id),
            'nom': plan.nom,
            'description': plan.description,
            'actif': a.actif,
            'date_debut': a.date_debut,
            'objectif_calories': plan.objectif_calories,
            'objectif_proteines_g': float(plan.objectif_proteines_g or 0),
            'objectif_glucides_g': float(plan.objectif_glucides_g or 0),
            'objectif_lipides_g': float(plan.objectif_lipides_g or 0),
            'jours': [{'jour': j, 'repas': repas} for j, repas in jours.items()],
            'nb_repas': len(repas_data),
            'exemple_macros_jour': {k: round(v, 1) for k, v in jour_macros.items()},
        })
    return Response(data)


def _extract_json(raw: str):
    """Extrait un objet JSON depuis une réponse texte IA.

    Gère les fences markdown (```json ... ```), les espaces, le texte
    en préambule/postambule, et tente une réparation par troncature
    si la fin du JSON est coupée (max_tokens atteint).
    """
    import json, re
    if not raw:
        return None
    # Strip markdown code fences
    s = raw.strip()
    s = re.sub(r'^```(?:json)?\s*', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\s*```\s*$', '', s)
    # Cherche le premier { ouvrant
    start = s.find('{')
    if start == -1:
        return None
    candidate = s[start:]
    # Essai 1 : parse tel quel
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass
    # Essai 2 : tronquer au dernier } équilibré (utile si la réponse a été coupée)
    depth = 0
    last_ok = -1
    in_str = False
    esc = False
    for i, ch in enumerate(candidate):
        if esc:
            esc = False
            continue
        if ch == '\\':
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                last_ok = i
    if last_ok > 0:
        try:
            return json.loads(candidate[:last_ok + 1])
        except json.JSONDecodeError:
            return None
    return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generer_plan_ia(request, client_id):
    import anthropic, json, re
    from datetime import date as date_cls
    from core.ia_quota import lookup_cache, check_quota, record_generation, quota_status

    client  = get_object_or_404(Client, id=client_id, coach=request.user)
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return Response({'error': 'Clé API Anthropic non configurée.'}, status=503)

    objectif_type = request.data.get('objectif', 'equilibre')
    kcal_cible    = request.data.get('kcal_cible')
    restrictions  = request.data.get('restrictions', '')
    nb_jours      = min(int(request.data.get('nb_jours', 5)), 7)

    cache_params = {
        'objectif': objectif_type,
        'kcal_cible': kcal_cible,
        'restrictions': restrictions,
        'nb_jours': nb_jours,
    }
    cache_entry, params_hash = lookup_cache(request.user, 'plan', client.id, cache_params)
    if cache_entry:
        return Response({**cache_entry.result, '_cached': True, '_quota': quota_status(request.user)})

    ok, profile = check_quota(request.user)
    if not ok:
        qs = quota_status(request.user)
        return Response({
            'error': f"Quota IA mensuel atteint ({qs['utilise']}/{qs['quota']}). Réinitialisation le 1er du mois prochain.",
            '_quota': qs,
        }, status=429)

    last_mesure  = client.mesures.order_by('-date').first()
    poids_actuel = float(last_mesure.poids_kg) if last_mesure and last_mesure.poids_kg else float(client.poids_depart_kg or 70)

    if not kcal_cible:
        taille = client.taille_cm or 170
        age    = client.age or 30
        bmr = (655 + 9.6*poids_actuel + 1.8*taille - 4.7*age) if client.genre == 'femme' \
              else (66 + 13.7*poids_actuel + 5*taille - 6.8*age)
        tdee = bmr * 1.5
        kcal_cible = round(tdee - 400 if objectif_type == 'perte_poids' else tdee + 300 if objectif_type == 'prise_masse' else tdee)

    kcal = int(kcal_cible)
    if objectif_type == 'prise_masse':
        proteines_g = round(poids_actuel * 2.0); lipides_g = round(kcal * 0.25 / 9)
    elif objectif_type == 'perte_poids':
        proteines_g = round(poids_actuel * 2.2); lipides_g = round(kcal * 0.30 / 9)
    else:
        proteines_g = round(poids_actuel * 1.6); lipides_g = round(kcal * 0.28 / 9)
    glucides_g = max(0, round((kcal - proteines_g*4 - lipides_g*9) / 4))

    # Recettes : clés courtes, triées par proximité calorique, limitées à 40
    kcal_repas_cible = kcal / 3.5
    recettes_raw = []
    for r in Recette.objects.prefetch_related('ingredients__aliment').filter(coach=request.user):
        try:
            m = r.macros_par_portion
            recettes_raw.append({'i': str(r.id), 'n': r.nom,
                                  'c': round(m['calories']), 'p': round(m['proteines'])})
        except Exception:
            pass
    recettes_raw.sort(key=lambda x: abs(x['c'] - kcal_repas_cible))
    recettes_list = recettes_raw[:40]

    JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
    j_str = ','.join(JOURS[:nb_jours])

    prompt = (
        f"Nutritionniste. Plan {nb_jours}j pour {client.prenom} "
        f"({client.genre or '?'}, {client.age or '?'}ans, {poids_actuel}kg→{client.poids_cible_kg or '?'}kg).\n"
        f"Objectif:{objectif_type} | Cible:{kcal}kcal P:{proteines_g}g G:{glucides_g}g L:{lipides_g}g\n"
        f"Prefs:{client.alimentation or 'aucune'}"
        + (f" | Restrictions:{restrictions}" if restrictions else "") + "\n"
        f"Recettes (i=id,n=nom,c=cal,p=prot): {json.dumps(recettes_list, ensure_ascii=False, separators=(',',':'))}\n"
        f"Jours:{j_str}. Repas:petit_dejeuner,dejeuner,diner(+collations si utile). "
        f"IDs exacts. Varie. ±150kcal/j.\n"
        f'JSON only:{{"nom":"...","description":"...","kcal_cible":{kcal},"proteines_g":{proteines_g},'
        f'"glucides_g":{glucides_g},"lipides_g":{lipides_g},"jours":['
        f'{{"jour":"Lundi","repas":[{{"type_repas":"petit_dejeuner","recette_id":"i","nom_recette":"n"}}],'
        f'"total_calories":0,"total_proteines_g":0,"total_glucides_g":0,"total_lipides_g":0}}]}}'
    )

    try:
        anth = anthropic.Anthropic(api_key=api_key)
        msg  = anth.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=4000,
            messages=[{'role': 'user', 'content': prompt}],
        )
        raw = msg.content[0].text
        plan_data = _extract_json(raw)
        if plan_data is None:
            import logging
            logging.warning('IA plan: JSON parse failed. Raw response (first 500 chars): %s', raw[:500])
            return Response({'error': 'Réponse IA invalide. Réessayez dans quelques secondes.'}, status=500)
        record_generation(request.user, 'plan', params_hash, plan_data, profile=profile)
        return Response({**plan_data, '_cached': False, '_quota': quota_status(request.user)})
    except anthropic.APIError as e:
        return Response({'error': f'Erreur API Anthropic : {e}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sauvegarder_plan_ia(request, client_id):
    from datetime import date as date_cls
    from django.db import transaction

    client    = get_object_or_404(Client, id=client_id, coach=request.user)
    plan_data = request.data

    # Collecter tous les IDs de recettes en une seule requête
    all_recette_ids = list({
        repas.get('recette_id')
        for jour in plan_data.get('jours', [])
        for repas in jour.get('repas', [])
        if repas.get('recette_id')
    })
    recette_map = {
        str(r.id): r
        for r in Recette.objects.filter(id__in=all_recette_ids)
    }

    with transaction.atomic():
        plan = PlanAlimentaire.objects.create(
            coach                = request.user,
            nom                  = plan_data.get('nom', 'Plan IA'),
            description          = plan_data.get('description', ''),
            objectif_calories    = plan_data.get('kcal_cible'),
            objectif_proteines_g = plan_data.get('proteines_g'),
            objectif_glucides_g  = plan_data.get('glucides_g'),
            objectif_lipides_g   = plan_data.get('lipides_g'),
        )

        repas_a_creer    = []
        aliments_a_creer = []  # (repas_index, recette, jour_label)
        repas_objects    = []

        for i, jour in enumerate(plan_data.get('jours', [])):
            for j, repas in enumerate(jour.get('repas', [])):
                repas_a_creer.append(RepasTemplate(
                    plan       = plan,
                    type_repas = repas.get('type_repas', 'dejeuner'),
                    ordre      = i * 10 + j,
                ))
                repas_objects.append((repas.get('recette_id'), jour.get('jour', '')))

        created_repas = RepasTemplate.objects.bulk_create(repas_a_creer)

        for repas_obj, (rid, jour_label) in zip(created_repas, repas_objects):
            recette = recette_map.get(str(rid)) if rid else None
            if recette:
                aliments_a_creer.append(AlimentRepas(
                    repas      = repas_obj,
                    recette    = recette,
                    quantite_g = 200,
                    notes      = jour_label,
                ))

        if aliments_a_creer:
            AlimentRepas.objects.bulk_create(aliments_a_creer)

        AssignationPlan.objects.filter(client=client, actif=True).update(actif=False)
        AssignationPlan.objects.create(plan=plan, client=client, date_debut=date_cls.today(), actif=True)

    return Response({'id': str(plan.id), 'nom': plan.nom}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generer_programme_ia(request, client_id):
    import anthropic, json, re
    from core.ia_quota import lookup_cache, check_quota, record_generation, quota_status

    client  = get_object_or_404(Client, id=client_id, coach=request.user)
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return Response({'error': 'Clé API Anthropic non configurée.'}, status=503)

    objectif        = request.data.get('objectif', 'force')
    seances_par_sem = min(int(request.data.get('seances_par_semaine', 3)), 6)
    duree_semaines  = min(int(request.data.get('duree_semaines', 8)), 16)
    materiel        = request.data.get('materiel', 'salle_complete')
    notes_coach     = request.data.get('notes', '')
    niveau          = client.niveau or 'intermediaire'

    cache_params = {
        'objectif': objectif,
        'seances_par_semaine': seances_par_sem,
        'duree_semaines': duree_semaines,
        'materiel': materiel,
        'notes': notes_coach,
        'niveau': niveau,
    }
    cache_entry, params_hash = lookup_cache(request.user, 'programme', client.id, cache_params)
    if cache_entry:
        return Response({**cache_entry.result, '_cached': True, '_quota': quota_status(request.user)})

    ok, profile = check_quota(request.user)
    if not ok:
        qs = quota_status(request.user)
        return Response({
            'error': f"Quota IA mensuel atteint ({qs['utilise']}/{qs['quota']}). Réinitialisation le 1er du mois prochain.",
            '_quota': qs,
        }, status=429)

    JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']

    # Filtrage exercices par objectif + matériel → réduction drastique de la liste
    GROUPES = {
        'force':        {'pectoraux','dorsaux','epaules','biceps','triceps','quadriceps','ischio','fessiers','mollets','abdominaux'},
        'perte_poids':  {'full_body','cardio','quadriceps','fessiers','abdominaux','ischio'},
        'remise_forme': {'full_body','pectoraux','dorsaux','quadriceps','fessiers','abdominaux','cardio','epaules'},
        'cardio':       {'cardio','full_body','quadriceps','fessiers'},
        'mobilite':     {'full_body','abdominaux','mollets'},
    }
    groupes_cibles = GROUPES.get(objectif, set(GROUPES['force']))

    qs = Exercice.objects.filter(est_personnalise=False, groupe_musculaire__in=groupes_cibles)
    if materiel == 'poids_corps':
        qs = qs.filter(categorie__in=['gainage', 'mobilite', 'cardio'])
    elif materiel == 'halteres':
        qs = qs.exclude(categorie='mobilite')

    # Seuls les noms — l'IA connaît les exercices, pas besoin de groupe/catégorie
    noms_exos = [e.nom for e in qs.order_by('groupe_musculaire', 'nom')[:70]]

    prompt = (
        f"Coach sportif. Programme {seances_par_sem}j/sem {duree_semaines}sem pour {client.prenom}.\n"
        f"Niveau:{niveau} | Objectif:{objectif} | Matériel:{materiel}"
        + (f" | Blessures:{client.blessures}" if client.blessures else "")
        + (f"\nNotes:{notes_coach}" if notes_coach else "") + "\n"
        f"Exercices disponibles (noms exacts uniquement):{json.dumps(noms_exos, ensure_ascii=False, separators=(',',':'))}\n"
        f"Jours:{','.join(JOURS[:seances_par_sem])}. 5-7 exos/séance. Équilibre musculaire. "
        f"Séries/reps selon objectif.\n"
        f'JSON only:{{"nom":"...","description":"...","categorie":"{objectif}",'
        f'"duree_semaines":{duree_semaines},"seances_par_semaine":{seances_par_sem},'
        f'"conseils":"...","jours":[{{"jour":"Lundi","titre":"...","exercices":['
        f'{{"nom":"...","series":3,"reps":"10","repos_sec":60,"notes":""}}]}}]}}'
    )

    try:
        anth = anthropic.Anthropic(api_key=api_key)
        msg  = anth.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=2500,
            messages=[{'role': 'user', 'content': prompt}],
        )
        raw = msg.content[0].text
        prog_data = _extract_json(raw)
        if prog_data is None:
            import logging
            logging.warning('IA programme: JSON parse failed. Raw response (first 500 chars): %s', raw[:500])
            return Response({'error': 'Réponse IA invalide. Réessayez dans quelques secondes.'}, status=500)
        record_generation(request.user, 'programme', params_hash, prog_data, profile=profile)
        return Response({**prog_data, '_cached': False, '_quota': quota_status(request.user)})
    except anthropic.APIError as e:
        return Response({'error': f'Erreur API Anthropic : {e}'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sauvegarder_programme_ia(request, client_id):
    from django.db import transaction

    client      = get_object_or_404(Client, id=client_id, coach=request.user)
    data        = request.data
    as_template = bool(data.get('as_template', False))

    JOUR_MAP  = {'Lundi':'1','Mardi':'2','Mercredi':'3','Jeudi':'4','Vendredi':'5','Samedi':'6','Dimanche':'7'}
    exo_cache = {e.nom.lower(): e for e in Exercice.objects.filter(est_personnalise=False)}
    CAT_MAP   = {'force':'force','perte_poids':'perte_poids','remise_forme':'remise_forme','mobilite':'mobilite','cardio':'cardio'}

    def _build(est_template):
        p = Programme.objects.create(
            coach               = request.user,
            nom                 = data.get('nom', 'Programme IA'),
            description         = data.get('description', ''),
            categorie           = CAT_MAP.get(data.get('categorie', 'force'), 'custom'),
            duree_semaines      = int(data.get('duree_semaines', 8)),
            seances_par_semaine = int(data.get('seances_par_semaine', 3)),
            est_template        = est_template,
            genere_par_ia       = True,
        )
        for ordre, jour_data in enumerate(data.get('jours', [])):
            jour = ProgrammeJour.objects.create(
                programme = p, semaine=1, ordre=ordre,
                jour      = JOUR_MAP.get(jour_data.get('jour', 'Lundi'), '1'),
                titre     = jour_data.get('titre', ''),
            )
            for ex_ordre, ex_data in enumerate(jour_data.get('exercices', [])):
                nom = ex_data.get('nom', '')
                obj = exo_cache.get(nom.lower())
                ProgrammeJourExercice.objects.create(
                    jour=jour, exercice=obj, ordre=ex_ordre,
                    nom_libre = '' if obj else nom,
                    series    = int(ex_data.get('series', 3)),
                    reps      = str(ex_data.get('reps', '10')),
                    repos_sec = int(ex_data.get('repos_sec', 60)),
                    notes     = ex_data.get('notes', ''),
                )
        return p

    with transaction.atomic():
        prog = _build(est_template=False)
        if as_template:
            _build(est_template=True)

        date_debut_str = date.today()
        from datetime import timedelta
        date_fin = date_debut_str + timedelta(weeks=prog.duree_semaines)
        AssignationProgramme.objects.filter(client=client, statut='en_cours').update(statut='abandonne')
        AssignationProgramme.objects.create(
            client=client, programme=prog,
            date_debut=date_debut_str, date_fin_prevue=date_fin,
        )
        if client.statut in ['nouveau', 'inactif']:
            client.statut = 'actif'
            client.save(update_fields=['statut'])

    return Response({'id': str(prog.id), 'nom': prog.nom}, status=201)


@api_view(['POST'])
def push_send_to_client(request, client_id):
    try:
        client = Client.objects.get(id=client_id, coach=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Client introuvable.'}, status=404)
    if not client.user_account:
        return Response({'error': 'Ce client n\'a pas de compte portail.'}, status=400)
    title = request.data.get('title', 'TrainFlow')
    body  = request.data.get('body', '')
    url   = request.data.get('url', '/')
    subs  = PushSubscription.objects.filter(user=client.user_account)
    for sub in subs:
        _send_push(sub, title, body, url)
    return Response({'sent': subs.count()})


# ─── RÉSERVATION DE SÉANCES ───────────────────────────────────────────────────

def _serialize_dispo(d):
    return {
        'id': str(d.id), 'jour_semaine': d.jour_semaine,
        'heure_debut': d.heure_debut.strftime('%H:%M'),
        'heure_fin':   d.heure_fin.strftime('%H:%M'),
        'actif': d.actif,
    }

def _serialize_exception(e):
    return {
        'id': str(e.id), 'date': e.date.isoformat(), 'type': e.type,
        'heure_debut': e.heure_debut.strftime('%H:%M') if e.heure_debut else None,
        'heure_fin':   e.heure_fin.strftime('%H:%M') if e.heure_fin else None,
        'motif': e.motif,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def disponibilites_view(request):
    if request.method == 'GET':
        qs = DisponibiliteCoach.objects.filter(coach=request.user)
        return Response([_serialize_dispo(d) for d in qs])

    d = request.data
    try:
        h_deb = datetime.strptime(d.get('heure_debut'), '%H:%M').time()
        h_fin = datetime.strptime(d.get('heure_fin'),   '%H:%M').time()
    except (ValueError, TypeError):
        return Response({'error': 'Format heure invalide (HH:MM attendu).'}, status=400)
    if h_fin <= h_deb:
        return Response({'error': 'Heure de fin doit être après heure de début.'}, status=400)
    jour = int(d.get('jour_semaine', 0))
    if not 0 <= jour <= 6:
        return Response({'error': 'Jour invalide (0-6).'}, status=400)
    dispo = DisponibiliteCoach.objects.create(
        coach=request.user, jour_semaine=jour,
        heure_debut=h_deb, heure_fin=h_fin, actif=True,
    )
    return Response(_serialize_dispo(dispo), status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def disponibilite_delete(request, dispo_id):
    try:
        DisponibiliteCoach.objects.get(id=dispo_id, coach=request.user).delete()
    except DisponibiliteCoach.DoesNotExist:
        return Response({'error': 'Introuvable.'}, status=404)
    return Response(status=204)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def exceptions_dispo_view(request):
    if request.method == 'GET':
        qs = ExceptionDisponibilite.objects.filter(coach=request.user, date__gte=date.today())
        return Response([_serialize_exception(e) for e in qs])

    d = request.data
    try:
        date_obj = date.fromisoformat(d.get('date'))
    except (ValueError, TypeError):
        return Response({'error': 'Date invalide.'}, status=400)
    type_e = d.get('type', 'ferme')
    if type_e not in ('ferme', 'ouvert'):
        return Response({'error': 'Type invalide.'}, status=400)
    h_deb = h_fin = None
    if type_e == 'ouvert':
        try:
            h_deb = datetime.strptime(d.get('heure_debut'), '%H:%M').time()
            h_fin = datetime.strptime(d.get('heure_fin'),   '%H:%M').time()
        except (ValueError, TypeError):
            return Response({'error': 'Heures requises pour un créneau ouvert.'}, status=400)
    exc = ExceptionDisponibilite.objects.create(
        coach=request.user, date=date_obj, type=type_e,
        heure_debut=h_deb, heure_fin=h_fin, motif=d.get('motif', ''),
    )
    return Response(_serialize_exception(exc), status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def exception_dispo_delete(request, exc_id):
    try:
        ExceptionDisponibilite.objects.get(id=exc_id, coach=request.user).delete()
    except ExceptionDisponibilite.DoesNotExist:
        return Response({'error': 'Introuvable.'}, status=404)
    return Response(status=204)


def _compute_slots(coach, date_debut, date_fin):
    profile = getattr(coach, 'coach_profile', None)
    if not profile or not profile.reservation_active:
        return []
    duree = profile.reservation_duree_min
    preavis = timedelta(hours=profile.reservation_preavis_h)
    now = timezone.now()
    limit_min = now + preavis

    dispos_par_jour = {}
    for d in DisponibiliteCoach.objects.filter(coach=coach, actif=True):
        dispos_par_jour.setdefault(d.jour_semaine, []).append(d)

    exceptions = {e.date: e for e in ExceptionDisponibilite.objects.filter(
        coach=coach, date__gte=date_debut, date__lte=date_fin,
    )}

    # Intervalles occupés par des séances existantes (overlap réel, pas match exact)
    # Marge d'1 jour en amont pour capturer une séance longue débordant sur la fenêtre.
    seances_intervals = []
    for s in Seance.objects.filter(
        coach=coach,
        date_heure__date__gte=date_debut - timedelta(days=1),
        date_heure__date__lte=date_fin,
        statut__in=['planifiee', 'realisee'],
    ).values('date_heure', 'duree_minutes'):
        start = s['date_heure']
        end = start + timedelta(minutes=s['duree_minutes'] or 60)
        seances_intervals.append((start, end))

    def _slot_overlaps_seance(slot_start, slot_end):
        for ss, se in seances_intervals:
            if slot_start < se and slot_end > ss:
                return True
        return False

    # Périodes occupées dans Google Calendar (silent si non connecté)
    try:
        from core.google_calendar import list_busy as _gcal_busy
        gcal_busy = _gcal_busy(coach, date_debut, date_fin)
    except Exception:
        gcal_busy = []

    def _slot_overlaps_gcal(slot_start, slot_end):
        for bs, be in gcal_busy:
            if slot_start < be and slot_end > bs:
                return True
        return False

    slots = []
    cur = date_debut
    while cur <= date_fin:
        plages = []
        exc = exceptions.get(cur)
        if exc and exc.type == 'ferme':
            cur += timedelta(days=1)
            continue
        for d in dispos_par_jour.get(cur.weekday(), []):
            plages.append((d.heure_debut, d.heure_fin))
        if exc and exc.type == 'ouvert' and exc.heure_debut and exc.heure_fin:
            plages.append((exc.heure_debut, exc.heure_fin))

        for h_deb, h_fin in plages:
            curseur = timezone.make_aware(datetime.combine(cur, h_deb))
            fin = timezone.make_aware(datetime.combine(cur, h_fin))
            while curseur + timedelta(minutes=duree) <= fin:
                slot_end = curseur + timedelta(minutes=duree)
                if (curseur >= limit_min
                        and not _slot_overlaps_seance(curseur, slot_end)
                        and not _slot_overlaps_gcal(curseur, slot_end)):
                    slots.append({'date_heure': curseur.isoformat(), 'duree_min': duree})
                curseur += timedelta(minutes=duree)
        cur += timedelta(days=1)

    slots.sort(key=lambda s: s['date_heure'])
    return slots


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portal_disponibilites(request):
    try:
        client = Client.objects.get(user_account=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Profil client introuvable.'}, status=404)
    coach = client.coach
    profile = getattr(coach, 'coach_profile', None)
    if not profile or not profile.reservation_active:
        return Response({'active': False, 'slots': []})

    try:
        d_debut = date.fromisoformat(request.query_params.get('date_debut') or '')
    except ValueError:
        d_debut = date.today()
    try:
        d_fin = date.fromisoformat(request.query_params.get('date_fin') or '')
    except ValueError:
        d_fin = d_debut + timedelta(days=profile.reservation_horizon_j)

    max_fin = date.today() + timedelta(days=profile.reservation_horizon_j)
    if d_fin > max_fin:
        d_fin = max_fin

    slots = _compute_slots(coach, d_debut, d_fin)
    return Response({
        'active': True,
        'duree_min': profile.reservation_duree_min,
        'preavis_h': profile.reservation_preavis_h,
        'horizon_j': profile.reservation_horizon_j,
        'slots': slots,
    })


# ─── GOOGLE CALENDAR SYNC ─────────────────────────────────────────────────────

GCAL_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
]


def _gcal_flow():
    from google_auth_oauthlib.flow import Flow
    from django.conf import settings as dj_settings
    flow = Flow.from_client_config(
        {'web': {
            'client_id':     dj_settings.GOOGLE_OAUTH_CLIENT_ID,
            'client_secret': dj_settings.GOOGLE_OAUTH_CLIENT_SECRET,
            'auth_uri':      'https://accounts.google.com/o/oauth2/auth',
            'token_uri':     'https://oauth2.googleapis.com/token',
            'redirect_uris': [dj_settings.GOOGLE_CALENDAR_REDIRECT_URI],
        }},
        scopes=GCAL_SCOPES,
        autogenerate_code_verifier=False,  # PKCE désactivé : client confidentiel avec secret
    )
    flow.redirect_uri = dj_settings.GOOGLE_CALENDAR_REDIRECT_URI
    return flow


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_calendar_status(request):
    token = GoogleCalendarToken.objects.filter(user=request.user).first()
    if not token:
        return Response({'connected': False})
    return Response({
        'connected': True,
        'email': token.google_email,
        'calendar_id': token.calendar_id,
        'sync_enabled': token.sync_enabled,
        'last_sync_at': token.last_sync_at.isoformat() if token.last_sync_at else None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_calendar_connect(request):
    """Retourne l'URL OAuth Google pour démarrer la connexion."""
    from django.core.signing import TimestampSigner
    if not settings.GOOGLE_OAUTH_CLIENT_SECRET:
        return Response({'error': 'Google OAuth non configuré côté serveur.'}, status=503)
    flow = _gcal_flow()
    # State signé contenant l'ID utilisateur pour identifier au callback
    state = TimestampSigner().sign(str(request.user.id))
    auth_url, _ = flow.authorization_url(
        access_type='offline',     # nécessaire pour obtenir refresh_token
        include_granted_scopes='true',
        prompt='consent',          # force consent → refresh_token toujours fourni
        state=state,
    )
    return Response({'auth_url': auth_url})


@api_view(['GET'])
@permission_classes([AllowAny])
def google_calendar_callback(request):
    """Callback OAuth — échange le code contre des tokens, sauvegarde, redirige vers frontend."""
    from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
    from django.shortcuts import redirect
    from urllib.parse import urlencode

    code = request.query_params.get('code')
    state = request.query_params.get('state')
    err = request.query_params.get('error')

    def _redirect(status, msg=''):
        params = {'gcal': status}
        if msg: params['msg'] = msg
        return redirect(f"{settings.FRONTEND_URL}/compte?{urlencode(params)}")

    if err:
        return _redirect('error', err)
    if not code or not state:
        return _redirect('error', 'code_missing')

    try:
        user_id = TimestampSigner().unsign(state, max_age=600)
    except SignatureExpired:
        return _redirect('error', 'state_expired')
    except BadSignature:
        return _redirect('error', 'state_invalid')

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return _redirect('error', 'user_not_found')

    try:
        flow = _gcal_flow()
        flow.fetch_token(code=code)
        creds = flow.credentials
    except Exception as e:
        import logging, traceback
        logging.error(f"GCAL token exchange failed: {type(e).__name__}: {e}\n{traceback.format_exc()}")
        return _redirect('error', f'token_exchange:{type(e).__name__}:{str(e)[:120]}')

    from core.google_calendar import fetch_user_email
    email = fetch_user_email(creds)

    expires_at = creds.expiry
    if expires_at and expires_at.tzinfo is None:
        expires_at = timezone.make_aware(expires_at)

    GoogleCalendarToken.objects.update_or_create(
        user=user,
        defaults={
            'access_token':  creds.token,
            'refresh_token': creds.refresh_token or '',
            'token_uri':     creds.token_uri,
            'expires_at':    expires_at or timezone.now() + timedelta(hours=1),
            'google_email':  email,
            'calendar_id':   'primary',
            'sync_enabled':  True,
        },
    )
    return _redirect('connected')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def google_calendar_disconnect(request):
    token = GoogleCalendarToken.objects.filter(user=request.user).first()
    if not token:
        return Response({'status': 'not_connected'})
    # Tente de révoquer le token côté Google (best-effort)
    try:
        import requests as _req
        _req.post('https://oauth2.googleapis.com/revoke',
                  params={'token': token.refresh_token or token.access_token},
                  headers={'Content-Type': 'application/x-www-form-urlencoded'},
                  timeout=5)
    except Exception:
        pass
    token.delete()
    return Response({'status': 'disconnected'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def google_calendar_sync_all(request):
    """Push toutes les séances futures vers Google Calendar."""
    from core.google_calendar import push_seance
    token = GoogleCalendarToken.objects.filter(user=request.user).first()
    if not token:
        return Response({'error': 'Non connecté à Google Calendar.'}, status=400)

    seances = Seance.objects.filter(
        coach=request.user,
        date_heure__gte=timezone.now(),
        statut__in=['planifiee', 'realisee'],
    )
    pushed = 0
    for s in seances:
        event_id = push_seance(s)
        if event_id:
            if event_id != s.google_event_id:
                s.google_event_id = event_id
                s.save(update_fields=['google_event_id'])
            pushed += 1
    token.last_sync_at = timezone.now()
    token.save(update_fields=['last_sync_at'])
    return Response({'pushed': pushed, 'total': seances.count()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def portal_reserver_seance(request):
    try:
        client = Client.objects.get(user_account=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Profil client introuvable.'}, status=404)
    coach = client.coach
    profile = getattr(coach, 'coach_profile', None)
    if not profile or not profile.reservation_active:
        return Response({'error': 'La réservation n\'est pas activée pour ce coach.'}, status=400)

    dh_str = request.data.get('date_heure')
    if not dh_str:
        return Response({'error': 'date_heure requis.'}, status=400)
    try:
        dh = datetime.fromisoformat(dh_str.replace('Z', '+00:00'))
        if dh.tzinfo is None:
            dh = timezone.make_aware(dh)
    except ValueError:
        return Response({'error': 'Format date_heure invalide.'}, status=400)

    # Verrou pessimiste sur CoachProfile pour sérialiser les réservations concurrentes
    # sur le même coach (évite la race entre check dispo et création séance).
    from django.db import transaction
    with transaction.atomic():
        # Lock : seule UNE réservation à la fois passe pour ce coach
        CoachProfile.objects.select_for_update().filter(user=coach).first()

        # Re-vérification INSIDE le lock — utilise la détection d'overlap correcte
        slots = _compute_slots(coach, dh.date(), dh.date())
        if not any(s['date_heure'] == dh.isoformat() for s in slots):
            return Response({'error': 'Ce créneau n\'est plus disponible.'}, status=409)

        seance = Seance.objects.create(
            coach=coach, client=client, date_heure=dh,
            duree_minutes=profile.reservation_duree_min,
            type_seance='presentiel', statut='planifiee',
            titre='Séance réservée par le client',
        )

        Alerte.objects.create(
            coach=coach, client=client,
            type_alerte='nouvelle_reservation',
            titre=f"{client.prenom} a réservé une séance",
            description=f"Le {dh.strftime('%d/%m/%Y à %H:%M')} ({profile.reservation_duree_min} min)",
            priorite='moyenne',
        )

    # Push notification hors transaction (I/O externe, ne doit pas bloquer le lock)
    subs = PushSubscription.objects.filter(user=coach)
    for sub in subs:
        _send_push(sub, 'Nouvelle réservation',
                   f"{client.prenom} a réservé le {dh.strftime('%d/%m à %Hh%M')}",
                   '/planning')

    return Response({
        'id': str(seance.id),
        'date_heure': seance.date_heure.isoformat(),
        'duree_minutes': seance.duree_minutes,
    }, status=201)


# ─── GAMIFICATION ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portal_gamification(request):
    """Retourne streaks + résumé badges + badges récemment débloqués (non vus)."""
    try:
        client = Client.objects.get(user_account=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Profil client introuvable.'}, status=404)

    from core.gamification import compute_streaks
    streaks = compute_streaks(client)
    total_badges = Badge.objects.count()
    acquired = ClientBadge.objects.filter(client=client)
    acquired_count = acquired.count()

    # Badges non vus → on les renvoie pour déclencher un toast côté client
    nouveaux = list(acquired.filter(vu=False).select_related('badge'))
    new_badges_data = [{
        'slug': cb.badge.slug, 'nom': cb.badge.nom, 'icone': cb.badge.icone,
        'description': cb.badge.description,
    } for cb in nouveaux]
    # On marque comme vus
    if nouveaux:
        ClientBadge.objects.filter(id__in=[cb.id for cb in nouveaux]).update(vu=True)

    return Response({
        **streaks,
        'badges_acquis': acquired_count,
        'badges_total': total_badges,
        'nouveaux_badges': new_badges_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portal_badges(request):
    """Liste complète des badges avec acquis/progression pour le client connecté."""
    try:
        client = Client.objects.get(user_account=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Profil client introuvable.'}, status=404)
    from core.gamification import list_badges_with_progress, compute_streaks
    return Response({
        'badges': list_badges_with_progress(client),
        'streaks': compute_streaks(client),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_client_badges(request, client_id):
    """Vue coach : badges + streaks d'un client donné."""
    try:
        client = Client.objects.get(id=client_id, coach=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Client introuvable.'}, status=404)
    from core.gamification import list_badges_with_progress, compute_streaks
    return Response({
        'badges': list_badges_with_progress(client),
        'streaks': compute_streaks(client),
    })


# ─── FEEDBACK BETA ────────────────────────────────────────────────────────────

class FeedbackThrottle(AnonRateThrottle):
    """Limite simple anti-spam : max 10 feedbacks par heure par IP."""
    rate = '10/hour'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([FeedbackThrottle])
def submit_feedback(request):
    """Soumet un feedback (bug / suggestion / question). User auth optionnel."""
    d = request.data
    type_ = (d.get('type') or '').strip()
    title = (d.get('title') or '').strip()
    description = (d.get('description') or '').strip()

    if type_ not in ('bug', 'suggestion', 'question'):
        return Response({'error': 'Type invalide.'}, status=400)
    if not title or len(title) > 200:
        return Response({'error': 'Titre requis (max 200 caractères).'}, status=400)
    if not description or len(description) > 5000:
        return Response({'error': 'Description requise (max 5000 caractères).'}, status=400)

    severity = (d.get('severity') or '').strip()
    if type_ == 'bug':
        if severity not in ('low', 'medium', 'high'):
            severity = 'medium'
    else:
        severity = ''

    user = request.user if request.user.is_authenticated else None
    fb = Feedback.objects.create(
        user=user,
        user_email=(user.email if user else (d.get('user_email') or '')),
        user_role=(getattr(user, 'role', '') if user else ''),
        type=type_,
        severity=severity,
        title=title,
        description=description,
        url=(d.get('url') or '')[:500],
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:1000],
    )

    try:
        from .email_service import envoyer_feedback_admin
        envoyer_feedback_admin(fb)
    except Exception:
        pass

    return Response({'id': str(fb.id), 'status': 'ok'}, status=201)

"""Endpoints du panneau super-admin (rôle 'admin').

Tous protégés par IsAdminUser : seuls les comptes role='admin' y accèdent.
"""
from datetime import timedelta, date
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from core.models import User, CoachProfile, Client, Seance, Feedback, IACache


# ── PERMISSION ────────────────────────────────────────────────────────────────

class IsAdminUser(BasePermission):
    message = "Réservé aux super-admins."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == User.ROLE_ADMIN
        )


# ── HELPERS ───────────────────────────────────────────────────────────────────

def _coach_kpis(coach):
    """KPIs résumés pour un coach donné."""
    clients = coach.clients.all()
    actifs = clients.filter(statut='actif').count()
    seances_mois = coach.seances_coach.filter(
        date_heure__gte=timezone.now() - timedelta(days=30)
    ).count()
    mrr = sum(
        float(c.tarif or 0)
        for c in clients.filter(statut='actif', mode_facturation='mensuel')
    )
    profile = getattr(coach, 'coach_profile', None)
    return {
        'clients_total': clients.count(),
        'clients_actifs': actifs,
        'seances_30j': seances_mois,
        'mrr_mensuel': round(mrr, 2),
        'plan': profile.plan if profile else 'free',
        'ia_utilise': profile.ia_generations_count_mois if profile else 0,
        'ia_quota': profile.ia_quota_mensuel if profile else 0,
    }


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    """KPIs globaux plateforme."""
    now = timezone.now()
    j30 = now - timedelta(days=30)
    j7  = now - timedelta(days=7)

    coachs = User.objects.filter(role=User.ROLE_COACH)
    clients_all = Client.objects.all()

    # MRR agrégé (clients actifs en facturation mensuelle)
    mrr_total = sum(
        float(c.tarif or 0)
        for c in clients_all.filter(statut='actif', mode_facturation='mensuel')
    )

    # Signups récents
    signups_7j = coachs.filter(created_at__gte=j7).count()
    signups_30j = coachs.filter(created_at__gte=j30).count()

    # Activité
    seances_7j = Seance.objects.filter(date_heure__gte=j7).count()
    seances_30j = Seance.objects.filter(date_heure__gte=j30).count()

    # Feedbacks ouverts
    feedbacks_ouverts = Feedback.objects.filter(status='open').count()
    bugs_critiques = Feedback.objects.filter(
        type='bug', severity='high', status='open'
    ).count()

    # IA usage 30j
    ia_gens_30j = IACache.objects.filter(created_at__gte=j30).count()

    # Plans
    pros = CoachProfile.objects.filter(plan='pro').count()
    frees = CoachProfile.objects.filter(plan='free').count()

    # Coachs inactifs (pas de séance dans les 30 derniers jours)
    coachs_actifs_ids = Seance.objects.filter(
        date_heure__gte=j30
    ).values_list('coach_id', flat=True).distinct()
    coachs_inactifs = coachs.exclude(id__in=coachs_actifs_ids).count()

    return Response({
        'coachs': {
            'total': coachs.count(),
            'actifs': coachs.count() - coachs_inactifs,
            'inactifs': coachs_inactifs,
            'signups_7j': signups_7j,
            'signups_30j': signups_30j,
            'pros': pros,
            'frees': frees,
        },
        'clients': {
            'total': clients_all.count(),
            'actifs': clients_all.filter(statut='actif').count(),
        },
        'mrr': {
            'total': round(mrr_total, 2),
            'arr_estime': round(mrr_total * 12, 2),
        },
        'activite': {
            'seances_7j': seances_7j,
            'seances_30j': seances_30j,
            'ia_generations_30j': ia_gens_30j,
        },
        'support': {
            'feedbacks_ouverts': feedbacks_ouverts,
            'bugs_critiques_ouverts': bugs_critiques,
        },
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_coachs_list(request):
    """Liste tous les coachs avec leurs KPIs."""
    search = request.GET.get('search', '').strip()
    plan = request.GET.get('plan', '').strip()

    qs = User.objects.filter(role=User.ROLE_COACH).select_related('coach_profile')
    if search:
        qs = qs.filter(
            Q(email__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(username__icontains=search)
        )
    if plan in ('free', 'pro'):
        qs = qs.filter(coach_profile__plan=plan)

    qs = qs.order_by('-created_at')[:200]

    data = []
    for coach in qs:
        kpis = _coach_kpis(coach)
        data.append({
            'id': str(coach.id),
            'username': coach.username,
            'email': coach.email,
            'first_name': coach.first_name,
            'last_name': coach.last_name,
            'date_joined': coach.created_at,
            'last_login': coach.last_login,
            'is_active': coach.is_active,
            'email_verified': coach.email_verified,
            **kpis,
        })
    return Response(data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_coach_detail(request, coach_id):
    """Détail d'un coach + mise à jour plan/quota."""
    try:
        coach = User.objects.get(id=coach_id, role=User.ROLE_COACH)
    except User.DoesNotExist:
        return Response({'error': 'Coach introuvable.'}, status=404)

    profile, _ = CoachProfile.objects.get_or_create(user=coach)

    if request.method == 'PATCH':
        new_plan = request.data.get('plan')
        new_quota = request.data.get('ia_quota_mensuel')
        new_active = request.data.get('is_active')
        changed = []
        if new_plan in ('free', 'pro'):
            profile.plan = new_plan
            changed.append('plan')
        if new_quota is not None:
            try:
                q = int(new_quota)
                if q < 0 or q > 1000:
                    return Response({'error': 'Quota doit être entre 0 et 1000.'}, status=400)
                profile.ia_quota_mensuel = q
                changed.append('ia_quota_mensuel')
            except (TypeError, ValueError):
                return Response({'error': 'Quota invalide.'}, status=400)
        if changed:
            profile.save(update_fields=changed)
        if new_active is not None:
            coach.is_active = bool(new_active)
            coach.save(update_fields=['is_active'])

    kpis = _coach_kpis(coach)
    return Response({
        'id': str(coach.id),
        'username': coach.username,
        'email': coach.email,
        'first_name': coach.first_name,
        'last_name': coach.last_name,
        'date_joined': coach.created_at,
        'last_login': coach.last_login,
        'is_active': coach.is_active,
        'email_verified': coach.email_verified,
        'bio': profile.bio,
        'ville': profile.ville,
        'specialites': profile.specialites,
        'plan': profile.plan,
        'plan_expires_at': profile.plan_expires_at,
        'ia_quota_mensuel': profile.ia_quota_mensuel,
        'ia_generations_count_mois': profile.ia_generations_count_mois,
        **kpis,
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_impersonate(request, coach_id):
    """Délivre un token d'impersonation du coach cible.

    Le front substitue ce token au sien et stocke l'origine admin
    pour pouvoir revenir à son compte.
    """
    try:
        coach = User.objects.get(id=coach_id, role=User.ROLE_COACH)
    except User.DoesNotExist:
        return Response({'error': 'Coach introuvable.'}, status=404)
    if not coach.is_active:
        return Response({'error': 'Compte coach désactivé.'}, status=400)

    token, _ = Token.objects.get_or_create(user=coach)
    return Response({
        'impersonation_token': token.key,
        'coach_id': str(coach.id),
        'coach_email': coach.email,
        'coach_name': f"{coach.first_name} {coach.last_name}".strip() or coach.username,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_feedbacks_list(request):
    """Liste les feedbacks pour le panel admin."""
    qs = Feedback.objects.select_related('user').order_by('-created_at')
    f_type = request.GET.get('type')
    f_status = request.GET.get('status', 'open')
    if f_type in ('bug', 'suggestion', 'question'):
        qs = qs.filter(type=f_type)
    if f_status in ('open', 'in_progress', 'resolved', 'rejected'):
        qs = qs.filter(status=f_status)
    qs = qs[:200]

    data = []
    for f in qs:
        data.append({
            'id': str(f.id),
            'type': f.type,
            'severity': f.severity,
            'title': f.title,
            'description': f.description,
            'url': f.url,
            'status': f.status,
            'admin_notes': f.admin_notes,
            'created_at': f.created_at,
            'resolved_at': f.resolved_at,
            'user_email': f.user.email if f.user else f.user_email,
            'user_role': f.user_role,
        })
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_feedback_update(request, feedback_id):
    try:
        f = Feedback.objects.get(id=feedback_id)
    except Feedback.DoesNotExist:
        return Response({'error': 'Feedback introuvable.'}, status=404)

    new_status = request.data.get('status')
    notes = request.data.get('admin_notes')
    changed = []
    if new_status in ('open', 'in_progress', 'resolved', 'rejected'):
        f.status = new_status
        if new_status in ('resolved', 'rejected') and not f.resolved_at:
            f.resolved_at = timezone.now()
        if new_status in ('open', 'in_progress'):
            f.resolved_at = None
        changed += ['status', 'resolved_at']
    if notes is not None:
        f.admin_notes = notes
        changed.append('admin_notes')
    if changed:
        f.save(update_fields=changed)
    return Response({'status': 'ok'})

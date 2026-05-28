"""
Système de gamification : streaks (séries) + badges (succès).

- Streaks : calculés à la volée depuis les données existantes, pas de stockage.
- Badges : catalogue statique + table ClientBadge pour les acquis.
"""
from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from .models import (
    Seance, Mesure, PhotoProgression, Objectif, CheckinReponse,
    JournalAlimentaire, Badge, ClientBadge, AssignationProgramme,
)


# ─── CATALOGUE DES BADGES ─────────────────────────────────────────────────────

BADGES_CATALOG = [
    # Assiduité
    dict(slug='seance_1',   icone='🎯', categorie='assiduite', nom='Premier pas',           description='Première séance réalisée',          condition={'type':'seances','seuil':1},   ordre=1),
    dict(slug='seance_10',  icone='💪', categorie='assiduite', nom='10 séances',            description='10 séances réalisées',              condition={'type':'seances','seuil':10},  ordre=2),
    dict(slug='seance_25',  icone='🏋️', categorie='assiduite', nom='25 séances',            description='25 séances réalisées',              condition={'type':'seances','seuil':25},  ordre=3),
    dict(slug='seance_50',  icone='🥇', categorie='assiduite', nom='50 séances',            description='50 séances réalisées — bravo !',    condition={'type':'seances','seuil':50},  ordre=4),
    dict(slug='seance_100', icone='👑', categorie='assiduite', nom='Centenaire',            description='100 séances réalisées',             condition={'type':'seances','seuil':100}, ordre=5),
    # Régularité
    dict(slug='reg_4sem',   icone='🔥', categorie='regularite', nom='Régulier 4 semaines',  description='≥ 1 séance par semaine pendant 4 semaines',  condition={'type':'semaines_consecutives','seuil':4},  ordre=1),
    dict(slug='reg_8sem',   icone='🔥', categorie='regularite', nom='Régulier 8 semaines',  description='≥ 1 séance par semaine pendant 8 semaines',  condition={'type':'semaines_consecutives','seuil':8},  ordre=2),
    dict(slug='reg_12sem',  icone='🌟', categorie='regularite', nom='Régulier 12 semaines', description='≥ 1 séance par semaine pendant 12 semaines', condition={'type':'semaines_consecutives','seuil':12}, ordre=3),
    # Suivi
    dict(slug='mes_1',      icone='📏', categorie='suivi', nom='Première mesure',           description='Première mesure enregistrée',       condition={'type':'mesures','seuil':1},   ordre=1),
    dict(slug='mes_10',     icone='📊', categorie='suivi', nom='10 mesures',                description='10 mesures enregistrées',           condition={'type':'mesures','seuil':10},  ordre=2),
    dict(slug='photo_1',    icone='📸', categorie='suivi', nom='Première photo',            description='Première photo de progression',     condition={'type':'photos','seuil':1},    ordre=3),
    # Nutrition
    dict(slug='nut_7j',     icone='🥗', categorie='nutrition', nom='Semaine équilibrée',    description='7 jours de journal nutrition',      condition={'type':'jours_nutrition','seuil':7},  ordre=1),
    dict(slug='nut_30j',    icone='🍎', categorie='nutrition', nom='Mois équilibré',        description='30 jours de journal nutrition',     condition={'type':'jours_nutrition','seuil':30}, ordre=2),
    # Objectifs
    dict(slug='obj_1',      icone='🎯', categorie='objectifs', nom='Premier objectif',      description='Premier objectif atteint',          condition={'type':'objectifs','seuil':1}, ordre=1),
    dict(slug='obj_5',      icone='🏆', categorie='objectifs', nom='Performeur',            description='5 objectifs atteints',              condition={'type':'objectifs','seuil':5}, ordre=2),
    # Spéciaux
    dict(slug='early_bird', icone='🌅', categorie='special', nom='Lève-tôt',                description='Séance avant 7h du matin',          condition={'type':'early_bird'},  ordre=1),
    dict(slug='phenix',     icone='🔄', categorie='special', nom='Phénix',                  description='Retour à l\'entraînement après pause', condition={'type':'phenix'},    ordre=2),
]


def seed_badges():
    """Insère ou met à jour le catalogue de badges. Idempotent."""
    for data in BADGES_CATALOG:
        Badge.objects.update_or_create(slug=data['slug'], defaults=data)
    return Badge.objects.count()


# ─── STREAKS ──────────────────────────────────────────────────────────────────

def compute_streaks(client):
    """
    Retourne :
    - streak_seances : nb de séances réalisées consécutives (cassé par une absence)
    - streak_actif   : nb de jours consécutifs avec ≥ 1 activité (séance OK, check-in, log nut)
    - best_streak_actif : meilleur streak actif jamais atteint
    """
    # Streak séances : on parcourt les séances passées du plus récent au plus ancien,
    # on compte les 'realisee' jusqu'à tomber sur autre chose (absence/annulée).
    seances_passees = Seance.objects.filter(
        client=client, date_heure__lte=timezone.now(),
    ).exclude(statut='planifiee').order_by('-date_heure')
    streak_seances = 0
    for s in seances_passees:
        if s.statut == 'realisee':
            streak_seances += 1
        else:
            break

    # Jours actifs : dates uniques où le client a fait au moins une action
    jours_actifs = set()
    for s in Seance.objects.filter(client=client, statut='realisee').values_list('date_heure', flat=True):
        jours_actifs.add(s.date())
    for c in CheckinReponse.objects.filter(client=client).values_list('semaine', flat=True):
        jours_actifs.add(c)
    for j in JournalAlimentaire.objects.filter(client=client).values_list('date', flat=True):
        jours_actifs.add(j)

    if not jours_actifs:
        return {'streak_seances': streak_seances, 'streak_actif': 0, 'best_streak_actif': 0}

    sorted_days = sorted(jours_actifs)

    # Best streak
    best, cur = 1, 1
    for i in range(1, len(sorted_days)):
        if (sorted_days[i] - sorted_days[i-1]).days == 1:
            cur += 1; best = max(best, cur)
        else:
            cur = 1

    # Current streak (depuis aujourd'hui à rebours)
    today = date.today()
    if sorted_days[-1] < today - timedelta(days=1):
        current = 0
    else:
        current = 1
        d = sorted_days[-1]
        for i in range(len(sorted_days) - 2, -1, -1):
            if (d - sorted_days[i]).days == 1:
                current += 1; d = sorted_days[i]
            else:
                break

    return {'streak_seances': streak_seances, 'streak_actif': current, 'best_streak_actif': best}


# ─── ÉVALUATION DES BADGES ────────────────────────────────────────────────────

def _check_condition(client, cond):
    """Retourne (acquis: bool, progression: float entre 0 et 1)."""
    t = cond.get('type')
    seuil = cond.get('seuil', 1)

    if t == 'seances':
        n = Seance.objects.filter(client=client, statut='realisee').count()
        return (n >= seuil, min(1.0, n / seuil))

    if t == 'mesures':
        n = Mesure.objects.filter(client=client).count()
        return (n >= seuil, min(1.0, n / seuil))

    if t == 'photos':
        n = PhotoProgression.objects.filter(client=client).count()
        return (n >= seuil, min(1.0, n / seuil))

    if t == 'objectifs':
        # Objectif "atteint" = valeur_actuelle >= valeur_cible
        n = 0
        for o in Objectif.objects.filter(client=client, valeur_cible__isnull=False):
            try:
                if o.valeur_actuelle and float(o.valeur_actuelle) >= float(o.valeur_cible):
                    n += 1
            except (TypeError, ValueError):
                pass
        return (n >= seuil, min(1.0, n / seuil))

    if t == 'jours_nutrition':
        n = JournalAlimentaire.objects.filter(client=client).values('date').distinct().count()
        return (n >= seuil, min(1.0, n / seuil))

    if t == 'semaines_consecutives':
        # Compte les semaines ISO consécutives avec ≥ 1 séance réalisée
        seances = Seance.objects.filter(client=client, statut='realisee').order_by('date_heure')
        if not seances.exists():
            return (False, 0.0)
        semaines = sorted(set((s.date_heure.isocalendar().year, s.date_heure.isocalendar().week) for s in seances))
        # Parcours pour trouver le plus long enchaînement
        best, cur = 1, 1
        for i in range(1, len(semaines)):
            y_prev, w_prev = semaines[i-1]
            y_cur, w_cur = semaines[i]
            # consécutif si même année et w_cur = w_prev+1, ou changement d'année avec semaine 1 après semaine ≥52
            consecutif = (y_cur == y_prev and w_cur == w_prev + 1) or (y_cur == y_prev + 1 and w_prev >= 52 and w_cur == 1)
            if consecutif:
                cur += 1; best = max(best, cur)
            else:
                cur = 1
        return (best >= seuil, min(1.0, best / seuil))

    if t == 'early_bird':
        ok = Seance.objects.filter(client=client, statut='realisee', date_heure__hour__lt=7).exists()
        return (ok, 1.0 if ok else 0.0)

    if t == 'phenix':
        # Au moins une séance après ≥30 jours sans séance
        seances = list(Seance.objects.filter(client=client, statut='realisee').order_by('date_heure').values_list('date_heure', flat=True))
        for i in range(1, len(seances)):
            if (seances[i] - seances[i-1]).days >= 30:
                return (True, 1.0)
        return (False, 0.0)

    return (False, 0.0)


def evaluate_badges(client):
    """
    Vérifie tous les badges du catalogue pour ce client.
    Crée les ClientBadge manquants. Retourne la liste des badges nouvellement débloqués.
    """
    deja_acquis = set(ClientBadge.objects.filter(client=client).values_list('badge__slug', flat=True))
    nouveaux = []
    for badge in Badge.objects.all():
        if badge.slug in deja_acquis:
            continue
        acquis, _ = _check_condition(client, badge.condition)
        if acquis:
            ClientBadge.objects.create(client=client, badge=badge)
            nouveaux.append(badge)
    return nouveaux


def list_badges_with_progress(client):
    """Retourne tous les badges avec leur statut acquis/progression pour ce client."""
    acquis_map = {cb.badge_id: cb for cb in ClientBadge.objects.filter(client=client).select_related('badge')}
    out = []
    for badge in Badge.objects.all():
        cb = acquis_map.get(badge.id)
        if cb:
            out.append({
                'slug': badge.slug, 'nom': badge.nom, 'description': badge.description,
                'icone': badge.icone, 'categorie': badge.categorie,
                'acquis': True, 'progression': 1.0,
                'obtenu_le': cb.obtenu_le.isoformat(),
            })
        else:
            _, prog = _check_condition(client, badge.condition)
            out.append({
                'slug': badge.slug, 'nom': badge.nom, 'description': badge.description,
                'icone': badge.icone, 'categorie': badge.categorie,
                'acquis': False, 'progression': round(prog, 2), 'obtenu_le': None,
            })
    return out

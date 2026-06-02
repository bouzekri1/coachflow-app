"""Export & suppression RGPD (droit à la portabilité + droit à l'effacement)."""
import io
import json
import zipfile
from datetime import datetime, timezone as dt_tz
from django.core.serializers.json import DjangoJSONEncoder


def _serialize(qs, fields):
    rows = []
    for obj in qs:
        row = {}
        allowed = {fld.name for fld in obj._meta.fields}
        for f in fields:
            row[f] = getattr(obj, f, None) if f in allowed else None
        rows.append(row)
    return rows


def build_user_export(user) -> bytes:
    """Construit un ZIP avec toutes les données du user en JSON."""
    from .models import (
        Client, Mesure, Seance, Objectif, PlanAlimentaire,
        Programme, Facture, Recette,
        Message, ConsommationEau, CheckinReponse,
        ClientBadge, Feedback, DisponibiliteCoach,
    )

    out = {
        '_export': {
            'generated_at': datetime.now(dt_tz.utc).isoformat(),
            'app': 'CoachFlow',
            'rgpd_article': 'Article 20 RGPD — Droit à la portabilité',
        },
        'profil': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'role': user.role,
            'email_verified': user.email_verified,
            'created_at': user.created_at,
        },
    }

    if user.role == 'coach':
        profile = getattr(user, 'coach_profile', None)
        if profile:
            out['profil']['coach'] = {
                'bio': profile.bio,
                'specialites': profile.specialites,
                'certifications': profile.certifications,
                'ville': profile.ville,
                'siret': profile.siret,
                'plan': profile.plan,
            }
        out['clients']     = _serialize(Client.objects.filter(coach=user),
            ['id','prenom','nom','email','phone','date_naissance','genre','statut',
             'date_debut','taille_cm','poids_depart_kg','poids_cible_kg','niveau',
             'objectifs','blessures','contraintes_medicales','alimentation','tarif_mensuel','created_at'])
        out['seances']     = _serialize(Seance.objects.filter(client__coach=user),
            ['id','date_heure','duree_minutes','type_seance','statut','notes','created_at'])
        out['programmes']  = _serialize(Programme.objects.filter(coach=user),
            ['id','nom','description','categorie','duree_semaines','seances_par_semaine','conseils','created_at'])
        out['plans']       = _serialize(PlanAlimentaire.objects.filter(coach=user),
            ['id','nom','description','objectif_calories','objectif_proteines_g','objectif_glucides_g','objectif_lipides_g','created_at'])
        out['factures']    = _serialize(Facture.objects.filter(coach=user),
            ['id','numero','montant_ttc','montant_ht','statut','date_emission','date_echeance','date_paiement'])
        out['recettes']    = _serialize(Recette.objects.filter(coach=user),
            ['id','nom','description','temps_preparation_min','difficulte','portions','tags','created_at'])
        out['disponibilites'] = _serialize(DisponibiliteCoach.objects.filter(coach=user),
            ['id','jour_semaine','heure_debut','heure_fin','active'])
    else:
        client = getattr(user, 'client_profile', None)
        if client:
            out['profil']['client'] = {
                'date_naissance': client.date_naissance,
                'taille_cm': client.taille_cm,
                'objectifs': client.objectifs,
                'alimentation': client.alimentation,
            }
            out['mesures']    = _serialize(Mesure.objects.filter(client=client),
                ['id','date','poids_kg','masse_grasse_pct','tour_taille_cm','tour_hanches_cm','tour_cuisse_cm','note'])
            out['seances']    = _serialize(Seance.objects.filter(client=client),
                ['id','date_heure','duree_minutes','statut','notes'])
            out['objectifs']  = _serialize(Objectif.objects.filter(client=client),
                ['id','titre','description','valeur_cible','valeur_actuelle','unite','statut','date_echeance','date_atteint','created_at'])
            out['eau']        = _serialize(ConsommationEau.objects.filter(client=client),
                ['id','date','quantite_ml'])
            out['checkins']   = _serialize(CheckinReponse.objects.filter(client=client),
                ['id','semaine','humeur','energie','sommeil','motivation','stress','hydratation','poids_kg','commentaire'])
            out['badges']     = _serialize(ClientBadge.objects.filter(client=client),
                ['badge_id','obtenu_le'])

    if user.role == 'coach':
        msgs_qs = Message.objects.filter(conversation__coach=user)
    else:
        client_profile = getattr(user, 'client_profile', None)
        msgs_qs = Message.objects.filter(conversation__client=client_profile) if client_profile else Message.objects.none()
    out['messages']  = _serialize(msgs_qs,
        ['id','contenu','expediteur_role','lu','created_at'])
    out['feedbacks'] = _serialize(Feedback.objects.filter(user=user),
        ['id','type','severity','title','description','created_at','status'])

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            'coachflow_export.json',
            json.dumps(out, indent=2, ensure_ascii=False, cls=DjangoJSONEncoder),
        )
        zf.writestr(
            'README.txt',
            "Export CoachFlow — Article 20 RGPD\n"
            f"Généré le : {datetime.now(dt_tz.utc).isoformat()}\n"
            f"Compte : {user.email}\n\n"
            "Le fichier coachflow_export.json contient l'intégralité des données associées\n"
            "à votre compte au format JSON structuré et lisible par machine.\n\n"
            "Pour toute question : support@coachflow.fr\n",
        )
    return buf.getvalue()


def soft_delete_user(user):
    """Marque le compte comme supprimé (purge effective sous 30 jours)."""
    from django.utils import timezone
    from rest_framework.authtoken.models import Token
    user.deleted_at = timezone.now()
    user.is_active = False
    user.save(update_fields=['deleted_at', 'is_active'])
    Token.objects.filter(user=user).delete()

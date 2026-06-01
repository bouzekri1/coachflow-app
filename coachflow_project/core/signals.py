from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import (
    Objectif, Alerte, Seance, User, Mesure, PhotoProgression,
    CheckinReponse, JournalAlimentaire, IngredientRecette, Recette,
)


@receiver(post_save, sender=Objectif)
def objectif_atteint_signal(sender, instance, **kwargs):
    if not instance.valeur_cible or instance.valeur_actuelle is None:
        return
    try:
        if float(instance.valeur_actuelle) >= float(instance.valeur_cible):
            exists = Alerte.objects.filter(
                coach=instance.client.coach,
                client=instance.client,
                type_alerte='objectif_atteint',
                traitee=False,
                titre__contains=instance.titre,
            ).exists()
            if not exists:
                Alerte.objects.create(
                    coach=instance.client.coach,
                    client=instance.client,
                    type_alerte='objectif_atteint',
                    titre=f'Objectif atteint : {instance.titre}',
                    description=(
                        f'{instance.client.prenom} a atteint son objectif "{instance.titre}"'
                        + (f' ({instance.valeur_actuelle} {instance.unite})' if instance.unite else '') + '.'
                    ),
                    priorite='basse',
                )
    except (TypeError, ValueError):
        pass


@receiver(post_save, sender=Seance)
def seance_confirmation_signal(sender, instance, created, **kwargs):
    if not created or instance.statut != 'planifiee':
        return
    if not instance.client.email:
        return
    try:
        from api.email_service import envoyer_confirmation_seance
        envoyer_confirmation_seance(instance)
    except Exception:
        pass


@receiver(post_save, sender=User)
def nouveau_coach_recettes_signal(sender, instance, created, **kwargs):
    """S'assure que les recettes globales de base existent à chaque création de coach."""
    if not created or instance.role != 'coach':
        return
    try:
        from core.base_data import create_base_recettes_global
        create_base_recettes_global()
    except Exception:
        pass


@receiver(post_save, sender=Seance)
def seance_gcal_sync_signal(sender, instance, created, **kwargs):
    """Crée ou met à jour l'événement Google Calendar correspondant."""
    if instance.statut in ('annulee', 'absence'):
        # On retire l'event Google si la séance est annulée
        if instance.google_event_id:
            try:
                from core.google_calendar import delete_seance
                delete_seance(instance.coach, instance.google_event_id)
                Seance.objects.filter(pk=instance.pk).update(google_event_id='')
            except Exception:
                pass
        return
    try:
        from core.google_calendar import push_seance
        event_id = push_seance(instance)
        if event_id and event_id != instance.google_event_id:
            Seance.objects.filter(pk=instance.pk).update(google_event_id=event_id)
    except Exception:
        pass


@receiver(post_delete, sender=Seance)
def seance_gcal_delete_signal(sender, instance, **kwargs):
    if not instance.google_event_id:
        return
    try:
        from core.google_calendar import delete_seance
        delete_seance(instance.coach, instance.google_event_id)
    except Exception:
        pass


# ─── GAMIFICATION : éval badges après chaque action client ────────────────────

def _eval_badges_for_client(client):
    try:
        from core.gamification import evaluate_badges
        evaluate_badges(client)
    except Exception:
        pass


@receiver(post_save, sender=Seance)
def seance_eval_badges(sender, instance, **kwargs):
    if instance.statut == 'realisee':
        _eval_badges_for_client(instance.client)


@receiver(post_save, sender=Mesure)
def mesure_eval_badges(sender, instance, **kwargs):
    _eval_badges_for_client(instance.client)


@receiver(post_save, sender=PhotoProgression)
def photo_eval_badges(sender, instance, **kwargs):
    _eval_badges_for_client(instance.client)


@receiver(post_save, sender=Objectif)
def objectif_eval_badges(sender, instance, **kwargs):
    _eval_badges_for_client(instance.client)


@receiver(post_save, sender=CheckinReponse)
def checkin_eval_badges(sender, instance, **kwargs):
    _eval_badges_for_client(instance.client)


@receiver(post_save, sender=JournalAlimentaire)
def journal_eval_badges(sender, instance, **kwargs):
    _eval_badges_for_client(instance.client)


# ─── AUTO-TAGGING DES RECETTES ────────────────────────────────────────────────

def _retag_recipe(recette):
    try:
        from core.recipe_tags import compute_tags_for_recipe
        new_tags = compute_tags_for_recipe(recette)
        if set(new_tags) != set(recette.tags or []):
            Recette.objects.filter(pk=recette.pk).update(tags=new_tags)
    except Exception:
        pass


@receiver(post_save, sender=IngredientRecette)
def ingredient_retag(sender, instance, **kwargs):
    _retag_recipe(instance.recette)


@receiver(post_delete, sender=IngredientRecette)
def ingredient_retag_on_delete(sender, instance, **kwargs):
    try:
        _retag_recipe(instance.recette)
    except Recette.DoesNotExist:
        pass

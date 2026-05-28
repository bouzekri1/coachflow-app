from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Objectif, Alerte, Seance, User


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

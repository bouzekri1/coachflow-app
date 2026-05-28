from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import Seance


class Command(BaseCommand):
    help = 'Envoie les emails de rappel pour les séances dans les prochaines 24h'

    def handle(self, *args, **options):
        now = timezone.now()
        window_start = now + timedelta(hours=20)
        window_end   = now + timedelta(hours=28)

        seances = Seance.objects.filter(
            statut='planifiee',
            date_heure__gte=window_start,
            date_heure__lte=window_end,
            rappel_envoye=False,
        ).select_related('client', 'coach')

        sent = 0
        for seance in seances:
            if not seance.client.email:
                continue
            try:
                from api.email_service import envoyer_rappel_seance
                envoyer_rappel_seance(seance)
                seance.rappel_envoye = True
                seance.save(update_fields=['rappel_envoye'])
                sent += 1
                self.stdout.write(f'  Rappel envoyé → {seance.client.email} ({seance.date_heure})')
            except Exception as e:
                self.stderr.write(f'  Erreur pour séance {seance.id}: {e}')

        self.stdout.write(self.style.SUCCESS(f'{sent} rappel(s) envoyé(s).'))

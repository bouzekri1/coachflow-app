"""Purge définitive des comptes soft-deleted depuis plus de 30 jours."""
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import User


class Command(BaseCommand):
    help = "Supprime définitivement les comptes marqués deleted_at depuis > 30 jours (RGPD)."

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help="Délai de grâce en jours (défaut: 30)")
        parser.add_argument('--dry-run', action='store_true', help="Ne supprime rien, affiche seulement")

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(days=opts['days'])
        qs = User.objects.filter(deleted_at__isnull=False, deleted_at__lt=cutoff)
        n = qs.count()
        if n == 0:
            self.stdout.write(self.style.SUCCESS("Aucun compte à purger."))
            return
        for u in qs:
            self.stdout.write(f"  {'(dry-run) ' if opts['dry_run'] else ''}{u.username} ({u.email}) — supprimé le {u.deleted_at:%Y-%m-%d}")
        if not opts['dry_run']:
            qs.delete()
            self.stdout.write(self.style.SUCCESS(f"{n} compte(s) purgé(s)."))
        else:
            self.stdout.write(self.style.WARNING(f"{n} compte(s) seraient purgés (dry-run)."))

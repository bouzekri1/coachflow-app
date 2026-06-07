from django.core.management.base import BaseCommand, CommandError
from core.models import User


class Command(BaseCommand):
    help = "Promeut un utilisateur existant au rôle 'admin' (super-admin plateforme). Usage : python manage.py make_admin <email>"

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help="Email de l'utilisateur à promouvoir")
        parser.add_argument('--demote', action='store_true', help="Au lieu de promouvoir, repasse l'utilisateur en coach")
        parser.add_argument('--username', type=str, default=None, help="Désambigue par username si plusieurs comptes partagent l'email")

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        demote = options['demote']
        username = options['username']

        qs = User.objects.filter(email__iexact=email)
        if username:
            qs = qs.filter(username=username)

        count = qs.count()
        if count == 0:
            raise CommandError(f"Aucun utilisateur trouvé avec l'email '{email}'{' et username ' + username if username else ''}")
        if count > 1:
            # Préférer le coach par défaut (le bon compte 99% du temps)
            coach_qs = qs.filter(role=User.ROLE_COACH)
            if coach_qs.count() == 1:
                user = coach_qs.first()
                self.stdout.write(self.style.WARNING(
                    f"⚠ {count} comptes partagent cet email. Sélection automatique du compte 'coach' : @{user.username}"
                ))
            else:
                self.stdout.write(self.style.ERROR(f"⚠ {count} comptes partagent cet email :"))
                for u in qs:
                    self.stdout.write(f"    • @{u.username} (rôle={u.role}, id={u.id}, actif={u.is_active})")
                raise CommandError("Relance avec --username <choix> pour désambiguer.")
        else:
            user = qs.first()

        if demote:
            if user.role != User.ROLE_ADMIN:
                self.stdout.write(self.style.WARNING(f"{user.email} n'est pas admin (rôle actuel : {user.role}). Rien à faire."))
                return
            user.role = User.ROLE_COACH
            user.is_staff = False
            user.is_superuser = False
            user.save(update_fields=['role', 'is_staff', 'is_superuser'])
            self.stdout.write(self.style.SUCCESS(f"✓ {user.email} repassé en coach."))
            return

        if user.role == User.ROLE_ADMIN:
            self.stdout.write(self.style.WARNING(f"{user.email} est déjà admin."))
            return

        user.role = User.ROLE_ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.email_verified = True
        user.save(update_fields=['role', 'is_staff', 'is_superuser', 'is_active', 'email_verified'])
        self.stdout.write(self.style.SUCCESS(f"✓ {user.email} promu admin (is_staff + is_superuser activés)."))

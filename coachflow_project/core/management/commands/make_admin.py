from django.core.management.base import BaseCommand, CommandError
from core.models import User


class Command(BaseCommand):
    help = "Promeut un utilisateur existant au rôle 'admin' (super-admin plateforme). Usage : python manage.py make_admin <email>"

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help="Email de l'utilisateur à promouvoir")
        parser.add_argument('--demote', action='store_true', help="Au lieu de promouvoir, repasse l'utilisateur en coach")

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        demote = options['demote']

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(f"Aucun utilisateur trouvé avec l'email '{email}'")

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

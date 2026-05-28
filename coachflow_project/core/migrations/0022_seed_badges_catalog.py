from django.db import migrations


def seed_badges(apps, schema_editor):
    from core.gamification import seed_badges as _seed
    _seed()


def remove_badges(apps, schema_editor):
    Badge = apps.get_model('core', 'Badge')
    Badge.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_badge_clientbadge'),
    ]

    operations = [
        migrations.RunPython(seed_badges, remove_badges),
    ]

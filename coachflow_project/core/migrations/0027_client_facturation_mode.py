from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_user_deleted_at'),
    ]

    operations = [
        migrations.RenameField(
            model_name='client',
            old_name='tarif_mensuel',
            new_name='tarif',
        ),
        migrations.AddField(
            model_name='client',
            name='mode_facturation',
            field=models.CharField(
                choices=[('mensuel', 'Forfait mensuel'), ('seance', 'Par séance')],
                default='mensuel',
                max_length=10,
            ),
        ),
    ]

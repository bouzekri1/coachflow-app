from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0029_aliment_source_aliment_source_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('admin', 'Admin'), ('coach', 'Coach'), ('client', 'Client')],
                default='coach',
                max_length=10,
            ),
        ),
    ]

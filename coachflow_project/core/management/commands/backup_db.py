"""
Sauvegarde la base de données + les fichiers media.
Supporte SQLite et PostgreSQL.
Rotation automatique : garde BACKUP_KEEP_DB backups DB et BACKUP_KEEP_MEDIA backups media.
Envoie un email d'alerte en cas d'échec si BACKUP_ALERT_EMAIL est configuré.

Usage :
    python manage.py backup_db
    python manage.py backup_db --no-media
    python manage.py backup_db --list
"""

import gzip
import logging
import os
import shutil
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sauvegarde la base de données et les fichiers media'

    def add_arguments(self, parser):
        parser.add_argument('--no-media', action='store_true', help='Ignorer les fichiers media')
        parser.add_argument('--list', action='store_true', help='Lister les backups existants')

    def handle(self, *args, **options):
        backup_dir = Path(getattr(settings, 'BACKUP_DIR', settings.BASE_DIR / 'backups'))
        backup_dir.mkdir(parents=True, exist_ok=True)

        if options['list']:
            self._list(backup_dir)
            return

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        errors = []

        self.stdout.write(f'\n── Backup CoachFlow {timestamp} ──')

        # ── 1. Base de données ──────────────────────────────────────────────
        db_cfg    = settings.DATABASES['default']
        db_engine = db_cfg['ENGINE']

        if 'sqlite3' in db_engine:
            err = self._backup_sqlite(db_cfg, backup_dir, timestamp)
        elif 'postgresql' in db_engine or 'postgis' in db_engine:
            err = self._backup_postgres(db_cfg, backup_dir, timestamp)
        else:
            err = f'Moteur non supporté : {db_engine}'

        if err:
            errors.append(err)

        # ── 2. Fichiers media ───────────────────────────────────────────────
        if not options['no_media']:
            err = self._backup_media(backup_dir, timestamp)
            if err:
                errors.append(err)

        # ── 3. Rotation ────────────────────────────────────────────────────
        self._rotate(backup_dir)

        # ── 4. Résultat ────────────────────────────────────────────────────
        if errors:
            msg = 'Backup ÉCHOUÉ :\n' + '\n'.join(f'  • {e}' for e in errors)
            self.stderr.write(self.style.ERROR(msg))
            logger.error(msg)
            self._alert(errors, timestamp)
            raise SystemExit(1)
        else:
            self.stdout.write(self.style.SUCCESS('✓ Backup terminé avec succès.\n'))

    # ── SQLite ──────────────────────────────────────────────────────────────
    def _backup_sqlite(self, db_cfg, backup_dir, timestamp):
        src_path = Path(db_cfg['NAME'])
        if not src_path.exists():
            return f'Fichier SQLite introuvable : {src_path}'
        out = backup_dir / f'db_{timestamp}.sqlite3.gz'
        try:
            tmp = backup_dir / f'db_{timestamp}.sqlite3'
            src = sqlite3.connect(str(src_path))
            dst = sqlite3.connect(str(tmp))
            src.backup(dst)    # copie atomique, gère le WAL
            src.close()
            dst.close()
            with open(tmp, 'rb') as f_in, gzip.open(out, 'wb', compresslevel=6) as f_out:
                shutil.copyfileobj(f_in, f_out)
            tmp.unlink()
            size = _human_size(out.stat().st_size)
            self.stdout.write(f'  DB SQLite → {out.name} ({size})')
            return None
        except Exception as e:
            return f'SQLite backup : {e}'

    # ── PostgreSQL ──────────────────────────────────────────────────────────
    def _backup_postgres(self, db_cfg, backup_dir, timestamp):
        out = backup_dir / f'db_{timestamp}.pgdump.gz'
        env = os.environ.copy()
        if db_cfg.get('PASSWORD'):
            env['PGPASSWORD'] = db_cfg['PASSWORD']
        cmd = [
            'pg_dump',
            '--no-owner',
            '--no-acl',
            '-Fc',             # custom format, compressé nativement
            '-h', db_cfg.get('HOST', 'localhost'),
            '-p', str(db_cfg.get('PORT', 5432)),
            '-U', db_cfg.get('USER', 'postgres'),
            db_cfg['NAME'],
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, env=env, timeout=300)
            if result.returncode != 0:
                return f'pg_dump : {result.stderr.decode()[:300]}'
            with gzip.open(out, 'wb', compresslevel=6) as f:
                f.write(result.stdout)
            size = _human_size(out.stat().st_size)
            self.stdout.write(f'  DB PostgreSQL → {out.name} ({size})')
            return None
        except FileNotFoundError:
            return 'pg_dump introuvable. Installez postgresql-client.'
        except subprocess.TimeoutExpired:
            return 'pg_dump timeout (>5 min).'
        except Exception as e:
            return f'PostgreSQL backup : {e}'

    # ── Media ───────────────────────────────────────────────────────────────
    def _backup_media(self, backup_dir, timestamp):
        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists() or not any(media_root.iterdir()):
            self.stdout.write('  Media : répertoire vide, ignoré.')
            return None
        out_base = backup_dir / f'media_{timestamp}'
        try:
            archive = shutil.make_archive(
                str(out_base), 'gztar',
                root_dir=str(media_root.parent),
                base_dir=media_root.name,
            )
            size = _human_size(Path(archive).stat().st_size)
            self.stdout.write(f'  Media → {Path(archive).name} ({size})')
            return None
        except Exception as e:
            return f'Media backup : {e}'

    # ── Rotation ────────────────────────────────────────────────────────────
    def _rotate(self, backup_dir):
        keep_db    = getattr(settings, 'BACKUP_KEEP_DB', 14)
        keep_media = getattr(settings, 'BACKUP_KEEP_MEDIA', 7)

        for pattern, keep, label in [
            ('db_*.gz',        keep_db,    'DB'),
            ('db_*.pgdump.gz', keep_db,    'DB'),
            ('media_*.tar.gz', keep_media, 'media'),
        ]:
            files = sorted(backup_dir.glob(pattern), key=lambda f: f.stat().st_mtime, reverse=True)
            for old in files[keep:]:
                old.unlink()
                self.stdout.write(f'  Rotation : supprimé {old.name}')

    # ── Liste ────────────────────────────────────────────────────────────────
    def _list(self, backup_dir):
        files = sorted(backup_dir.iterdir(), key=lambda f: f.stat().st_mtime, reverse=True)
        if not files:
            self.stdout.write('Aucun backup trouvé.')
            return
        self.stdout.write(f'\n{"Fichier":<45} {"Taille":>10}  Date')
        self.stdout.write('─' * 70)
        for f in files:
            st = f.stat()
            date = datetime.fromtimestamp(st.st_mtime).strftime('%d/%m/%Y %H:%M')
            self.stdout.write(f'{f.name:<45} {_human_size(st.st_size):>10}  {date}')

    # ── Alerte email ────────────────────────────────────────────────────────
    def _alert(self, errors, timestamp):
        alert_email = getattr(settings, 'BACKUP_ALERT_EMAIL', '')
        if not alert_email:
            return
        try:
            from django.core.mail import send_mail
            body = (
                f'Le backup CoachFlow du {timestamp} a échoué :\n\n'
                + '\n'.join(f'• {e}' for e in errors)
                + '\n\nVérifiez les logs du serveur.'
            )
            send_mail(
                subject=f'[CoachFlow] Échec backup {timestamp}',
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[alert_email],
                fail_silently=True,
            )
        except Exception as e:
            logger.error(f'Impossible d\'envoyer l\'alerte backup : {e}')


def _human_size(n):
    for unit in ('o', 'Ko', 'Mo', 'Go'):
        if n < 1024:
            return f'{n:.0f} {unit}'
        n /= 1024
    return f'{n:.1f} To'

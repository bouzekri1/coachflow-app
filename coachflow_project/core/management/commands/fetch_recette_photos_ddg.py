"""
python manage.py fetch_recette_photos_ddg
python manage.py fetch_recette_photos_ddg --overwrite   # remplace toutes les photos
python manage.py fetch_recette_photos_ddg --limit 10    # traite N recettes seulement

Recherche des vraies photos food via DuckDuckGo Images (aucune clé API requise)
et les sauvegarde dans le champ photo de chaque Recette.
"""
import time
import unicodedata
import requests
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import Recette

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (X11; Linux x86_64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0 Safari/537.36'
    )
}

IMG_EXTS = ('.jpg', '.jpeg', '.png', '.webp')


def slugify(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c if unicodedata.category(c) != 'Mn' else '' for c in s)
    return s.replace(' ', '-').replace('/', '-')[:60]


def fetch_best_image(nom):
    """Searches DuckDuckGo Images and returns (url, bytes) for the first valid image."""
    from ddgs import DDGS
    query = f'{nom} recette'
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(query, max_results=10, safesearch='off'))
    except Exception as e:
        return None, None, str(e)

    for r in results:
        url = r.get('image', '')
        if not url:
            continue
        if not any(url.lower().split('?')[0].endswith(ext) for ext in IMG_EXTS):
            url_lower = url.lower()
            if not any(ext in url_lower for ext in IMG_EXTS):
                continue
        try:
            resp = requests.get(url, timeout=10, headers=HEADERS)
            ct = resp.headers.get('content-type', '')
            if resp.status_code == 200 and 'image' in ct and len(resp.content) > 5000:
                return url, resp.content, None
        except Exception:
            continue

    return None, None, 'aucun résultat valide'


class Command(BaseCommand):
    help = 'Fetch food photos from DuckDuckGo Images for all recipes'

    def add_arguments(self, parser):
        parser.add_argument('--overwrite', action='store_true',
                            help='Replace photos that already exist')
        parser.add_argument('--limit', type=int, default=0,
                            help='Max number of recipes to process (0 = all)')
        parser.add_argument('--delay', type=float, default=2.5,
                            help='Seconds between requests (default 2.5)')

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        limit = options['limit']
        delay = options['delay']

        qs = Recette.objects.all().order_by('nom')
        if not overwrite:
            qs = qs.filter(photo='')
        if limit:
            qs = qs[:limit]

        total = qs.count()
        if total == 0:
            self.stdout.write('Aucune recette à traiter (utilisez --overwrite pour remplacer).')
            return

        self.stdout.write(f'📸 {total} recette(s) à traiter…\n')
        ok = fail = 0

        for i, recette in enumerate(qs, 1):
            self.stdout.write(f'[{i}/{total}] 🔍 {recette.nom}')
            url, data, err = fetch_best_image(recette.nom)

            if data:
                fname = slugify(recette.nom) + '.jpg'
                recette.photo.save(fname, ContentFile(data), save=True)
                self.stdout.write(
                    self.style.SUCCESS(f'       ✓ {len(data)//1024} KB — {url[:70]}')
                )
                ok += 1
            else:
                self.stdout.write(
                    self.style.WARNING(f'       ✗ {err}')
                )
                fail += 1

            if i < total:
                time.sleep(delay)

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ {ok} photos mises à jour · {fail} échec(s)'
        ))

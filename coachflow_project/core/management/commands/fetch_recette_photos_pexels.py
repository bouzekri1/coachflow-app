"""
python manage.py fetch_recette_photos_pexels --api-key=<PEXELS_KEY>
python manage.py fetch_recette_photos_pexels --api-key=<KEY> --limit 20
python manage.py fetch_recette_photos_pexels --api-key=<KEY> --overwrite

Récupère les photos via Pexels API (gratuit, 200 req/h).
Sign up : https://www.pexels.com/api/
"""
import os
import time
import requests
import unicodedata
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import Recette


def normalize(s):
    """Enlève accents et caractères spéciaux pour une meilleure recherche."""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s


# Termes EN simplifiés pour mieux matcher Pexels (anglo-saxon)
QUERY_HINTS = {
    'poulet': 'chicken', 'porc': 'pork', 'boeuf': 'beef', 'veau': 'veal',
    'saumon': 'salmon', 'thon': 'tuna', 'cabillaud': 'cod', 'crevettes': 'shrimp',
    'maquereau': 'mackerel', 'sardine': 'sardine', 'dinde': 'turkey', 'oeuf': 'egg',
    'oeufs': 'eggs', 'omelette': 'omelette',
    'salade': 'salad', 'soupe': 'soup', 'wrap': 'wrap', 'pasta': 'pasta',
    'pates': 'pasta', 'riz': 'rice', 'quinoa': 'quinoa', 'lentilles': 'lentils',
    'pois chiches': 'chickpeas', 'haricots': 'beans',
    'avocat': 'avocado', 'mangue': 'mango', 'banane': 'banana', 'fraise': 'strawberry',
    'pomme': 'apple', 'kiwi': 'kiwi', 'myrtille': 'blueberry',
    'smoothie': 'smoothie', 'bowl': 'bowl', 'porridge': 'porridge', 'pancake': 'pancake',
    'toast': 'toast', 'yaourt': 'yogurt', 'skyr': 'yogurt bowl',
    'fromage': 'cheese', 'tarte': 'tart',
    'gratin': 'gratin', 'curry': 'curry', 'wok': 'wok', 'tikka': 'tikka',
    'cake': 'cake', 'mug cake': 'mug cake',
    'brocoli': 'broccoli', 'chou-fleur': 'cauliflower', 'patate douce': 'sweet potato',
    'champignons': 'mushroom', 'epinards': 'spinach',
}


def to_search_query(nom):
    """Transforme un nom français en query anglaise pour Pexels."""
    n = normalize(nom).lower()
    # Extrait l'ingrédient principal (premier match dans QUERY_HINTS)
    for fr, en in QUERY_HINTS.items():
        if fr in n:
            # Termine la query par "food" pour cibler le bon contexte
            return f'{en} food'
    # Fallback : tronque le nom et ajoute "food"
    return f'{n.split(",")[0].strip()[:30]} food'


def fetch_from_pexels(query, api_key):
    """Retourne (url, bytes) du premier résultat valide."""
    try:
        r = requests.get(
            'https://api.pexels.com/v1/search',
            params={'query': query, 'per_page': 3, 'orientation': 'landscape'},
            headers={'Authorization': api_key},
            timeout=15,
        )
        r.raise_for_status()
        photos = r.json().get('photos', [])
        for p in photos:
            url = p['src'].get('large', p['src'].get('medium', ''))
            if not url:
                continue
            img = requests.get(url, timeout=15)
            if img.status_code == 200 and len(img.content) > 5000:
                return url, img.content
        return None, None
    except Exception as e:
        return None, str(e)


class Command(BaseCommand):
    help = 'Récupère photos des recettes via Pexels API (gratuit)'

    def add_arguments(self, parser):
        parser.add_argument('--api-key', required=False, default=os.environ.get('PEXELS_API_KEY'),
                            help='Pexels API key (ou via PEXELS_API_KEY env var)')
        parser.add_argument('--limit', type=int, default=None, help='Limiter à N recettes')
        parser.add_argument('--overwrite', action='store_true', help='Remplacer les photos existantes')

    def handle(self, *args, **opts):
        api_key = opts['api_key']
        if not api_key:
            self.stderr.write(self.style.ERROR(
                'API key requise. Génère-la sur https://www.pexels.com/api/'))
            return

        qs = Recette.objects.all()
        if not opts['overwrite']:
            qs = qs.filter(photo='', image_url='')
        if opts['limit']:
            qs = qs[:opts['limit']]

        total = qs.count()
        self.stdout.write(f'▶ {total} recettes à traiter…\n')

        ok, fail = 0, 0
        for i, recette in enumerate(qs, 1):
            query = to_search_query(recette.nom)
            url_or_err, content = fetch_from_pexels(query, api_key)
            if content and isinstance(content, bytes):
                fname = f'recette_{recette.id}.jpg'
                recette.photo.save(fname, ContentFile(content), save=True)
                self.stdout.write(f'  ✓ [{i}/{total}] {recette.nom[:50]} → query: "{query}"')
                ok += 1
            else:
                self.stdout.write(self.style.WARNING(
                    f'  ✗ [{i}/{total}] {recette.nom[:50]} → "{query}" ({url_or_err or "no result"})'))
                fail += 1
            # Throttle : 200 req/h = 1 req/18s. On force 1 par seconde max.
            time.sleep(1.0)

        self.stdout.write(self.style.SUCCESS(f'\n✅ {ok} photos téléchargées, {fail} échecs'))

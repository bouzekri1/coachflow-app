"""Helper Open Food Facts (https://world.openfoodfacts.org).

API publique, sans clé. Documentation : https://openfoodfacts.github.io/openfoodfacts-server/api/
"""
import logging
import requests

logger = logging.getLogger(__name__)

SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product/{barcode}.json'

# Champs nutritionnels qu'on récupère (g pour 100g sauf énergie kcal)
FIELDS = ','.join([
    'code', 'product_name', 'product_name_fr', 'brands',
    'image_small_url', 'image_thumb_url',
    'nutriments', 'categories_tags',
])

# Catégories OFF → catégories CoachFlow
CATEGORY_MAP = {
    'meat':          'viandes_poissons',
    'fish':          'viandes_poissons',
    'seafood':       'viandes_poissons',
    'poultry':       'viandes_poissons',
    'vegetable':     'legumes',
    'legume':        'legumineuses',
    'pulse':         'legumineuses',
    'cereal':        'feculents',
    'pasta':         'feculents',
    'rice':          'feculents',
    'bread':         'feculents',
    'dairy':         'laitiers',
    'cheese':        'laitiers',
    'yogurt':        'laitiers',
    'milk':          'laitiers',
    'fruit':         'fruits',
    'oil':           'matieres_grasses',
    'butter':        'matieres_grasses',
    'nut':           'matieres_grasses',
}


def _guess_categorie(categories_tags):
    """Devine la catégorie CoachFlow à partir des tags OFF."""
    if not categories_tags:
        return 'autres'
    text = ' '.join(t.lower() for t in categories_tags)
    for keyword, cat in CATEGORY_MAP.items():
        if keyword in text:
            return cat
    return 'autres'


def _extract_nutrition(nutriments):
    """Extrait les macros principales pour 100g. Renvoie None si données absentes/inutiles."""
    if not nutriments:
        return None
    kcal = nutriments.get('energy-kcal_100g') or nutriments.get('energy-kcal')
    if kcal is None:
        # Convertir kJ → kcal si nécessaire
        kj = nutriments.get('energy_100g') or nutriments.get('energy-kj_100g')
        if kj is not None:
            try: kcal = float(kj) / 4.184
            except (ValueError, TypeError): pass
    if kcal is None:
        return None
    def _f(key):
        v = nutriments.get(key)
        try: return round(float(v), 1) if v is not None else 0.0
        except (ValueError, TypeError): return 0.0
    return {
        'calories_100g':  round(float(kcal), 1),
        'proteines_100g': _f('proteins_100g'),
        'glucides_100g':  _f('carbohydrates_100g'),
        'lipides_100g':   _f('fat_100g'),
        'fibres_100g':    _f('fiber_100g'),
    }


def _format_product(p):
    """Normalise un produit OFF en dict léger pour le frontend."""
    nutrition = _extract_nutrition(p.get('nutriments'))
    if not nutrition:
        return None
    nom = (p.get('product_name_fr') or p.get('product_name') or '').strip()
    if not nom:
        return None
    brands = (p.get('brands') or '').strip()
    if brands:
        nom_complet = f'{nom} — {brands.split(",")[0].strip()}'
    else:
        nom_complet = nom
    return {
        'source_id': p.get('code', ''),
        'nom':       nom_complet[:200],
        'categorie': _guess_categorie(p.get('categories_tags')),
        'image':     p.get('image_small_url') or p.get('image_thumb_url') or '',
        **nutrition,
    }


def search(query, limit=8, timeout=8):
    """Recherche un aliment par nom. Renvoie une liste de candidats normalisés."""
    if not query or len(query.strip()) < 2:
        return []
    try:
        r = requests.get(
            SEARCH_URL,
            params={
                'search_terms': query.strip(),
                'search_simple': 1,
                'action': 'process',
                'json': 1,
                'page_size': limit * 3,  # marge pour filtrer les produits sans nutrition
                'fields': FIELDS,
                'lc': 'fr',
            },
            timeout=timeout,
            headers={'User-Agent': 'TrainFlow/1.0 (contact@trainflow.fr)'},
        )
        r.raise_for_status()
        products = r.json().get('products', [])
    except (requests.RequestException, ValueError) as e:
        logger.warning('OpenFoodFacts search failed for %r: %s', query, e)
        return []

    results = []
    for p in products:
        formatted = _format_product(p)
        if formatted:
            results.append(formatted)
        if len(results) >= limit:
            break
    return results


def fetch_by_barcode(barcode, timeout=8):
    """Récupère un produit par code-barre. Renvoie None si introuvable."""
    if not barcode:
        return None
    try:
        r = requests.get(
            PRODUCT_URL.format(barcode=barcode),
            timeout=timeout,
            headers={'User-Agent': 'TrainFlow/1.0 (contact@trainflow.fr)'},
        )
        r.raise_for_status()
        data = r.json()
        if data.get('status') != 1:
            return None
        return _format_product(data.get('product', {}))
    except (requests.RequestException, ValueError) as e:
        logger.warning('OpenFoodFacts barcode lookup failed for %s: %s', barcode, e)
        return None

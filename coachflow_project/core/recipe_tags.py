"""
Auto-tagger de recettes basé sur les ingrédients.

Heuristiques :
- vegan        : aucun produit animal (viande, poisson, œufs, laitages, miel)
- vegetarien   : pas de viande/poisson (œufs/laitages OK)
- sans_gluten  : aucun blé/orge/avoine non-certifiée
- sans_lactose : aucun produit laitier
- low_fodmap   : aucun FODMAP haut (ail, oignon, blé, lactose, certains fruits…)
- riche_proteines : ≥ 25g de protéines / portion
- low_carb     : ≤ 15g de glucides / portion
"""

# Mots-clés normalisés (sans accents, lowercase) à matcher dans le nom d'aliment
ANIMAL_PROD = {
    # viandes
    'poulet','dinde','boeuf','agneau','porc','jambon','saucisse','foie','lapin','veau','pintade','steak',
    # poissons / fruits de mer
    'saumon','thon','cabillaud','sardine','maquereau','crevette','calamar','sole','daurade','loup','truite',
    'merlu','surimi','moules','hareng','poisson',
    # œufs
    'oeuf','œuf',
    # laitages
    'lait','yaourt','fromage','feta','mozzarella','parmesan','ricotta','quark','kefir','skyr','beurre',
    'creme','cheese','burrata','camembert','comte','gruyere','emmental','chevre',
    # autres
    'miel','tzatziki','whey','caseine',
}

MEAT_FISH = {
    'poulet','dinde','boeuf','agneau','porc','jambon','saucisse','foie','lapin','veau','pintade','steak',
    'saumon','thon','cabillaud','sardine','maquereau','crevette','calamar','sole','daurade','loup','truite',
    'merlu','surimi','moules','hareng','poisson','tzatziki',
}

DAIRY = {
    'lait','yaourt','fromage','feta','mozzarella','parmesan','ricotta','quark','kefir','skyr','beurre',
    'creme','cheese','burrata','camembert','comte','gruyere','emmental','chevre','whey','caseine','tzatziki',
}

GLUTEN = {
    'ble','pain','pates','pate','biscotte','biscottes','semoule','boulgour','couscous','chapelure',
    'muesli','tortilla','wraps','wrap','baguette','seigle','farine d\'avoine','farine d avoine',
    'avoine','flocons d\'avoine','flocons d avoine','crackers','wasa','lasagnes','gnocchi','crozets',
    'orge','farro','vermicelles','soba',  # soba = sarrasin pur souvent OK mais peut contenir blé
    'pita','pancakes','gaufres','barres','muffins','tartines','toast','sandwich','quesadillas','tacos','burger',
}

# FODMAP élevés
HIGH_FODMAP = {
    'ail','oignon','blé','seigle','pain','pates','pate','couscous','semoule','boulgour','chapelure',
    'lait','yaourt','fromage','feta','mozzarella','ricotta','quark','creme','cheese',
    'pomme','poire','mangue','pastèque','pasteque','asperge','artichaut','chou-fleur','chou de bruxelles',
    'champignons','figue','figues','miel','lait de coco','lait demi-ecreme','lait écrémé','lait entier',
    'lentilles','haricots','pois chiches','fèves','soja','tempeh','azukis','edamame',
    'avocat','grenade','litchi',
}


def _normalize(s):
    """Retire accents et passe en minuscule."""
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def _contains_any(ingredient_norm, keyword_set):
    """True si un mot-clé apparaît dans le nom normalisé de l'ingrédient."""
    for kw in keyword_set:
        if kw in ingredient_norm:
            return True
    return False


def compute_tags_for_recipe(recette):
    """Retourne la liste de tags applicables à cette recette."""
    from .models import IngredientRecette

    ingredients = list(IngredientRecette.objects.filter(recette=recette).select_related('aliment'))
    if not ingredients:
        return []

    noms_norm = [_normalize(ing.aliment.nom) for ing in ingredients]

    has_meat_fish = any(_contains_any(n, MEAT_FISH) for n in noms_norm)
    has_animal    = any(_contains_any(n, ANIMAL_PROD) for n in noms_norm)
    has_dairy     = any(_contains_any(n, DAIRY) for n in noms_norm)
    has_gluten    = any(_contains_any(n, GLUTEN) for n in noms_norm)
    has_high_fodmap = any(_contains_any(n, HIGH_FODMAP) for n in noms_norm)

    tags = []
    if not has_animal:
        tags.append('vegan')
        tags.append('vegetarien')  # un vegan est aussi végétarien
    elif not has_meat_fish:
        tags.append('vegetarien')
    if not has_gluten:
        tags.append('sans_gluten')
    if not has_dairy:
        tags.append('sans_lactose')
    if not has_high_fodmap:
        tags.append('low_fodmap')

    # Tags macro-basés
    try:
        macros = recette.macros_par_portion
        if macros.get('proteines', 0) >= 25:
            tags.append('riche_proteines')
        if macros.get('glucides', 0) <= 15:
            tags.append('low_carb')
    except Exception:
        pass

    return tags


def retag_all_recipes():
    """Recalcule les tags de toutes les recettes en base. Retourne (total, modifiées)."""
    from .models import Recette
    total = 0
    modified = 0
    for r in Recette.objects.all():
        new_tags = compute_tags_for_recipe(r)
        if set(new_tags) != set(r.tags or []):
            r.tags = new_tags
            r.save(update_fields=['tags'])
            modified += 1
        total += 1
    return total, modified

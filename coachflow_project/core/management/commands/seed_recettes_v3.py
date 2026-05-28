"""
python manage.py seed_recettes_v3
Ajoute 30 nouvelles recettes (pack 2) avec leurs aliments.
"""
import io
from PIL import Image
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import Recette, Aliment, IngredientRecette

# ── Nouveaux aliments nécessaires ─────────────────────────────────────────────
NOUVEAUX_ALIMENTS = [
    # protéines
    {'nom': 'Agneau hache',          'calories': 235, 'proteines': 17.0, 'glucides': 0.0,  'lipides': 18.5},
    {'nom': 'Creme cheese legere',   'calories': 150, 'proteines': 8.0,  'glucides': 4.0,  'lipides': 11.0},
    {'nom': 'Blanc de poulet roti',  'calories': 165, 'proteines': 31.0, 'glucides': 0.0,  'lipides': 3.5},
    # laitiers/fermentés
    {'nom': 'Kefir nature',          'calories': 61,  'proteines': 3.5,  'glucides': 4.8,  'lipides': 3.2},
    {'nom': 'Fromage cottage',       'calories': 98,  'proteines': 11.1, 'glucides': 3.4,  'lipides': 4.3},
    {'nom': 'Lait de coco',          'calories': 197, 'proteines': 2.0,  'glucides': 5.5,  'lipides': 19.0},
    # féculents/céréales
    {'nom': 'Riz jasmin cru',        'calories': 356, 'proteines': 7.1,  'glucides': 79.0, 'lipides': 0.5},
    {'nom': 'Polenta',               'calories': 362, 'proteines': 8.1,  'glucides': 77.0, 'lipides': 1.8},
    {'nom': 'Pain pita complet',     'calories': 265, 'proteines': 9.0,  'glucides': 50.0, 'lipides': 2.0},
    {'nom': 'Crozets nature',        'calories': 349, 'proteines': 12.0, 'glucides': 68.0, 'lipides': 2.5},
    # légumes
    {'nom': 'Courgette',             'calories': 17,  'proteines': 1.2,  'glucides': 3.1,  'lipides': 0.3},
    {'nom': 'Champignons shiitake',  'calories': 34,  'proteines': 2.2,  'glucides': 6.8,  'lipides': 0.5},
    {'nom': 'Concombre',             'calories': 15,  'proteines': 0.7,  'glucides': 2.2,  'lipides': 0.1},
    {'nom': 'Olives vertes',         'calories': 145, 'proteines': 1.0,  'glucides': 3.8,  'lipides': 15.0},
    {'nom': 'Tomates cerises',       'calories': 18,  'proteines': 0.9,  'glucides': 3.5,  'lipides': 0.2},
    {'nom': 'Radis',                 'calories': 16,  'proteines': 0.7,  'glucides': 3.4,  'lipides': 0.1},
    # condiments/divers
    {'nom': 'Sauce huitre',          'calories': 73,  'proteines': 1.4,  'glucides': 18.0, 'lipides': 0.1},
    {'nom': 'Miso blanc',            'calories': 199, 'proteines': 12.0, 'glucides': 26.0, 'lipides': 6.0},
    {'nom': 'Vinaigre de riz',       'calories': 18,  'proteines': 0.0,  'glucides': 4.5,  'lipides': 0.0},
    {'nom': 'Cafe soluble',          'calories': 2,   'proteines': 0.3,  'glucides': 0.4,  'lipides': 0.0},
    {'nom': 'Feuilles nori',         'calories': 35,  'proteines': 5.8,  'glucides': 4.9,  'lipides': 0.3},
    {'nom': 'Graines tournesol',     'calories': 584, 'proteines': 20.8, 'glucides': 20.0, 'lipides': 51.5},
    {'nom': 'Levure nutritionnelle', 'calories': 353, 'proteines': 48.0, 'glucides': 20.0, 'lipides': 6.0},
    {'nom': 'Sauce sriracha',        'calories': 93,  'proteines': 2.0,  'glucides': 19.0, 'lipides': 1.0},
]

# ── Recettes ──────────────────────────────────────────────────────────────────
RECETTES = [
    # ── PETIT-DÉJEUNER (5) ─────────────────────────────────────────────────────
    {
        'nom': 'Granola maison noix-miel',
        'description': 'Granola croustillant sans additif, riche en bons gras et fibres.',
        'instructions': 'Mélanger flocons et noix avec huile et miel. Étaler sur plaque. Cuire 25 min à 160°C en remuant à mi-cuisson. Laisser refroidir.',
        'portions': 6,
        'emoji': '🥣', 'couleur': '#f59e0b', 'bg': '#fef3c7',
        'ingredients': [
            ('Flocons avoine', 150, 'g'),
            ('Noix de cajou', 50, 'g'),
            ('Amandes', 40, 'g'),
            ('Miel', 40, 'g'),
            ('Graines tournesol', 30, 'g'),
            ('Graines de sesame', 20, 'g'),
        ],
    },
    {
        'nom': 'Bowl kéfir fruits rouges',
        'description': 'Bol probiotique ultra-frais, excellent pour le microbiote et la récupération.',
        'instructions': 'Verser le kéfir dans un bol. Ajouter les fruits. Parsemer de granola et graines de chia.',
        'portions': 1,
        'emoji': '🫙', 'couleur': '#ec4899', 'bg': '#fdf2f8',
        'ingredients': [
            ('Kefir nature', 200, 'ml'),
            ('Framboises', 100, 'g'),
            ('Myrtilles', 80, 'g'),
            ('Graines de chia', 15, 'g'),
            ('Miel', 10, 'g'),
        ],
    },
    {
        'nom': 'Egg muffins épinards-feta',
        'description': 'Mini-omelettes en moule à muffins, idéales pour préparer la semaine en avance.',
        'instructions': 'Battre les œufs, ajouter épinards, feta et assaisonnements. Verser en moules graissés. Cuire 20 min à 180°C.',
        'portions': 2,
        'emoji': '🧁', 'couleur': '#10b981', 'bg': '#d1fae5',
        'ingredients': [
            ('Oeufs entiers', 4, 'unité'),
            ('Epinards frais', 60, 'g'),
            ('Feta', 50, 'g'),
            ('Tomates cerises', 40, 'g'),
            ('Huile olive', 5, 'ml'),
        ],
    },
    {
        'nom': 'Crêpes sarrasin saumon-fromage blanc',
        'description': 'Galettes bretonnes sans gluten garnies d\'une garniture protéinée légère.',
        'instructions': 'Préparer les galettes de sarrasin. Garnir de fromage blanc, lamelles de saumon fumé, concombre et aneth.',
        'portions': 2,
        'emoji': '🥞', 'couleur': '#f97316', 'bg': '#fff7ed',
        'ingredients': [
            ('Farine de sarrasin', 80, 'g'),
            ('Saumon fume', 80, 'g'),
            ('Fromage blanc 0%', 100, 'g'),
            ('Concombre', 60, 'g'),
            ('Oeufs entiers', 1, 'unité'),
        ],
    },
    {
        'nom': 'Bol protéiné café-banane pré-entraînement',
        'description': 'Smoothie bowl énergisant au café, parfait 45 min avant une séance.',
        'instructions': 'Mixer banane congelée, whey vanille, café soluble et lait. Verser. Garnir de flocons d\'avoine et noix de cajou.',
        'portions': 1,
        'emoji': '☕', 'couleur': '#92400e', 'bg': '#fef3c7',
        'ingredients': [
            ('Banane', 1, 'unité'),
            ('Whey proteines', 30, 'g'),
            ('Cafe soluble', 5, 'g'),
            ('Lait demi-ecreme', 150, 'ml'),
            ('Flocons avoine', 40, 'g'),
            ('Noix de cajou', 20, 'g'),
        ],
    },

    # ── DÉJEUNER (9) ───────────────────────────────────────────────────────────
    {
        'nom': 'Poke bowl thon-mangue-avocat',
        'description': 'Bowl hawaïen coloré, frais et plein d\'oméga-3.',
        'instructions': 'Mariner le thon en dés (sauce soja, vinaigre de riz, sésame). Servir sur riz avec mangue, avocat et edamame. Ajouter graines de sésame.',
        'portions': 1,
        'emoji': '🫙', 'couleur': '#0ea5e9', 'bg': '#e0f2fe',
        'ingredients': [
            ('Thon frais', 150, 'g'),
            ('Riz jasmin cru', 80, 'g'),
            ('Mangue', 80, 'g'),
            ('Avocat', 70, 'g'),
            ('Edamame ecale', 50, 'g'),
            ('Sauce soja legere', 20, 'ml'),
            ('Vinaigre de riz', 10, 'ml'),
            ('Graines de sesame', 10, 'g'),
        ],
    },
    {
        'nom': 'Taboulé libanais au quinoa',
        'description': 'Version protéinée du taboulé traditionnel, sans boulgour, riche en herbes fraîches.',
        'instructions': 'Cuire le quinoa, laisser refroidir. Mélanger avec tomates, concombre, persil, menthe, jus de citron et huile d\'olive.',
        'portions': 2,
        'emoji': '🫙', 'couleur': '#84cc16', 'bg': '#f7fee7',
        'ingredients': [
            ('Quinoa cru', 100, 'g'),
            ('Tomates', 150, 'g'),
            ('Concombre', 100, 'g'),
            ('Citron jus', 30, 'ml'),
            ('Huile olive', 20, 'ml'),
            ('Coriandre fraiche', 15, 'g'),
        ],
    },
    {
        'nom': 'Salade César poulet grillé',
        'description': 'Grande salade iconique, version allégée avec yaourt grec en lieu de mayo.',
        'instructions': 'Griller le poulet. Préparer la sauce César au yaourt, anchois, citron. Mélanger laitue, croûtons, parmesan. Trancher le poulet dessus.',
        'portions': 1,
        'emoji': '🥗', 'couleur': '#65a30d', 'bg': '#f0fdf4',
        'ingredients': [
            ('Blanc de poulet roti', 150, 'g'),
            ('Salade romaine', 100, 'g'),
            ('Parmesan rape', 20, 'g'),
            ('Yaourt grec 0%', 60, 'g'),
            ('Citron jus', 15, 'ml'),
            ('Pain complet', 30, 'g'),
        ],
    },
    {
        'nom': 'Soupe tom kha poulet',
        'description': 'Soupe thaïe crémeuse au lait de coco et galanga, parfumée et réconfortante.',
        'instructions': 'Faire revenir oignons et gingembre. Ajouter lait de coco, bouillon, champignons. Cuire 10 min. Ajouter le poulet coupé, citron vert, coriandre.',
        'portions': 2,
        'emoji': '🍲', 'couleur': '#fbbf24', 'bg': '#fffbeb',
        'ingredients': [
            ('Blanc poulet', 200, 'g'),
            ('Lait de coco', 200, 'ml'),
            ('Champignons shiitake', 100, 'g'),
            ('Gingembre frais', 15, 'g'),
            ('Citron vert jus', 20, 'ml'),
            ('Coriandre fraiche', 10, 'g'),
        ],
    },
    {
        'nom': 'Wrap saumon-cream cheese-concombre',
        'description': 'Wrap frais et léger, façon bagel scandinave. Rapide à préparer.',
        'instructions': 'Étaler le cream cheese sur la tortilla. Ajouter saumon fumé, concombre en lamelles, aneth et jus de citron. Rouler serré.',
        'portions': 1,
        'emoji': '🌯', 'couleur': '#f97316', 'bg': '#fff7ed',
        'ingredients': [
            ('Tortilla ble complet', 60, 'g'),
            ('Saumon fume', 80, 'g'),
            ('Creme cheese legere', 50, 'g'),
            ('Concombre', 80, 'g'),
            ('Citron jus', 10, 'ml'),
        ],
    },
    {
        'nom': 'Soupe miso tofu-champignons',
        'description': 'Soupe japonaise traditionnelle, reconstituante et riche en probiotiques naturels.',
        'instructions': 'Délayer le miso dans bouillon chaud (sans faire bouillir). Ajouter tofu en dés, champignons, algues nori en lamelles. Servir immédiatement.',
        'portions': 2,
        'emoji': '🍜', 'couleur': '#a16207', 'bg': '#fefce8',
        'ingredients': [
            ('Miso blanc', 40, 'g'),
            ('Tofu ferme', 120, 'g'),
            ('Champignons shiitake', 80, 'g'),
            ('Feuilles nori', 5, 'g'),
            ('Oignons verts', 20, 'g'),
        ],
    },
    {
        'nom': 'Buddha bowl falafel-houmous',
        'description': 'Bowl végétarien complet et rassasiant, inspiré de la cuisine du Moyen-Orient.',
        'instructions': 'Mixer pois chiches, herbes, ail pour les falafels. Cuire à l\'airfryer 15 min. Assembler dans un bol avec houmous, crudités et riz.',
        'portions': 2,
        'emoji': '🧆', 'couleur': '#d97706', 'bg': '#fef3c7',
        'ingredients': [
            ('Pois chiches seches cuits', 200, 'g'),
            ('Tahini (puree sesame)', 30, 'g'),
            ('Citron jus', 20, 'ml'),
            ('Riz complet cru', 80, 'g'),
            ('Tomates cerises', 80, 'g'),
            ('Concombre', 80, 'g'),
            ('Coriandre fraiche', 10, 'g'),
        ],
    },
    {
        'nom': 'Sandwich dinde avocat tomates séchées',
        'description': 'Sandwich protéiné et savoureux pour la boîte à repas.',
        'instructions': 'Tartiner le pain complet de crème cheese. Ajouter dinde, avocat écrasé, tomates séchées, roquette.',
        'portions': 1,
        'emoji': '🥪', 'couleur': '#65a30d', 'bg': '#f0fdf4',
        'ingredients': [
            ('Pain complet', 80, 'g'),
            ('Dinde tranchee', 100, 'g'),
            ('Avocat', 80, 'g'),
            ('Creme cheese legere', 30, 'g'),
            ('Tomates sechees', 20, 'g'),
        ],
    },
    {
        'nom': 'Riz cantonais poulet-légumes',
        'description': 'Riz sauté maison, version healthy sans glutamate ni excès de sel.',
        'instructions': 'Sauter ail et légumes à feu vif. Ajouter riz cuit froid, poulet, sauce soja et sauce huître. Incorporer œufs brouillés.',
        'portions': 2,
        'emoji': '🍳', 'couleur': '#f59e0b', 'bg': '#fffbeb',
        'ingredients': [
            ('Riz jasmin cru', 120, 'g'),
            ('Blanc poulet', 150, 'g'),
            ('Oeufs entiers', 2, 'unité'),
            ('Carottes', 80, 'g'),
            ('Petits pois surgeles', 60, 'g'),
            ('Sauce soja legere', 20, 'ml'),
            ('Sauce huitre', 15, 'ml'),
            ('Huile colza', 10, 'ml'),
        ],
    },

    # ── DÎNER (9) ──────────────────────────────────────────────────────────────
    {
        'nom': 'Tajine poulet citron confit olives',
        'description': 'Plat mijoté marocain parfumé, pauvre en matières grasses.',
        'instructions': 'Faire revenir poulet, oignons, épices (curcuma, cumin, cannelle). Ajouter bouillon, citron confit, olives. Mijoter 40 min à couvert.',
        'portions': 3,
        'emoji': '🫕', 'couleur': '#f59e0b', 'bg': '#fef3c7',
        'ingredients': [
            ('Blanc poulet', 400, 'g'),
            ('Olives vertes', 60, 'g'),
            ('Oignons', 120, 'g'),
            ('Citron jus', 30, 'ml'),
            ('Curcuma poudre', 5, 'g'),
            ('Tomates', 150, 'g'),
            ('Coriandre fraiche', 15, 'g'),
        ],
    },
    {
        'nom': 'Saumon miso-sésame',
        'description': 'Saumon laqué à la japonaise, caramélisé et fondant. Prêt en 20 min.',
        'instructions': 'Mélanger miso, sauce soja, vinaigre de riz, miel. Mariner le saumon 15 min. Cuire à la poêle 4 min par face. Servir avec légumes vapeur.',
        'portions': 2,
        'emoji': '🐟', 'couleur': '#f97316', 'bg': '#fff7ed',
        'ingredients': [
            ('Filet de saumon', 300, 'g'),
            ('Miso blanc', 30, 'g'),
            ('Sauce soja legere', 20, 'ml'),
            ('Vinaigre de riz', 15, 'ml'),
            ('Miel', 15, 'g'),
            ('Graines de sesame', 10, 'g'),
            ('Brocoli fleur', 200, 'g'),
        ],
    },
    {
        'nom': 'Wok de bœuf aux légumes sauce huître',
        'description': 'Sauté express à feu très vif, façon restaurant asiatique.',
        'instructions': 'Couper le bœuf en fines lamelles. Saisir à feu maximal avec ail et gingembre. Ajouter légumes croquants, sauce huître et soja. Servir avec riz.',
        'portions': 2,
        'emoji': '🥩', 'couleur': '#dc2626', 'bg': '#fef2f2',
        'ingredients': [
            ('Boeuf maigre', 250, 'g'),
            ('Pak choi', 150, 'g'),
            ('Poivron rouge', 100, 'g'),
            ('Champignons shiitake', 80, 'g'),
            ('Sauce huitre', 30, 'ml'),
            ('Sauce soja legere', 15, 'ml'),
            ('Gingembre frais', 10, 'g'),
            ('Riz jasmin cru', 80, 'g'),
        ],
    },
    {
        'nom': 'Moussaka légère aubergine-agneau',
        'description': 'Version allégée du classique grec, gratiné au yaourt grec à la place de la béchamel.',
        'instructions': 'Griller les aubergines en tranches. Faire revenir agneau avec tomates et épices. Alterner couches aubergines/viande. Couvrir yaourt-parmesan. Gratiner 25 min.',
        'portions': 4,
        'emoji': '🍆', 'couleur': '#7c3aed', 'bg': '#ede9fe',
        'ingredients': [
            ('Agneau hache', 300, 'g'),
            ('Aubergine', 400, 'g'),
            ('Tomates', 200, 'g'),
            ('Yaourt grec 0%', 150, 'g'),
            ('Parmesan rape', 30, 'g'),
            ('Oignons', 80, 'g'),
            ('Curcuma poudre', 3, 'g'),
        ],
    },
    {
        'nom': 'Brochettes de crevettes harissa-citron',
        'description': 'Brochettes marinées épicées, grillées à feu vif. Parfait barbecue.',
        'instructions': 'Mariner crevettes avec harissa, citron, ail, huile d\'olive 30 min. Enfiler sur brochettes. Griller 3 min par face. Servir avec salade de courgette.',
        'portions': 2,
        'emoji': '🍢', 'couleur': '#ef4444', 'bg': '#fef2f2',
        'ingredients': [
            ('Crevettes crues', 300, 'g'),
            ('Citron jus', 30, 'ml'),
            ('Huile olive', 15, 'ml'),
            ('Paprika fume', 5, 'g'),
            ('Courgette', 200, 'g'),
        ],
    },
    {
        'nom': 'Risotto courgette-parmesan',
        'description': 'Risotto crémeux sans excès de beurre, version cœur de sportif.',
        'instructions': 'Faire revenir oignon dans peu d\'huile. Nacrer le riz arborio. Ajouter bouillon louche par louche en remuant. Incorporer courgette et parmesan en fin de cuisson.',
        'portions': 2,
        'emoji': '🍚', 'couleur': '#84cc16', 'bg': '#f7fee7',
        'ingredients': [
            ('Riz arborio', 160, 'g'),
            ('Courgette', 200, 'g'),
            ('Parmesan rape', 40, 'g'),
            ('Oignons', 60, 'g'),
            ('Huile olive', 10, 'ml'),
            ('Fromage blanc 0%', 60, 'g'),
        ],
    },
    {
        'nom': 'Loup de mer au four légumes méditerranéens',
        'description': 'Filet de poisson délicat rôti avec légumes du soleil, cuisine santé et savoureuse.',
        'instructions': 'Disposer légumes en tranches dans un plat, huiler légèrement. Poser le loup dessus avec herbes de Provence. Cuire 20 min à 200°C.',
        'portions': 2,
        'emoji': '🐟', 'couleur': '#0ea5e9', 'bg': '#e0f2fe',
        'ingredients': [
            ('Poisson blanc', 300, 'g'),
            ('Courgette', 150, 'g'),
            ('Tomates', 150, 'g'),
            ('Poivron rouge', 100, 'g'),
            ('Huile olive', 15, 'ml'),
            ('Citron jus', 20, 'ml'),
        ],
    },
    {
        'nom': 'Oeufs à la florentine sauce tomate',
        'description': 'Œufs pochés sur lit d\'épinards dans une sauce tomate légère. Dîner rapide.',
        'instructions': 'Faire réduire la sauce tomate avec ail et basilic. Ajouter les épinards. Creuser 4 nids, casser les œufs. Cuire à couvert 8 min. Servir avec pain complet.',
        'portions': 2,
        'emoji': '🍳', 'couleur': '#dc2626', 'bg': '#fef2f2',
        'ingredients': [
            ('Oeufs entiers', 4, 'unité'),
            ('Epinards frais', 150, 'g'),
            ('Tomates', 300, 'g'),
            ('Ail', 2, 'g'),
            ('Huile olive', 10, 'ml'),
            ('Basilic frais', 10, 'g'),
        ],
    },
    {
        'nom': 'Tarte fine courgette-chèvre-menthe',
        'description': 'Tarte légère sur pâte filo, végétarienne et rapide.',
        'instructions': 'Superposer 4 feuilles de filo légèrement huilées. Répartir fromage de chèvre émietté, rondelles de courgette. Parsemer menthe. Cuire 20 min à 190°C.',
        'portions': 3,
        'emoji': '🥧', 'couleur': '#84cc16', 'bg': '#f0fdf4',
        'ingredients': [
            ('Courgette', 300, 'g'),
            ('Fromage de chevre', 100, 'g'),
            ('Oeufs entiers', 2, 'unité'),
            ('Creme legere 15%', 60, 'ml'),
            ('Huile olive', 10, 'ml'),
        ],
    },

    # ── SNACKS (4) ─────────────────────────────────────────────────────────────
    {
        'nom': 'Edamame épicé sésame-sriracha',
        'description': 'Snack protéiné japonais relevé, prêt en 5 minutes.',
        'instructions': 'Cuire les edamame à la vapeur ou au micro-ondes. Mélanger avec sauce sriracha, sauce soja, graines de sésame et citron vert.',
        'portions': 1,
        'emoji': '🫘', 'couleur': '#84cc16', 'bg': '#f7fee7',
        'ingredients': [
            ('Edamame ecale', 150, 'g'),
            ('Sauce sriracha', 10, 'g'),
            ('Sauce soja legere', 10, 'ml'),
            ('Graines de sesame', 10, 'g'),
            ('Citron vert jus', 10, 'ml'),
        ],
    },
    {
        'nom': 'Fromage cottage herbes et radis',
        'description': 'Collation légère et protéinée, parfaite en toute saison.',
        'instructions': 'Mélanger cottage cheese avec ciboulette, sel, poivre. Servir avec radis et concombre en bâtonnets.',
        'portions': 1,
        'emoji': '🧀', 'couleur': '#fbbf24', 'bg': '#fffbeb',
        'ingredients': [
            ('Fromage cottage', 150, 'g'),
            ('Radis', 80, 'g'),
            ('Concombre', 80, 'g'),
            ('Oignons verts', 10, 'g'),
        ],
    },
    {
        'nom': 'Crackers maison chia-levure nutritionnelle',
        'description': 'Crackers croustillants sans gluten, riches en oméga-3 et en umami.',
        'instructions': 'Mélanger graines de chia trempées avec levure nutritionnelle et sel. Étaler finement sur papier cuisson. Cuire 45 min à 140°C. Briser en morceaux.',
        'portions': 4,
        'emoji': '🍘', 'couleur': '#a16207', 'bg': '#fefce8',
        'ingredients': [
            ('Graines de chia', 80, 'g'),
            ('Graines de lin', 40, 'g'),
            ('Levure nutritionnelle', 20, 'g'),
            ('Graines tournesol', 30, 'g'),
            ('Graines de sesame', 20, 'g'),
        ],
    },
    {
        'nom': 'Makis concombre-thon-avocat maison',
        'description': 'Sushis roulés maison ultra-frais et riches en protéines maigres.',
        'instructions': 'Cuire riz sushi, assaisonner vinaigre de riz. Étaler sur nori. Ajouter thon, avocat, concombre. Rouler avec natte de bambou. Couper en 8 pièces.',
        'portions': 2,
        'emoji': '🍱', 'couleur': '#0f172a', 'bg': '#f8fafc',
        'ingredients': [
            ('Riz jasmin cru', 120, 'g'),
            ('Thon frais', 100, 'g'),
            ('Avocat', 60, 'g'),
            ('Concombre', 60, 'g'),
            ('Feuilles nori', 10, 'g'),
            ('Vinaigre de riz', 20, 'ml'),
            ('Sauce soja legere', 15, 'ml'),
        ],
    },

    # ── SHAKES (3) ─────────────────────────────────────────────────────────────
    {
        'nom': 'Golden milk protéiné curcuma-miel',
        'description': 'Boisson anti-inflammatoire du soir aux propriétés récupération exceptionnelles.',
        'instructions': 'Chauffer le lait végétal. Ajouter curcuma, poivre noir, miel, cannelle et whey vanille hors du feu. Mélanger au fouet.',
        'portions': 1,
        'emoji': '🥛', 'couleur': '#f59e0b', 'bg': '#fef3c7',
        'ingredients': [
            ('Lait de coco', 200, 'ml'),
            ('Curcuma poudre', 5, 'g'),
            ('Miel', 15, 'g'),
            ('Whey proteines', 25, 'g'),
            ('Cannelle', 2, 'g'),
        ],
    },
    {
        'nom': 'Smoothie betterave-pomme-gingembre',
        'description': 'Smoothie rouge vif riche en nitrates, booste les performances d\'endurance.',
        'instructions': 'Mixer betterave cuite, pomme, gingembre, citron et eau froide. Ajouter une pincée de sel. Servir frais.',
        'portions': 1,
        'emoji': '🧃', 'couleur': '#dc2626', 'bg': '#fef2f2',
        'ingredients': [
            ('Betterave cuite', 150, 'g'),
            ('Pomme verte', 100, 'g'),
            ('Gingembre frais', 10, 'g'),
            ('Citron jus', 15, 'ml'),
        ],
    },
    {
        'nom': 'Shake tropical ananas-coco-protéines',
        'description': 'Shake désaltérant façon Piña Colada santé, parfait en post-workout été.',
        'instructions': 'Mixer ananas congelé, lait de coco, whey saveur vanille, glaçons. Servir immédiatement.',
        'portions': 1,
        'emoji': '🍍', 'couleur': '#f59e0b', 'bg': '#fffbeb',
        'ingredients': [
            ('Ananas', 150, 'g'),
            ('Lait de coco', 150, 'ml'),
            ('Whey proteines', 30, 'g'),
            ('Citron vert jus', 10, 'ml'),
        ],
    },
]


def make_placeholder(couleur):
    img = Image.new('RGB', (400, 300), couleur)
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=85)
    return buf.getvalue()


class Command(BaseCommand):
    help = 'Ajoute le pack 3 de 30 recettes avec leurs aliments'

    def handle(self, *args, **options):
        # ── Aliments ───────────────────────────────────────────────────────────
        created_al = 0
        for data in NOUVEAUX_ALIMENTS:
            _, created = Aliment.objects.get_or_create(
                nom=data['nom'],
                defaults={
                    'calories_100g':  data['calories'],
                    'proteines_100g': data['proteines'],
                    'glucides_100g':  data['glucides'],
                    'lipides_100g':   data['lipides'],
                },
            )
            if created:
                self.stdout.write(f'  🥕 Aliment : {data["nom"]}')
                created_al += 1
        self.stdout.write(self.style.SUCCESS(f'→ {created_al} aliments créés'))

        # ── Coach (requis) ────────────────────────────────────────────────────
        from django.contrib.auth import get_user_model
        User = get_user_model()
        coach = User.objects.filter(role='coach').first()
        if not coach:
            self.stderr.write('Aucun coach trouvé — impossible de créer les recettes.')
            return

        # ── Index aliments ────────────────────────────────────────────────────
        aliment_map = {a.nom.lower(): a for a in Aliment.objects.all()}

        # ── Recettes ──────────────────────────────────────────────────────────
        # Conversion approximative "unité" → grammes
        UNITE_TO_G = {'unité': 60, 'ml': 1}

        created_r = 0
        for data in RECETTES:
            if Recette.objects.filter(nom=data['nom'], coach=coach).exists():
                self.stdout.write(f'  — (déjà présente) {data["nom"]}')
                continue

            recette = Recette.objects.create(
                nom=data['nom'],
                description=data['description'],
                instructions=data['instructions'],
                portions=data['portions'],
                coach=coach,
            )

            # placeholder photo colorée
            img_data = make_placeholder(data['couleur'])
            recette.photo.save(f'{recette.id}.jpg', ContentFile(img_data), save=True)

            # ingrédients
            for nom_al, qte, unite in data['ingredients']:
                al = aliment_map.get(nom_al.lower())
                if al:
                    qte_g = float(qte) * UNITE_TO_G.get(unite, 1)
                    IngredientRecette.objects.create(
                        recette=recette, aliment=al, quantite_g=qte_g,
                    )
                else:
                    self.stdout.write(self.style.WARNING(
                        f'    ⚠ Aliment introuvable : {nom_al}'
                    ))

            self.stdout.write(f'  ✓ {data["nom"]}')
            created_r += 1

        total = Recette.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ {created_r} recettes créées — {total} recettes au total'
        ))

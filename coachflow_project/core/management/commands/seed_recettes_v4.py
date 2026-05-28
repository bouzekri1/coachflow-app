"""
python manage.py seed_recettes_v4
Pack 4 — 50 nouvelles recettes mix général (petit-déj, déjeuner, dîner, snacks, shakes).
"""
import io
from PIL import Image
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import Recette, Aliment, IngredientRecette

NOUVEAUX_ALIMENTS = [
    {'nom': 'Boulgour cuit',         'cal': 83,  'prot': 3.1,  'gluc': 18.6, 'lip': 0.2},
    {'nom': 'Pamplemousse',          'cal': 42,  'prot': 0.8,  'gluc': 10.7, 'lip': 0.1},
    {'nom': 'Figues sechees',        'cal': 249, 'prot': 3.3,  'gluc': 63.9, 'lip': 0.9},
    {'nom': 'Noisettes',             'cal': 628, 'prot': 15.0, 'gluc': 16.7, 'lip': 60.8},
    {'nom': 'Capres',                'cal': 23,  'prot': 2.4,  'gluc': 1.8,  'lip': 0.9},
    {'nom': 'Farine de pois chiches','cal': 387, 'prot': 22.4, 'gluc': 57.8, 'lip': 6.2},
    {'nom': 'Kale',                  'cal': 49,  'prot': 4.3,  'gluc': 8.8,  'lip': 0.9},
    {'nom': 'Cardamome',             'cal': 311, 'prot': 10.8, 'gluc': 68.5, 'lip': 6.7},
    {'nom': 'Vermicelles de riz',    'cal': 364, 'prot': 6.0,  'gluc': 85.0, 'lip': 0.6},
    {'nom': 'Truite fumee',          'cal': 151, 'prot': 20.9, 'gluc': 0.0,  'lip': 7.2},
    {'nom': 'Maquereau frais',       'cal': 205, 'prot': 18.6, 'gluc': 0.0,  'lip': 13.9},
    {'nom': 'Sole filet',            'cal': 86,  'prot': 17.5, 'gluc': 0.0,  'lip': 1.9},
    {'nom': 'Cotelettes agneau',     'cal': 217, 'prot': 24.6, 'gluc': 0.0,  'lip': 12.7},
    {'nom': 'Joue de boeuf',         'cal': 138, 'prot': 22.5, 'gluc': 0.0,  'lip': 5.0},
    {'nom': 'Pates completes crues', 'cal': 352, 'prot': 13.4, 'gluc': 70.2, 'lip': 1.6},
    {'nom': 'Lasagnes completes',    'cal': 351, 'prot': 13.5, 'gluc': 70.5, 'lip': 1.5},
    {'nom': 'Beurre demi-sel',       'cal': 717, 'prot': 0.5,  'gluc': 0.6,  'lip': 81.1},
    {'nom': 'Creme fraiche epaisse', 'cal': 292, 'prot': 2.5,  'gluc': 2.4,  'lip': 30.0},
    {'nom': 'Tzatziki maison',       'cal': 75,  'prot': 4.5,  'gluc': 4.2,  'lip': 4.1},
    {'nom': 'Grenade arilles',       'cal': 83,  'prot': 1.7,  'gluc': 18.7, 'lip': 1.2},
    {'nom': 'Farro cuit',            'cal': 170, 'prot': 6.0,  'gluc': 37.0, 'lip': 1.0},
    {'nom': 'Caroube poudre',        'cal': 222, 'prot': 4.8,  'gluc': 49.1, 'lip': 0.7},
]

RECETTES = [
    # ── PETIT-DÉJEUNER (8) ──────────────────────────────────────────────────────
    {
        'nom': 'Gaufres protéinées myrtilles',
        'desc': 'Gaufres moelleuses riches en protéines, sans sucre raffiné.',
        'instr': 'Mixer flocons d\'avoine en farine. Mélanger avec whey, œufs, lait et levure. Cuire dans gaufrier huilé 4 min. Servir avec myrtilles fraîches.',
        'portions': 2,
        'ingredients': [
            ('Flocons d\'avoine', 80), ('Whey proteine (vanille)', 30),
            ('Oeuf entier', 120), ('Lait demi-ecreme', 100),
            ('Myrtilles', 80), ('Miel', 10),
        ],
    },
    {
        'nom': 'Pain perdu protéiné vanille',
        'desc': 'Version sport du pain perdu classique, cuit à sec et riche en protéines.',
        'instr': 'Battre œufs, lait, vanille et whey. Tremper les tranches de pain. Cuire dans poêle légèrement huilée. Servir avec fraises.',
        'portions': 2,
        'ingredients': [
            ('Pain complet', 100), ('Oeuf entier', 120),
            ('Lait demi-ecreme', 100), ('Whey proteine (vanille)', 20),
            ('Fraises', 100), ('Miel', 10),
        ],
    },
    {
        'nom': 'Muesli maison amandes-figues',
        'desc': 'Muesli complet sans sucre ajouté, idéal pour préparer la semaine.',
        'instr': 'Mélanger à sec les flocons, amandes, figues séchées, graines et cannelle. Conserver en pot hermétique. Servir avec lait ou yaourt.',
        'portions': 6,
        'ingredients': [
            ('Flocons d\'avoine', 200), ('Amandes', 60),
            ('Figues sechees', 60), ('Graines tournesol', 40),
            ('Graines de chia', 20), ('Cannelle', 3),
        ],
    },
    {
        'nom': 'Bowl açaï grenade-kiwi',
        'desc': 'Bowl antioxydant vibrant, parfait pour bien démarrer la journée.',
        'instr': 'Mixer açaï congelée avec banane et lait de coco. Verser dans bol. Garnir d\'arilles de grenade, kiwi et granola.',
        'portions': 1,
        'ingredients': [
            ('Banane', 100), ('Lait de coco', 80),
            ('Grenade arilles', 60), ('Kiwi', 80),
            ('Flocons d\'avoine', 40), ('Miel', 10),
        ],
    },
    {
        'nom': 'Frittata légumes du matin',
        'desc': 'Omelette italienne épaisse cuite au four, idéale pour le meal prep.',
        'instr': 'Battre les œufs avec lait et fromage. Ajouter légumes sautés. Verser dans moule huilé. Cuire 20 min à 180°C.',
        'portions': 3,
        'ingredients': [
            ('Oeuf entier', 360), ('Poivron rouge', 120),
            ('Courgette', 120), ('Feta', 60),
            ('Epinards', 80), ('Lait demi-ecreme', 60),
        ],
    },
    {
        'nom': 'Crêpes à la farine de pois chiches',
        'desc': 'Crêpes sans gluten très riches en protéines végétales.',
        'instr': 'Mélanger farine de pois chiches, eau, huile et sel jusqu\'à texture lisse. Cuire dans poêle chaude 2 min par face. Garnir selon goût.',
        'portions': 2,
        'ingredients': [
            ('Farine de pois chiches', 120), ('Oeuf entier', 60),
            ('Fromage blanc 0%', 80), ('Tomates cerises', 80),
            ('Basilic frais', 10),
        ],
    },
    {
        'nom': 'Skyr mangue-passion-coco',
        'desc': 'Bol tropical crémeux, ultra-rapide et très protéiné.',
        'instr': 'Verser le skyr dans un bol. Ajouter la mangue en dés, lait de coco et graines de chia. Laisser gonfler 5 min.',
        'portions': 1,
        'ingredients': [
            ('Skyr nature', 200), ('Mangue', 100),
            ('Lait de coco', 50), ('Graines de chia', 15),
            ('Miel', 10),
        ],
    },
    {
        'nom': 'Tartines sarrasin avocat-œuf dur',
        'desc': 'Tartines express riches en bons gras et protéines complètes.',
        'instr': 'Faire cuire les œufs durs 10 min. Toaster le pain de sarrasin. Écraser l\'avocat avec citron et sel. Tartiner et garnir d\'œuf tranché et graines.',
        'portions': 1,
        'ingredients': [
            ('Pain de seigle', 60), ('Avocat', 100),
            ('Oeuf entier', 120), ('Citron vert jus', 10),
            ('Graines de sesame', 8), ('Tomates cerises', 50),
        ],
    },

    # ── DÉJEUNER (14) ──────────────────────────────────────────────────────────
    {
        'nom': 'Bol de boulgour poulet-zaatar',
        'desc': 'Bowl libanais parfumé aux herbes du Moyen-Orient.',
        'instr': 'Cuire le boulgour. Griller le poulet avec zaatar et huile d\'olive. Servir sur boulgour avec concombre, tomates et yaourt à la menthe.',
        'portions': 2,
        'ingredients': [
            ('Boulgour cuit', 200), ('Blanc de poulet', 200),
            ('Concombre', 100), ('Tomates', 120),
            ('Yaourt grec nature', 80), ('Huile d\'olive', 15),
        ],
    },
    {
        'nom': 'Salade roquette saumon-pamplemousse',
        'desc': 'Salade fraîche et légère, idéale en déjeuner vitaminé.',
        'instr': 'Disposer la roquette. Ajouter saumon fumé en lamelles, suprêmes de pamplemousse, avocat et câpres. Assaisonner huile d\'olive et citron.',
        'portions': 1,
        'ingredients': [
            ('Salade verte', 80), ('Saumon frais', 120),
            ('Pamplemousse', 150), ('Avocat', 80),
            ('Capres', 15), ('Huile d\'olive', 10),
        ],
    },
    {
        'nom': 'Nouilles de courgettes pesto-basilic',
        'desc': 'Spirali de courgettes fraîches avec pesto maison, plat de sèche très léger.',
        'instr': 'Spiraliser les courgettes. Mixer basilic, parmesan, noix, huile d\'olive et ail pour le pesto. Mélanger à froid avec les zoodles. Ajouter tomates cerises.',
        'portions': 2,
        'ingredients': [
            ('Courgette', 400), ('Basilic frais', 30),
            ('Parmesan rape', 30), ('Noix', 25),
            ('Huile d\'olive', 20), ('Tomates cerises', 100),
            ('Ail', 2),
        ],
    },
    {
        'nom': 'Bol de farro champignons-parmesan',
        'desc': 'Céréale ancienne riche en fibres et protéines, façon risotto.',
        'instr': 'Cuire le farro comme un risotto : nacrer, mouiller progressivement. Ajouter champignons sautés, parmesan et herbes fraîches.',
        'portions': 2,
        'ingredients': [
            ('Farro cuit', 200), ('Champignons de Paris', 200),
            ('Parmesan rape', 40), ('Oignons', 60),
            ('Huile d\'olive', 15), ('Basilic frais', 10),
        ],
    },
    {
        'nom': 'Salade asiatique bœuf-vermicelles',
        'desc': 'Salade tiède thaïe légère, fraîche et parfumée.',
        'instr': 'Tremper les vermicelles 5 min dans eau bouillante. Saisir le bœuf émincé à feu vif. Mélanger avec carottes râpées, concombre, coriandre, sauce soja et citron vert.',
        'portions': 2,
        'ingredients': [
            ('Vermicelles de riz', 100), ('Steak de boeuf maigre', 200),
            ('Carottes', 100), ('Concombre', 100),
            ('Coriandre fraiche', 15), ('Sauce soja legere', 20),
            ('Citron vert jus', 20),
        ],
    },
    {
        'nom': 'Soupe de tomates rôties-basilic',
        'desc': 'Soupe veloutée simple et savoureuse, à base de tomates confites au four.',
        'instr': 'Rôtir les tomates avec ail et oignons à 200°C 30 min. Mixer avec bouillon. Ajouter basilic et une cuillère de crème. Assaisonner.',
        'portions': 3,
        'ingredients': [
            ('Tomates', 600), ('Oignons', 100),
            ('Ail', 4), ('Basilic frais', 20),
            ('Huile d\'olive', 15), ('Creme legere 15%', 40),
        ],
    },
    {
        'nom': 'Bol de soba froid tofu-sésame',
        'desc': 'Bowl japonais froid, parfait en été, riche en protéines végétales.',
        'instr': 'Cuire les soba, refroidir sous l\'eau froide. Mariner le tofu dans sauce soja et gingembre, griller. Assembler avec concombre, graines de sésame et sauce soba froide.',
        'portions': 2,
        'ingredients': [
            ('Nouilles soba', 160), ('Tofu ferme', 150),
            ('Concombre', 100), ('Graines de sesame', 15),
            ('Sauce soja legere', 25), ('Gingembre frais', 8),
            ('Vinaigre de riz', 15),
        ],
    },
    {
        'nom': 'Tartare de saumon avocat-citron',
        'desc': 'Entrée ou plat léger, frais et élégant, riche en oméga-3.',
        'instr': 'Couper le saumon très frais en dés fins. Mélanger avec avocat, citron vert, oignons verts, sauce soja. Dresser en cercle et servir frais.',
        'portions': 2,
        'ingredients': [
            ('Saumon frais', 200), ('Avocat', 100),
            ('Citron vert jus', 20), ('Oignons verts', 20),
            ('Sauce soja legere', 10), ('Graines de sesame', 8),
        ],
    },
    {
        'nom': 'Quiche légère courgette-feta-menthe',
        'desc': 'Quiche sans pâte, version allégée à base de fromage blanc.',
        'instr': 'Battre œufs, fromage blanc, feta et menthe. Ajouter courgette râpée. Verser dans moule huilé. Cuire 35 min à 180°C.',
        'portions': 4,
        'ingredients': [
            ('Courgette', 300), ('Oeuf entier', 240),
            ('Feta', 80), ('Fromage blanc 0%', 120),
            ('Parmesan rape', 20),
        ],
    },
    {
        'nom': 'Lentilles beluga légumes rôtis',
        'desc': 'Bowl végétarien complet avec des lentilles noires riches en fer.',
        'instr': 'Cuire les lentilles. Rôtir betteraves et carottes à 200°C 25 min. Assembler avec sauce tahini-citron et graines de tournesol.',
        'portions': 2,
        'ingredients': [
            ('Lentilles vertes cuites', 200), ('Betterave cuite', 150),
            ('Carottes', 120), ('Tahini (puree sesame)', 30),
            ('Citron vert jus', 20), ('Graines tournesol', 20),
        ],
    },
    {
        'nom': 'Salade de pâtes complètes poulet-légumes',
        'desc': 'Salade de pâtes complète et équilibrée, parfaite pour la boîte à repas.',
        'instr': 'Cuire et refroidir les pâtes. Mélanger avec poulet grillé, légumes croquants, huile d\'olive et vinaigre balsamique.',
        'portions': 2,
        'ingredients': [
            ('Pates completes crues', 120), ('Blanc de poulet grille', 150),
            ('Poivron rouge', 100), ('Tomates cerises', 100),
            ('Olives vertes', 40), ('Huile d\'olive', 15),
            ('Vinaigre balsamique', 10),
        ],
    },
    {
        'nom': 'Club sandwich dinde-avocat',
        'desc': 'Sandwich triple étage équilibré, version sport du classique club.',
        'instr': 'Toaster le pain. Garnir : avocat écrasé, dinde émincée, tomate, salade et moutarde. Assembler en triple.',
        'portions': 1,
        'ingredients': [
            ('Pain complet', 90), ('Dinde emincee', 100),
            ('Avocat', 80), ('Tomates', 80),
            ('Salade verte', 30), ('Moutarde a lancienne', 10),
        ],
    },
    {
        'nom': 'Galettes de polenta aux herbes',
        'desc': 'Galettes croustillantes façon bruschetta italienne, sans gluten.',
        'instr': 'Cuire la polenta, ajouter parmesan et herbes. Étaler en plaque, réfrigérer 30 min. Couper en galettes, dorer à la poêle.',
        'portions': 3,
        'ingredients': [
            ('Polenta', 150), ('Parmesan rape', 40),
            ('Tomates cerises', 120), ('Basilic frais', 15),
            ('Huile d\'olive', 15),
        ],
    },
    {
        'nom': 'Wrap courgette-houmous-falafel',
        'desc': 'Wrap végétarien complet et savoureux, inspiré de la street food libanaise.',
        'instr': 'Réchauffer les falafels. Tartiner la tortilla d\'houmous. Ajouter courgette grillée, roquette, tomates et coriandre. Rouler serré.',
        'portions': 1,
        'ingredients': [
            ('Tortilla ble complet', 60), ('Pois chiches cuits', 100),
            ('Tahini (puree sesame)', 20), ('Courgette', 100),
            ('Tomates cerises', 60), ('Coriandre fraiche', 10),
        ],
    },

    # ── DÎNER (14) ─────────────────────────────────────────────────────────────
    {
        'nom': 'Poulet moutarde-estragon en cocotte',
        'desc': 'Plat mijoté classique allégé, saveurs intenses et sauce onctueuse.',
        'instr': 'Dorer le poulet. Déglacer avec bouillon, moutarde et crème légère. Ajouter estragon et laisser mijoter 30 min à couvert.',
        'portions': 3,
        'ingredients': [
            ('Blanc de poulet', 500), ('Moutarde a lancienne', 40),
            ('Creme legere 15%', 100), ('Champignons de Paris', 200),
            ('Oignons', 80), ('Huile d\'olive', 10),
        ],
    },
    {
        'nom': 'Cabillaud en croûte de noisettes',
        'desc': 'Filet de cabillaud croustillant avec une panure de noisettes dorée.',
        'instr': 'Mixer noisettes, persil, parmesan et citron. Enrober les filets de cette panure. Cuire 15 min à 200°C. Servir avec légumes vapeur.',
        'portions': 2,
        'ingredients': [
            ('Cabillaud', 320), ('Noisettes', 50),
            ('Parmesan rape', 25), ('Citron vert jus', 15),
            ('Huile d\'olive', 10), ('Brocoli fleur', 200),
        ],
    },
    {
        'nom': 'Curry vert thaï tofu-lait de coco',
        'desc': 'Curry végétalien parfumé, riche et crémeux.',
        'instr': 'Faire revenir la pâte de curry vert dans huile de coco. Ajouter lait de coco, pak choï, pois mange-tout. Incorporer le tofu et cuire 10 min.',
        'portions': 2,
        'ingredients': [
            ('Tofu ferme', 200), ('Lait de coco', 250),
            ('Pak choi', 150), ('Pois mange-tout', 100),
            ('Gingembre frais', 10), ('Sauce soja legere', 15),
            ('Riz jasmin cru', 80),
        ],
    },
    {
        'nom': 'Pavé de thon saisi herbes de Provence',
        'desc': 'Thon rosé au cœur, croûte parfumée, prêt en 10 minutes.',
        'instr': 'Enrober le pavé d\'herbes de Provence et huile d\'olive. Saisir 2 min par face à feu très vif. Servir avec salade de tomates et câpres.',
        'portions': 2,
        'ingredients': [
            ('Thon frais', 300), ('Tomates', 200),
            ('Capres', 20), ('Huile d\'olive', 15),
            ('Citron vert jus', 15), ('Basilic frais', 10),
        ],
    },
    {
        'nom': 'Gratin de pâtes poulet-épinards',
        'desc': 'Gratin complet et réconfortant, version équilibrée sans béchamel.',
        'instr': 'Cuire les pâtes. Mélanger avec poulet, épinards et sauce tomate légère. Couvrir de fromage râpé. Gratiner 20 min à 200°C.',
        'portions': 4,
        'ingredients': [
            ('Pates completes crues', 200), ('Blanc de poulet', 300),
            ('Epinards', 200), ('Tomates', 300),
            ('Emmental', 60), ('Ail', 3),
        ],
    },
    {
        'nom': 'Maquereau grillé sauce vierge',
        'desc': 'Poisson bleu oméga-3 avec une sauce fraîche tomate-câpres-citron.',
        'instr': 'Marquer les filets de maquereau à feu vif 3 min par face. Préparer la sauce vierge : tomates concassées, câpres, basilic, citron, huile d\'olive.',
        'portions': 2,
        'ingredients': [
            ('Maquereau frais', 300), ('Tomates', 150),
            ('Capres', 20), ('Basilic frais', 15),
            ('Huile d\'olive', 15), ('Citron vert jus', 15),
        ],
    },
    {
        'nom': 'Poulet aux figues et amandes',
        'desc': 'Tagine sucré-salé inspiré de la cuisine marocaine.',
        'instr': 'Dorer le poulet. Ajouter oignons, figues, amandes, miel et ras el hanout. Mouiller bouillon. Mijoter 35 min.',
        'portions': 3,
        'ingredients': [
            ('Blanc de poulet', 450), ('Figues sechees', 80),
            ('Amandes', 50), ('Oignons', 100),
            ('Miel', 20), ('Curcuma poudre', 5),
        ],
    },
    {
        'nom': 'Côtelettes d\'agneau grillées ail-herbes',
        'desc': 'Côtelettes juteuses marinées aux herbes méditerranéennes, cuisson minute.',
        'instr': 'Mariner les côtelettes avec ail, romarin, huile d\'olive et citron 1h. Griller 4 min par face. Servir avec salade de roquette.',
        'portions': 2,
        'ingredients': [
            ('Cotelettes agneau', 350), ('Ail', 4),
            ('Huile d\'olive', 20), ('Citron vert jus', 20),
            ('Salade verte', 80), ('Tomates cerises', 80),
        ],
    },
    {
        'nom': 'Joue de bœuf braisée à la tomate',
        'desc': 'Plat mijoté fondant à la viande tendre, idéal pour un dimanche sportif.',
        'instr': 'Saisir les joues. Ajouter tomates, oignons, carottes et bouillon. Mijoter 2h à 160°C à couvert. Servir avec polenta crémeuse.',
        'portions': 4,
        'ingredients': [
            ('Joue de boeuf', 600), ('Tomates', 300),
            ('Carottes', 150), ('Oignons', 100),
            ('Polenta', 120), ('Huile d\'olive', 15),
        ],
    },
    {
        'nom': 'Lasagnes de courgettes bolognaise',
        'desc': 'Lasagnes légères avec tranches de courgettes en guise de feuilles, sans pâtes.',
        'instr': 'Trancher les courgettes à la mandoline. Préparer bolognaise allégée. Alterner couches courgettes-bolognaise-ricotta. Gratiner 30 min à 185°C.',
        'portions': 4,
        'ingredients': [
            ('Courgette', 500), ('Boeuf hache 5% MG', 300),
            ('Tomates', 300), ('Ricotta', 150),
            ('Parmesan rape', 40), ('Oignons', 80),
        ],
    },
    {
        'nom': 'Polenta crémeuse champignons-truffe',
        'desc': 'Polenta veloutée réconfortante, végétarienne et élégante.',
        'instr': 'Cuire la polenta dans lait et bouillon. Incorporer parmesan et beurre. Servir avec poêlée de champignons à l\'huile d\'olive et thym.',
        'portions': 2,
        'ingredients': [
            ('Polenta', 120), ('Champignons de Paris', 250),
            ('Parmesan rape', 50), ('Lait demi-ecreme', 200),
            ('Beurre demi-sel', 15), ('Ail', 2),
        ],
    },
    {
        'nom': 'Sole meunière légère aux câpres',
        'desc': 'Poisson blanc très maigre, cuisson classique revisitée allégée.',
        'instr': 'Fariner légèrement les filets. Cuire dans peu de beurre demi-sel 2 min par face. Déglacer avec citron et câpres. Servir avec haricots verts vapeur.',
        'portions': 2,
        'ingredients': [
            ('Sole filet', 280), ('Capres', 20),
            ('Citron vert jus', 20), ('Beurre demi-sel', 15),
            ('Haricots verts', 200),
        ],
    },
    {
        'nom': 'Truite fumée salade tiède pommes de terre',
        'desc': 'Salade tiède bretonne classique, riche en oméga-3.',
        'instr': 'Cuire les pommes de terre à la vapeur. Tiédir. Dresser avec truite fumée effilochée, câpres, moutarde et vinaigrette légère.',
        'portions': 2,
        'ingredients': [
            ('Truite fumee', 160), ('Pomme de terre cuite', 300),
            ('Capres', 20), ('Moutarde a lancienne', 15),
            ('Huile d\'olive', 10), ('Salade verte', 60),
        ],
    },
    {
        'nom': 'Bowl crevettes épicées riz-mangue',
        'desc': 'Bowl coloré et exotique, avec crevettes marinées pimentées.',
        'instr': 'Mariner les crevettes dans sauce sriracha, citron et gingembre. Sauter 3 min. Servir sur riz jasmin avec dés de mangue et edamame.',
        'portions': 2,
        'ingredients': [
            ('Crevettes crues', 250), ('Riz jasmin cru', 120),
            ('Mangue', 120), ('Edamame ecale', 80),
            ('Sauce sriracha', 15), ('Citron vert jus', 20),
            ('Gingembre frais', 8),
        ],
    },

    # ── SNACKS (9) ────────────────────────────────────────────────────────────
    {
        'nom': 'Falafels au four sauce tahini',
        'desc': 'Boulettes de pois chiches croustillantes au four sans friture.',
        'instr': 'Mixer pois chiches, ail, oignon, persil, cumin. Former des boulettes. Cuire 25 min à 200°C en retournant à mi-cuisson. Servir avec sauce tahini-citron.',
        'portions': 3,
        'ingredients': [
            ('Pois chiches cuits', 300), ('Ail', 3),
            ('Oignons', 50), ('Coriandre fraiche', 15),
            ('Tahini (puree sesame)', 40), ('Citron vert jus', 20),
        ],
    },
    {
        'nom': 'Bouchées de poulet teriyaki',
        'desc': 'Nuggets maison laqués à la sauce teriyaki, parfaits en snack.',
        'instr': 'Découper le poulet en cubes. Mariner dans sauce teriyaki 20 min. Rouler dans graines de sésame. Cuire à l\'airfryer 12 min à 190°C.',
        'portions': 2,
        'ingredients': [
            ('Blanc de poulet', 250), ('Sauce soja legere', 30),
            ('Miel', 20), ('Graines de sesame', 15),
            ('Gingembre frais', 5),
        ],
    },
    {
        'nom': 'Tzatziki maison crudités',
        'desc': 'Sauce grecque fraîche et légère pour tremper les légumes.',
        'instr': 'Râper et essorer le concombre. Mélanger avec yaourt grec, ail écrasé, aneth, huile d\'olive et citron. Réfrigérer 30 min.',
        'portions': 4,
        'ingredients': [
            ('Yaourt grec nature', 250), ('Concombre', 200),
            ('Ail', 2), ('Citron vert jus', 15),
            ('Huile d\'olive', 10), ('Carotte', 100),
        ],
    },
    {
        'nom': 'Energy balls cacao-noix de coco',
        'desc': 'Boules d\'énergie sans cuisson au goût chocolaté et exotique.',
        'instr': 'Mixer dattes, flocons d\'avoine, noix de cajou, cacao et lait de coco jusqu\'à obtenir une pâte. Rouler en billes. Enrober de coco râpée.',
        'portions': 4,
        'ingredients': [
            ('Flocons d\'avoine', 80), ('Noix de cajou', 60),
            ('Chocolat noir 70%', 30), ('Lait de coco', 40),
            ('Miel', 20), ('Graines de chia', 10),
        ],
    },
    {
        'nom': 'Chips de kale citron-sel',
        'desc': 'Chips végétalienne ultra-croustillante, riche en vitamines K et C.',
        'instr': 'Déchirer le kale en morceaux. Mélanger avec huile d\'olive, sel et zeste de citron. Enfourner 15 min à 150°C en surveillant.',
        'portions': 2,
        'ingredients': [
            ('Kale', 150), ('Huile d\'olive', 10),
            ('Levure nutritionnelle', 15), ('Citron vert jus', 10),
        ],
    },
    {
        'nom': 'Tuiles parmesan-graines',
        'desc': 'Biscuits croquants ultra-simples à 2 ingrédients, snack keto.',
        'instr': 'Former des petits tas de parmesan mélangé à graines sur plaque. Enfourner 8 min à 180°C. Laisser refroidir pour que ça croustille.',
        'portions': 2,
        'ingredients': [
            ('Parmesan rape', 80), ('Graines tournesol', 30),
            ('Graines de sesame', 15), ('Graines de lin', 15),
        ],
    },
    {
        'nom': 'Tartines au beurre d\'amande et banane',
        'desc': 'Collation équilibrée avec glucides complexes et bons gras.',
        'instr': 'Toaster le pain complet. Tartiner de beurre d\'amande. Ajouter rondelles de banane et une pincée de cannelle.',
        'portions': 1,
        'ingredients': [
            ('Pain complet', 50), ('Beurre d\'amande', 25),
            ('Banane', 100), ('Cannelle', 1),
            ('Miel', 8),
        ],
    },
    {
        'nom': 'Mini-brochettes de mozzarella tomates',
        'desc': 'Snack caprese classique en bouchées, simple et anti-inflammatoire.',
        'instr': 'Alterner sur mini-piques : bille de mozzarella, feuille de basilic, tomate cerise. Assaisonner huile d\'olive, vinaigre balsamique et fleur de sel.',
        'portions': 2,
        'ingredients': [
            ('Mozzarella', 125), ('Tomates cerises', 150),
            ('Basilic frais', 10), ('Huile d\'olive', 10),
            ('Vinaigre balsamique', 10),
        ],
    },
    {
        'nom': 'Compote pomme-poire-cannelle maison',
        'desc': 'Compote sans sucre ajouté, naturellement sucrée et digeste.',
        'instr': 'Éplucher et couper les fruits. Cuire à feu doux 20 min avec cannelle et un filet d\'eau. Mixer selon texture souhaitée.',
        'portions': 4,
        'ingredients': [
            ('Pomme', 300), ('Poire', 200),
            ('Cannelle', 3), ('Citron vert jus', 10),
        ],
    },

    # ── SHAKES & SMOOTHIES (5) ─────────────────────────────────────────────────
    {
        'nom': 'Shake masse chocolat blanc-avoine',
        'desc': 'Shake hypercalorique pour la prise de masse, saveur chocolat blanc.',
        'instr': 'Mixer lait entier, flocons d\'avoine, whey chocolat, beurre d\'amande et banane.',
        'portions': 1,
        'ingredients': [
            ('Lait demi-ecreme', 300), ('Flocons d\'avoine', 60),
            ('Whey proteine (vanille)', 40), ('Beurre d\'amande', 30),
            ('Banane', 100),
        ],
    },
    {
        'nom': 'Smoothie detox concombre-citron-menthe',
        'desc': 'Boisson détox alcalinisante, parfaite le matin à jeun ou après un entraînement.',
        'instr': 'Mixer concombre pelé, citron pressé, quelques feuilles de menthe, gingembre et eau froide. Servir avec des glaçons.',
        'portions': 1,
        'ingredients': [
            ('Concombre', 200), ('Citron vert jus', 30),
            ('Gingembre frais', 8), ('Kiwi', 80),
            ('Graines de chia', 10),
        ],
    },
    {
        'nom': 'Shake post-workout framboise-vanille',
        'desc': 'Shake récupération antioxydant, riche en protéines et glucides rapides.',
        'instr': 'Mixer framboises, whey vanille, yaourt grec et lait d\'amande. Ajouter miel selon besoin en glucides.',
        'portions': 1,
        'ingredients': [
            ('Framboises', 150), ('Whey proteine (vanille)', 35),
            ('Yaourt grec nature', 100), ('Lait demi-ecreme', 150),
            ('Miel', 15),
        ],
    },
    {
        'nom': 'Lait d\'or cardamome-gingembre',
        'desc': 'Boisson ayurvédique anti-inflammatoire, variante du golden milk.',
        'instr': 'Chauffer le lait de coco avec curcuma, cardamome, gingembre frais et poivre noir. Sucrer légèrement au miel. Servir chaud.',
        'portions': 1,
        'ingredients': [
            ('Lait de coco', 200), ('Curcuma poudre', 4),
            ('Cardamome', 2), ('Gingembre frais', 8),
            ('Miel', 12),
        ],
    },
    {
        'nom': 'Shake recovery caramel beurre salé',
        'desc': 'Shake gourmand post-effort avec une touche de caramel naturel et sel de mer.',
        'instr': 'Mixer lait, whey vanille, beurre d\'amande, dattes dénoyautées et une pincée de fleur de sel. Servir froid.',
        'portions': 1,
        'ingredients': [
            ('Lait demi-ecreme', 250), ('Whey proteine (vanille)', 35),
            ('Beurre d\'amande', 25), ('Banane', 80),
            ('Flocons d\'avoine', 30),
        ],
    },
]


def make_placeholder(color='#1e293b'):
    img = Image.new('RGB', (400, 300), color)
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=85)
    return buf.getvalue()


COLORS = [
    '#1e3a5f', '#1a3a2e', '#3d1a1a', '#2d1a3d', '#1a2d3d',
    '#3d2a1a', '#1a3d2a', '#3d1a2d', '#2a3d1a', '#1a1a3d',
]


class Command(BaseCommand):
    help = 'Pack 4 — 50 nouvelles recettes mix général'

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        coach = User.objects.filter(role='coach').first()
        if not coach:
            self.stderr.write('Aucun coach trouvé.')
            return

        # ── Aliments ──────────────────────────────────────────────────────────
        created_al = 0
        for d in NOUVEAUX_ALIMENTS:
            _, c = Aliment.objects.get_or_create(
                nom=d['nom'],
                defaults={
                    'calories_100g':  d['cal'],
                    'proteines_100g': d['prot'],
                    'glucides_100g':  d['gluc'],
                    'lipides_100g':   d['lip'],
                },
            )
            if c:
                self.stdout.write(f'  🥕 {d["nom"]}')
                created_al += 1
        self.stdout.write(self.style.SUCCESS(f'→ {created_al} aliments créés\n'))

        aliment_map = {a.nom.lower(): a for a in Aliment.objects.all()}

        def resolve(nom):
            al = aliment_map.get(nom.lower())
            if not al:
                # recherche partielle
                al = next((v for k, v in aliment_map.items() if nom.lower() in k), None)
            return al

        # ── Recettes ──────────────────────────────────────────────────────────
        created_r = 0
        for i, data in enumerate(RECETTES):
            if Recette.objects.filter(nom=data['nom'], coach=coach).exists():
                self.stdout.write(f'  — (déjà présente) {data["nom"]}')
                continue

            recette = Recette.objects.create(
                nom=data['nom'],
                description=data['desc'],
                instructions=data['instr'],
                portions=data['portions'],
                coach=coach,
            )

            img_data = make_placeholder(COLORS[i % len(COLORS)])
            recette.photo.save(f'{recette.id}.jpg', ContentFile(img_data), save=True)

            for nom_al, qte_g in data['ingredients']:
                al = resolve(nom_al)
                if al:
                    IngredientRecette.objects.create(
                        recette=recette, aliment=al, quantite_g=float(qte_g),
                    )
                else:
                    self.stdout.write(self.style.WARNING(f'    ⚠ {nom_al}'))

            self.stdout.write(f'  ✓ {data["nom"]}')
            created_r += 1

        total = Recette.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ {created_r} recettes créées — {total} recettes au total'
        ))

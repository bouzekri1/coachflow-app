"""
Ajoute ~50 nouvelles recettes + les aliments manquants.
Utilise les aliments existants au maximum.
"""
import io
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import User, Recette, IngredientRecette, Aliment

# ── Aliments à créer s'ils n'existent pas ─────────────────────────────────────
NOUVEAUX_ALIMENTS = [
    # nom, cat, cal, prot, gluc, lip, fibres (pour 100g)
    ("Dinde hachee", "viandes", 120, 22, 0, 3.5, 0),
    ("Filet mignon porc", "viandes", 143, 22, 0, 6, 0),
    ("Crevettes crues", "poissons", 85, 18, 0.9, 1, 0),
    ("Thon frais", "poissons", 144, 23, 0, 6, 0),
    ("Maquereau fume", "poissons", 262, 19, 0, 20, 0),
    ("Sardines en conserve", "poissons", 185, 20, 0, 11, 0),
    ("Tofu ferme", "legumineuses", 76, 8, 2, 4, 0.3),
    ("Tempeh", "legumineuses", 195, 20, 8, 11, 0),
    ("Edamame ecale", "legumineuses", 122, 11, 10, 5, 5),
    ("Feta", "laitiers", 264, 14, 4, 21, 0),
    ("Ricotta", "laitiers", 174, 11, 3, 13, 0),
    ("Mozzarella", "laitiers", 280, 28, 2, 17, 0),
    ("Parmesan rape", "laitiers", 431, 38, 3, 29, 0),
    ("Fromage de chevre", "laitiers", 364, 22, 2, 30, 0),
    ("Creme legere 15%", "laitiers", 150, 3, 4, 15, 0),
    ("Tahini (puree sesame)", "huiles_graisses", 595, 17, 21, 54, 9),
    ("Noix de cajou", "oleagineux", 553, 18, 30, 44, 3),
    ("Pistaches", "oleagineux", 562, 20, 28, 45, 10),
    ("Graines de chia", "cereales", 486, 17, 42, 31, 34),
    ("Graines de lin", "cereales", 534, 18, 29, 42, 27),
    ("Flocons de quinoa", "cereales", 368, 14, 65, 6, 7),
    ("Farine d'avoine", "cereales", 375, 13, 65, 7, 8),
    ("Farine de sarrasin", "cereales", 343, 13, 71, 3, 10),
    ("Pain de seigle", "cereales", 258, 9, 48, 3, 7),
    ("Tortilla ble complet", "cereales", 218, 6, 38, 5, 6),
    ("Nouilles soba", "cereales", 99, 5, 21, 0.1, 0),
    ("Riz complet cru", "cereales", 362, 8, 76, 3, 3.5),
    ("Patate douce crue", "legumes", 86, 2, 20, 0, 3),
    ("Courge butternut", "legumes", 45, 1, 10, 0.1, 2),
    ("Aubergine", "legumes", 25, 1, 6, 0.2, 3),
    ("Poivron vert", "legumes", 20, 1, 4, 0.2, 1.7),
    ("Poivron jaune", "legumes", 27, 1, 6, 0.2, 0.9),
    ("Brocoli fleur", "legumes", 34, 3, 7, 0.4, 2.6),
    ("Pois mange-tout", "legumes", 42, 3, 8, 0.2, 2.6),
    ("Betterave cuite", "legumes", 44, 2, 10, 0.2, 2),
    ("Artichaut", "legumes", 47, 3, 11, 0.2, 5.4),
    ("Pak choi", "legumes", 13, 1.5, 2, 0.2, 1),
    ("Asperges vertes", "legumes", 20, 2, 4, 0.1, 2.1),
    ("Fenouil", "legumes", 31, 1.2, 7, 0.2, 3.1),
    ("Petits pois surgeles", "legumes", 73, 5, 13, 0.4, 5),
    ("Lentilles vertes cuites", "legumineuses", 116, 9, 20, 0.4, 8),
    ("Pois chiches seches cuits", "legumineuses", 164, 9, 27, 2.6, 8),
    ("Haricots blancs cuits", "legumineuses", 127, 9, 23, 0.5, 6),
    ("Cranberries sechees", "fruits", 325, 0.1, 82, 1.4, 5),
    ("Framboises", "fruits", 52, 1.2, 12, 0.7, 6.5),
    ("Pasteque", "fruits", 30, 0.6, 7.5, 0.2, 0.4),
    ("Pomme verte", "fruits", 52, 0.3, 14, 0.2, 2.4),
    ("Poire", "fruits", 57, 0.4, 15, 0.1, 3.1),
    ("Citron vert jus", "fruits", 25, 0.4, 8, 0.2, 0.3),
    ("Gingembre frais", "epices", 80, 1.8, 18, 0.8, 2),
    ("Curcuma poudre", "epices", 354, 8, 65, 10, 21),
    ("Paprika fume", "epices", 282, 14, 55, 13, 35),
    ("Sauce soja legere", "sauces_condiments", 60, 8, 6, 0.1, 0.8),
    ("Vinaigre balsamique", "sauces_condiments", 88, 0.5, 17, 0, 0),
    ("Moutarde a lancienne", "sauces_condiments", 140, 6, 8, 10, 3),
    ("Sauce tabasco", "sauces_condiments", 30, 1, 6, 0.2, 0),
    ("Coriandre fraiche", "epices", 23, 2, 4, 0.5, 2.8),
    ("Basilic frais", "epices", 23, 3, 3, 0.6, 1.6),
    ("Graines de sesame", "oleagineux", 573, 18, 23, 50, 12),
]

# ── Nouvelles recettes ─────────────────────────────────────────────────────────
NOUVELLES_RECETTES = [
    # ─── PETIT-DÉJEUNER ───────────────────────────────────────────────────────
    {
        "nom": "Pancakes protéinés avoine-banane",
        "description": "Pancakes moelleux sans sucre ajouté, naturellement sucrés par la banane.",
        "instructions": "1. Mixer 80g de farine d'avoine, 1 banane, 2 oeufs, 30g de whey vanille et 80ml de lait.\n2. Cuire en petites galettes dans une poêle anti-adhésive.\n3. Servir avec des myrtilles fraîches.",
        "portions": 2,
        "emoji": "🥞", "couleur": "#D97706", "bg": "#FFFBEB",
        "ingredients": [("Farine d'avoine", 80), ("Banane", 100), ("Oeuf entier", 100), ("Whey proteine (vanille)", 30), ("Lait demi-ecreme", 80), ("Myrtilles", 80)],
    },
    {
        "nom": "Chia pudding coco-mangue",
        "description": "Pudding de nuit crémeux aux graines de chia et lait de coco, garni de mangue.",
        "instructions": "1. Mélanger 40g de graines de chia avec 250ml de lait de coco.\n2. Réfrigérer une nuit.\n3. Garnir de mangue en dés et noix de cajou.",
        "portions": 1,
        "emoji": "🥥", "couleur": "#059669", "bg": "#D1FAE5",
        "ingredients": [("Graines de chia", 40), ("Mangue", 120), ("Noix de cajou", 20)],
    },
    {
        "nom": "Overnight oats pomme-cannelle",
        "description": "Avoine préparée la nuit avec pomme râpée et cannelle. Prêt à manger le matin.",
        "instructions": "1. Mélanger 70g de flocons d'avoine, 200ml de lait, 10g de graines de chia, cannelle.\n2. Réfrigérer une nuit.\n3. Garnir le matin avec pomme verte râpée et miel.",
        "portions": 1,
        "emoji": "🍎", "couleur": "#DC2626", "bg": "#FEF2F2",
        "ingredients": [("Flocons d'avoine", 70), ("Lait demi-ecreme", 200), ("Graines de chia", 10), ("Pomme verte", 120), ("Miel", 10)],
    },
    {
        "nom": "Smoothie vert épinards-ananas-gingembre",
        "description": "Smoothie détox vert riche en micronutriments et protéines de chanvre.",
        "instructions": "1. Mixer épinards, ananas, gingembre frais et eau de coco.\n2. Servir frais avec des glaçons.",
        "portions": 1,
        "emoji": "🥤", "couleur": "#16A34A", "bg": "#F0FDF4",
        "ingredients": [("Epinards", 80), ("Ananas", 150), ("Gingembre frais", 10), ("Lait demi-ecreme", 150)],
    },
    {
        "nom": "Omelette aux poivrons tricolores",
        "description": "Omelette colorée avec poivrons rouge, vert et jaune. Riche en vitamines.",
        "instructions": "1. Émincer les poivrons et faire revenir 3 min à l'huile d'olive.\n2. Battre 3 oeufs avec sel et poivre.\n3. Verser sur les légumes et cuire à feu doux. Rouler.",
        "portions": 1,
        "emoji": "🍳", "couleur": "#D97706", "bg": "#FEF3C7",
        "ingredients": [("Oeuf entier", 150), ("Poivron rouge", 60), ("Poivron vert", 60), ("Poivron jaune", 60), ("Huile d'olive", 8)],
    },
    {
        "nom": "Toast ricotta et framboises",
        "description": "Toast croustillant avec ricotta légère et framboises fraîches. Rafraîchissant.",
        "instructions": "1. Griller 2 tranches de pain complet.\n2. Étaler 80g de ricotta.\n3. Garnir de framboises fraîches et d'un filet de miel.",
        "portions": 1,
        "emoji": "🍓", "couleur": "#DB2777", "bg": "#FDF2F8",
        "ingredients": [("Pain complet", 80), ("Ricotta", 80), ("Framboises", 100), ("Miel", 10)],
    },
    {
        "nom": "Bowl açaï banane-myrtilles",
        "description": "Bowl énergisant à base de banane mixée et myrtilles. Sans gluten.",
        "instructions": "1. Mixer 1 banane surgelée avec 100g de myrtilles surgelées.\n2. Verser dans un bol épais.\n3. Garnir de granola, tranches de banane et graines de chia.",
        "portions": 1,
        "emoji": "🫐", "couleur": "#7C3AED", "bg": "#EDE9FE",
        "ingredients": [("Banane", 150), ("Myrtilles", 100), ("Flocons d'avoine", 40), ("Graines de chia", 10)],
    },
    {
        "nom": "Œufs Benedict revisités (sans hollandaise)",
        "description": "Pain complet, jambon et oeuf poché avec sauce yaourt-moutarde légère.",
        "instructions": "1. Griller le pain complet. Pocher les oeufs 3 min.\n2. Préparer la sauce : yaourt grec, moutarde à l'ancienne, citron, sel.\n3. Assembler sur le pain et napper de sauce.",
        "portions": 1,
        "emoji": "🥚", "couleur": "#CA8A04", "bg": "#FEFCE8",
        "ingredients": [("Pain complet", 80), ("Jambon blanc degraisse", 60), ("Oeuf entier", 100), ("Yaourt grec nature", 60), ("Moutarde a lancienne", 10)],
    },
    {
        "nom": "Muffins protéinés banane-pépites chocolat",
        "description": "Muffins moelleux enrichis en protéines. Parfaits pour le meal prep.",
        "instructions": "1. Mixer 2 bananes avec 2 oeufs, 150g de farine d'avoine, 30g de whey chocolat et un peu de lait.\n2. Incorporer des pépites de chocolat noir.\n3. Cuire 20 min à 180°C.",
        "portions": 6,
        "emoji": "🧁", "couleur": "#78350F", "bg": "#FEF3C7",
        "ingredients": [("Banane", 200), ("Oeuf entier", 100), ("Farine d'avoine", 150), ("Whey proteine (vanille)", 30), ("Chocolat noir 70%", 40), ("Lait demi-ecreme", 60)],
    },
    {
        "nom": "Tartine sarrasin saumon-avocat",
        "description": "Tartine de pain de sarrasin avec saumon frais et avocat. Riche en oméga-3.",
        "instructions": "1. Griller 2 tranches de pain de sarrasin.\n2. Écraser l'avocat avec citron vert et sel.\n3. Disposer des lamelles de saumon frais (ou fumé) et graines de sésame.",
        "portions": 1,
        "emoji": "🐟", "couleur": "#0284C7", "bg": "#E0F2FE",
        "ingredients": [("Farine de sarrasin", 80), ("Saumon frais", 100), ("Avocat", 80), ("Citron vert jus", 20), ("Graines de sesame", 10)],
    },

    # ─── DÉJEUNER ─────────────────────────────────────────────────────────────
    {
        "nom": "Salade de quinoa et légumes rôtis",
        "description": "Salade complète avec quinoa, légumes rôtis et vinaigrette tahini.",
        "instructions": "1. Rôtir courgette, poivron et aubergine 25 min à 200°C.\n2. Cuire 80g de quinoa.\n3. Préparer sauce tahini : tahini, citron, ail, eau.\n4. Mélanger et servir tiède.",
        "portions": 1,
        "emoji": "🥗", "couleur": "#65A30D", "bg": "#F7FEE7",
        "ingredients": [("Quinoa cuit", 150), ("Courgette", 100), ("Aubergine", 100), ("Poivron rouge", 80), ("Tahini (puree sesame)", 20), ("Huile d'olive", 10)],
    },
    {
        "nom": "Bowl thaï poulet-cacahuète",
        "description": "Bowl exotique avec poulet sauté en sauce cacahuète et riz basmati.",
        "instructions": "1. Émincer et faire revenir le poulet au wok avec ail et gingembre.\n2. Sauce : beurre de cacahuète, sauce soja légère, citron vert, eau chaude.\n3. Mélanger poulet et sauce sur riz.",
        "portions": 1,
        "emoji": "🥜", "couleur": "#92400E", "bg": "#FFFBEB",
        "ingredients": [("Blanc de poulet", 150), ("Riz blanc cuit", 150), ("Beurre de cacahuete", 25), ("Sauce soja legere", 15), ("Gingembre frais", 8), ("Pois mange-tout", 80)],
    },
    {
        "nom": "Salade de lentilles vertes et feta",
        "description": "Salade méditerranéenne de lentilles, feta et légumes frais.",
        "instructions": "1. Cuire les lentilles vertes al dente. Refroidir.\n2. Mélanger avec concombre, tomates cerises, feta émiettée.\n3. Assaisonner huile d'olive, vinaigre balsamique, herbes.",
        "portions": 1,
        "emoji": "🫘", "couleur": "#166534", "bg": "#F0FDF4",
        "ingredients": [("Lentilles vertes cuites", 180), ("Feta", 60), ("Tomates", 100), ("Concombre", 80), ("Huile d'olive", 12), ("Vinaigre balsamique", 10)],
    },
    {
        "nom": "Wraps de dinde et guacamole",
        "description": "Wraps complets avec dinde hachée épicée et guacamole maison.",
        "instructions": "1. Faire revenir dinde hachée avec paprika fumé, cumin, ail.\n2. Préparer guacamole : avocat, citron vert, oignon, coriandre.\n3. Garnir les tortillas et rouler.",
        "portions": 2,
        "emoji": "🌯", "couleur": "#15803D", "bg": "#F0FDF4",
        "ingredients": [("Dinde hachee", 200), ("Tortilla ble complet", 80), ("Avocat", 100), ("Citron vert jus", 20), ("Coriandre fraiche", 10), ("Paprika fume", 5)],
    },
    {
        "nom": "Poêlée de tofu aux légumes asiatiques",
        "description": "Tofu mariné sauté avec légumes asiatiques et nouilles soba.",
        "instructions": "1. Presser et mariner 200g de tofu ferme dans sauce soja, sésame, gingembre.\n2. Faire revenir au wok avec pak choi, carottes et pois mange-tout.\n3. Servir sur nouilles soba.",
        "portions": 1,
        "emoji": "🥢", "couleur": "#0F766E", "bg": "#F0FDFA",
        "ingredients": [("Tofu ferme", 200), ("Nouilles soba", 80), ("Pak choi", 100), ("Carottes", 80), ("Pois mange-tout", 60), ("Sauce soja legere", 15), ("Graines de sesame", 10)],
    },
    {
        "nom": "Sardines grillées sur pain complet",
        "description": "Protéines marines accessibles et riches en oméga-3 sur toast.",
        "instructions": "1. Égoutter les sardines et disposer sur du pain complet grillé.\n2. Garnir de tomates cerises, olives, jus de citron et persil.\n3. Assaisonner d'huile d'olive.",
        "portions": 1,
        "emoji": "🐠", "couleur": "#1E40AF", "bg": "#EFF6FF",
        "ingredients": [("Sardines en conserve", 135), ("Pain complet", 80), ("Tomates", 80), ("Huile d'olive", 8)],
    },
    {
        "nom": "Curry de pois chiches épinards",
        "description": "Curry végétarien express aux pois chiches et épinards. Riche en protéines végétales.",
        "instructions": "1. Faire revenir oignon, ail, gingembre, curry, cumin.\n2. Ajouter pois chiches égouttés et tomates concassées.\n3. Cuire 15 min, ajouter épinards 2 min avant la fin. Servir avec riz.",
        "portions": 2,
        "emoji": "🍛", "couleur": "#B45309", "bg": "#FEF3C7",
        "ingredients": [("Pois chiches seches cuits", 300), ("Epinards", 150), ("Tomates", 200), ("Lait demi-ecreme", 100), ("Riz blanc cuit", 200), ("Huile d'olive", 12)],
    },
    {
        "nom": "Bowl saumon teriyaki-edamame",
        "description": "Bowl japonais avec saumon laqué, edamame, avocat et riz sushi.",
        "instructions": "1. Préparer sauce teriyaki maison (sauce soja, mirin, miel).\n2. Glacer le saumon à la poêle.\n3. Assembler le bowl avec riz, edamame, avocat et graines de sésame.",
        "portions": 1,
        "emoji": "🍱", "couleur": "#0369A1", "bg": "#E0F2FE",
        "ingredients": [("Saumon frais", 150), ("Riz blanc cuit", 150), ("Edamame ecale", 80), ("Avocat", 60), ("Sauce soja legere", 20), ("Miel", 10), ("Graines de sesame", 8)],
    },
    {
        "nom": "Soupe de betterave au fromage de chèvre",
        "description": "Velouté de betterave naturellement sucré avec crème de chèvre.",
        "instructions": "1. Cuire les betteraves dans le bouillon 20 min.\n2. Mixer avec le bouillon, gingembre et citron.\n3. Servir avec une quenelle de fromage de chèvre.",
        "portions": 2,
        "emoji": "🫖", "couleur": "#9F1239", "bg": "#FFF1F2",
        "ingredients": [("Betterave cuite", 400), ("Fromage de chevre", 60), ("Gingembre frais", 10), ("Lait demi-ecreme", 100)],
    },
    {
        "nom": "Quesadillas poulet-poivron",
        "description": "Quesadillas croustillantes avec poulet épicé, poivrons et fromage fondu.",
        "instructions": "1. Faire revenir poulet émincé avec poivrons et épices tex-mex.\n2. Garnir une moitié de tortilla avec le mélange et fromage râpé.\n3. Plier et dorer à la poêle 2 min de chaque côté.",
        "portions": 1,
        "emoji": "🫓", "couleur": "#C2410C", "bg": "#FFF7ED",
        "ingredients": [("Blanc de poulet", 130), ("Tortilla ble complet", 80), ("Poivron rouge", 80), ("Emmental", 40), ("Huile d'olive", 8)],
    },
    {
        "nom": "Salade tiède de quinoa et asperges",
        "description": "Salade tiède printanière avec quinoa, asperges grillées et parmesan.",
        "instructions": "1. Cuire le quinoa. Griller les asperges à la poêle 5 min.\n2. Mélanger tiède avec vinaigrette citron-moutarde.\n3. Parsemer de parmesan râpé.",
        "portions": 1,
        "emoji": "🌿", "couleur": "#15803D", "bg": "#F0FDF4",
        "ingredients": [("Quinoa cuit", 150), ("Asperges vertes", 200), ("Parmesan rape", 20), ("Huile d'olive", 12), ("Moutarde a lancienne", 10)],
    },
    {
        "nom": "Bol de riz complet aux haricots noirs",
        "description": "Bowl végétarien mexicain complet avec haricots noirs, avocat et maïs.",
        "instructions": "1. Cuire le riz complet. Assaisonner les haricots noirs avec cumin et coriandre.\n2. Assembler le bowl avec riz, haricots, avocat en tranches et tomates cerises.\n3. Arroser de citron vert.",
        "portions": 1,
        "emoji": "🫘", "couleur": "#1F2937", "bg": "#F9FAFB",
        "ingredients": [("Riz complet cuit", 150), ("Haricots noirs cuits", 150), ("Avocat", 80), ("Tomates", 80), ("Citron vert jus", 15), ("Coriandre fraiche", 8)],
    },
    {
        "nom": "Tempeh mariné sauce soja-sésame",
        "description": "Tempeh riche en probiotiques, mariné et poêlé. Idéal pour les végans.",
        "instructions": "1. Couper le tempeh en tranches et mariner 30 min dans sauce soja, sésame, ail.\n2. Faire dorer à la poêle 4 min de chaque côté.\n3. Servir sur riz avec légumes sautés.",
        "portions": 1,
        "emoji": "🥡", "couleur": "#92400E", "bg": "#FFFBEB",
        "ingredients": [("Tempeh", 150), ("Sauce soja legere", 20), ("Graines de sesame", 10), ("Riz blanc cuit", 150), ("Brocoli", 100)],
    },

    # ─── DÎNER ────────────────────────────────────────────────────────────────
    {
        "nom": "Velouté de courge butternut au gingembre",
        "description": "Soupe veloutée hivernale de courge butternut avec note épicée au gingembre.",
        "instructions": "1. Rôtir la courge en dés 30 min à 200°C.\n2. Mixer avec bouillon, gingembre, lait de coco et curcuma.\n3. Assaisonner et servir avec graines de courge grillées.",
        "portions": 3,
        "emoji": "🎃", "couleur": "#C2410C", "bg": "#FFF7ED",
        "ingredients": [("Courge butternut", 600), ("Gingembre frais", 15), ("Lait demi-ecreme", 200), ("Curcuma poudre", 5)],
    },
    {
        "nom": "Filet mignon porc-moutarde brocolis",
        "description": "Filet mignon de porc tendre avec sauce moutarde à l'ancienne et brocolis vapeur.",
        "instructions": "1. Saisir le filet mignon 3 min de chaque côté puis finir 10 min à 180°C.\n2. Sauce : déglacer avec bouillon, moutarde à l'ancienne, crème légère.\n3. Servir avec brocolis vapeur.",
        "portions": 2,
        "emoji": "🥩", "couleur": "#991B1B", "bg": "#FEF2F2",
        "ingredients": [("Filet mignon porc", 300), ("Moutarde a lancienne", 25), ("Creme legere 15%", 80), ("Brocoli", 200)],
    },
    {
        "nom": "Crevettes sautées à l'ail et citron",
        "description": "Crevettes sautées express à l'ail, citron et persil. Prêt en 10 minutes.",
        "instructions": "1. Faire chauffer l'huile d'olive avec ail émincé.\n2. Ajouter les crevettes et cuire 2-3 min de chaque côté.\n3. Déglacer au citron vert, ajouter persil et servir.",
        "portions": 1,
        "emoji": "🦐", "couleur": "#EA580C", "bg": "#FFF7ED",
        "ingredients": [("Crevettes crues", 200), ("Huile d'olive", 12), ("Citron vert jus", 20), ("Coriandre fraiche", 10)],
    },
    {
        "nom": "Galettes de haricots blancs-herbes",
        "description": "Galettes végétariennes croustillantes aux haricots blancs et fines herbes.",
        "instructions": "1. Écraser les haricots blancs avec oeuf, ail, herbes, sel et chapelure.\n2. Former des galettes et dorer à la poêle 3 min de chaque côté.\n3. Servir avec yaourt à la menthe et salade verte.",
        "portions": 2,
        "emoji": "🫘", "couleur": "#6B7280", "bg": "#F9FAFB",
        "ingredients": [("Haricots blancs cuits", 300), ("Oeuf entier", 50), ("Farine d'avoine", 30), ("Yaourt grec nature", 80), ("Huile d'olive", 10)],
    },
    {
        "nom": "Salade de thon niçoise légère",
        "description": "Salade niçoise fraîche avec thon, oeufs, haricots verts et olives.",
        "instructions": "1. Cuire haricots verts 5 min. Cuire 2 oeufs durs.\n2. Assembler : laitue, thon, oeufs, haricots, tomates cerises.\n3. Vinaigrette : huile olive, vinaigre balsamique, moutarde.",
        "portions": 1,
        "emoji": "🥗", "couleur": "#0369A1", "bg": "#E0F2FE",
        "ingredients": [("Thon en conserve (eau)", 150), ("Oeuf entier", 100), ("Haricots verts", 150), ("Tomates", 100), ("Salade verte", 80), ("Huile d'olive", 15)],
    },
    {
        "nom": "Pâtes complètes thon-épinards-citron",
        "description": "Pâtes légères avec thon, épinards frais et zeste de citron. Prêt en 15 min.",
        "instructions": "1. Cuire les pâtes complètes al dente.\n2. Dans la poêle : ail, épinards, thon. Mélanger.\n3. Ajouter les pâtes, zeste de citron, huile d'olive et parmesan.",
        "portions": 1,
        "emoji": "🍝", "couleur": "#15803D", "bg": "#F0FDF4",
        "ingredients": [("Pates cuites", 200), ("Thon en conserve (eau)", 120), ("Epinards", 100), ("Parmesan rape", 20), ("Huile d'olive", 12)],
    },
    {
        "nom": "Gratin de fenouil au parmesan",
        "description": "Gratin léger de fenouil braisé, gratiné au parmesan. Accompagnement raffiné.",
        "instructions": "1. Émincer le fenouil et cuire 10 min à la poêle avec un peu d'huile.\n2. Disposer dans un plat, napper de crème légère.\n3. Parsemer de parmesan et cuire 20 min à 200°C.",
        "portions": 2,
        "emoji": "🌿", "couleur": "#065F46", "bg": "#ECFDF5",
        "ingredients": [("Fenouil", 400), ("Parmesan rape", 40), ("Creme legere 15%", 100), ("Huile d'olive", 10)],
    },
    {
        "nom": "Soupe de petits pois à la menthe",
        "description": "Velouté printanier express de petits pois avec menthe fraîche. Léger et vert.",
        "instructions": "1. Cuire 300g de petits pois surgelés 5 min dans le bouillon.\n2. Mixer avec quelques feuilles de menthe fraîche.\n3. Assaisonner et servir avec un filet de crème légère.",
        "portions": 2,
        "emoji": "🫛", "couleur": "#16A34A", "bg": "#F0FDF4",
        "ingredients": [("Petits pois surgeles", 300), ("Creme legere 15%", 60), ("Lait demi-ecreme", 150)],
    },
    {
        "nom": "Aubergines farcies au bœuf",
        "description": "Aubergines farcies avec bœuf haché épicé et tomates. Plat méditerranéen savoureux.",
        "instructions": "1. Couper les aubergines en deux, creuser et cuire au four 15 min.\n2. Faire revenir bœuf haché avec oignon, tomates, épices.\n3. Garnir les aubergines et cuire encore 15 min. Parsemer de parmesan.",
        "portions": 2,
        "emoji": "🍆", "couleur": "#6B21A8", "bg": "#FAF5FF",
        "ingredients": [("Aubergine", 400), ("Boeuf hache 5% MG", 200), ("Tomates", 150), ("Parmesan rape", 30), ("Huile d'olive", 12)],
    },
    {
        "nom": "Sauté de crevettes et brocolis sauce gingembre",
        "description": "Wok express riche en protéines avec crevettes et brocolis. Sauce gingembre-soja.",
        "instructions": "1. Chauffer le wok à feu vif. Faire sauter crevettes 2 min.\n2. Ajouter brocolis, gingembre râpé, sauce soja légère.\n3. Cuire 3 min et servir sur riz.",
        "portions": 1,
        "emoji": "🦐", "couleur": "#0891B2", "bg": "#ECFEFF",
        "ingredients": [("Crevettes crues", 200), ("Brocoli", 200), ("Gingembre frais", 10), ("Sauce soja legere", 15), ("Riz blanc cuit", 130), ("Huile de coco", 8)],
    },
    {
        "nom": "Daurade rôtie fenouil et citron confit",
        "description": "Daurade entière cuite au four sur lit de fenouil avec citron. Fraîche et savoureuse.",
        "instructions": "1. Émincer le fenouil et disposer dans un plat.\n2. Poser la daurade vidée dessus, assaisonner et arroser d'huile d'olive.\n3. Cuire 25 min à 200°C.",
        "portions": 2,
        "emoji": "🐟", "couleur": "#0284C7", "bg": "#E0F2FE",
        "ingredients": [("Cabillaud", 300), ("Fenouil", 200), ("Huile d'olive", 15), ("Tomates", 100)],
    },

    # ─── COLLATIONS / SNACKS ──────────────────────────────────────────────────
    {
        "nom": "Energy balls dattes-avoine-chocolat",
        "description": "Boules d'énergie sans cuisson. Idéal avant l'entraînement.",
        "instructions": "1. Mixer 150g de dattes dénoyautées avec flocons d'avoine, beurre de cacahuète.\n2. Incorporer des pépites de chocolat noir.\n3. Former des boules et réfrigérer 1h.",
        "portions": 8,
        "emoji": "⚡", "couleur": "#92400E", "bg": "#FFFBEB",
        "ingredients": [("Flocons d'avoine", 100), ("Beurre de cacahuete", 40), ("Chocolat noir 70%", 30), ("Miel", 20)],
    },
    {
        "nom": "Houmous maison et crudités",
        "description": "Houmous onctueux avec tahini maison, servi avec crudités fraîches.",
        "instructions": "1. Mixer 400g de pois chiches, tahini, citron, ail, cumin et eau froide jusqu'à lisse.\n2. Garnir d'huile d'olive et paprika fumé.\n3. Servir avec carottes, concombre et céleri.",
        "portions": 4,
        "emoji": "🥙", "couleur": "#B45309", "bg": "#FFFBEB",
        "ingredients": [("Pois chiches seches cuits", 300), ("Tahini (puree sesame)", 40), ("Huile d'olive", 20), ("Carottes", 100), ("Concombre", 100)],
    },
    {
        "nom": "Barres protéinées maison avoine-miel",
        "description": "Barres sans cuisson au four. Idéales pour le sport et le meal prep.",
        "instructions": "1. Mélanger flocons d'avoine, beurre de cacahuète, miel, whey vanille.\n2. Incorporer amandes et cranberries séchées.\n3. Presser dans un moule et réfrigérer 2h. Couper en barres.",
        "portions": 6,
        "emoji": "🍫", "couleur": "#78350F", "bg": "#FEF3C7",
        "ingredients": [("Flocons d'avoine", 150), ("Beurre de cacahuete", 60), ("Miel", 40), ("Whey proteine (vanille)", 30), ("Amandes", 40), ("Cranberries sechees", 30)],
    },
    {
        "nom": "Skyr framboises et pistaches",
        "description": "Collation légère et rafraîchissante. Protéines + antioxydants.",
        "instructions": "1. Verser 150g de skyr dans un bol.\n2. Ajouter des framboises fraîches.\n3. Parsemer de pistaches concassées et de graines de chia.",
        "portions": 1,
        "emoji": "🍓", "couleur": "#BE185D", "bg": "#FDF2F8",
        "ingredients": [("Skyr nature", 150), ("Framboises", 100), ("Pistaches", 20), ("Graines de chia", 8)],
    },
    {
        "nom": "Mix protéiné noix-graines",
        "description": "Trail mix maison riche en bons lipides et protéines végétales.",
        "instructions": "1. Mélanger toutes les noix et graines.\n2. Optionnel : torréfier 5 min à 170°C.\n3. Conserver dans un bocal hermétique.",
        "portions": 4,
        "emoji": "🌰", "couleur": "#78350F", "bg": "#FEF3C7",
        "ingredients": [("Amandes", 50), ("Noix de cajou", 40), ("Noix", 40), ("Graines de lin", 20), ("Graines de sesame", 20), ("Cranberries sechees", 30)],
    },
    {
        "nom": "Rice cakes thon-avocat",
        "description": "Galettes de riz garnies de thon et avocat. Snack léger et protéiné.",
        "instructions": "1. Écraser l'avocat avec citron et sel.\n2. Étaler sur les galettes de riz.\n3. Couvrir de thon au naturel émietté et graines de sésame.",
        "portions": 1,
        "emoji": "🌾", "couleur": "#65A30D", "bg": "#F7FEE7",
        "ingredients": [("Galettes de riz", 40), ("Thon en conserve (eau)", 80), ("Avocat", 60), ("Graines de sesame", 8)],
    },

    # ─── SHAKES PROTÉINÉS ─────────────────────────────────────────────────────
    {
        "nom": "Mass gainer maison banane-avoine",
        "description": "Shake hypercalorique pour la prise de masse. Riche en protéines et glucides.",
        "instructions": "1. Mixer banane, flocons d'avoine, lait entier, whey vanille et beurre de cacahuète.\n2. Ajouter 5 glaçons et mixer jusqu'à homogénéité.",
        "portions": 1,
        "emoji": "💪", "couleur": "#1D9E75", "bg": "#ECFDF5",
        "ingredients": [("Banane", 150), ("Flocons d'avoine", 80), ("Lait demi-ecreme", 300), ("Whey proteine (vanille)", 40), ("Beurre de cacahuete", 30)],
    },
    {
        "nom": "Shake récupération fraise-yaourt",
        "description": "Shake post-entraînement idéal. Glucides rapides + protéines pour récupérer.",
        "instructions": "1. Mixer fraises, yaourt grec, lait et whey fraise.\n2. Ajouter de la glace si désiré.",
        "portions": 1,
        "emoji": "🍓", "couleur": "#E11D48", "bg": "#FFF1F2",
        "ingredients": [("Fraises", 150), ("Yaourt grec nature", 100), ("Lait demi-ecreme", 200), ("Whey proteine (vanille)", 30)],
    },
    {
        "nom": "Green shake épinards-banane-gingembre",
        "description": "Shake vert détox. Alcalinisant, riche en fer et vitamines.",
        "instructions": "1. Mixer épinards, banane, gingembre, lait d'amande et whey vanille.\n2. Ajouter des glaçons et servir immédiatement.",
        "portions": 1,
        "emoji": "🥬", "couleur": "#16A34A", "bg": "#F0FDF4",
        "ingredients": [("Epinards", 60), ("Banane", 120), ("Gingembre frais", 8), ("Lait demi-ecreme", 250), ("Whey proteine (vanille)", 25)],
    },
    {
        "nom": "Shake caséine chocolat-amande (nuit)",
        "description": "Shake à libération lente pour la nuit. Protège la masse musculaire pendant le sommeil.",
        "instructions": "1. Mélanger 40g de caséine chocolat dans 300ml de lait d'amande.\n2. Ajouter 20g d'amandes effilées.\n3. Mélanger à la cuillère ou au blender.",
        "portions": 1,
        "emoji": "🌙", "couleur": "#1E293B", "bg": "#F8FAFC",
        "ingredients": [("Lait demi-ecreme", 300), ("Amandes", 20), ("Chocolat noir 70%", 15)],
    },
    {
        "nom": "Smoothie mangue-coco protéiné",
        "description": "Smoothie exotique énergisant avec mangue, noix de coco et whey.",
        "instructions": "1. Mixer mangue surgelée, lait de coco, whey vanille et glaçons.\n2. Servir dans un grand verre avec noix de coco râpée.",
        "portions": 1,
        "emoji": "🥭", "couleur": "#F59E0B", "bg": "#FFFBEB",
        "ingredients": [("Mangue", 150), ("Lait demi-ecreme", 200), ("Whey proteine (vanille)", 30), ("Noix de cajou", 20)],
    },
]


def make_photo(nom, emoji, couleur_hex, bg_hex):
    from PIL import Image, ImageDraw, ImageFont
    w, h = 800, 500

    def hex2rgb(hx):
        hx = hx.lstrip("#")
        return tuple(int(hx[i:i+2], 16) for i in (0, 2, 4))

    bg = hex2rgb(bg_hex)
    fg = hex2rgb(couleur_hex)
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    for i in range(h):
        alpha = int(20 * (i / h))
        r = max(0, bg[0] - alpha)
        g = max(0, bg[1] - alpha)
        b = max(0, bg[2] - alpha)
        draw.line([(0, i), (w, i)], fill=(r, g, b))
    draw.ellipse([(w - 200, -80), (w + 80, 200)], fill=tuple(max(0, c - 30) for c in fg))
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
    except Exception:
        font_title = ImageFont.load_default()
    words = nom.split()
    lines, line = [], ""
    for word in words:
        if len(line + " " + word) > 30:
            lines.append(line)
            line = word
        else:
            line = (line + " " + word).strip()
    if line:
        lines.append(line)
    y_start = h // 2 - (len(lines) * 42) // 2
    for i, l in enumerate(lines):
        draw.text((w // 2, y_start + i * 42), l, font=font_title, fill=fg, anchor="mm")
    draw.rectangle([(w // 4, h - 40), (3 * w // 4, h - 34)], fill=fg)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


class Command(BaseCommand):
    help = f"Seed {len(NOUVEAUX_ALIMENTS)} aliments + {len(NOUVELLES_RECETTES)} nouvelles recettes"

    def handle(self, *args, **options):
        coach = User.objects.filter(role="coach").first()
        if not coach:
            self.stderr.write("Aucun coach trouvé.")
            return

        # 1. Créer les aliments manquants
        alim_created = 0
        for nom, cat, cal, prot, gluc, lip, fibres in NOUVEAUX_ALIMENTS:
            _, created = Aliment.objects.get_or_create(
                nom=nom,
                defaults={
                    "categorie": cat,
                    "calories_100g": cal,
                    "proteines_100g": prot,
                    "glucides_100g": gluc,
                    "lipides_100g": lip,
                    "fibres_100g": fibres,
                },
            )
            if created:
                alim_created += 1
                self.stdout.write(f"  🥕 Aliment : {nom}")

        self.stdout.write(f"→ {alim_created} aliments créés\n")

        # 2. Recharger la map des aliments
        aliment_map = {a.nom.lower(): a for a in Aliment.objects.all()}

        # 3. Créer les recettes
        rec_created = 0
        for data in NOUVELLES_RECETTES:
            if Recette.objects.filter(nom=data["nom"], coach=coach).exists():
                self.stdout.write(f"  → déjà existante : {data['nom']}")
                continue

            recette = Recette(
                coach=coach,
                nom=data["nom"],
                description=data["description"],
                instructions=data["instructions"],
                portions=data.get("portions", 1),
            )
            try:
                img_bytes = make_photo(data["nom"], data["emoji"], data["couleur"], data["bg"])
                fname = data["nom"].lower()
                for ch in " ,\\'é è ê â à ù ô î û":
                    fname = fname.replace(ch, "_")
                fname = fname[:40] + ".jpg"
                recette.photo.save(fname, ContentFile(img_bytes), save=False)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Photo non générée : {e}"))
            recette.save()

            for ing_nom, qte in data["ingredients"]:
                aliment = aliment_map.get(ing_nom.lower())
                if aliment:
                    IngredientRecette.objects.create(recette=recette, aliment=aliment, quantite_g=qte)
                else:
                    self.stdout.write(self.style.WARNING(f"  ⚠ Aliment introuvable: {ing_nom}"))

            self.stdout.write(self.style.SUCCESS(f"  ✓ {data['nom']}"))
            rec_created += 1

        total = Recette.objects.filter(coach=coach).count()
        self.stdout.write(self.style.SUCCESS(
            f"\n✓ {rec_created} recettes créées — {total} recettes au total"
        ))

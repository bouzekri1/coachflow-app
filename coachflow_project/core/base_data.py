"""
Données de base partagées entre seed_all et le signal de création de coach.
Importé par : core/management/commands/seed_all.py  et  core/signals.py
"""

_UNS = 'https://images.unsplash.com/photo-'
_OPT = '?auto=format&fit=crop&w=400&q=80'

def _u(photo_id):
    return f'{_UNS}{photo_id}{_OPT}'

# ── RECETTES DE BASE ─────────────────────────────────────────────────────────
# Chaque entrée : dict avec nom, desc, instr, portions, img, ingredients[(nom_aliment, qte_g)]
# Les noms d'aliments doivent correspondre exactement à ceux en base.

BASE_RECETTES = [
    {
        'nom': 'Bowl protéiné au poulet et quinoa',
        'desc': 'Repas complet riche en protéines et glucides complexes pour la performance.',
        'instr': 'Cuire le quinoa 15 min. Griller le blanc de poulet assaisonné. Disposer dans un bol avec les légumes crus. Arroser de sauce soja et citron.',
        'portions': 1,
        'img': _u('1512621776951-a57ef1617f7a'),
        'ingredients': [('Blanc de poulet', 150), ('Quinoa cuit', 150), ('Épinards', 50), ('Concombre', 80), ('Tomates cerises', 60), ('Sauce soja legere', 10), ('Huile d\'olive', 8)],
    },
    {
        'nom': 'Omelette aux épinards et feta',
        'desc': 'Petit-déjeuner ou dîner léger, riche en protéines et calcium.',
        'instr': 'Battre les œufs. Faire revenir les épinards 2 min. Verser les œufs, ajouter la feta émiettée, plier l\'omelette.',
        'portions': 1,
        'img': _u('1525351484163-7529414f2ded'),
        'ingredients': [('Oeuf entier', 180), ('Épinards', 80), ('Feta', 40), ('Ail', 5), ('Huile d\'olive', 6)],
    },
    {
        'nom': 'Smoothie vert protéiné',
        'desc': 'Shake post-entraînement alcalin et nutritif.',
        'instr': 'Mixer tous les ingrédients jusqu\'à consistance lisse. Consommer immédiatement.',
        'portions': 1,
        'img': _u('1610970881699-44a5587cb435'),
        'ingredients': [('Épinards', 40), ('Banane', 120), ('Kiwi', 80), ('Yaourt grec nature', 100), ('Lait demi-ecreme', 150), ('Graines de chia', 10)],
    },
    {
        'nom': 'Saumon mi-cuit légumes vapeur',
        'desc': 'Plat riche en oméga-3, idéal pour la récupération musculaire.',
        'instr': 'Assaisonner le saumon, cuire à la poêle 3 min chaque côté. Cuire les légumes à la vapeur 10 min.',
        'portions': 1,
        'img': _u('1467003909585-2f8a72700288'),
        'ingredients': [('Saumon frais', 180), ('Brocoli', 150), ('Carottes', 80), ('Haricots verts', 100), ('Huile d\'olive', 8), ('Citron vert jus', 15)],
    },
    {
        'nom': 'Pancakes à l\'avoine et banane',
        'desc': 'Petit-déjeuner sucré naturellement, sans sucre raffiné.',
        'instr': 'Écraser la banane, mélanger avec les flocons mixés et les œufs. Cuire à la poêle antiadhésive.',
        'portions': 2,
        'img': _u('1567620905732-2d1ec7ab7445'),
        'ingredients': [('Flocons d\'avoine', 100), ('Banane', 120), ('Oeuf entier', 120), ('Miel', 15), ('Fraises', 100)],
    },
    {
        'nom': 'Chili de dinde aux haricots',
        'desc': 'Plat convivial et rassasiant, riche en fibres et protéines maigres.',
        'instr': 'Faire revenir la dinde. Ajouter oignons, poivrons, tomates et haricots. Mijoter 25 min.',
        'portions': 4,
        'img': _u('1561043433-aaf79df31c31'),
        'ingredients': [('Dinde hachee', 400), ('Haricots rouges cuits', 240), ('Tomates', 300), ('Poivron rouge', 100), ('Oignons', 80), ('Curcuma poudre', 5), ('Paprika fume', 5), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Salade niçoise revisitée',
        'desc': 'Classique français riche en protéines et bonnes graisses.',
        'instr': 'Cuire les œufs durs. Disposer tous les ingrédients dans un plat. Assaisonner d\'huile et vinaigre.',
        'portions': 2,
        'img': _u('1540189549336-e6e99eb4b9b0'),
        'ingredients': [('Thon en conserve (eau)', 160), ('Oeuf entier', 120), ('Haricots verts', 150), ('Tomates', 200), ('Olives vertes', 40), ('Huile d\'olive', 15), ('Vinaigre balsamique', 10)],
    },
    {
        'nom': 'Buddha bowl végétarien',
        'desc': 'Bol complet 100% végétal, idéal pour les repas sans viande.',
        'instr': 'Rôtir pois chiches et patate douce 25 min au four. Dresser avec quinoa et légumes. Sauce tahini-citron.',
        'portions': 1,
        'img': _u('1546069901-522dade98bdc'),
        'ingredients': [('Pois chiches cuits', 120), ('Patate douce cuite', 130), ('Quinoa cuit', 100), ('Épinards', 50), ('Betterave cuite', 60), ('Tahini (puree sesame)', 20), ('Citron vert jus', 15)],
    },
    {
        'nom': 'Cake protéiné aux noix',
        'desc': 'En-cas solide pour palier les fringales avec un bon profil nutritionnel.',
        'instr': 'Mixer les flocons en farine. Mélanger tous les ingrédients. Cuire 35 min à 180°C.',
        'portions': 8,
        'img': _u('1606313564200-e75d5e1d1b42'),
        'ingredients': [('Flocons d\'avoine', 150), ('Whey proteine (vanille)', 60), ('Oeuf entier', 180), ('Noix', 60), ('Banane', 120), ('Miel', 20)],
    },
    {
        'nom': 'Soupe de lentilles à la tomate',
        'desc': 'Soupe réconfortante et high-protein, parfaite en hiver.',
        'instr': 'Faire revenir ail et oignons. Ajouter tomates et lentilles, couvrir d\'eau. Cuire 25 min. Mixer partiellement.',
        'portions': 4,
        'img': _u('1547592166-23ac45744acd'),
        'ingredients': [('Lentilles cuites', 400), ('Tomates', 300), ('Oignons', 80), ('Ail', 10), ('Curcuma poudre', 5), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Riz complet poulet curry',
        'desc': 'Plat complet parfumé au curry, idéal post-entraînement.',
        'instr': 'Cuire le riz. Faire revenir poulet et oignons. Ajouter lait de coco et épices, mijoter 10 min.',
        'portions': 2,
        'img': _u('1596797038530-2c107229654b'),
        'ingredients': [('Riz complet cuit', 200), ('Blanc de poulet', 250), ('Lait de coco', 150), ('Oignons', 60), ('Curcuma poudre', 5), ('Gingembre frais', 10), ('Huile de coco', 8)],
    },
    {
        'nom': 'Tartines de saumon fumé au fromage frais',
        'desc': 'Petit-déjeuner gourmand et équilibré, riche en oméga-3.',
        'instr': 'Tartiner le pain de fromage frais. Déposer le saumon, le concombre et les câpres.',
        'portions': 1,
        'img': _u('1481671703836-198d9f4e22c3'),
        'ingredients': [('Pain complet', 60), ('Truite fumee', 60), ('Creme cheese legere', 30), ('Concombre', 50), ('Capres', 10)],
    },
    {
        'nom': 'Curry de pois chiches et épinards',
        'desc': 'Plat végétarien indien inspiré, riche en fibres et protéines végétales.',
        'instr': 'Faire revenir l\'ail et les épices. Ajouter pois chiches, épinards et lait de coco. Mijoter 15 min.',
        'portions': 3,
        'img': _u('1565299624946-b28f40a0ae38'),
        'ingredients': [('Pois chiches cuits', 300), ('Épinards', 150), ('Lait de coco', 200), ('Tomates', 200), ('Ail', 10), ('Curcuma poudre', 5), ('Gingembre frais', 8)],
    },
    {
        'nom': 'Poêlée de thon, légumes et quinoa',
        'desc': 'Plat express en 15 min, très protéiné et complet.',
        'instr': 'Cuire le quinoa. Faire revenir les légumes. Ajouter le thon émietté. Mélanger, assaisonner.',
        'portions': 1,
        'img': _u('1534482421-64566f976cfa'),
        'ingredients': [('Thon en conserve (eau)', 120), ('Quinoa cuit', 120), ('Courgette', 100), ('Poivron rouge', 80), ('Sauce soja legere', 10), ('Huile d\'olive', 8)],
    },
    {
        'nom': 'Overnight oats aux framboises',
        'desc': 'Petit-déjeuner préparé la veille, riche en fibres et protéines.',
        'instr': 'Mélanger flocons, yaourt, lait et graines de chia. Réfrigérer une nuit. Topper de framboises et miel au matin.',
        'portions': 1,
        'img': _u('1490645935967-10de6ba17061'),
        'ingredients': [('Flocons d\'avoine', 70), ('Yaourt grec nature', 100), ('Lait demi-ecreme', 80), ('Framboises', 80), ('Graines de chia', 10), ('Miel', 10)],
    },
    {
        'nom': 'Falafels maison (galettes de pois chiches)',
        'desc': 'Version healthy des falafels, riches en protéines végétales.',
        'instr': 'Mixer pois chiches avec herbes et épices. Former des galettes. Cuire à la poêle 3 min par face.',
        'portions': 4,
        'img': _u('1585325701792-0dd4cff2e96c'),
        'ingredients': [('Pois chiches cuits', 400), ('Farine de pois chiches', 40), ('Coriandre fraiche', 20), ('Ail', 10), ('Curcuma poudre', 3), ('Huile d\'olive', 15)],
    },
    {
        'nom': 'Steak haché à la sauce poivron',
        'desc': 'Classique revisité, sauce maison légère et savoureuse.',
        'instr': 'Griller le steak. Mixer les poivrons rôtis avec ail et épices pour la sauce. Servir avec pommes de terre.',
        'portions': 2,
        'img': _u('1546964124-0cce4bc8f0e7'),
        'ingredients': [('Boeuf hache 5% MG', 300), ('Poivron rouge', 150), ('Poivron jaune', 100), ('Ail', 8), ('Tomates', 100), ('Pomme de terre cuite', 200), ('Huile d\'olive', 8)],
    },
    {
        'nom': 'Skyr aux fruits et granola maison',
        'desc': 'Collation ou dessert ultra-protéiné façon Islande.',
        'instr': 'Faire dorer les flocons avec le miel au four 15 min. Servir le skyr avec les fruits et le granola.',
        'portions': 1,
        'img': _u('1488477181899-ab5c9e285c37'),
        'ingredients': [('Skyr nature', 150), ('Myrtilles', 60), ('Fraises', 80), ('Flocons d\'avoine', 30), ('Miel', 10), ('Amandes', 15)],
    },
    {
        'nom': 'Wraps à la dinde et avocat',
        'desc': 'Déjeuner rapide, équilibré et rassasiant.',
        'instr': 'Garnir la tortilla de dinde, avocat tranché, salade et tomates. Rouler fermement.',
        'portions': 2,
        'img': _u('1565299585323-38d6b0865b47'),
        'ingredients': [('Dinde emincee', 150), ('Tortilla ble complet', 80), ('Avocat', 100), ('Salade verte', 40), ('Tomates cerises', 80), ('Moutarde a lancienne', 10)],
    },
    {
        'nom': 'Wok de crevettes aux légumes asiatiques',
        'desc': 'Plat léger et savoureux d\'inspiration asiatique.',
        'instr': 'Faire sauter les crevettes 2 min. Ajouter légumes, sauce soja et gingembre. Cuire 4 min à feu vif.',
        'portions': 2,
        'img': _u('1563245372-f21724e3856d'),
        'ingredients': [('Crevettes cuites', 200), ('Pak choi', 100), ('Carottes', 80), ('Champignons de Paris', 100), ('Riz blanc cuit', 150), ('Sauce soja legere', 20), ('Gingembre frais', 8), ('Huile de coco', 8)],
    },
    {
        'nom': 'Soupe miso tofu et algues',
        'desc': 'Soupe japonaise légère, reminéralisante et protéinée.',
        'instr': 'Porter l\'eau à frémissement. Diluer le miso. Ajouter les algues, le tofu en dés et les oignons verts. Ne pas faire bouillir.',
        'portions': 2,
        'img': _u('1547592180-85f173990554'),
        'ingredients': [('Tofu ferme', 150), ('Miso blanc', 30), ('Feuilles nori', 5), ('Oignons verts', 20), ('Champignons shiitake', 50)],
    },
    {
        'nom': 'Pancakes protéinés à la myrtille',
        'desc': 'Petit-déjeuner festif mais sain, idéal le week-end.',
        'instr': 'Mélanger les ingrédients secs, ajouter œufs et lait. Incorporer les myrtilles. Cuire à la poêle légèrement huilée.',
        'portions': 3,
        'img': _u('1515516089376-88db6b8a2e31'),
        'ingredients': [('Farine d\'avoine', 100), ('Whey proteine (vanille)', 30), ('Oeuf entier', 120), ('Lait demi-ecreme', 120), ('Myrtilles', 100), ('Miel', 10)],
    },
    {
        'nom': 'Cabillaud en papillote légumes',
        'desc': 'Cuisson saine qui préserve tous les nutriments.',
        'instr': 'Déposer le poisson sur papier sulfurisé avec légumes et herbes. Fermer hermétiquement. Cuire 20 min à 200°C.',
        'portions': 2,
        'img': _u('1414235077428-338989a2e8c0'),
        'ingredients': [('Cabillaud', 300), ('Courgette', 150), ('Tomates cerises', 100), ('Poivron rouge', 80), ('Citron vert jus', 20), ('Huile d\'olive', 10), ('Basilic frais', 5)],
    },
    {
        'nom': 'Bowl de riz complet au tempeh grillé',
        'desc': 'Plat végétalien fermenté, très digeste et riche en protéines.',
        'instr': 'Mariner le tempeh dans la sauce soja. Griller 3 min chaque face. Servir sur riz complet avec légumes sautés.',
        'portions': 2,
        'img': _u('1511690656952-34342fe7837c'),
        'ingredients': [('Tempeh', 200), ('Riz complet cuit', 200), ('Sauce soja legere', 30), ('Brocoli', 150), ('Carottes', 80), ('Huile d\'olive', 8)],
    },
    {
        'nom': 'Tartare de saumon avocat',
        'desc': 'Entrée ou plat léger raffiné, riche en oméga-3 et bons lipides.',
        'instr': 'Couper le saumon en petits dés. Mélanger avec avocat écrasé, citron, sauce soja et oignons verts.',
        'portions': 2,
        'img': _u('1574484284002-952d92456975'),
        'ingredients': [('Saumon frais', 200), ('Avocat', 100), ('Citron vert jus', 20), ('Sauce soja legere', 10), ('Oignons verts', 15)],
    },
    {
        'nom': 'Porridge salé aux légumes et œuf poché',
        'desc': 'Version salée du porridge, idéale pour éviter le sucre le matin.',
        'instr': 'Cuire les flocons dans un bouillon de légumes. Ajouter les légumes cuits, un œuf poché et les graines.',
        'portions': 1,
        'img': _u('1475809913053-3d552e0e3b14'),
        'ingredients': [('Flocons d\'avoine', 80), ('Oeuf entier', 60), ('Épinards', 50), ('Champignons de Paris', 60), ('Graines de sesame', 10), ('Sauce soja legere', 5)],
    },
    {
        'nom': 'Salade de lentilles vertes au chèvre',
        'desc': 'Salade consistante et savoureuse, idéale en déjeuner léger.',
        'instr': 'Cuire les lentilles 20 min. Laisser refroidir. Mélanger avec légumes, chèvre émietté et vinaigrette.',
        'portions': 2,
        'img': _u('1557530078-a8bac4f7fe04'),
        'ingredients': [('Lentilles vertes cuites', 240), ('Fromage de chevre', 60), ('Betterave cuite', 80), ('Noix', 30), ('Salade verte', 50), ('Vinaigre balsamique', 10), ('Huile d\'olive', 12)],
    },
    {
        'nom': 'Hamburger healthy maison',
        'desc': 'Burger équilibré avec pain complet et viande maigre.',
        'instr': 'Former les steaks, griller 3 min par côté. Assembler avec les garnitures dans le pain complet grillé.',
        'portions': 2,
        'img': _u('1568901346375-23c9450c58cd'),
        'ingredients': [('Boeuf hache 5% MG', 250), ('Pain complet', 100), ('Salade verte', 40), ('Tomates', 100), ('Oignons', 40), ('Moutarde a lancienne', 15), ('Emmental', 30)],
    },
    {
        'nom': 'Muffins protéinés aux pommes et cannelle',
        'desc': 'En-cas pratique à emporter, faible en sucre ajouté.',
        'instr': 'Mixer les flocons en farine. Mélanger ingrédients secs et humides, ajouter les dés de pomme. Cuire 20 min à 180°C.',
        'portions': 6,
        'img': _u('1608219599747-bff1f5c37adc'),
        'ingredients': [('Flocons d\'avoine', 120), ('Whey proteine (vanille)', 40), ('Oeuf entier', 120), ('Pomme', 150), ('Lait demi-ecreme', 80), ('Cannelle', 3), ('Miel', 15)],
    },
    {
        'nom': 'Dahl de lentilles corail au lait de coco',
        'desc': 'Plat indien végétalien, réconfortant et très nutritif.',
        'instr': 'Faire revenir les épices dans l\'huile. Ajouter lentilles, tomates et eau. Cuire 20 min. Finir avec le lait de coco.',
        'portions': 4,
        'img': _u('1547591049-9a47a86eb6f9'),
        'ingredients': [('Lentilles cuites', 400), ('Tomates', 200), ('Lait de coco', 150), ('Oignons', 80), ('Ail', 10), ('Gingembre frais', 8), ('Curcuma poudre', 5), ('Huile de coco', 8)],
    },
]


def create_base_recettes_global():
    """
    Crée les recettes de base globales (coach=None), visibles par tous les coachs.
    Idempotent : ne recrée pas les recettes déjà existantes.
    Retourne le nombre de recettes nouvellement créées.
    """
    from core.models import Aliment, Recette, IngredientRecette

    aliments = {a.nom: a for a in Aliment.objects.all()}
    created = 0

    for data in BASE_RECETTES:
        recette, new = Recette.objects.get_or_create(
            coach=None,
            nom=data['nom'],
            defaults=dict(
                description=data['desc'],
                instructions=data['instr'],
                portions=data['portions'],
                image_url=data.get('img', ''),
            ),
        )
        if new:
            for nom_ali, qte in data['ingredients']:
                aliment = aliments.get(nom_ali)
                if aliment:
                    IngredientRecette.objects.create(
                        recette=recette,
                        aliment=aliment,
                        quantite_g=qte,
                    )
            created += 1
        elif not recette.photo and not recette.image_url and data.get('img'):
            recette.image_url = data['img']
            recette.save(update_fields=['image_url'])

    return created


def create_base_recettes_for_coach(coach):
    """Alias conservé pour compatibilité — délègue au global."""
    return create_base_recettes_global()

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

    # ── PETITS-DÉJEUNERS DU MONDE ─────────────────────────────────────────────
    {
        'nom': 'Shakshuka œufs pochés à la tomate',
        'desc': 'Plat israélo-maghrébin : œufs pochés dans une sauce tomate épicée. Petit-déj salé ou dîner léger.',
        'instr': 'Faire revenir oignon et poivron 5 min. Ajouter tomates, paprika, cumin. Mijoter 10 min. Casser les œufs sur le dessus, couvrir et cuire 6-8 min.',
        'portions': 2,
        'img': _u('1590412200988-a436970781fa'),
        'ingredients': [('Oeuf entier', 240), ('Tomates', 300), ('Poivron rouge', 150), ('Oignons', 80), ('Ail', 8), ('Paprika fume', 4), ('Huile d\'olive', 12)],
    },
    {
        'nom': 'Bircher muesli pomme-noisettes',
        'desc': 'Petit-déjeuner suisse préparé la veille : avoine trempée, pomme râpée, noisettes. Énergie longue durée.',
        'instr': 'Mélanger flocons, lait, yaourt et miel. Laisser au frais une nuit. Au matin, ajouter pomme râpée et noisettes concassées.',
        'portions': 1,
        'img': _u('1517673132405-a56a62b18caf'),
        'ingredients': [('Flocons d\'avoine', 60), ('Lait demi-ecreme', 120), ('Yaourt grec nature', 80), ('Pomme', 150), ('Noisettes', 15), ('Miel', 10), ('Cannelle', 2)],
    },
    {
        'nom': 'Bowl quark fruits rouges et granola',
        'desc': 'Petit-déj allemand riche en protéines (30g+), idéal après une séance matinale.',
        'instr': 'Verser le quark dans un bol. Ajouter fruits rouges, granola, miel et graines de chia.',
        'portions': 1,
        'img': _u('1511690078903-71dc5a49f5e3'),
        'ingredients': [('Quark nature', 200), ('Framboises', 60), ('Myrtilles', 60), ('Müesli sans sucre ajouté', 30), ('Miel', 8), ('Graines de chia', 8)],
    },
    {
        'nom': 'Toast à l\'avocat et tomates cerises',
        'desc': 'Petit-déj rapide tendance, bonnes graisses et fibres.',
        'instr': 'Toaster les tranches de pain. Écraser l\'avocat avec citron et sel. Tartiner, disposer tomates et œuf dur en tranches. Saupoudrer de graines.',
        'portions': 1,
        'img': _u('1525351484163-7529414f2ded'),
        'ingredients': [('Pain complet', 80), ('Avocat', 100), ('Tomates cerises', 80), ('Oeuf entier', 60), ('Citron vert jus', 5), ('Graines de sesame', 5)],
    },
    {
        'nom': 'Pudding chia mangue-coco',
        'desc': 'Préparé la veille : 3 ingrédients, riche en oméga-3 et fibres.',
        'instr': 'Mélanger graines de chia avec lait de coco. Réfrigérer 4h minimum. Mixer la mangue en purée et déposer en couche au-dessus.',
        'portions': 1,
        'img': _u('1554998171-89445e31c52b'),
        'ingredients': [('Graines de chia', 25), ('Lait de coco', 150), ('Mangue', 120), ('Miel', 8)],
    },

    # ── SALADES MONDIALES ────────────────────────────────────────────────────
    {
        'nom': 'Salade mexicaine maïs-haricots-avocat',
        'desc': 'Salade colorée et complète, parfaite pour le déjeuner du bureau.',
        'instr': 'Mélanger maïs, haricots noirs, poivron rouge en dés et oignon rouge émincé. Ajouter avocat, coriandre, jus de citron et huile d\'olive.',
        'portions': 2,
        'img': _u('1512621776951-a57ef1617f7a'),
        'ingredients': [('Maïs en conserve', 200), ('Haricots noirs cuits', 200), ('Avocat', 120), ('Poivron rouge', 100), ('Oignon rouge', 50), ('Coriandre fraiche', 10), ('Citron vert jus', 15), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Salade thaï bœuf-menthe-citron vert',
        'desc': 'Inspiration "yam neua" thaï : bœuf grillé, herbes fraîches, sauce piquante.',
        'instr': 'Griller le bœuf 2 min de chaque côté, laisser reposer. Trancher finement. Mélanger avec roquette, oignon rouge, menthe. Arroser de sauce soja, citron vert et sriracha.',
        'portions': 1,
        'img': _u('1546069901-ba9599a7e63c'),
        'ingredients': [('Steak de boeuf maigre', 150), ('Roquette', 80), ('Oignon rouge', 40), ('Basilic frais', 5), ('Sauce soja legere', 10), ('Citron vert jus', 12), ('Sauce sriracha', 5)],
    },
    {
        'nom': 'Salade de patate douce, feta et grenade',
        'desc': 'Salade automnale équilibrée : sucré-salé-acidulé, fibres et antioxydants.',
        'instr': 'Rôtir cubes de patate douce 25 min à 200°C avec huile et cumin. Disposer sur mâche, ajouter feta, grenade et noix.',
        'portions': 2,
        'img': _u('1604908176997-125f25cc6f3d'),
        'ingredients': [('Patate douce cuite', 300), ('Feta', 60), ('Grenade arilles', 80), ('Mâche', 80), ('Noix', 20), ('Huile d\'olive', 12), ('Vinaigre balsamique', 8)],
    },
    {
        'nom': 'Bowl Méditerranée poulet-houmous-pita',
        'desc': 'Bol type "mezze" : poulet, légumes croquants, houmous et pain pita.',
        'instr': 'Griller le poulet 6 min de chaque côté. Disposer sur lit de salade avec concombre, tomates, olives. Servir avec houmous et pain pita.',
        'portions': 1,
        'img': _u('1565299624946-b28f40a0ae38'),
        'ingredients': [('Blanc de poulet', 150), ('Pain pita complet', 60), ('Concombre', 100), ('Tomates cerises', 100), ('Olives vertes', 30), ('Salade verte', 60), ('Tzatziki maison', 40)],
    },
    {
        'nom': 'Salade japonaise saumon-edamame-avocat',
        'desc': 'Salade inspirée du poke japonais : saumon cru mariné, edamame et avocat.',
        'instr': 'Couper le saumon en dés, mariner 10 min dans sauce soja, sésame et vinaigre de riz. Disposer sur riz tiède avec edamame, avocat, oignons verts.',
        'portions': 1,
        'img': _u('1565958011703-44f9829ba187'),
        'ingredients': [('Saumon frais', 120), ('Riz blanc cuit', 120), ('Edamame ecale', 60), ('Avocat', 80), ('Oignons verts', 15), ('Sauce soja legere', 12), ('Vinaigre de riz', 8), ('Graines de sesame', 5)],
    },

    # ── PLATS PRINCIPAUX INTERNATIONAUX ──────────────────────────────────────
    {
        'nom': 'Curry thaï vert poulet-courgette',
        'desc': 'Curry parfumé au lait de coco, basilic thaï et légumes croquants.',
        'instr': 'Faire revenir le poulet 5 min. Ajouter pâte de curry vert, lait de coco, courgettes et poivron. Mijoter 12 min. Servir sur riz jasmin.',
        'portions': 2,
        'img': _u('1455619452474-d2be8b1e70cd'),
        'ingredients': [('Blanc de poulet', 250), ('Courgette', 200), ('Poivron vert', 100), ('Lait de coco', 200), ('Riz jasmin cru', 100), ('Basilic frais', 10), ('Gingembre frais', 8), ('Sauce soja legere', 10)],
    },
    {
        'nom': 'Bibimbap coréen au bœuf et légumes',
        'desc': 'Bol coréen : riz, bœuf, légumes sautés, œuf au plat. Plat complet équilibré.',
        'instr': 'Cuire riz. Sauter séparément carottes, épinards, champignons. Griller bœuf assaisonné. Disposer sur riz, surmonter d\'un œuf au plat. Sauce soja et sésame.',
        'portions': 1,
        'img': _u('1583224994076-ae3a09b25c43'),
        'ingredients': [('Steak de boeuf maigre', 120), ('Riz blanc cuit', 150), ('Carottes', 80), ('Epinards', 80), ('Champignons de Paris', 80), ('Oeuf entier', 60), ('Sauce soja legere', 12), ('Graines de sesame', 5), ('Huile d\'olive', 8)],
    },
    {
        'nom': 'Poulet basquaise tomates-poivrons',
        'desc': 'Classique du Sud-Ouest : poulet mijoté avec poivrons, tomates et piment.',
        'instr': 'Dorer le poulet, réserver. Faire revenir oignon, poivrons et ail. Ajouter tomates, jambon, paprika. Remettre poulet, mijoter 35 min couvert.',
        'portions': 2,
        'img': _u('1546069901-ba9599a7e63c'),
        'ingredients': [('Poulet cuisse sans peau', 300), ('Poivron rouge', 150), ('Poivron vert', 150), ('Tomates', 250), ('Oignons', 100), ('Jambon de Bayonne', 40), ('Ail', 10), ('Paprika fume', 4), ('Huile d\'olive', 12)],
    },
    {
        'nom': 'Tacos bœuf, salsa avocat-coriandre',
        'desc': 'Tacos maison frais et équilibrés, version healthy.',
        'instr': 'Cuire le bœuf émietté avec cumin et paprika. Préparer salsa avocat-tomate-coriandre-citron. Garnir tortillas, ajouter salade et fromage.',
        'portions': 2,
        'img': _u('1565299585323-38d6b0865b47'),
        'ingredients': [('Boeuf hache 5% MG', 250), ('Tortilla ble complet', 120), ('Avocat', 100), ('Tomates', 120), ('Coriandre fraiche', 10), ('Oignon rouge', 50), ('Salade verte', 60), ('Citron vert jus', 12), ('Paprika fume', 3)],
    },
    {
        'nom': 'Boulettes de bœuf sauce tomate-basilic',
        'desc': 'Plat familial italien : boulettes mijotées en sauce tomate, accompagnées de pâtes complètes.',
        'instr': 'Mélanger bœuf, œuf, chapelure, ail et basilic. Façonner les boulettes, dorer à la poêle. Mijoter 15 min dans sauce tomate. Servir avec pâtes.',
        'portions': 2,
        'img': _u('1542444459-db63c47b4d2c'),
        'ingredients': [('Boeuf hache 5% MG', 250), ('Pates completes crues', 140), ('Tomates', 300), ('Oeuf entier', 50), ('Chapelure', 30), ('Basilic frais', 10), ('Ail', 8), ('Parmesan rape', 20), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Saumon laqué miso-érable au four',
        'desc': 'Saumon glacé au miso et sirop d\'érable, accompagné de brocoli et riz complet.',
        'instr': 'Mélanger miso, érable, sauce soja et gingembre. Badigeonner le saumon. Cuire 12 min à 200°C. Servir avec brocoli vapeur et riz.',
        'portions': 1,
        'img': _u('1485921325833-c519f76c4927'),
        'ingredients': [('Saumon frais', 150), ('Brocoli', 150), ('Riz complet cuit', 150), ('Miso blanc', 15), ('Sirop d\'érable', 10), ('Sauce soja legere', 8), ('Gingembre frais', 5), ('Graines de sesame', 4)],
    },
    {
        'nom': 'Tofu général Tso brocoli-riz',
        'desc': 'Plat sino-américain végétal : tofu croustillant en sauce aigre-douce-épicée.',
        'instr': 'Couper le tofu en cubes, dorer dans huile. Mélanger sauce soja, vinaigre, sucre, ail. Verser sur tofu, ajouter brocoli, cuire 5 min. Servir sur riz.',
        'portions': 2,
        'img': _u('1567620905732-2d1ec7ab7445'),
        'ingredients': [('Tofu ferme', 250), ('Brocoli', 200), ('Riz blanc cuit', 200), ('Sauce soja legere', 20), ('Vinaigre de riz', 10), ('Ail', 8), ('Gingembre frais', 6), ('Sauce sriracha', 6), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Tajine poulet-pruneaux-amandes',
        'desc': 'Tajine marocain sucré-salé, parfumé au gingembre et cannelle.',
        'instr': 'Dorer le poulet avec oignons et épices. Ajouter pruneaux, amandes, eau. Mijoter 40 min à couvert. Servir avec semoule.',
        'portions': 2,
        'img': _u('1549611016-3a1c5ba7a4f0'),
        'ingredients': [('Poulet cuisse sans peau', 300), ('Figues sechees', 80), ('Amandes', 30), ('Semoule cuite', 200), ('Oignons', 80), ('Gingembre frais', 6), ('Cannelle', 3), ('Huile d\'olive', 12)],
    },
    {
        'nom': 'Cabillaud sauce vierge tomate-olives',
        'desc': 'Poisson blanc poêlé, sauce méditerranéenne froide aux tomates fraîches.',
        'instr': 'Poêler cabillaud 4 min de chaque côté. Mélanger à froid tomates en dés, olives, basilic, huile d\'olive et citron. Servir sur le poisson chaud.',
        'portions': 1,
        'img': _u('1467003909585-2f8a72700288'),
        'ingredients': [('Cabillaud', 180), ('Tomates', 150), ('Olives vertes', 30), ('Basilic frais', 8), ('Citron vert jus', 10), ('Huile d\'olive', 12), ('Quinoa cuit', 150)],
    },

    # ── SOUPES ──────────────────────────────────────────────────────────────
    {
        'nom': 'Velouté carottes-gingembre',
        'desc': 'Soupe douce et réconfortante, riche en bêta-carotène.',
        'instr': 'Faire revenir oignon et gingembre. Ajouter carottes en rondelles et bouillon. Cuire 25 min. Mixer avec un filet de crème.',
        'portions': 3,
        'img': _u('1547308283-b7f0c8f0e7c0'),
        'ingredients': [('Carottes', 500), ('Oignons', 100), ('Gingembre frais', 15), ('Creme legere 15%', 60), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Pho de poulet aux herbes fraîches',
        'desc': 'Soupe vietnamienne traditionnelle : bouillon parfumé, vermicelles et herbes.',
        'instr': 'Faire infuser gingembre, ail et anis dans bouillon de poulet 30 min. Cuire vermicelles. Dresser avec poulet effiloché, vermicelles, oignons verts et basilic.',
        'portions': 2,
        'img': _u('1569718212165-3a8278d5f624'),
        'ingredients': [('Blanc de poulet', 200), ('Vermicelles de riz', 120), ('Gingembre frais', 15), ('Ail', 8), ('Oignons verts', 20), ('Basilic frais', 10), ('Sauce soja legere', 15), ('Citron vert jus', 12)],
    },
    {
        'nom': 'Soupe courgettes-basilic crémeuse',
        'desc': 'Soupe estivale légère, ricotta pour un effet velours sans crème.',
        'instr': 'Faire fondre oignon. Ajouter courgettes en rondelles et bouillon. Cuire 15 min. Mixer avec ricotta et basilic.',
        'portions': 3,
        'img': _u('1547308283-b7f0c8f0e7c0'),
        'ingredients': [('Courgette', 600), ('Oignons', 80), ('Ricotta', 100), ('Basilic frais', 15), ('Ail', 6), ('Huile d\'olive', 10)],
    },

    # ── PLATS VÉGÉTARIENS ───────────────────────────────────────────────────
    {
        'nom': 'Buddha bowl tempeh teriyaki',
        'desc': 'Bol végétal complet : tempeh mariné, légumes rôtis et quinoa.',
        'instr': 'Mariner tempeh 30 min dans sauce soja, érable, gingembre. Cuire à la poêle 8 min. Servir sur quinoa avec carottes, edamame et avocat.',
        'portions': 1,
        'img': _u('1512621776951-a57ef1617f7a'),
        'ingredients': [('Tempeh', 120), ('Quinoa cuit', 150), ('Carottes', 80), ('Edamame ecale', 60), ('Avocat', 60), ('Sauce soja legere', 15), ('Sirop d\'érable', 8), ('Gingembre frais', 5)],
    },
    {
        'nom': 'Galettes de lentilles aux herbes',
        'desc': 'Galettes végétales riches en protéines, dorées à la poêle.',
        'instr': 'Mixer lentilles avec œuf, ail et herbes. Façonner les galettes. Cuire 4 min de chaque côté à la poêle avec un filet d\'huile.',
        'portions': 2,
        'img': _u('1547591049-9a47a86eb6f9'),
        'ingredients': [('Lentilles vertes cuites', 300), ('Oeuf entier', 60), ('Flocons d\'avoine', 40), ('Oignons', 50), ('Ail', 8), ('Basilic frais', 8), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Curry indien pois chiches-épinards',
        'desc': 'Channa palak végétalien, parfumé aux épices indiennes.',
        'instr': 'Faire revenir oignon, ail, gingembre et épices. Ajouter tomates et pois chiches, mijoter 15 min. Incorporer épinards en fin de cuisson.',
        'portions': 2,
        'img': _u('1543339308-43e59d6b73a6'),
        'ingredients': [('Pois chiches cuits', 400), ('Épinards', 200), ('Tomates', 200), ('Oignons', 100), ('Ail', 10), ('Gingembre frais', 8), ('Curcuma poudre', 4), ('Huile d\'olive', 10)],
    },
    {
        'nom': 'Risotto champignons et noix de cajou',
        'desc': 'Risotto crémeux végétarien : champignons sautés, parmesan et croquant des noix.',
        'instr': 'Nacrer le riz arborio. Ajouter bouillon louche par louche en remuant. Incorporer champignons sautés, parmesan et noix de cajou en fin.',
        'portions': 2,
        'img': _u('1574484184081-afea8a62f9c6'),
        'ingredients': [('Riz arborio', 160), ('Champignons de Paris', 250), ('Champignons shiitake', 80), ('Parmesan rape', 30), ('Noix de cajou', 30), ('Oignons', 50), ('Huile d\'olive', 12)],
    },

    # ── SNACKS / ENCAS ──────────────────────────────────────────────────────
    {
        'nom': 'Boules d\'énergie cacao-cranberries',
        'desc': 'Encas sans cuisson, énergie longue : dattes, avoine, cacao et cranberries.',
        'instr': 'Mixer flocons d\'avoine, dattes (ou autres fruits secs), cacao, beurre d\'amande. Former des boules. Rouler dans cranberries hachées. Réfrigérer 30 min.',
        'portions': 8,
        'img': _u('1610970881699-44a5587cb435'),
        'ingredients': [('Flocons d\'avoine', 100), ('Figues sechees', 80), ('Beurre d\'amande', 60), ('Cacao en poudre non sucré', 15), ('Cranberries sechees', 40), ('Miel', 20)],
    },
    {
        'nom': 'Houmous de betterave et bâtonnets',
        'desc': 'Snack coloré et antioxydant : houmous rose servi avec crudités.',
        'instr': 'Mixer betterave, pois chiches, tahini, ail et citron. Servir avec bâtonnets de carotte, concombre et endive.',
        'portions': 4,
        'img': _u('1604908176997-125f25cc6f3d'),
        'ingredients': [('Betterave cuite', 250), ('Pois chiches cuits', 200), ('Tahini (puree sesame)', 30), ('Ail', 6), ('Citron vert jus', 15), ('Carottes', 150), ('Concombre', 150), ('Endive', 100)],
    },
    {
        'nom': 'Crackers protéinés multi-graines',
        'desc': 'Crackers maison croustillants, riches en fibres et bons gras.',
        'instr': 'Mélanger graines (chia, lin, tournesol, sésame), farine et eau. Étaler très finement. Cuire 30 min à 160°C jusqu\'à doré.',
        'portions': 6,
        'img': _u('1568051243851-f9b136146e97'),
        'ingredients': [('Graines de chia', 30), ('Graines de lin', 30), ('Graines tournesol', 30), ('Graines de sesame', 20), ('Farine d\'avoine', 50), ('Huile d\'olive', 15)],
    },
    {
        'nom': 'Edamame pimentés sel-citron',
        'desc': 'Snack japonais classique, riche en protéines végétales (11g pour 100g).',
        'instr': 'Cuire edamame 5 min à l\'eau bouillante salée. Égoutter. Mélanger avec piment, sel et zeste de citron.',
        'portions': 2,
        'img': _u('1574484184081-afea8a62f9c6'),
        'ingredients': [('Edamame', 250), ('Sauce sriracha', 5), ('Citron vert jus', 8), ('Graines de sesame', 5)],
    },
    {
        'nom': 'Tartines ricotta-figues-miel',
        'desc': 'Snack ou petit-déj sucré-salé : ricotta crémeuse, figues fraîches, miel.',
        'instr': 'Toaster le pain. Tartiner ricotta. Disposer figues coupées en quartiers. Arroser de miel et parsemer de noix.',
        'portions': 1,
        'img': _u('1525351484163-7529414f2ded'),
        'ingredients': [('Pain de seigle', 70), ('Ricotta', 60), ('Figue fraîche', 80), ('Miel', 10), ('Noix', 15)],
    },

    # ── DESSERTS / SUCRÉ HEALTHY ────────────────────────────────────────────
    {
        'nom': 'Mousse au chocolat-avocat',
        'desc': 'Mousse végétale onctueuse : avocat + cacao + sirop d\'érable, sans œufs ni crème.',
        'instr': 'Mixer avocats bien mûrs, cacao, sirop d\'érable et lait jusqu\'à consistance lisse. Réfrigérer 1h. Servir avec framboises fraîches.',
        'portions': 3,
        'img': _u('1551024506-0bccd828d307'),
        'ingredients': [('Avocat', 300), ('Cacao en poudre non sucré', 30), ('Sirop d\'érable', 40), ('Lait demi-ecreme', 60), ('Framboises', 60)],
    },
    {
        'nom': 'Cookies banane-avoine-chocolat',
        'desc': '3 ingrédients de base, sans farine ni sucre ajouté.',
        'instr': 'Écraser bananes très mûres avec flocons d\'avoine et beurre d\'amande. Ajouter pépites de chocolat. Former 12 cookies, cuire 12 min à 180°C.',
        'portions': 12,
        'img': _u('1499636136210-6f4ee915583e'),
        'ingredients': [('Banane', 300), ('Flocons d\'avoine', 150), ('Beurre d\'amande', 40), ('Chocolat noir 70%', 50), ('Cannelle', 3)],
    },
    {
        'nom': 'Yaourt grec, miel et noix grillées',
        'desc': 'Dessert grec ultra simple : yaourt onctueux, miel parfumé, noix croquantes.',
        'instr': 'Faire dorer noix concassées à sec 2 min. Verser yaourt dans bol. Arroser de miel, parsemer de noix.',
        'portions': 1,
        'img': _u('1488477181946-6428a0291777'),
        'ingredients': [('Yaourt grec nature', 180), ('Miel', 15), ('Noix', 20), ('Cannelle', 1)],
    },
    {
        'nom': 'Pommes au four cannelle-amandes',
        'desc': 'Dessert d\'automne réconfortant, sans sucre ajouté (seulement le miel).',
        'instr': 'Évider les pommes. Garnir d\'amandes effilées, cannelle et miel. Cuire 30 min à 180°C.',
        'portions': 2,
        'img': _u('1568702846914-96b305d2aaeb'),
        'ingredients': [('Pomme', 300), ('Amandes', 30), ('Miel', 15), ('Cannelle', 3)],
    },

    # ── SHAKES / BOISSONS PROTÉINÉES ────────────────────────────────────────
    {
        'nom': 'Shake banane-cacao-cacahuète',
        'desc': 'Shake post-entraînement gourmand : ~35g protéines, glucides rapides et lents.',
        'instr': 'Mixer tous les ingrédients avec quelques glaçons jusqu\'à mousseux.',
        'portions': 1,
        'img': _u('1610970881699-44a5587cb435'),
        'ingredients': [('Banane', 120), ('Lait demi-ecreme', 250), ('Whey proteine (vanille)', 30), ('Cacao en poudre non sucré', 8), ('Beurre de cacahuete', 15)],
    },
    {
        'nom': 'Smoothie pêche-cardamome-amande',
        'desc': 'Smoothie estival original, notes orientales de la cardamome.',
        'instr': 'Mixer pêche dénoyautée, yaourt, lait d\'amande et cardamome. Servir bien frais.',
        'portions': 1,
        'img': _u('1610970881699-44a5587cb435'),
        'ingredients': [('Pêche', 200), ('Yaourt grec nature', 100), ('Lait demi-ecreme', 150), ('Cardamome', 1), ('Miel', 8), ('Amandes', 15)],
    },
    {
        'nom': 'Shake masse chocolat-avoine-banane',
        'desc': 'Mass gainer maison : ~50g protéines et ~700 kcal pour prise de masse.',
        'instr': 'Mixer flocons trempés, lait, banane, beurre de cacahuète, whey et cacao. Boisson épaisse type smoothie.',
        'portions': 1,
        'img': _u('1583224994076-ae3a09b25c43'),
        'ingredients': [('Flocons d\'avoine', 60), ('Lait entier', 300), ('Banane', 150), ('Beurre de cacahuete', 25), ('Whey proteine (vanille)', 40), ('Cacao en poudre non sucré', 10)],
    },
    {
        'nom': 'Lait d\'or curcuma-poivre',
        'desc': 'Boisson ayurvédique du soir : curcuma anti-inflammatoire, parfait après séance.',
        'instr': 'Chauffer le lait sans bouillir avec curcuma, cannelle, gingembre et miel. Fouetter 2 min pour mousser.',
        'portions': 1,
        'img': _u('1546069901-ba9599a7e63c'),
        'ingredients': [('Lait demi-ecreme', 250), ('Curcuma poudre', 3), ('Cannelle', 2), ('Gingembre frais', 4), ('Miel', 10), ('Huile de coco', 5)],
    },
    {
        'nom': 'Smoothie tropical mangue-ananas-coco',
        'desc': 'Boisson rafraîchissante et exotique, riche en vitamine C.',
        'instr': 'Mixer mangue, ananas, lait de coco et yaourt grec jusqu\'à lisse. Servir avec glace pilée.',
        'portions': 1,
        'img': _u('1610970881699-44a5587cb435'),
        'ingredients': [('Mangue', 150), ('Ananas', 150), ('Lait de coco', 100), ('Yaourt grec nature', 80), ('Citron vert jus', 8)],
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
        # filter().first() au lieu de get_or_create pour tolérer d'anciens doublons
        existing = Recette.objects.filter(coach=None, nom=data['nom']).first()
        if existing is None:
            recette = Recette.objects.create(
                coach=None,
                nom=data['nom'],
                description=data['desc'],
                instructions=data['instr'],
                portions=data['portions'],
                image_url=data.get('img', ''),
            )
            new = True
        else:
            recette = existing
            new = False
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

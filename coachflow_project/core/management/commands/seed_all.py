"""
python manage.py seed_all

Commande idempotente (sûre à relancer).
- Corrige les groupes musculaires et catégories invalides existants
- Ajoute les aliments manquants (macros vérifiés)
- Ajoute les exercices manquants
- S'assure que CHAQUE coach possède exactement les 30 recettes de base
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Aliment, Exercice
from core.base_data import create_base_recettes_global

User = get_user_model()

# ── ALIMENTS ────────────────────────────────────────────────────────────────
# Format : (nom, categorie, cal, prot, gluc, lip, fibres)
ALIMENTS = [
    # ── Viandes & Poissons ──────────────────────────────────────────────────
    ('Poulet cuisse sans peau',        'viandes_poissons', 145, 23.5, 0.0,  5.7,  0.0),
    ('Escalope de veau',               'viandes_poissons', 109, 23.0, 0.0,  2.1,  0.0),
    ('Filet de porc',                  'viandes_poissons', 123, 22.0, 0.0,  3.8,  0.0),
    ('Saucisse de poulet',             'viandes_poissons', 143, 13.0, 3.0,  8.5,  0.0),
    ('Jambon de Bayonne',              'viandes_poissons', 167, 26.0, 0.5,  6.5,  0.0),
    ('Foie de volaille',               'viandes_poissons', 119, 17.1, 1.5,  4.8,  0.0),
    ('Merlu filet',                    'viandes_poissons',  72, 16.5, 0.0,  0.6,  0.0),
    ('Hareng fumé',                    'viandes_poissons', 215, 22.0, 0.0, 14.0,  0.0),
    ('Calamar',                        'viandes_poissons',  78, 16.1, 0.8,  1.0,  0.0),
    ('Moules cuites',                  'viandes_poissons',  86, 11.9, 3.7,  2.2,  0.0),
    ('Surimi',                         'viandes_poissons',  95, 10.5, 9.5,  1.5,  0.0),
    ('Oeuf de caille',                 'viandes_poissons', 158, 13.1, 0.3, 11.1,  0.0),
    ('Steak haché 15% MG',             'viandes_poissons', 195, 17.0, 0.0, 14.5,  0.0),
    ('Pintade filet',                  'viandes_poissons', 110, 22.0, 0.0,  2.5,  0.0),
    ('Lapin râble',                    'viandes_poissons', 114, 21.0, 0.0,  3.4,  0.0),

    # ── Légumes ─────────────────────────────────────────────────────────────
    ('Mâche',                          'legumes',  14,  2.0,  1.6,  0.4,  1.8),
    ('Roquette',                       'legumes',  25,  2.6,  3.7,  0.7,  1.6),
    ('Endive',                         'legumes',  17,  1.0,  3.1,  0.1,  0.9),
    ('Poireau',                        'legumes',  31,  1.8,  6.5,  0.3,  1.8),
    ('Chou rouge',                     'legumes',  31,  1.4,  7.4,  0.2,  2.1),
    ('Chou vert',                      'legumes',  24,  1.4,  5.4,  0.1,  2.3),
    ('Chou de Bruxelles',              'legumes',  43,  3.4,  8.9,  0.5,  3.8),
    ('Blette (côte de blette)',        'legumes',  19,  1.8,  3.7,  0.1,  1.6),
    ('Céleri branche',                 'legumes',  16,  0.7,  3.0,  0.2,  1.6),
    ('Céleri rave',                    'legumes',  42,  1.5,  9.2,  0.3,  1.8),
    ('Navet',                          'legumes',  28,  0.9,  6.4,  0.1,  1.8),
    ('Panais',                         'legumes',  75,  1.3, 17.4,  0.3,  4.7),
    ('Betterave crue',                 'legumes',  44,  1.7, 10.0,  0.1,  2.8),
    ('Oignon rouge',                   'legumes',  40,  1.1,  9.3,  0.1,  1.7),
    ('Échalote',                       'legumes',  72,  2.5, 16.8,  0.1,  3.2),
    ('Maïs en conserve',               'legumes',  83,  2.9, 18.7,  1.0,  2.7),
    ('Cœurs d\'artichaut',             'legumes',  45,  2.9,  9.5,  0.1,  5.4),
    ('Asperge blanche',                'legumes',  22,  2.2,  3.8,  0.1,  2.1),
    ('Épinards surgelés',              'legumes',  23,  2.9,  3.7,  0.4,  2.6),
    ('Poivron orange',                 'legumes',  31,  1.0,  6.7,  0.3,  2.1),
    ('Courgette jaune',                'legumes',  17,  1.2,  3.6,  0.2,  1.1),
    ('Potiron',                        'legumes',  26,  1.0,  6.5,  0.1,  0.5),
    ('Ail en poudre',                  'legumes', 331, 16.6, 72.7,  0.7,  9.0),

    # ── Féculents & Céréales ─────────────────────────────────────────────────
    ('Couscous cuit',                  'feculents',  94,  3.4, 20.9,  0.1,  1.4),
    ('Millet cuit',                    'feculents', 119,  3.5, 23.7,  1.0,  0.6),
    ('Semoule cuite',                  'feculents',  97,  3.5, 20.8,  0.5,  1.3),
    ('Pain baguette',                  'feculents', 272,  9.0, 56.4,  1.3,  2.7),
    ('Pain de campagne',               'feculents', 251,  8.5, 51.5,  1.5,  3.1),
    ('Biscottes complètes',            'feculents', 369, 10.9, 76.0,  4.0,  5.4),
    ('Wasa complet',                   'feculents', 308, 10.5, 59.2,  2.5, 16.0),
    ('Crackers au sésame',             'feculents', 440,  8.5, 68.0, 14.0,  3.5),
    ('Riz sauvage cuit',               'feculents', 101,  4.0, 21.3,  0.3,  1.8),
    ('Riz rouge cuit',                 'feculents', 111,  2.6, 22.8,  0.9,  1.8),
    ('Gnocchi cuits',                  'feculents', 131,  2.5, 28.2,  0.6,  1.3),
    ('Orge cuite',                     'feculents', 123,  2.3, 28.2,  0.4,  3.8),
    ('Avoine flocons hydratés',        'feculents', 101,  4.2, 19.5,  1.4,  2.5),
    ('Müesli sans sucre ajouté',       'feculents', 352, 10.5, 59.2,  7.5, 10.0),

    # ── Produits laitiers ────────────────────────────────────────────────────
    ('Yaourt nature entier',           'laitiers',  63,  3.5,  4.7,  3.3,  0.0),
    ('Lait entier',                    'laitiers',  61,  3.2,  4.8,  3.3,  0.0),
    ('Lait écrémé',                    'laitiers',  35,  3.6,  4.9,  0.1,  0.0),
    ('Comté',                          'laitiers', 413, 29.3,  0.5, 32.9,  0.0),
    ('Gruyère',                        'laitiers', 413, 29.8,  0.4, 32.3,  0.0),
    ('Camembert',                      'laitiers', 291, 20.0,  0.5, 23.7,  0.0),
    ('Fromage blanc 20%',              'laitiers',  91,  8.5,  4.2,  4.1,  0.0),
    ('Kéfir de lait',                  'laitiers',  45,  3.3,  4.8,  1.1,  0.0),
    ('Burrata',                        'laitiers', 246, 10.1,  2.4, 22.3,  0.0),
    ('Quark nature',                   'laitiers',  65, 12.0,  4.0,  0.2,  0.0),

    # ── Fruits ──────────────────────────────────────────────────────────────
    ('Cerise',                         'fruits',    63,  1.0, 16.0,  0.2,  2.1),
    ('Pêche',                          'fruits',    39,  0.9,  9.5,  0.3,  1.5),
    ('Abricot frais',                  'fruits',    48,  1.4, 11.1,  0.4,  2.0),
    ('Prune',                          'fruits',    46,  0.7, 11.4,  0.3,  1.4),
    ('Figue fraîche',                  'fruits',    74,  0.7, 19.2,  0.3,  2.9),
    ('Nectarine',                      'fruits',    44,  1.1, 10.9,  0.3,  1.7),
    ('Melon',                          'fruits',    34,  0.8,  7.9,  0.2,  0.9),
    ('Groseilles',                     'fruits',    56,  1.1, 13.8,  0.6,  4.3),
    ('Mûres fraîches',                 'fruits',    43,  1.4,  9.8,  0.5,  5.3),
    ('Litchi',                         'fruits',    66,  0.8, 16.5,  0.4,  1.3),
    ('Papaye',                         'fruits',    43,  0.5, 10.8,  0.3,  1.8),

    # ── Matières grasses ────────────────────────────────────────────────────
    ('Huile de tournesol',             'matieres_grasses', 884,  0.0,  0.0, 99.9,  0.0),
    ('Huile de noix',                  'matieres_grasses', 884,  0.0,  0.0, 99.9,  0.0),
    ('Ghee (beurre clarifié)',         'matieres_grasses', 900,  0.1,  0.0, 99.8,  0.0),
    ('Purée de noix de cajou',         'matieres_grasses', 587, 15.3, 26.7, 46.4,  3.3),
    ('Crème de coco',                  'matieres_grasses', 330,  3.3,  7.4, 33.8,  2.2),
    ('Margarine végétale',             'matieres_grasses', 720,  0.2,  0.9, 80.0,  0.0),
    ('Vinaigrette légère',             'matieres_grasses', 143,  0.4,  7.9, 12.5,  0.0),

    # ── Légumineuses ────────────────────────────────────────────────────────
    ('Fèves cuites',                   'legumineuses',  88,  7.9, 15.6,  0.4,  7.6),
    ('Pois cassés cuits',              'legumineuses', 116,  8.3, 21.1,  0.4,  8.3),
    ('Azukis cuits',                   'legumineuses', 128,  7.5, 24.9,  0.1,  7.3),
    ('Haricots mungo cuits',           'legumineuses', 105,  7.0, 19.1,  0.4,  7.6),
    ('Soja jaune cuit',                'legumineuses', 173, 16.6, 11.3,  9.0,  6.0),

    # ── Autres (compléments, épices, condiments) ─────────────────────────────
    ('Protéine de soja texturée',      'autres',     329, 50.0, 34.0,  3.5,  9.0),
    ('Caséine protéine',               'autres',     363, 80.0, 11.0,  2.0,  0.0),
    ('Creatine monohydrate',           'autres',       0,  0.0,  0.0,  0.0,  0.0),
    ('Sucre de coco',                  'autres',     377,  0.0, 97.0,  0.0,  0.0),
    ('Xylitol',                        'autres',     240,  0.0, 60.0,  0.0,  0.0),
    ('Sirop d\'érable',                'autres',     260,  0.1, 67.2,  0.1,  0.0),
    ('Cacao en poudre non sucré',      'autres',     228, 19.6, 10.4, 13.7, 37.0),
    ('Gélatine en poudre',             'autres',     335, 87.6,  0.0,  0.1,  0.0),
    ('Agar-agar',                      'autres',     306,  6.2, 80.9,  0.2,  0.0),
    ('Vinaigre de cidre',              'autres',      19,  0.1,  0.9,  0.0,  0.0),
    ('Sauce worcestershire',           'autres',      66,  1.7, 14.1,  0.1,  0.0),
    ('Chapelure',                      'autres',     359, 10.5, 73.0,  3.0,  2.7),
    ('Levure chimique',                'autres',     117,  2.3, 27.7,  0.0,  0.0),
    ('Bicarbonate de soude',           'autres',       0,  0.0,  0.0,  0.0,  0.0),
    ('Stévia en poudre',               'autres',     270,  0.0, 90.0,  0.0,  0.0),
]

# ── EXERCICES ───────────────────────────────────────────────────────────────
# Format : (nom, groupe, categorie, description)
EXERCICES = [
    # ── Mobilité ──────────────────────────────────────────────────────────────
    ('Rotation thoracique au sol',    'full_body', 'mobilite',
     'Allongé sur le côté, genoux fléchis. Faire tourner le buste en ouvrant le bras vers l\'arrière. Améliore la rotation de la colonne thoracique.'),
    ('Open Book',                     'full_body', 'mobilite',
     'Allongé sur le côté, bras tendus superposés. Ouvrir le bras supérieur en arc de cercle vers l\'arrière tout en regardant la main. Mobilise thorax et épaules.'),
    ('Bretzel Stretch',               'full_body', 'mobilite',
     'Allongé sur le côté dans une position en bretzel (genou haut en avant, pied arrière tenu). Ouvrir l\'épaule vers le sol. Étirement hanche et thorax simultané.'),
    ('Étirement adducteurs papillon', 'full_body', 'mobilite',
     'Assis, plantes des pieds ensemble, genoux ouverts sur le côté. Presser doucement les genoux vers le sol. Étire l\'intérieur des cuisses.'),
    ('Étirement fléchisseurs hanche', 'quadriceps', 'mobilite',
     'En fente basse, genou arrière au sol. Pousser le bassin vers l\'avant. Maintenir 30-60 secondes chaque côté.'),
    ('Roll fascia plantaire',         'full_body', 'mobilite',
     'Debout, poser une balle ou rouleau sous le pied. Faire rouler lentement du talon aux orteils. Libère les tensions de la voûte plantaire.'),
    ('Quadruped Reach',               'full_body', 'mobilite',
     'À 4 pattes, tendre un bras vers l\'avant et la jambe opposée. Alterner lentement. Active la stabilité lombaire et la mobilité des épaules.'),
    ('Hip 90/90 Actif',               'fessiers',  'mobilite',
     'Assis, deux jambes en angle de 90°. Se pencher vers la jambe avant puis basculer sur l\'autre. Version active du Hip 90/90 statique, améliore la rotation des hanches.'),
    ('Cercles d\'épaule avec bâton',  'epaules',   'mobilite',
     'Tenir un bâton ou élastique horizontalement, faire passer par-dessus la tête et dans le dos. Améliore la mobilité gléno-humérale.'),
    ('Étirement mollets au mur',      'mollets',   'mobilite',
     'Mains au mur, un pied en arrière, jambe tendue, talon collé au sol. Inclinaison vers le mur. Étire le soléaire et le gastrocnémien.'),
    ('Flexion latérale cervicale',    'full_body', 'mobilite',
     'Debout ou assis, incliner lentement l\'oreille vers l\'épaule. Maintenir 20-30 sec. Étire les muscles latéraux du cou.'),
    ('Squat profond tenu',            'full_body', 'mobilite',
     'Descendre en squat maximum, les talons au sol, mains jointes. Tenir 30-60 secondes. Améliore la mobilité des chevilles, hanches et thorax.'),

    # ── Gainage ───────────────────────────────────────────────────────────────
    ('Bird-Dog (Oiseau-Chien)',        'abdominaux', 'gainage',
     'À 4 pattes, dos plat. Tendre le bras droit et la jambe gauche simultanément, revenir lentement. Stabilise la région lombaire.'),
    ('Hollow Body Rock',              'abdominaux', 'gainage',
     'Position Hollow Body allongé (dos plat, lombaires collées). Balancer avant-arrière comme un berceau. Renforce le gainage antérieur.'),
    ('Stir the Pot',                  'abdominaux', 'gainage',
     'Avant-bras sur Swiss Ball, corps en planche. Faire des cercles avec les coudes sur la balle. Sollicite intensément le gainage circulaire.'),
    ('Ab Wheel Rollout partiel',      'abdominaux', 'gainage',
     'Genoux au sol, roue devant. Rouler vers l\'avant jusqu\'à la limite de contrôle, revenir. Gainage excentrique intense.'),
    ('Suitcase Carry',                'abdominaux', 'gainage',
     'Porter une charge lourde (haltère ou kettlebell) d\'un seul côté en marchant droit. Anti-flexion latérale fonctionnelle.'),
    ('Planche sur bosu',              'abdominaux', 'gainage',
     'Avant-bras posés sur le dôme du bosu, position de planche. L\'instabilité amplifie le travail de gainage et de proprioception.'),

    # ── Pectoraux ──────────────────────────────────────────────────────────────
    ('Pompes avec pause en bas',      'pectoraux', 'force',
     'Push-up classique avec pause de 2 secondes en position basse. Élimine l\'élan, renforce la phase excentrique.'),
    ('Fly haltères couché plat',      'pectoraux', 'force',
     'Couché sur banc, haltères dans les mains bras tendus. Ouvrir en arc de cercle jusqu\'à ressentir l\'étirement pectoral, remonter.'),
    ('Dips lestés',                   'pectoraux', 'force',
     'Dips aux barres parallèles avec ceinture lestée. Incliner légèrement le buste vers l\'avant pour cibler les pectoraux inférieurs.'),
    ('Cable Fly basse poulie',        'pectoraux', 'force',
     'Cables bas, tirer en arc vers le haut et l\'intérieur. Cible les fibres supérieures du pectoral.'),

    # ── Dorsaux ────────────────────────────────────────────────────────────────
    ('Traction avec bande lastique',  'dorsaux', 'force',
     'Bande élastique accrochée en hauteur, pour les débutants ou fins de série. Mêmes bénéfices que la traction classique en assistance.'),
    ('Pullover machine',              'dorsaux', 'force',
     'Assis à la machine pullover, saisir la barre. Descendre les bras en extension. Cible le grand dorsal et le long chef du triceps.'),
    ('Shrug haltères',                'dorsaux', 'force',
     'Haltères dans les mains, bras le long du corps. Hausser les épaules vers les oreilles, maintenir 1 sec, redescendre lentement. Cible les trapèzes supérieurs.'),
    ('Row isométrique au câble',      'dorsaux', 'force',
     'En position de rowing tirage poulie basse, maintenir la position tirée 2-3 sec à chaque répétition. Renforce la rétraction scapulaire.'),

    # ── Épaules ────────────────────────────────────────────────────────────────
    ('Face Pull élastique',           'epaules', 'force',
     'Élastique à hauteur des yeux, tirer vers le visage en séparant les mains. Renforce la coiffe des rotateurs et les rhomboïdes.'),
    ('W-Raise (Élévation en W)',      'epaules', 'force',
     'Bras en W, pouces vers le ciel, remonter les bras en gardant les coudes pliés. Active les rotateurs externes et trapèzes inférieurs.'),
    ('Overhead Press assis haltères', 'epaules', 'force',
     'Assis, dos droit, haltères à hauteur des épaules. Pousser verticalement jusqu\'à extension complète, redescendre lentement.'),

    # ── Biceps ─────────────────────────────────────────────────────────────────
    ('Curl 21',                       'biceps', 'force',
     '21 répétitions partagées : 7 demi-amplitudes basse (bas → milieu), 7 demi-amplitudes haute (milieu → haut), 7 amplitudes complètes. Brûle d\'avant-bras en profondeur.'),
    ('Drag Curl barre',               'biceps', 'force',
     'Tirer la barre le long du corps (glisser contre le ventre) plutôt qu\'arquer. Maintient les coudes en arrière et isole mieux le chef long du biceps.'),
    ('Curl pronation-supination',     'biceps', 'force',
     'Curl haltère avec rotation : commencer paume vers le bas, supiner en montant. Engage les brachioradiaux et les deux chefs du biceps.'),

    # ── Triceps ────────────────────────────────────────────────────────────────
    ('Close Grip Push-up',            'triceps', 'force',
     'Push-up mains rapprochées (largeur des épaules). Coudes près du corps pour maximiser la sollicitation des triceps.'),
    ('Triceps Dip banc prise large',  'triceps', 'force',
     'Mains sur un banc derrière soi, jambes tendues. Descendre en pliant les coudes à 90°, remonter. Cibler les triceps en gardant les fesses proches du banc.'),

    # ── Quadriceps ──────────────────────────────────────────────────────────────
    ('Squat pause en bas',            'quadriceps', 'force',
     'Squat avec pause de 3 secondes dans la position basse. Élimine l\'élan du rebond, augmente l\'intensité musculaire.'),
    ('Leg Extension unilatéral',      'quadriceps', 'force',
     'Machine leg extension, une jambe à la fois. Permet de corriger les déséquilibres gauche/droite et d\'augmenter la concentration musculaire.'),
    ('Fente de marche avec haltères', 'quadriceps', 'force',
     'Avancer en fentes continues sur une distance de 20 à 40 m. Variante fonctionnelle qui améliore l\'équilibre et la coordination.'),

    # ── Ischio-jambiers ───────────────────────────────────────────────────────
    ('Leg Curl variable vitesse',     'ischio', 'force',
     'Leg Curl machine en excentrique lent (3 secondes) et concentrique rapide. La phase excentrique est la plus bénéfique pour les ischios.'),
    ('Deadlift roumain unilatéral haltère', 'ischio', 'force',
     'Debout sur une jambe, haltère dans la main opposée, descendre en inclinant le buste. Maximise la tension des ischios et des fessiers en mode fonctionnel.'),

    # ── Fessiers ──────────────────────────────────────────────────────────────
    ('Hip Thrust pied surélevé',      'fessiers', 'force',
     'Hip Thrust avec les pieds surélevés sur une boîte. Augmente l\'amplitude et la tension des fessiers en bas de mouvement.'),
    ('Abduction câble debout',        'fessiers', 'force',
     'Câble bas, cheville attachée, faire une abduction de la jambe. Cible le moyen fessier en position fonctionnelle.'),
    ('Squat sumo large',              'fessiers', 'force',
     'Écartement large, pieds pointés vers l\'extérieur. Descendre en squat profond. Maximise le travail des adducteurs et fessiers.'),

    # ── Mollets ───────────────────────────────────────────────────────────────
    ('Saut mollets pied joint',       'mollets', 'force',
     'Debout, pieds joints. Sauter rapidement en ne fléchissant que les chevilles. Développe la réactivité et la puissance des mollets.'),
    ('Calf Raise excentrique',        'mollets', 'force',
     'Monter sur la pointe des deux pieds, redescendre sur un seul en 4 secondes. Phase excentrique maximale pour hypertrophie des mollets.'),

    # ── Full Body ──────────────────────────────────────────────────────────────
    ('Devil\'s Press',                'full_body', 'force',
     'Haltères au sol, faire un burpee, remonter les haltères et les lancer au-dessus de la tête en un mouvement. Full body explosif.'),
    ('Clean haltères',                'full_body', 'force',
     'Ramasser les haltères depuis le sol et les amener aux épaules en un mouvement explosif. Base de l\'haltérophilie, développe la puissance globale.'),
    ('Thruster haltères',             'full_body', 'force',
     'Front squat suivi d\'un développé militaire en un seul mouvement continu. Intense, sollicite jambes, tronc et épaules.'),
    ('Sandbag Get-Up',                'full_body', 'force',
     'Se lever du sol avec un sac de sable sur l\'épaule, revenir au sol. Version fonctionnelle du Turkish Get-Up avec charge instable.'),

    # ── Cardio ────────────────────────────────────────────────────────────────
    ('Tabata Squat',                  'full_body', 'cardio',
     '8 séries de 20 secondes de squats à intensité maximale, 10 secondes de repos. Protocole HIIT classique, améliore la VO2max.'),
    ('Row 2000m',                     'full_body', 'cardio',
     'Sur rameur, parcourir 2000m au meilleur temps possible. Test d\'endurance et de puissance cardiovasculaire de référence.'),
    ('Assault Bike HIIT',             'full_body', 'cardio',
     '10 sprints de 15 secondes entrecoupés de 45 secondes de récupération active. Poumons et jambes à l\'épreuve.'),
    ('Corde à sauter double-unders',  'full_body', 'cardio',
     'Sauter à la corde avec 2 passages de corde par saut. Technique plus exigeante que les simples. Cardio intense et coordination.'),
    ('Vélo HIIT sprints',             'full_body', 'cardio',
     'Alterner 30 sec d\'effort maximal (sprint) et 90 sec de récupération sur vélo stationnaire. Protocole 8 à 10 répétitions.'),
]


# ── CORRECTIONS CATÉGORIES ────────────────────────────────────────────────────
CAT_REMAP = {
    'cereales':         'feculents',
    'epices':           'autres',
    'huiles_graisses':  'matieres_grasses',
    'oleagineux':       'matieres_grasses',
    'poissons':         'viandes_poissons',
    'sauces_condiments':'autres',
    'viandes':          'viandes_poissons',
}

GROUPE_REMAP = {
    'avant_bras': 'biceps',
}


class Command(BaseCommand):
    help = 'Corrige et enrichit la base Aliments, Exercices et Recettes'

    def handle(self, *args, **options):
        self.fix_categories()
        self.seed_aliments()
        self.seed_exercices()
        self.seed_recettes()
        self.stdout.write(self.style.SUCCESS('\n✅ Base alimentée avec succès.'))

    # ── Corrections ──────────────────────────────────────────────────────────

    def fix_categories(self):
        fixed_a = 0
        for old, new in CAT_REMAP.items():
            n = Aliment.objects.filter(categorie=old).update(categorie=new)
            fixed_a += n
        fixed_e = 0
        for old, new in GROUPE_REMAP.items():
            n = Exercice.objects.filter(groupe_musculaire=old).update(groupe_musculaire=new)
            fixed_e += n
        self.stdout.write(f'  🔧 Catégories corrigées : {fixed_a} aliments, {fixed_e} exercices')

    # ── Aliments ──────────────────────────────────────────────────────────────

    def seed_aliments(self):
        created = 0
        for nom, cat, cal, prot, gluc, lip, fib in ALIMENTS:
            obj, new = Aliment.objects.get_or_create(
                nom=nom,
                defaults=dict(
                    categorie=cat,
                    calories_100g=cal,
                    proteines_100g=prot,
                    glucides_100g=gluc,
                    lipides_100g=lip,
                    fibres_100g=fib,
                )
            )
            if new:
                created += 1
        self.stdout.write(f'  🥦 Aliments : {created} ajoutés')

    # ── Exercices ─────────────────────────────────────────────────────────────

    def seed_exercices(self):
        created = 0
        for nom, groupe, cat, desc in EXERCICES:
            obj, new = Exercice.objects.get_or_create(
                nom=nom,
                defaults=dict(
                    groupe_musculaire=groupe,
                    categorie=cat,
                    description=desc,
                    est_personnalise=False,
                )
            )
            if new:
                created += 1
        self.stdout.write(f'  🏋️  Exercices : {created} ajoutés')

    # ── Recettes ──────────────────────────────────────────────────────────────

    def seed_recettes(self):
        n = create_base_recettes_global()
        existing = __import__('core.models', fromlist=['Recette']).Recette.objects.filter(coach__isnull=True).count()
        self.stdout.write(f'  🍽️  {n} recettes globales créées ({existing} au total dans la bibliothèque)')

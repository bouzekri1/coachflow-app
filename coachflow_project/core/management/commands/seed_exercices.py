from django.core.management.base import BaseCommand
from core.models import Exercice

BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"

EXERCICES = [
    # ══════════════════════════════════════════════════════
    # PECTORAUX (16)
    # ══════════════════════════════════════════════════════
    {"nom": "Pompes (Push-up)", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Exercice fondamental au poids du corps. Ciblant pectoraux, triceps et deltoïdes antérieurs. Adapté à tous niveaux."},
    {"nom": "Développé couché barre", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Exercice roi des pectoraux à la barre. Allongé sur un banc plat, poussez la barre verticalement en contrôlant la descente."},
    {"nom": "Développé couché haltères", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Variante aux haltères du développé couché. Amplitude plus grande et meilleure activation des stabilisateurs."},
    {"nom": "Développé incliné barre", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Développé sur banc incliné à 30-45°. Cible le chef claviculaire (pectoraux hauts)."},
    {"nom": "Développé incliné haltères", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Développé incliné avec haltères pour plus d'amplitude. Excellent pour les pectoraux hauts."},
    {"nom": "Développé décliné barre", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Développé sur banc décliné. Sollicite le faisceau sternal inférieur des pectoraux."},
    {"nom": "Écartés haltères à plat", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Mouvement d'isolation en arc de cercle avec haltères. Étirement maximal des pectoraux."},
    {"nom": "Écartés poulie croisée", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Isolation des pectoraux à la poulie. Permet de varier l'angle et de garder la tension constante."},
    {"nom": "Dips pectoraux", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Dips avec le buste penché en avant pour maximiser le travail des pectoraux."},
    {"nom": "Pompes larges", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Pompes avec écartement large des mains. Amplifie le travail des pectoraux externes."},
    {"nom": "Pompes diamant", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Pompes avec les mains rapprochées en forme de losange. Sollicite davantage les triceps et pectoraux internes."},
    {"nom": "Pec Deck (Machine)", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Machine d'isolation pour les pectoraux. Mouvement de contraction concentrique pur."},
    {"nom": "Développé couché prise serrée", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Développé couché barre avec prise rapprochée. Cible davantage les triceps et la partie interne des pectoraux."},
    {"nom": "Pompes sur bosu", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Pompes avec les mains sur un bosu ball. Renforce les stabilisateurs et améliore l'équilibre."},
    {"nom": "Svend Press", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Pression isométrique d'une plaque devant la poitrine. Excellent pour la contraction médiale."},
    {"nom": "Floor Press", "groupe_musculaire": "pectoraux", "categorie": "force",
     "description": "Développé couché au sol avec haltères ou barre. Limite l'amplitude et protège les épaules."},

    # ══════════════════════════════════════════════════════
    # DORSAUX (18)
    # ══════════════════════════════════════════════════════
    {"nom": "Traction prise pronation", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Traction à la barre fixe, mains en pronation (prise overhand). Excellent pour les grand dorsaux."},
    {"nom": "Traction prise supination (Chin-up)", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Traction prise en supination. Sollicite davantage les biceps en plus des dorsaux."},
    {"nom": "Traction prise neutre", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Traction avec prise parallèle. Position ergonomique réduisant le stress sur les épaules."},
    {"nom": "Rowing barre prise pronation", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Tirage horizontal penché avec barre. Cible l'ensemble des dorsaux, trapèzes et rhomboïdes."},
    {"nom": "Rowing haltère unilatéral", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Tirage unilatéral avec haltère, appui sur banc. Corrige les asymétries et maximise l'amplitude."},
    {"nom": "Tirage poulie haute prise large", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Exercice à la machine pour les dorsaux. Prise large pour cibler les parties latérales."},
    {"nom": "Tirage poulie haute prise serrée", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Tirage poulie haute avec prise serrée neutre. Accentue la contraction centrale des dorsaux."},
    {"nom": "Tirage poulie basse assis", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Rowing à la poulie basse assis. Excellent pour l'épaisseur du dos et les rhomboïdes."},
    {"nom": "Pull-over haltère", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Mouvement en arc de cercle avec haltère, allongé sur banc. Sollicite grand dorsal et grand dentelé."},
    {"nom": "Soulevé de terre sumo", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Variante sumo du soulevé de terre avec écartement large des pieds. Moins de stress lombaire."},
    {"nom": "Good Morning", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Flexion du tronc avec barre sur les trapèzes. Excellent pour les érecteurs du rachis et ischios."},
    {"nom": "Rowing T-Bar", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Rowing à la barre T. Grande charge possible, excellent pour l'épaisseur globale du dos."},
    {"nom": "Superman", "groupe_musculaire": "dorsaux", "categorie": "gainage",
     "description": "Extension dorsale au sol, membres allongés. Renforce les érecteurs du rachis sans matériel."},
    {"nom": "Extension lombaire machine", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Extension du dos à la machine ou sur banc dédié. Cible les érecteurs du rachis."},
    {"nom": "Face Pull", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Tirage poulie vers le visage. Cible les deltoïdes postérieurs et les rhomboïdes. Santé épaules."},
    {"nom": "Rowing barre Yates", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Rowing avec légère inclinaison et prise supination. Mise au point par Dorian Yates pour l'épaisseur."},
    {"nom": "Rack Pull", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Soulevé de terre partiel depuis les crochets. Charge maximale, cible le haut du dos et trapèzes."},
    {"nom": "Shrug barre (Haussements d'épaules)", "groupe_musculaire": "dorsaux", "categorie": "force",
     "description": "Élévation des épaules avec barre lourde. Isolation des trapèzes supérieurs."},

    # ══════════════════════════════════════════════════════
    # ÉPAULES (14)
    # ══════════════════════════════════════════════════════
    {"nom": "Développé militaire barre", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Poussée verticale avec barre debout ou assis. Exercice de base des épaules."},
    {"nom": "Développé militaire haltères", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Développé avec haltères. Plus de liberté articulaire et meilleure activation des stabilisateurs."},
    {"nom": "Arnold Press", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Développé haltères avec rotation. Sollicite les trois faisceaux du deltoïde."},
    {"nom": "Élévations latérales haltères", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Isolation du deltoïde latéral. Lever les bras sur les côtés à l'horizontale."},
    {"nom": "Élévations latérales câble", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Élévation latérale à la poulie basse. Tension constante tout au long du mouvement."},
    {"nom": "Élévations frontales haltères", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Lever les bras devant soi pour isoler le deltoïde antérieur."},
    {"nom": "Oiseau (Reverse Fly)", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Écartés inversés penché en avant. Cible les deltoïdes postérieurs et rhomboïdes."},
    {"nom": "Upright Row (Tirage menton)", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Tirage vertical vers le menton avec barre ou haltères. Sollicite épaules et trapèzes."},
    {"nom": "Pike Push-up", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Pompe en position de V inversé. Excellent exercice au poids du corps pour les épaules."},
    {"nom": "Développé militaire machine", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Développé épaules guidé en machine. Idéal pour débutants ou fins de séance."},
    {"nom": "Rotation externe haltère", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Exercice de coiffe des rotateurs. Essentiel pour la santé et la stabilité de l'épaule."},
    {"nom": "L-Fly (Rotation coiffe)", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Rotation externe couché sur le côté. Renforce la coiffe des rotateurs et prévient les blessures."},
    {"nom": "Cuban Press", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Exercice combiné rotation externe + développé. Renforce coiffe et deltoïdes simultanément."},
    {"nom": "Handstand Push-up", "groupe_musculaire": "epaules", "categorie": "force",
     "description": "Pompe en équilibre sur les mains contre un mur. Niveau avancé, excellent pour les épaules."},

    # ══════════════════════════════════════════════════════
    # BICEPS (10)
    # ══════════════════════════════════════════════════════
    {"nom": "Curl biceps haltères alterné", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Flexion du coude alternée avec haltères. Exercice d'isolation classique des biceps."},
    {"nom": "Curl biceps barre", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Curl à la barre droite ou EZ. Permet de charger lourd pour les biceps."},
    {"nom": "Curl marteau (Hammer Curl)", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Flexion avec prise neutre. Travaille le brachial antérieur et le long supinateur."},
    {"nom": "Curl concentré", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Curl assis, coude appuyé sur la cuisse. Isolation maximale du biceps."},
    {"nom": "Curl incliné haltères", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Curl sur banc incliné, bras en arrière. Étirement complet du biceps en position basse."},
    {"nom": "Curl poulie basse", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Curl à la poulie basse. Tension constante tout au long du mouvement."},
    {"nom": "Curl barre EZ prise serrée", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Curl à la barre EZ, prise rapprochée. Cible le long biceps et diminue la sollicitation du poignet."},
    {"nom": "Curl Zottman", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Curl avec rotation des paumes au sommet. Travaille biceps (montée) et avant-bras (descente)."},
    {"nom": "Curl araignée (Spider Curl)", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Curl allongé sur un banc incliné, bras pendants. Pic de contraction maximal."},
    {"nom": "Traction supination (Chin-up lent)", "groupe_musculaire": "biceps", "categorie": "force",
     "description": "Chin-up avec tempo lent pour maximiser le travail des biceps."},

    # ══════════════════════════════════════════════════════
    # TRICEPS (10)
    # ══════════════════════════════════════════════════════
    {"nom": "Extension triceps poulie haute", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Poussée vers le bas à la poulie haute. Isolation classique des triceps."},
    {"nom": "Extension triceps haltère unilatéral", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Extension au-dessus de la tête avec un haltère. Cible le long faisceau du triceps."},
    {"nom": "Skull Crusher (Barre EZ)", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Extension couchée avec barre EZ vers le front. Charge importante possible."},
    {"nom": "Dips barre parallèles", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Dips entre barres parallèles, buste droit. Maximise le travail des triceps."},
    {"nom": "Kick-back triceps haltère", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Extension horizontale du coude, penché en avant. Isolation complète des triceps."},
    {"nom": "Close Grip Bench Press", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Développé couché prise serrée. Exercice polyarticulaire lourd pour les triceps."},
    {"nom": "Extension triceps corde", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Poussée poulie avec corde. Permet un écartement en fin de mouvement pour maximiser la contraction."},
    {"nom": "Diamond Push-up", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Pompes mains rapprochées en losange. Variante sans matériel pour les triceps."},
    {"nom": "JM Press", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Hybride entre skull crusher et développé prise serrée. Charge maximale pour les triceps."},
    {"nom": "Bench Dips", "groupe_musculaire": "triceps", "categorie": "force",
     "description": "Dips sur banc avec les pieds au sol. Version débutant accessible sans équipement."},

    # ══════════════════════════════════════════════════════
    # AVANT-BRAS (6)
    # ══════════════════════════════════════════════════════
    {"nom": "Curl de poignet barre", "groupe_musculaire": "avant_bras", "categorie": "force",
     "description": "Flexion du poignet avec barre, assis. Renforce les fléchisseurs des avant-bras."},
    {"nom": "Extension de poignet barre", "groupe_musculaire": "avant_bras", "categorie": "force",
     "description": "Extension du poignet avec barre. Travaille les extenseurs des avant-bras."},
    {"nom": "Reverse Curl", "groupe_musculaire": "avant_bras", "categorie": "force",
     "description": "Curl en prise pronation. Cible les extenseurs des avant-bras et le long supinateur."},
    {"nom": "Farmer's Walk", "groupe_musculaire": "avant_bras", "categorie": "force",
     "description": "Marche avec charges lourdes en mains. Renforce la poigne, les avant-bras et le core."},
    {"nom": "Dead Hang", "groupe_musculaire": "avant_bras", "categorie": "gainage",
     "description": "Suspension statique à la barre. Renforce les avant-bras et améliore la mobilité des épaules."},
    {"nom": "Pince (Pinch Grip)", "groupe_musculaire": "avant_bras", "categorie": "force",
     "description": "Maintien d'une plaque entre le pouce et les doigts. Force de préhension spécifique."},

    # ══════════════════════════════════════════════════════
    # QUADRICEPS (16)
    # ══════════════════════════════════════════════════════
    {"nom": "Squat barre (Back Squat)", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "L'exercice roi du bas du corps. Barre sur les trapèzes, descente jusqu'aux cuisses parallèles."},
    {"nom": "Front Squat", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Squat avec barre devant la gorge. Plus de charge sur les quadriceps, moins sur le dos."},
    {"nom": "Goblet Squat", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Squat avec un haltère ou kettlebell tenu contre la poitrine. Excellent pour l'apprentissage."},
    {"nom": "Squat bulgare (Split Squat)", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Squat unilatéral avec pied arrière surélevé sur banc. Excellent pour chaque jambe séparément."},
    {"nom": "Squat corps libre", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Squat au poids du corps. Parfait pour l'échauffement, les débutants ou le volume élevé."},
    {"nom": "Presse à cuisse", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Leg press à la machine. Charge élevée possible, moins de mobilité requise."},
    {"nom": "Fentes avant haltères", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Fentes en marchant avec haltères. Travaille quadriceps et fessiers avec défi d'équilibre."},
    {"nom": "Fentes arrière haltères", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Fente en reculant une jambe. Moins de stress sur le genou que la fente avant."},
    {"nom": "Fentes latérales", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Fente sur le côté. Sollicite les adducteurs et abducteurs en plus des quadriceps."},
    {"nom": "Extension jambes machine", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Isolation des quadriceps à la machine. Attention au stress rotulien."},
    {"nom": "Step-up haltères", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Montée sur banc avec haltères. Excellent exercice fonctionnel pour les jambes."},
    {"nom": "Pistol Squat", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Squat sur une jambe, l'autre tendue devant. Exercice avancé de force et d'équilibre."},
    {"nom": "Hack Squat machine", "groupe_musculaire": "quadriceps", "categorie": "force",
     "description": "Squat guidé avec les pieds vers l'avant. Cible massivement les quadriceps."},
    {"nom": "Wall Sit", "groupe_musculaire": "quadriceps", "categorie": "gainage",
     "description": "Maintien en position squat dos au mur. Exercice isométrique pour les quadriceps."},
    {"nom": "Jump Squat", "groupe_musculaire": "quadriceps", "categorie": "cardio",
     "description": "Squat sauté. Développe la puissance et l'explosivité des membres inférieurs."},
    {"nom": "Box Jump", "groupe_musculaire": "quadriceps", "categorie": "cardio",
     "description": "Saut sur une plateforme (box). Exercice pliométrique pour l'explosivité."},

    # ══════════════════════════════════════════════════════
    # ISCHIO-JAMBIERS (10)
    # ══════════════════════════════════════════════════════
    {"nom": "Soulevé de terre conventionnel", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Le soulevé de terre classique. Sollicite ischios, fessiers, dorsaux et tout le corps."},
    {"nom": "Romanian Deadlift (RDL)", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Soulevé de terre roumain, genoux légèrement fléchis. Isolation maximale des ischios."},
    {"nom": "Leg Curl machine assis", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Flexion des genoux à la machine assis. Isolation des ischio-jambiers."},
    {"nom": "Leg Curl machine couché", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Flexion des genoux à la machine couché. Variante classique de l'isolation des ischios."},
    {"nom": "Nordic Curl", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Flexion du genou en excentrique avec le corps. Exercice puissant de prévention blessures."},
    {"nom": "Glute Ham Raise", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Extension complète sur machine GHR. Travaille ischios, fessiers et érecteurs."},
    {"nom": "Soulevé de terre jambes tendues", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "DL avec jambes quasi-tendues. Maximum d'étirement pour les ischios. Attention au dos."},
    {"nom": "Swiss Ball Leg Curl", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Flexion des genoux en appui sur swiss ball. Ischios et gainage du core."},
    {"nom": "Pont ischio (Good Morning)", "groupe_musculaire": "ischio", "categorie": "force",
     "description": "Flexion du tronc avec barre sur les épaules. Ischios et érecteurs du rachis."},
    {"nom": "Inchworm", "groupe_musculaire": "ischio", "categorie": "mobilite",
     "description": "Marche des mains au sol. Étire les ischios et réchauffe la chaîne postérieure."},

    # ══════════════════════════════════════════════════════
    # FESSIERS (12)
    # ══════════════════════════════════════════════════════
    {"nom": "Hip Thrust barre", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Poussée de hanche avec barre, dos appuyé sur banc. Exercice principal pour les fessiers."},
    {"nom": "Glute Bridge", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Pont fessier au sol, version accessible du hip thrust. Excellent pour activer les fessiers."},
    {"nom": "Glute Bridge unilatéral", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Pont fessier sur une jambe. Correction des déséquilibres et intensité accrue."},
    {"nom": "Kick-back câble", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Extension de hanche à la poulie basse. Isolation des fessiers en fin de mouvement."},
    {"nom": "Abduction hanche câble", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Écartement de jambe à la poulie. Cible le fessier moyen et les abducteurs."},
    {"nom": "Abduction machine assise", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Machine d'abduction des hanches. Fessier moyen et petit."},
    {"nom": "Clamshell (Palourde)", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Ouverture de hanche latérale couché. Active les fessiers moyens et petits."},
    {"nom": "Monster Walk (bande élastique)", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Marche latérale avec élastique aux chevilles. Active le fessier moyen."},
    {"nom": "Fente inversée avec élévation genou", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Fente arrière suivie d'une élévation du genou. Fessiers et équilibre."},
    {"nom": "Sumo Deadlift", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Soulevé de terre en position écartée. Davantage de travail pour les fessiers et adducteurs."},
    {"nom": "Donkey Kick", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Extension de hanche à quatre pattes. Isolation simple des fessiers sans matériel."},
    {"nom": "Fire Hydrant", "groupe_musculaire": "fessiers", "categorie": "force",
     "description": "Abduction de hanche à quatre pattes. Active les fessiers moyens et améliore la mobilité."},

    # ══════════════════════════════════════════════════════
    # MOLLETS (6)
    # ══════════════════════════════════════════════════════
    {"nom": "Mollets debout (Standing Calf Raise)", "groupe_musculaire": "mollets", "categorie": "force",
     "description": "Extension de cheville debout. Cible les gastrocnémiens."},
    {"nom": "Mollets assis (Seated Calf Raise)", "groupe_musculaire": "mollets", "categorie": "force",
     "description": "Extension de cheville assis, genoux fléchis. Cible le soléaire en profondeur."},
    {"nom": "Mollets unilatéraux", "groupe_musculaire": "mollets", "categorie": "force",
     "description": "Extension de cheville sur une jambe. Charge maximale et correction des déséquilibres."},
    {"nom": "Donkey Calf Raise", "groupe_musculaire": "mollets", "categorie": "force",
     "description": "Mollets penchés en avant, hanche à 90°. Amplitude maximale pour les gastrocnémiens."},
    {"nom": "Mollets presse à cuisse", "groupe_musculaire": "mollets", "categorie": "force",
     "description": "Extension de cheville sur la presse. Permet de charger lourd en toute sécurité."},
    {"nom": "Jump Rope (Corde à sauter)", "groupe_musculaire": "mollets", "categorie": "cardio",
     "description": "Saut à la corde. Excellent cardio et renforcement des mollets et coordination."},

    # ══════════════════════════════════════════════════════
    # ABDOMINAUX / CORE (18)
    # ══════════════════════════════════════════════════════
    {"nom": "Planche frontale (Plank)", "groupe_musculaire": "abdominaux", "categorie": "gainage",
     "description": "Gainage isométrique fondamental. Maintenir la position droite en appui sur les avant-bras."},
    {"nom": "Planche latérale", "groupe_musculaire": "abdominaux", "categorie": "gainage",
     "description": "Gainage latéral sur un avant-bras. Cible les obliques et les stabilisateurs du tronc."},
    {"nom": "Planche dynamique", "groupe_musculaire": "abdominaux", "categorie": "gainage",
     "description": "Passage de la planche basse à la planche haute. Renforce le core et les épaules."},
    {"nom": "Crunch abdominal", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Flexion du rachis en partant du sol. Isolation des abdominaux droits."},
    {"nom": "Crunch inverse", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Élévation des hanches en partant du sol. Cible la partie basse des abdominaux."},
    {"nom": "Sit-up", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Relevé de buste complet depuis le sol. Plus intense que le crunch classique."},
    {"nom": "Russian Twist", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Rotation de tronc assis, pieds décollés. Excellent pour les obliques."},
    {"nom": "Bicycle Crunch", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Crunch avec rotation et pédalage des jambes. Combine droits et obliques."},
    {"nom": "Leg Raise couché", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Élévation des jambes tendues en position couchée. Partie basse de l'abdomen."},
    {"nom": "Hanging Leg Raise", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Élévation des jambes en suspension à la barre. Abdominaux inférieurs et fléchisseurs de hanche."},
    {"nom": "Dragon Flag", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Exercice avancé de gainage dynamique. Corps tendu et contrôle de la descente."},
    {"nom": "Ab Wheel Rollout", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Roulement avec roue abdominale. Exercice très efficace pour tout le core."},
    {"nom": "Mountain Climbers", "groupe_musculaire": "abdominaux", "categorie": "cardio",
     "description": "Exercice dynamique en planche. Cardio et gainage simultanés."},
    {"nom": "Flutter Kicks", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Battements de jambes tendues couché. Abdominaux inférieurs en continu."},
    {"nom": "Hollow Body Hold", "groupe_musculaire": "abdominaux", "categorie": "gainage",
     "description": "Position creuse isométrique, dos au sol. Gainage profond de la ceinture abdominale."},
    {"nom": "Dead Bug", "groupe_musculaire": "abdominaux", "categorie": "gainage",
     "description": "Exercice de coordination core-membres. Stabilisation lombaire et activation profonde."},
    {"nom": "Pallof Press", "groupe_musculaire": "abdominaux", "categorie": "gainage",
     "description": "Poussée anti-rotation à la poulie. Renforce les stabilisateurs latéraux du core."},
    {"nom": "V-Up", "groupe_musculaire": "abdominaux", "categorie": "force",
     "description": "Relevé simultané des jambes et du buste en V. Abdominaux complets, niveau intermédiaire."},

    # ══════════════════════════════════════════════════════
    # FULL BODY / FONCTIONNEL (14)
    # ══════════════════════════════════════════════════════
    {"nom": "Burpee", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Enchaînement squat-planche-saut. Cardio haute intensité sollicitant tout le corps."},
    {"nom": "Thruster", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Squat frontal enchaîné avec développé militaire. Exercice complet force + cardio."},
    {"nom": "Kettlebell Swing", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Balancé de kettlebell. Ischios, fessiers, dos et cardio. Mouvement balistique."},
    {"nom": "Clean & Jerk (Arraché-Epaulé-Jeté)", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Mouvement d'haltérophilie complet. Explosive et technique, sollicite tout le corps."},
    {"nom": "Snatch (Arraché)", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Arrachement de la barre en un mouvement. Puissance, technique et coordination totale."},
    {"nom": "Tire Flip (Retournement de pneu)", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Retournement de pneu lourd. Force fonctionnelle et cardio intense."},
    {"nom": "Battle Ropes", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Ondulations de cordes épaisses. Cardio intense et renforcement des épaules et du core."},
    {"nom": "Bear Crawl", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Quadrupédie avec genoux décollés. Mobilité, force et gainage du core."},
    {"nom": "Turkish Get-Up", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Lever du sol avec kettlebell en équilibre. Exercice technique de stabilité globale."},
    {"nom": "Man Maker", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Burpee avec haltères incluant pompe et rowing. Exercice complet de haute intensité."},
    {"nom": "Sled Push (Traîneau)", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Poussée de traîneau lesté. Force fonctionnelle des jambes et du core."},
    {"nom": "Medicine Ball Slam", "groupe_musculaire": "full_body", "categorie": "force",
     "description": "Projection d'un ballon médicinal au sol. Puissance explosive de tout le corps."},
    {"nom": "Box Jump", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Saut sur une box. Explosivité et puissance des membres inférieurs."},
    {"nom": "Broad Jump (Saut en longueur)", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Saut en longueur statique. Puissance explosive et athlétisme général."},

    # ══════════════════════════════════════════════════════
    # CARDIO (12)
    # ══════════════════════════════════════════════════════
    {"nom": "Course à pied", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Jogging ou course. Cardio de base, améliore l'endurance cardiovasculaire."},
    {"nom": "Sprint", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Course à haute intensité sur courte distance. Développe la puissance et la VO2max."},
    {"nom": "Vélo stationnaire", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Pédalage sur vélo d'appartement. Cardio sans impact articulaire."},
    {"nom": "Rameur (Rowing machine)", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Exercice complet sur rameur. Dos, jambes, épaules et cardio."},
    {"nom": "Elliptique", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Entraînement sur vélo elliptique. Cardio complet sans impact sur les articulations."},
    {"nom": "Jumping Jacks", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Écart des bras et des jambes en sautant. Échauffement ou cardio léger."},
    {"nom": "High Knees (Genoux hauts)", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Course sur place avec genoux montant haut. Cardio et coordination."},
    {"nom": "Skipping (Sauts genoux hauts)", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Variante du jogging avec montée exagérée des genoux. Explosivité et cardio."},
    {"nom": "Corde à sauter", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Saut à la corde continu. Cardio, coordination et mollets."},
    {"nom": "HIIT (Circuit 20/10)", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Tabata : 20 secondes d'effort, 10 de récupération. 8 rounds. Cardio intense."},
    {"nom": "Natation", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Nage en piscine. Cardio complet sans impact, idéal pour récupération active."},
    {"nom": "Vélo outdoor", "groupe_musculaire": "full_body", "categorie": "cardio",
     "description": "Cyclisme en extérieur. Endurance, jambes et cardio respiratoire."},

    # ══════════════════════════════════════════════════════
    # MOBILITÉ / ÉTIREMENTS (8)
    # ══════════════════════════════════════════════════════
    {"nom": "Étirement quadriceps debout", "groupe_musculaire": "quadriceps", "categorie": "mobilite",
     "description": "Flexion du genou debout, talon vers la fesse. Étirement des quadriceps."},
    {"nom": "Étirement ischios assis", "groupe_musculaire": "ischio", "categorie": "mobilite",
     "description": "Penché en avant assis, jambes tendues. Étirement des ischio-jambiers et du bas du dos."},
    {"nom": "Pigeon (Hip Flexor Stretch)", "groupe_musculaire": "fessiers", "categorie": "mobilite",
     "description": "Étirement du pigeon yogique. Ouverture de hanche et étirement du piriforme."},
    {"nom": "Cat-Cow (Chat-Vache)", "groupe_musculaire": "dorsaux", "categorie": "mobilite",
     "description": "Flexion-extension du rachis à quatre pattes. Mobilité et activation de la colonne."},
    {"nom": "World's Greatest Stretch", "groupe_musculaire": "full_body", "categorie": "mobilite",
     "description": "Étirement complet fente + rotation + ouverture thoracique. Mobilité globale."},
    {"nom": "Cobra (Extension lombaire)", "groupe_musculaire": "dorsaux", "categorie": "mobilite",
     "description": "Extension du rachis lombo-sacré au sol. Contre-mouvement du soulevé de terre."},
    {"nom": "Étirement pectoraux doorway", "groupe_musculaire": "pectoraux", "categorie": "mobilite",
     "description": "Étirement des pectoraux dans l'encadrement d'une porte. Posture et mobilité thoracique."},
    {"nom": "Hip 90/90 Stretch", "groupe_musculaire": "fessiers", "categorie": "mobilite",
     "description": "Étirement de hanche assis en position 90/90°. Rotation interne et externe de hanche."},
]


class Command(BaseCommand):
    help = f"Seed la bibliothèque d'exercices ({len(EXERCICES)} exercices)"

    def handle(self, *args, **kwargs):
        created = updated = skipped = 0
        for data in EXERCICES:
            obj, is_new = Exercice.objects.get_or_create(
                nom=data["nom"],
                defaults={
                    "groupe_musculaire": data["groupe_musculaire"],
                    "categorie":         data["categorie"],
                    "description":       data["description"],
                    "est_personnalise":  False,
                },
            )
            if is_new:
                created += 1
                self.stdout.write(f"  ✓ {obj.nom}")
            else:
                changed = False
                for field in ("groupe_musculaire", "categorie", "description"):
                    if getattr(obj, field) != data[field]:
                        setattr(obj, field, data[field])
                        changed = True
                if changed:
                    obj.save()
                    updated += 1
                else:
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ {created} créé(s) · {updated} mis à jour · {skipped} inchangé(s)"
            f" — {Exercice.objects.filter(coach=None).count()} exercices globaux au total"
        ))

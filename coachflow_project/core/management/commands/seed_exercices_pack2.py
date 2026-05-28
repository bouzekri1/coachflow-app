"""
python manage.py seed_exercices_pack2
Ajoute 30 nouveaux exercices (pack 2) à la bibliothèque système.
"""
from django.core.management.base import BaseCommand
from core.models import Exercice

EXERCICES = [
    # ── PECTORAUX ───────────────────────────────────────────────────────────────
    {
        'nom': 'Landmine Press unilatéral',
        'groupe_musculaire': 'pectoraux',
        'categorie': 'force',
        'description': 'Barre fixée dans un landmine, presse avec un bras en position semi-inclinée. Excellent pour la mobilité d\'épaule et la force fonctionnelle.',
    },
    {
        'nom': 'Cable Crossover prise haute',
        'groupe_musculaire': 'pectoraux',
        'categorie': 'force',
        'description': 'Câbles réglés en position haute, croisement des mains devant le bassin. Isole parfaitement le bas des pectoraux.',
    },
    {
        'nom': 'Incline Cable Fly',
        'groupe_musculaire': 'pectoraux',
        'categorie': 'force',
        'description': 'Câbles bas, écartés allongé sur banc incliné. Tension constante sur les pectoraux supérieurs tout au long du mouvement.',
    },

    # ── DORSAUX ─────────────────────────────────────────────────────────────────
    {
        'nom': 'Chest Supported Row haltères',
        'groupe_musculaire': 'dorsaux',
        'categorie': 'force',
        'description': 'Allongé face contre un banc incliné à 45°, rowing avec haltères. Supprime le recrutement lombaire et isole les trapèzes et rhomboïdes.',
    },
    {
        'nom': 'Seal Row',
        'groupe_musculaire': 'dorsaux',
        'categorie': 'force',
        'description': 'Allongé à plat ventre sur banc surélevé, rowing barre ou haltères. Contact thoracique permanent qui élimine toute triche.',
    },
    {
        'nom': 'Landmine Row',
        'groupe_musculaire': 'dorsaux',
        'categorie': 'force',
        'description': 'Barre de landmine saisie à deux mains ou une main, tirage vers le bas de la poitrine. Sollicite fortement le grand dorsal et les rhomboïdes.',
    },

    # ── ÉPAULES ──────────────────────────────────────────────────────────────────
    {
        'nom': 'Arnold Press',
        'groupe_musculaire': 'epaules',
        'categorie': 'force',
        'description': 'Développé haltères avec rotation du poignet (paume vers soi en bas, vers l\'extérieur en haut). Travaille les 3 faisceaux du deltoïde.',
    },
    {
        'nom': 'Prone Y-T-W',
        'groupe_musculaire': 'epaules',
        'categorie': 'mobilite',
        'description': 'Allongé face contre sol ou sur banc incliné, élévations en Y, T et W pour renforcer la coiffe des rotateurs et les trapèzes inférieurs.',
    },
    {
        'nom': 'Trap 3 Raise',
        'groupe_musculaire': 'epaules',
        'categorie': 'force',
        'description': 'Allongé à 135° sur banc incliné, bras tendus élévation en Y. Cible spécifiquement le trapèze inférieur, essentiel pour la santé d\'épaule.',
    },

    # ── BICEPS ───────────────────────────────────────────────────────────────────
    {
        'nom': 'Preacher Curl machine',
        'groupe_musculaire': 'biceps',
        'categorie': 'force',
        'description': 'Machine à préacher, coude fixé sur pupitre. Tension maximale en position allongée, idéal pour cibler le chef long du biceps.',
    },
    {
        'nom': 'Cable Drag Curl',
        'groupe_musculaire': 'biceps',
        'categorie': 'force',
        'description': 'Curl poulie basse avec les coudes tirés vers l\'arrière pendant la montée. Maximise la contraction du biceps en position raccourcie.',
    },

    # ── TRICEPS ──────────────────────────────────────────────────────────────────
    {
        'nom': 'Overhead Cable Triceps Extension',
        'groupe_musculaire': 'triceps',
        'categorie': 'force',
        'description': 'Face à la poulie haute, corde derrière la tête, extension au-dessus. Étire et contracte le chef long du triceps sur toute l\'amplitude.',
    },
    {
        'nom': 'Tate Press',
        'groupe_musculaire': 'triceps',
        'categorie': 'force',
        'description': 'Allongé, haltères pointés vers le plafond, flexion en amenant les coudes vers l\'extérieur. Charge importante sur les chefs médial et latéral.',
    },

    # ── QUADRICEPS ───────────────────────────────────────────────────────────────
    {
        'nom': 'Hip Thrust barre',
        'groupe_musculaire': 'fessiers',
        'categorie': 'force',
        'description': 'Épaules appuyées sur banc, barre sur hanches, poussée du bassin vers le haut. Exercice roi pour le développement des fessiers.',
    },
    {
        'nom': 'Smith Machine Squat',
        'groupe_musculaire': 'quadriceps',
        'categorie': 'force',
        'description': 'Squat sur machine Smith, pieds légèrement avancés. Sécurisé, permet de cibler quad ou fessiers selon position des pieds.',
    },
    {
        'nom': 'Sissy Squat',
        'groupe_musculaire': 'quadriceps',
        'categorie': 'force',
        'description': 'Genoux avancés vers l\'avant, talons soulevés, descente en arrière. Isole le vaste médial et le droit fémoral avec une forte tension en allongé.',
    },

    # ── FESSIERS ─────────────────────────────────────────────────────────────────
    {
        'nom': 'B-Stance Hip Thrust',
        'groupe_musculaire': 'fessiers',
        'categorie': 'force',
        'description': 'Hip thrust unilatéral avec pied de soutien en arrière. Permet de charger lourd tout en isolant chaque fessier indépendamment.',
    },
    {
        'nom': 'Reverse Hyper',
        'groupe_musculaire': 'fessiers',
        'categorie': 'force',
        'description': 'Sur banc ou machine, jambes pendantes en arrière et extension. Renforce fessiers, ischio et érecteurs spinaux en décompressant le bas du dos.',
    },
    {
        'nom': 'Copenhagen Plank',
        'groupe_musculaire': 'fessiers',
        'categorie': 'gainage',
        'description': 'Planche latérale avec pied supérieur posé sur banc, adduction de la jambe inférieure. Renforce les adducteurs et la stabilité de hanche.',
    },

    # ── ISCHIO-JAMBIERS ──────────────────────────────────────────────────────────
    {
        'nom': 'Single Leg Romanian Deadlift',
        'groupe_musculaire': 'ischio',
        'categorie': 'force',
        'description': 'RDL sur une jambe, haltère ou barre. Développe la force et la stabilité des ischio-jambiers tout en sollicitant les stabilisateurs de hanche.',
    },
    {
        'nom': 'Leg Curl debout câble',
        'groupe_musculaire': 'ischio',
        'categorie': 'force',
        'description': 'Debout face à la poulie basse, cheville dans la sangle, flexion du genou. Cible les ischio en position allongée pour une meilleure hypertrophie.',
    },

    # ── ABDOMINAUX ───────────────────────────────────────────────────────────────
    {
        'nom': 'Cable Crunch',
        'groupe_musculaire': 'abdominaux',
        'categorie': 'force',
        'description': 'À genoux face à la poulie haute, corde derrière la nuque, flexion du tronc. Permet de progresser en charge sur les abdominaux.',
    },
    {
        'nom': 'Russian Twist',
        'groupe_musculaire': 'abdominaux',
        'categorie': 'force',
        'description': 'Assis, pieds soulevés, rotation du tronc avec poids ou ballon. Travaille les obliques et la coordination rotatoire.',
    },
    {
        'nom': 'Windshield Wipers',
        'groupe_musculaire': 'abdominaux',
        'categorie': 'gainage',
        'description': 'Suspendu à la barre ou allongé, jambes tendues en rotation de gauche à droite. Exercice avancé pour les obliques et le contrôle du core.',
    },
    {
        'nom': 'Side Plank avec rotation',
        'groupe_musculaire': 'abdominaux',
        'categorie': 'gainage',
        'description': 'Planche latérale, bras libre passé sous le tronc puis vers le ciel. Renforce obliques et stabilité de l\'épaule dans le même mouvement.',
    },

    # ── FULL BODY ────────────────────────────────────────────────────────────────
    {
        'nom': 'Renegade Row',
        'groupe_musculaire': 'full_body',
        'categorie': 'force',
        'description': 'Pompe avec deux haltères au sol, row alterné à chaque rep. Combine stabilité de planche, poussée et tirage dans un seul exercice.',
    },
    {
        'nom': 'Barbell Complex',
        'groupe_musculaire': 'full_body',
        'categorie': 'cardio',
        'description': 'Série enchaînée sans lâcher la barre : soulevé de terre, rowing, squat, développé militaire, good morning. Conditioning intense, cardio-musculaire.',
    },
    {
        'nom': 'Sandbag Carry',
        'groupe_musculaire': 'full_body',
        'categorie': 'force',
        'description': 'Porter un sac lesté en marchant : à l\'épaule, sur la nuque ou en bear hug. Renforce le core, les trapèzes et la résistance mentale.',
    },

    # ── CARDIO ───────────────────────────────────────────────────────────────────
    {
        'nom': 'Ski Erg',
        'groupe_musculaire': 'cardio',
        'categorie': 'cardio',
        'description': 'Machine à rames verticales simulant le ski de fond. Sollicite dos, épaules et core avec un impact articulaire minimal.',
    },
    {
        'nom': 'Assault Bike (Air Bike)',
        'groupe_musculaire': 'cardio',
        'categorie': 'cardio',
        'description': 'Vélo à air avec bras motorisés. Résistance proportionnelle à l\'effort, idéal pour les sprints HIIT ou l\'endurance lactique.',
    },
    {
        'nom': 'Burpee avec saut',
        'groupe_musculaire': 'cardio',
        'categorie': 'cardio',
        'description': 'Squat thrust, pompe, saut vertical avec applaudissement. Exercice total body à haute intensité, excellent pour la condition physique générale.',
    },
]


class Command(BaseCommand):
    help = 'Ajoute le pack 2 de 30 exercices à la bibliothèque système'

    def handle(self, *args, **options):
        created = updated = unchanged = 0
        for data in EXERCICES:
            obj, is_new = Exercice.objects.get_or_create(
                nom=data['nom'],
                coach=None,
                defaults={
                    'groupe_musculaire': data['groupe_musculaire'],
                    'categorie':         data['categorie'],
                    'description':       data['description'],
                    'est_personnalise':  False,
                },
            )
            if is_new:
                self.stdout.write(f'  ✓ {obj.nom}')
                created += 1
            else:
                changed = False
                for k in ('groupe_musculaire', 'categorie', 'description'):
                    if getattr(obj, k) != data[k]:
                        setattr(obj, k, data[k])
                        changed = True
                if changed:
                    obj.save()
                    updated += 1
                else:
                    unchanged += 1

        total = Exercice.objects.filter(coach=None).count()
        self.stdout.write(self.style.SUCCESS(
            f'\n✓ {created} créé(s) · {updated} mis à jour · {unchanged} inchangé(s)'
            f' — {total} exercices globaux au total'
        ))

"""
python manage.py fetch_exercice_gifs

Fetches animated exercise image URLs from the Yuhonas free-exercise-db
(https://github.com/yuhonas/free-exercise-db) — completely free, no API key.

The ExerciseImg component in the frontend already handles the Yuhonas format:
it alternates /0.jpg and /1.jpg every 800 ms to produce a 2-frame animation.
"""
import requests
import unicodedata
from django.core.management.base import BaseCommand
from core.models import Exercice

YUHONAS_JSON = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
YUHONAS_IMG  = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}"

# ── French name → ExerciseDB English name (exact or prefix match) ──────────────
MAPPING = {
    # PECTORAUX
    "Développé couché barre":              "barbell bench press",
    "Développé couché haltères":           "dumbbell bench press",
    "Développé incliné barre":             "barbell incline bench press",
    "Développé incliné haltères":          "dumbbell incline bench press",
    "Développé décliné barre":             "barbell decline bench press",
    "Écartés haltères à plat":             "dumbbell fly",
    "Écartés poulie croisée":              "cable fly",
    "Dips pectoraux":                      "chest dip",
    "Pompes larges":                       "wide grip push-up",
    "Pompes diamant":                      "diamond push-up",
    "Pec Deck (Machine)":                  "pec deck fly",
    "Développé couché prise serrée":       "barbell close-grip bench press",
    "Pompes sur bosu":                     "push-up",
    "Svend Press":                         "dumbbell squeeze press",
    "Floor Press":                         "barbell floor press",

    # DORSAUX
    "Traction prise pronation":            "pull-up",
    "Traction prise supination (Chin-up)": "chin-up",
    "Traction prise neutre":               "neutral grip pull-up",
    "Rowing barre prise pronation":        "barbell bent over row",
    "Tirage poulie haute prise large":     "cable lat pulldown",
    "Tirage poulie haute prise serrée":    "cable close grip pulldown",
    "Tirage poulie basse assis":           "cable seated row",
    "Pull-over haltère":                   "dumbbell pullover",
    "Soulevé de terre sumo":               "sumo deadlift",
    "Good Morning":                        "barbell good morning",
    "Rowing T-Bar":                        "t bar row",
    "Superman":                            "superman",
    "Extension lombaire machine":          "hyperextension",
    "Face Pull":                           "cable face pull",
    "Rowing barre Yates":                  "barbell bent over row",
    "Rack Pull":                           "rack pull",
    "Shrug barre (Haussements d'épaules)": "barbell shrug",

    # ÉPAULES
    "Développé militaire barre":           "barbell overhead press",
    "Élévations latérales haltères":       "dumbbell lateral raise",
    "Élévations latérales câble":          "cable lateral raise",
    "Élévations frontales haltères":       "dumbbell front raise",
    "Oiseau (Reverse Fly)":                "dumbbell reverse fly",
    "Upright Row (Tirage menton)":         "barbell upright row",
    "Pike Push-up":                        "pike push up",
    "Développé militaire machine":         "smith machine overhead press",
    "Rotation externe haltère":            "dumbbell external rotation",
    "L-Fly (Rotation coiffe)":             "dumbbell external rotation",
    "Cuban Press":                         "cuban press",
    "Handstand Push-up":                   "handstand push up",

    # BICEPS
    "Curl biceps haltères alterné":        "dumbbell alternate bicep curl",
    "Curl biceps barre":                   "barbell curl",
    "Curl marteau (Hammer Curl)":          "dumbbell hammer curl",
    "Curl concentré":                      "dumbbell concentration curl",
    "Curl incliné haltères":               "dumbbell incline curl",
    "Curl poulie basse":                   "cable curl",
    "Curl barre EZ prise serrée":          "ez barbell curl",
    "Curl Zottman":                        "dumbbell zottman curl",
    "Curl araignée (Spider Curl)":         "barbell spider curl",
    "Traction supination (Chin-up lent)":  "chin-up",

    # TRICEPS
    "Extension triceps poulie haute":      "cable triceps pushdown",
    "Extension triceps haltère unilatéral":"dumbbell triceps extension",
    "Skull Crusher (Barre EZ)":            "ez barbell skullcrusher",
    "Dips barre parallèles":               "tricep dip",
    "Kick-back triceps haltère":           "dumbbell kickback",
    "Close Grip Bench Press":              "barbell close-grip bench press",
    "Extension triceps corde":             "cable triceps pushdown",
    "Diamond Push-up":                     "diamond push-up",
    "JM Press":                            "barbell jm press",
    "Bench Dips":                          "bench dip",

    # AVANT-BRAS
    "Curl de poignet barre":               "barbell wrist curl",
    "Extension de poignet barre":          "barbell reverse wrist curl",
    "Reverse Curl":                        "barbell reverse curl",
    "Farmer's Walk":                       "farmer walk",
    "Dead Hang":                           "dead hang",
    "Pince (Pinch Grip)":                  "plate pinch",

    # QUADRICEPS
    "Squat barre (Back Squat)":            "barbell squat",
    "Front Squat":                         "barbell front squat",
    "Goblet Squat":                        "dumbbell goblet squat",
    "Squat bulgare (Split Squat)":         "barbell split squat",
    "Presse à cuisse":                     "leg press",
    "Fentes avant haltères":               "dumbbell lunge",
    "Fentes arrière haltères":             "dumbbell reverse lunge",
    "Fentes latérales":                    "lateral lunge",
    "Extension jambes machine":            "leg extension",
    "Step-up haltères":                    "dumbbell step-up",
    "Pistol Squat":                        "pistol squat",
    "Hack Squat machine":                  "hack squat",
    "Wall Sit":                            "wall sit",
    "Jump Squat":                          "jump squat",
    "Box Jump":                            "box jump",

    # ISCHIO-JAMBIERS
    "Soulevé de terre conventionnel":      "barbell deadlift",
    "Romanian Deadlift (RDL)":             "barbell romanian deadlift",
    "Leg Curl machine assis":              "seated leg curl",
    "Leg Curl machine couché":             "leg curl",
    "Nordic Curl":                         "nordic hamstring curl",
    "Glute Ham Raise":                     "glute ham raise",
    "Soulevé de terre jambes tendues":     "barbell stiff leg deadlift",
    "Swiss Ball Leg Curl":                 "stability ball leg curl",
    "Pont ischio (Good Morning)":          "barbell good morning",
    "Inchworm":                            "inchworm",

    # FESSIERS
    "Glute Bridge unilatéral":             "single leg glute bridge",
    "Kick-back câble":                     "cable kickback",
    "Abduction hanche câble":              "cable hip abduction",
    "Abduction machine assise":            "hip abduction",
    "Clamshell (Palourde)":                "clam",
    "Monster Walk (bande élastique)":      "band walk",
    "Fente inversée avec élévation genou": "barbell rear lunge",
    "Sumo Deadlift":                       "sumo deadlift",
    "Donkey Kick":                         "donkey kick",
    "Fire Hydrant":                        "fire hydrant",

    # MOLLETS
    "Mollets debout (Standing Calf Raise)":"standing calf raise",
    "Mollets assis (Seated Calf Raise)":   "seated calf raise",
    "Mollets unilatéraux":                 "single leg calf raise",
    "Donkey Calf Raise":                   "donkey calf raise",
    "Mollets presse à cuisse":             "leg press calf raise",
    "Jump Rope (Corde à sauter)":          "jump rope",

    # ABDOMINAUX
    "Planche frontale (Plank)":            "plank",
    "Planche dynamique":                   "plank",
    "Crunch abdominal":                    "crunch",
    "Crunch inverse":                      "reverse crunch",
    "Bicycle Crunch":                      "bicycle crunch",
    "Leg Raise couché":                    "leg raise",
    "Hanging Leg Raise":                   "hanging leg raise",
    "Dragon Flag":                         "dragon flag",
    "Ab Wheel Rollout":                    "ab wheel rollout",
    "Flutter Kicks":                       "flutter kicks",
    "Hollow Body Hold":                    "hollow hold",
    "Dead Bug":                            "dead bug",
    "Pallof Press":                        "pallof press",
    "V-Up":                                "v up",
    "Cable Crunch":                        "cable crunch",
    "Russian Twist":                       "russian twist",
    "Windshield Wipers":                   "windshield wipers",
    "Side Plank avec rotation":            "side plank",

    # PECTORAUX PACK 2
    "Landmine Press unilatéral":           "landmine press",
    "Cable Crossover prise haute":         "cable crossover",
    "Incline Cable Fly":                   "cable incline fly",
    "Pec Deck (Machine)":                  "pec deck fly",

    # DORSAUX PACK 2
    "Chest Supported Row haltères":        "chest supported row",
    "Seal Row":                            "seal row",
    "Landmine Row":                        "landmine row",

    # ÉPAULES PACK 2
    "Arnold Press":                        "arnold press",
    "Prone Y-T-W":                         "prone cobra",
    "Trap 3 Raise":                        "trap raise",

    # BICEPS PACK 2
    "Preacher Curl machine":               "preacher curl",
    "Cable Drag Curl":                     "cable curl",

    # TRICEPS PACK 2
    "Overhead Cable Triceps Extension":    "overhead cable triceps extension",
    "Tate Press":                          "dumbbell extension",

    # FESSIERS PACK 2
    "Hip Thrust barre":                    "barbell hip thrust",
    "B-Stance Hip Thrust":                 "hip thrust",
    "Reverse Hyper":                       "reverse hyperextension",
    "Copenhagen Plank":                    "side plank",
    "Clamshell (Palourde)":               "clam",
    "Fire Hydrant":                        "fire hydrant",
    "Hip 90/90 Stretch":                   "seated hip stretch",

    # QUADRICEPS PACK 2
    "Smith Machine Squat":                 "smith machine squat",
    "Sissy Squat":                         "sissy squat",

    # ISCHIO PACK 2
    "Single Leg Romanian Deadlift":        "single leg deadlift",
    "Leg Curl debout câble":               "standing leg curl",

    # FULL BODY PACK 2
    "Renegade Row":                        "renegade row",
    "Barbell Complex":                     "barbell complex",
    "Sandbag Carry":                       "farmer walk",
    "Natation":                            "swimming",

    # CARDIO PACK 2
    "Ski Erg":                             "ski ergometer",
    "Assault Bike (Air Bike)":             "air bike",
    "Burpee avec saut":                    "burpee",

    # FULL BODY
    "Thruster":                            "barbell thruster",
    "Kettlebell Swing":                    "kettlebell swing",
    "Clean & Jerk (Arraché-Epaulé-Jeté)":  "barbell clean and jerk",
    "Snatch (Arraché)":                    "barbell snatch",
    "Tire Flip (Retournement de pneu)":    "tire flip",
    "Battle Ropes":                        "battle rope",
    "Bear Crawl":                          "bear crawl",
    "Turkish Get-Up":                      "kettlebell turkish get up",
    "Man Maker":                           "man maker",
    "Sled Push (Traîneau)":                "sled push",
    "Medicine Ball Slam":                  "medicine ball slam",
    "Broad Jump (Saut en longueur)":       "standing broad jump",

    # CARDIO
    "Course à pied":                       "run",
    "Sprint":                              "sprint",
    "Vélo stationnaire":                   "stationary bike",
    "Rameur (Rowing machine)":             "rowing",
    "Elliptique":                          "elliptical",
    "High Knees (Genoux hauts)":           "high knees",
    "Skipping (Sauts genoux hauts)":       "jump rope",
    "Corde à sauter":                      "jump rope",
    "HIIT (Circuit 20/10)":                "mountain climber",
    "Natation":                            "swimming",
    "Vélo outdoor":                        "cycling",

    # MOBILITÉ
    "Étirement quadriceps debout":         "standing quad stretch",
    "Étirement ischios assis":             "seated hamstring stretch",
    "Pigeon (Hip Flexor Stretch)":         "pigeon stretch",
    "Cat-Cow (Chat-Vache)":               "cat cow stretch",
    "World's Greatest Stretch":            "world greatest stretch",
    "Cobra (Extension lombaire)":          "cobra stretch",
    "Étirement pectoraux doorway":         "chest stretch",
    "Hip 90/90 Stretch":                   "hip 90 90 stretch",
}

# ── Translation helpers (keyword fallback) ─────────────────────────────────────
FR_TO_EN = {
    "développé": "press", "couché": "bench", "incliné": "incline",
    "décliné": "decline", "haltères": "dumbbell", "barre": "barbell",
    "poulie": "cable", "tirage": "pulldown", "traction": "pull-up",
    "squat": "squat", "fente": "lunge", "curl": "curl",
    "extension": "extension", "planche": "plank", "crunch": "crunch",
    "rowing": "row", "écarté": "fly", "mollet": "calf", "presse": "press",
    "leg": "leg", "abdominaux": "abs", "dorsaux": "back", "pectoraux": "chest",
    "épaules": "shoulder", "biceps": "bicep", "triceps": "tricep",
    "fessiers": "glute", "quadriceps": "quad",
}


def normalize(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def best_match(fr_name, catalogue):
    """Return the Yuhonas image base-URL for the best matching exercise."""
    en_query = MAPPING.get(fr_name)
    if not en_query:
        words = fr_name.lower().split()
        en_words = [FR_TO_EN.get(w, w) for w in words]
        en_query = ' '.join(en_words[:3])

    q = normalize(en_query)
    candidates = []
    for ex in catalogue:
        # Yuhonas entries with no images are useless
        if not ex.get('images'):
            continue
        name = normalize(ex['name'])
        if name == q:
            candidates.append((0, ex))
        elif name.startswith(q):
            candidates.append((1, ex))
        elif q in name:
            candidates.append((2, ex))

    if not candidates:
        tokens = q.split()
        for ex in catalogue:
            if not ex.get('images'):
                continue
            name = normalize(ex['name'])
            score = sum(1 for t in tokens if t in name)
            if score >= max(1, len(tokens) - 1):
                candidates.append((3 - score, ex))

    if candidates:
        candidates.sort(key=lambda x: x[0])
        ex_id = candidates[0][1]['id']
        return YUHONAS_IMG.format(id=ex_id)
    return None


class Command(BaseCommand):
    help = 'Fetch animated exercise image URLs from Yuhonas free-exercise-db (no API key needed)'

    def add_arguments(self, parser):
        parser.add_argument('--overwrite', action='store_true', help='Overwrite existing gif_url')
        parser.add_argument('--dry-run', action='store_true', help='Show matches without saving')

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        dry_run = options['dry_run']

        # ── 1. Fetch the full Yuhonas catalogue (one request, ~1300 exercises) ─
        self.stdout.write("⬇  Téléchargement du catalogue Yuhonas free-exercise-db…")
        try:
            resp = requests.get(YUHONAS_JSON, timeout=30)
            resp.raise_for_status()
            catalogue = resp.json()
            self.stdout.write(self.style.SUCCESS(f"   {len(catalogue)} exercices dans le catalogue"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Erreur téléchargement : {e}"))
            return

        # ── 2. Match each of our system exercises ─────────────────────────────
        exercices = Exercice.objects.filter(coach=None)
        if not overwrite:
            exercices = exercices.filter(gif_url='')

        found = skipped = 0
        for ex in exercices:
            img_url = best_match(ex.nom, catalogue)
            if img_url:
                found += 1
                if dry_run:
                    self.stdout.write(f"  ✓ {ex.nom}")
                else:
                    ex.gif_url = img_url
                    ex.save(update_fields=['gif_url'])
                    self.stdout.write(f"  ✓ {ex.nom}")
            else:
                skipped += 1
                self.stdout.write(self.style.WARNING(f"  ✗ {ex.nom}"))

        verb = "correspondances" if dry_run else "exercices mis à jour"
        self.stdout.write(self.style.SUCCESS(
            f"\n✓ {found} {verb} · {skipped} sans correspondance"
        ))

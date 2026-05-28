from django.core.management.base import BaseCommand
from core.models import Aliment

ALIMENTS = [
    # (nom, categorie, kcal, prot, gluc, lip, fibres)
    # Viandes & Poissons
    ("Blanc de poulet grille",     "viandes_poissons", 165, 31.0,  0.0,  3.6, 0.0),
    ("Boeuf hache 5% MG",          "viandes_poissons", 137, 21.4,  0.0,  5.4, 0.0),
    ("Dinde emincee",              "viandes_poissons", 135, 29.0,  0.0,  1.9, 0.0),
    ("Saumon frais",               "viandes_poissons", 208, 20.4,  0.0, 13.4, 0.0),
    ("Thon en conserve (eau)",     "viandes_poissons", 116, 26.0,  0.0,  1.0, 0.0),
    ("Cabillaud",                  "viandes_poissons",  82, 18.0,  0.0,  0.7, 0.0),
    ("Crevettes cuites",           "viandes_poissons",  99, 21.0,  0.0,  1.7, 0.0),
    ("Oeuf entier",                "viandes_poissons", 143, 12.6,  0.7,  9.9, 0.0),
    ("Blanc d'oeuf",               "viandes_poissons",  52, 10.9,  0.7,  0.2, 0.0),
    ("Jambon blanc degraisse",     "viandes_poissons", 105, 17.0,  1.5,  3.7, 0.0),
    ("Steak de boeuf maigre",      "viandes_poissons", 158, 26.0,  0.0,  5.8, 0.0),
    ("Maquereau",                  "viandes_poissons", 205, 18.6,  0.0, 13.9, 0.0),
    # Legumes
    ("Brocoli",                    "legumes",  34,  2.8,  4.4,  0.4, 2.6),
    ("Epinards",                   "legumes",  23,  2.9,  0.4,  0.4, 2.2),
    ("Carottes",                   "legumes",  41,  0.9,  8.6,  0.2, 2.8),
    ("Tomates",                    "legumes",  18,  0.9,  3.0,  0.2, 1.2),
    ("Courgette",                  "legumes",  17,  1.2,  2.4,  0.2, 1.0),
    ("Poivron rouge",              "legumes",  31,  1.0,  6.0,  0.3, 2.1),
    ("Concombre",                  "legumes",  15,  0.7,  2.5,  0.1, 0.7),
    ("Salade verte",               "legumes",  14,  1.4,  1.5,  0.2, 1.3),
    ("Champignons de Paris",       "legumes",  22,  3.1,  0.5,  0.3, 1.0),
    ("Chou-fleur",                 "legumes",  25,  1.9,  3.7,  0.3, 2.0),
    ("Haricots verts",             "legumes",  31,  1.8,  5.4,  0.2, 3.4),
    ("Asperges",                   "legumes",  20,  2.2,  1.8,  0.1, 2.1),
    ("Avocat",                     "legumes", 160,  2.0,  8.5, 14.7, 6.7),
    # Feculents
    ("Riz blanc cuit",             "feculents", 130,  2.7, 28.2,  0.3, 0.4),
    ("Pates cuites",               "feculents", 131,  5.0, 25.9,  0.9, 1.8),
    ("Pomme de terre cuite",       "feculents",  87,  2.1, 20.0,  0.1, 1.8),
    ("Patate douce cuite",         "feculents",  86,  1.6, 20.1,  0.1, 3.0),
    ("Quinoa cuit",                "feculents", 120,  4.4, 21.3,  1.9, 2.8),
    ("Flocons d'avoine",           "feculents", 371, 13.1, 57.6,  7.0,10.3),
    ("Pain complet",               "feculents", 247,  9.0, 44.0,  2.5, 6.5),
    ("Pain de mie blanc",          "feculents", 265,  8.5, 47.0,  3.5, 2.5),
    ("Riz complet cuit",           "feculents", 112,  2.6, 23.5,  0.9, 1.8),
    ("Galettes de riz",            "feculents", 387,  7.9, 81.5,  2.8, 1.4),
    # Laitiers
    ("Fromage blanc 0%",           "laitiers",  45,  8.0,  4.0,  0.2, 0.0),
    ("Yaourt grec nature",         "laitiers", 100,  9.4,  3.6,  5.1, 0.0),
    ("Skyr nature",                "laitiers",  63, 11.0,  4.0,  0.4, 0.0),
    ("Lait demi-ecreme",           "laitiers",  46,  3.2,  4.8,  1.6, 0.0),
    ("Emmental",                   "laitiers", 379, 28.7,  0.4, 29.4, 0.0),
    ("Fromage blanc 3%",           "laitiers",  60,  7.5,  4.0,  1.3, 0.0),
    # Fruits
    ("Banane",                     "fruits",  89,  1.1, 22.8,  0.3, 2.6),
    ("Pomme",                      "fruits",  52,  0.3, 13.8,  0.2, 2.4),
    ("Orange",                     "fruits",  47,  0.9, 11.5,  0.1, 2.4),
    ("Myrtilles",                  "fruits",  57,  0.7, 14.5,  0.3, 2.4),
    ("Fraises",                    "fruits",  33,  0.7,  7.7,  0.3, 2.0),
    ("Mangue",                     "fruits",  60,  0.8, 14.9,  0.4, 1.6),
    ("Kiwi",                       "fruits",  61,  1.1, 14.7,  0.5, 3.0),
    ("Ananas",                     "fruits",  50,  0.5, 13.1,  0.1, 1.4),
    # Matieres grasses
    ("Huile d'olive",              "matieres_grasses", 884, 0.0,  0.0, 100.0, 0.0),
    ("Huile de coco",              "matieres_grasses", 892, 0.0,  0.0,  99.1, 0.0),
    ("Beurre",                     "matieres_grasses", 717, 0.9,  0.6,  81.0, 0.0),
    ("Beurre d'amande",            "matieres_grasses", 614,21.0, 18.8,  56.0, 9.0),
    ("Beurre de cacahuete",        "matieres_grasses", 588,25.0, 20.0,  50.0, 6.0),
    # Legumineuses
    ("Lentilles cuites",           "legumineuses", 116,  9.0, 20.1,  0.4, 7.9),
    ("Pois chiches cuits",         "legumineuses", 164,  8.9, 27.4,  2.6, 7.6),
    ("Haricots rouges cuits",      "legumineuses", 127,  8.7, 22.8,  0.5, 6.8),
    ("Edamame",                    "legumineuses", 121, 11.9,  8.9,  5.2, 5.2),
    ("Haricots noirs cuits",       "legumineuses", 132,  8.9, 23.7,  0.5, 8.7),
    # Autres
    ("Whey proteine (vanille)",    "autres", 374, 78.0,  8.0,  5.0, 0.0),
    ("Amandes",                    "autres", 579, 21.2, 21.6, 49.9,12.5),
    ("Noix",                       "autres", 654, 15.2, 13.7, 65.2, 6.7),
    ("Miel",                       "autres", 304,  0.3, 82.4,  0.0, 0.0),
    ("Chocolat noir 70%",          "autres", 598,  7.8, 45.9, 42.6, 9.5),
]


class Command(BaseCommand):
    help = "Seed la base de donnees avec les aliments CIQUAL"

    def handle(self, *args, **options):
        created = 0
        for row in ALIMENTS:
            nom, cat, kcal, prot, gluc, lip, fib = row
            _, is_new = Aliment.objects.get_or_create(
                nom=nom, coach=None,
                defaults=dict(
                    categorie=cat, calories_100g=kcal,
                    proteines_100g=prot, glucides_100g=gluc,
                    lipides_100g=lip, fibres_100g=fib,
                )
            )
            if is_new:
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f"{created} aliments crees ({len(ALIMENTS)} au total)."
        ))

import time
import requests
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import Recette

SPOONACULAR_KEY = "8f9c0ef7ff5e45fba9d3248e3af1533f"

# Termes de recherche EN optimisés pour Spoonacular
SEARCH_TERMS = {
    "Porridge aux myrtilles et amandes":              "oatmeal blueberry",
    "Omelette aux poivrons et jambon":                "omelette",
    "Smoothie banane skyr amandes":                   "banana smoothie",
    "Poulet grille, quinoa et legumes":               "chicken quinoa",
    "Salade de saumon et quinoa":                     "salmon salad",
    "Pates au thon et tomates":                       "tuna pasta",
    "Yaourt grec, fraises et noix":                   "yogurt strawberry",
    "Saumon au four, patate douce et brocolis":       "salmon broccoli",
    "Soupe de lentilles aux epices":                  "lentil soup",
    "Steak de boeuf, riz complet et haricots rouges": "beef steak",
    "Bowl proteines poulet avocat":                   "chicken avocado bowl",
    "Pancakes proteines avoine":                      "oatmeal pancakes",
    "Cabillaud vapeur et legumes de saison":          "cod fish",
    "Wrap dinde, salade et avocat":                   "turkey wrap",
    "Oeufs brouilles aux champignons et epinards":    "scrambled eggs mushroom",
    "Salade de pois chiches mediterraneenne":         "chickpea salad",
    "Crevettes sautees et riz basmati":               "shrimp rice",
    "Fromage blanc, kiwi et miel":                    "kiwi honey yogurt",
    "Boeuf hache, patate douce et brocolis":          "beef broccoli",
    "Salade de maquereau, pommes de terre et haricots verts": "mackerel salad",
    "Skyr mangue et noix":                            "mango bowl",
    "Gratin de chou-fleur au jambon":                 "cauliflower gratin",
    "Smoothie bowl mangue banane et whey":            "smoothie bowl mango",
    "Poulet tikka, riz et asperges":                  "chicken tikka",
    "Toast avocat-oeuf poché":                        "avocado toast egg",
    "Salade de lentilles et saumon fume":             "lentil salmon",
    "Mug cake proteine chocolat":                     "chocolate mug cake",
    "Salade de thon, haricots noirs et poivron":      "tuna salad",
    "Riz sauté aux crevettes et legumes":             "shrimp fried rice",
}


def search_photo(query):
    try:
        r = requests.get(
            "https://api.spoonacular.com/recipes/complexSearch",
            params={"query": query, "apiKey": SPOONACULAR_KEY, "number": 1},
            timeout=12,
        )
        results = r.json().get("results", [])
        if not results:
            return None
        img_url = results[0].get("image", "")
        # Passer en haute résolution (636x393 au lieu de 312x231)
        img_url = img_url.replace("-312x231.", "-636x393.")
        return img_url
    except Exception as e:
        return None


class Command(BaseCommand):
    help = "Télécharge des photos précises depuis Spoonacular Food API"

    def handle(self, *args, **options):
        updated = errors = 0

        for recette in Recette.objects.all():
            query = SEARCH_TERMS.get(recette.nom, recette.nom)
            self.stdout.write(f"  → {recette.nom}")
            self.stdout.write(f"     recherche : {query}")

            img_url = search_photo(query)

            if not img_url:
                self.stdout.write(self.style.WARNING("     aucun résultat Spoonacular"))
                errors += 1
                time.sleep(0.5)
                continue

            try:
                img_r = requests.get(img_url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
                img_r.raise_for_status()
                fname = recette.nom.lower().replace(" ", "_").replace(",", "").replace("'", "")[:40] + ".jpg"
                recette.photo.save(fname, ContentFile(img_r.content), save=True)
                self.stdout.write(self.style.SUCCESS(f"     ✓ {img_url.split('/')[-1]} — {len(img_r.content)//1024}KB"))
                updated += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"     ✗ téléchargement : {e}"))
                errors += 1

            time.sleep(0.4)  # respecter le rate limit

        total = Recette.objects.count()
        self.stdout.write(self.style.SUCCESS(f"\n✓ {updated} mises à jour · ✗ {errors} erreurs / {total} recettes"))

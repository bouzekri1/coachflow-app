import requests
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import Recette

# Photos TheMealDB vérifiées pour les 15 recettes sans photo Spoonacular
FALLBACK = {
    "Oeufs brouilles aux champignons et epinards":
        "https://www.themealdb.com/images/media/meals/yvpuuy1511797244.jpg",   # French Omelette
    "Salade de lentilles et saumon fume":
        "https://www.themealdb.com/images/media/meals/vpxyqt1511464175.jpg",   # Tahini Lentils
    "Salade de maquereau, pommes de terre et haricots verts":
        "https://www.themealdb.com/images/media/meals/yypwwq1511304979.jpg",   # Tuna Nicoise
    "Salade de pois chiches mediterraneenne":
        "https://www.themealdb.com/images/media/meals/tvtxpq1511464705.jpg",   # Chickpea Fajitas
    "Salade de saumon et quinoa":
        "https://www.themealdb.com/images/media/meals/1549542994.jpg",         # Salmon Avocado Salad
    "Salade de thon, haricots noirs et poivron":
        "https://www.themealdb.com/images/media/meals/yypwwq1511304979.jpg",   # Tuna Nicoise
    "Saumon au four, patate douce et brocolis":
        "https://www.themealdb.com/images/media/meals/1548772327.jpg",         # Baked Salmon
    "Skyr mangue et noix":
        "https://www.themealdb.com/images/media/meals/gkcdpl1764441325.jpg",   # Passion Fruit Bowl
    "Smoothie banane skyr amandes":
        "https://www.themealdb.com/images/media/meals/hyk47c1762772689.jpg",   # Creamy Bowl
    "Smoothie bowl mangue banane et whey":
        "https://www.themealdb.com/images/media/meals/gkcdpl1764441325.jpg",   # Fruit Bowl
    "Soupe de lentilles aux epices":
        "https://www.themealdb.com/images/media/meals/vwwspt1487394060.jpg",   # French Lentils
    "Steak de boeuf, riz complet et haricots rouges":
        "https://www.themealdb.com/images/media/meals/vussxq1511882648.jpg",   # Steak Diane
    "Toast avocat-oeuf poché":
        "https://www.themealdb.com/images/media/meals/flrajf1762341295.jpg",   # Avocado Dip
    "Wrap dinde, salade et avocat":
        "https://www.themealdb.com/images/media/meals/swo87v1763595282.jpg",   # Shawarma Wrap
    "Yaourt grec, fraises et noix":
        "https://www.themealdb.com/images/media/meals/swttys1511385853.jpg",   # NY Cheesecake fruité
}


class Command(BaseCommand):
    help = "Comble les recettes sans photo Spoonacular avec TheMealDB"

    def handle(self, *args, **options):
        updated = 0
        for nom, url in FALLBACK.items():
            try:
                recette = Recette.objects.get(nom=nom)
            except Recette.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  Recette introuvable : {nom}"))
                continue

            self.stdout.write(f"  → {nom}")
            try:
                r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
                r.raise_for_status()
                fname = nom.lower().replace(" ", "_").replace(",", "").replace("'", "")[:40] + ".jpg"
                recette.photo.save(fname, ContentFile(r.content), save=True)
                self.stdout.write(self.style.SUCCESS(f"     ✓ {len(r.content)//1024}KB"))
                updated += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"     ✗ {e}"))

        self.stdout.write(self.style.SUCCESS(f"\n{updated}/{len(FALLBACK)} recettes mises à jour."))

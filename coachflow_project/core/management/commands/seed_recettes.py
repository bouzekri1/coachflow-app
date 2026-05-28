import io
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from core.models import User, Recette, IngredientRecette, Aliment

RECETTES = [
    {
        "nom": "Porridge aux myrtilles et amandes",
        "description": "Un petit-dejeuner rassasiant riche en fibres et en bons glucides.",
        "instructions": "1. Faire chauffer le lait. 2. Ajouter les flocons d'avoine et cuire 5 min. 3. Garnir de myrtilles et d'amandes concassees. 4. Sucrer avec un filet de miel.",
        "portions": 1,
        "emoji": "🫐", "couleur": "#7C3AED", "bg": "#EDE9FE",
        "ingredients": [("Flocons d'avoine", 80), ("Lait demi-ecreme", 200), ("Myrtilles", 80), ("Amandes", 20), ("Miel", 10)],
    },
    {
        "nom": "Omelette aux poivrons et jambon",
        "description": "Riche en proteines, ideale pour demarrer la journee avec energie.",
        "instructions": "1. Battre les oeufs. 2. Faire revenir le poivron coupe en des. 3. Ajouter le jambon emince. 4. Verser les oeufs et cuire a feu doux. 5. Plier l'omelette.",
        "portions": 1,
        "emoji": "🍳", "couleur": "#D97706", "bg": "#FEF3C7",
        "ingredients": [("Oeuf entier", 150), ("Poivron rouge", 80), ("Jambon blanc degraisse", 50), ("Huile d'olive", 10)],
    },
    {
        "nom": "Smoothie banane skyr amandes",
        "description": "Collation proteinees et cremeuse, parfaite avant l'entrainement.",
        "instructions": "1. Mixer la banane avec le skyr. 2. Ajouter les amandes. 3. Allonger avec un peu de lait. 4. Servir frais.",
        "portions": 1,
        "emoji": "🥤", "couleur": "#059669", "bg": "#D1FAE5",
        "ingredients": [("Banane", 120), ("Skyr nature", 150), ("Amandes", 20), ("Lait demi-ecreme", 100)],
    },
    {
        "nom": "Poulet grille, quinoa et legumes",
        "description": "Un dejeuner complet et equilibre, parfait pour la recuperation musculaire.",
        "instructions": "1. Griller le blanc de poulet assaisonne. 2. Cuire le quinoa. 3. Faire sauter les haricots verts. 4. Dresser dans l'assiette. 5. Arroser d'huile d'olive.",
        "portions": 1,
        "emoji": "🍗", "couleur": "#1D9E75", "bg": "#ECFDF5",
        "ingredients": [("Blanc de poulet", 150), ("Quinoa cuit", 150), ("Haricots verts", 100), ("Huile d'olive", 10), ("Tomates", 80)],
    },
    {
        "nom": "Salade de saumon et quinoa",
        "description": "Riche en omega-3 et acides amines essentiels.",
        "instructions": "1. Cuire et refroidir le quinoa. 2. Couper le saumon en des. 3. Melanger avec la salade et les tomates. 4. Assaisonner d'huile d'olive et de citron.",
        "portions": 1,
        "emoji": "🥗", "couleur": "#0369A1", "bg": "#E0F2FE",
        "ingredients": [("Saumon frais", 130), ("Quinoa cuit", 100), ("Salade verte", 60), ("Tomates", 80), ("Huile d'olive", 15)],
    },
    {
        "nom": "Pates au thon et tomates",
        "description": "Un classique rapide et nourrissant, ideal apres une seance intense.",
        "instructions": "1. Cuire les pates al dente. 2. Faire revenir les tomates en des. 3. Ajouter le thon egoutte. 4. Melanger avec les pates et assaisonner.",
        "portions": 1,
        "emoji": "🍝", "couleur": "#DC2626", "bg": "#FEF2F2",
        "ingredients": [("Pates cuites", 200), ("Thon en conserve (eau)", 120), ("Tomates", 150), ("Huile d'olive", 10)],
    },
    {
        "nom": "Yaourt grec, fraises et noix",
        "description": "Collation legere et proteinees pour l'apres-midi.",
        "instructions": "1. Verser le yaourt grec dans un bol. 2. Ajouter les fraises coupees et les myrtilles. 3. Parsemer de noix concassees. 4. Deguster frais.",
        "portions": 1,
        "emoji": "🍓", "couleur": "#DB2777", "bg": "#FDF2F8",
        "ingredients": [("Yaourt grec nature", 150), ("Fraises", 80), ("Myrtilles", 50), ("Noix", 20)],
    },
    {
        "nom": "Saumon au four, patate douce et brocolis",
        "description": "Diner complet anti-inflammatoire, ideal pour la recuperation.",
        "instructions": "1. Prechauffer le four a 200C. 2. Placer le saumon sur la plaque. 3. Cuire la patate douce a la vapeur. 4. Rotir les brocolis 15 min. 5. Assaisonner et servir.",
        "portions": 1,
        "emoji": "🐟", "couleur": "#0891B2", "bg": "#ECFEFF",
        "ingredients": [("Saumon frais", 150), ("Patate douce cuite", 200), ("Brocolis", 150), ("Huile d'olive", 10)],
    },
    {
        "nom": "Soupe de lentilles aux epices",
        "description": "Diner chaud et reconfortant, riche en proteines vegetales et fibres.",
        "instructions": "1. Faire revenir oignon et epices. 2. Ajouter les lentilles et 600ml d'eau. 3. Cuire 20 min. 4. Mixer partiellement. 5. Servir avec du pain complet.",
        "portions": 2,
        "emoji": "🍲", "couleur": "#92400E", "bg": "#FFFBEB",
        "ingredients": [("Lentilles cuites", 200), ("Tomates", 100), ("Huile d'olive", 15), ("Pain complet", 60)],
    },
    {
        "nom": "Steak de boeuf, riz complet et haricots rouges",
        "description": "Repas de recuperation musculaire, riche en fer et proteines.",
        "instructions": "1. Cuire le riz complet. 2. Griller le steak a point. 3. Rechauffer les haricots rouges avec des epices. 4. Dresser et arroser d'huile d'olive.",
        "portions": 1,
        "emoji": "🥩", "couleur": "#991B1B", "bg": "#FEF2F2",
        "ingredients": [("Steak de boeuf maigre", 150), ("Riz complet cuit", 150), ("Haricots rouges cuits", 80), ("Huile d'olive", 10)],
    },
    {
        "nom": "Bowl proteines poulet avocat",
        "description": "Bowl complet post-entrainement avec proteines et bons lipides.",
        "instructions": "1. Cuire le riz blanc. 2. Griller le poulet assaisonne. 3. Trancher l'avocat. 4. Dresser en bowl avec les edamames et les tomates cerises. 5. Arroser d'huile d'olive et de citron.",
        "portions": 1,
        "emoji": "🥑", "couleur": "#065F46", "bg": "#ECFDF5",
        "ingredients": [("Blanc de poulet grille", 150), ("Riz blanc cuit", 150), ("Avocat", 80), ("Edamame", 60), ("Tomates", 80), ("Huile d'olive", 10)],
    },
    {
        "nom": "Pancakes proteines avoine",
        "description": "Petit-dejeuner gourmand et riche en proteines pour bien demarrer.",
        "instructions": "1. Mixer les flocons d'avoine en farine. 2. Melanger avec les oeufs, le blanc d'oeuf et la whey. 3. Allonger avec le lait. 4. Cuire dans une poele antiadhesive. 5. Garnir de fruits frais.",
        "portions": 2,
        "emoji": "🥞", "couleur": "#D97706", "bg": "#FFFBEB",
        "ingredients": [("Flocons d'avoine", 80), ("Oeuf entier", 100), ("Blanc d'oeuf", 60), ("Whey proteine (vanille)", 30), ("Lait demi-ecreme", 100), ("Myrtilles", 60)],
    },
    {
        "nom": "Cabillaud vapeur et legumes de saison",
        "description": "Diner leger et sain, riche en proteines maigres et vitamines.",
        "instructions": "1. Cuire le cabillaud a la vapeur 10 min. 2. Faire sauter les courgettes et carottes. 3. Cuire la pomme de terre. 4. Dresser et assaisonner avec huile d'olive.",
        "portions": 1,
        "emoji": "🐠", "couleur": "#0284C7", "bg": "#E0F2FE",
        "ingredients": [("Cabillaud", 180), ("Courgette", 120), ("Carottes", 100), ("Pomme de terre cuite", 150), ("Huile d'olive", 10)],
    },
    {
        "nom": "Wrap dinde, salade et avocat",
        "description": "Dejeuner rapide et equilibre, parfait pour manger sur le pouce.",
        "instructions": "1. Rechauffer la galette de riz. 2. Etaler l'avocat ecrase. 3. Disposer la dinde emincee et la salade. 4. Ajouter les tomates. 5. Rouler et servir.",
        "portions": 1,
        "emoji": "🌯", "couleur": "#059669", "bg": "#D1FAE5",
        "ingredients": [("Dinde emincee", 120), ("Avocat", 60), ("Salade verte", 40), ("Tomates", 60), ("Galettes de riz", 40)],
    },
    {
        "nom": "Oeufs brouilles aux champignons et epinards",
        "description": "Petit-dejeuner complet proteines et micronutriments.",
        "instructions": "1. Faire revenir les champignons dans l'huile. 2. Ajouter les epinards et faire tomber. 3. Battre les oeufs avec le blanc. 4. Verser dans la poele et brouiller. 5. Assaisonner et servir avec pain complet.",
        "portions": 1,
        "emoji": "🍄", "couleur": "#78350F", "bg": "#FEF3C7",
        "ingredients": [("Oeuf entier", 150), ("Blanc d'oeuf", 60), ("Champignons de Paris", 100), ("Epinards", 80), ("Huile d'olive", 8), ("Pain complet", 40)],
    },
    {
        "nom": "Salade de pois chiches mediterraneenne",
        "description": "Salade vegetarienne riche en proteines vegetales et en fibres.",
        "instructions": "1. Egoutter les pois chiches. 2. Couper le concombre, les tomates et le poivron. 3. Melanger tous les legumes. 4. Assaisonner d'huile d'olive et citron. 5. Servir frais.",
        "portions": 1,
        "emoji": "🫘", "couleur": "#B45309", "bg": "#FFFBEB",
        "ingredients": [("Pois chiches cuits", 150), ("Tomates", 100), ("Concombre", 80), ("Poivron rouge", 60), ("Salade verte", 50), ("Huile d'olive", 15)],
    },
    {
        "nom": "Crevettes sautees et riz basmati",
        "description": "Repas leger et rapide, riche en proteines maigres.",
        "instructions": "1. Cuire le riz. 2. Faire sauter les crevettes avec l'ail et l'huile 3 min. 3. Ajouter les poivrons et courgettes. 4. Melanger avec le riz. 5. Servir chaud.",
        "portions": 1,
        "emoji": "🍤", "couleur": "#EA580C", "bg": "#FFF7ED",
        "ingredients": [("Crevettes cuites", 150), ("Riz blanc cuit", 150), ("Poivron rouge", 80), ("Courgette", 80), ("Huile d'olive", 10)],
    },
    {
        "nom": "Fromage blanc, kiwi et miel",
        "description": "Collation proteinee et rafraichissante, riche en vitamine C.",
        "instructions": "1. Verser le fromage blanc dans un bol. 2. Peler et trancher les kiwis. 3. Ajouter les fraises coupees. 4. Napper de miel. 5. Deguster frais.",
        "portions": 1,
        "emoji": "🥝", "couleur": "#16A34A", "bg": "#F0FDF4",
        "ingredients": [("Fromage blanc 0%", 200), ("Kiwi", 100), ("Fraises", 80), ("Miel", 15)],
    },
    {
        "nom": "Boeuf hache, patate douce et brocolis",
        "description": "Repas de force equilibre, riche en proteines et glucides complexes.",
        "instructions": "1. Faire revenir le boeuf hache. 2. Cuire la patate douce a la vapeur. 3. Faire sauter les brocolis. 4. Assaisonner et dresser en assiette.",
        "portions": 1,
        "emoji": "🫕", "couleur": "#7C2D12", "bg": "#FEF2F2",
        "ingredients": [("Boeuf hache 5% MG", 150), ("Patate douce cuite", 200), ("Brocolis", 150), ("Huile d'olive", 10)],
    },
    {
        "nom": "Salade de maquereau, pommes de terre et haricots verts",
        "description": "Repas complet omega-3, ideal pour les jours de recuperation.",
        "instructions": "1. Cuire les pommes de terre. 2. Cuire les haricots verts. 3. Emietter le maquereau. 4. Melanger tous les ingredients. 5. Assaisonner avec huile d'olive et moutarde.",
        "portions": 1,
        "emoji": "🐟", "couleur": "#1D4ED8", "bg": "#EFF6FF",
        "ingredients": [("Maquereau", 130), ("Pomme de terre cuite", 200), ("Haricots verts", 120), ("Huile d'olive", 12)],
    },
    {
        "nom": "Skyr mangue et noix",
        "description": "Collation exotique et rassasiante, riche en proteines.",
        "instructions": "1. Verser le skyr dans un bol. 2. Couper la mangue en cubes. 3. Ajouter la banane tranchee. 4. Parsemer de noix concassees. 5. Deguster immediatement.",
        "portions": 1,
        "emoji": "🥭", "couleur": "#F59E0B", "bg": "#FFFBEB",
        "ingredients": [("Skyr nature", 150), ("Mangue", 100), ("Banane", 80), ("Noix", 20)],
    },
    {
        "nom": "Gratin de chou-fleur au jambon",
        "description": "Plat chaud proteines-faible en calories, ideal en diner.",
        "instructions": "1. Prechauffer le four a 180C. 2. Cuire le chou-fleur a la vapeur. 3. Melanger avec le jambon. 4. Disposer dans un plat, couvrir d'emmental. 5. Gratiner 15 min.",
        "portions": 2,
        "emoji": "🧀", "couleur": "#CA8A04", "bg": "#FEFCE8",
        "ingredients": [("Chou-fleur", 300), ("Jambon blanc degraisse", 100), ("Emmental", 40), ("Lait demi-ecreme", 100)],
    },
    {
        "nom": "Smoothie bowl mangue banane et whey",
        "description": "Petit-dejeuner energisant et proteines avant l'entrainement.",
        "instructions": "1. Mixer la mangue, la banane et la whey. 2. Ajouter le lait pour obtenir une texture epaisse. 3. Verser dans un bol. 4. Garnir de myrtilles, amandes et flocons d'avoine.",
        "portions": 1,
        "emoji": "🍹", "couleur": "#7C3AED", "bg": "#F5F3FF",
        "ingredients": [("Mangue", 120), ("Banane", 100), ("Whey proteine (vanille)", 30), ("Lait demi-ecreme", 100), ("Myrtilles", 50), ("Amandes", 15), ("Flocons d'avoine", 30)],
    },
    {
        "nom": "Poulet tikka, riz et asperges",
        "description": "Plat savoureux aux epices douces, riche en proteines maigres.",
        "instructions": "1. Mariner le poulet dans du yaourt et les epices 30 min. 2. Griller au four 20 min. 3. Cuire le riz. 4. Faire sauter les asperges. 5. Dresser et garnir de yaourt.",
        "portions": 1,
        "emoji": "🍛", "couleur": "#B45309", "bg": "#FEF3C7",
        "ingredients": [("Blanc de poulet", 160), ("Yaourt grec nature", 80), ("Riz blanc cuit", 150), ("Asperges", 120), ("Huile d'olive", 8)],
    },
    {
        "nom": "Toast avocat-oeuf poché",
        "description": "Petit-dejeuner de champion, riche en proteines et bons lipides.",
        "instructions": "1. Griller le pain complet. 2. Ecraser l'avocat et etaler sur le pain. 3. Pocher l'oeuf dans l'eau frissonnante 3 min. 4. Deposer sur l'avocat. 5. Assaisonner.",
        "portions": 1,
        "emoji": "🍞", "couleur": "#78350F", "bg": "#FEF3C7",
        "ingredients": [("Pain complet", 80), ("Avocat", 100), ("Oeuf entier", 100), ("Tomates", 60)],
    },
    {
        "nom": "Salade de lentilles et saumon fume",
        "description": "Dejeuner detox riche en fibres, fer et omega-3.",
        "instructions": "1. Rincer et egoutter les lentilles. 2. Hacher les carottes et le concombre. 3. Melanger avec les epinards. 4. Ajouter le saumon emiette. 5. Assaisonner et servir.",
        "portions": 1,
        "emoji": "🥬", "couleur": "#166534", "bg": "#F0FDF4",
        "ingredients": [("Lentilles cuites", 150), ("Saumon frais", 100), ("Carottes", 80), ("Epinards", 60), ("Concombre", 80), ("Huile d'olive", 12)],
    },
    {
        "nom": "Mug cake proteine chocolat",
        "description": "Dessert sain et gourmand, parfait apres l'entrainement.",
        "instructions": "1. Melanger tous les ingredients dans une tasse. 2. Microondes 90 secondes. 3. Laisser reposer 1 min. 4. Garnir d'une cuillere de beurre d'amande.",
        "portions": 1,
        "emoji": "🍫", "couleur": "#7C2D12", "bg": "#FEF2F2",
        "ingredients": [("Whey proteine (vanille)", 30), ("Flocons d'avoine", 40), ("Oeuf entier", 50), ("Chocolat noir 70%", 20), ("Lait demi-ecreme", 60), ("Beurre d'amande", 15)],
    },
    {
        "nom": "Salade de thon, haricots noirs et poivron",
        "description": "Salade mexicaine proteines, ideal pour un dejeuner rapide.",
        "instructions": "1. Egoutter le thon et les haricots. 2. Couper le poivron et les tomates. 3. Tout melanger dans un saladier. 4. Assaisonner d'huile d'olive, citron et cumin.",
        "portions": 1,
        "emoji": "🫙", "couleur": "#1D4ED8", "bg": "#EFF6FF",
        "ingredients": [("Thon en conserve (eau)", 150), ("Haricots noirs cuits", 120), ("Poivron rouge", 80), ("Tomates", 80), ("Huile d'olive", 12)],
    },
    {
        "nom": "Riz sauté aux crevettes et legumes",
        "description": "Plat asiatique proteines rapide, plein de saveurs.",
        "instructions": "1. Cuire le riz a l'avance et refroidir. 2. Faire sauter les crevettes. 3. Ajouter les carottes, brocolis et courgettes. 4. Incorporer le riz. 5. Assaisonner avec huile de coco.",
        "portions": 2,
        "emoji": "🍚", "couleur": "#0891B2", "bg": "#ECFEFF",
        "ingredients": [("Crevettes cuites", 150), ("Riz blanc cuit", 200), ("Carottes", 80), ("Brocolis", 100), ("Courgette", 80), ("Huile de coco", 10)],
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

    # Subtle gradient
    for i in range(h):
        alpha = int(15 * (i / h))
        r = max(0, bg[0] - alpha)
        g = max(0, bg[1] - alpha)
        b = max(0, bg[2] - alpha)
        draw.line([(0, i), (w, i)], fill=(r, g, b))

    # Decorative circles
    draw.ellipse([(w - 200, -80), (w + 80, 200)], fill=(*fg, 30) if len(fg) == 3 else fg)
    draw.ellipse([(-80, h - 200), (200, h + 80)], fill=(*fg, 20) if len(fg) == 3 else fg)

    # Load fonts
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 38)
        font_sub   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub   = font_title

    # Big emoji (rendered as text fallback)
    draw.text((w // 2, h // 2 - 60), emoji, font=font_sub, fill=fg, anchor="mm")

    # Wrap title if too long
    words = nom.split()
    lines = []
    line = ""
    for word in words:
        if len(line + " " + word) > 28:
            lines.append(line)
            line = word
        else:
            line = (line + " " + word).strip()
    if line:
        lines.append(line)

    y_start = h // 2 + 30
    for i, l in enumerate(lines):
        draw.text((w // 2, y_start + i * 48), l, font=font_title, fill=fg, anchor="mm")

    # Accent bar
    draw.rectangle([(w // 4, h - 50), (3 * w // 4, h - 44)], fill=fg)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


class Command(BaseCommand):
    help = "Seed 10 recettes avec photos"

    def handle(self, *args, **options):
        coach = User.objects.filter(role="coach").first()
        if not coach:
            self.stdout.write(self.style.ERROR("Aucun coach trouve."))
            return

        aliment_map = {a.nom.lower(): a for a in Aliment.objects.all()}

        created = 0
        for data in RECETTES:
            if Recette.objects.filter(nom=data["nom"], coach=coach).exists():
                self.stdout.write(f"  -> deja existante : {data['nom']}")
                continue

            recette = Recette(
                coach=coach,
                nom=data["nom"],
                description=data["description"],
                instructions=data["instructions"],
                portions=data["portions"],
            )

            try:
                img_bytes = make_photo(data["nom"], data["emoji"], data["couleur"], data["bg"])
                fname = data["nom"].lower()
                for ch in " ,\\'":
                    fname = fname.replace(ch, "_")
                fname = fname[:40] + ".jpg"
                recette.photo.save(fname, ContentFile(img_bytes), save=False)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Photo non generee : {e}"))

            recette.save()

            for ing_nom, qte in data["ingredients"]:
                aliment = aliment_map.get(ing_nom.lower())
                if aliment:
                    IngredientRecette.objects.create(recette=recette, aliment=aliment, quantite_g=qte)
                else:
                    self.stdout.write(self.style.WARNING(f"  Aliment introuvable: {ing_nom}"))

            self.stdout.write(self.style.SUCCESS(f"  OK {data['nom']}"))
            created += 1

        self.stdout.write(self.style.SUCCESS(f"\n{created} recettes creees."))

# Screenshots de la landing

Drop tes captures ici avec exactement ces noms (sinon il faudra modifier `index.html`) :

| Fichier | Vue capturée | Dimension | Taille max |
|---|---|---|---|
| `dashboard.webp` | Tableau de bord coach (`/dashboard`) | 1440×900 | 200 KB |
| `clients.webp` | Liste clients (`/clients`) | 1440×900 | 200 KB |
| `programme-ia.webp` | Génération programme IA | 1440×900 | 200 KB |
| `portail-mobile.webp` | Portail client sur iPhone | 400×800 | 80 KB |
| `suivi.webp` | Graphes de suivi client | 1440×900 | 200 KB |
| `revenus.webp` | Page revenus / facturation | 1440×900 | 200 KB |

## Capturer en bonne dimension

**Firefox** : F12 → onglet "Réactif" → choisis "iPhone 14 Pro" (mobile) ou "Personnalisé 1440×900" (desktop) → bouton appareil photo en haut à droite.

**Chrome** : F12 → "Toggle device toolbar" → idem → menu "..." → "Capture screenshot".

## Convertir PNG → WebP

Le plus simple : [squoosh.app](https://squoosh.app) (drag-drop, qualité 80, download).

CLI :
```bash
cwebp -q 80 dashboard.png -o dashboard.webp
```

## Variante PNG (si tu ne veux pas convertir)

Garde l'extension `.png` et adapte les `<img src="...">` dans `index.html` en remplaçant `.webp` par `.png`. Mais ta landing sera ~3× plus lourde.

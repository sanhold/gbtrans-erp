# Graphify — bibliothèque de graphiques réutilisable

Ensemble de composants réutilisables pour afficher des graphiques (courbe, aire, barres, camembert/anneau) dans le frontend, construits sur **Chart.js** + **react-chartjs-2** (déjà présents dans `package.json`, jusqu'ici non utilisés — aucune nouvelle dépendance n'a été ajoutée).

## Pourquoi Chart.js et pas une autre lib

`chart.js` et `react-chartjs-2` étaient déjà déclarés dans `frontend/package.json` mais jamais importés nulle part dans le code (le graphique « Chiffre d'affaires mensuel » du tableau de bord est construit à la main avec des `div` en CSS). Plutôt que d'ajouter une deuxième bibliothèque de graphiques, Graphify s'appuie sur celle déjà installée.

## Installation

Rien à installer — les dépendances sont déjà dans `package.json`. Si elles venaient à manquer :

```bash
npm install chart.js react-chartjs-2
```

## Architecture

```
frontend/src/
├── types/graphify.ts          → GraphifyChartType, GraphifyData, GraphifySeries, GraphifyConfig
├── services/graphify.ts       → transforme un GraphifyData en options/données Chart.js (palette, thème)
├── hooks/useGraphify.ts       → useGraphify() (fetch + loading/error/empty) et useIsDarkMode()
└── components/charts/
    ├── GraphifyChart.tsx      → rendu Chart.js pur (line/area/bar/pie/doughnut)
    ├── GraphifyContainer.tsx  → carte complète : titre, toolbar, loading/empty/error/succès
    ├── GraphifyLegend.tsx     → légende à puce colorée, cohérente avec la charte existante
    ├── GraphifyToolbar.tsx    → emplacement pour filtres + bouton de rafraîchissement
    └── index.ts               → exports groupés
```

## Utilisation de base

```tsx
import { GraphifyContainer } from '@/components/charts';
import { useGraphify } from '@/hooks/useGraphify';

function MonGraphique() {
  const { data, loading, error, refresh } = useGraphify(
    () => monApi.getDonnees().then(r => ({
      labels: r.data.map(d => d.mois),
      series: [{ label: 'Chiffre d\'affaires', data: r.data.map(d => d.montant) }],
    })),
    []
  );

  return (
    <GraphifyContainer
      title="Évolution du CA"
      type="area"
      data={data}
      loading={loading}
      error={error}
      onRefresh={refresh}
      config={{ yAxisFormatter: (v) => `${v.toLocaleString('fr-FR')} F` }}
    />
  );
}
```

## Format des données (`GraphifyData`)

```ts
{
  labels: string[];           // axe X (mois, catégories, noms de clients...)
  series: {
    label: string;             // nom affiché dans la légende
    data: number[];            // une valeur par label
    color?: string;            // couleur hexadécimale ; sinon puisée dans la palette de marque
  }[];
}
```

Pour un camembert/anneau (`type: 'pie' | 'doughnut'`), une seule série est utilisée : `series[0].data[i]` correspond à `labels[i]`.

## Ajouter un nouveau graphique

1. Préparer les données au format `GraphifyData` (le plus souvent en transformant la réponse d'un endpoint existant dans `lib/api.ts`).
2. Appeler `useGraphify(fetcher, deps)` pour obtenir `data/loading/error/refresh`.
3. Rendre `<GraphifyContainer type="..." data={data} loading={loading} error={error} />`.

Types disponibles : `'line' | 'area' | 'bar' | 'pie' | 'doughnut'`.

## Personnalisation (`GraphifyConfig`)

| Option | Effet |
|---|---|
| `stacked` | empile les séries (graphiques en barres/courbes) |
| `showLegend` | force l'affichage/masquage de la légende (par défaut : visible pour pie/doughnut) |
| `yAxisFormatter(value)` | formate les valeurs de l'axe Y (ex. devise) |
| `tooltipFormatter(value)` | formate la valeur affichée dans l'info-bulle |
| `height` | hauteur du graphique en pixels (280 par défaut) |

## Intégration API

Le flux recommandé est : `API (lib/api.ts) → transformation en GraphifyData → useGraphify → GraphifyContainer`. La transformation (regroupement, calcul de pourcentages, etc.) reste dans la page ou dans `services/graphify.ts` si elle est réutilisée à plusieurs endroits — Graphify ne fait aucune hypothèse sur la provenance des données.

## Gestion des erreurs et états

`GraphifyContainer` gère automatiquement quatre états à partir de ce que renvoie `useGraphify` :
- **loading** : spinner
- **error** : message d'erreur (texte renvoyé par l'API ou l'exception)
- **empty** : aucune série non nulle → « Aucune donnée disponible »
- **succès** : le graphique + sa légende

## Thème clair/sombre

`useIsDarkMode()` observe la classe `dark` posée sur `<html>` par le bouton de thème existant (`Header.tsx`) et adapte automatiquement les couleurs de grille/texte des graphiques — aucune configuration supplémentaire n'est nécessaire.

## Page de démonstration

`frontend/src/app/demo-graphify/page.tsx` — accessible à `/demo-graphify` (non liée au menu, page interne). Elle présente les 4 familles de graphiques demandées (évolution, comparaison, répartition, indicateurs) avec des données fictives, ainsi qu'un sélecteur pour forcer les états loading/empty/error sur la 4ᵉ carte.

## Bonnes pratiques

- Ne pas dupliquer la palette de couleurs : réutiliser `GRAPHIFY_PALETTE` exportée par `services/graphify.ts`.
- Garder la transformation des données métier en dehors de `GraphifyChart`/`GraphifyContainer` — ces composants ne doivent connaître que le format `GraphifyData`.
- Ne pas remplacer les graphiques existants construits à la main (ex. dashboard) sans demande explicite : Graphify est un outil disponible pour les nouveaux graphiques, pas un remplacement automatique de l'existant.

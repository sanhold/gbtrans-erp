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
    color?: string;            // couleur hexadécimale pour toute la série ; sinon puisée dans la palette de marque
    colors?: string[];         // couleur par point (barres, camemberts/anneaux) — prioritaire sur `color`
  }[];
}
```

Pour un camembert/anneau (`type: 'pie' | 'doughnut'`), une seule série est utilisée : `series[0].data[i]` correspond à `labels[i]`.

`colors` sert à préserver une sémantique de couleur métier (ex. vert pour des recettes / rouge pour des dépenses, ou une couleur par étape d'un pipeline commercial) plutôt que de laisser Graphify assigner ses couleurs par défaut point par point.

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

Le mode sombre de l'application est un état React local (pas de `localStorage`) : il ne survit pas à un rechargement complet de page. Ce n'est pas une particularité de Graphify — un graphique Graphify suit fidèlement l'état réel de `<html class="dark">` au moment du rendu.

## Piège de dimensionnement (Chart.js + grid/flex)

Un canvas Chart.js/`react-chartjs-2` a besoin que son conteneur direct porte `position: relative` (et idéalement `width: 100%; min-width: 0`) pour calculer sa taille correctement lorsqu'il est placé dans une grille CSS ou un flex container — sans quoi le graphique peut se dessiner avec une taille quasi nulle, **sans aucune erreur console**. `GraphifyChart.tsx` applique déjà ce style sur son wrapper ; c'est pour cette raison qu'il ne faut pas retirer ou contourner ce wrapper en enveloppant `<Component>` (Line/Bar/Pie/Doughnut) directement dans un autre conteneur en amont.

## Composants métier prêts à l'emploi (`components/dashboard/`)

En plus des briques génériques de `components/charts/`, quatre composants prêts à l'emploi encapsulent des graphiques réutilisés à plusieurs endroits de l'application (évite de dupliquer la mise en forme `GraphifyData` à chaque page) :

| Composant | Utilisé dans | Rôle |
|---|---|---|
| `CAMensuelChart` | `dashboard/page.tsx`, `dashboard/analytique/page.tsx` | Aire Facturé vs Encaissé, par mois |
| `RepartitionDossiersChart` | `dashboard/page.tsx`, `dashboard/analytique/page.tsx`, `statistiques/page.tsx` | Anneau + légende (dot/valeur/%) par type de dossier |
| `ResumeFinancierChart` | `dashboard/analytique/page.tsx` | Barres Recettes/Dépenses/Bénéfice avec couleurs sémantiques fixes (vert/rouge/bleu selon signe) |
| `DossiersParAnneeChart` | `dashboard/analytique/page.tsx` | Barres par année, année sélectionnée mise en évidence via `colors` |

Ces composants rendent un `GraphifyChart` nu (pas `GraphifyContainer`) car leurs pages appellent avec leur propre carte/titre déjà en place — ils gèrent eux-mêmes leur état vide (« Aucune donnée disponible pour cette période. »).

## Page de démonstration

`frontend/src/app/demo-graphify/page.tsx` — accessible à `/demo-graphify` (non liée au menu, page interne). Elle présente les 4 familles de graphiques demandées (évolution, comparaison, répartition, indicateurs) avec des données fictives, ainsi qu'un sélecteur pour forcer les états loading/empty/error sur la 4ᵉ carte. **C'est le seul endroit de l'application où des données fictives sont tolérées** — toutes les pages métier (dashboard, statistiques, finance, prospects...) utilisent exclusivement des données réelles issues de l'API.

## Intégration réelle dans l'application (Phase 2)

Les graphiques faits main (`div` + largeurs calculées en CSS) qui dupliquaient la même information à plusieurs endroits ont été remplacés par les composants ci-dessus, sans changer ni les données ni les règles métier affichées :

- `dashboard/page.tsx` et `dashboard/analytique/page.tsx` : CA mensuel (Facturé/Encaissé) et répartition des dossiers par type — même source de données (`dashboardApi`), même filtres, seule la visualisation change.
- `dashboard/analytique/page.tsx` : « Résumé financier » et « Dossiers par année » convertis de grilles de mini-cartes en graphiques en barres.
- `statistiques/page.tsx` : répartition des dossiers par type.
- `finance/page.tsx` : ajout d'un graphique en barres résumant les soldes par type de compte, **au-dessus** des tuiles cliquables existantes (`onClick={() => setSelectedType(...)}`) qui sont conservées à l'identique car elles ont une vraie fonction de navigation qu'un graphique ne remplace pas.
- `prospects/page.tsx` : pipeline commercial (Nouveaux/En négociation/Gagnés/Perdus) en anneau + légende, avec des couleurs `colors` fixes par statut.

Sections **volontairement conservées telles quelles** (pas de graphique) : toutes les cartes à valeur unique (KPI), les tableaux comptables normés (grand livre, balance, bilan), la barre de progression par dossier, les listes d'alertes — un graphique n'y apporterait rien par rapport à la lecture directe d'un nombre ou d'une ligne de tableau.

## Bonnes pratiques

- Ne pas dupliquer la palette de couleurs : réutiliser `GRAPHIFY_PALETTE` exportée par `services/graphify.ts`.
- Garder la transformation des données métier en dehors de `GraphifyChart`/`GraphifyContainer` — ces composants ne doivent connaître que le format `GraphifyData`.
- Ne remplacer un graphique existant construit à la main que lorsqu'il représente une vraie statistique dupliquée ailleurs ou clairement améliorable par Graphify (voir « Intégration réelle » ci-dessus) — jamais une simple préférence esthétique, et jamais au prix d'une fonctionnalité existante (navigation, clic, filtre).
- Toujours vérifier visuellement (pas seulement l'absence d'erreur console) qu'un nouveau graphique s'affiche à la bonne taille dans son emplacement réel — voir « Piège de dimensionnement » ci-dessus.

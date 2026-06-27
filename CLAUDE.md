# CLAUDE.md — Carnet Auto

Contexte et règles de travail pour ce projet. **À lire avant toute intervention.**

## Le projet

**Carnet Auto** : PWA (Progressive Web App) de suivi d'entretien automobile pour Fabrice
(non-développeur). Voiture principale : Volvo XC60 (achetée 2025, ~130 000 km, CT fait à
l'achat → prochaine échéance ~2027). Multi-véhicules.

100 % **local** (IndexedDB) — aucune donnée ne quitte l'appareil. **Pas de serveur, pas de
backend.** Sauvegarde = export/import d'un fichier `.json` que l'utilisateur dépose sur son
Google Drive (pas de synchro OAuth).

Langue de l'app : **français**. Public : grand public non technique → UX simple, libellés clairs.

## ⚠️ Règles de développement critiques

1. **NE JAMAIS mettre `node_modules` (ni `.git`) dans le dossier Google Drive.** La synchro
   Drive verrouille les fichiers → `npm install` échoue (EPERM/ENOTEMPTY/EBADF).
   - **Dossier de dev = LOCAL** : `C:\Users\fabri\carnet-auto` (contient node_modules + .git).
   - Le dossier Drive `G:\Mon Drive\4-AI\Divers\Apps Voiture` ne sert que de **copie de
     sauvegarde** du code source + `dist`. Le **dépôt git vit dans le dossier local**.
   - Pour synchroniser local → Drive après des changements :
     ```
     robocopy "C:\Users\fabri\carnet-auto" "G:\Mon Drive\4-AI\Divers\Apps Voiture" /MIR ^
       /XD node_modules .vite .git .claude /XF desktop.ini
     ```
2. **Source de vérité = GitHub** (`main`). Travailler en local, commiter, pousser.

## Déploiement

- **Dépôt** : https://github.com/fabrice-hamel/carnet-auto (public — requis pour Pages gratuit).
- **Hébergement** : GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).
  Le workflow s'auto-active (`actions/configure-pages@v5` avec `enablement: true`).
- **URL en production** : https://fabrice-hamel.github.io/carnet-auto/
- **Tout push sur `main` redéploie automatiquement** → l'app installée sur le téléphone se
  met à jour seule.
- `base: './'` (vite) + **HashRouter** : indispensables pour fonctionner sous le sous-chemin
  `/carnet-auto/`. Ne pas casser ça.
- Installation mobile : ouvrir l'URL dans Chrome → menu ⋮ → « Ajouter à l'écran d'accueil »
  (geste manuel normal pour une PWA).

## Commandes (dans le dossier local)

```bash
npm install        # dépendances
npm run dev        # dev (http://localhost:5173)
npm run build      # tsc -b && vite build → dist/
npm run preview    # sert dist/ (http://localhost:4173)
```

## Vérification / preview

- L'outil de capture (`preview_screenshot`) **time out sur les pages contenant un graphique
  recharts en mode `npm run dev`** (le ResponsiveContainer empêche l'état « idle »).
  → Pour les captures, utiliser le **build de production** servi par `npm run preview`
    (config `carnet-auto-prod` dans `.claude/launch.json`, port 4173). En prod le JS est
    groupé, les captures fonctionnent.
- En dev, vérifier le rendu des graphiques via le DOM (`preview_eval`) plutôt que la capture.

## Pile technique

React 18 + TypeScript + Vite 5 · Tailwind CSS v3 (`darkMode: 'class'`) · Dexie 4 (IndexedDB)
· dexie-react-hooks (`useLiveQuery`) · react-router-dom 6 (HashRouter) · recharts 2 · date-fns 3
(locale fr) · lucide-react · vite-plugin-pwa (Workbox).

## Architecture

- `src/db/` — `types.ts` (modèle), `db.ts` (schéma Dexie + settings), `repo.ts` (créations/
  cascades : `createVehicleWithDefaults`, `completeTask`, `validateCT`, `deleteVehicleCascade`).
- `src/lib/` — `scheduling.ts` (échéances km+temps, `estimatedMileage`, statuts d'urgence),
  `ct.ts` (règles contrôle technique FR : 4 ans puis +2 ans, contre-visite 2 mois),
  `presets.ts` (plan d'entretien XC60/générique), `alerts.ts` (agrégation tableau de bord),
  `ics.ts` (export calendrier), `backup.ts` (export/import JSON), `format.ts`, `theme.ts`,
  `files.ts` (compression images), `useSettings.ts`.
- `src/pages/` — Dashboard, Vehicles, VehicleDetail, Settings.
- `src/components/` — `Layout.tsx` (nav responsive : rail latéral ≥lg, bottom-nav mobile),
  `ui.tsx` (Modal, Field, StatusBadge…), `charts.tsx` (Bar/Line, `isAnimationActive={false}`),
  `VehicleForm.tsx`, `ErrorBoundary.tsx`, `tabs/` (Maintenance, Deadlines, Fuel, Expenses, Documents).

## Conventions UI

- **Style coloré retenu** par Fabrice : cartes dégradées sur le dashboard (rouge/orange/bleu),
  alertes à fond teinté + liseré coloré selon l'urgence. Garder cette direction.
- Responsive testé à 340 / 375 / 1280 px (Z Fold plié/déplié inclus).
- Statuts couleur : vert = à jour, orange = bientôt, rouge = en retard, gris = à renseigner.
- Classes utilitaires maison dans `src/index.css` : `.card .btn-primary .btn-ghost .input .label .chip`.

## Règles métier à préserver

- **Contrôle technique FR** : 1ère visite à 4 ans, puis tous les 2 ans. Le bouton « Validé »
  demande la date du CT réalisé et reporte à +24 mois. Source : service-public.gouv.fr (F2878).
- **Échéances d'entretien** : mixte km ET temps ; l'urgence = la plus proche des deux.
  Estimation du km courant = dernier relevé + (km/an ÷ 365 × jours écoulés).
- Les préréglages XC60 et délais CT sont des **valeurs par défaut paramétrables** (à ajuster
  selon motorisation/année).
- **Interventions** (`ServiceRecord.status`) : `done` = réalisé (historique) ou `planned` =
  prévu/devis (section « À prévoir », convertible en réalisé via « Fait »). On peut **joindre
  des factures/devis** (photo compressée ou PDF) à chaque intervention (`documentIds` →
  `documents`). L'onglet Entretien affiche : 3 prochaines maintenances suggérées, À prévoir,
  Historique, puis Plan prévisionnel (déroulé). Relier une intervention à une tâche du plan
  met à jour son échéance.

## En suspens / améliorations possibles

- **Motorisation par défaut = Diesel** dans `VehicleForm.tsx` (hypothèse, à confirmer avec
  Fabrice). Affiner les intervalles XC60 selon le moteur/année exacts.
- **recharts alourdit le bundle (~780 KiB precache)** → envisager un lazy-load (`React.lazy`)
  des graphiques pour alléger le démarrage.
- Rappels push/e-mail = non implémentés volontairement (choix « sans serveur »). Rappels
  actuels = tableau de bord + export `.ics`.

## Mémoire

Détails persistants aussi dans la mémoire Claude : `carnet-auto-project` (voir MEMORY.md).

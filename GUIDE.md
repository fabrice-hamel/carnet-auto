# Carnet Auto — Guide d'utilisation

Application de suivi d'entretien automobile (Volvo XC60 et autres véhicules).
100 % locale : **vos données restent sur votre téléphone**. Sauvegardes manuelles à déposer sur Google Drive.

---

## 1. Installer l'app sur votre téléphone (le plus simple)

L'app est une **PWA** : pas de Play Store, pas de compilation. Il faut juste l'héberger une
fois sur un lien `https`, puis « l'ajouter à l'écran d'accueil ».

### Option A — Mise en ligne gratuite par glisser-déposer (recommandé, sans compte)

1. Sur votre ordinateur, ouvrez le dossier **`dist`** (il contient l'app compilée).
2. Allez sur **https://app.netlify.com/drop** dans votre navigateur.
3. **Glissez-déposez le dossier `dist`** entier sur la page.
4. Netlify vous donne une adresse du type `https://nom-aleatoire.netlify.app` → c'est votre app.
   (Créez un compte gratuit si vous voulez garder l'adresse de façon permanente.)
5. Ouvrez cette adresse **sur votre téléphone** (Chrome).
6. Menu **⋮ → « Ajouter à l'écran d'accueil »**. L'icône Carnet Auto apparaît : c'est installé.
   L'app fonctionne ensuite **hors-ligne**.

### Option B — Tester immédiatement sur l'ordinateur

Voir la section « Pour le développeur » plus bas (`npm run dev`).

---

## 2. Premiers pas

1. **Véhicules → Ajouter** : créez votre XC60 (marque/modèle pré-remplis). Renseignez la
   **1ère immatriculation** (calcule automatiquement le contrôle technique) et le
   **kilométrage actuel**.
2. Cochez **« Pré-remplir le plan d'entretien type »** : les tâches XC60 (vidange, filtres,
   freins, distribution…) sont créées automatiquement — modifiables ensuite.
3. Quand une opération est faite, ouvrez la tâche → **« Fait »** (date, km, coût, garage).
   L'échéance suivante et le kilométrage se mettent à jour tout seuls.
4. Le **Tableau de bord** affiche tout ce qui est *en retard* (rouge) ou *bientôt* (orange).

## 3. Fonctions principales

- **Entretien** : échéances mixtes **kilométrage + temps** (la première atteinte déclenche l'alerte).
- **Contrôle technique (règles FR)** : 1ère visite à 4 ans, puis tous les 2 ans. Bouton
  « Validé » → reporte automatiquement à +2 ans.
- **Échéances** : assurance, vignette Crit'Air, garantie…
- **Carburant** : pleins, consommation moyenne (L/100 km ou kWh), coût au km.
- **Dépenses** : coût total par an et global (entretien + carburant + dépenses).
- **Documents** : photos de factures, carte grise, assurance, rapport de CT.
- **Calendrier** : bouton « Agenda » → fichier `.ics` à importer dans Google Agenda (rappels 14 j avant).
- **Multi-véhicules** : ajoutez autant de voitures que nécessaire.

## 4. Sauvegarde / changement de téléphone

Dans **Réglages → Sauvegarde** :

- **Exporter (complet)** : génère un fichier `.json` (avec photos). **Déposez-le dans votre
  Google Drive.** À faire régulièrement.
- **Léger (sans photos)** : fichier plus petit, sans les images.
- **Importer** : sur le nouveau téléphone, installez l'app puis importez ce fichier
  (choisissez « Remplacer »). Tout est restauré.

> ⚠️ Les données vivent dans le navigateur du téléphone. Pensez à exporter une sauvegarde
> avant de changer d'appareil ou de vider les données du navigateur.

---

## Pour le développeur (ou pour mettre à jour l'app)

Prérequis : Node.js 18+.

```bash
npm install        # installe les dépendances
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # génère le dossier dist/ (à héberger)
npm run preview    # prévisualise le build de production
```

> ⚠️ **Ne pas placer `node_modules` dans un dossier Google Drive synchronisé** : la synchro
> verrouille les fichiers et fait échouer `npm install`. Développez dans un dossier local
> (ex. `C:\Users\<vous>\carnet-auto`) et ne gardez sur le Drive que le **code source** et le
> dossier **`dist`** compilé.

### Pile technique
React + TypeScript + Vite · Tailwind CSS · Dexie (IndexedDB) · vite-plugin-pwa · date-fns.

### Sources des règles
- Contrôle technique FR : service-public.gouv.fr (F2878), ecologie.gouv.fr.
- Intervalles XC60 : valeurs indicatives, à ajuster selon la motorisation et le carnet Volvo.

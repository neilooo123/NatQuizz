# 🍂 NatQuizz

Une application pour téléphone et ordinateur : en balade, on photographie une plante ou un
animal, on note son nom vernaculaire et son nom latin, et l'espèce rejoint sa **base faune et
flore**. Ensuite, on révise avec des **quiz**.

👉 **https://neilooo123.github.io/NatQuizz/**

## Fonctionnalités

- **Observations** : photo (appareil photo ou galerie), date et position GPS remplies
  automatiquement, lieu, observateur.
- **Fiches espèces** : nom vernaculaire, nom latin, groupe (arbre, oiseau…) et toutes les
  observations de l'espèce. Tout est modifiable après coup.
- **Quiz à 3 niveaux** :
  - *Facile* : une photo, 4 noms proposés ;
  - *Moyen* : une photo, on écrit le nom vernaculaire ;
  - *Difficile* : une photo, on écrit le nom latin.

  Les petites fautes de frappe sont tolérées. On peut rejouer ses erreurs.
- **Quiz de vocabulaire nature** : on lit une définition et on retrouve le mot, parmi 4
  propositions (*Facile*) ou en l'écrivant (*Moyen*). Filtre par thème.
- **Partage** : un QR code (ou un lien) pour donner une fiche à quelqu'un. Le texte passe
  même sans réseau, la photo suit dès qu'il y en a.
- **Hors ligne** : l'appli fonctionne en pleine nature, sans réseau. Les données sont
  sauvegardées sur le cloud (Supabase) dès que le réseau revient, et retrouvées sur tous ses
  appareils.

## Installer l'appli sur son téléphone

- **Android (Chrome)** : ouvrir l'adresse ci-dessus, puis le bouton « Installer » de l'appli
  (ou menu ⋮ → « Installer l'application »).
- **iPhone (Safari)** : ouvrir l'adresse, bouton **Partager** → **« Sur l'écran d'accueil »**.
  Sur iPhone, scanner les QR codes **depuis l'appli** (bouton « Scanner une fiche »).
- **Ordinateur (Chrome, Edge)** : icône d'installation dans la barre d'adresse.

---

## Pour les développeurs

### Technologies

| Rôle | Outil |
|---|---|
| Langage | TypeScript + React, construit avec Vite |
| Hors ligne / installation | vite-plugin-pwa |
| Base locale | IndexedDB via Dexie.js |
| Cloud | Supabase (comptes, base Postgres, stockage des photos) |
| QR codes | `qrcode` (création), `barcode-detector` (lecture) |
| Tests | Vitest |

### Lancer le projet sur son ordinateur

Prérequis : [Node.js](https://nodejs.org) (version LTS).

```bash
npm install          # installe les dépendances (une seule fois)
npm run dev          # lance l'appli sur http://localhost:5173/NatQuizz/
npm test             # lance les tests
npm run build        # prépare la version publiée (dossier dist/)
```

Sans configuration Supabase, la page de connexion propose un **mode local** (uniquement en
développement) pour essayer l'appli sans compte.

### Configurer Supabase (une seule fois)

1. Sur [supabase.com](https://supabase.com), créer un nouveau projet (par ex. « natquizz »).
2. **SQL Editor** → *New query* → coller tout le contenu de [`supabase/schema.sql`](supabase/schema.sql)
   → *Run*. Cela crée les tables, les règles de sécurité et l'espace de stockage des photos.
3. **Authentication → URL Configuration** :
   - *Site URL* : `https://neilooo123.github.io/NatQuizz/`
   - *Redirect URLs* : ajouter `https://neilooo123.github.io/NatQuizz/**` et
     `http://localhost:5173/NatQuizz/**`
4. **Authentication → Sign In / Providers → Email** : le service d'email intégré de Supabase
   est très limité (peu d'emails par heure). Pour que tes proches puissent créer un compte sans
   email de confirmation, désactive **« Confirm email »**. (On pourra plus tard brancher un
   vrai service d'email.)
5. **Project Settings → API** : copier l'**URL du projet** et la **clé publishable** (ou
   « anon »). Ne jamais utiliser la clé `service_role` dans l'appli.
6. Les renseigner :
   - en local : copier `.env.example` en `.env.local` et remplir les deux valeurs ;
   - pour la version publiée : GitHub → *Settings → Secrets and variables → Actions →
     Variables* → créer `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY`, puis relancer le
     déploiement (onglet *Actions*).

> Un projet Supabase gratuit se met en pause après 7 jours sans activité. Les données sont
> conservées : il suffit de le réactiver depuis le tableau de bord Supabase. Pendant la pause,
> l'appli continue de fonctionner hors ligne.

### Modifier le vocabulaire

La liste du quiz de vocabulaire est le fichier [`src/vocab/vocabulaire.tsv`](src/vocab/vocabulaire.tsv) :
une ligne par mot, colonnes séparées par une **tabulation** : le mot, la définition, le ou les
thèmes séparés par « ; », puis la source (facultative). Le plus simple : copier les colonnes
depuis Excel ou Google Sheets et les coller dans ce fichier (le copier-coller depuis un tableur
met déjà des tabulations). Les tests vérifient que le fichier est lisible avant chaque publication.

### Organisation du code

```
src/
├─ auth/        connexion et compte
├─ components/  morceaux d'interface réutilisables
├─ db/          base locale (Dexie) : tables, lectures, écritures
├─ lib/         outils (Supabase, dates, installation…)
├─ location/    GPS
├─ pages/       un fichier par écran
├─ photos/      réduction des photos, lecture des données EXIF
├─ quiz/        tolérance aux fautes, génération des questions
├─ share/       liens de partage, QR codes
├─ styles/      thème (couleurs d'automne) et styles
├─ sync/        synchronisation avec Supabase
└─ vocab/       liste de vocabulaire (vocabulaire.tsv) et sa lecture
```

**Principe « local d'abord »** : l'appli lit et écrit toujours dans la base de l'appareil.
Chaque modification est marquée « à envoyer » ; la synchronisation (`src/sync/sync.ts`)
l'envoie à Supabase dès que possible, puis récupère ce qui a changé sur les autres appareils.

Le déploiement sur GitHub Pages est automatique à chaque `git push` sur `main`
(voir `.github/workflows/deploy.yml`).

# Caredify

Application web de **télésurveillance médicale** (tableaux de bord par rôle). Le dépôt est prévu pour évoluer vers une stack **MERN** (MongoDB, Express, React, Node).

## Structure actuelle

```
caredify/
├── frontend/client/
│   └── src/
│       ├── components/     # UI partagée (auth, layout, thème)
│       ├── constants/      # Données figées (ex. rôles)
│       ├── pages/          # Une route ≈ un dossier (PageName/PageName.jsx + .css)
│       └── assets/
└── README.md
```

Le dossier `backend/` sera ajouté lorsque l’API Express + MongoDB sera en place.

## Démarrer le frontend

```bash
cd frontend/client
npm install
npm run dev
```

Ouvrir l’URL indiquée dans le terminal (souvent `http://localhost:5173`).

## Parcours dans l’app

| Route | Écran |
|-------|--------|
| `/` | Choix du rôle (admin, médecin, clinique) |
| `/login` ou `/login/:role` | Connexion |
| `/register` | Inscription |
| `/otp` | Vérification OTP (mot de passe oublié) |
| `/admin`, `/cardiologue`, `/clinique` | Tableaux de bord (à enrichir) |

## Prochaines étapes (organisation)

1. **Frontend** : regrouper les composants réutilisables dans `frontend/client/src/components/`, les appels API dans `src/api/` ou `src/services/`.
2. **Backend** : créer `backend/` avec Express, variables dans `.env` (voir `.env.example`), et documenter les routes.
3. **Racine** : optionnel — `package.json` avec un script qui lance le front et l’API (ex. `concurrently`).

Les fichiers sensibles (`.env`) sont ignorés par Git ; ne commitez jamais de secrets.

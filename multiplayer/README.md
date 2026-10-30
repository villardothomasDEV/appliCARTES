# Multijoueur — Test (version indépendante)

La version actuelle sur un téléphone reste à la racine (`index.html`, `app.js`). Ses règles et sa sauvegarde ne changent pas. Elle comporte seulement un lien séparé « Multijoueur — Test ». Son site public existant n’est pas remplacé. Le multijoueur utilise `multiplayer/`, des API serveur et une sauvegarde de salon distincte.

## Lien de test

https://le-bus-multiplayer-test-villard.villardo-thomas.chatgpt.site/multiplayer/

L’hébergement confirme la publication publique du Worker avec D1. Les tests à trois navigateurs ont été réalisés contre le serveur local ; le filtre réseau de l’environnement de développement empêche de vérifier les appels API sur la nouvelle URL hébergée.

## Jouer

Un joueur crée un salon, partage le code de 6 caractères ou le lien d’invitation, choisit la longueur (3 à 20 cartes) et les checkpoints, puis lance la partie. Les autres rejoignent dans leur navigateur avec un pseudo distinct. Jusqu’à 12 joueurs ; aucun compte requis.

Tous voient la même autoroute et les gorgées communes. Seul le joueur actif peut révéler et prédire. Le serveur vérifie la clé du joueur, son tour et la phase ; désactiver les boutons côté client ne constitue pas la protection. Une réussite avance, une erreur remplace la carte puis revient après le checkpoint acquis, ou au départ. La carte tirée remplace aussi celle du bus en cas de réussite. L’As est fort. L’échec coûte la distance inclusive depuis le dernier checkpoint acquis ou le départ. Le joueur suivant reprend automatiquement, en boucle.

Le résultat reste visible environ 2,8 secondes avant la transmission de la main. Les mises à jour des autres téléphones arrivent automatiquement, normalement en moins d’une seconde : requêtes HTTP régulières authentifiées, sans dépendance à une connexion WebSocket. Une reconnexion relit l’état autoritaire complet.

## Reprise et déconnexion

La clé de reprise est enregistrée **sur le navigateur du joueur**, jamais dans l’invitation. Une actualisation ou une coupure conserve sa place. Ne supprimez pas le stockage local. Le mode privé ou un autre navigateur ne retrouve pas la place ; aucun compte ne permet de récupérer une clé perdue. Une même clé ouverte sur plusieurs onglets désigne le même joueur, sans permettre de doubler une action.

Après 30 secondes sans contact, un joueur est marqué hors ligne et son tour est passé automatiquement, sans tirage ni gorgée. Les joueurs connectés continuent. Un joueur qui revient retrouve son siège dans l’ordre de rotation. Le créateur déconnecté est remplacé par un joueur connecté, y compris dans le lobby. Si tout le monde est déconnecté, le salon attend un retour. Les onglets en arrière-plan peuvent être considérés hors ligne par le navigateur : gardez le jeu ouvert.

Les salons expirent après 24 heures. L’identité des joueurs, le paquet, les cartes cachées et les tours restent côté serveur. Les réponses n’exposent ni la pioche, ni les cartes cachées, ni les clés des autres joueurs. Une limitation de créations et de tentatives de connexion réduit les abus du service de test.

## Lancer le serveur local

Node.js **24+**, aucune dépendance à installer :

    node multiplayer/server/node.mjs

Ouvrez `http://127.0.0.1:8080/multiplayer/` dans plusieurs navigateurs ou profils indépendants. Le serveur sert aussi la version actuelle à `/index.html`.

Pour des téléphones sur le même Wi-Fi :

    BUS_HOST=0.0.0.0 node multiplayer/server/node.mjs

Puis ouvrez `http://IP-DE-L-ORDINATEUR:8080/multiplayer/`. Sous PowerShell, définissez d’abord `$env:BUS_HOST="0.0.0.0"`. Le serveur local HTTP sert au développement ; l’hébergement public doit fournir HTTPS.

Variables : `PORT` (8080), `BUS_HOST` (127.0.0.1), `BUS_DB` (`work/multiplayer.sqlite`). Le fichier SQLite doit être conservé. Les migrations sont appliquées au démarrage local, jamais dans les requêtes. Les tables contiennent les clés hachées et les états de salon ; le serveur de fichiers ne peut pas les servir.

## Hébergement

Un hébergement purement statique ne suffit pas. Deux options :

- **Node.js 24+ sur une instance avec volume persistant** : lancez la commande ci-dessus derrière un proxy HTTPS. Gardez le fichier SQLite sur le volume. `multiplayer/Dockerfile` prépare un conteneur (contexte de build : racine du dépôt) avec le volume `/data`. N’utilisez pas plusieurs instances indépendantes avec chacune sa propre base.
- **Cloudflare Worker + D1** : `node multiplayer/build.mjs` construit un Worker ESM sans dépendance, avec les ressources publiques embarquées, dans `multiplayer/.output/`. Le binding `DB` et les migrations SQL avec leur journal dans `multiplayer/drizzle/` sont nécessaires avant d’accepter des salons. Le build les place à la racine de l’archive, à côté de `dist/server/` et de `.openai/hosting.json`, pour que Sites les applique avant de publier le Worker. Les écritures sont conditionnelles à la version de ligne pour éviter les courses entre plusieurs Workers.

`multiplayer/hosting.json` identifie exclusivement le projet Sites de test et son binding `DB`. Le manifeste `.openai/hosting.json` à la racine continue d’identifier la version statique actuelle. Ne remplacez pas l’un par l’autre lors d’une publication.

Le Worker doit être public (sans connexion ChatGPT) pour que le lien d’invitation fonctionne. Les migrations restent versionnées et immuables. Pour une évolution du schéma, lancez `npm ci --prefix multiplayer`, puis `npm run --prefix multiplayer db:generate` après modification de `multiplayer/db/schema.mjs`. Ces dépendances servent uniquement à la génération du schéma ; le jeu et son serveur ne dépendent pas de Drizzle à l’exécution. La migration SQL historique dans `multiplayer/migrations/` reste utilisée pour initialiser le serveur Node local. Le serveur refuse les actions d’un tour ancien et mémorise les identifiants de requête récents : réessayer la même tentative ne retire pas une seconde carte. Les mises à jour atomiques de la base protègent aussi contre deux requêtes distinctes simultanées.

## Vérifier

    node test.cjs
    node multiplayer/build.mjs
    node multiplayer/test/artifact.mjs
    node --test --test-isolation=none multiplayer/test/server.test.mjs

Les tests du serveur couvrent le lobby, les cartes masquées, les restrictions hors tour, les actions concurrentes et répétées, la rotation à 2/3/5 joueurs, les pénalités, les checkpoints, les déconnexions, la reprise, la persistance après redémarrage, les limites et le contrat D1.

Avec le serveur local actif et Chromium lancé avec `--remote-debugging-port=9222` (profil temporaire), Node.js 24 :

    node multiplayer/test/browser.cjs

Ce test ouvre trois contextes de navigateur indépendants en 320, 360 et 390 px. Il crée/rejoint un salon, joue trois tentatives, compare les états, essaie une action hors tour par l’API, vérifie le blocage des commandes, l’actualisation et une coupure temporaire. `BUS_MP_QA_URL` change l’origine ; `BUS_QA_SCREENSHOTS` active les captures. Les vérifications mobiles sont en émulation, pas sur trois téléphones physiques.

Le test `multiplayer/test/artifact.mjs` applique les migrations exportées dans une base vide avant de tester la création de salon, afin de détecter une archive privée de schéma ou de journal de migration.

# Le Bus — une équipe, une autoroute

Application en français, adaptée au téléphone, sans dépendance ni compte. Le logo violet et la police Jobbeurs sont inclus dans `assets/`.

## Lancer en local
Téléchargez les sources du dépôt (Code → Download ZIP), décompressez le dossier entier et ouvrez **index.html** dans votre navigateur. Aucun accès Internet ni installation nécessaire pour jouer. Gardez les fichiers et `assets/` ensemble.

Pour jouer sur téléphone depuis votre ordinateur, avec Python 3 installé :

    python -m http.server 8000 --bind 0.0.0.0

Sur le même Wi-Fi, ouvrez `http://ADRESSE-IP-DE-L-ORDINATEUR:8000` sur le téléphone. L’adresse IP figure dans les paramètres réseau de l’ordinateur. Autorisez le serveur sur le réseau privé si le pare-feu le demande. Arrêtez le serveur avec Ctrl+C.

## Jouer
1. Inscrivez 1 à 12 joueurs, choisissez 3 à 20 cartes et les checkpoints. Tous les joueurs forment une équipe : autoroute, score et checkpoints sont communs.
2. Le joueur indiqué touche la carte active sur le parcours autour du panneau central. Elle se retourne si elle est cachée. Si elle est déjà visible, la fenêtre de choix s’ouvre directement.
3. Choisissez **Plus ↑**, **Moins ↓** ou **Égal =**. La référence reste visible dans la fenêtre. Le tirage du croupier est automatique, sans second clic. L’As est le plus fort : 2 … 10, Valet, Dame, Roi, As.
4. Après le résultat, la carte tirée remplace **toujours** la carte du bus à cette étape. Seule l’ancienne carte est défaussée. La nouvelle valeur sert aux prochains passages.
5. En cas de succès, l’équipe avance et acquiert le checkpoint éventuellement franchi. En cas d’échec, elle prend autant de points que de cartes depuis le dernier checkpoint acquis (ou le départ), carte ratée incluse : première carte = +1, troisième = +3. Elle revient après ce checkpoint, ou au départ. Les checkpoints acquis restent acquis.
6. Le tour passe automatiquement au joueur suivant, après un succès comme après un échec. Le parcours et le score restent communs. En solo, le même joueur continue. L’équipe termine ensemble et peut rejouer pour améliorer son score.

Les cartes sont disposées dans le sens des aiguilles d’une montre. Les numéros indiquent l’ordre ; départ, arrivée, checkpoints et carte active portent des repères distincts. Sur petit écran, le panneau se resserre et la page défile verticalement pour conserver des cartes lisibles et cliquables.

Les actions sont bloquées pendant les tirages et animations. Le réglage de réduction des mouvements de l’appareil est respecté. Une pause de lecture du résultat subsiste. Quand la pioche est vide, seule la défausse est remélangée.

## Sauvegarde
La partie d’équipe est sauvegardée dans le navigateur, pour la même adresse. Le mode privé ou les restrictions du navigateur peuvent empêcher le stockage. Une actualisation pendant un résultat le termine sans retirer de carte ni transmettre la main deux fois. Les anciennes parties individuelles ne sont pas reprises : leurs noms et paramètres sont récupérés pour un nouveau voyage en équipe.

## Vérifications
Avec Node.js :

    node test.cjs

Les 14 tests couvrent les règles, les pénalités, le remplacement systématique, les checkpoints partagés, la rotation après succès et échec, le solo, l’arrivée commune et la reprise d’un résultat. Ils contrôlent aussi le parcours autour du centre pour toutes les longueurs, et simulent 100 parties avec conservation des 52 cartes uniques.

Pour reproduire les vérifications dans Chromium (Node.js 22+), démarrez le serveur local et un Chromium de test avec `--remote-debugging-port=9222` et un profil temporaire, puis :

    node browser-test.cjs

`BUS_QA_URL` permet de changer l’adresse locale ; `BUS_QA_SCREENSHOTS` indique un dossier facultatif de captures. Ce test utilise l’interface DevTools locale de Chromium. Il vérifie le tactile en émulation mobile, la fenêtre de choix, le tirage automatique, les doubles clics, le score d’équipe, les checkpoints, le rechargement, l’arrivée, le rejeu et la réduction des mouvements. Il contrôle aussi l’absence de débordement horizontal et de chevauchement du panneau pour 15 combinaisons : 320, 360, 390, 650 et 1024 px, avec 3, 8 et 20 cartes. Cela ne remplace pas un essai sur un téléphone physique.

## Identité visuelle
La police Jobbeurs fournie est conservée sans modification. Le logo SVG existant est une reprise vectorielle du visuel joint dans la conversation, et non le fichier original.

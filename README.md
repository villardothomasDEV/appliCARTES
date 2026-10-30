# Le Bus — version locale

## Lancer sur ordinateur
Décompressez le dossier entier, puis double-cliquez sur **index.html**. Aucun compte, aucune installation, aucun accès Internet ne sont nécessaires. Conservez les fichiers et le dossier assets ensemble.

## Jouer sur téléphone
Le plus simple est de servir ce dossier depuis votre ordinateur. Avec Python 3 installé, ouvrez un terminal dans le dossier et lancez :

    python -m http.server 8000 --bind 0.0.0.0

Sur le même réseau Wi-Fi, ouvrez http://ADRESSE-IP-DE-L-ORDINATEUR:8000 sur le téléphone. Trouvez cette adresse dans les paramètres réseau de l’ordinateur. Autorisez le serveur sur votre réseau privé si le pare-feu le demande. Arrêtez-le avec Ctrl+C.

Les joueurs et le croupier utilisent le même écran. Configurez les noms, la longueur (3 à 20 cartes) et les checkpoints. Révélez, choisissez un pronostic, puis laissez le croupier tirer. Chacun termine son passage avant le suivant. Le score le plus faible gagne ; les égalités sont conservées.

La sauvegarde est locale au navigateur et à son adresse. Le mode privé ou les restrictions du navigateur peuvent empêcher son stockage. Une nouvelle partie remet les scores à zéro.

## Règles de cette version
Lors d’un échec, la pénalité est le nombre de cartes entre le dernier checkpoint acquis (ou le départ) et l’étape ratée, carte ratée incluse. Première carte après le checkpoint : +1 point ; troisième : +3 points. Le joueur revient après ce checkpoint, qui reste acquis. Une erreur sur un checkpoint non encore franchi ne le sécurise pas.

Après **chaque** tirage, réussi ou raté, la carte tirée remplace celle du bus à l’étape jouée. Seule l’ancienne carte est défaussée. La nouvelle valeur sert lors des prochains passages. L’As reste la carte la plus forte.

Les retournements, remplacements, déplacements et checkpoints sont animés. Le réglage « Réduire les animations » de l’appareil supprime ces mouvements. Les actions de jeu sont bloquées pendant les animations pour éviter les doubles tirages.

Les sauvegardes des anciennes règles ne sont pas reprises : leurs scores ne sont pas comparables. Les noms et le trajet précédents sont récupérés pour commencer une nouvelle partie. Les nouvelles parties sont sauvegardées séparément.

## Vérification
Avec Node.js, exécutez `node test.cjs`. Les 10 tests couvrent toutes les comparaisons de valeurs, les pénalités inclusives depuis le départ et les checkpoints, le remplacement sur succès et échec, la réutilisation des nouvelles valeurs, la persistance des checkpoints, l’arrivée et la reprise d’une sauvegarde. Une simulation reproductible de 100 parties vérifie à chaque tirage les points et la conservation des 52 cartes uniques, y compris après recyclage de la défausse. Les animations n’ont pas pu être vérifiées dans un navigateur dans l’environnement de développement.

## Identité visuelle
La police Jobbeurs fournie est incluse sans modification. Le logo SVG est une reprise vectorielle du visuel affiché dans la conversation : ce n’est pas le fichier original. Pour utiliser le logo exact, remplacez assets/logo.svg par votre original SVG, ou adaptez la référence dans index.html pour un PNG.

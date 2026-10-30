# Le Bus — version locale

## Lancer sur ordinateur
Décompressez le dossier entier, puis double-cliquez sur **index.html**. Aucun compte, aucune installation, aucun accès Internet ne sont nécessaires. Conservez les fichiers et le dossier assets ensemble.

## Jouer sur téléphone
Le plus simple est de servir ce dossier depuis votre ordinateur. Avec Python 3 installé, ouvrez un terminal dans le dossier et lancez :

    python -m http.server 8000 --bind 0.0.0.0

Sur le même réseau Wi-Fi, ouvrez http://ADRESSE-IP-DE-L-ORDINATEUR:8000 sur le téléphone. Trouvez cette adresse dans les paramètres réseau de l’ordinateur. Autorisez le serveur sur votre réseau privé si le pare-feu le demande. Arrêtez-le avec Ctrl+C.

Les joueurs et le croupier utilisent le même écran. Configurez les noms, la longueur (3 à 20 cartes) et les checkpoints. Révélez, choisissez un pronostic, puis laissez le croupier tirer. Chacun termine son passage avant le suivant. Le score le plus faible gagne ; les égalités sont conservées.

La sauvegarde est locale au navigateur et à son adresse. Le mode privé ou les restrictions du navigateur peuvent empêcher son stockage. Une nouvelle partie remet les scores à zéro.

## Vérification
Avec Node.js, exécutez `node test.cjs`. Les tests vérifient les comparaisons, l’As fort, les erreurs, le remplacement, les checkpoints, la fin de parcours, le blocage des doubles tirages et le recyclage de la défausse. Une simulation de 100 parties contrôle l’unicité et le total des 52 cartes.

## Identité visuelle
La police Jobbeurs fournie est incluse sans modification. Le logo SVG est une reprise vectorielle du visuel affiché dans la conversation : ce n’est pas le fichier original. Pour utiliser le logo exact, remplacez assets/logo.svg par votre original SVG, ou adaptez la référence dans index.html pour un PNG.

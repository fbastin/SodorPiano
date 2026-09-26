# Sodor Piano Studio

Un piano de 88 touches dans le navigateur, avec un piano à queue échantillonné, plusieurs autres sons, et la lecture des partitions MusicXML et MuseScore. Le son **Sodor Grand** joue des enregistrements d'un vrai piano à queue ; les autres sons sont synthétisés en temps réel par la Web Audio API.

La documentation technique (installation, déploiement, tests, intégration) est en anglais, dans [README.md](README.md).

## Fonctionnalités

- Clavier complet de 88 touches (du la0 au do8)
- 6 sons : Sodor Grand, Electric Whistle, Tidmouth Synth, Vicarstown Organ, Steam Whistle, Station Bell
- Sodor Grand joue 30 notes enregistrées × 3 niveaux de nuance, tirées de la bibliothèque Salamander Grand Piano, avec sensibilité au toucher, des étouffoirs qui retombent au relâchement de la touche (les cordes les plus aiguës n'en ont pas, comme sur un vrai piano à queue), la résonance sympathique et une légère réverbération de salle
- Import et lecture automatique des partitions : MusicXML (`.musicxml`, `.xml`), MusicXML compressé (`.mxl`) et fichiers MuseScore 2, 3 et 4 (`.mscz`, `.mscx`)
- Les reprises (y compris imbriquées), les premières et secondes fins et les sauts (D.C., D.S., al Fine, al Coda, sauts de section) sont joués comme dans MuseScore ; les changements de tempo s'appliquent à toutes les portées
- Les partitions sont jouées avec leurs nuances et leurs soufflets (crescendo, decrescendo), leurs accents, staccatos et tenutos, et la pédale ; les notes sont programmées sur l'horloge audio, si bien que les accords sonnent ensemble et que le tempo ne dérive jamais
- Au-dessus du clavier, la partition défile pendant la lecture : soit une portée simplifiée (notes placées selon le temps, qui montre aussi les notes jouées à la main), soit la partition complète, gravée par OpenSheetMusicDisplay (chargée à la demande ; les fichiers MuseScore sont convertis en MusicXML pour elle). Elle peut être masquée sur les petits écrans
- Une partition peut s'ouvrir depuis un lien : `index.html?score=/chemin/vers/morceau.mscz` la charge, prête à jouer (fichiers du même site uniquement)
- Réglages du volume, du tempo (de 0,25× à 2×) et de la pédale ; une touche frappée près de son bord sonne plus fort qu'une touche effleurée en haut
- Jeu à la souris et au toucher

## Licence

Le code de l'application est sous licence MIT. Les échantillons de Sodor Grand sont le Salamander Grand Piano d'Alessandro Iafrati (CC-BY-3.0). Les bibliothèques incluses dans la vue de la partition complète gardent leurs propres licences (BSD-3-Clause et MIT) : voir [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

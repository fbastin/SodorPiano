<?php
include '../header.php';

// Cette page travaille directement avec le clone du dépôt GitHub
// (https://github.com/fbastin/SodorPiano) présent dans ce répertoire.
// La présentation (résumé, fonctionnalités) est extraite du README du clone ;
// un « git pull » suffit pour la mettre à jour. L'application elle-même est
// servie en plein écran par index.html.

$repoDir = __DIR__;

// Lien vers le dépôt distant, déduit de la configuration du clone.
$repoUrl = 'https://github.com/fbastin/SodorPiano';
$gitConfig = $repoDir . '/.git/config';
if (is_readable($gitConfig)) {
    $cfg = file_get_contents($gitConfig);
    if (preg_match('#url\s*=\s*(\S+)#', $cfg, $m)) {
        $repoUrl = preg_replace('#\.git$#', '', trim($m[1]));
    }
}

// Extraction de contenu depuis le README du clone.
$intro = '';
$features = array();
$readme = $repoDir . '/README.md';
if (is_readable($readme)) {
    $lines = file($readme, FILE_IGNORE_NEW_LINES);
    $section = '';
    foreach ($lines as $line) {
        if (preg_match('/^#{1,6}\s*(.+)$/', $line, $m)) {
            $section = strtolower(trim($m[1]));
            continue;
        }
        $trim = trim($line);
        if ($intro === '' && $section === '' && $trim !== '') {
            $intro = $trim; // premier paragraphe sous le titre
        }
        if ($section === 'features' && preg_match('/^[-*]\s+(.+)$/', $trim, $m)) {
            $features[] = trim($m[1]);
        }
    }
}
if ($intro === '') {
    $intro = "Un synthétiseur de piano 88 touches dans le navigateur, "
           . "avec modélisation sonore en temps réel via la Web Audio API.";
}
?>

<h1>Sodor Piano Studio</h1>

<p><?= htmlspecialchars($intro) ?></p>

<p>
<a class="button" href="index.html">Lancer l'application &rarr;</a>
</p>

<?php if (!empty($features)): ?>
<h2>Fonctionnalités</h2>
<ul>
<?php foreach ($features as $feature): ?>
    <li><?= htmlspecialchars($feature) ?></li>
<?php endforeach; ?>
</ul>
<?php endif; ?>

<p>
Le code source est maintenu dans le dépôt
<a href="<?= htmlspecialchars($repoUrl) ?>"><?= htmlspecialchars($repoUrl) ?></a>,
dont cette page reflète directement le contenu.
</p>

<?php
include '../footer.php';
?>

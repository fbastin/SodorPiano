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

// Extraction de contenu depuis le README du clone : README.fr.md pour la page
// en français, README.md sinon. Chaque langue a son README dans le dépôt, si
// bien qu'aucune traduction n'est à tenir à jour ici.
$en = $lang === 'en';
$intro = '';
$features = array();
$readme = $repoDir . '/README.md';
if (!$en && is_readable($repoDir . '/README.fr.md')) {
    $readme = $repoDir . '/README.fr.md';
}
if (is_readable($readme)) {
    $lines = file($readme, FILE_IGNORE_NEW_LINES);
    $section = '';
    foreach ($lines as $line) {
        // Le titre principal (#) ouvre l'introduction ; les suivants, les sections.
        if (preg_match('/^(#{1,6})\s*(.+)$/', $line, $m)) {
            $section = strlen($m[1]) === 1 ? '' : mb_strtolower(trim($m[2]));
            continue;
        }
        $trim = trim($line);
        if ($intro === '' && $section === '' && $trim !== '') {
            $intro = $trim; // premier paragraphe sous le titre
        }
        if (in_array($section, array('features', 'fonctionnalités'), true)
            && preg_match('/^[-*]\s+(.+)$/', $trim, $m)) {
            $features[] = trim($m[1]);
        }
    }
}
if ($intro === '') {
    $intro = $en
        ? 'A browser-based 88-key piano, with a sampled grand piano and score playback.'
        : 'Un piano de 88 touches dans le navigateur, avec un piano à queue échantillonné et la lecture de partitions.';
}

// Le Markdown en ligne du README : code, gras et liens. Le texte est
// échappé d'abord ; les liens relatifs visent le dépôt sur GitHub.
function markdown_inline($text, $repoUrl) {
    $html = htmlspecialchars($text);
    $html = preg_replace('/`([^`]+)`/', '<code>$1</code>', $html);
    $html = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $html);
    return preg_replace_callback('/\[([^\]]+)\]\(([^)\s]+)\)/', function ($m) use ($repoUrl) {
        $url = preg_match('#^https?://#', $m[2]) ? $m[2] : $repoUrl . '/blob/main/' . $m[2];
        return '<a href="' . $url . '">' . $m[1] . '</a>';
    }, $html);
}
?>

<h1>Sodor Piano Studio</h1>

<p><?= markdown_inline($intro, $repoUrl) ?></p>

<p>
<a class="button" href="index.html"><?= $en ? 'Open the piano' : 'Lancer l\'application' ?> &rarr;</a>
</p>

<?php if (!empty($features)): ?>
<h2><?= $en ? 'Features' : 'Fonctionnalités' ?></h2>
<ul>
<?php foreach ($features as $feature): ?>
    <li><?= markdown_inline($feature, $repoUrl) ?></li>
<?php endforeach; ?>
</ul>
<?php endif; ?>

<p>
<?php if ($en): ?>
The source code is kept in the repository
<a href="<?= htmlspecialchars($repoUrl) ?>"><?= htmlspecialchars($repoUrl) ?></a>,
which this page mirrors directly.
<?php else: ?>
Le code source est maintenu dans le dépôt
<a href="<?= htmlspecialchars($repoUrl) ?>"><?= htmlspecialchars($repoUrl) ?></a>,
dont cette page reflète directement le contenu.
<?php endif; ?>
</p>

<?php
include '../footer.php';
?>

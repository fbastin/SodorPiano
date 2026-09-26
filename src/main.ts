import { SodorPiano } from './ui/piano-vanilla';
import { scoreFromQuery } from './core/score-url';

const container = document.getElementById('piano-container');
if (container) {
    const piano = new SodorPiano(container);

    // A score named in the address (?score=…) is loaded, ready to play.
    const score = scoreFromQuery(location.search, location.origin);
    if (score) {
        fetch(score)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.blob();
            })
            .then(blob => piano.loadScoreFile(blob))
            .catch(err => alert(`Cannot open the score ${score}: ${err instanceof Error ? err.message : err}`));
    }
}

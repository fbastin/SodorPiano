import { SodorPiano } from './ui/piano-vanilla';

const container = document.getElementById('piano-container');
if (container) {
    new SodorPiano(container);
}

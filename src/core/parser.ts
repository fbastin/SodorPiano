import { MusicNote, MusicScore } from '../types';

export const parseMusicXml = (xmlString: string): MusicScore => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const notes: MusicNote[] = [];
  const title = xmlDoc.querySelector('work-title')?.textContent ||
                xmlDoc.querySelector('movement-title')?.textContent ||
                'Imported Melody';

  let tempo = 120;
  const tempoEl = xmlDoc.querySelector('sound[tempo]');
  if (tempoEl) {
    tempo = parseFloat(tempoEl.getAttribute('tempo') || '120');
  }
  const secondsPerBeat = 60 / tempo;

  const stepMap: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };

  const measures = xmlDoc.querySelectorAll('measure');
  let currentTime = 0;
  let divisions = 1;

  measures.forEach((measure) => {
    const measureDivisions = measure.querySelector('divisions');
    if (measureDivisions) {
      divisions = parseInt(measureDivisions.textContent || '1', 10);
    }

    const measureNotes = measure.querySelectorAll('note');
    let measureTime = 0;

    measureNotes.forEach((note) => {
      const isRest = note.querySelector('rest') !== null;
      const duration = parseInt(note.querySelector('duration')?.textContent || '0', 10);
      const step = note.querySelector('pitch step')?.textContent;
      const octave = parseInt(note.querySelector('pitch octave')?.textContent || '4', 10);
      const alter = parseInt(note.querySelector('pitch alter')?.textContent || '0', 10);
      const tieStop = note.querySelector('tie[type="stop"]') !== null;

      if (!isRest && step) {
        const keyIndex = (octave * 12) + stepMap[step] + alter - 9;
        const noteDuration = (duration / divisions) * secondsPerBeat * 0.8;

        if (keyIndex >= 0 && keyIndex < 88) {
          if (tieStop) {
            const tiedNote = [...notes].reverse().find(n => n.keyIndex === keyIndex);
            if (tiedNote) {
              tiedNote.duration = (tiedNote.duration || 0) + noteDuration;
            }
          } else {
            notes.push({
              keyIndex,
              time: (currentTime + (measureTime / divisions)) * secondsPerBeat,
              duration: noteDuration
            });
          }
        }
      }

      if (note.querySelector('chord') === null) {
        measureTime += duration;
      }
    });

    currentTime += (measureTime / divisions);
  });

  return {
    id: `imported-${Date.now()}`,
    title,
    thumbnail: '🎼',
    notes: notes.sort((a, b) => a.time - b.time)
  };
};

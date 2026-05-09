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
  let secondsPerBeat = 60 / tempo;

  const stepMap: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };

  const parts = xmlDoc.querySelectorAll('part');

  parts.forEach((part) => {
    let currentTimeSeconds = 0;
    let divisions = 1;

    const measures = part.querySelectorAll('measure');

    measures.forEach((measure) => {
      let measureTime = 0;
      let maxMeasureTime = 0;

      for (const child of Array.from(measure.children)) {
        if (child.tagName === 'attributes') {
          const div = child.querySelector('divisions');
          if (div) {
            divisions = parseInt(div.textContent || '1', 10);
          }
        } else if (child.tagName === 'direction') {
          const sound = child.querySelector('sound[tempo]');
          if (sound) {
            secondsPerBeat = 60 / parseFloat(sound.getAttribute('tempo') || '120');
          }
        } else if (child.tagName === 'sound') {
          const tempoAttr = child.getAttribute('tempo');
          if (tempoAttr) {
            secondsPerBeat = 60 / parseFloat(tempoAttr);
          }
        } else if (child.tagName === 'forward') {
          const dur = parseInt(child.querySelector('duration')?.textContent || '0', 10);
          measureTime += dur;
          maxMeasureTime = Math.max(maxMeasureTime, measureTime);
        } else if (child.tagName === 'backup') {
          const dur = parseInt(child.querySelector('duration')?.textContent || '0', 10);
          measureTime -= dur;
        } else if (child.tagName === 'note') {
          const isRest = child.querySelector('rest') !== null;
          const isChord = child.querySelector('chord') !== null;
          const duration = parseInt(child.querySelector('duration')?.textContent || '0', 10);
          const step = child.querySelector('pitch > step')?.textContent;
          const octave = parseInt(child.querySelector('pitch > octave')?.textContent || '4', 10);
          const alter = parseInt(child.querySelector('pitch > alter')?.textContent || '0', 10);
          const tieStop = child.querySelector('tie[type="stop"]') !== null;

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
                  time: currentTimeSeconds + (measureTime / divisions) * secondsPerBeat,
                  duration: noteDuration
                });
              }
            }
          }

          if (!isChord) {
            measureTime += duration;
            maxMeasureTime = Math.max(maxMeasureTime, measureTime);
          }
        }
      }

      currentTimeSeconds += (maxMeasureTime / divisions) * secondsPerBeat;
    });
  });

  return {
    id: `imported-${Date.now()}`,
    title,
    thumbnail: '🎼',
    notes: notes.sort((a, b) => a.time - b.time)
  };
};

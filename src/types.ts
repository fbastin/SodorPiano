export type SoundType = 'grand' | 'electric' | 'synth' | 'organ' | 'whistle' | 'bell';

export interface MusicNote {
  keyIndex: number;
  time: number; // in seconds
  duration?: number; // seconds until the damper falls: key release, or later with the pedal
  hold?: number;     // seconds the key is held down, as written
  velocity?: number; // 0–1
  // Spelling, for display: letter 0–6 (C to B) and alteration in semitones.
  // Without it, black keys are shown as sharps.
  letter?: number;
  alter?: number;
}

export interface MusicScore {
  id: string;
  title: string;
  thumbnail: string;
  notes: MusicNote[];
  measures?: number[]; // start of each measure played, in seconds
  measureOrder?: number[]; // for each measure played, its index in the score
  // The file the score was read from, for the engraved notation display.
  source?: { format: 'musicxml' | 'mscx'; text: string };
}

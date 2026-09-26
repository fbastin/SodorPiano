export type SoundType = 'grand' | 'electric' | 'synth' | 'organ' | 'whistle' | 'bell';

export interface MusicNote {
  keyIndex: number;
  time: number; // in seconds
  duration?: number; // seconds until the key is released (the pedal may sustain it further)
  velocity?: number; // 0–1
}

export interface MusicScore {
  id: string;
  title: string;
  thumbnail: string;
  notes: MusicNote[];
}

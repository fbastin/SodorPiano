export type SoundType = 'grand' | 'electric' | 'synth' | 'organ' | 'whistle' | 'bell';

export interface MusicNote {
  keyIndex: number;
  time: number; // in seconds
  duration?: number;
}

export interface MusicScore {
  id: string;
  title: string;
  thumbnail: string;
  notes: MusicNote[];
}

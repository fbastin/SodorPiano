import { SoundType, MusicNote } from '../types';

export interface SoundPreset {
  name: string;
  oscTypes: OscillatorType[];
  gains: number[];
  detune?: number[];
  decayRates?: number[];
  hammerNoise?: number;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterEndFreq?: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export const SOUND_PRESETS: Record<SoundType, SoundPreset> = {
  grand: {
    name: 'Sodor Grand',
    oscTypes: ['sine', 'sine', 'sine', 'sine', 'sine', 'sine', 'sine'],
    gains: [0.35, 0.20, 0.14, 0.09, 0.06, 0.04, 0.025],
    detune: [0, 1200, 1904, 2404, 2791, 3110, 3379],
    decayRates: [1.0, 1.4, 2.0, 2.8, 3.8, 5.0, 6.5],
    hammerNoise: 0.08,
    filterType: 'lowpass',
    filterFreq: 5000,
    filterEndFreq: 1000,
    attack: 0.003,
    decay: 2.5,
    sustain: 0.008,
    release: 0.6
  },
  electric: {
    name: 'Electric Whistle',
    oscTypes: ['sine', 'triangle'],
    gains: [0.4, 0.4],
    detune: [0, 1200],
    attack: 0.01,
    decay: 1.0,
    sustain: 0.3,
    release: 0.5
  },
  synth: {
    name: 'Tidmouth Synth',
    oscTypes: ['sawtooth', 'square'],
    gains: [0.3, 0.2],
    detune: [0, 5],
    filterType: 'lowpass',
    filterFreq: 1200,
    filterEndFreq: 400,
    attack: 0.1,
    decay: 0.5,
    sustain: 0.5,
    release: 1.2
  },
  organ: {
    name: 'Vicarstown Organ',
    oscTypes: ['sine', 'sine', 'sine'],
    gains: [0.4, 0.2, 0.2],
    detune: [0, 1200, 1900],
    attack: 0.05,
    decay: 0.1,
    sustain: 1.0,
    release: 0.8
  },
  whistle: {
    name: 'Steam Whistle',
    oscTypes: ['sine', 'triangle'],
    gains: [0.4, 0.4],
    detune: [0, 2],
    filterType: 'highpass',
    filterFreq: 800,
    attack: 0.2,
    decay: 0.3,
    sustain: 0.7,
    release: 0.5
  },
  bell: {
    name: 'Station Bell',
    oscTypes: ['sine', 'sine', 'triangle'],
    gains: [0.4, 0.3, 0.2],
    detune: [0, 1200, 2400],
    attack: 0.002,
    decay: 2.0,
    sustain: 0.01,
    release: 2.0
  }
};

interface ActiveVoice {
  keyIndex: number;
  gainNode: GainNode;
  stopTime: number;
  oscillators: OscillatorNode[];
  sources: AudioBufferSourceNode[];
}

export class PianoAudio {
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private _volume = 0.8;
  private activeVoices: ActiveVoice[] = [];
  private readonly maxPolyphony = 32;
  private _pedalDown = false;
  private resonanceInput: GainNode | null = null;
  private resonanceOutput: GainNode | null = null;
  private resonanceFeed: GainNode | null = null;
  private resonators: BiquadFilterNode[] = [];
  private readonly RES_FREQS = [55, 65.41, 77.78, 92.5, 110, 130.81, 155.56, 185, 220, 261.63, 311.13, 369.99, 440, 523.25, 622.25, 740, 880, 1046.5, 1244.5, 1480, 1760, 2093, 2489, 2960, 3520, 4186];
  private sampleCache = new Map<string, AudioBuffer>();
  private sampleLoads = new Map<string, Promise<AudioBuffer>>();

  // Salamander Grand Piano (CC-BY 3.0 by Alessandro Iafrati, via archive.org).
  // 30 recorded notes (A0, C1, ... every 3rd semitone) × 3 velocity layers
  // (p/m/f). Each of the 88 keys picks the nearest recorded note and pitches it
  // by at most ±1 semitone (playbackRate), which is inaudible.
  private static readonly GRAND_SAMPLE_MAP: { note: string; rate: number }[] = [
    { note: "A0", rate: 1.0 }, { note: "A0", rate: 1.059463 }, { note: "C1", rate: 0.943874 },
    { note: "C1", rate: 1.0 }, { note: "C1", rate: 1.059463 }, { note: "D#1", rate: 0.943874 },
    { note: "D#1", rate: 1.0 }, { note: "D#1", rate: 1.059463 }, { note: "F#1", rate: 0.943874 },
    { note: "F#1", rate: 1.0 }, { note: "F#1", rate: 1.059463 }, { note: "A1", rate: 0.943874 },
    { note: "A1", rate: 1.0 }, { note: "A1", rate: 1.059463 }, { note: "C2", rate: 0.943874 },
    { note: "C2", rate: 1.0 }, { note: "C2", rate: 1.059463 }, { note: "D#2", rate: 0.943874 },
    { note: "D#2", rate: 1.0 }, { note: "D#2", rate: 1.059463 }, { note: "F#2", rate: 0.943874 },
    { note: "F#2", rate: 1.0 }, { note: "F#2", rate: 1.059463 }, { note: "A2", rate: 0.943874 },
    { note: "A2", rate: 1.0 }, { note: "A2", rate: 1.059463 }, { note: "C3", rate: 0.943874 },
    { note: "C3", rate: 1.0 }, { note: "C3", rate: 1.059463 }, { note: "D#3", rate: 0.943874 },
    { note: "D#3", rate: 1.0 }, { note: "D#3", rate: 1.059463 }, { note: "F#3", rate: 0.943874 },
    { note: "F#3", rate: 1.0 }, { note: "F#3", rate: 1.059463 }, { note: "A3", rate: 0.943874 },
    { note: "A3", rate: 1.0 }, { note: "A3", rate: 1.059463 }, { note: "C4", rate: 0.943874 },
    { note: "C4", rate: 1.0 }, { note: "C4", rate: 1.059463 }, { note: "D#4", rate: 0.943874 },
    { note: "D#4", rate: 1.0 }, { note: "D#4", rate: 1.059463 }, { note: "F#4", rate: 0.943874 },
    { note: "F#4", rate: 1.0 }, { note: "F#4", rate: 1.059463 }, { note: "A4", rate: 0.943874 },
    { note: "A4", rate: 1.0 }, { note: "A4", rate: 1.059463 }, { note: "C5", rate: 0.943874 },
    { note: "C5", rate: 1.0 }, { note: "C5", rate: 1.059463 }, { note: "D#5", rate: 0.943874 },
    { note: "D#5", rate: 1.0 }, { note: "D#5", rate: 1.059463 }, { note: "F#5", rate: 0.943874 },
    { note: "F#5", rate: 1.0 }, { note: "F#5", rate: 1.059463 }, { note: "A5", rate: 0.943874 },
    { note: "A5", rate: 1.0 }, { note: "A5", rate: 1.059463 }, { note: "C6", rate: 0.943874 },
    { note: "C6", rate: 1.0 }, { note: "C6", rate: 1.059463 }, { note: "D#6", rate: 0.943874 },
    { note: "D#6", rate: 1.0 }, { note: "D#6", rate: 1.059463 }, { note: "F#6", rate: 0.943874 },
    { note: "F#6", rate: 1.0 }, { note: "F#6", rate: 1.059463 }, { note: "A6", rate: 0.943874 },
    { note: "A6", rate: 1.0 }, { note: "A6", rate: 1.059463 }, { note: "C7", rate: 0.943874 },
    { note: "C7", rate: 1.0 }, { note: "C7", rate: 1.059463 }, { note: "D#7", rate: 0.943874 },
    { note: "D#7", rate: 1.0 }, { note: "D#7", rate: 1.059463 }, { note: "F#7", rate: 0.943874 },
    { note: "F#7", rate: 1.0 }, { note: "F#7", rate: 1.059463 }, { note: "A7", rate: 0.943874 },
    { note: "A7", rate: 1.0 }, { note: "A7", rate: 1.059463 }, { note: "C8", rate: 0.943874 },
    { note: "C8", rate: 1.0 },
  ];

  private get sampleBase(): string {
    const b = (import.meta as any).env?.BASE_URL || '/SodorPiano/';
    return b.replace(/\/$/, '') + '/assets/samples/';
  }

  private loadSample(ctx: AudioContext, file: string): Promise<AudioBuffer> {
    const cached = this.sampleCache.get(file);
    if (cached) return Promise.resolve(cached);
    const inFlight = this.sampleLoads.get(file);
    if (inFlight) return inFlight;
    const p = fetch(this.sampleBase + file)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(buf => ctx.decodeAudioData(buf))
      .then(ab => {
        this.sampleCache.set(file, ab);
        this.sampleLoads.delete(file);
        return ab;
      })
      .catch(err => {
        this.sampleLoads.delete(file);
        throw err;
      });
    this.sampleLoads.set(file, p);
    return p;
  }

  get pedal() { return this._pedalDown; }
  get canResonate() { return this._pedalDown || this.activeVoices.length > 0; }

  get volume() { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this._volume, this.ctx.currentTime);
    }
  }

  constructor() {}

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(this._volume, this.ctx.currentTime);

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGainNode.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.initResonance(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private get output(): AudioNode {
    return this.masterGainNode!;
  }

  private dampVoice(voice: ActiveVoice, when: number) {
    const fadeOut = 0.03;
    voice.gainNode.gain.cancelScheduledValues(when);
    const startGain = Math.max(voice.gainNode.gain.value, 0.0001);
    voice.gainNode.gain.setValueAtTime(startGain, when);
    voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, when + fadeOut);
    voice.oscillators.forEach(o => { try { o.stop(when + fadeOut + 0.01); } catch (_) {} });
    voice.sources.forEach(s => { try { s.stop(when + fadeOut + 0.01); } catch (_) {} });
  }

  dampAll() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeVoices.forEach(v => this.dampVoice(v, now));
    this.activeVoices = [];
  }

  setPedal(down: boolean) {
    if (down === this._pedalDown) return;
    this._pedalDown = down;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (down) {
      // Pressing the pedal sustains whatever is already ringing — nothing to damp.
    } else {
      const released = [...this.activeVoices];
      this.activeVoices = [];
      released.forEach(v => this.dampVoice(v, now));
    }
  }

  private initResonance(ctx: AudioContext) {
    if (this.resonanceInput) return;
    this.resonanceInput = ctx.createGain();
    this.resonanceOutput = ctx.createGain();
    // Always listening: the per-note excite gain gates sympathetic stimulation
    // (only when pedal down or other strings are active), so the feed stays open.
    this.resonanceFeed = ctx.createGain();
    this.resonanceFeed.gain.setValueAtTime(1, ctx.currentTime);

    this.resonanceOutput.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.resonanceOutput.gain.linearRampToValueAtTime(0.0015, ctx.currentTime + 0.5);

    this.resonators = this.RES_FREQS.map(f =>
      ctx.createBiquadFilter()
    );

    this.resonators.forEach((r, i) => {
      const f = this.RES_FREQS[i];
      r.type = 'bandpass';
      // Higher strings ring slightly sharper, higher Q for longer, purer resonance
      const q = 30 + (i / this.RES_FREQS.length) * 40;
      r.frequency.setValueAtTime(f, ctx.currentTime);
      r.Q.setValueAtTime(q, ctx.currentTime);
      r.gain.setValueAtTime(1, ctx.currentTime);
      r.connect(this.resonanceOutput!);
    });

    this.resonanceInput.connect(this.resonanceFeed!);
    this.resonators.forEach(r => this.resonanceFeed!.connect(r));
    this.resonanceOutput.connect(this.masterGainNode!);
  }

  private managePolyphony(ctx: AudioContext, keyIndex: number) {
    const now = ctx.currentTime;

    // Damp any existing voice on the same key
    this.activeVoices = this.activeVoices.filter(v => {
      if (v.keyIndex === keyIndex) {
        this.dampVoice(v, now);
        return false;
      }
      return true;
    });

    // Remove expired voices
    this.activeVoices = this.activeVoices.filter(v => {
      if (v.stopTime > now) return true;
      this.dampVoice(v, now);
      return false;
    });

    // If over polyphony limit, damp oldest voices
    while (this.activeVoices.length >= this.maxPolyphony) {
      const oldest = this.activeVoices.shift()!;
      this.dampVoice(oldest, now);
    }
  }

  getFrequency(keyIndex: number) {
    return 27.5 * Math.pow(2, keyIndex / 12);
  }

  playNote(keyIndex: number, soundType: SoundType = 'grand', duration = 1.2, velocity = 0.9) {
    const ctx = this.initCtx();
    this.managePolyphony(ctx, keyIndex);
    if (soundType === 'grand') {
      this.playGrandPiano(ctx, keyIndex, duration, velocity).catch(err =>
        console.error('[SodorPiano] grand note error:', err)
      );
      return;
    }

    const preset = SOUND_PRESETS[soundType];
    const now = ctx.currentTime;
    const freq = this.getFrequency(keyIndex);
    const hasPerOscEnvelope = !!preset.decayRates;

    const masterGain = ctx.createGain();

    if (preset.filterType) {
      const filter = ctx.createBiquadFilter();
      filter.type = preset.filterType;
      filter.frequency.setValueAtTime(preset.filterFreq || 2000, now);
      if (preset.filterEndFreq) {
        filter.frequency.exponentialRampToValueAtTime(preset.filterEndFreq, now + preset.decay);
      }
      masterGain.connect(filter);
      filter.connect(this.output);
    } else {
      masterGain.connect(this.output);
    }

    if (hasPerOscEnvelope) {
      masterGain.gain.setValueAtTime(1.0, now);
      masterGain.gain.setValueAtTime(1.0, now + duration);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration + preset.release);
    } else {
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.4, now + preset.attack);
      masterGain.gain.exponentialRampToValueAtTime(preset.sustain * 0.4, now + preset.attack + preset.decay);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration + preset.release);
    }

    if (preset.hammerNoise && preset.hammerNoise > 0) {
      const noiseLength = Math.floor(ctx.sampleRate * 0.025);
      const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let j = 0; j < noiseLength; j++) {
        noiseData[j] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseBandpass = ctx.createBiquadFilter();
      noiseBandpass.type = 'bandpass';
      noiseBandpass.frequency.setValueAtTime(Math.min(freq * 3, 8000), now);
      noiseBandpass.Q.setValueAtTime(1.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(preset.hammerNoise, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noiseSource.connect(noiseBandpass);
      noiseBandpass.connect(noiseGain);
      noiseGain.connect(masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + 0.05);
    }

    preset.oscTypes.forEach((type, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (preset.detune && preset.detune[i] !== undefined) {
        osc.detune.setValueAtTime(preset.detune[i], now);
      }

      if (hasPerOscEnvelope) {
        const rate = preset.decayRates![i] || 1;
        const peakGain = preset.gains[i];
        const sustainGain = Math.max(0.0001, peakGain * preset.sustain);

        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(peakGain, now + preset.attack);
        oscGain.gain.exponentialRampToValueAtTime(sustainGain, now + preset.attack + preset.decay / rate);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + preset.release);
      } else {
        oscGain.gain.setValueAtTime(preset.gains[i], now);
      }

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration + preset.release);
    });
  }

  private async playGrandPiano(ctx: AudioContext, keyIndex: number, duration: number, velocity = 0.9) {
    if (!this.ctx || this.ctx.state === 'closed') return;
    const nodeCtx = this.ctx;

    const vel = Math.max(0.05, Math.min(1, velocity));
    const entry = PianoAudio.GRAND_SAMPLE_MAP[keyIndex] || PianoAudio.GRAND_SAMPLE_MAP[39];
    // Map velocity to a recorded layer: p (soft), m (medium), f (forte).
    const layer = vel >= 0.75 ? 'f' : vel >= 0.4 ? 'm' : 'p';
    // '#' is a URL fragment separator, so sharps are stored as 's' in filenames.
    const noteSafe = entry.note.replace('#', 's');
    const file = `${noteSafe}_${layer}.mp3`;

    let buffer: AudioBuffer;
    try {
      buffer = await this.loadSample(nodeCtx, file);
    } catch (err) {
      console.error('[SodorPiano] failed to load sample', file, err);
      this.playGrandSynthFallback(nodeCtx, keyIndex, duration, vel);
      return;
    }

    // Re-read the clock after the async sample load so all scheduling uses a
    // current timestamp (the one captured above may be stale by now).
    const start = nodeCtx.currentTime;

    const source = nodeCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(entry.rate, start);

    const noteGain = nodeCtx.createGain();
    // Layer + velocity level; slightly taper so very soft keystrokes stay soft.
    const layerGain = layer === 'p' ? 0.7 : layer === 'm' ? 0.85 : 1.0;
    const peak = layerGain * (0.55 + 0.45 * vel);
    noteGain.gain.setValueAtTime(0, start);
    noteGain.gain.linearRampToValueAtTime(peak, start + 0.003);

    // Body resonance: samples are already full grands, just add a light presence
    // boost and a gentle high-frequency roll-off towards the top to soften it.
    const body = nodeCtx.createBiquadFilter();
    body.type = 'peaking';
    const freq = this.getFrequency(keyIndex);
    body.frequency.setValueAtTime(freq < 200 ? 120 : 420, start);
    body.Q.setValueAtTime(0.8, start);
    body.gain.setValueAtTime(freq < 200 ? 2.0 : 1.2, start);

    source.connect(noteGain);
    noteGain.connect(body);
    body.connect(this.output);

    // Sympathetic resonance when pedal is down or other notes are ringing.
    if (this.canResonate && this.resonanceInput) {
      const excite = nodeCtx.createGain();
      excite.gain.setValueAtTime(0.18 * vel, start);
      excite.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      noteGain.connect(excite);
      excite.connect(this.resonanceInput);
    }

    // Natural playback length; let held notes ring out, cut short articulated ones.
    const naturalDur = buffer.duration / entry.rate;
    const held = duration >= 2.0;
    const endTime = start + (held ? naturalDur : Math.max(0.05, duration));
    const release = Math.min(0.8, Math.max(0.25, duration * 0.25));
    const stopTime = endTime + release;

    source.start(start);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime + release);
    source.stop(stopTime + 0.02);

    this.activeVoices.push({
      keyIndex,
      gainNode: noteGain,
      stopTime,
      oscillators: [],
      sources: [source],
    });
  }

  // Emergency additive tone, only used if a sample fails to load so the app is
  // never silent. Reasonably piano-ish harmonic stack.
  private playGrandSynthFallback(ctx: AudioContext, keyIndex: number, duration: number, velocity = 0.9) {
    const now = ctx.currentTime;
    const freq = this.getFrequency(keyIndex);
    const masterGain = ctx.createGain();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const peak = 0.5 * (0.3 + 0.7 * vel);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(peak, now + 0.004);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.3);
    masterGain.connect(this.output);
    const oscillators: OscillatorNode[] = [];
    const partials = [1, 2, 3, 4, 5];
    const amps = [1, 0.45, 0.25, 0.14, 0.08];
    for (let i = 0; i < partials.length; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * partials[i] * (1 + 0.0003 * partials[i] * partials[i]), now);
      g.gain.setValueAtTime(amps[i] * (0.3 + 0.7 * vel), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.3);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.35);
      oscillators.push(osc);
    }
    this.activeVoices.push({
      keyIndex,
      gainNode: masterGain,
      stopTime: now + duration + 0.35,
      oscillators,
      sources: [],
    });
  }
  
  close() {
    if (this.ctx) {
      this.activeVoices = [];
      this.resonanceInput = null;
      this.resonanceOutput = null;
      this.resonanceFeed = null;
      this.resonators = [];
      this._pedalDown = false;
      this.ctx.close();
      this.ctx = null;
      this.compressor = null;
    }
  }
}

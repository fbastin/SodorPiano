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

export class PianoAudio {
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private _volume = 0.8;

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
      this.masterGainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private get output(): AudioNode {
    return this.masterGainNode!;
  }

  getFrequency(keyIndex: number) {
    return 27.5 * Math.pow(2, keyIndex / 12);
  }

  playNote(keyIndex: number, soundType: SoundType = 'grand', duration = 1.2) {
    const ctx = this.initCtx();
    if (soundType === 'grand') {
      this.playGrandPiano(ctx, keyIndex, duration);
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

  private playGrandPiano(ctx: AudioContext, keyIndex: number, duration: number) {
    const now = ctx.currentTime;
    const freq = this.getFrequency(keyIndex);
    const t = keyIndex / 87;

    const B = 0.0001 + t * t * 0.004;
    const baseDecay = 2.0 + 5.0 * Math.pow(1 - t, 1.8);
    const numStrings = keyIndex < 10 ? 1 : keyIndex < 20 ? 2 : 3;
    const stringSpread = 0.3 + t * 1.0;
    const nyquist = ctx.sampleRate / 2;
    const numHarmonics = Math.max(4, Math.min(12, Math.floor((nyquist - 200) / freq)));
    const releaseTime = 1.5;
    const stopTime = now + duration + releaseTime + 0.5;

    const soundboard = ctx.createBiquadFilter();
    soundboard.type = 'lowpass';
    soundboard.frequency.setValueAtTime(Math.min(freq * 12, 12000), now);
    soundboard.frequency.exponentialRampToValueAtTime(
      Math.max(freq * 4, 1000), now + baseDecay * 0.5
    );
    soundboard.Q.setValueAtTime(0.5, now);
    soundboard.connect(this.output);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, now);
    masterGain.gain.setValueAtTime(0.35, now + duration);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration + releaseTime);
    masterGain.connect(soundboard);

    const hAmps = [0, 0.40, 0.28, 0.20, 0.13, 0.09, 0.065, 0.045, 0.032, 0.022, 0.016, 0.011, 0.008];

    for (let s = 0; s < numStrings; s++) {
      const detuneCents =
        numStrings === 1 ? 0
        : numStrings === 2 ? (s - 0.5) * stringSpread
        : (s - 1) * stringSpread;

      const stringGain = ctx.createGain();
      stringGain.gain.setValueAtTime(1.0 / numStrings, now);
      stringGain.connect(masterGain);

      for (let h = 1; h <= numHarmonics; h++) {
        const partialFreq = h * freq * Math.sqrt(1 + B * h * h);
        if (partialFreq >= nyquist - 100) break;

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(partialFreq, now);
        osc.detune.setValueAtTime(detuneCents, now);

        const amp = h < hAmps.length ? hAmps[h] : 0.008 / Math.pow(h - 11, 0.6);
        const hDecay = baseDecay / (1 + (h - 1) * 0.4);

        const attack = 0.003;
        const promptTime = Math.min(0.5, hDecay * 0.15);
        const promptLevel = amp * 0.65;
        const bodyLevel = Math.max(0.0001, amp * 0.05);
        const promptEnd = now + attack + promptTime;
        const bodyEnd = Math.min(now + attack + hDecay, stopTime - 0.1);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(amp, now + attack);
        g.gain.exponentialRampToValueAtTime(promptLevel, promptEnd);
        if (bodyEnd > promptEnd + 0.02) {
          g.gain.exponentialRampToValueAtTime(bodyLevel, bodyEnd);
        }
        g.gain.exponentialRampToValueAtTime(0.00001, stopTime);

        osc.connect(g);
        g.connect(stringGain);
        osc.start(now);
        osc.stop(stopTime);
      }
    }

    // Hammer click
    const clickLen = Math.floor(ctx.sampleRate * 0.010);
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
    const cd = clickBuf.getChannelData(0);
    for (let j = 0; j < clickLen; j++) cd[j] = (Math.random() * 2 - 1) * (1 - j / clickLen);
    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickBpf = ctx.createBiquadFilter();
    clickBpf.type = 'bandpass';
    clickBpf.frequency.setValueAtTime(Math.min(freq * 4, 8000), now);
    clickBpf.Q.setValueAtTime(1.0, now);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.04 + t * 0.03, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    clickSrc.connect(clickBpf);
    clickBpf.connect(clickGain);
    clickGain.connect(masterGain);
    clickSrc.start(now);
    clickSrc.stop(now + 0.018);

    // Hammer thump
    const thumpLen = Math.floor(ctx.sampleRate * 0.030);
    const thumpBuf = ctx.createBuffer(1, thumpLen, ctx.sampleRate);
    const td = thumpBuf.getChannelData(0);
    for (let j = 0; j < thumpLen; j++) td[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / thumpLen, 2);
    const thumpSrc = ctx.createBufferSource();
    thumpSrc.buffer = thumpBuf;
    const thumpBpf = ctx.createBiquadFilter();
    thumpBpf.type = 'bandpass';
    thumpBpf.frequency.setValueAtTime(Math.min(freq * 2, 2500), now);
    thumpBpf.Q.setValueAtTime(0.6, now);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.06, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    thumpSrc.connect(thumpBpf);
    thumpBpf.connect(thumpGain);
    thumpGain.connect(masterGain);
    thumpSrc.start(now);
    thumpSrc.stop(now + 0.05);
  }
  
  close() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

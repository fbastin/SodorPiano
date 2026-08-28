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
      this.playGrandPiano(ctx, keyIndex, duration, velocity);
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

  private playGrandPiano(ctx: AudioContext, keyIndex: number, duration: number, velocity = 0.9) {
    const now = ctx.currentTime;
    const freq = this.getFrequency(keyIndex);
    const t = keyIndex / 87;
    const oscillators: OscillatorNode[] = [];
    const sources: AudioBufferSourceNode[] = [];

    const currentVoiceCount = this.activeVoices.length;
    const densityFactor = currentVoiceCount > 16 ? 0.7 : currentVoiceCount > 8 ? 0.85 : 1.0;

    // ---- Velocity handling (acoustic behavior) ---------------------------
    // Clamp and shape: velocity drives both loudness and brightness.
    const vel = Math.max(0.05, Math.min(1, velocity));
    const velLin = Math.pow(vel, 1.6);                 // perceptual loudness
    const bright = vel;                                // spectral brightness (0..1)

    // ---- Pitch / inharmonicity (stretch) --------------------------------
    // Octave stretching grows toward the treble; harder hits add a touch more.
    const B = (0.0001 + t * t * 0.004) * (0.85 + 0.3 * bright);

    // ---- Key-region decay behaviour -------------------------------------
    // Lowest notes ring for many seconds; short treble notes decay fast.
    const trebleDecay = 0.9 + (1 - t) * 4.5;           // long in bass, short in treble
    const fullBaseDecay = trebleDecay * (0.75 + 0.5 * vel);
    const baseDecay = Math.min(fullBaseDecay, duration * 1.5 + 1.2);

    // Number of unison strings: bass gets 1-2, middle/treble 3, thinned under load.
    const numStrings = duration < 0.3 || currentVoiceCount > 20 ? 1
      : keyIndex < 10 ? 1 : keyIndex < 20 ? 2 : 3;
    const stringSpread = 0.25 + t * 1.2;

    const nyquist = ctx.sampleRate / 2;
    const maxHarmonics = Math.max(4, Math.min(14, Math.floor((nyquist - 200) / freq)));
    // Brighter strikes excite more partials.
    const numHarmonics = duration < 0.4 || currentVoiceCount > 16
      ? Math.min(maxHarmonics, Math.round(2 + 5 * bright))
      : Math.round(3 + maxHarmonics * (0.45 + 0.55 * bright));

    const releaseTime = Math.min(1.8, duration * 0.6 + 0.2 + 0.3 * vel);
    const stopTime = now + duration + releaseTime + 0.1;

    // ---- Output chain: soundboard (lowpass) + body resonance -------------
    const soundboard = ctx.createBiquadFilter();
    soundboard.type = 'lowpass';
    // Don't cut off low bass; sweep down as the note decays (higher partials die first).
    const sbStart = Math.min(freq * Math.min(16, 3 + 13 * bright), 12000);
    soundboard.frequency.setValueAtTime(sbStart, now);
    soundboard.frequency.exponentialRampToValueAtTime(
      Math.max(freq * (2 + 2 * bright), 800), now + baseDecay * 0.6
    );
    if (t > 0.4) {
      // Treble partials fade even faster than the sweep suggests — add a high-shelf tilt.
      soundboard.Q.setValueAtTime(0.4 + t, now);
    }
    soundboard.connect(this.output);

    // Body resonance: the instrument's low-end cabinet / belly response.
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    const bodyFreq = freq < 200 ? 90 : freq < 400 ? 180 : freq < 900 ? 350 : 460;
    body.frequency.setValueAtTime(bodyFreq, now);
    body.Q.setValueAtTime(0.9, now);
    body.gain.setValueAtTime(t < 0.5 ? 3 + 3 * (0.5 - t) : 2.5, now);
    body.connect(soundboard);

    const masterGain = ctx.createGain();
    const peakLevel = (duration < 0.5 ? 0.35 * (0.55 + duration * 0.9) : 0.35)
      * densityFactor * (0.3 + 0.7 * velLin);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(peakLevel, now + 0.003);
    masterGain.gain.setValueAtTime(peakLevel, now + duration * 0.4);
    masterGain.gain.setValueAtTime(peakLevel * 0.85, now + duration);
    masterGain.gain.exponentialRampToValueAtTime(0.00001, now + duration + releaseTime);
    // masterGain -> body -> soundboard -> output.
    masterGain.connect(body);

    // ---- Harmonic model --------------------------------------------------
    // Amplitude profile of the fundamental and its partials, tilted by region & velocity.
    const th = t;                       // 0 = low A0, 1 = high C8
    const trebleCut = Math.min(1, Math.pow(th, 1.4));
    const partialAmp = (h: number): number => {
      // Real grands: fundamental dominates; upper partials fall off with distance.
      // Bass has relatively strong low partials, treble is almost sinusoidal.
      // 1st partial (fundamental) decays off toward treble relative to 2nd partial richness
      let a: number;
      if (h === 1) {
        a = 1.0;
      } else {
        const falloff = 0.75 / Math.pow(h, 1.15);
        a = falloff * (1 - 0.65 * trebleCut);
      }
      // Brightness: hard strikes boost upper partials (hammer hardens the contact).
      a *= 0.25 + 0.75 * Math.pow(bright, 0.6) + (h > 1 ? 0.8 * bright : 0);
      return Math.max(0.0001, a);
    };

    for (let s = 0; s < numStrings; s++) {
      // Multiple strings of a unison are slightly de-tuned; high notes spread more.
      const detuneCents =
        numStrings === 1 ? 0
        : numStrings === 2 ? (s - 0.5) * stringSpread
        : (s - 1) * stringSpread;

      const stringGain = ctx.createGain();
      stringGain.gain.setValueAtTime(1.0 / numStrings, now);
      stringGain.connect(masterGain);

      const usedInharm = B * (1 + s * 0.002); // each unison string inharmonic differs slightly

      for (let h = 1; h <= numHarmonics; h++) {
        const partialFreq = h * freq * Math.sqrt(1 + usedInharm * h * h);
        if (partialFreq >= nyquist - 100) break;

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(partialFreq, now);
        if (numStrings > 1) osc.detune.setValueAtTime(detuneCents, now);

        const amp = partialAmp(h);
        // Higher partials decay faster (loss at string terminations) — a real-piano trait.
        const harmonicLoss = Math.pow(2, (h - 1) * (0.10 + 0.05 * trebleCut));
        const hDecay = baseDecay / harmonicLoss;

        // Attack: the hammer excites the partial almost instantly; a tiny prompt
        // transient then falls to the inharmonic sustain body.
        const attack = 0.0015;
        const promptTime = Math.min(0.25, hDecay * 0.08) * (0.6 + 0.6 * vel);
        const promptLevel = amp * (0.75 * bright + 0.2);
        const bodyLevel = Math.max(0.0001, amp * 0.06);
        const promptEnd = now + attack + promptTime;
        const bodyEnd = Math.min(now + attack + hDecay, stopTime - 0.05);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(amp, now + attack);
        if (promptEnd < stopTime - 0.05) {
          g.gain.exponentialRampToValueAtTime(Math.max(promptLevel, 0.0001), promptEnd);
          if (bodyEnd > promptEnd + 0.02) {
            g.gain.exponentialRampToValueAtTime(bodyLevel, bodyEnd);
          }
        }
        g.gain.exponentialRampToValueAtTime(0.00001, stopTime);

        osc.connect(g);
        g.connect(stringGain);
        osc.start(now);
        osc.stop(stopTime);
        oscillators.push(osc);
      }
    }

    // ---- Hammer attack transients ---------------------------------------
    // Two noise bursts, mimicking the characteristic "thump + click" of the action.
    // Click: broadband, low-level, brighter with harder strikes.
    const clickLen = Math.floor(ctx.sampleRate * 0.010);
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
    const cd = clickBuf.getChannelData(0);
    for (let j = 0; j < clickLen; j++) cd[j] = (Math.random() * 2 - 1) * (1 - j / clickLen);
    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickBpf = ctx.createBiquadFilter();
    clickBpf.type = 'bandpass';
    clickBpf.frequency.setValueAtTime(Math.min(freq * (3 + 3 * bright), 8500), now);
    clickBpf.Q.setValueAtTime(1.0, now);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime((0.02 + 0.05 * t) * (0.4 + vel), now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    clickSrc.connect(clickBpf);
    clickBpf.connect(clickGain);
    clickGain.connect(masterGain);
    clickSrc.start(now);
    clickSrc.stop(now + 0.022);
    sources.push(clickSrc);

    // Thump: low-frequency body thump of the key & felt hitting the string bed.
    const thumpLen = Math.floor(ctx.sampleRate * 0.035);
    const thumpBuf = ctx.createBuffer(1, thumpLen, ctx.sampleRate);
    const td = thumpBuf.getChannelData(0);
    const thumpBoost = currentVoiceCount < 16 && duration >= 0.18;
    if (thumpBoost) {
      for (let j = 0; j < thumpLen; j++) td[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / thumpLen, 2);
      const thumpSrc = ctx.createBufferSource();
      thumpSrc.buffer = thumpBuf;
      const thumpBpf = ctx.createBiquadFilter();
      thumpBpf.type = 'bandpass';
      thumpBpf.frequency.setValueAtTime(Math.min(freq * (1.6 + 0.8 * t), 2200), now);
      thumpBpf.Q.setValueAtTime(0.6, now);
      const thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(0.05 * (0.5 + 0.5 * vel), now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      thumpSrc.connect(thumpBpf);
      thumpBpf.connect(thumpGain);
      thumpGain.connect(masterGain);
      thumpSrc.start(now);
      thumpSrc.stop(now + 0.06);
      sources.push(thumpSrc);
    }

    // ---- Sympathetic resonance ------------------------------------------
    // When the pedal is down (or other notes are held), the played note's
    // energy excites the undamped strings tuned to its related frequencies.
    if (this.canResonate && this.resonanceInput) {
      const excite = ctx.createGain();
      // Stronger excitation for louder notes and full chords.
      excite.gain.setValueAtTime(0.25 * vel * (0.6 + 0.4 * bright), now);
      excite.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      // Feed the partial-rich signal (pre soundboard/body colouring) into the bank.
      masterGain.connect(excite);
      excite.connect(this.resonanceInput);
    }

    this.activeVoices.push({
      keyIndex,
      gainNode: masterGain,
      stopTime,
      oscillators,
      sources
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

import { PianoAudio, SOUND_PRESETS } from '../core/audio';
import { SoundType, MusicScore } from '../types';
import { parseMusicXml } from '../core/parser';
import { SCORE_FILE_TYPES, loadScoreFile } from '../core/score-file';
import { ScrollingStaff } from './staff';
import type { NotationView } from './notation';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Score playback scheduling: how often notes are queued, how far ahead of the
// audio clock, and the silence before the first note.
const SCHEDULE_INTERVAL_MS = 25;
const SCHEDULE_AHEAD = 0.3;
const SCHEDULE_LEAD_IN = 0.1;
// Mezzo-forte, for scores that carry no velocity.
const DEFAULT_SCORE_VELOCITY = 80 / 127;

// The viewer's choices, kept in this browser: show the staff or not, and
// which view of the score.
const STAFF_SETTING = 'sodorpiano.staff';
const VIEW_SETTING = 'sodorpiano.view';
// The playhead stands this far across the staff.
const PLAYHEAD = 0.2;

export class SodorPiano {
  private container: HTMLElement;
  private audio: PianoAudio;
  private soundType: SoundType = 'grand';
  private activeKeys: Set<number> = new Set();
  private isAutoPlaying = false;
  private tempoMultiplier = 1.0;
  private stopAutoPlayRequested = false;
  private currentScore: MusicScore | null = null;
  private keyElements: Map<number, HTMLElement> = new Map();
  private staff!: ScrollingStaff;
  private staffVisible = true;
  private staffFrame = 0;
  // Full notation, engraved on demand; the simple staff stays for notes
  // played by hand, and whenever the score cannot be engraved.
  private fullView = false;
  private notation: NotationView | null = null;
  private engraved: MusicScore | null = null;
  private engraving: MusicScore | null = null;
  private shownScore: MusicScore | null = null;
  // Playback clock of the score: its position, in seconds, as of a time on
  // the audio clock. The staff scrolls from it between scheduler ticks.
  private scorePosition = 0;
  private scoreClockTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.audio = new PianoAudio();
    this.staffVisible = readStaffSetting();
    this.fullView = readSetting(VIEW_SETTING) === 'full';
    this.render();
  }

  public setSoundType(type: SoundType) {
    this.soundType = type;
    this.updateUI();
  }

  public setPedal(down: boolean) {
    this.audio.setPedal(down);
  }

  public async loadMusicXml(xmlString: string) {
    try {
      this.currentScore = { ...parseMusicXml(xmlString), source: { format: 'musicxml', text: xmlString } };
      this.showScore(this.currentScore);
      this.updateUI();
      return this.currentScore;
    } catch (err) {
      console.error('Failed to parse MusicXML:', err);
      throw err;
    }
  }

  // MusicXML, compressed MusicXML (.mxl) or MuseScore (.mscz, .mscx).
  public async loadScoreFile(file: Blob) {
    try {
      this.currentScore = await loadScoreFile(file);
      this.showScore(this.currentScore);
      this.updateUI();
      return this.currentScore;
    } catch (err) {
      console.error('Failed to load score:', err);
      throw err;
    }
  }

  public async playScore(score?: MusicScore) {
    const scoreToPlay = score || this.currentScore;
    if (!scoreToPlay || this.isAutoPlaying) return;

    this.isAutoPlaying = true;
    this.stopAutoPlayRequested = false;
    this.updateUI();

    const notes = scoreToPlay.notes;
    // Every sample is loaded before the first note: a sample fetched during
    // playback would sound late.
    if (this.soundType === 'grand') await this.audio.preloadGrand(notes);

    // Notes are scheduled slightly ahead on the audio clock, which is exact,
    // rather than started by timers, which are not: chords then sound
    // together and the tempo does not drift. The score clock follows the
    // audio clock, scaled by the tempo setting, so that the setting can
    // change during playback.
    const lastRelease = Math.max(0, ...notes.map(n => n.time + (n.duration ?? 0.8)));
    this.showScore(scoreToPlay);
    this.scorePosition = -SCHEDULE_LEAD_IN;
    this.scoreClockTime = this.audio.currentTime;
    this.drawStaff();
    let next = 0;

    await new Promise<void>(resolve => {
      const tick = () => {
        if (this.stopAutoPlayRequested) {
          clearInterval(timer);
          resolve();
          return;
        }
        const now = this.audio.currentTime;
        this.scorePosition += (now - this.scoreClockTime) * this.tempoMultiplier;
        this.scoreClockTime = now;
        const scorePosition = this.scorePosition;

        const horizon = scorePosition + SCHEDULE_AHEAD * this.tempoMultiplier;
        while (next < notes.length && notes[next].time <= horizon) {
          const note = notes[next++];
          const when = now + (note.time - scorePosition) / this.tempoMultiplier;
          this.playNote(note.keyIndex, (note.duration || 0.8) / this.tempoMultiplier,
                        note.velocity ?? DEFAULT_SCORE_VELOCITY, when);
        }
        if (next >= notes.length && scorePosition >= lastRelease) {
          clearInterval(timer);
          resolve();
        }
      };
      const timer = setInterval(tick, SCHEDULE_INTERVAL_MS);
      tick();
    });

    // A finished piece rings out; a stopped one is silenced.
    if (this.stopAutoPlayRequested) this.audio.dampAll();
    this.isAutoPlaying = false;
    // The staff returns to the beginning, where the next playback starts.
    this.scorePosition = 0;
    this.drawStaff();
    this.updateUI();
  }

  public stopScore() {
    this.stopAutoPlayRequested = true;
    this.audio.dampAll();
  }

  // `when`, on the audio clock, schedules the note instead of playing it now.
  public playNote(keyIndex: number, duration = 2.5, velocity = 0.8, when?: number) {
    this.audio.playNote(keyIndex, this.soundType, duration, velocity, when);
    if (when === undefined) {
      this.highlightKey(keyIndex);
      this.staff.addLiveNote(keyIndex, performance.now() / 1000);
      this.drawStaff();
    } else {
      const delay = Math.max(0, (when - this.audio.currentTime) * 1000);
      setTimeout(() => this.highlightKey(keyIndex), delay);
    }
  }

  private showScore(score: MusicScore) {
    this.shownScore = score;
    this.staff.setScore(score);
    this.scorePosition = 0;
    this.updateView();
  }

  // Which view the staff panel shows: the engraving when the full view is
  // chosen and the score could be engraved, the simple staff otherwise.
  private updateView() {
    const panel = this.container.querySelector('#sp-staff') as HTMLElement;
    const notationBox = this.container.querySelector('#sp-notation') as HTMLElement;
    const status = this.container.querySelector('#sp-notation-status') as HTMLElement;
    const button = this.container.querySelector('#sp-view-btn') as HTMLElement;
    button.textContent = this.fullView ? 'Full score' : 'Simple staff';
    button.classList.toggle('sp-staff-on', this.fullView);

    const score = this.shownScore;
    const wanted = this.fullView && !!score?.source;
    const ready = wanted && this.engraved === score;
    panel.classList.toggle('sp-staff-full', wanted);
    notationBox.style.display = wanted ? '' : 'none';
    (this.container.querySelector('#sp-staff-canvas') as HTMLElement).style.display = wanted ? 'none' : '';
    status.style.display = ready ? 'none' : '';
    if (wanted && !ready && this.engraving !== score && this.staffVisible) this.engrave(score!);
    this.drawStaff();
  }

  private async engrave(score: MusicScore) {
    const status = this.container.querySelector('#sp-notation-status') as HTMLElement;
    const sheet = this.container.querySelector('#sp-notation-sheet') as HTMLElement;
    this.engraving = score;
    status.textContent = 'Engraving the score…';
    try {
      if (!this.notation) {
        // Loaded on first use: the engraver is the heaviest part of the app.
        const { NotationView } = await import('./notation');
        this.notation = new NotationView(this.container.querySelector('#sp-notation') as HTMLElement, sheet);
      }
      // Let the message show before the engraver takes the main thread.
      await new Promise(r => setTimeout(r, 30));
      await this.notation.load(score);
      if (this.engraving === score) this.engraved = score;
    } catch (err) {
      console.error('[SodorPiano] engraving failed:', err);
      if (this.engraving === score) status.textContent = 'The full score cannot be shown for this file.';
      return;
    } finally {
      if (this.engraving === score) this.engraving = null;
    }
    this.updateView();
  }

  // Playback position in the score, in seconds, for the staff: between two
  // scheduler ticks it runs on with the audio clock.
  private staffPosition(): number {
    if (!this.isAutoPlaying) return this.scorePosition;
    return this.scorePosition + (this.audio.currentTime - this.scoreClockTime) * this.tempoMultiplier;
  }

  // Draws the staff, and keeps drawing it every frame while something
  // moves on it: a score playing, or notes played by hand drifting away.
  private drawStaff() {
    if (!this.staffVisible || this.staffFrame) return;
    const frame = () => {
      this.staffFrame = 0;
      if (!this.staffVisible) return;
      const now = performance.now() / 1000;
      if (this.notation && this.fullView && this.shownScore && this.engraved === this.shownScore) {
        const box = this.container.querySelector('#sp-notation') as HTMLElement;
        this.notation.draw(this.staffPosition(), box.clientWidth * PLAYHEAD, this.isAutoPlaying,
                           0.12 * this.tempoMultiplier);
      } else {
        this.staff.draw(this.staffPosition(), now);
      }
      if (this.isAutoPlaying || this.staff.hasLiveNotes(now)) {
        this.staffFrame = requestAnimationFrame(frame);
      }
    };
    this.staffFrame = requestAnimationFrame(frame);
  }

  // `remember` keeps the choice for the next visit: only the viewer's own.
  private setStaffVisible(visible: boolean, remember = true) {
    this.staffVisible = visible;
    if (remember) {
      try { localStorage.setItem(STAFF_SETTING, visible ? '1' : '0'); } catch (_) { /* private mode */ }
    }
    const panel = this.container.querySelector('#sp-staff') as HTMLElement;
    const button = this.container.querySelector('#sp-staff-btn') as HTMLElement;
    panel.style.display = visible ? '' : 'none';
    (this.container.querySelector('#sp-view-btn') as HTMLElement).style.display = visible ? '' : 'none';
    button.classList.toggle('sp-staff-on', visible);
    button.setAttribute('aria-pressed', String(visible));
    this.updateView();
  }

  private setFullView(full: boolean) {
    this.fullView = full;
    try { localStorage.setItem(VIEW_SETTING, full ? 'full' : 'simple'); } catch (_) { /* private mode */ }
    this.updateView();
  }

  private highlightKey(keyIndex: number) {
    const el = this.keyElements.get(keyIndex);
    if (!el) return;
    const isBlack = el.classList.contains('sp-black-key');
    el.classList.add('sp-active');
    setTimeout(() => el.classList.remove('sp-active'), 250);
  }

  // Map a pointer's position within a key to a strike velocity.
  // Striking the front (bottom) hard yields high velocity; grazing the top is soft.
  private velocityFromPoint(clientY: number, rect: DOMRect) {
    const ratio = (clientY - rect.top) / rect.height;
    const v = 1 - Math.max(0, Math.min(1, ratio));
    return Math.max(0.06, Math.min(1, v));
  }

  private render() {
    this.container.innerHTML = `
      <style>
        .sp-root {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: #020617;
          border-radius: 40px;
          overflow: hidden;
          border: 4px solid #1e293b;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          user-select: none;
          box-sizing: border-box;
        }
        .sp-root *, .sp-root *::before, .sp-root *::after {
          box-sizing: border-box;
        }

        /* Top Console */
        .sp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          background: linear-gradient(to bottom, #0f172a, #020617);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sp-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .sp-icon {
          width: 40px;
          height: 40px;
          background: #db2777;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          transition: background 0.3s;
        }
        .sp-icon.sp-playing {
          background: #10b981;
          animation: sp-pulse 2s infinite;
        }
        @keyframes sp-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .sp-icon svg {
          width: 24px;
          height: 24px;
        }
        .sp-title {
          font-size: 22px;
          font-weight: 900;
          color: white;
          line-height: 1.1;
        }
        .sp-subtitle {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          margin-top: 4px;
        }
        .sp-controls-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-top: 8px;
        }
        .sp-sound-btns {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sp-sound-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .sp-sound-btn:hover {
          background: #334155;
          color: #e2e8f0;
        }
        .sp-sound-btn.sp-selected {
          background: #db2777;
          color: white;
          border-color: #f472b6;
          box-shadow: 0 0 15px rgba(236,72,153,0.4);
        }
        .sp-action-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          border-left: 1px solid rgba(255,255,255,0.1);
          padding-left: 16px;
        }
        .sp-btn {
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .sp-btn svg { width: 12px; height: 12px; }
        .sp-btn-import {
          background: #1e293b;
          color: #cbd5e1;
        }
        .sp-btn-import:hover { background: #334155; }
        .sp-btn-play {
          background: #059669;
          color: white;
          box-shadow: 0 4px 6px rgba(5,150,105,0.2);
        }
        .sp-btn-play:hover { background: #10b981; }
        .sp-btn-stop {
          background: #dc2626;
          color: white;
          box-shadow: 0 4px 6px rgba(220,38,38,0.2);
        }
        .sp-btn-stop:hover { background: #ef4444; }
        .sp-btn-pedal {
          background: #1e293b;
          color: #cbd5e1;
        }
        .sp-btn-pedal:hover { background: #334155; }
        .sp-btn-pedal.sp-pedal-on {
          background: #34d399;
          color: #052e16;
          box-shadow: 0 0 15px rgba(52,211,153,0.5);
        }
        .sp-btn-exit {
          padding: 8px 24px;
          background: #1e293b;
          color: white;
          font-weight: 900;
          border-radius: 8px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sp-btn-exit:hover { background: #7f1d1d; }
        .sp-btn-exit svg { width: 16px; height: 16px; }

        .sp-knob-group {
          display: flex;
          align-items: center;
          gap: 6px;
          border-left: 1px solid rgba(255,255,255,0.1);
          padding-left: 16px;
        }
        .sp-knob-label {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          min-width: 32px;
        }
        .sp-knob-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          line-height: 1;
          padding: 0;
        }
        .sp-knob-btn:hover {
          background: #334155;
          color: #e2e8f0;
        }
        .sp-knob-value {
          font-size: 11px;
          font-weight: 700;
          color: #e2e8f0;
          min-width: 36px;
          text-align: center;
        }

        /* Piano Bed */
        .sp-piano-bed {
          flex: 1;
          background: #0f172a;
          padding: 8px 24px 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .sp-staff {
          position: relative;
          height: clamp(110px, 26vh, 230px);
          margin-bottom: 10px;
          border-radius: 12px;
          overflow: hidden;
          background: #0b1224;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }
        .sp-staff canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .sp-staff.sp-staff-full {
          height: clamp(150px, 34vh, 320px);
          background: #fbfaf4;
        }
        .sp-notation {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .sp-notation-sheet {
          position: absolute;
          left: 0;
          top: 0;
          transform-origin: 0 0;
          will-change: transform;
        }
        .sp-notation-playhead {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 20%;
          width: 2px;
          background: rgba(219,39,119,0.75);
          pointer-events: none;
        }
        .sp-notation-status {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #475569;
          background: #fbfaf4;
        }
        .sp-btn-staff {
          background: #1e293b;
          color: #cbd5e1;
        }
        .sp-btn-staff:hover { background: #334155; }
        .sp-btn-staff.sp-staff-on {
          background: #6366f1;
          color: white;
          box-shadow: 0 0 15px rgba(99,102,241,0.45);
        }
        .sp-keys-frame {
          width: 100%;
          aspect-ratio: 52/9;
          background: #1e293b;
          border-radius: 12px;
          padding: 4px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .sp-keys-inner {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .sp-white-keys {
          display: flex;
          height: 100%;
        }
        .sp-white-key {
          flex: 1;
          position: relative;
          border-radius: 0 0 6px 6px;
          border-left: 1px solid rgba(148,163,184,0.6);
          border-right: 1px solid rgba(148,163,184,0.6);
          cursor: pointer;
          background: #f8f8f2;
          box-shadow: inset 0 -3px 4px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.1);
          transition: background 0.08s;
        }
        .sp-white-key:hover { background: #f0f0ea; }
        .sp-white-key:active { background: #e8e8e0; }
        .sp-white-key.sp-active {
          background: #fce7f3;
          box-shadow: inset 0 -2px 3px rgba(219,39,119,0.15), 0 2px 4px rgba(0,0,0,0.1);
        }
        .sp-key-label {
          position: absolute;
          bottom: 8px;
          left: 0;
          width: 100%;
          text-align: center;
          pointer-events: none;
          opacity: 0.4;
          font-size: 7px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sp-black-key {
          position: absolute;
          top: 0;
          height: 62%;
          border-radius: 0 0 4px 4px;
          cursor: pointer;
          z-index: 2;
          background: linear-gradient(to bottom, #333, #222, #111);
          box-shadow: 2px 5px 8px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(255,255,255,0.05);
          transition: background 0.08s;
        }
        .sp-black-key:hover {
          background: linear-gradient(to bottom, #3a3a3a, #2a2a2a, #1a1a1a);
        }
        .sp-black-key:active {
          background: linear-gradient(to bottom, #2a2a2a, #1a1a1a, #0a0a0a);
        }
        .sp-black-key.sp-active {
          background: linear-gradient(to bottom, #f472b6, #ec4899, #be185d);
          box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 0 15px rgba(236,72,153,0.8);
        }

        /* Bottom Status Bar */
        .sp-footer {
          padding: 24px;
          background: rgba(2,6,23,0.8);
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 48px;
        }
        .sp-status-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sp-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: sp-pulse 2s infinite;
        }
        .sp-status-dot.sp-green { background: #10b981; }
        .sp-status-dot.sp-blue { background: #3b82f6; }
        .sp-status-dot.sp-pink { background: #ec4899; }
        .sp-status-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        @media (max-width: 768px) {
          .sp-header { padding: 12px; flex-wrap: wrap; gap: 8px; }
          .sp-title { font-size: 16px; }
          .sp-piano-bed { padding: 4px 8px 8px; }
          .sp-footer { padding: 12px; gap: 24px; }
          .sp-action-group, .sp-knob-group { border-left: none; padding-left: 0; }
        }
      </style>
      <div class="sp-root">
        <div class="sp-header">
          <div class="sp-header-left">
            <div class="sp-icon" id="sp-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div>
              <div class="sp-title" id="sp-title">SODOR PIANO STUDIO</div>
              <div class="sp-subtitle" id="sp-subtitle">Integrated Synthesis System</div>
              <div class="sp-controls-row">
                <div class="sp-sound-btns" id="sp-sound-selector"></div>
                <div class="sp-knob-group">
                  <span class="sp-knob-label">Vol</span>
                  <button class="sp-knob-btn" id="sp-vol-down">&minus;</button>
                  <span class="sp-knob-value" id="sp-vol-value">80%</span>
                  <button class="sp-knob-btn" id="sp-vol-up">+</button>
                </div>
                <div class="sp-knob-group">
                  <span class="sp-knob-label">Tempo</span>
                  <button class="sp-knob-btn" id="sp-tempo-down">&minus;</button>
                  <span class="sp-knob-value" id="sp-tempo-value">1.0&times;</span>
                  <button class="sp-knob-btn" id="sp-tempo-up">+</button>
                </div>
                <div class="sp-action-group">
                  <input type="file" id="sp-xml-import" style="display:none" accept="${SCORE_FILE_TYPES}">
                  <button class="sp-btn sp-btn-pedal" id="sp-pedal-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 10h16"/><path d="M6 10v6h4v-6"/><circle cx="18" cy="13" r="3"/><circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                    Pedal
                  </button>
                  <button class="sp-btn sp-btn-staff" id="sp-staff-btn" title="Show or hide the scrolling staff">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="21" y2="18"/><circle cx="14" cy="12" r="2" fill="currentColor" stroke="none"/>
                    </svg>
                    Staff
                  </button>
                  <button class="sp-btn sp-btn-staff" id="sp-view-btn" title="Switch between the simple staff and the full score">Simple staff</button>
                  <button class="sp-btn sp-btn-import" id="sp-import-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import XML
                  </button>
                  <button class="sp-btn sp-btn-play" id="sp-play-btn" style="display:none">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Play Song
                  </button>
                  <button class="sp-btn sp-btn-stop" id="sp-stop-btn" style="display:none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Stop
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sp-piano-bed">
          <div class="sp-staff" id="sp-staff">
            <canvas id="sp-staff-canvas"></canvas>
            <div class="sp-notation" id="sp-notation" style="display:none">
              <div class="sp-notation-sheet" id="sp-notation-sheet"></div>
              <div class="sp-notation-playhead"></div>
              <div class="sp-notation-status" id="sp-notation-status"></div>
            </div>
          </div>
          <div class="sp-keys-frame">
            <div class="sp-keys-inner" id="sp-keys-bed">
              <div class="sp-white-keys" id="sp-white-keys"></div>
            </div>
          </div>
        </div>

        <div class="sp-footer">
          <div class="sp-status-item">
            <div class="sp-status-dot sp-green"></div>
            <span class="sp-status-label">A0 Range Limit</span>
          </div>
          <div class="sp-status-item">
            <div class="sp-status-dot sp-blue"></div>
            <span class="sp-status-label">Multi-Touch Ready</span>
          </div>
          <div class="sp-status-item">
            <div class="sp-status-dot sp-pink"></div>
            <span class="sp-status-label">C8 Range Limit</span>
          </div>
        </div>
      </div>
    `;

    this.staff = new ScrollingStaff(this.container.querySelector('#sp-staff-canvas') as HTMLCanvasElement);
    this.setupEvents();
    this.renderKeys();
    this.renderSoundSelector();
    this.setStaffVisible(this.staffVisible, false);
    // Redraw when the staff changes size (window resized, rotated…).
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        this.notation?.fit();
        this.drawStaff();
      }).observe(this.container.querySelector('#sp-staff') as HTMLElement);
    }
  }

  private setupEvents() {
    const importBtn = this.container.querySelector('#sp-import-btn') as HTMLButtonElement;
    const fileInput = this.container.querySelector('#sp-xml-import') as HTMLInputElement;
    const playBtn = this.container.querySelector('#sp-play-btn') as HTMLButtonElement;
    const stopBtn = this.container.querySelector('#sp-stop-btn') as HTMLButtonElement;

    importBtn.onclick = () => fileInput.click();
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      // Reset so that choosing the same file again still triggers a load.
      fileInput.value = '';
      if (!file) return;
      try {
        await this.loadScoreFile(file);
      } catch (err) {
        alert(`Cannot read ${file.name}: ${err instanceof Error ? err.message : err}`);
      }
    };

    const staffBtn = this.container.querySelector('#sp-staff-btn') as HTMLButtonElement;
    staffBtn.onclick = () => this.setStaffVisible(!this.staffVisible);
    const viewBtn = this.container.querySelector('#sp-view-btn') as HTMLButtonElement;
    viewBtn.onclick = () => this.setFullView(!this.fullView);

    playBtn.onclick = () => this.playScore();
    stopBtn.onclick = () => this.stopScore();

    const pedalBtn = this.container.querySelector('#sp-pedal-btn') as HTMLButtonElement;
    pedalBtn.onclick = () => {
      const next = !this.audio.pedal;
      this.audio.setPedal(next);
      pedalBtn.classList.toggle('sp-pedal-on', next);
      pedalBtn.setAttribute('aria-pressed', String(next));
    };

    const volDown = this.container.querySelector('#sp-vol-down') as HTMLButtonElement;
    const volUp = this.container.querySelector('#sp-vol-up') as HTMLButtonElement;
    const tempoDown = this.container.querySelector('#sp-tempo-down') as HTMLButtonElement;
    const tempoUp = this.container.querySelector('#sp-tempo-up') as HTMLButtonElement;

    volDown.onclick = () => { this.audio.volume = Math.round((this.audio.volume - 0.1) * 10) / 10; this.updateUI(); };
    volUp.onclick = () => { this.audio.volume = Math.round((this.audio.volume + 0.1) * 10) / 10; this.updateUI(); };
    tempoDown.onclick = () => { this.tempoMultiplier = Math.max(0.25, Math.round((this.tempoMultiplier - 0.25) * 4) / 4); this.updateUI(); };
    tempoUp.onclick = () => { this.tempoMultiplier = Math.min(2.0, Math.round((this.tempoMultiplier + 0.25) * 4) / 4); this.updateUI(); };
  }

  private renderKeys() {
    const whiteKeysContainer = this.container.querySelector('#sp-white-keys') as HTMLElement;
    const keysBed = this.container.querySelector('#sp-keys-bed') as HTMLElement;
    whiteKeysContainer.innerHTML = '';
    this.keyElements.clear();

    let whiteCount = 0;
    const whiteKeys: { i: number; noteName: string; octave: number }[] = [];
    const blackKeys: { i: number; noteName: string; octave: number; whiteBefore: number }[] = [];

    for (let i = 0; i < 88; i++) {
      const noteIndex = (i + 9) % 12;
      const noteName = NOTES[noteIndex];
      const octave = Math.floor((i + 9) / 12);

      if (noteName.includes('#')) {
        blackKeys.push({ i, noteName, octave, whiteBefore: whiteCount });
      } else {
        whiteKeys.push({ i, noteName, octave });
        whiteCount++;
      }
    }

    whiteKeys.forEach(key => {
      const el = document.createElement('div');
      el.className = 'sp-white-key';
      el.onmousedown = (e: MouseEvent) => this.playNote(key.i, 2.5, this.velocityFromPoint(e.clientY, el.getBoundingClientRect()));
      el.ontouchstart = (e: TouchEvent) => { e.preventDefault(); this.playNote(key.i, 2.5, this.velocityFromPoint(e.touches[0].clientY, el.getBoundingClientRect())); };

      if (key.noteName === 'C' || key.i === 0 || key.i === 87) {
        const label = document.createElement('div');
        label.className = 'sp-key-label';
        label.textContent = `${key.noteName}${key.octave}`;
        el.appendChild(label);
      }

      whiteKeysContainer.appendChild(el);
      this.keyElements.set(key.i, el);
    });

    const blackKeyWidth = (1 / 52) * 100 * 0.60;
    blackKeys.forEach(key => {
      const el = document.createElement('div');
      el.className = 'sp-black-key';
      const centerPercent = (key.whiteBefore / 52) * 100;
      el.style.left = `${centerPercent - blackKeyWidth / 2}%`;
      el.style.width = `${blackKeyWidth}%`;
      el.onmousedown = (e: MouseEvent) => this.playNote(key.i, 2.5, this.velocityFromPoint(e.clientY, el.getBoundingClientRect()));
      el.ontouchstart = (e: TouchEvent) => { e.preventDefault(); this.playNote(key.i, 2.5, this.velocityFromPoint(e.touches[0].clientY, el.getBoundingClientRect())); };
      keysBed.appendChild(el);
      this.keyElements.set(key.i, el);
    });
  }

  private renderSoundSelector() {
    const selector = this.container.querySelector('#sp-sound-selector') as HTMLElement;
    const sounds = Object.keys(SOUND_PRESETS) as SoundType[];

    selector.innerHTML = sounds.map(type =>
      `<button class="sp-sound-btn ${this.soundType === type ? 'sp-selected' : ''}" data-type="${type}">${SOUND_PRESETS[type].name}</button>`
    ).join('');

    selector.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => this.setSoundType(btn.getAttribute('data-type') as SoundType);
    });
  }

  private updateUI() {
    const playBtn = this.container.querySelector('#sp-play-btn') as HTMLElement;
    const stopBtn = this.container.querySelector('#sp-stop-btn') as HTMLElement;
    const title = this.container.querySelector('#sp-title') as HTMLElement;
    const subtitle = this.container.querySelector('#sp-subtitle') as HTMLElement;
    const icon = this.container.querySelector('#sp-icon') as HTMLElement;

    if (this.isAutoPlaying) {
      icon.classList.add('sp-playing');
      subtitle.textContent = 'Automated Performance System';
    } else {
      icon.classList.remove('sp-playing');
      subtitle.textContent = 'Integrated Synthesis System';
    }

    if (this.currentScore) {
      playBtn.style.display = this.isAutoPlaying ? 'none' : 'flex';
      stopBtn.style.display = this.isAutoPlaying ? 'flex' : 'none';
      title.textContent = this.isAutoPlaying
        ? `PLAYING: ${this.currentScore.title}`
        : `SCORE: ${this.currentScore.title}`;
    }

    const volValue = this.container.querySelector('#sp-vol-value') as HTMLElement;
    const tempoValue = this.container.querySelector('#sp-tempo-value') as HTMLElement;
    if (volValue) volValue.textContent = `${Math.round(this.audio.volume * 100)}%`;
    if (tempoValue) tempoValue.textContent = `${this.tempoMultiplier.toFixed(2).replace(/0$/, '')}×`;

    this.renderSoundSelector();
  }
}

function readSetting(key: string): string | null {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

// Shown by default, except on small screens; the viewer's choice wins.
function readStaffSetting(): boolean {
  const saved = readSetting(STAFF_SETTING);
  if (saved !== null) return saved === '1';
  return window.innerHeight >= 600 && window.innerWidth >= 700;
}

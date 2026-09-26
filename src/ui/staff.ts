import { MusicNote, MusicScore } from '../types';

// A grand staff that scrolls past a fixed playhead, notes placed by time
// rather than by rhythmic notation: each note is a head at its pitch, with
// its accidental and ledger lines, and a bar as long as the key is held.
// The same drawing serves a score being played and notes played by hand.

// Letter (0–6, C to B) and alteration of each pitch class, for notes that
// carry no spelling: black keys are shown as sharps.
const DEFAULT_SPELLING: [number, number][] = [
  [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0],
];
const ACCIDENTALS: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 1: '♯', 2: '𝄪' };

// Diatonic positions (letter + 7 × octave) of the staff lines.
const MIDDLE_C = 28;                   // C4
const TREBLE_LINES = [30, 32, 34, 36, 38];   // E4 G4 B4 D5 F5
const BASS_LINES = [18, 20, 22, 24, 26];     // G2 B2 D3 F3 A3

// Room kept above the treble staff and below the bass staff when the notes
// need less: three ledger lines.
const DEFAULT_TOP = 44;                // above C6
const DEFAULT_BOTTOM = 12;             // below E1
// Half the space between the staves, in steps: middle C sits one ledger
// line away from each.
const GAP = 4;

// Seconds of history kept for notes played by hand.
const LIVE_HISTORY = 12;
// A note played by hand has no release: its bar is drawn this long.
const LIVE_HOLD = 0.3;

const COLORS = {
  background: '#0b1224',
  line: 'rgba(148,163,184,0.45)',
  barline: 'rgba(148,163,184,0.18)',
  clef: '#94a3b8',
  note: '#e2e8f0',
  past: 'rgba(226,232,240,0.35)',
  active: '#ec4899',
  live: '#f472b6',
  playhead: 'rgba(236,72,153,0.7)',
};

interface Placed {
  keyIndex: number;
  time: number;
  hold: number;
  letter: number;
  alter: number;
  live?: boolean;
}

export class ScrollingStaff {
  private ctx: CanvasRenderingContext2D;
  private score: MusicScore | null = null;
  private maxHold = 0;
  private live: { keyIndex: number; at: number }[] = [];
  // Highest and lowest written positions of the score: the staff's
  // vertical scale stretches so that none is cut off.
  private scoreTop = DEFAULT_TOP;
  private scoreBottom = DEFAULT_BOTTOM;
  private width = 0;
  private height = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  setScore(score: MusicScore | null) {
    this.score = score;
    this.maxHold = (score?.notes ?? []).reduce((m, n) => Math.max(m, n.hold ?? n.duration ?? 0), 0);
    this.scoreTop = DEFAULT_TOP;
    this.scoreBottom = DEFAULT_BOTTOM;
    for (const n of score?.notes ?? []) {
      const d = this.position(this.place(n.keyIndex, 0, 0, n));
      this.scoreTop = Math.max(this.scoreTop, d + 2);
      this.scoreBottom = Math.min(this.scoreBottom, d - 2);
    }
  }

  // Written position of a note: letter + 7 × octave, C4 being 28. B sharp
  // belongs to the octave below the C it sounds, C flat to the one above
  // the B.
  private position(n: Placed): number {
    return n.letter + 7 * Math.floor((n.keyIndex + 9 - n.alter) / 12);
  }

  /** A note played by hand, at `now` seconds on the clock passed to draw(). */
  addLiveNote(keyIndex: number, now: number) {
    this.live.push({ keyIndex, at: now });
    this.live = this.live.filter(n => now - n.at < LIVE_HISTORY);
  }

  /** Whether notes played by hand are still scrolling across the staff. */
  hasLiveNotes(now: number): boolean {
    return this.live.some(n => now - n.at < this.secondsBehind());
  }

  /** Matches the canvas to its displayed size; returns false if hidden. */
  resize(): boolean {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const ratio = window.devicePixelRatio || 1;
    if (this.width !== rect.width || this.height !== rect.height ||
        this.canvas.width !== Math.round(rect.width * ratio)) {
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = Math.round(rect.width * ratio);
      this.canvas.height = Math.round(rect.height * ratio);
    }
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return true;
  }

  /**
   * Draws the staff. `position` is the playback position in the score, in
   * seconds; `now` the clock of the notes played by hand, in seconds.
   */
  draw(position: number, now: number) {
    if (!this.resize()) return;
    const { ctx, width: w, height: h } = this;
    const g = this.geometry();

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    // Staff lines.
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    for (const d of TREBLE_LINES) this.hline(g.left, w, g.y(d, true));
    for (const d of BASS_LINES) this.hline(g.left, w, g.y(d, false));

    // Measure lines, then notes, both clipped to the scrolling area.
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.left, 0, w - g.left, h);
    ctx.clip();

    const xAt = (t: number) => g.playhead + (t - position) * g.pps;
    ctx.strokeStyle = COLORS.barline;
    for (const t of this.score?.measures ?? []) {
      const x = xAt(t);
      if (x < g.left || x > w) continue;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, g.y(TREBLE_LINES[4], true));
      ctx.lineTo(Math.round(x) + 0.5, g.y(BASS_LINES[0], false));
      ctx.stroke();
    }

    for (const n of this.visibleNotes(position, g)) {
      const color = n.time + n.hold < position ? COLORS.past
        : n.time <= position ? COLORS.active : COLORS.note;
      this.drawNote(n, xAt(n.time), xAt(n.time + n.hold), color, g);
    }
    // Notes played by hand appear at the playhead and drift left.
    for (const n of this.live) {
      const x = g.playhead + (n.at - now) * g.pps;
      if (x < g.left - g.pps * LIVE_HOLD) continue;
      this.drawNote(this.place(n.keyIndex, n.at, LIVE_HOLD), x, x + LIVE_HOLD * g.pps, COLORS.live, g);
    }
    ctx.restore();

    // Playhead and clefs.
    ctx.strokeStyle = COLORS.playhead;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.playhead, g.y(TREBLE_LINES[4], true) - g.step * 4);
    ctx.lineTo(g.playhead, g.y(BASS_LINES[0], false) + g.step * 4);
    ctx.stroke();
    this.drawClefs(g);
  }

  private secondsBehind(): number {
    const g = this.geometry();
    return (g.playhead - g.left) / g.pps + LIVE_HOLD;
  }

  // Vertical scale: `step` is half the distance between two staff lines.
  // The two staves sit around middle C, with room above and below for the
  // highest and lowest notes of the score and of those played by hand.
  private geometry() {
    const w = this.width;
    const h = this.height;
    let top = this.scoreTop;
    let bottom = this.scoreBottom;
    for (const n of this.live) {
      const d = this.position(this.place(n.keyIndex, 0, 0));
      top = Math.max(top, d + 2);
      bottom = Math.min(bottom, d - 2);
    }
    const step = Math.max(1.5, h / ((top - MIDDLE_C) + 2 * GAP + (MIDDLE_C - bottom)));
    // Middle C of each staff.
    const trebleC = (top - MIDDLE_C) * step;
    const bassC = trebleC + 2 * GAP * step;
    // The clef column keeps its size when the staff shrinks for wide scores.
    const left = Math.max(step * 9, 30);
    return {
      step,
      left,
      playhead: left + (w - left) * 0.2,
      // About 7 seconds across the staff, whatever its width.
      pps: Math.max(60, (w - left) / 7),
      // Treble notes hang from the treble staff, bass notes from the bass one.
      y: (d: number, treble: boolean) => (treble ? trebleC : bassC) - (d - MIDDLE_C) * step,
    };
  }

  private visibleNotes(position: number, g: ReturnType<ScrollingStaff['geometry']>): Placed[] {
    const notes = this.score?.notes ?? [];
    const from = position - (g.playhead - g.left) / g.pps - this.maxHold;
    const to = position + (this.width - g.playhead) / g.pps;
    // Notes are sorted by time: find the first one that may be visible.
    let lo = 0;
    let hi = notes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (notes[mid].time < from) lo = mid + 1; else hi = mid;
    }
    const out: Placed[] = [];
    for (let i = lo; i < notes.length && notes[i].time <= to; i++) {
      out.push(this.place(notes[i].keyIndex, notes[i].time, notes[i].hold ?? notes[i].duration ?? 0.5, notes[i]));
    }
    return out;
  }

  private place(keyIndex: number, time: number, hold: number, spelled?: MusicNote): Placed {
    const [letter, alter] = spelled?.letter !== undefined
      ? [spelled.letter, spelled.alter ?? 0]
      : DEFAULT_SPELLING[(keyIndex + 9) % 12];
    return { keyIndex, time, hold, letter, alter };
  }

  private drawNote(n: Placed, x: number, xEnd: number, color: string, g: ReturnType<ScrollingStaff['geometry']>) {
    const { ctx, step } = { ctx: this.ctx, step: g.step };
    const d = this.position(n);
    // The written note decides the staff: C flat 4 sits with the treble
    // notes around it, though it sounds B3.
    const treble = d >= MIDDLE_C;
    const y = g.y(d, treble);

    // Ledger lines, beyond the staff the note belongs to.
    const lines = treble ? TREBLE_LINES : BASS_LINES;
    const ledgers: number[] = [];
    for (let l = lines[4] + 2; l <= d; l += 2) ledgers.push(l);
    for (let l = lines[0] - 2; l >= d; l -= 2) ledgers.push(l);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (const l of ledgers) this.hline(x - step * 1.9, x + step * 1.9, g.y(l, treble));

    // Held length.
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    const barEnd = Math.max(x + step, xEnd);
    ctx.fillRect(x, y - step * 0.55, barEnd - x, step * 1.1);
    ctx.globalAlpha = 1;

    // Head.
    ctx.beginPath();
    ctx.ellipse(x, y, step * 1.3, step * 0.9, -0.35, 0, Math.PI * 2);
    ctx.fill();

    const accidental = ACCIDENTALS[n.alter];
    if (accidental) {
      ctx.font = `${Math.round(step * 3.8)}px "Noto Music", "Segoe UI Symbol", "Apple Symbols", serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(accidental, x - step * 1.6, y);
    }
  }

  private drawClefs(g: ReturnType<ScrollingStaff['geometry']>) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, g.left, this.height);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    for (const d of TREBLE_LINES) this.hline(g.step, g.left, g.y(d, true));
    for (const d of BASS_LINES) this.hline(g.step, g.left, g.y(d, false));
    // Brace-like bar joining the two staves.
    ctx.beginPath();
    ctx.moveTo(g.step + 0.5, g.y(TREBLE_LINES[4], true));
    ctx.lineTo(g.step + 0.5, g.y(BASS_LINES[0], false));
    ctx.stroke();

    ctx.fillStyle = COLORS.clef;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const font = (size: number) => `${Math.round(size)}px "Noto Music", "Segoe UI Symbol", "Apple Symbols", serif`;
    // The treble clef curls around G4, the bass clef's dots frame F3.
    ctx.font = font(g.step * 8.5);
    ctx.fillText('𝄞', g.step * 1.8, g.y(30, true) + g.step * 1.6);
    ctx.font = font(g.step * 7.2);
    ctx.fillText('𝄢', g.step * 1.8, g.y(24, false) + g.step * 2.6);
  }

  private hline(x1: number, x2: number, y: number) {
    const yy = Math.round(y) + 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, yy);
    this.ctx.lineTo(x2, yy);
    this.ctx.stroke();
  }
}

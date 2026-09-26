import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { MusicScore } from '../types';
import { mscxToMusicXml } from '../core/mscx-to-musicxml';

// The score in full notation, engraved by OpenSheetMusicDisplay on a single
// line that slides past the playhead as the piece plays. This module is
// loaded only when the full notation is first asked for: the engraver is by
// far the heaviest part of the application.
//
// The line is engraved in stretches of a few measures laid end to end. A
// whole piece on one line would overrun the engraver (its layout gives out
// after a few hundred measures), and stretches let the start show at once
// while the rest is engraved in the background.

const STRETCH = 16;            // measures per stretch
// OpenSheetMusicDisplay's drawing unit, in pixels at zoom 1.
const UNIT = 10;
// Room above the top staff line, as a share of the viewport height.
const TOP_ROOM = 0.3;
// The line follows its target with this much inertia, in seconds: the
// engraver spaces notes by looks, not by duration, and following it exactly
// would change speed at every note.
const SMOOTHING = 0.12;

interface MeasureMap {
  length: number;                       // whole notes
  points: { t: number; x: number }[];   // time in the measure → x, from 0 to length
}

interface Stretch {
  left: number;                         // x on the line, unscaled pixels
  end: number;                          // x of its closing barline on the line
}

export class NotationView {
  private measures: (MeasureMap | undefined)[] = [];
  private stretches: Stretch[] = [];
  private scale = 1;
  private staffHeight = 0;              // top to bottom staff line, unscaled
  private score: MusicScore | null = null;
  private doc: Document | null = null;
  private loadId = 0;
  private shownX: number | null = null;
  private shownAt = 0;

  constructor(private viewport: HTMLElement, private sheet: HTMLElement) {}

  /** Engraves the start of the score; the rest follows in the background. */
  async load(score: MusicScore) {
    if (!score.source) throw new Error('This score has no notation to show');
    const id = ++this.loadId;
    this.score = score;
    const xml = score.source.format === 'mscx' ? mscxToMusicXml(score.source.text) : score.source.text;
    this.doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (this.doc.querySelector('parsererror')) throw new Error('The score is not valid MusicXML');
    const firstPart = this.doc.querySelector('score-partwise > part');
    const count = firstPart ? measuresOf(firstPart).length : 0;
    if (!count) throw new Error('The score has no measures');

    this.sheet.innerHTML = '';
    this.measures = new Array(count);
    this.stretches = [];
    this.staffHeight = 0;
    await this.engraveStretch(0, Math.min(count, STRETCH), id);
    this.fit();
    // The rest, stretch by stretch, leaving the page responsive in between.
    void (async () => {
      for (let start = STRETCH; start < count && id === this.loadId; start += STRETCH) {
        await new Promise(r => setTimeout(r, 0));
        if (id !== this.loadId) return;
        try {
          await this.engraveStretch(start, Math.min(count, start + STRETCH), id);
        } catch (err) {
          console.error('[SodorPiano] engraving stopped at measure', start + 1, err);
          return;
        }
      }
    })();
  }

  /** Scales the engraving to the height of the viewport. */
  fit() {
    const available = this.viewport.clientHeight;
    if (!available || !this.staffHeight) return;
    // The staves take about half the height, leaving room for notes above
    // and below them.
    this.scale = Math.max(0.3, Math.min(1.4, (available * 0.5) / this.staffHeight));
    for (const box of Array.from(this.sheet.children)) this.place(box as HTMLElement);
  }

  /**
   * Places the engraving so that `position` (seconds) sits at the playhead.
   * While playing, `lead` is how much score time SMOOTHING seconds make at
   * the current tempo: aiming that far ahead cancels the lag of the inertia,
   * so that notes still cross the playhead as they sound.
   */
  draw(position: number, playheadX: number, playing: boolean, lead = SMOOTHING) {
    const target = this.xAt(playing ? position + lead : position) * this.scale;
    const now = performance.now() / 1000;
    let x = target;
    // Glide towards the target; leap when the music does (a repeat, a jump)
    // or when not playing.
    if (playing && this.shownX !== null && Math.abs(target - this.shownX) < this.viewport.clientWidth / 2) {
      const dt = Math.min(0.1, Math.max(0, now - this.shownAt));
      x = this.shownX + (target - this.shownX) * (1 - Math.exp(-dt / SMOOTHING));
    }
    this.shownX = x;
    this.shownAt = now;
    this.sheet.style.transform = `translate(${playheadX - x}px, 0) scale(${this.scale})`;
  }

  private async engraveStretch(start: number, end: number, id: number) {
    const box = document.createElement('div');
    box.style.position = 'absolute';
    this.sheet.appendChild(box);
    const osmd = new OpenSheetMusicDisplay(box, {
      backend: 'svg',
      autoResize: false,
      renderSingleHorizontalStaffline: true,
      drawTitle: false,
      drawSubtitle: false,
      drawComposer: false,
      drawLyricist: false,
      drawCredits: false,
      drawPartNames: false,
      drawPartAbbreviations: false,
      drawMetronomeMarks: false,
      drawMeasureNumbers: true,
      // Files converted from MuseScore carry no beams: let the engraver
      // group the notes by beat.
      autoBeam: this.score?.source?.format === 'mscx',
    });
    await osmd.load(stretchXml(this.doc!, start, end));
    if (id !== this.loadId) { box.remove(); return; }
    osmd.Zoom = 1;
    osmd.render();

    // Where the stretch goes on the line — its staff lines taking over
    // where the previous stretch's end — and how high its staves sit.
    const system = osmd.GraphicSheet.MusicPages[0]?.MusicSystems[0];
    const lines = system?.StaffLines ?? [];
    const staffLeft = (lines[0]?.PositionAndShape.AbsolutePosition.x ?? 0) * UNIT;
    const previous = this.stretches[this.stretches.length - 1];
    const left = previous ? previous.end - staffLeft : 0;
    const top = (lines[0]?.PositionAndShape.AbsolutePosition.y ?? 0) * UNIT;
    const last = lines[lines.length - 1];
    const bottom = last ? (last.PositionAndShape.AbsolutePosition.y + last.PositionAndShape.Size.height) * UNIT : top;
    if (!this.staffHeight) this.staffHeight = Math.max(40, bottom - top);
    box.dataset.left = String(left);
    box.dataset.staffTop = String(top);
    this.place(box);

    // Playback time within each measure → x on the line.
    let stretchEnd = left;
    osmd.GraphicSheet.MeasureList.forEach((staffMeasures, i) => {
      const map = measureMap(staffMeasures.filter(Boolean));
      if (!map) return;
      for (const p of map.points) p.x += left;
      this.measures[start + i] = map;
      stretchEnd = Math.max(stretchEnd, map.points[map.points.length - 1].x);
    });
    this.stretches.push({ left, end: stretchEnd });
  }

  // Sets a stretch at its place on the line, its staves at a common height.
  private place(box: HTMLElement) {
    const topRoom = (this.viewport.clientHeight * TOP_ROOM) / this.scale;
    box.style.left = `${box.dataset.left}px`;
    box.style.top = `${topRoom - Number(box.dataset.staffTop)}px`;
  }

  // Horizontal position on the line (unscaled pixels) of a playback
  // position: the measure played then, and how far into it.
  private xAt(position: number): number {
    const starts = this.score?.measures ?? [];
    const order = this.score?.measureOrder ?? [];
    if (!starts.length) return 0;
    if (position <= starts[0]) return this.measures[order[0] ?? 0]?.points[0].x ?? 0;

    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= position) lo = mid; else hi = mid - 1;
    }
    const measure = this.measures[order[lo] ?? lo];
    // Not engraved yet: wait at the end of what is.
    if (!measure) return this.stretches[this.stretches.length - 1]?.end ?? 0;
    const next = starts[lo + 1] ?? this.lastEnd(starts[lo]);
    const fraction = Math.max(0, Math.min(1, (position - starts[lo]) / Math.max(1e-6, next - starts[lo])));
    const t = fraction * measure.length;
    // Glide on to the first note of the next measure rather than stopping at
    // the barline: the line would otherwise jump by the gap between them at
    // every measure. Only a repeat or a jump makes it leap.
    const following = order[lo + 1] === (order[lo] ?? lo) + 1 ? this.measures[order[lo + 1]] : undefined;
    const p = following
      ? [...measure.points.slice(0, -1), { t: measure.length, x: following.points[0].x }]
      : measure.points;
    let k = 0;
    while (k < p.length - 2 && p[k + 1].t <= t) k++;
    const a = p[k];
    const b = p[k + 1] ?? a;
    return b.t > a.t ? a.x + (b.x - a.x) * (t - a.t) / (b.t - a.t) : a.x;
  }

  // End of the last measure: when its last note is released.
  private lastEnd(start: number): number {
    const notes = this.score?.notes ?? [];
    return Math.max(start + 1, ...notes.slice(-64).map(n => n.time + (n.hold ?? n.duration ?? 0)));
  }
}

// Where the notes of one measure stand, all staves together.
function measureMap(measures: any[]): MeasureMap | undefined {
  const first = measures[0];
  if (!first) return undefined;
  const length = first.parentSourceMeasure?.Duration?.RealValue || 1;
  const box = first.PositionAndShape;
  const left = box.AbsolutePosition.x * UNIT;
  const right = left + box.Size.width * UNIT;
  const byTime = new Map<number, number>();
  for (const m of measures) {
    for (const entry of m.staffEntries) {
      const t = entry.relInMeasureTimestamp.RealValue;
      const x = entry.PositionAndShape.AbsolutePosition.x * UNIT;
      byTime.set(t, Math.min(byTime.get(t) ?? Infinity, x));
    }
  }
  const points = [...byTime].map(([t, x]) => ({ t, x })).sort((a, b) => a.t - b.t);
  // The measure opens after its clef and signatures, and closes at its barline.
  if (!points.length || points[0].t > 0) {
    points.unshift({ t: 0, x: left + (first.beginInstructionsWidth ?? 0) * UNIT });
  }
  points.push({ t: length, x: right });
  return { length, points };
}

const measuresOf = (part: Element) => Array.from(part.children).filter(c => c.tagName === 'measure');

// MusicXML for measures `start` to `end` only. The first of them is given
// the clefs, key and time signature in force there, as a new line would be.
function stretchXml(doc: Document, start: number, end: number): string {
  const root = doc.documentElement;
  const out = document.implementation.createDocument(null, root.tagName, null);
  const outRoot = out.documentElement;
  for (const attr of Array.from(root.attributes)) outRoot.setAttribute(attr.name, attr.value);
  for (const el of Array.from(root.children)) {
    if (el.tagName !== 'part') {
      outRoot.appendChild(out.importNode(el, true));
      continue;
    }
    const part = out.importNode(el, false) as Element;
    const measures = measuresOf(el);
    const carried = attributesBefore(measures, start, out);
    measures.slice(start, end).forEach((m, i) => {
      const copy = out.importNode(m, true) as Element;
      copy.removeAttribute('implicit');
      if (i === 0 && carried) copy.insertBefore(carried, copy.firstChild);
      part.appendChild(copy);
    });
    outRoot.appendChild(part);
  }
  // The engraver only takes text that opens with the XML declaration.
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(out);
}

// The attributes in force at the start of a measure: divisions, key, time,
// number of staves and the clef of each staff, as last set before it.
function attributesBefore(measures: Element[], index: number, doc: Document): Element | null {
  if (index === 0) return null;
  const last = new Map<string, Element>();
  for (const measure of measures.slice(0, index)) {
    for (const attributes of Array.from(measure.children).filter(c => c.tagName === 'attributes')) {
      for (const el of Array.from(attributes.children)) {
        if (el.tagName === 'clef') last.set(`clef${el.getAttribute('number') ?? '1'}`, el);
        else if (['divisions', 'key', 'time', 'staves'].includes(el.tagName)) last.set(el.tagName, el);
      }
    }
  }
  if (!last.size) return null;
  const out = doc.createElement('attributes');
  // MusicXML order: divisions, key, time, staves, clefs. Like a new line,
  // the stretch shows clefs and key, but not the time signature again.
  for (const name of ['divisions', 'key', 'time', 'staves']) {
    const el = last.get(name);
    if (!el) continue;
    const copy = doc.importNode(el, true) as Element;
    if (name === 'time') copy.setAttribute('print-object', 'no');
    out.appendChild(copy);
  }
  [...last].filter(([k]) => k.startsWith('clef')).sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, el]) => out.appendChild(doc.importNode(el, true)));
  return out;
}

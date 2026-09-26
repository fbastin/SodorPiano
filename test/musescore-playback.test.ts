import { describe, expect, it } from 'vitest';
import { MusicScore } from '../src/types';
import { fixture, loadFixture, sorted } from './helpers';

// MuseScore's MIDI export of a score (src/importexport/midi/tests), as
// events "Tick = … Type = … Pitch = … Velocity = … Channel = …" at 480
// ticks per quarter note: notes on and off (type 144) and the sustain
// pedal (controller 64, type 176).
function midiReference(name: string) {
  const events = fixture(`${name}-ref.txt`).toString().trim().split('\n').map(line => {
    const [tick, type, pitch, velocity, channel] = line.match(/-?\d+/g)!.map(Number);
    return { tick, type, pitch, velocity, channel };
  });
  const open = new Map<string, { on: number; velocity: number; pitch: number }>();
  const notes: { on: number; off: number; velocity: number; pitch: number }[] = [];
  const pedal: [number, number][] = [];
  let down: number | null = null;
  for (const e of events) {
    if (e.type === 176 && e.pitch === 64) {
      if (e.velocity >= 64) down = e.tick;
      else if (down !== null) { pedal.push([down, e.tick]); down = null; }
    }
    if (e.type !== 144) continue;
    const key = `${e.channel}:${e.pitch}`;
    if (e.velocity > 0) open.set(key, { on: e.tick, velocity: e.velocity, pitch: e.pitch });
    else if (open.has(key)) { notes.push({ ...open.get(key)!, off: e.tick }); open.delete(key); }
  }
  // When the damper falls: at the key's release, or when the pedal lifts.
  const damper = (tick: number) => pedal.find(([d, u]) => tick >= d && tick < u)?.[1] ?? tick;
  return notes.sort((a, b) => a.on - b.on || a.pitch - b.pitch).map(n => ({ ...n, fall: damper(n.off) }));
}

// Our notes in ticks, the tempo taken from the first note after the start.
function inTicks(score: MusicScore, reference: { on: number }[]) {
  const notes = sorted(score.notes);
  const firstTime = notes.find(n => n.time > 0)!.time;
  const firstTick = reference.find(n => n.on > 0)!.on;
  const secondsPerTick = firstTime / firstTick;
  return notes.map(n => ({
    on: n.time / secondsPerTick,
    fall: (n.time + (n.duration ?? 0)) / secondsPerTick,
    velocity: (n.velocity ?? 0) * 127,
    pitch: n.keyIndex + 21,
  }));
}

describe('playback, against MuseScore\'s MIDI export', () => {
  for (const name of ['testPedal', 'testRepeatsDynamics', 'testPlayArticulation', 'testArticulationDynamics']) {
    it(name, async () => {
      const reference = midiReference(name);
      const ours = inTicks(await loadFixture(`${name}.mscx`), reference);
      expect(ours.length).toBe(reference.length);
      reference.forEach((r, i) => {
        const o = ours[i];
        expect(o.pitch, `note ${i}`).toBe(r.pitch);
        expect(Math.abs(o.on - r.on), `start of note ${i}`).toBeLessThan(3);
        expect(Math.abs(o.velocity - r.velocity), `velocity of note ${i}`).toBeLessThan(1.5);
        // MuseScore 3 does not shorten a note both staccato and accented;
        // we do, as written. Lengths are only compared elsewhere.
        if (name !== 'testArticulationDynamics') {
          expect(Math.abs(o.fall - r.fall), `end of note ${i}`).toBeLessThanOrEqual(480 * 0.1 + 2);
        }
      });
    });
  }
});

// Velocities MuseScore gives the notes under hairpins, from
// src/engraving/tests/midi/midirenderer_tests.cpp: [tick, pitch, velocity].
const HAIRPINS: Record<string, [number, number, number][]> = {
  hairpin_simple: [[0, 59, 49], [480, 60, 64], [960, 62, 80], [1440, 64, 96]],
  hairpin_start_dynamic_away: [[0, 60, 112], [480, 59, 112], [960, 55, 112], [1440, 52, 91], [1920, 50, 70], [2400, 48, 49]],
  hairpin_end_dynamic_away: [[0, 60, 112], [480, 59, 104], [960, 55, 96], [1440, 52, 96], [1920, 48, 49]],
  hairpin_dynamic_jump: [[0, 55, 96], [480, 57, 100], [960, 60, 104], [1440, 62, 108], [1920, 60, 80],
    [3840, 55, 96], [4320, 57, 92], [4800, 60, 88], [5280, 62, 84], [5760, 60, 112]],
  hairpin_dynamic_inside: [[0, 60, 80], [480, 62, 85], [960, 64, 90], [1440, 65, 49], [1920, 67, 49], [2400, 69, 96], [2880, 71, 96]],
  hairpin_two_instruments: [[0, 60, 80], [480, 64, 84], [960, 67, 88], [1440, 72, 92],
    [0, 55, 80], [480, 55, 80], [960, 55, 80], [1440, 55, 80]],
};

describe('hairpins, against MuseScore\'s MIDI renderer', () => {
  for (const [name, expected] of Object.entries(HAIRPINS)) {
    it(name, async () => {
      const score = await loadFixture(`${name}.mscx`);
      const secondsPerTick = 0.5 / 480;   // 120 bpm
      for (const [tick, pitch, velocity] of expected) {
        const note = score.notes.find(n => Math.abs(n.time / secondsPerTick - tick) < 2 && n.keyIndex + 21 === pitch);
        expect(note, `note ${pitch} at ${tick}`).toBeDefined();
        // MuseScore truncates velocities to integers.
        expect(Math.floor(note!.velocity! * 127 + 1e-6), `velocity of ${pitch} at ${tick}`).toBe(velocity);
      }
    });
  }
});

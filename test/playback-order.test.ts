import { describe, expect, it } from 'vitest';
import { MeasureRepeat, noRepeat, playbackOrder } from '../src/core/timeline';

// Measures written in shorthand, one token per measure:
//   [  start-repeat barline      ]  or ]3  end-repeat barline (times played)
//   v1 or v1,2  first measure of a one-measure volta with those endings
//   .  plain measure
function measures(spec: string): MeasureRepeat[] {
  return spec.split(' ').map(t => {
    const r = noRepeat();
    r.forward = t.includes('[');
    const end = /\](\d*)/.exec(t);
    if (end) r.backward = Number(end[1]) || 2;
    const volta = /v([\d,]+)/.exec(t);
    if (volta) r.voltas.push({ endings: volta[1].split(',').map(Number), length: 1, open: false });
    return r;
  });
}

const order = (spec: string) => playbackOrder(measures(spec)).join(' ');

describe('playback order', () => {
  it('plays straight through without repeats', () => {
    expect(order('. . .')).toBe('0 1 2');
  });

  it('plays first and second endings', () => {
    expect(order('. . v1] v2 .')).toBe('0 1 2 0 1 3 4');
  });

  it('keeps a repeat barline outside the volta', () => {
    expect(order('. . v1 ] v2 .')).toBe('0 1 2 3 0 1 3 4 5');
  });

  it('stops when no volta fits the pass', () => {
    expect(order('. v1] v2]')).toBe('0 1 0 2 0');
  });

  it('returns to the section start from a :| without its own |:, as MuseScore does', () => {
    expect(order('] ]')).toBe('0 0 1 0 1');
  });

  it('returns to the start-repeat barline', () => {
    expect(order('. [ . ] .')).toBe('0 1 2 3 1 2 3 4');
  });

  it('plays a section three times', () => {
    expect(order('[ .]3 .')).toBe('0 1 0 1 0 1 2');
  });

  it('plays endings 1 and 2, then 3', () => {
    expect(order('[ v1,2]3 v3 .')).toBe('0 1 0 1 0 2 3');
  });

  it('plays nested repeats again on every pass of the outer one', () => {
    // |: A |: B C :| D :| E
    expect(order('[ [ .] ] .')).toBe('0 1 2 1 2 3 0 1 2 1 2 3 4');
  });

  it('gives the voltas after a nested repeat to the outer one', () => {
    // |: A |: B :| C [1. D :|] [2. E] F
    expect(order('[ [ ] . v1] v2 .')).toBe('0 1 2 1 2 3 4 0 1 2 1 2 3 5 6');
  });

  it('replays the voltas of an inner repeat on each outer pass', () => {
    // |: A |: B [1. C :|] [2. D] E :| F
    expect(order('[ [ v1] v2 ] .')).toBe('0 1 2 1 3 4 0 1 2 1 3 4 5');
  });

  it('nests three repeats deep', () => {
    // |: A |: B |: C :| D :| E :| F
    expect(order('[ [ [] ] ] .')).toBe('0 1 2 2 3 1 2 2 3 4 0 1 2 2 3 1 2 2 3 4 5');
  });
});

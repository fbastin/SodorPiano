import { describe, expect, it } from 'vitest';
import { scoreFromQuery } from '../src/core/score-url';

const ORIGIN = 'https://www.example.org';

describe('score named in the address', () => {
  it('opens a score on the same site', () => {
    expect(scoreFromQuery('?score=/music/scales.musicxml', ORIGIN)).toBe('https://www.example.org/music/scales.musicxml');
    expect(scoreFromQuery('?score=pieces/a%20b.mscz', ORIGIN)).toBe('https://www.example.org/pieces/a%20b.mscz');
    expect(scoreFromQuery(`?score=${ORIGIN}/x.mxl`, ORIGIN)).toBe('https://www.example.org/x.mxl');
  });

  it('refuses anything from elsewhere', () => {
    expect(scoreFromQuery('?score=https://other.example.com/x.mscz', ORIGIN)).toBeNull();
    expect(scoreFromQuery('?score=//other.example.com/x.mscz', ORIGIN)).toBeNull();
    expect(scoreFromQuery('?score=javascript:alert(1)', ORIGIN)).toBeNull();
    expect(scoreFromQuery('?score=data:text/xml,<x/>', ORIGIN)).toBeNull();
  });

  it('does nothing without a score', () => {
    expect(scoreFromQuery('', ORIGIN)).toBeNull();
    expect(scoreFromQuery('?score=', ORIGIN)).toBeNull();
  });
});

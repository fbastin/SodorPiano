import { describe, expect, it } from 'vitest';
import { mscxMeasureOrder } from '../src/core/mscx';
import { fixture } from './helpers';

// MuseScore's own repeat tests: for each score, the measures in the order
// MuseScore plays them, as listed in src/engraving/tests/repeat_tests.cpp.
const expectations = [...fixture('repeat_tests.cpp').toString()
  .matchAll(/repeat\("([^"]+)",\s*u"([^"]*)"\)/g)]
  .map(([, file, sequence]) => ({ file, sequence: sequence.replace(/\s/g, '') }));

// Jumps landing inside a first ending: MuseScore then replays the repeat
// structure by rules of its own, not reproduced.
const KNOWN_DIFFERENCES = new Set(['repeat48.mscx', 'repeat52.mscx', 'repeat53.mscx']);

// Measures as MuseScore numbers them: from 1 again after each section break.
function measureNumbers(xml: string): number[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const staff = Array.from(doc.querySelectorAll('museScore > Score > Staff'))
    .find(s => s.querySelector(':scope > Measure'))!;
  const numbers: number[] = [];
  let n = 0;
  for (const el of Array.from(staff.children)) {
    if (el.tagName === 'Measure') numbers.push(++n);
    const breaks = Array.from(el.querySelectorAll(':scope > LayoutBreak > subtype'));
    if (breaks.some(b => b.textContent?.trim() === 'section')) n = 0;
  }
  return numbers;
}

describe('repeats and jumps, against MuseScore', () => {
  it('reads all the expectations', () => {
    expect(expectations.length).toBe(69);
  });

  for (const { file, sequence } of expectations) {
    const test = KNOWN_DIFFERENCES.has(file) ? it.fails : it;
    test(file, () => {
      const xml = fixture(file).toString();
      const numbers = measureNumbers(xml);
      expect(mscxMeasureOrder(xml).map(i => numbers[i]).join(';')).toBe(sequence);
    });
  }
});

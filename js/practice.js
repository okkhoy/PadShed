import { getRudiment, parsePattern } from "./rudiments.js";
import { getMeter, getRhythm } from "./meter.js";

// Eight visible measures; a rotation of three takes three pages to return
// to both the beginning of the rotation and the beginning of the page.
export function buildPracticeSequence(rudiment, subdivision, rotation = [], meterValue = "4/4") {
  const meter = getMeter(meterValue);
  const rhythm = getRhythm(subdivision, meter.id);
  const notesPerBar = rhythm.notesPerBar;
  const ids = rotation.length ? rotation : [rudiment.id];
  const bars = ids.length === 3 ? 24 : 8;
  const sources = ids.map(id => {
    const source = getRudiment(id);
    return { source, pattern: parsePattern(source.pattern) };
  });
  const sequence = Array.from({ length: bars * notesPerBar }, (_, index) => {
    const bar = Math.floor(index / notesPerBar);
    const { source, pattern } = sources[bar % sources.length];
    const patternIndex = rotation.length ? index % notesPerBar : index;
    return {
      ...pattern[patternIndex % pattern.length],
      sequenceIndex: index,
      rudimentId: source.id,
      rudimentName: source.name,
    };
  });
  return { sequence, pattern: parsePattern(rudiment.pattern), notesPerBar,
    subdivision: rhythm.subdivision, bars: 8, beatsPerBar: meter.beatsPerBar, meter, rhythm };
}

export function createTempoCurve({ enabled, bpm, min, max, step, bars }) {
  if (!enabled || min === max) return () => enabled ? min : bpm;
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const steps = Math.ceil((high - low) / step);
  return (bar) => {
    const phase = Math.floor(Math.max(0, bar) / bars) % (steps * 2);
    const position = phase <= steps ? phase : steps * 2 - phase;
    return Math.min(high, low + position * step);
  };
}

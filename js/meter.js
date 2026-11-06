export const METER_IDS = ["2/4", "3/4", "4/4", "5/4", "6/4", "7/4", "6/8", "9/8", "12/8"];

// Numeric inputs are accepted for settings saved before denominators existed.
export function getMeter(value = "4/4") {
  const id = String(value).includes("/") ? String(value) : `${value}/4`;
  const [numerator, denominator] = id.split("/").map(Number);
  if (!Number.isInteger(numerator) || numerator < 1 || numerator > 12 ||
      ![2, 4, 8, 16].includes(denominator)) return getMeter("4/4");
  const compound = denominator === 8 && [6, 9, 12].includes(numerator);
  return {
    id, numerator, denominator, compound,
    beatsPerBar: compound ? numerator / 3 : numerator,
    beatQuarterLength: compound ? 1.5 : 4 / denominator,
    beatName: compound ? "dotted quarter" : ({ 2: "half", 4: "quarter", 8: "eighth", 16: "sixteenth" })[denominator],
    beamGroup: compound ? [3, 8] : [1, denominator],
  };
}

export function getRhythm(value, meterValue = "4/4") {
  const meter = getMeter(meterValue);
  let subdivision = [1, 2, 3, 4].includes(Number(value)) ? Number(value) : 4;
  // Three regular eighths already fill a compound beat; they are not tuplets.
  if (meter.compound && subdivision === 3) subdivision = 2;
  const base = {
    1: { duration: 12, type: "quarter", vexDuration: "q", name: "Quarter notes", label: "Quarter · 1/4" },
    2: { duration: 6, type: "eighth", vexDuration: "8", name: "Eighth notes", label: "Eighth · 1/8" },
    3: { duration: 4, type: "eighth", vexDuration: "8", name: "Triplet eighths", label: "Triplet eighth · 1/8T" },
    4: { duration: 3, type: "16th", vexDuration: "16", name: "Sixteenth notes", label: "Sixteenth · 1/16" },
  }[subdivision];
  const dotted = meter.compound && subdivision === 1;
  const ticksPerBeat = meter.compound ? ({ 1: 1, 2: 3, 4: 6 })[subdivision] : subdivision;
  return {
    ...base, subdivision, ticksPerBeat, group: ticksPerBeat,
    duration: dotted ? 18 : base.duration,
    vexDuration: dotted ? "qd" : base.vexDuration,
    name: dotted ? "Dotted quarter notes" : base.name,
    label: dotted ? "Dotted quarter · 1/4." : base.label,
    dotted, tuplet: !meter.compound && subdivision === 3,
    notesPerBar: meter.beatsPerBar * ticksPerBeat,
  };
}

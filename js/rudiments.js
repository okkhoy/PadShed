export const FAMILIES = [
  { id: "rolls", name: "Rolls", start: 1, end: 15, color: "#fb7185" },
  { id: "diddles", name: "Diddles", start: 16, end: 19, color: "#f5a524" },
  { id: "flams", name: "Flams", start: 20, end: 30, color: "#38bdf8" },
  { id: "drags", name: "Drags", start: 31, end: 40, color: "#a3e635" },
];

export const TIME_SIGNATURES = [2, 3, 4, 5, 6, 7];

export function normalizeBeatsPerBar(value) {
  const beats = Number(value);
  return TIME_SIGNATURES.includes(beats) ? beats : 4;
}

export const SUBDIVISIONS = {
  1: { value: 1, label: "1/4", name: "Quarter notes", badge: "Quarter notes", short: "1/4" },
  2: { value: 2, label: "1/8", name: "Eighth notes", badge: "8th notes", short: "1/8" },
  3: { value: 3, label: "1/8T", name: "Triplet eighths", badge: "Triplet 8ths", short: "1/8T" },
  4: { value: 4, label: "1/16", name: "Sixteenth notes", badge: "16th notes", short: "1/16" },
};

export const RUDIMENTS = [
  {
    id: "single-stroke-roll",
    number: 1,
    name: "Single Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R L R L R L R L",
    description: "The foundation of hand-to-hand playing: even alternating singles with no weak links.",
    tip: "Keep both sticks low and listen for identical tone from each hand.",
  },
  {
    id: "single-stroke-four",
    number: 2,
    name: "Single Stroke Four",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R L R L",
    description: "Four alternating singles grouped tightly enough to feel like one gesture.",
    tip: "Place the fourth stroke on the beat and let the first three lead into it.",
  },
  {
    id: "single-stroke-seven",
    number: 3,
    name: "Single Stroke Seven",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R L R L R L R!",
    description: "Seven alternating singles that resolve into a final accent.",
    tip: "Count the full group out loud so the last note never gets clipped.",
  },
  {
    id: "multiple-bounce-roll",
    number: 4,
    name: "Multiple Bounce Roll",
    family: "Rolls",
    defaultSubdivision: 2,
    pattern: "R~ L~ R~ L~ R~ L~ R~ L~",
    description: "A relaxed buzz stroke in each hand, alternating evenly between the hands.",
    tip: "Think of a cushion of sound, not individual strokes. Let the stick bounce.",
  },
  {
    id: "triple-stroke-roll",
    number: 5,
    name: "Triple Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 3,
    pattern: "R R R L L L",
    description: "Three controlled strokes per hand, usually heard with a triplet pulse.",
    tip: "Keep all three strokes the same height. The third is not a throwaway.",
  },
  {
    id: "double-stroke-open-roll",
    number: 6,
    name: "Double Stroke Open Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L L",
    description: "Two clean strokes per hand at an open, articulated tempo.",
    tip: "Use the rebound for the second stroke; avoid a squeezed grip.",
  },
  {
    id: "five-stroke-roll",
    number: 7,
    name: "Five Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R!",
    description: "Two doubles closed out by an accented single. Alternate the lead as you repeat.",
    tip: "Aim the accent slightly into the click rather than on top of it.",
  },
  {
    id: "six-stroke-roll",
    number: 8,
    name: "Six Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 3,
    pattern: "R! L L R R L!",
    description: "A single, two doubles, and a single, framed by two accents.",
    tip: "The opening and closing singles should match in weight.",
  },
  {
    id: "seven-stroke-roll",
    number: 9,
    name: "Seven Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L!",
    description: "Three doubles resolve on a single accent. Repeat leading with the left hand.",
    tip: "Don't let tempo turn the doubles into a buzz. Keep every stroke distinct.",
  },
  {
    id: "nine-stroke-roll",
    number: 10,
    name: "Nine Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L L R!",
    description: "Four doubles and a final accented single. A longer test of rebound control.",
    tip: "Stay relaxed through the doubles so the final single lands cleanly.",
  },
  {
    id: "ten-stroke-roll",
    number: 11,
    name: "Ten Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L L R! L!",
    description: "A five-double roll that closes with a pair of accented strokes.",
    tip: "Treat the last two notes as one deliberate statement.",
  },
  {
    id: "eleven-stroke-roll",
    number: 12,
    name: "Eleven Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L L R R L!",
    description: "Five doubles and a final accent. Keep the roll open as the group grows.",
    tip: "Count the doubles in pairs; the odd ending should still feel inevitable.",
  },
  {
    id: "thirteen-stroke-roll",
    number: 13,
    name: "Thirteen Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L L R R L L R!",
    description: "Six doubles plus an accented single. Space and patience are the whole game.",
    tip: "Start slower than you think you need. Let the final accent arrive.",
  },
  {
    id: "fifteen-stroke-roll",
    number: 14,
    name: "Fifteen Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L L R R L L R R L!",
    description: "Seven doubles resolve on one accented single. A long, even ribbon of sound.",
    tip: "Keep the wrists loose and the rebound height consistent from start to finish.",
  },
  {
    id: "seventeen-stroke-roll",
    number: 15,
    name: "Seventeen Stroke Roll",
    family: "Rolls",
    defaultSubdivision: 4,
    pattern: "R R L L R R L L R R L L R R L L R!",
    description: "Eight doubles and a final accent. The longest of the standard stroke rolls.",
    tip: "If the roll starts to tighten, reduce speed before adding volume.",
  },
  {
    id: "single-paradiddle",
    number: 16,
    name: "Single Paradiddle",
    family: "Diddles",
    defaultSubdivision: 4,
    pattern: "R! L R R L! R L L",
    description: "Alternating singles and a double: the classic RLRR LRLL vocabulary.",
    tip: "Let the double answer the singles. Accent the start of each four-note cell.",
  },
  {
    id: "double-paradiddle",
    number: 17,
    name: "Double Paradiddle",
    family: "Diddles",
    defaultSubdivision: 3,
    pattern: "R! L R L R R L! R L R L L",
    description: "Two single strokes before each double, giving the phrase a rolling six-note feel.",
    tip: "Keep the first four strokes light so the double has somewhere to land.",
  },
  {
    id: "triple-paradiddle",
    number: 18,
    name: "Triple Paradiddle",
    family: "Diddles",
    defaultSubdivision: 4,
    pattern: "R! L R L R L R R L! R L R L R L L",
    description: "Three singles before the double. The phrase stretches across the whole bar.",
    tip: "The double should sound like a release, not an acceleration.",
  },
  {
    id: "single-paradiddle-diddle",
    number: 19,
    name: "Single Paradiddle-diddle",
    family: "Diddles",
    defaultSubdivision: 3,
    pattern: "R! L R R L L L! R L L R R",
    description: "A single paradiddle extended with a second double at the end.",
    tip: "The two doubles should be paired without rushing the second one.",
  },
  {
    id: "flam",
    number: 20,
    name: "Flam",
    family: "Flams",
    defaultSubdivision: 2,
    pattern: "lR rL lR rL",
    description: "A soft grace note and a full stroke played so close they sound almost together.",
    tip: "Put the grace note just below the main stroke, not before it.",
  },
  {
    id: "flam-accent",
    number: 21,
    name: "Flam Accent",
    family: "Flams",
    defaultSubdivision: 3,
    pattern: "lR! L R rL! R L",
    description: "A flammed accent followed by two alternating taps, cycling through both hands.",
    tip: "The flam sets the accent; the following two notes should stay underneath it.",
  },
  {
    id: "flam-tap",
    number: 22,
    name: "Flam Tap",
    family: "Flams",
    defaultSubdivision: 2,
    pattern: "lR! R rL! L lR! R rL! L",
    description: "A flam and the same hand's tap, alternating evenly between hands.",
    tip: "Leave a little air after the flam so the tap speaks clearly.",
  },
  {
    id: "flamacue",
    number: 23,
    name: "Flamacue",
    family: "Flams",
    defaultSubdivision: 4,
    pattern: "lR L R L R! rL R L R L!",
    description: "A flam leads a run of alternating singles into an accented final stroke.",
    tip: "Think all the way through to the accent; don't stop after the flam.",
  },
  {
    id: "flam-paradiddle",
    number: 24,
    name: "Flam Paradiddle",
    family: "Flams",
    defaultSubdivision: 4,
    pattern: "lR! L R R rL! R L L",
    description: "A flam replaces the first note of each paradiddle cell.",
    tip: "Play the flam as part of the rhythm, not as a decoration before it.",
  },
  {
    id: "single-flammed-mill",
    number: 25,
    name: "Single Flammed Mill",
    family: "Flams",
    defaultSubdivision: 4,
    pattern: "lR! R L R rL! L R L",
    description: "A flam on the first note of a rolling single-stroke figure.",
    tip: "The flammed note needs size, but the following singles must stay even.",
  },
  {
    id: "flam-paradiddle-diddle",
    number: 26,
    name: "Flam Paradiddle-diddle",
    family: "Flams",
    defaultSubdivision: 3,
    pattern: "lR! L R R L L rL! R L L R R",
    description: "The flam paradiddle rhythm with a second double at the end of each phrase.",
    tip: "Save a little energy for the second double; it tends to disappear at speed.",
  },
  {
    id: "pataflafla",
    number: 27,
    name: "Pataflafla",
    family: "Flams",
    defaultSubdivision: 4,
    pattern: "lR! L R rL!",
    description: "Two flams framing a pair of alternating singles. Short, bright, and unmistakable.",
    tip: "Think of the two flams as bookends; the middle notes should be quiet and even.",
  },
  {
    id: "swiss-army-triplet",
    number: 28,
    name: "Swiss Army Triplet",
    family: "Flams",
    defaultSubdivision: 3,
    pattern: "lR! R L rL! L R",
    description: "A flam plus a double and single, grouped in threes and alternating hands.",
    tip: "The second note of each triplet is the check: keep it relaxed and full.",
  },
  {
    id: "inverted-flam-tap",
    number: 29,
    name: "Inverted Flam Tap",
    family: "Flams",
    defaultSubdivision: 4,
    pattern: "lR! L rL! R lR! L rL! R",
    description: "The flam moves to the second note of each tap pattern, inverting the feel.",
    tip: "Let the unflammed note lead; the flam answers it.",
  },
  {
    id: "flam-drag",
    number: 30,
    name: "Flam Drag",
    family: "Flams",
    defaultSubdivision: 3,
    pattern: "lR! rrL R rL! llR L",
    description: "A flam, a drag, and a single combine into one of drum corps' great hybrids.",
    tip: "Keep the drag and the flam close to their main notes. Don't spread the ornaments.",
  },
  {
    id: "drag",
    number: 31,
    name: "Drag",
    family: "Drags",
    defaultSubdivision: 2,
    pattern: "llR rrL",
    description: "Two controlled grace notes before a full stroke: a compact, thick sound.",
    tip: "The two grace notes are quiet and close together; the main stroke still leads.",
  },
  {
    id: "single-drag-tap",
    number: 32,
    name: "Single Drag Tap",
    family: "Drags",
    defaultSubdivision: 2,
    pattern: "llR L! rrL R!",
    description: "A drag followed by a tap, alternating hands around the pattern.",
    tip: "Keep the tap strong but relaxed; don't let the drag steal the accent.",
  },
  {
    id: "double-drag-tap",
    number: 33,
    name: "Double Drag Tap",
    family: "Drags",
    defaultSubdivision: 3,
    pattern: "llR llR L! rrL rrL R!",
    description: "Two drags, a tap, and the same figure with the alternate lead.",
    tip: "Think of each drag pair as one event. The tap is the hinge.",
  },
  {
    id: "lesson-25",
    number: 34,
    name: "Lesson 25",
    family: "Drags",
    defaultSubdivision: 4,
    pattern: "llR L R! rrL R L!",
    description: "A drag, a single, and an accent: a drum-corps staple with a sharp finish.",
    tip: "Make the drag compact and put the weight on the final note.",
  },
  {
    id: "single-dragadiddle",
    number: 35,
    name: "Single Dragadiddle",
    family: "Drags",
    defaultSubdivision: 4,
    pattern: "llR! L R R rrL! R L L",
    description: "A drag on the first note of a single paradiddle.",
    tip: "The drag should amplify the accent without slowing down the paradiddle.",
  },
  {
    id: "drag-paradiddle-1",
    number: 36,
    name: "Drag Paradiddle #1",
    family: "Drags",
    defaultSubdivision: 4,
    pattern: "R! llR L R R L! rrL R L L",
    description: "An accented single, a drag, and the core of a paradiddle.",
    tip: "Keep the opening accent and the drag close; the phrase is tighter than it looks.",
  },
  {
    id: "drag-paradiddle-2",
    number: 37,
    name: "Drag Paradiddle #2",
    family: "Drags",
    defaultSubdivision: 4,
    pattern: "R! llR llR L R R L! rrL rrL R L L",
    description: "Drag Paradiddle #1 with an extra drag, stretching the phrase and the control.",
    tip: "The two drags must stay quiet and even. Let the paradiddle breathe.",
  },
  {
    id: "single-ratamacue",
    number: 38,
    name: "Single Ratamacue",
    family: "Drags",
    defaultSubdivision: 3,
    pattern: "llR L R L! rrL R L R!",
    description: "A drag leads into a triplet run and an accented final note.",
    tip: "The drag is the pickup; don't let it become the loudest part of the phrase.",
  },
  {
    id: "double-ratamacue",
    number: 39,
    name: "Double Ratamacue",
    family: "Drags",
    defaultSubdivision: 3,
    pattern: "llR llR L R L! rrL rrL R L R!",
    description: "Two drags before the triplet run, with a clean accent at the end.",
    tip: "Count two drags, then let the triplet flow. Keep the final accent tall.",
  },
  {
    id: "triple-ratamacue",
    number: 40,
    name: "Triple Ratamacue",
    family: "Drags",
    defaultSubdivision: 3,
    pattern: "llR llR llR L R L! rrL rrL rrL R L R!",
    description: "Three drags before the run: the biggest ratamacue and a proper workout.",
    tip: "Don't accelerate the drags. The triplet needs room after them.",
  },
];

const parsedPatterns = new Map();

export function parseToken(token) {
  let value = token.trim();
  if (!value) {
    throw new Error("Empty sticking token");
  }

  const accent = value.includes("!");
  const buzz = value.includes("~");
  value = value.replaceAll("!", "").replaceAll("~", "");

  const match = /^([rl]*)([RL])$/.exec(value);
  if (!match) {
    throw new Error(`Invalid sticking token: ${token}`);
  }

  return {
    token,
    hand: match[2],
    graces: [...match[1].toUpperCase()],
    accent,
    buzz,
  };
}

export function parsePattern(pattern) {
  if (parsedPatterns.has(pattern)) {
    return parsedPatterns.get(pattern);
  }
  const parsed = pattern
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseToken);
  parsedPatterns.set(pattern, parsed);
  return parsed;
}

export function getRudiment(id) {
  return RUDIMENTS.find((rudiment) => rudiment.id === id) ?? RUDIMENTS[0];
}

export function getFamily(name) {
  return FAMILIES.find((family) => family.name === name) ?? FAMILIES[0];
}

export function buildSequence(rudiment, subdivision, beatsPerBar = 4, maxBars = 2) {
  const pattern = parsePattern(rudiment.pattern);
  const safeSubdivision = SUBDIVISIONS[subdivision] ? subdivision : rudiment.defaultSubdivision;
  const notesPerBar = beatsPerBar * safeSubdivision;
  const bars = Math.max(1, Math.min(maxBars, Math.ceil(pattern.length / notesPerBar)));
  const length = notesPerBar * bars;
  const sequence = Array.from({ length }, (_, index) => {
    const base = pattern[index % pattern.length];
    return { ...base, sequenceIndex: index };
  });

  return {
    sequence,
    pattern,
    bars,
    notesPerBar,
    subdivision: safeSubdivision,
  };
}

export function tokenToLabel(token) {
  const event = parseToken(token);
  return {
    hand: event.hand,
    grace: event.graces.join("").toLowerCase(),
    accent: event.accent,
    buzz: event.buzz,
  };
}

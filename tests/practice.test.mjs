import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RUDIMENTS, TIME_SIGNATURES, parsePattern } from "../js/rudiments.js";
import { buildPracticeSequence, createTempoCurve } from "../js/practice.js";
import { generateMusicXML } from "../js/scores.js";
import { Metronome } from "../js/metronome.js";
import { getMeter, getRhythm } from "../js/meter.js";
import { ScorePlayer } from "../js/score-player.js";
import { AudioEngine } from "../js/audio.js";

test("hand tones stay distinguishable across accents for all sounds without changing gain or timing", () => {
  const audio = Object.create(AudioEngine.prototype);
  audio.context = { currentTime: 0 };
  audio.master = {};
  const voices = [];
  audio._tone = (time, options) => voices.push({ kind: "tone", time, ...options });
  audio._noise = (time, options) => voices.push({ kind: "noise", time, ...options });
  const synthesize = options => {
    voices.length = 0;
    audio.playClick(1, { level: 0.64, ...options });
    return voices.map(voice => ({ ...voice }));
  };
  for (const sound of ["click", "wood", "stick"]) {
    for (const accent of [false, true]) {
      const normal = synthesize({ sound, accent });
      const right = synthesize({ sound, accent, hand: "R" });
      const left = synthesize({ sound, accent, hand: "L" });
      assert.equal(right.length, normal.length);
      right.forEach((voice, i) => {
        assert.ok(voice.frequency > normal[i].frequency);
        assert.ok(left[i].frequency < normal[i].frequency);
        for (const property of ["gain", "time", "attack", "decay"]) {
          assert.equal(voice[property], normal[i][property]);
          assert.equal(left[i][property], normal[i][property]);
        }
      });
      assert.deepEqual(synthesize({ sound, accent, hand: null }), normal);
    }
    const lowAccent = synthesize({ sound, hand: "L", accent: true });
    const highTap = synthesize({ sound, hand: "R", accent: false });
    assert.ok(lowAccent[0].frequency < highTap[0].frequency);
  }
});

test("live hand-tone switching follows planned sticking, including repeated hands", () => {
  const scheduled = [];
  const metronome = new Metronome({ audio: {
    currentTime: 0, playClick: (time, options) => scheduled.push({ time, ...options }),
  } });
  metronome.setSequence(parsePattern("R L R R L R L L"));
  metronome.settings.audioAhead = 0;
  for (let i = 0; i < 8; i++) metronome._planNext();
  const planned = [...metronome._planned];
  planned.forEach((event, index) => {
    if (index === 2) metronome.settings.differentHandTones = true;
    if (index === 6) metronome.settings.differentHandTones = false;
    metronome._scheduleAudio(event.time);
  });
  assert.deepEqual(scheduled.map(e => e.hand), [null, null, "R", "R", "L", "R", null, null]);
  scheduled.forEach((event, index) => {
    assert.equal(event.time, planned[index].time);
    assert.equal(event.level, planned[index].level);
    assert.equal(event.accent, planned[index].accent);
  });
});

test("compound meters have two, three, or four dotted-quarter pulses", () => {
  for (const [id, beats] of [["6/8", 2], ["9/8", 3], ["12/8", 4]]) {
    const meter = getMeter(id);
    assert.equal(meter.beatsPerBar, beats);
    assert.equal(meter.beatQuarterLength, 1.5);
    assert.deepEqual(meter.beamGroup, [3, 8]);
    for (const [value, ticks, duration] of [[1, 1, 18], [2, 3, 6], [4, 6, 3]]) {
      const rhythm = getRhythm(value, id);
      assert.equal(rhythm.ticksPerBeat, ticks);
      assert.equal(rhythm.duration, duration);
      assert.equal(rhythm.tuplet, false);
      for (const rudiment of RUDIMENTS) {
        const data = buildPracticeSequence(rudiment, value, [], id);
        assert.equal(data.notesPerBar, beats * ticks);
        assert.equal(data.sequence.length, 8 * beats * ticks);
      }
    }
    assert.equal(getRhythm(3, id).subdivision, 2);
  }
  assert.equal(getMeter(3).id, "3/4", "legacy numeric meter remains supported");
});

test("compound clicks emphasize groups of three eighths and six sixteenths", () => {
  for (const id of ["6/8", "9/8", "12/8"]) {
    const meter = getMeter(id);
    for (const value of [1, 2, 4]) {
      const rhythm = getRhythm(value, id);
      const events = [];
      const click = new Metronome({ audio: { currentTime: 0 }, onPlan: e => events.push(e) });
      Object.assign(click.settings, { bpm: 120, beatsPerBar: meter.beatsPerBar, subdivision: rhythm.ticksPerBeat });
      click._lastBpm = 120;
      for (let i = 0; i <= rhythm.notesPerBar; i++) click._planNext();
      const pulses = events.filter(e => e.isBeat);
      assert.deepEqual(pulses.map(e => e.index), Array.from({ length: meter.beatsPerBar + 1 }, (_, i) => i * rhythm.ticksPerBeat));
      pulses.forEach((e, i) => assert.ok(Math.abs(e.time - i * 0.5) < 1e-8));
      assert.equal(events[0].level, 1);
      assert.equal(events.at(-1).bar, 1);
      assert.ok(events.slice(1, -1).every(e => e.level === (e.isBeat ? 0.64 : 0.32)));
      assert.equal(click._clampSubdivision(rhythm.ticksPerBeat), rhythm.ticksPerBeat);
    }
  }
});

test("compound MusicXML has correct beams, dotted tempo, and full measure duration", () => {
  assert.ok(generateMusicXML(RUDIMENTS[0], 2, { timeSignature: "6/8", bpm: 81 })
    .includes('<sound tempo="121.5"/>'), "odd dotted-quarter BPM preserves the exact equivalent tempo");
  for (const id of ["6/8", "9/8", "12/8"]) {
    const meter = getMeter(id);
    for (const value of [1, 2, 4]) {
      const rhythm = getRhythm(value, id);
      const xml = generateMusicXML(RUDIMENTS[0], value, { timeSignature: id, bpm: 80 });
      assert.ok(xml.includes(`<beats>${meter.numerator}</beats><beat-type>8</beat-type>`));
      assert.ok(xml.includes("<beat-unit-dot/>"));
      assert.ok(xml.includes('<sound tempo="120"/>'));
      assert.ok(!xml.includes("<tuplet") && !xml.includes("<time-modification>"));
      for (const [, measure] of xml.matchAll(/<measure[^>]*>([\s\S]*?)<\/measure>/g)) {
        const durations = [...measure.matchAll(/<duration>(\d+)<\/duration>/g)].map(m => Number(m[1]));
        assert.equal(durations.length, rhythm.notesPerBar);
        assert.equal(durations.reduce((a, b) => a + b, 0), meter.numerator * 6);
        if (value === 1) {
          assert.equal((measure.match(/<dot\/>/g) ?? []).length, meter.beatsPerBar);
        } else {
          const beams = [...measure.matchAll(/<beam number="1">(\w+)<\/beam>/g)].map(m => m[1]);
          const group = ["begin", ...Array(rhythm.group - 2).fill("continue"), "end"];
          assert.deepEqual(beams, Array.from({ length: meter.beatsPerBar }, () => group).flat());
          if (value === 4) assert.equal((measure.match(/<beam number="2">/g) ?? []).length, rhythm.notesPerBar);
        }
      }
    }
  }
});

test("score cursor uses dotted-quarter seconds and reads the meter denominator", () => {
  const player = new ScorePlayer({ container: {}, audio: { currentTime: 1 }, getBpm: () => 120 });
  player.osmd = { Sheet: { SourceMeasures: [{ ActiveTimeSignature: { Numerator: 9, Denominator: 8 } }] } };
  player.meter = player._meterFromScore();
  assert.equal(player.meter.id, "9/8");
  assert.equal(player.meter.beatsPerBar, 3);
  player.bpm = 120;
  player.playing = true;
  player.totalWhole = 2;
  let timestamp;
  player._indexForWhole = whole => { timestamp = whole; return 0; };
  player._advanceTo = () => {};
  const oldWindow = globalThis.window;
  globalThis.window = { requestAnimationFrame: () => 1 };
  try { player._frame(); } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
  assert.equal(timestamp, 0.75, "two dotted-quarter beats span three quarter notes");
});

test("every rudiment and subdivision fills eight measures without losing sticking order", () => {
  for (const rudiment of RUDIMENTS) {
    for (const subdivision of [1, 2, 3, 4]) {
      for (const beats of TIME_SIGNATURES) {
        const data = buildPracticeSequence(rudiment, subdivision, [], beats);
        const pattern = parsePattern(rudiment.pattern);
        assert.equal(data.bars, 8);
        assert.equal(data.notesPerBar, beats * subdivision);
        assert.equal(data.sequence.length, 8 * beats * subdivision);
        data.sequence.forEach((event, i) => {
          assert.equal(event.token, pattern[i % pattern.length].token);
          assert.equal(event.sequenceIndex, i);
        });
      }
    }
  }
});

test("rotations change every bar and remain ordered across page and cycle boundaries", () => {
  for (const count of [1, 2, 3, 4]) {
    const rotation = RUDIMENTS.slice(0, count).map(r => r.id);
    for (const beats of TIME_SIGNATURES) {
      const data = buildPracticeSequence(RUDIMENTS[0], 4, rotation, beats);
      for (let bar = 0; bar < data.sequence.length / data.notesPerBar + 2; bar++) {
        const event = data.sequence[(bar * data.notesPerBar) % data.sequence.length];
        assert.equal(event.rudimentId, rotation[bar % count]);
      }
      assert.equal(data.sequence.length % (8 * data.notesPerBar), 0);
    }
  }
});

test("MusicXML meter and each measure's duration match the selected time signature", () => {
  for (const beats of TIME_SIGNATURES) {
    for (const subdivision of [1, 2, 3, 4]) {
      const xml = generateMusicXML(RUDIMENTS[20], subdivision, { beatsPerBar: beats });
      assert.ok(xml.includes(`<time><beats>${beats}</beats><beat-type>4</beat-type></time>`));
      for (const [, measure] of xml.matchAll(/<measure[^>]*>([\s\S]*?)<\/measure>/g)) {
        const durations = [...measure.matchAll(/<duration>(\d+)<\/duration>/g)].map(m => Number(m[1]));
        assert.equal(durations.length, beats * subdivision);
        assert.equal(durations.reduce((a, b) => a + b, 0), beats * 12);
      }
    }
  }
});

test("metronome downbeats and bar duration follow meter and note value", () => {
  for (const beats of TIME_SIGNATURES) {
    for (const subdivision of [1, 2, 3, 4]) {
      const events = [];
      const metronome = new Metronome({ audio: { currentTime: 0 }, onPlan: event => events.push(event) });
      Object.assign(metronome.settings, { bpm: 120, beatsPerBar: beats, subdivision });
      metronome._lastBpm = 120;
      for (let i = 0; i <= beats * subdivision; i++) metronome._planNext();
      assert.equal(events.filter(event => event.isDownbeat).length, 2);
      assert.equal(events.at(-1).bar, 1);
      assert.equal(events.at(-1).beat, 0);
      assert.ok(Math.abs(events.at(-1).time - beats * 0.5) < 1e-8);
    }
  }
});

test("tempo challenge reaches both bounds and repeats without overshooting", () => {
  const curve = createTempoCurve({ enabled: true, bpm: 80, min: 80, max: 90, step: 4, bars: 2 });
  assert.deepEqual(Array.from({ length: 13 }, (_, bar) => curve(bar)),
    [80, 80, 84, 84, 88, 88, 90, 90, 88, 88, 84, 84, 80]);
  assert.equal(createTempoCurve({ enabled: false, bpm: 105 })(20), 105);
  assert.equal(createTempoCurve({ enabled: true, min: 90, max: 90 })(20), 90);
});

test("all controller DOM references are cached and present in the page", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "duplicate HTML ids");
  const cacheBlock = main.slice(main.indexOf("const ids = ["), main.indexOf("for (const id of ids)"));
  const cached = new Set([...cacheBlock.matchAll(/"([A-Za-z0-9]+)"/g)].map(match => match[1]));
  for (const [, id] of main.matchAll(/dom\.([A-Za-z0-9]+)/g)) {
    assert.ok(cached.has(id), `${id} is not cached`);
    assert.ok(ids.includes(id), `${id} is missing from the page`);
  }
});

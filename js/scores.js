import { parsePattern } from "./rudiments.js";
import { getMeter, getRhythm } from "./meter.js";

const DIVISIONS = 12;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function unpitched() {
  return "        <unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched>";
}

function graceNoteXml() {
  return [
    "      <note>",
    "        <grace slash=\"yes\"/>",
    unpitched(),
    "        <voice>1</voice>",
    "        <type>eighth</type>",
    "        <stem>up</stem>",
    "      </note>",
  ].join("\n");
}

function notationsXml({ tupletStart, tupletStop, accent, buzz }) {
  const children = [];
  if (tupletStart) {
    children.push("          <tuplet type=\"start\" number=\"1\"/>");
  }
  if (tupletStop) {
    children.push("          <tuplet type=\"stop\" number=\"1\"/>");
  }
  if (accent) {
    children.push("          <articulations><accent/></articulations>");
  }
  if (buzz) {
    children.push("          <ornaments><tremolo type=\"single\">3</tremolo></ornaments>");
  }
  if (!children.length) {
    return "";
  }
  return ["        <notations>", ...children, "        </notations>"].join("\n");
}

function mainNoteXml(event, rhythm, indexInBar) {
  const groupIndex = indexInBar % rhythm.group;
  const beamValue = groupIndex === 0 ? "begin" : groupIndex === rhythm.group - 1 ? "end" : "continue";
  const beamXml = rhythm.ticksPerBeat > 1
    ? `        <beam number="1">${beamValue}</beam>` + (rhythm.type === "16th" ? `\n        <beam number="2">${beamValue}</beam>` : "")
    : "";
  const timeModification =
    rhythm.tuplet
      ? [
          "        <time-modification>",
          "          <actual-notes>3</actual-notes>",
          "          <normal-notes>2</normal-notes>",
          "        </time-modification>",
        ].join("\n")
      : "";
  const notations = notationsXml({
    tupletStart: rhythm.tuplet && groupIndex === 0,
    tupletStop: rhythm.tuplet && groupIndex === rhythm.group - 1,
    accent: event.accent,
    buzz: event.buzz,
  });

  return [
    "      <note>",
    unpitched(),
    `        <duration>${rhythm.duration}</duration>`,
    "        <voice>1</voice>",
    `        <type>${rhythm.type}</type>`,
    rhythm.dotted ? "        <dot/>" : "",
    timeModification,
    "        <stem>up</stem>",
    beamXml,
    notations,
    "        <lyric number=\"1\">",
    "          <syllabic>single</syllabic>",
    `          <text>${event.hand}</text>`,
    "        </lyric>",
    "      </note>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateMusicXML(rudiment, subdivision, { bpm = 80, beatsPerBar = 4, timeSignature } = {}) {
  const meter = getMeter(timeSignature ?? beatsPerBar);
  const rhythm = getRhythm(subdivision, meter.id);
  const pattern = parsePattern(rudiment.pattern);
  const notesPerBar = rhythm.notesPerBar;
  const bars = Math.max(1, Math.min(2, Math.ceil(pattern.length / notesPerBar)));
  const sequence = Array.from({ length: bars * notesPerBar }, (_, index) => pattern[index % pattern.length]);
  const measures = [];

  for (let bar = 0; bar < bars; bar += 1) {
    const barEvents = sequence.slice(bar * notesPerBar, (bar + 1) * notesPerBar);
    const notes = [];

    barEvents.forEach((event, indexInBar) => {
      event.graces.forEach(() => {
        notes.push(graceNoteXml());
      });
      notes.push(mainNoteXml(event, rhythm, indexInBar));
    });

    const attributes =
      bar === 0
        ? [
            "      <attributes>",
            `        <divisions>${DIVISIONS}</divisions>`,
            "        <key><fifths>0</fifths></key>",
            `        <time><beats>${meter.numerator}</beats><beat-type>${meter.denominator}</beat-type></time>`,
            "        <staves>1</staves>",
            "        <clef><sign>percussion</sign><line>2</line></clef>",
            "        <staff-details number=\"1\"><staff-lines>5</staff-lines></staff-details>",
            "      </attributes>",
          ].join("\n")
        : "";

    const tempoDirection =
      bar === 0
        ? [
            "      <direction placement=\"above\">",
            "        <direction-type>",
            "          <metronome parentheses=\"no\">",
            "            <beat-unit>quarter</beat-unit>",
            ...(meter.compound ? ["            <beat-unit-dot/>"] : []),
            `            <per-minute>${Math.round(bpm)}</per-minute>`,
            "          </metronome>",
            "        </direction-type>",
            `        <sound tempo="${Math.round(bpm) * meter.beatQuarterLength}"/>`,
            "      </direction>",
          ].join("\n")
        : "";

    const finalBar =
      bar === bars - 1
        ? "      <barline location=\"right\"><bar-style>light-heavy</bar-style></barline>"
        : "";

    measures.push(
      [
        `    <measure number="${bar + 1}">`,
        attributes,
        tempoDirection,
        ...notes,
        finalBar,
        "    </measure>",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 4.0 Partwise//EN\" \"http://www.musicxml.org/dtds/partwise.dtd\">",
    "<score-partwise version=\"4.0\">",
    "  <work>",
    `    <work-title>${escapeXml(`${rudiment.number}. ${rudiment.name}`)}</work-title>`,
    "  </work>",
    "  <identification>",
    "    <creator type=\"composer\">padshed</creator>",
    "    <encoding>",
    "      <software>padshed</software>",
    `      <encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>`,
    "    </encoding>",
    "  </identification>",
    "  <part-list>",
    "    <score-part id=\"P1\">",
    "      <part-name>Snare Drum</part-name>",
    "      <score-instrument id=\"P1-I1\">",
    "        <instrument-name>Snare Drum</instrument-name>",
    "      </score-instrument>",
    "      <midi-instrument id=\"P1-I1\">",
    "        <midi-channel>10</midi-channel>",
    "        <midi-program>1</midi-program>",
    "        <midi-unpitched>38</midi-unpitched>",
    "      </midi-instrument>",
    "    </score-part>",
    "  </part-list>",
    "  <part id=\"P1\">",
    ...measures,
    "  </part>",
    "</score-partwise>",
    "",
  ].join("\n");
}

export function musicXmlFilename(rudiment) {
  const slug = `${String(rudiment.number).padStart(2, "0")}-${rudiment.id}`;
  return `pas-${slug}.musicxml`;
}

export function downloadMusicXml(xml, filename) {
  const blob = new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function detectMeterFromXml(xmlText) {
  try {
    const documentNode = new DOMParser().parseFromString(xmlText, "application/xml");
    const beats = Number(documentNode.querySelector("time > beats")?.textContent);
    const beatType = Number(documentNode.querySelector("time > beat-type")?.textContent);
    return getMeter(`${beats}/${beatType}`);
  } catch {
    return getMeter("4/4");
  }
}

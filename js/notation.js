import { getMeter, getRhythm } from "./meter.js";

const VEXFLOW_BRAVURA = "Bravura";
const VEXFLOW_ACADEMICO = "Academico";
const STAVE_Y = 14;
const ROW_HEIGHT = 136;

function waitForVexFlow(timeout = 20000) {
  if (window.VexFlow) {
    return Promise.resolve(window.VexFlow);
  }

  return new Promise((resolve, reject) => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      if (window.VexFlow) {
        window.clearInterval(timer);
        resolve(window.VexFlow);
        return;
      }
      if (performance.now() - started > timeout) {
        window.clearInterval(timer);
        reject(new Error("VexFlow could not be loaded. Check your connection and reload."));
      }
    }, 80);
  });
}

export class NotationRenderer {
  constructor(stage) {
    this.stage = stage;
    this.viewport = stage.parentElement;
    this.ready = false;
    this.renderer = null;
    this.notes = [];
    this.currentIndex = -1;
    this.lastRender = null;
    this.playhead = null;
    this.renderToken = 0;
    this.resizeTimer = null;
    this.resizeObserver = null;
  }

  async init() {
    this.VexFlow = await waitForVexFlow();
    try {
      await this.VexFlow.loadFonts(VEXFLOW_BRAVURA, VEXFLOW_ACADEMICO);
      this.VexFlow.setFonts(VEXFLOW_BRAVURA, VEXFLOW_ACADEMICO);
    } catch (error) {
      console.warn("VexFlow font preload failed; continuing with bundled fonts.", error);
    }
    this.ready = true;
    this._observeResize();
  }

  render(sequence, subdivision, bars, meterValue = "4/4") {
    this.lastRender = { sequence, subdivision, bars, meterValue };
    if (!this.ready) {
      return false;
    }
    this._draw();
    return true;
  }

  setPlayhead(index) {
    if (!this.playhead || !this.notes.length) {
      return;
    }
    const safeIndex = ((index % this.notes.length) + this.notes.length) % this.notes.length;
    const note = this.notes[safeIndex];
    if (!note) {
      return;
    }
    const x = note.getAbsoluteX() + note.getGlyphWidth() * 0.5;
    this.currentIndex = safeIndex;
    const scale = this.drawScale || 1;
    this.playhead.style.transform = `translateX(${(x - this.viewBoxX) * scale}px) translateX(-50%)`;
    this.playhead.style.setProperty("--playhead-top", `${(note.getStave().getY() + 12 - this.viewBoxY) * scale}px`);
    this.playhead.style.setProperty("--playhead-height", `${104 * scale}px`);
    this.playhead.classList.add("is-visible");

  }

  clearPlayhead() {
    this.currentIndex = -1;
    this.playhead?.classList.remove("is-visible");
  }

  _draw() {
    if (!this.lastRender || !this.stage) {
      return;
    }

    const { sequence, subdivision, bars, meterValue } = this.lastRender;
    const meter = getMeter(meterValue);
    const rhythm = getRhythm(subdivision, meter.id);
    const columns = 4;
    const rows = Math.ceil(bars / columns);
    const widthAvailable = Math.max(1, this.viewport.clientWidth);
    const heightAvailable = Math.max(1, this.viewport.clientHeight);
    const notesPerMeasure = sequence.length / bars;
    const maxGraces = Math.max(...Array.from({ length: bars }, (_, bar) =>
      sequence.slice(bar * notesPerMeasure, (bar + 1) * notesPerMeasure)
        .reduce((total, event) => total + event.graces.length, 0)));
    const minWidth = Math.max(720, columns * (110 + notesPerMeasure * 23 + maxGraces * 9));
    const renderHeight = rows * ROW_HEIGHT;
    const scale = Math.min(widthAvailable / minWidth, heightAvailable / renderHeight);
    this.drawScale = scale;

    const token = ++this.renderToken;
    this.stage.replaceChildren();
    this.stage.style.width = `${minWidth * scale}px`;
    this.stage.style.height = `${renderHeight * scale}px`;

    const renderer = new this.VexFlow.Renderer(this.stage, this.VexFlow.Renderer.Backends.SVG);
    renderer.resize(minWidth, renderHeight);
    this.renderer = renderer;
    const context = renderer.getContext();
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--note").trim();
    context.setFillStyle(ink);
    context.setStrokeStyle(ink);

    const horizontalPadding = 22;
    const staveWidth = (minWidth - horizontalPadding * 2) / columns;
    const notesPerBar = sequence.length / bars;
    const allNotes = [];
    const playhead = document.createElement("div");
    playhead.className = "notation-playhead";
    playhead.setAttribute("aria-hidden", "true");
    playhead.style.setProperty("--playhead-top", `${STAVE_Y - 9}px`);
    playhead.style.setProperty("--playhead-height", "112px");
    this.stage.append(playhead);
    this.playhead = playhead;

    for (let barIndex = 0; barIndex < bars; barIndex += 1) {
      if (token !== this.renderToken) {
        return;
      }

      const stave = new this.VexFlow.Stave(
        horizontalPadding + (barIndex % columns) * staveWidth,
        STAVE_Y + Math.floor(barIndex / columns) * ROW_HEIGHT,
        staveWidth,
      );
      if (barIndex % columns === 0) {
        stave.addClef("percussion");
        if (barIndex === 0) stave.addTimeSignature(meter.id);
      }
      stave.setContext(context).draw();

      const barEvents = sequence.slice(
        barIndex * notesPerBar,
        (barIndex + 1) * notesPerBar,
      );
      const notes = barEvents.map((event) =>
        this._buildNote(event, rhythm),
      );
      allNotes.push(...notes);

      const beams =
        rhythm.ticksPerBeat > 1
          ? this.VexFlow.Beam.generateBeams(notes, {
              groups: [new this.VexFlow.Fraction(...meter.beamGroup)],
              stemDirection: this.VexFlow.Stem.UP,
            })
          : [];

      const tuplets = [];
      if (rhythm.tuplet) {
        for (let index = 0; index < notes.length; index += 3) {
          const group = notes.slice(index, index + 3);
          if (group.length === 3) {
            tuplets.push(
              new this.VexFlow.Tuplet(group, {
                numNotes: 3,
                notesOccupied: 2,
                location: this.VexFlow.Tuplet.LOCATION_TOP,
                bracketed: false,
              }),
            );
          }
        }
      }

      const voice = new this.VexFlow.Voice({
        numBeats: meter.numerator,
        beatValue: meter.denominator,
      }).setMode(this.VexFlow.Voice.Mode.SOFT);
      voice.addTickables(notes);

      const formatter = new this.VexFlow.Formatter();
      formatter.joinVoices([voice]).formatToStave([voice], stave);
      voice.draw(context, stave);

      beams.forEach((beam) => beam.setContext(context).draw());
      tuplets.forEach((tuplet) => tuplet.setContext(context).draw());
    }

    const svg = this.stage.querySelector("svg");
    // Include accents, triplet numbers, and grace notes in the fitted area.
    // Their extents differ from the staff itself and vary by rudiment.
    const bounds = svg.getBBox();
    this.viewBoxX = Math.min(0, bounds.x - 8);
    this.viewBoxY = Math.min(0, bounds.y - 8);
    const fittedWidth = Math.max(minWidth, bounds.x + bounds.width + 8) - this.viewBoxX;
    const fittedHeight = Math.max(renderHeight, bounds.y + bounds.height + 8) - this.viewBoxY;
    this.drawScale = Math.min(widthAvailable / fittedWidth, heightAvailable / fittedHeight);
    this.stage.style.width = `${fittedWidth * this.drawScale}px`;
    this.stage.style.height = `${fittedHeight * this.drawScale}px`;
    svg.setAttribute("viewBox", `${this.viewBoxX} ${this.viewBoxY} ${fittedWidth} ${fittedHeight}`);
    svg.setAttribute("width", String(fittedWidth * this.drawScale));
    svg.setAttribute("height", String(fittedHeight * this.drawScale));
    // VexFlow also writes inline pixel dimensions; override those so the
    // viewBox scales with the stage instead of clipping at small viewports.
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Eight measures of drum notation: four bars on each of two lines");
    this.notes = allNotes;
    if (this.currentIndex >= 0) this.setPlayhead(this.currentIndex);
  }

  _buildNote(event, rhythm) {
    const duration = rhythm.vexDuration;
    const note = new this.VexFlow.StaveNote({
      keys: ["c/5"],
      duration,
      clef: "percussion",
      stemDirection: this.VexFlow.Stem.UP,
    });

    if (rhythm.dotted) this.VexFlow.Dot.buildAndAttach([note], { all: true });

    if (event.graces?.length) {
      const graceNotes = event.graces.map(
        () =>
          new this.VexFlow.GraceNote({
            keys: ["c/5"],
            duration: "16",
            clef: "percussion",
            slash: true,
            stemDirection: this.VexFlow.Stem.UP,
          }),
      );
      const graceGroup = new this.VexFlow.GraceNoteGroup(graceNotes, false);
      if (graceNotes.length > 1) {
        graceGroup.beamNotes();
      }
      note.addModifier(graceGroup, 0);
    }

    if (event.accent) {
      note.addModifier(
        new this.VexFlow.Articulation("a>")
          .setPosition(this.VexFlow.Modifier.Position.ABOVE),
        0,
      );
    }

    if (event.buzz) {
      const buzz = new this.VexFlow.Annotation("z")
        .setFont("DM Sans", 10.5, "bold", "italic")
        .setVerticalJustification(this.VexFlow.Annotation.VerticalJustify.TOP);
      note.addModifier(buzz, 0);
    }

    const sticking = new this.VexFlow.Annotation(event.hand)
      .setFont("DM Sans", 10.5, "bold")
      .setVerticalJustification(this.VexFlow.Annotation.VerticalJustify.BOTTOM);
    note.addModifier(sticking, 0);

    return note;
  }

  _observeResize() {
    if (!this.viewport || typeof ResizeObserver === "undefined") {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        if (this.ready && this.lastRender) {
          this._draw();
        }
      }, 140);
    });
    this.resizeObserver.observe(this.viewport);
  }
}

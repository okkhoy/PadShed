import { getMeter } from "./meter.js";
import { Metronome } from "./metronome.js";
import { detectMeterFromXml } from "./scores.js";

const OSMD_SRC =
  "https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@2.2.1/build/opensheetmusicdisplay.min.js";

let osmdPromise = null;

function ensureOsmd() {
  if (window.opensheetmusicdisplay) {
    return Promise.resolve(window.opensheetmusicdisplay);
  }
  if (osmdPromise) {
    return osmdPromise;
  }

  osmdPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-osmd="true"]');
    const script = existing ?? document.createElement("script");
    script.src = OSMD_SRC;
    script.async = true;
    script.dataset.osmd = "true";
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => {
      if (window.opensheetmusicdisplay) {
        resolve(window.opensheetmusicdisplay);
      } else {
        reject(new Error("The score renderer loaded, but its API was not available."));
      }
    });
    script.addEventListener("error", () => {
      osmdPromise = null;
      reject(new Error("OpenSheetMusicDisplay could not be loaded. Check your connection."));
    });
    if (!existing) {
      document.head.append(script);
    }
  });

  return osmdPromise;
}

export class ScorePlayer {
  constructor({
    container,
    audio,
    getBpm,
    getLoop,
    getClickSound,
    onStatus,
    onBeat,
    onReady,
  }) {
    this.container = container;
    this.audio = audio;
    this.getBpm = getBpm;
    this.getLoop = getLoop;
    this.getClickSound = getClickSound;
    this.onStatus = onStatus;
    this.onBeat = onBeat;
    this.onReady = onReady;

    this.osmd = null;
    this.cursor = null;
    this.steps = [];
    this.totalWhole = 0;
    this.stepIndex = 0;
    this.startTime = 0;
    this.bpm = 80;
    this.meter = getMeter("4/4");
    this.playing = false;
    this.frameId = null;
    this.loopIndex = 0;
    this.loadToken = 0;
    this.loadedLabel = "";
    this.isCustom = false;
    this._frame = this._frame.bind(this);

    this.metronome = new Metronome({
      audio,
      onTick: (event) => this.onBeat?.(event),
      onPlan: () => {},
    });
  }

  async loadXml(xml, options = {}) {
    return this._loadSource(xml, options);
  }

  async loadFile(file) {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".mxl")) {
      return this._loadSource(file, {
        title: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        meter: "4/4",
        isCustom: true,
      });
    }

    const text = await file.text();
    return this._loadSource(text, {
      title: file.name.replace(/\.[^.]+$/, ""),
      filename: file.name,
      meter: detectMeterFromXml(text),
      isCustom: true,
    });
  }

  async _loadSource(source, options = {}) {
    const token = ++this.loadToken;
    this.stop({ silent: true });
    this.onStatus?.("loading", "Loading score…");

    try {
      const OSMD = await ensureOsmd();
      if (token !== this.loadToken) {
        return false;
      }

      this.container.replaceChildren();
      this.osmd = new OSMD.OpenSheetMusicDisplay(this.container, {
        autoResize: this.container.clientWidth >= 700,
        backend: "svg",
        drawingParameters: "compact",
        drawTitle: false,
        drawSubtitle: false,
        drawComposer: false,
        drawCredits: false,
        drawPartNames: false,
        drawPartAbbreviations: false,
        drawMeasureNumbers: false,
        drawMetronomeMarks: false,
        drawFingerings: false,
        followCursor: true,
        cursorsOptions: [
          {
            type: 0,
            color: "#F5A524",
            alpha: 0.32,
            follow: true,
          },
        ],
        defaultColorMusic: "#171a20",
        defaultFontFamily: "DM Sans",
      });

      const narrow = this.container.clientWidth < 700;
      if (narrow) {
        this.container.style.width = "640px";
      }
      this.osmd.autoResize = narrow ? false : true;
      this.osmd.zoom = narrow ? 1.1 : 1.5;
      this.osmd.EngravingRules.LyricsHeight = 1.1;
      if (narrow) {
        this.osmd.EngravingRules.PageLeftMargin = 0;
        this.osmd.EngravingRules.PageRightMargin = 0;
        this.osmd.EngravingRules.PageTopMargin = 0;
        this.osmd.EngravingRules.PageBottomMargin = 0;
      }
      await this.osmd.load(source);
      if (token !== this.loadToken) {
        return false;
      }

      this.osmd.render();
      this._applyMobileSizing();
      this.cursor = this.osmd.cursor;
      this.meter = this._meterFromScore(options.meter);
      this.steps = this._collectSteps();
      this.totalWhole = this.osmd.Sheet.SheetEndTimestamp.RealValue;

      if (!this.steps.length) {
        throw new Error("No playable notes were found in this score.");
      }
      if (!this.totalWhole || !Number.isFinite(this.totalWhole)) {
        this.totalWhole = Math.max(0.25, this.steps[this.steps.length - 1] + 0.25);
      }

      this.cursor.reset();
      this.cursor.show();
      this.stepIndex = 0;
      this.loadedLabel = options.title || options.filename || "Untitled score";
      this.isCustom = Boolean(options.isCustom);

      this.onReady?.({
        title: this.loadedLabel,
        filename: options.filename || "",
        meter: this.meter,
        steps: this.steps.length,
        measures: this.osmd.Sheet.SourceMeasures?.length ?? 0,
        isCustom: this.isCustom,
      });
      this.onStatus?.("ready", "Score ready. Press play when you are.");
      return true;
    } catch (error) {
      if (token !== this.loadToken) {
        return false;
      }
      this.osmd = null;
      this.cursor = null;
      this.steps = [];
      this.totalWhole = 0;
      this.onStatus?.("error", error.message || "The score could not be loaded.");
      throw error;
    }
  }

  _meterFromScore(fallback = "4/4") {
    const signature = this.osmd?.Sheet?.SourceMeasures?.[0]?.ActiveTimeSignature;
    if (signature?.Numerator && signature?.Denominator) {
      return getMeter(`${signature.Numerator}/${signature.Denominator}`);
    }
    return getMeter(fallback?.id ?? fallback);
  }

  _collectSteps() {
    if (!this.cursor) {
      return [];
    }
    const steps = [];
    let guard = 0;
    this.cursor.reset();

    while (!this.cursor.iterator.EndReached && guard < 50000) {
      steps.push(this.cursor.iterator.CurrentSourceTimestamp.RealValue);
      this.cursor.next();
      guard += 1;
    }

    return steps;
  }

  async play() {
    if (!this.osmd || !this.cursor || !this.steps.length) {
      throw new Error("Load a score before pressing play.");
    }
    if (this.playing) {
      return;
    }

    this.bpm = Math.max(30, Math.min(300, Number(this.getBpm()) || 80));
    this.cursor.reset();
    this.cursor.show();
    this.stepIndex = 0;
    this.loopIndex = 0;

    const startInfo = await this.metronome.start({
      bpm: this.bpm,
      subdivision: 1,
      beatsPerBar: this.meter.beatsPerBar,
      clickSound: this.getClickSound?.() ?? "click",
      accentDownbeat: true,
      accentEvents: false,
      sequence: [],
    });

    if (!startInfo) {
      return;
    }

    this.startTime = startInfo.startTime;
    this.playing = true;
    this.onStatus?.("playing", "Following the score.");
    this.frameId = window.requestAnimationFrame(this._frame);
  }

  stop({ silent = false } = {}) {
    this.playing = false;
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.metronome.stop();
    if (!silent) {
      this.onStatus?.("ready", "Playback stopped.");
    }
  }

  reset() {
    this.stop({ silent: true });
    if (this.cursor) {
      this.cursor.reset();
      this.cursor.show();
      this.stepIndex = 0;
      this.onStatus?.("ready", "Back to the top of the score.");
    }
  }

  _frame() {
    if (!this.playing) {
      return;
    }

    const elapsed = Math.max(0, this.audio.currentTime - this.startTime);
    const wholeNotesPerSecond = this.bpm * this.meter.beatQuarterLength / 240;
    let whole = elapsed * wholeNotesPerSecond;
    const duration = this.totalWhole;

    if (duration > 0 && this.getLoop?.()) {
      const loopIndex = Math.floor(whole / duration);
      if (loopIndex !== this.loopIndex) {
        this.loopIndex = loopIndex;
        this.cursor.reset();
        this.cursor.show();
        this.stepIndex = 0;
      }
      whole %= duration;
    } else if (duration > 0 && whole >= duration) {
      this._finish();
      return;
    }

    const target = this._indexForWhole(whole);
    this._advanceTo(target);
    this.frameId = window.requestAnimationFrame(this._frame);
  }

  _applyMobileSizing() {
    const svg = this.container.querySelector("svg");
    if (!svg || this.container.clientWidth >= 700) {
      return;
    }
    this.container.style.width = "";
    this.container.style.minWidth = "";
    this.container.style.overflowX = "";
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0) {
      svg.style.width = Math.round(rect.width) + "px";
      svg.style.height = "auto";
    }
  }

  _indexForWhole(whole) {
    let low = 0;
    let high = this.steps.length - 1;
    let result = 0;

    while (low <= high) {
      const middle = (low + high) >> 1;
      if (this.steps[middle] <= whole + 0.00001) {
        result = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return result;
  }

  _advanceTo(target) {
    if (!this.cursor || target === this.stepIndex) {
      return;
    }
    if (target < this.stepIndex) {
      this.cursor.reset();
      this.cursor.show();
      this.stepIndex = 0;
    }
    while (this.stepIndex < target) {
      this.cursor.next();
      this.stepIndex += 1;
    }
  }

  _finish() {
    this.playing = false;
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.metronome.stop();
    this.onStatus?.("finished", "That's the page. Run it again.");
  }
}

export class Metronome {
  constructor({ audio, onTick, onPlan, onBar, onStart, onStop } = {}) {
    this.audio = audio;
    this.onTick = onTick;
    this.onPlan = onPlan;
    this.onBar = onBar;
    this.onStart = onStart;
    this.onStop = onStop;

    this.running = false;
    this.startTime = 0;
    this.sequence = [];
    this.settings = {
      bpm: 80,
      subdivision: 2,
      beatsPerBar: 4,
      clickSound: "click",
      differentHandTones: false,
      accentDownbeat: true,
      accentEvents: true,
      planAhead: 4,
      audioAhead: 0.16,
    };

    this._timer = null;
    this._frame = null;
    this._token = 0;
    this._planned = [];
    this._audioCursor = 0;
    this._tickCursor = 0;
    this._nextIndex = 0;
    this._lastPlannedTime = -Infinity;
    this._lastBpm = this.settings.bpm;
    this._getBpmForBar = () => this.settings.bpm;
    this._frameLoop = this._frameLoop.bind(this);
    this._pump = this._pump.bind(this);
  }

  get elapsed() {
    if (!this.startTime) {
      return 0;
    }
    return Math.max(0, this.audio.currentTime - this.startTime);
  }

  setSequence(sequence) {
    this.sequence = Array.isArray(sequence) ? sequence : [];
  }

  async start(options = {}) {
    this.stop();
    const token = ++this._token;

    await this.audio.ensure();
    if (token !== this._token) {
      return null;
    }

    this.settings = {
      ...this.settings,
      ...options,
      bpm: this._clampBpm(options.bpm ?? this.settings.bpm),
      subdivision: this._clampSubdivision(options.subdivision ?? this.settings.subdivision),
      beatsPerBar: Math.max(1, Math.min(12, Number(options.beatsPerBar) || 4)),
    };
    this.sequence = Array.isArray(options.sequence) ? options.sequence : this.sequence;
    this._getBpmForBar =
      typeof options.getBpmForBar === "function"
        ? options.getBpmForBar
        : () => this.settings.bpm;

    this.startTime = this.audio.currentTime + 0.09;
    this._planned = [];
    this._audioCursor = 0;
    this._tickCursor = 0;
    this._nextIndex = 0;
    this._lastPlannedTime = -Infinity;
    this._lastBpm = this.settings.bpm;
    this.running = true;

    this._fillPlan();
    this._maintain();
    this._timer = window.setInterval(this._pump, 25);
    this._frame = window.requestAnimationFrame(this._frameLoop);

    const startInfo = {
      startTime: this.startTime,
      bpm: this.settings.bpm,
      subdivision: this.settings.subdivision,
      beatsPerBar: this.settings.beatsPerBar,
    };
    this.onStart?.(startInfo);
    return startInfo;
  }

  stop() {
    const wasRunning = this.running;
    this.running = false;
    this._token += 1;

    if (this._timer !== null) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
    if (this._frame !== null) {
      window.cancelAnimationFrame(this._frame);
      this._frame = null;
    }

    this._planned = [];
    this._audioCursor = 0;
    this._tickCursor = 0;

    if (wasRunning) {
      this.onStop?.();
    }
  }

  _clampBpm(value) {
    const bpm = Number(value);
    return Number.isFinite(bpm) ? Math.max(30, Math.min(300, bpm)) : 80;
  }

  _clampSubdivision(value) {
    const subdivision = Number(value);
    return [1, 2, 3, 4, 6].includes(subdivision) ? subdivision : 2;
  }

  _bpmForBar(bar) {
    const value = Number(this._getBpmForBar(bar));
    return Number.isFinite(value) ? Math.max(30, Math.min(300, value)) : this.settings.bpm;
  }

  _fillPlan() {
    const horizon = this.audio.currentTime + this.settings.planAhead;
    let guard = 0;

    while (this._lastPlannedTime < horizon && guard < 4096) {
      this._planNext();
      guard += 1;
    }
  }

  _planNext() {
    const subdivision = this.settings.subdivision;
    const beatsPerBar = this.settings.beatsPerBar;
    const ticksPerBar = beatsPerBar * subdivision;
    const index = this._nextIndex;
    const bar = Math.floor(index / ticksPerBar);
    const indexInBar = index % ticksPerBar;
    const beat = Math.floor(indexInBar / subdivision);
    const sub = indexInBar % subdivision;
    const bpm = this._bpmForBar(bar);
    const interval = 60 / Math.max(1, this._lastBpm) / subdivision;
    const time = index === 0 ? this.startTime : this._lastPlannedTime + interval;
    const isDownbeat = beat === 0 && sub === 0;
    const isBeat = sub === 0;
    const sequenceLength = this.sequence.length;
    const baseEvent =
      sequenceLength > 0
        ? this.sequence[index % sequenceLength]
        : { hand: null, graces: [], accent: false, buzz: false, sequenceIndex: 0 };
    const accent =
      (this.settings.accentDownbeat && isDownbeat) ||
      (this.settings.accentEvents && Boolean(baseEvent.accent));
    const level = accent ? 1 : isBeat ? 0.64 : 0.32;

    const event = {
      ...baseEvent,
      time,
      index,
      bar,
      beat,
      sub,
      bpm,
      isBeat,
      isDownbeat,
      isBarStart: isDownbeat,
      accent,
      level,
      sequenceIndex: index % Math.max(1, sequenceLength),
      sequenceLength,
      ticksPerBar,
    };

    this._planned.push(event);
    this._lastPlannedTime = time;
    this._lastBpm = bpm;
    this._nextIndex += 1;
    this.onPlan?.(event);
  }

  _scheduleAudio(now) {
    while (this._audioCursor < this._planned.length) {
      const event = this._planned[this._audioCursor];
      if (event.time > now + this.settings.audioAhead) {
        break;
      }
      this.audio.playClick(event.time, {
        sound: this.settings.clickSound,
        accent: event.accent,
        level: event.level,
        hand: this.settings.differentHandTones ? event.hand : null,
      });
      this._audioCursor += 1;
    }
  }

  _dispatchTicks(now) {
    while (this._tickCursor < this._planned.length) {
      const event = this._planned[this._tickCursor];
      if (event.time > now + 0.008) {
        break;
      }
      this._tickCursor += 1;
      this.onTick?.(event);
      if (event.isBarStart) {
        this.onBar?.(event);
      }
    }
  }

  _prune() {
    const removable = Math.min(this._audioCursor, this._tickCursor);
    if (removable > 96) {
      this._planned.splice(0, removable);
      this._audioCursor -= removable;
      this._tickCursor -= removable;
    }
  }

  _maintain() {
    const now = this.audio.currentTime;
    this._scheduleAudio(now);
    this._dispatchTicks(now);
    this._prune();
  }

  _pump() {
    if (!this.running) {
      return;
    }
    this._fillPlan();
    this._maintain();
  }

  _frameLoop() {
    if (!this.running) {
      return;
    }
    this._fillPlan();
    this._maintain();
    this._frame = window.requestAnimationFrame(this._frameLoop);
  }
}

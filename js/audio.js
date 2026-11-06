export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.volume = 0.75;
    this.supported = Boolean(window.AudioContext || window.webkitAudioContext);
  }

  async ensure() {
    if (!this.supported) {
      throw new Error("Web Audio is not available in this browser.");
    }

    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.18;
      this.master = this.context.createGain();
      this.master.gain.value = this._gainForVolume(this.volume);
      this.master.connect(this.compressor).connect(this.context.destination);
      this.noiseBuffer = this._buildNoiseBuffer();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  get currentTime() {
    return this.context?.currentTime ?? 0;
  }

  get state() {
    return this.context?.state ?? "uninitialized";
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (this.master && this.context) {
      const target = this._gainForVolume(this.volume);
      this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.018);
    }
  }

  playClick(time, options = {}) {
    if (!this.context || !this.master) {
      return;
    }

    const sound = options.sound ?? "click";
    const accent = Boolean(options.accent);
    const level = Math.max(0, Math.min(1, options.level ?? (accent ? 1 : 0.65)));
    const safeTime = Math.max(time, this.context.currentTime + 0.002);
    const pitch = options.hand === "R" ? 1.25 : options.hand === "L" ? 0.7 : 1;

    if (sound === "wood") {
      this._playWood(safeTime, accent, level, pitch);
    } else if (sound === "stick") {
      this._playStick(safeTime, accent, level, pitch);
    } else {
      this._playClick(safeTime, accent, level, pitch);
    }
  }

  _gainForVolume(volume) {
    return Math.pow(volume, 1.35);
  }

  _playClick(time, accent, level, pitch = 1) {
    const mainFrequency = (accent ? 1740 : 1220) * pitch;
    const length = accent ? 0.055 : 0.042;

    this._tone(time, {
      type: "sine",
      frequency: mainFrequency,
      endFrequency: mainFrequency * 0.54,
      gain: 0.42 * level * (accent ? 1.18 : 1),
      attack: 0.001,
      decay: length,
    });

    this._tone(time, {
      type: "triangle",
      frequency: (accent ? 2600 : 1900) * pitch,
      endFrequency: 1400 * pitch,
      gain: 0.09 * level,
      attack: 0.001,
      decay: length * 0.65,
    });

    this._noise(time, {
      gain: 0.055 * level,
      filterType: "highpass",
      frequency: (accent ? 2600 : 2000) * pitch,
      q: 0.7,
      decay: 0.018,
    });
  }

  _playWood(time, accent, level, pitch = 1) {
    const frequency = (accent ? 980 : 720) * pitch;
    this._tone(time, {
      type: "triangle",
      frequency,
      endFrequency: frequency * 0.7,
      gain: 0.48 * level,
      attack: 0.001,
      decay: accent ? 0.075 : 0.058,
    });
    this._tone(time, {
      type: "sine",
      frequency: frequency * 2.15,
      endFrequency: frequency * 1.5,
      gain: 0.14 * level,
      attack: 0.001,
      decay: 0.035,
    });
    this._noise(time, {
      gain: 0.115 * level,
      filterType: "bandpass",
      frequency: (accent ? 1900 : 1500) * pitch,
      q: 1.2,
      decay: 0.026,
    });
  }

  _playStick(time, accent, level, pitch = 1) {
    const frequency = (accent ? 1680 : 1220) * pitch;
    this._tone(time, {
      type: "square",
      frequency,
      endFrequency: frequency * 0.62,
      gain: 0.16 * level,
      attack: 0.001,
      decay: 0.032,
    });
    this._noise(time, {
      gain: 0.24 * level,
      filterType: "highpass",
      frequency: (accent ? 2200 : 1600) * pitch,
      q: 0.55,
      decay: accent ? 0.036 : 0.027,
    });
    this._noise(time, {
      gain: 0.1 * level,
      filterType: "bandpass",
      frequency: 5200 * pitch,
      q: 0.8,
      decay: 0.016,
    });
  }

  _tone(time, options) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const attack = options.attack ?? 0.001;
    const decay = options.decay ?? 0.05;
    const peak = Math.max(0.0002, options.gain);

    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(Math.max(30, options.frequency), time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, options.endFrequency), time + decay);

    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(peak, time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);

    oscillator.connect(envelope).connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + attack + decay + 0.015);
  }

  _noise(time, options) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const decay = options.decay ?? 0.025;
    const peak = Math.max(0.0002, options.gain);

    source.buffer = this.noiseBuffer;
    filter.type = options.filterType ?? "highpass";
    filter.frequency.setValueAtTime(options.frequency, time);
    filter.Q.setValueAtTime(options.q ?? 0.7, time);

    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(peak, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    source.connect(filter).connect(envelope).connect(this.master);
    source.start(time);
    source.stop(time + decay + 0.01);
  }

  _buildNoiseBuffer() {
    const length = Math.floor(this.context.sampleRate * 0.12);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

import {
  FAMILIES,
  RUDIMENTS,
  getRudiment,
} from "./rudiments.js";
import { METER_IDS, getMeter, getRhythm } from "./meter.js";
import { AudioEngine } from "./audio.js";
import { Metronome } from "./metronome.js";
import { NotationRenderer } from "./notation.js";
import {
  downloadMusicXml,
  generateMusicXML,
  musicXmlFilename,
} from "./scores.js";
import { ScorePlayer } from "./score-player.js";
import { buildPracticeSequence, createTempoCurve } from "./practice.js";

const STORAGE_KEY = "rudimentRoom.settings.v1";

const DEFAULT_STATE = {
  rudimentId: "single-stroke-roll",
  bpm: 80,
  subdivision: 4,
  timeSignature: "4/4",
  clickSound: "click",
  differentHandTones: false,
  volume: 75,
  accentDownbeat: true,
  accentEvents: true,
  rampEnabled: false,
  rampMin: 80,
  practiceMode: "basic",
  combinationIds: ["single-stroke-roll", "single-paradiddle"],
  rampTarget: 120,
  rampStep: 4,
  rampBars: 4,
  scoreLoop: false,
};

const SUBDIVISION_ORDER = [1, 2, 3, 4];
const isBrowserStorageAvailable = (() => {
  try {
    const probe = "__rudiment_room_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

const dom = {};
const state = { ...DEFAULT_STATE };
let currentSequenceData = null;
let transportPlaying = false;
let startingTrainer = false;
let restartTimer = null;
let elapsedTimer = null;
let activeTab = "trainer";
let lastTickBpm = state.bpm;
let notationPage = 0;
let scoreNeedsReload = true;
let scoreHasLoaded = false;

const audio = new AudioEngine();
let metronome;
let notation;
let scorePlayer;
let scoreOverflowObserver;

function cacheDom() {
  const ids = [
    "themeToggle", "themeLabel", "themeIcon", "rampMin",
    "practiceMode", "combinationPanel", "combinationList", "combinationCount",
    "handDisplay", "beatLights", "liveHand", "changeIndicator",
    "headerStatus",
    "headerStatusText",
    "headerTempo",
    "tabTrainer",
    "tabScore",
    "trainerPanel",
    "scorePanel",
    "rudimentSelect",
    "rudimentFamily",
    "rudimentNumber",
    "rudimentDescription",
    "patternStrip",
    "bpmDown",
    "bpmUp",
    "bpmValue",
    "bpmRange",
    "bpmBeatLabel",
    "subdivisionGroup", "noteValueSelect", "timeSignatureSelect", "meterBadge", "combinationHint",
    "subdivisionName",
    "soundGroup",
    "differentHandTones",
    "volumeRange",
    "volumeValue",
    "accentDownbeat",
    "accentEvents",
    "rampDetails",
    "rampEnabled",
    "rampTarget",
    "rampStep",
    "rampBars",
    "rampSummary",
    "rampCaption",
    "rampFields",
    "notationNumber",
    "notationTitle",
    "measureBadge",
    "subdivisionBadge",
    "notationViewport",
    "notationStage",
    "notationLoading",
    "notationError",
    "noteCount",
    "playButton",
    "playLabel",
    "resetButton",
    "transportCard",
    "barStat",
    "timeStat",
    "transportBpm",
    "scoreRudimentSelect",
    "scoreGenerate",
    "scoreFileInput",
    "scoreFileName",
    "scoreDownload",
    "scoreBeatLabel",
    "scoreTempoUnit",
    "scoreBpmDown",
    "scoreBpmUp",
    "scoreBpmValue",
    "scoreBpmRange",
    "scoreLoop",
    "scoreBeatLights",
    "scoreTitle",
    "scorePlayButton",
    "scorePlayLabel",
    "scoreResetButton",
    "scorePaper",
    "osmdContainer",
    "scoreLoading",
    "scoreError",
    "scoreStatus",
    "toastRegion",
  ];

  for (const id of ids) {
    dom[id] = document.getElementById(id);
  }
}

function loadState() {
  if (!isBrowserStorageAvailable) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    const rudiment = RUDIMENTS.find((item) => item.id === saved.rudimentId);
    if (rudiment) {
      state.rudimentId = rudiment.id;
    }
    state.bpm = clampNumber(saved.bpm, 30, 240, DEFAULT_STATE.bpm);
    const savedMeter = saved.timeSignature ?? `${saved.beatsPerBar ?? 4}/4`;
    state.timeSignature = METER_IDS.includes(savedMeter) ? savedMeter : "4/4";
    state.subdivision = SUBDIVISION_ORDER.includes(Number(saved.subdivision))
      ? Number(saved.subdivision)
      : getRudiment(state.rudimentId).defaultSubdivision;
    state.subdivision = getRhythm(state.subdivision, state.timeSignature).subdivision;
    state.clickSound = ["click", "wood", "stick"].includes(saved.clickSound)
      ? saved.clickSound
      : DEFAULT_STATE.clickSound;
    state.volume = clampNumber(saved.volume, 0, 100, DEFAULT_STATE.volume);
    state.differentHandTones = Boolean(saved.differentHandTones ?? DEFAULT_STATE.differentHandTones);
    state.accentDownbeat = Boolean(saved.accentDownbeat ?? DEFAULT_STATE.accentDownbeat);
    state.accentEvents = Boolean(saved.accentEvents ?? DEFAULT_STATE.accentEvents);
    state.rampEnabled = Boolean(saved.rampEnabled ?? DEFAULT_STATE.rampEnabled);
    state.rampMin = clampNumber(saved.rampMin, 30, 240, DEFAULT_STATE.rampMin);
    state.practiceMode = saved.practiceMode === "combination" ? "combination" : "basic";
    if (Array.isArray(saved.combinationIds)) {
      state.combinationIds = [...new Set(saved.combinationIds)].filter(id => RUDIMENTS.some(r => r.id === id)).slice(0, 4);
    }
    state.rampTarget = clampNumber(saved.rampTarget, 30, 240, DEFAULT_STATE.rampTarget);
    state.rampTarget = Math.max(state.rampMin, state.rampTarget);
    state.rampStep = clampNumber(saved.rampStep, 1, 20, DEFAULT_STATE.rampStep);
    state.rampBars = clampNumber(saved.rampBars, 1, 32, DEFAULT_STATE.rampBars);
    state.scoreLoop = Boolean(saved.scoreLoop ?? DEFAULT_STATE.scoreLoop);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  if (!isBrowserStorageAvailable) {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rudimentId: state.rudimentId,
        bpm: state.bpm,
        subdivision: state.subdivision,
        timeSignature: state.timeSignature,
        clickSound: state.clickSound,
        differentHandTones: state.differentHandTones,
        volume: state.volume,
        accentDownbeat: state.accentDownbeat,
        accentEvents: state.accentEvents,
        rampEnabled: state.rampEnabled,
        rampMin: state.rampMin,
        practiceMode: state.practiceMode,
        combinationIds: state.combinationIds,
        rampTarget: state.rampTarget,
        rampStep: state.rampStep,
        rampBars: state.rampBars,
        scoreLoop: state.scoreLoop,
      }),
    );
  } catch {
    return;
  }
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(number)));
}

function populateRudimentSelect(select) {
  const fragment = document.createDocumentFragment();
  for (const family of FAMILIES) {
    const group = document.createElement("optgroup");
    group.label = `${family.name} · ${family.start}–${family.end}`;
    for (const rudiment of RUDIMENTS.filter((item) => item.family === family.name)) {
      const option = document.createElement("option");
      option.value = rudiment.id;
      option.textContent = `${String(rudiment.number).padStart(2, "0")} · ${rudiment.name}`;
      group.append(option);
    }
    fragment.append(group);
  }
  select.replaceChildren(fragment);
}

function init() {
  cacheDom();
  loadState();
  syncTheme();
  populateCombinationList();
  populateRudimentSelect(dom.rudimentSelect);
  populateRudimentSelect(dom.scoreRudimentSelect);
  activeTab = "trainer";
  lastTickBpm = state.bpm;

  metronome = new Metronome({
    audio,
    onTick: handleTrainerTick,
    onBar: () => {},
  });

  notation = new NotationRenderer(dom.notationStage);

  scorePlayer = new ScorePlayer({
    container: dom.osmdContainer,
    audio,
    getBpm: () => state.bpm,
    getLoop: () => state.scoreLoop,
    getClickSound: () => state.clickSound,
    onStatus: handleScoreStatus,
    onBeat: handleScoreBeat,
    onReady: handleScoreReady,
  });

  scoreOverflowObserver = new ResizeObserver(updateScorePanHint);
  scoreOverflowObserver.observe(dom.osmdContainer);

  bindEvents();
  syncAllControls();
  syncPracticeMode();
  audio.setVolume(state.volume / 100);
  rebuildSequence();
  updateScoreAvailability(false);
  initializeNotation();
}

function initializeNotation() {
  dom.notationLoading.classList.remove("hidden");
  dom.notationError.classList.add("hidden");

  notation
    .init()
    .then(() => {
      dom.notationLoading.classList.add("hidden");
      if (currentSequenceData) {
        renderCurrentNotation();
      }
    })
    .catch((error) => {
      dom.notationLoading.classList.add("hidden");
      dom.notationError.textContent = error.message;
      dom.notationError.classList.remove("hidden");
      showToast(error.message, "error");
    });
}

function currentRudiment() {
  return getRudiment(state.rudimentId);
}

function rebuildSequence() {
  const rudiment = currentRudiment();
  currentSequenceData = buildPracticeSequence(rudiment, state.subdivision,
    state.practiceMode === "combination" ? state.combinationIds : [], state.timeSignature);
  notationPage = 0;
  lastTickBpm = state.bpm;
  metronome.setSequence(currentSequenceData.sequence);
  renderCurrentNotation();
  renderRudimentDetails();
  if (!transportPlaying) {
    renderHandIndicator(0, false);
    notation.clearPlayhead();
  }
}

function renderRudimentDetails() {
  const rudiment = currentRudiment();
  const data = currentSequenceData;
  const subdivision = getRhythm(state.subdivision, state.timeSignature);

  dom.rudimentFamily.textContent = rudiment.family;
  dom.rudimentFamily.dataset.family = rudiment.family.toLowerCase();
  dom.rudimentNumber.textContent = `PAS ${String(rudiment.number).padStart(2, "0")}`;
  dom.notationNumber.textContent = `PAS ${String(rudiment.number).padStart(2, "0")}`;
  dom.rudimentDescription.textContent = rudiment.description;
  dom.notationTitle.textContent = state.practiceMode === "combination" ? "Combination practice" : rudiment.name;
  dom.measureBadge.textContent = `${data.bars} ${data.bars === 1 ? "bar" : "bars"}`;
  dom.subdivisionBadge.textContent = subdivision.name;
  dom.meterBadge.textContent = state.timeSignature;
  dom.noteCount.textContent = `${data.sequence.length} strokes per cycle`;
  dom.subdivisionName.textContent = subdivision.name;
  renderPatternStrip(data.pattern);
}

function renderPatternStrip(pattern) {
  const fragment = document.createDocumentFragment();
  for (const event of pattern) {
    fragment.append(buildStrokeChip(event));
  }
  dom.patternStrip.replaceChildren(fragment);
}

function buildStrokeChip(event, active = false) {
  const chip = document.createElement("span");
  chip.className = "stroke-chip";
  chip.dataset.hand = event.hand;
  chip.classList.toggle("is-accent", Boolean(event.accent));
  chip.classList.toggle("is-buzz", Boolean(event.buzz));
  chip.classList.toggle("is-active", active);

  if (event.graces.length) {
    const grace = document.createElement("span");
    grace.className = "chip-grace";
    grace.textContent = event.graces.map((hand) => hand.toLowerCase()).join("");
    chip.append(grace);
  }

  const hand = document.createElement("span");
  hand.className = "chip-hand";
  hand.textContent = event.hand;
  chip.append(hand);

  if (event.accent) {
    const marker = document.createElement("span");
    marker.className = "chip-accent";
    marker.setAttribute("aria-hidden", "true");
    chip.append(marker);
  }

  const parts = [`${event.hand === "R" ? "Right" : "Left"} stroke`];
  if (event.graces.length) {
    parts.push(event.graces.length === 1 ? "flam" : "drag");
  }
  if (event.buzz) {
    parts.push("buzz");
  }
  if (event.accent) {
    parts.push("accent");
  }
  chip.setAttribute("aria-label", parts.join(", "));
  return chip;
}

function renderHandIndicator(index = 0, isActive = false) {
  if (!currentSequenceData?.sequence.length) return;
  const sequence = currentSequenceData.sequence;
  const count = Math.min(12, sequence.length);
  const fragment = document.createDocumentFragment();
  for (let offset = 0; offset < count; offset += 1) {
    const event = sequence[(index + offset) % sequence.length];
    fragment.append(buildStrokeChip(event, isActive && offset === 0));
  }
  dom.handDisplay.style.setProperty("--stroke-count", count);
  dom.handDisplay.replaceChildren(fragment);
}

function syncAllControls() {
  const rudiment = currentRudiment();
  dom.rudimentSelect.value = rudiment.id;
  dom.scoreRudimentSelect.value = rudiment.id;

  syncBpmControls();
  syncSubdivisionControls();
  syncMeterControls();
  syncSoundControls();
  syncToggles();
  syncRampControls();
  updateVolumeDisplay();
  updateRampSummary();

  dom.headerTempo.textContent = String(state.bpm);
  dom.transportBpm.textContent = String(state.bpm);
  dom.bpmBeatLabel.textContent = `${getMeter(state.timeSignature).beatName} = ${state.bpm}`;
}

function syncBpmControls() {
  dom.bpmValue.textContent = String(state.bpm);
  dom.bpmRange.value = String(state.bpm);
  dom.scoreBpmValue.textContent = String(state.bpm);
  dom.scoreBpmRange.value = String(state.bpm);
  dom.bpmBeatLabel.textContent = `${getMeter(state.timeSignature).beatName} = ${state.bpm}`;
  dom.headerTempo.textContent = String(transportPlaying ? lastTickBpm : state.bpm);
  if (!transportPlaying) {
    dom.transportBpm.textContent = String(state.bpm);
  }
}

function syncSubdivisionControls() {
  const meter = getMeter(state.timeSignature);
  for (const option of dom.noteValueSelect.options) {
    const value = Number(option.value);
    option.disabled = meter.compound && value === 3;
    option.hidden = option.disabled;
    option.textContent = option.disabled ? "Triplet eighth (simple meter)" : getRhythm(value, meter.id).label;
  }
  dom.noteValueSelect.value = String(state.subdivision);
}

function syncMeterControls() {
  const meter = getMeter(state.timeSignature);
  dom.timeSignatureSelect.value = meter.id;
  dom.meterBadge.textContent = state.timeSignature;
  dom.combinationHint.textContent = `Choose up to 4. Change every bar (${meter.beatsPerBar} beats).`;
  configureBeatLights(dom.beatLights, meter.beatsPerBar, true);
  syncBpmControls();
}

function setTimeSignature(value) {
  const timeSignature = getMeter(value).id;
  if (!METER_IDS.includes(timeSignature) || timeSignature === state.timeSignature) return;
  const wasPlaying = transportPlaying;
  stopTrainer({ silent: true });
  state.timeSignature = timeSignature;
  state.subdivision = getRhythm(state.subdivision, timeSignature).subdivision;
  syncSubdivisionControls();
  saveState();
  scoreNeedsReload = true;
  syncMeterControls();
  rebuildSequence();
  resetSessionDisplay();
  if (wasPlaying) startTrainer();
}

function syncSoundControls() {
  for (const button of dom.soundGroup.querySelectorAll("[data-sound]")) {
    button.setAttribute("aria-pressed", String(button.dataset.sound === state.clickSound));
  }
}

function syncToggles() {
  dom.differentHandTones.checked = state.differentHandTones;
  dom.accentDownbeat.checked = state.accentDownbeat;
  dom.accentEvents.checked = state.accentEvents;
  dom.rampEnabled.checked = state.rampEnabled;
  dom.scoreLoop.checked = state.scoreLoop;
  dom.rampMin.value = String(state.rampMin);
  dom.rampTarget.value = String(state.rampTarget);
  dom.rampStep.value = String(state.rampStep);
  dom.rampBars.value = String(state.rampBars);
  dom.rampFields.classList.toggle("is-muted", !state.rampEnabled);
}

function syncRampControls() {
  dom.rampEnabled.checked = state.rampEnabled;
  dom.rampMin.value = String(state.rampMin);
  dom.rampTarget.value = String(state.rampTarget);
  dom.rampStep.value = String(state.rampStep);
  dom.rampBars.value = String(state.rampBars);
  dom.rampFields.classList.toggle("is-muted", !state.rampEnabled);
  updateRampSummary();
}

function updateRampSummary() {
  const unit = state.rampBars === 1 ? "bar" : "bars";
  dom.rampSummary.textContent = `${state.rampMin} ↔ ${state.rampTarget} BPM · ${state.rampStep} BPM every ${state.rampBars} ${unit}`;
  dom.rampCaption.textContent = state.rampEnabled
    ? "Climb to the maximum, then ease back down. Repeat."
    : "Find your range. Build your control.";
}

function updateVolumeDisplay() {
  dom.volumeRange.value = String(state.volume);
  dom.volumeValue.textContent = `${state.volume}%`;
}

function selectRudiment(id, source = "trainer") {
  const rudiment = getRudiment(id);
  if (state.rudimentId === rudiment.id && source === "trainer") {
    return;
  }

  stopTrainer({ silent: true });
  state.rudimentId = rudiment.id;
  state.subdivision = getRhythm(rudiment.defaultSubdivision, state.timeSignature).subdivision;
  saveState();
  scoreNeedsReload = true;
  dom.rudimentSelect.value = rudiment.id;
  dom.scoreRudimentSelect.value = rudiment.id;
  syncSubdivisionControls();
  syncBpmControls();
  rebuildSequence();
  resetSessionDisplay();
  if (scorePlayer.playing) {
    scorePlayer.stop();
  }
  if (source === "score") {
    loadGeneratedScore();
  }
}

function setBpm(value, { restart = false } = {}) {
  const next = clampNumber(value, 30, 240, state.bpm);
  if (next === state.bpm) {
    syncBpmControls();
    return;
  }
  state.bpm = next;
  saveState();
  syncBpmControls();
  updateRampSummary();
  if (scorePlayer.playing) {
    scorePlayer.stop();
    showToast("Tempo changed. Press play to restart the score.", "info");
  }
  if (restart && transportPlaying) {
    scheduleTrainerRestart(180);
  }
}

function setSubdivision(value) {
  const subdivision = getRhythm(value, state.timeSignature).subdivision;
  if (!SUBDIVISION_ORDER.includes(subdivision) || subdivision === state.subdivision) {
    return;
  }
  state.subdivision = subdivision;
  saveState();
  scoreNeedsReload = true;
  syncSubdivisionControls();
  rebuildSequence();
  if (transportPlaying) {
    scheduleTrainerRestart(80);
  }
}

function setClickSound(sound) {
  if (!["click", "wood", "stick"].includes(sound)) {
    return;
  }
  state.clickSound = sound;
  metronome.settings.clickSound = sound;
  saveState();
  syncSoundControls();
}

function setVolume(value) {
  state.volume = clampNumber(value, 0, 100, state.volume);
  audio.setVolume(state.volume / 100);
  updateVolumeDisplay();
  saveState();
}

function toggleRamp(enabled) {
  state.rampEnabled = Boolean(enabled);
  saveState();
  syncRampControls();
  if (transportPlaying) {
    scheduleTrainerRestart(120);
  }
}

function setRampField(field, value) {
  const config = {
    rampMin: [30, 240],
    rampTarget: [30, 240],
    rampStep: [1, 20],
    rampBars: [1, 32],
  };
  if (!config[field]) {
    return;
  }
  state[field] = clampNumber(value, config[field][0], config[field][1], state[field]);
  if (state.rampMin > state.rampTarget) {
    if (field === "rampMin") state.rampTarget = state.rampMin;
    else state.rampMin = state.rampTarget;
  }
  saveState();
  syncRampControls();
  if (transportPlaying) {
    scheduleTrainerRestart(260);
  }
}

function rampForBarFactory(startBpm) {
  return createTempoCurve({ enabled: state.rampEnabled, bpm: startBpm,
    min: state.rampMin, max: state.rampTarget, step: state.rampStep, bars: state.rampBars });
}

async function startTrainer() {
  if (state.practiceMode === "combination" && !state.combinationIds.length) {
    showToast("Select at least one rudiment for your rotation.");
    return;
  }
  if (transportPlaying || startingTrainer) {
    return;
  }

  if (scorePlayer.playing) {
    scorePlayer.stop();
  }

  startingTrainer = true;
  dom.playButton.disabled = true;
  setHeaderStatus("Warming up", "ready");
  audio.setVolume(state.volume / 100);
  notation.clearPlayhead();

  try {
    const startInfo = await metronome.start({
      bpm: state.rampEnabled ? state.rampMin : state.bpm,
      subdivision: currentSequenceData.rhythm.ticksPerBeat,
      beatsPerBar: currentSequenceData.meter.beatsPerBar,
      clickSound: state.clickSound,
      differentHandTones: state.differentHandTones,
      accentDownbeat: state.accentDownbeat,
      accentEvents: state.accentEvents,
      sequence: currentSequenceData.sequence,
      getBpmForBar: rampForBarFactory(state.bpm),
    });

    if (!startInfo) {
      return;
    }

    transportPlaying = true;
    lastTickBpm = startInfo.bpm;
    dom.playButton.disabled = false;
    dom.transportCard.classList.add("is-playing");
    dom.notationViewport.classList.add("is-playing");
    dom.playLabel.textContent = "Stop practice";
    dom.playButton.dataset.state = "playing";
    dom.transportBpm.textContent = String(Math.round(startInfo.bpm));
    dom.headerTempo.textContent = String(Math.round(startInfo.bpm));
    setHeaderStatus(
      state.rampEnabled ? "Tempo trainer on" : "Playing",
      state.rampEnabled ? "ramp" : "playing",
    );
    notation.setPlayhead(0);
    startElapsedTimer();
  } catch (error) {
    transportPlaying = false;
    dom.playButton.disabled = false;
    setHeaderStatus("Audio unavailable", "error");
    showToast(error.message || "The metronome could not start.", "error");
  } finally {
    startingTrainer = false;
    if (!transportPlaying) {
      dom.playButton.disabled = false;
      setPlayButtonIdle();
    }
  }
}

function stopTrainer({ silent = false } = {}) {
  window.clearTimeout(restartTimer);
  restartTimer = null;
  window.clearInterval(elapsedTimer);
  elapsedTimer = null;

  const wasPlaying = transportPlaying;
  transportPlaying = false;
  metronome.stop();
  notation.clearPlayhead();
  dom.transportCard.classList.remove("is-playing");
  dom.notationViewport.classList.remove("is-playing");
  renderBeatLights(dom.beatLights, -1, false);
  setPlayButtonIdle();
  dom.changeIndicator.textContent = "";
  dom.liveHand.textContent = "Ready";
  dom.liveHand.dataset.hand = "";
  renderHandIndicator(0, false);
  lastTickBpm = state.bpm;
  dom.transportBpm.textContent = String(state.bpm);
  dom.headerTempo.textContent = String(state.bpm);
  if (!silent) {
    if (wasPlaying) {
      setHeaderStatus("Studio ready", "ready");
    } else {
      setHeaderStatus("Studio ready", "ready");
    }
  }
}

function scheduleTrainerRestart(delay = 120) {
  if (!transportPlaying) {
    return;
  }
  window.clearTimeout(restartTimer);
  restartTimer = window.setTimeout(async () => {
    restartTimer = null;
    if (!transportPlaying) {
      return;
    }
    stopTrainer({ silent: true });
    await startTrainer();
  }, delay);
}

function setPlayButtonIdle() {
  dom.playButton.disabled = false;
  dom.playButton.dataset.state = "idle";
  dom.playLabel.textContent = "Start practice";
}

function resetSessionDisplay() {
  dom.barStat.textContent = "—";
  dom.timeStat.textContent = "0:00";
  dom.transportBpm.textContent = String(state.bpm);
  dom.headerTempo.textContent = String(state.bpm);
  dom.changeIndicator.textContent = "";
  dom.liveHand.textContent = "Ready";
  dom.liveHand.dataset.hand = "";
  renderBeatLights(dom.beatLights, -1, false);
  renderHandIndicator(0, false);
}

function handleTrainerTick(event) {
  if (!transportPlaying) {
    return;
  }

  lastTickBpm = event.bpm;
  const pageLength = currentSequenceData.notesPerBar * currentSequenceData.bars;
  const page = Math.floor(event.sequenceIndex / pageLength);
  if (page !== notationPage) {
    notationPage = page;
    renderCurrentNotation();
  }
  notation.setPlayhead(event.sequenceIndex % pageLength);
  if (state.practiceMode === "combination" && state.combinationIds.length > 1) {
    const nextIndex = ((Math.floor(event.sequenceIndex / currentSequenceData.notesPerBar) + 1) * currentSequenceData.notesPerBar) % currentSequenceData.sequence.length;
    dom.changeIndicator.textContent = `Next: ${currentSequenceData.sequence[nextIndex].rudimentName} · ${currentSequenceData.meter.beatsPerBar - event.beat} beats`;
    dom.notationTitle.textContent = event.rudimentName;
  }

  if (event.isBeat) {
    renderBeatLights(dom.beatLights, event.beat, event.isDownbeat);
  }

  dom.barStat.textContent = String(event.bar + 1);
  dom.transportBpm.textContent = String(Math.round(event.bpm));
  dom.headerTempo.textContent = String(Math.round(event.bpm));
  dom.liveHand.textContent = describeStroke(event);
  dom.liveHand.dataset.hand = event.hand;
  renderHandIndicator(event.sequenceIndex, true);
  updateElapsedDisplay();

  if (state.rampEnabled) {
    setHeaderStatus(`Tempo trainer · ${Math.round(event.bpm)} BPM`, "ramp");
  }
}

function describeStroke(event) {
  if (event.buzz) {
    return `${event.hand === "R" ? "Right" : "Left"} · buzz`;
  }
  if (event.graces.length) {
    return `${event.hand === "R" ? "Right" : "Left"} · ${event.graces.length === 1 ? "flam" : "drag"}`;
  }
  if (event.accent) {
    return `${event.hand === "R" ? "Right" : "Left"} · accent`;
  }
  return `${event.hand === "R" ? "Right" : "Left"} stroke`;
}

function startElapsedTimer() {
  window.clearInterval(elapsedTimer);
  elapsedTimer = window.setInterval(updateElapsedDisplay, 250);
}

function updateElapsedDisplay() {
  if (!transportPlaying) {
    return;
  }
  dom.timeStat.textContent = formatDuration(metronome.elapsed);
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function renderBeatLights(container, beat, isDownbeat) {
  const lights = [...container.children];
  lights.forEach((light, index) => {
    const active = beat >= 0 && index === beat;
    light.classList.toggle("is-active", active);
    light.classList.toggle("is-downbeat", active && isDownbeat);
  });
}

function configureBeatLights(container, beats, numbered = false) {
  const count = Math.max(1, Math.min(12, Number(beats) || 4));
  if (container.children.length === count) {
    return;
  }
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const light = document.createElement("span");
    light.dataset.beat = String(index);
    if (numbered) light.textContent = String(index + 1);
    fragment.append(light);
  }
  container.replaceChildren(fragment);
}

function handleScoreBeat(event) {
  if (!scorePlayer?.playing) {
    return;
  }
  renderBeatLights(dom.scoreBeatLights, event.beat, event.isDownbeat);
  dom.headerTempo.textContent = String(Math.round(event.bpm));
}

function updateScorePanHint() {
  dom.scorePaper.classList.toggle(
    "has-overflow",
    dom.scorePaper.scrollWidth > dom.scorePaper.clientWidth + 1,
  );
}

function handleScoreReady(info) {
  scoreHasLoaded = true;
  scoreNeedsReload = false;
  dom.scoreTitle.textContent = info.title;
  dom.scoreFileName.textContent = info.isCustom
    ? info.filename
    : `PAS ${String(currentRudiment().number).padStart(2, "0")} · ${currentRudiment().name}`;
  dom.scoreBeatLabel.textContent = info.meter.id;
  dom.scoreTempoUnit.textContent = `${info.meter.beatName} BPM`;
  configureBeatLights(dom.scoreBeatLights, info.meter.beatsPerBar);
  updateScoreAvailability(true);
  window.requestAnimationFrame(updateScorePanHint);
}

function handleScoreStatus(status, message) {
  if (status === "loading") {
    dom.scoreLoading.classList.remove("hidden");
    dom.scoreError.classList.add("hidden");
    dom.scorePaper.classList.remove("has-overflow");
    dom.scoreStatus.textContent = message;
    updateScoreAvailability(false);
    setHeaderIfScoreActive("Engraving score", "ready");
    return;
  }

  if (status === "playing") {
    dom.scoreLoading.classList.add("hidden");
    dom.scoreError.classList.add("hidden");
    dom.scoreStatus.textContent = message;
    dom.scorePlayLabel.textContent = "Stop score";
    dom.scorePlayButton.dataset.state = "playing";
    dom.scorePlayButton.disabled = false;
    dom.scoreResetButton.disabled = false;
    setHeaderIfScoreActive("Following the score", "playing");
    return;
  }

  if (status === "finished") {
    dom.scoreLoading.classList.add("hidden");
    dom.scorePlayLabel.textContent = "Replay score";
    dom.scorePlayButton.dataset.state = "idle";
    dom.scorePlayButton.disabled = false;
    dom.scoreStatus.textContent = message;
    renderBeatLights(dom.scoreBeatLights, -1, false);
    setHeaderIfScoreActive("Studio ready", "ready");
    return;
  }

  if (status === "error") {
    scoreHasLoaded = false;
    dom.scoreLoading.classList.add("hidden");
    dom.scorePaper.classList.remove("has-overflow");
    dom.scoreError.textContent = message;
    dom.scoreError.classList.remove("hidden");
    dom.scoreStatus.textContent = "The score could not be loaded.";
    dom.scorePlayLabel.textContent = "Play score";
    dom.scorePlayButton.dataset.state = "idle";
    updateScoreAvailability(false);
    setHeaderIfScoreActive("Score error", "error");
    return;
  }

  dom.scoreLoading.classList.add("hidden");
  dom.scoreError.classList.add("hidden");
  dom.scoreStatus.textContent = message;
  dom.scorePlayLabel.textContent = "Play score";
  dom.scorePlayButton.dataset.state = "idle";
  dom.scorePlayButton.disabled = !scoreHasLoaded;
  dom.scoreResetButton.disabled = !scoreHasLoaded;
  renderBeatLights(dom.scoreBeatLights, -1, false);
  setHeaderIfScoreActive("Studio ready", "ready");
}

function setHeaderIfScoreActive(text, tone) {
  if (activeTab === "score") {
    setHeaderStatus(text, tone);
  }
}

function updateScoreAvailability(enabled) {
  const hasScore = enabled || scoreHasLoaded;
  dom.scorePlayButton.disabled = !hasScore;
  dom.scoreResetButton.disabled = !hasScore;
  if (!hasScore) {
    dom.scorePlayButton.dataset.state = "idle";
    dom.scorePlayLabel.textContent = "Play score";
  }
}

async function loadGeneratedScore({ quiet = false } = {}) {
  const rudiment = currentRudiment();
  const label = `PAS ${String(rudiment.number).padStart(2, "0")} · ${rudiment.name}`;
  scoreNeedsReload = false;
  dom.scoreFileName.textContent = label;
  dom.scoreTitle.textContent = label;

  try {
    const xml = generateMusicXML(rudiment, state.subdivision, { bpm: state.bpm, timeSignature: state.timeSignature });
    const loaded = await scorePlayer.loadXml(xml, {
      title: label,
      filename: musicXmlFilename(rudiment),
      meter: state.timeSignature,
      isCustom: false,
    });
    if (loaded === false) {
      scoreNeedsReload = true;
    }
  } catch (error) {
    scoreNeedsReload = true;
    scoreHasLoaded = false;
    updateScoreAvailability(false);
    if (!quiet) {
      showToast(error.message || "The generated score could not be loaded.", "error");
    }
  }
}

async function ensureScoreForTab() {
  if (!scoreHasLoaded || scoreNeedsReload) {
    await loadGeneratedScore({ quiet: scoreHasLoaded });
  }
}

function switchTab(tab) {
  if (tab === activeTab) {
    if (tab === "score" && (!scoreHasLoaded || scoreNeedsReload)) {
      ensureScoreForTab();
    }
    return;
  }

  if (activeTab === "trainer") {
    stopTrainer({ silent: true });
  } else if (scorePlayer.playing) {
    scorePlayer.stop();
  }

  activeTab = tab;
  const trainerActive = tab === "trainer";
  dom.trainerPanel.hidden = !trainerActive;
  dom.scorePanel.hidden = trainerActive;
  dom.tabTrainer.classList.toggle("is-active", trainerActive);
  dom.tabScore.classList.toggle("is-active", !trainerActive);
  dom.tabTrainer.setAttribute("aria-selected", String(trainerActive));
  dom.tabScore.setAttribute("aria-selected", String(!trainerActive));
  dom.tabTrainer.tabIndex = trainerActive ? 0 : -1;
  dom.tabScore.tabIndex = trainerActive ? -1 : 0;

  if (!trainerActive) {
    setHeaderStatus("Score room", "ready");
    dom.headerTempo.textContent = String(state.bpm);
    ensureScoreForTab();
  } else {
    setHeaderStatus(transportPlaying ? "Playing" : "Studio ready", "ready");
    dom.headerTempo.textContent = String(transportPlaying ? lastTickBpm : state.bpm);
    renderCurrentNotation();
  }
}

async function toggleScore() {
  if (!scoreHasLoaded) {
    await ensureScoreForTab();
  }
  if (!scoreHasLoaded) {
    return;
  }
  if (scorePlayer.playing) {
    scorePlayer.stop();
    return;
  }

  try {
    await scorePlayer.play();
  } catch (error) {
    handleScoreStatus("error", error.message || "The score could not play.");
    showToast(error.message || "The score could not play.", "error");
  }
}

function bindEvents() {
  dom.themeToggle.addEventListener("click", () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    syncTheme();
    try { window.localStorage.setItem("rudimentRoom.theme", document.documentElement.dataset.theme); } catch {}
    renderCurrentNotation();
  });
  dom.practiceMode.addEventListener("click", event => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    stopTrainer({ silent: true });
    state.practiceMode = button.dataset.mode;
    syncPracticeMode();
    rebuildSequence();
    resetSessionDisplay();
    saveState();
  });
  dom.combinationList.addEventListener("change", event => {
    const input = event.target.closest("input[data-rudiment]");
    if (!input) return;
    if (input.checked && state.combinationIds.length >= 4) {
      input.checked = false;
      showToast("Choose up to four rudiments for your rotation.");
      return;
    }
    stopTrainer({ silent: true });
    state.combinationIds = input.checked ? [...state.combinationIds, input.dataset.rudiment]
      : state.combinationIds.filter(id => id !== input.dataset.rudiment);
    syncPracticeMode();
    rebuildSequence();
    resetSessionDisplay();
    saveState();
  });
  dom.rudimentSelect.addEventListener("change", (event) => {
    selectRudiment(event.target.value, "trainer");
  });

  dom.scoreRudimentSelect.addEventListener("change", (event) => {
    selectRudiment(event.target.value, "score");
  });

  dom.tabTrainer.addEventListener("click", () => switchTab("trainer"));
  dom.tabScore.addEventListener("click", () => switchTab("score"));

  document.querySelector(".tab-list").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const next = activeTab === "trainer" ? "score" : "trainer";
    switchTab(next);
    (next === "trainer" ? dom.tabTrainer : dom.tabScore).focus();
  });

  dom.bpmDown.addEventListener("click", () => {
    setBpm(state.bpm - 5, { restart: true });
  });
  dom.bpmUp.addEventListener("click", () => {
    setBpm(state.bpm + 5, { restart: true });
  });
  dom.scoreBpmDown.addEventListener("click", () => {
    setBpm(state.bpm - 5, { restart: false });
  });
  dom.scoreBpmUp.addEventListener("click", () => {
    setBpm(state.bpm + 5, { restart: false });
  });

  dom.bpmRange.addEventListener("input", (event) => {
    setBpm(event.target.value, { restart: true });
  });
  dom.scoreBpmRange.addEventListener("input", (event) => {
    setBpm(event.target.value, { restart: false });
  });

  dom.timeSignatureSelect.addEventListener("change", event => setTimeSignature(event.target.value));
  dom.noteValueSelect.addEventListener("change", event => setSubdivision(event.target.value));

  dom.soundGroup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sound]");
    if (button) {
      setClickSound(button.dataset.sound);
    }
  });

  dom.volumeRange.addEventListener("input", (event) => {
    setVolume(event.target.value);
  });

  dom.differentHandTones.addEventListener("change", (event) => {
    state.differentHandTones = event.target.checked;
    metronome.settings.differentHandTones = state.differentHandTones;
    saveState();
  });

  dom.accentDownbeat.addEventListener("change", (event) => {
    state.accentDownbeat = event.target.checked;
    saveState();
    if (transportPlaying) {
      scheduleTrainerRestart(80);
    }
  });

  dom.accentEvents.addEventListener("change", (event) => {
    state.accentEvents = event.target.checked;
    saveState();
    if (transportPlaying) {
      scheduleTrainerRestart(80);
    }
  });

  dom.rampEnabled.addEventListener("change", (event) => {
    toggleRamp(event.target.checked);
  });

  for (const field of ["rampMin", "rampTarget", "rampStep", "rampBars"]) {
    const input = dom[field];
    input.addEventListener("input", (event) => {
      if (event.target.value === "") {
        return;
      }
      setRampField(field, event.target.value);
    });
    input.addEventListener("change", (event) => {
      setRampField(field, event.target.value);
    });
  }

  dom.playButton.addEventListener("click", async () => {
    if (transportPlaying) {
      stopTrainer();
    } else {
      await startTrainer();
    }
  });

  dom.resetButton.addEventListener("click", () => {
    stopTrainer({ silent: true });
    resetSessionDisplay();
    setHeaderStatus("Studio ready", "ready");
    showToast("Session reset.", "info");
  });

  dom.scorePlayButton.addEventListener("click", toggleScore);

  dom.scoreResetButton.addEventListener("click", () => {
    scorePlayer.reset();
    renderBeatLights(dom.scoreBeatLights, -1, false);
  });

  dom.scoreLoop.addEventListener("change", (event) => {
    state.scoreLoop = event.target.checked;
    saveState();
  });

  dom.scoreGenerate.addEventListener("click", () => {
    loadGeneratedScore();
  });

  dom.scoreFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!/\.(xml|musicxml|mxl)$/i.test(file.name)) {
      showToast("Choose an .xml, .musicxml, or .mxl file.", "error");
      return;
    }

    dom.scoreTitle.textContent = file.name.replace(/\.[^.]+$/, "");
    dom.scoreFileName.textContent = file.name;
    try {
      const loaded = await scorePlayer.loadFile(file);
      if (loaded) {
        scoreHasLoaded = true;
        scoreNeedsReload = false;
        showToast(`Loaded ${file.name}.`, "success");
      }
    } catch (error) {
      scoreNeedsReload = true;
      scoreHasLoaded = false;
      updateScoreAvailability(false);
      showToast(error.message || "That MusicXML file could not be loaded.", "error");
    }
  });

  dom.scoreDownload.addEventListener("click", () => {
    const rudiment = currentRudiment();
    const xml = generateMusicXML(rudiment, state.subdivision, { bpm: state.bpm, timeSignature: state.timeSignature });
    downloadMusicXml(xml, musicXmlFilename(rudiment));
    showToast("MusicXML downloaded.", "success");
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isEditing = target.closest("input, textarea, select, button, a, [contenteditable='true']");
    if (isEditing || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (activeTab === "trainer") {
        if (transportPlaying) {
          stopTrainer();
        } else {
          startTrainer();
        }
      } else {
        toggleScore();
      }
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? 5 : -5;
      setBpm(state.bpm + delta, { restart: activeTab === "trainer" });
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (transportPlaying) {
        stopTrainer({ silent: true });
        setHeaderStatus("Paused for background tab", "ready");
      }
      if (scorePlayer.playing) {
        scorePlayer.stop();
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    metronome?.stop();
    scorePlayer?.stop({ silent: true });
  });
}

function setHeaderStatus(text, tone = "ready") {
  if (!dom.headerStatus) {
    return;
  }
  dom.headerStatusText.textContent = text;
  dom.headerStatus.dataset.tone = tone;
}

function showToast(message, tone = "info") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.tone = tone;
  toast.textContent = message;
  dom.toastRegion.append(toast);
  window.requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 240);
  }, 3400);
}


function renderCurrentNotation() {
  if (!currentSequenceData || !notation) return;
  const length = currentSequenceData.notesPerBar * currentSequenceData.bars;
  notation.render(currentSequenceData.sequence.slice(notationPage * length, (notationPage + 1) * length), state.subdivision, currentSequenceData.bars, currentSequenceData.meter.id);
}

function syncTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  dom.themeToggle.setAttribute("aria-pressed", String(dark));
  dom.themeToggle.setAttribute("aria-label", dark ? "Enable light mode" : "Enable dark mode");
  dom.themeLabel.textContent = dark ? "Light mode" : "Dark mode";
  dom.themeIcon.textContent = dark ? "☼" : "◐";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#171a18" : "#f3efe5";
}

function populateCombinationList() {
  const fragment = document.createDocumentFragment();
  for (const rudiment of RUDIMENTS) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.rudiment = rudiment.id;
    checkbox.checked = state.combinationIds.includes(rudiment.id);
    label.append(checkbox, document.createTextNode(`${String(rudiment.number).padStart(2, "0")} ${rudiment.name}`));
    fragment.append(label);
  }
  dom.combinationList.replaceChildren(fragment);
}

function syncPracticeMode() {
  for (const button of dom.practiceMode.querySelectorAll("[data-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.practiceMode));
  }
  dom.combinationPanel.hidden = state.practiceMode !== "combination";
  dom.combinationCount.textContent = `${state.combinationIds.length} / 4`;
}

init();

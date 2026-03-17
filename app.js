const { scopePresets, waveformOptions, antennaCatalog, sourceProfiles, shieldMaterials, englishStaticText, uiText } = window.SIM_DATA;

const validViews = new Set(["home", "scope", "shieldAntenna", "shieldSetup", "analyzer", "generator", "manual"]);
const shieldExperimentViews = new Set(["shieldAntenna", "shieldSetup", "generator", "analyzer"]);
const scopeDivisions = { horizontal: 10, vertical: 8 };
const generatorUnitScale = { hz: 1, khz: 1000, mhz: 1000000, ghz: 1000000000 };
const generatorUnitLabel = { hz: "Hz", khz: "kHz", mhz: "MHz", ghz: "GHz" };
const koreanStaticText = window.SIM_DATA.koreanStaticText || {};
const analyzerRbwOptions = [120, 300, 1000];
const analyzerScaleOptions = [5, 10, 20];
const analyzerTuningSteps = [1, 5, 10, 50];

function safeStorageGet(key, fallback) {
  try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function safeStorageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch { return; }
}

function getViewFromHash() {
  const hash = window.location.hash.replace("#", "");
  return validViews.has(hash) ? hash : "home";
}

const state = {
  language: safeStorageGet("simulatorLanguage", "ko"),
  activeView: getViewFromHash(),
  animationTime: 0,
  scope: {
    presetIndex: 0,
    waveform: scopePresets[0].waveform,
    amplitude: scopePresets[0].amplitude,
    frequency: scopePresets[0].frequency,
    offset: scopePresets[0].offset,
    noise: scopePresets[0].noise,
    voltsPerDiv: 1,
    timePerDiv: 0.001,
    triggerLevel: 0,
    coupling: "dc",
    invert: false,
    running: true,
    phase: 0,
    lastFrameTime: performance.now(),
    frozenWaveform: null,
    measurementFrequency: scopePresets[0].frequency,
  },
  analyzer: {
    txAntennaId: "biconical",
    rxAntennaId: "biconical",
    rxPlacement: "open",
    sourceProfileId: "cw",
    carrierMHz: 120,
    txPowerDbm: 10,
    distanceM: 3,
    shieldEnabled: false,
    shieldMaterialId: "steel",
    shieldEffectivenessDb: 75,
    shieldLeakagePct: 12,
    centerMHz: 120,
    spanMHz: 200,
    rbwKHz: 120,
    refLevelDbm: -20,
    dbPerDiv: 10,
    sweepRunning: true,
    showReferenceTrace: true,
    markerEnabled: true,
    markerFreqMHz: null,
    signalTrackEnabled: false,
    tuningStepMHz: 5,
    lastSweepTime: 0,
    referenceSnapshot: null,
    latestTrace: null,
    latestReferenceTrace: null,
  },
  analyzerConsole: {
    editTarget: "center",
    entryBuffer: "",
    entryUnit: "mhz",
  },
  generator: {
    frequencyValue: 120,
    frequencyUnit: "mhz",
    levelDbm: 10,
    outputEnabled: false,
    liveFrequencyHz: 120000000,
    liveLevelDbm: 10,
    hasFired: false,
    editTarget: "freq",
  },
  render: {
    scopeCanvasDirty: true,
    analyzerStateDirty: true,
    analyzerCanvasDirty: true,
  },
};

const elements = {
  translationNodes: document.querySelectorAll("[data-i18n]"),
  flowSummaryValues: document.querySelectorAll("[data-flow-summary-value]"),
  navButtons: document.querySelectorAll("[data-view-target]"),
  navShieldButton: document.querySelector("#navShield"),
  languageToggle: document.querySelector("#languageToggle"),
  homeShieldButton: document.querySelector("#homeShieldButton"),
  homePciButton: document.querySelector("#homePciButton"),
  shieldingCardButton: document.querySelector("#shieldingCardButton"),
  pciCardButton: document.querySelector("#pciCardButton"),
  shieldFlowHiddenHost: document.querySelector("#shieldFlowHiddenHost"),
  shieldAntennaSlot: document.querySelector("#shieldAntennaSlot"),
  shieldSetupSlot: document.querySelector("#shieldSetupSlot"),
  shieldAntennaNextButton: document.querySelector("#shieldAntennaNextButton"),
  shieldSetupBackButton: document.querySelector("#shieldSetupBackButton"),
  shieldSetupNextButton: document.querySelector("#shieldSetupNextButton"),
  antennaInventory: document.querySelector("#antennaInventory"),
  txDropZone: document.querySelector("#txDropZone"),
  rxDropZone: document.querySelector("#rxDropZone"),
  shieldDropZone: document.querySelector("#shieldDropZone"),
  txStageName: document.querySelector("#txStageName"),
  txStageBand: document.querySelector("#txStageBand"),
  rxStageName: document.querySelector("#rxStageName"),
  rxStageBand: document.querySelector("#rxStageBand"),
  shieldStageName: document.querySelector("#shieldStageName"),
  shieldStageBand: document.querySelector("#shieldStageBand"),
  shieldStageBadge: document.querySelector("#shieldStageBadge"),
  stageDistanceValue: document.querySelector("#stageDistanceValue"),
  openGeneratorButton: document.querySelector("#openGeneratorButton"),
  workflowToGeneratorButton: document.querySelector("#workflowToGeneratorButton"),
  workflowTxValue: document.querySelector("#workflowTxValue"),
  workflowRxValue: document.querySelector("#workflowRxValue"),
  workflowRxPlacementValue: document.querySelector("#workflowRxPlacementValue"),
  workflowFrequencyValue: document.querySelector("#workflowFrequencyValue"),
  workflowLevelValue: document.querySelector("#workflowLevelValue"),
  workflowCenterValue: document.querySelector("#workflowCenterValue"),
  workflowRbwValue: document.querySelector("#workflowRbwValue"),
  experimentSetupPanel: document.querySelector("#experimentSetupPanel"),
  quickSetupPanel: document.querySelector("#quickSetupPanel"),
  analyzerCheckPanel: document.querySelector("#analyzerCheckPanel"),
  analyzerReportRack: document.querySelector("#analyzerReportRack"),
  quickDistanceInput: document.querySelector("#quickDistanceInput"),
  quickShieldEffectivenessInput: document.querySelector("#quickShieldEffectivenessInput"),
  quickShieldLeakageInput: document.querySelector("#quickShieldLeakageInput"),
  quickCenterInput: document.querySelector("#quickCenterInput"),
  quickSpanInput: document.querySelector("#quickSpanInput"),
  quickRbwInput: document.querySelector("#quickRbwInput"),
  quickSetupToGeneratorButton: document.querySelector("#quickSetupToGeneratorButton"),
  views: {
    home: document.querySelector("#homeView"),
    scope: document.querySelector("#scopeView"),
    shieldAntenna: document.querySelector("#shieldAntennaView"),
    shieldSetup: document.querySelector("#shieldSetupView"),
    analyzer: document.querySelector("#analyzerView"),
    generator: document.querySelector("#generatorView"),
    manual: document.querySelector("#manualView"),
  },
  presetSelect: document.querySelector("#presetSelect"),
  waveformSelect: document.querySelector("#waveformSelect"),
  amplitudeInput: document.querySelector("#amplitudeInput"),
  amplitudeOutput: document.querySelector("#amplitudeOutput"),
  frequencyInput: document.querySelector("#frequencyInput"),
  frequencyOutput: document.querySelector("#frequencyOutput"),
  offsetInput: document.querySelector("#offsetInput"),
  offsetOutput: document.querySelector("#offsetOutput"),
  noiseInput: document.querySelector("#noiseInput"),
  noiseOutput: document.querySelector("#noiseOutput"),
  voltsPerDiv: document.querySelector("#voltsPerDiv"),
  couplingSelect: document.querySelector("#couplingSelect"),
  invertToggle: document.querySelector("#invertToggle"),
  timePerDiv: document.querySelector("#timePerDiv"),
  triggerLevel: document.querySelector("#triggerLevel"),
  triggerOutput: document.querySelector("#triggerOutput"),
  runToggle: document.querySelector("#runToggle"),
  runIndicator: document.querySelector("#runIndicator"),
  runStateLabel: document.querySelector("#runStateLabel"),
  overlayScale: document.querySelector("#overlayScale"),
  overlayTrigger: document.querySelector("#overlayTrigger"),
  metricVpp: document.querySelector("#metricVpp"),
  metricVrms: document.querySelector("#metricVrms"),
  metricFreq: document.querySelector("#metricFreq"),
  metricPeriod: document.querySelector("#metricPeriod"),
  metricMean: document.querySelector("#metricMean"),
  metricMax: document.querySelector("#metricMax"),
  scopeCanvas: document.querySelector("#scopeCanvas"),
  txAntennaSelect: document.querySelector("#txAntennaSelect"),
  rxAntennaSelect: document.querySelector("#rxAntennaSelect"),
  sourceProfileSelect: document.querySelector("#sourceProfileSelect"),
  carrierFreqOutput: document.querySelector("#carrierFreqOutput"),
  txPowerOutput: document.querySelector("#txPowerOutput"),
  distanceInput: document.querySelector("#distanceInput"),
  distanceOutput: document.querySelector("#distanceOutput"),
  shieldEnabledToggle: document.querySelector("#shieldEnabledToggle"),
  shieldMaterialSelect: document.querySelector("#shieldMaterialSelect"),
  shieldEffectivenessInput: document.querySelector("#shieldEffectivenessInput"),
  shieldEffectivenessOutput: document.querySelector("#shieldEffectivenessOutput"),
  shieldLeakageInput: document.querySelector("#shieldLeakageInput"),
  shieldLeakageOutput: document.querySelector("#shieldLeakageOutput"),
  analyzerCenterInput: document.querySelector("#analyzerCenterInput"),
  analyzerCenterOutput: document.querySelector("#analyzerCenterOutput"),
  analyzerSpanSelect: document.querySelector("#analyzerSpanSelect"),
  analyzerRbwSelect: document.querySelector("#analyzerRbwSelect"),
  autoTuneButton: document.querySelector("#autoTuneButton"),
  captureBaselineButton: document.querySelector("#captureBaselineButton"),
  clearBaselineButton: document.querySelector("#clearBaselineButton"),
  analyzerSweepReadout: document.querySelector("#analyzerSweepReadout"),
  baselineState: document.querySelector("#baselineState"),
  analyzerScaleDisplay: document.querySelector("#analyzerScaleDisplay"),
  analyzerScaleMeta: document.querySelector("#analyzerScaleMeta"),
  analyzerOverlayScale: document.querySelector("#analyzerOverlayScale"),
  analyzerOverlayBand: document.querySelector("#analyzerOverlayBand"),
  analyzerLinkStatus: document.querySelector("#analyzerLinkStatus"),
  analyzerStatusDot: document.querySelector("#analyzerStatusDot"),
  analyzerMetricPeakFreq: document.querySelector("#analyzerMetricPeakFreq"),
  analyzerMetricPeakLevel: document.querySelector("#analyzerMetricPeakLevel"),
  analyzerMetricDelta: document.querySelector("#analyzerMetricDelta"),
  analyzerMetricShieldLoss: document.querySelector("#analyzerMetricShieldLoss"),
  analyzerMetricPathLoss: document.querySelector("#analyzerMetricPathLoss"),
  analyzerMetricNoiseFloor: document.querySelector("#analyzerMetricNoiseFloor"),
  summaryTxAntennaValue: document.querySelector("#summaryTxAntennaValue"),
  summaryRxAntennaValue: document.querySelector("#summaryRxAntennaValue"),
  summaryOverlapValue: document.querySelector("#summaryOverlapValue"),
  summaryCarrierBandValue: document.querySelector("#summaryCarrierBandValue"),
  summaryShieldStateValue: document.querySelector("#summaryShieldStateValue"),
  summaryReferenceValue: document.querySelector("#summaryReferenceValue"),
  analyzerStatusNote: document.querySelector("#analyzerStatusNote"),
  analyzerCanvas: document.querySelector("#analyzerCanvas"),
  analyzerEntryTarget: document.querySelector("#analyzerEntryTarget"),
  analyzerEntryBuffer: document.querySelector("#analyzerEntryBuffer"),
  analyzerStepDisplay: document.querySelector("#analyzerStepDisplay"),
  analyzerActionButtons: document.querySelectorAll("[data-analyzer-action]"),
  analyzerKeypadButtons: document.querySelectorAll("[data-analyzer-keypad]"),
  analyzerUnitButtons: document.querySelectorAll("[data-analyzer-unit]"),
  generatorFrequencyInput: document.querySelector("#generatorFrequencyInput"),
  generatorLevelInput: document.querySelector("#generatorLevelInput"),
  generatorLevelButton: document.querySelector("#generatorLevelButton"),
  generatorUnitButtons: document.querySelectorAll("[data-generator-unit]"),
  generatorLevelStepButtons: document.querySelectorAll("[data-level-step]"),
  generatorFireButton: document.querySelector("#generatorFireButton"),
  generatorOutputToggle: document.querySelector("#generatorOutputToggle"),
  generatorOutputDot: document.querySelector("#generatorOutputDot"),
  generatorOutputState: document.querySelector("#generatorOutputState"),
  generatorFrequencyDisplay: document.querySelector("#generatorFrequencyDisplay"),
  generatorLevelDisplay: document.querySelector("#generatorLevelDisplay"),
  generatorUnitDisplay: document.querySelector("#generatorUnitDisplay"),
  generatorLinkDisplay: document.querySelector("#generatorLinkDisplay"),
  generatorConsoleMode: document.querySelector("#generatorConsoleMode"),
  generatorSummaryFreqValue: document.querySelector("#generatorSummaryFreqValue"),
  generatorSummaryLevelValue: document.querySelector("#generatorSummaryLevelValue"),
  generatorSummaryOutputValue: document.querySelector("#generatorSummaryOutputValue"),
  generatorSummaryAnalyzerValue: document.querySelector("#generatorSummaryAnalyzerValue"),
  generatorToAntennaButton: document.querySelector("#generatorToAntennaButton"),
  generatorToAnalyzerButton: document.querySelector("#generatorToAnalyzerButton"),
};

const defaultStaticText = Object.fromEntries([...elements.translationNodes].map((node) => [node.dataset.i18n, node.textContent.trim()]));
const scopeCtx = elements.scopeCanvas.getContext("2d");
const analyzerCtx = elements.analyzerCanvas.getContext("2d");

const tx = (key) => uiText[state.language][key];
const st = (key) => (state.language === "ko" ? koreanStaticText[key] || defaultStaticText[key] : englishStaticText[key] || defaultStaticText[key] || key);
const fmtHz = (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} kHz` : `${v.toFixed(1)} Hz`);
const fmtTime = (v) => (v < 0.001 ? `${(v * 1000000).toFixed(1)} us` : `${(v * 1000).toFixed(2)} ms`);
const fmtV = (v) => `${v.toFixed(2)} V`;
const fmtDbm = (v) => `${v.toFixed(1)} dBm`;
const fmtDb = (v) => `${v.toFixed(1)} dB`;
const fmtM = (v) => `${v.toFixed(1)} m`;
const fmtMHz = (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} GHz` : `${v.toFixed(1)} MHz`);
const fmtRfFrequency = (frequencyHz) => {
  if (frequencyHz >= 1000000000) return `${(frequencyHz / 1000000000).toFixed(3)} GHz`;
  if (frequencyHz >= 1000000) return `${(frequencyHz / 1000000).toFixed(3)} MHz`;
  if (frequencyHz >= 1000) return `${(frequencyHz / 1000).toFixed(3)} kHz`;
  return `${frequencyHz.toFixed(1)} Hz`;
};
const fmtGeneratorValue = (value) => {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(1);
  if (value >= 10) return value.toFixed(3);
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
};
const getAntenna = (id) => antennaCatalog.find((item) => item.id === id);
const getShieldMaterial = (id) => shieldMaterials.find((item) => item.id === id);
const getAntennaLabel = (id) => getAntenna(id)?.label[state.language] || "-";
const simNoise = (seed) => {
  const x = Math.sin(seed * 12.9898 + state.animationTime * 1.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snapToOptions(value, options) {
  return options.reduce((closest, option) => (Math.abs(option - value) < Math.abs(closest - value) ? option : closest), options[0]);
}

function populateSelect(select, items, selectedValue, getValue, getLabel) {
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = getValue(item, index);
    option.textContent = getLabel(item, index);
    fragment.appendChild(option);
  });
  select.replaceChildren(fragment);
  select.value = selectedValue;
}

function formatAntennaBand(antenna) {
  return antenna ? `${fmtMHz(antenna.minMHz)} ~ ${fmtMHz(antenna.maxMHz)}` : "-";
}

function getAnalyzerScale() {
  const topDbm = state.analyzer.refLevelDbm;
  const rangeDb = state.analyzer.dbPerDiv * scopeDivisions.vertical;
  return { topDbm, bottomDbm: topDbm - rangeDb, rangeDb };
}

function defaultAnalyzerUnit(target) {
  if (target === "rbw") return "khz";
  if (target === "ref") return "dbm";
  return "mhz";
}

function analyzerTargetTextKey(target) {
  return {
    center: "analyzerTargetCenter",
    span: "analyzerTargetSpan",
    rbw: "analyzerTargetRbw",
    ref: "analyzerTargetRef",
  }[target] || "analyzerTargetCenter";
}

function formatAnalyzerTargetValue(target) {
  if (target === "span") return fmtMHz(state.analyzer.spanMHz);
  if (target === "rbw") return `${state.analyzer.rbwKHz.toFixed(0)} kHz`;
  if (target === "ref") return fmtDbm(state.analyzer.refLevelDbm);
  return fmtMHz(state.analyzer.centerMHz);
}

function setAnalyzerConsoleTarget(target) {
  state.analyzerConsole.editTarget = target;
  state.analyzerConsole.entryBuffer = "";
  state.analyzerConsole.entryUnit = defaultAnalyzerUnit(target);
  syncAnalyzerConsoleOutputs();
}

function setAnalyzerRefLevel(value) {
  const nextValue = Number(value);
  state.analyzer.refLevelDbm = clamp(Number.isFinite(nextValue) ? nextValue : state.analyzer.refLevelDbm, -120, 30);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function cycleAnalyzerScale() {
  const nextIndex = (analyzerScaleOptions.indexOf(state.analyzer.dbPerDiv) + 1) % analyzerScaleOptions.length;
  state.analyzer.dbPerDiv = analyzerScaleOptions[nextIndex];
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function appendAnalyzerEntry(value) {
  const next = state.analyzerConsole.entryBuffer;
  if (value === "." && next.includes(".")) return;
  if (value === "-") {
    if (state.analyzerConsole.editTarget !== "ref") return;
    state.analyzerConsole.entryBuffer = next.startsWith("-") ? next.slice(1) : `-${next}`;
    syncAnalyzerConsoleOutputs();
    return;
  }
  state.analyzerConsole.entryBuffer = `${next}${value}`;
  syncAnalyzerConsoleOutputs();
}

function clearAnalyzerEntry() {
  state.analyzerConsole.entryBuffer = "";
  syncAnalyzerConsoleOutputs();
}

function backspaceAnalyzerEntry() {
  state.analyzerConsole.entryBuffer = state.analyzerConsole.entryBuffer.slice(0, -1);
  syncAnalyzerConsoleOutputs();
}

function analyzerEntryValue(unit) {
  const raw = Number(state.analyzerConsole.entryBuffer);
  if (!Number.isFinite(raw)) return null;
  if (state.analyzerConsole.editTarget === "center" || state.analyzerConsole.editTarget === "span") {
    return raw * (generatorUnitScale[unit] / 1000000);
  }
  if (state.analyzerConsole.editTarget === "rbw") {
    if (unit === "mhz") return raw * 1000;
    if (unit === "hz") return raw / 1000;
    if (unit === "ghz") return raw * 1000000;
    return raw;
  }
  return raw;
}

function commitAnalyzerEntry(unitOverride = null) {
  const target = state.analyzerConsole.editTarget;
  const unit = unitOverride || state.analyzerConsole.entryUnit;
  if (!state.analyzerConsole.entryBuffer) {
    syncAnalyzerConsoleOutputs();
    return;
  }
  const nextValue = analyzerEntryValue(unit);
  if (!Number.isFinite(nextValue)) return;
  if (target === "center") setAnalyzerCenter(nextValue);
  else if (target === "span") setAnalyzerSpan(nextValue);
  else if (target === "rbw") setAnalyzerRbw(nextValue);
  else if (target === "ref") setAnalyzerRefLevel(nextValue);
  state.analyzerConsole.entryBuffer = "";
  state.analyzerConsole.entryUnit = defaultAnalyzerUnit(target);
  syncAnalyzerConsoleOutputs();
}

function nudgeAnalyzerTarget(direction) {
  const target = state.analyzerConsole.editTarget;
  if (target === "center") setAnalyzerCenter(state.analyzer.centerMHz + state.analyzer.tuningStepMHz * direction);
  else if (target === "span") {
    const spanStepMHz = state.analyzer.spanMHz >= 10 ? 10 : state.analyzer.spanMHz >= 1 ? 1 : state.analyzer.spanMHz >= 0.1 ? 0.1 : state.analyzer.spanMHz >= 0.01 ? 0.01 : 0.001;
    setAnalyzerSpan(state.analyzer.spanMHz + spanStepMHz * direction);
  }
  else if (target === "rbw") {
    const index = analyzerRbwOptions.indexOf(state.analyzer.rbwKHz);
    const nextIndex = clamp(index + direction, 0, analyzerRbwOptions.length - 1);
    setAnalyzerRbw(analyzerRbwOptions[nextIndex]);
  } else if (target === "ref") {
    setAnalyzerRefLevel(state.analyzer.refLevelDbm + state.analyzer.dbPerDiv * direction);
  }
}

function cycleAnalyzerStep() {
  const nextIndex = (analyzerTuningSteps.indexOf(state.analyzer.tuningStepMHz) + 1) % analyzerTuningSteps.length;
  state.analyzer.tuningStepMHz = analyzerTuningSteps[nextIndex];
  syncAnalyzerConsoleOutputs();
}

function toggleAnalyzerSweep(forceState = null) {
  state.analyzer.sweepRunning = typeof forceState === "boolean" ? forceState : !state.analyzer.sweepRunning;
  if (state.analyzer.sweepRunning) {
    state.analyzer.lastSweepTime = 0;
    markAnalyzerDirty();
  }
  syncAnalyzerOutputs();
}

function toggleAnalyzerReferenceOverlay() {
  if (!state.analyzer.referenceSnapshot) return;
  state.analyzer.showReferenceTrace = !state.analyzer.showReferenceTrace;
  state.render.analyzerCanvasDirty = true;
  syncAnalyzerOutputs();
}

function toggleAnalyzerMarker() {
  state.analyzer.markerEnabled = !state.analyzer.markerEnabled;
  state.render.analyzerCanvasDirty = true;
  syncAnalyzerOutputs();
}

function performAnalyzerPeakSearch() {
  const { trace } = computeAnalyzerState();
  state.analyzer.markerEnabled = true;
  state.analyzer.markerFreqMHz = trace.peakFreqMHz;
  state.render.analyzerCanvasDirty = true;
  syncAnalyzerOutputs();
}

function runAnalyzerAutoSet() {
  syncAnalyzerFromGenerator();
  state.analyzer.centerMHz = state.analyzer.carrierMHz;
  state.analyzer.spanMHz = 200;
  state.analyzer.rbwKHz = 120;
  state.analyzer.refLevelDbm = state.generator.outputEnabled ? clamp(state.analyzer.txPowerDbm - 20, -90, 10) : -20;
  if (elements.analyzerCenterInput) elements.analyzerCenterInput.value = String(state.analyzer.centerMHz);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function toggleSignalTrack() {
  state.analyzer.signalTrackEnabled = !state.analyzer.signalTrackEnabled;
  if (state.analyzer.signalTrackEnabled) {
    syncAnalyzerFromGenerator();
    state.analyzer.centerMHz = state.analyzer.carrierMHz;
  }
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function syncAnalyzerConsoleOutputs() {
  if (elements.analyzerEntryTarget) elements.analyzerEntryTarget.textContent = st(analyzerTargetTextKey(state.analyzerConsole.editTarget));
  if (elements.analyzerEntryBuffer) {
    const buffer = state.analyzerConsole.entryBuffer;
    const suffix = state.analyzerConsole.editTarget === "ref" || !buffer
      ? ""
      : ` ${generatorUnitLabel[state.analyzerConsole.entryUnit]}`;
    elements.analyzerEntryBuffer.textContent = buffer ? `${buffer}${suffix}` : formatAnalyzerTargetValue(state.analyzerConsole.editTarget);
  }
  if (elements.analyzerStepDisplay) elements.analyzerStepDisplay.textContent = `${st("analyzerStepLabel")} ${fmtMHz(state.analyzer.tuningStepMHz)}`;
  if (elements.analyzerScaleMeta) elements.analyzerScaleMeta.textContent = st("analyzerEntryHint");
  elements.analyzerActionButtons.forEach((button) => {
    const { analyzerAction } = button.dataset;
    const isActive =
      (analyzerAction === "select-center" && state.analyzerConsole.editTarget === "center") ||
      (analyzerAction === "select-span" && state.analyzerConsole.editTarget === "span") ||
      (analyzerAction === "select-rbw" && state.analyzerConsole.editTarget === "rbw") ||
      (analyzerAction === "select-ref" && state.analyzerConsole.editTarget === "ref") ||
      ((analyzerAction === "toggle-sweep" || analyzerAction === "start-sweep") && state.analyzer.sweepRunning) ||
      (analyzerAction === "stop-sweep" && !state.analyzer.sweepRunning) ||
      (analyzerAction === "toggle-reference" && state.analyzer.referenceSnapshot && state.analyzer.showReferenceTrace) ||
      (analyzerAction === "toggle-marker" && state.analyzer.markerEnabled) ||
      (analyzerAction === "toggle-track" && state.analyzer.signalTrackEnabled);
    button.classList.toggle("is-active", isActive);
    if (analyzerAction === "toggle-reference" || analyzerAction === "clear-baseline") {
      button.disabled = !state.analyzer.referenceSnapshot;
    } else if (analyzerAction === "start-sweep") {
      button.disabled = state.analyzer.sweepRunning;
    } else if (analyzerAction === "stop-sweep") {
      button.disabled = !state.analyzer.sweepRunning;
    } else if (analyzerAction === "clear-entry" || analyzerAction === "backspace-entry" || analyzerAction === "enter-entry") {
      button.disabled = !state.analyzerConsole.entryBuffer;
    } else if (!button.classList.contains("analyzer-hardkey-disabled")) {
      button.disabled = false;
    }
  });
  elements.analyzerUnitButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.analyzerUnit === state.analyzerConsole.entryUnit));
}

function handleAnalyzerAction(action) {
  if (action === "select-center") {
    setAnalyzerConsoleTarget("center");
    return;
  }
  if (action === "select-span") {
    setAnalyzerConsoleTarget("span");
    return;
  }
  if (action === "select-rbw") {
    setAnalyzerConsoleTarget("rbw");
    return;
  }
  if (action === "select-ref") {
    if (state.analyzerConsole.editTarget === "ref") cycleAnalyzerScale();
    else setAnalyzerConsoleTarget("ref");
    return;
  }
  if (action === "auto-set") {
    runAnalyzerAutoSet();
    return;
  }
  if (action === "toggle-sweep") {
    toggleAnalyzerSweep();
    return;
  }
  if (action === "start-sweep") {
    toggleAnalyzerSweep(true);
    return;
  }
  if (action === "stop-sweep") {
    toggleAnalyzerSweep(false);
    return;
  }
  if (action === "toggle-reference") {
    toggleAnalyzerReferenceOverlay();
    return;
  }
  if (action === "capture-baseline") {
    state.analyzer.referenceSnapshot = analyzerSnapshot();
    state.analyzer.latestReferenceTrace = state.analyzer.sweepRunning
      ? buildAnalyzerTrace(state.analyzer.referenceSnapshot)
      : state.analyzer.latestTrace;
    state.analyzer.showReferenceTrace = true;
    state.render.analyzerCanvasDirty = true;
    syncAnalyzerOutputs();
    return;
  }
  if (action === "clear-baseline") {
    state.analyzer.referenceSnapshot = null;
    state.analyzer.latestReferenceTrace = null;
    state.analyzer.showReferenceTrace = false;
    state.render.analyzerCanvasDirty = true;
    syncAnalyzerOutputs();
    return;
  }
  if (action === "measure-focus") {
    focusPanel(elements.analyzerReportRack);
    return;
  }
  if (action === "open-generator") {
    setActiveView("generator");
    focusPanel(elements.generatorFrequencyInput);
    return;
  }
  if (action === "toggle-marker") {
    toggleAnalyzerMarker();
    return;
  }
  if (action === "peak-search") {
    performAnalyzerPeakSearch();
    return;
  }
  if (action === "cycle-step") {
    cycleAnalyzerStep();
    return;
  }
  if (action === "toggle-track") {
    toggleSignalTrack();
    return;
  }
  if (action === "clear-entry") {
    clearAnalyzerEntry();
    return;
  }
  if (action === "backspace-entry") {
    backspaceAnalyzerEntry();
    return;
  }
  if (action === "enter-entry") {
    commitAnalyzerEntry();
    return;
  }
  if (action === "nudge-up" || action === "nudge-right") {
    nudgeAnalyzerTarget(1);
    return;
  }
  if (action === "nudge-down" || action === "nudge-left") {
    nudgeAnalyzerTarget(-1);
  }
}

function markScopeDirty() {
  state.render.scopeCanvasDirty = true;
}

function markAnalyzerDirty() {
  state.render.analyzerStateDirty = true;
  state.render.analyzerCanvasDirty = true;
}

function getGeneratorFrequencyHz() {
  return Math.max(0.001, Number(state.generator.frequencyValue) || 0.001) * generatorUnitScale[state.generator.frequencyUnit];
}

function getLiveGeneratorFrequencyHz() {
  return Math.max(0.001, Number(state.generator.liveFrequencyHz) || 0.001);
}

function syncAnalyzerFromGenerator() {
  const nextCarrierMHz = getLiveGeneratorFrequencyHz() / 1000000;
  const nextTxPowerDbm = state.generator.liveLevelDbm;
  if (state.analyzer.carrierMHz !== nextCarrierMHz || state.analyzer.txPowerDbm !== nextTxPowerDbm) {
    state.analyzer.carrierMHz = nextCarrierMHz;
    state.analyzer.txPowerDbm = nextTxPowerDbm;
    if (state.analyzer.signalTrackEnabled) state.analyzer.centerMHz = clamp(nextCarrierMHz, 10, 18000);
    markAnalyzerDirty();
  }
}

function syncQuickSetupInputs() {
  if (elements.quickDistanceInput) elements.quickDistanceInput.value = state.analyzer.distanceM.toFixed(1);
  if (elements.quickShieldEffectivenessInput) elements.quickShieldEffectivenessInput.value = state.analyzer.shieldEffectivenessDb.toFixed(0);
  if (elements.quickShieldLeakageInput) elements.quickShieldLeakageInput.value = state.analyzer.shieldLeakagePct.toFixed(0);
  if (elements.quickCenterInput) elements.quickCenterInput.value = state.analyzer.centerMHz.toFixed(0);
  if (elements.quickSpanInput) elements.quickSpanInput.value = state.analyzer.spanMHz >= 1 ? state.analyzer.spanMHz.toFixed(3).replace(/\.?0+$/, "") : state.analyzer.spanMHz.toFixed(6).replace(/\.?0+$/, "");
  if (elements.quickRbwInput) elements.quickRbwInput.value = state.analyzer.rbwKHz.toFixed(0);
}

function setAnalyzerDistance(value) {
  const nextValue = Number(value);
  state.analyzer.distanceM = clamp(Number.isFinite(nextValue) ? nextValue : state.analyzer.distanceM, 1, 10);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function setShieldEffectiveness(value) {
  const nextValue = Number(value);
  state.analyzer.shieldEffectivenessDb = clamp(Number.isFinite(nextValue) ? nextValue : state.analyzer.shieldEffectivenessDb, 20, 120);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function setShieldLeakage(value) {
  const nextValue = Number(value);
  state.analyzer.shieldLeakagePct = clamp(Number.isFinite(nextValue) ? nextValue : state.analyzer.shieldLeakagePct, 0, 80);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function setAnalyzerCenter(value) {
  const nextValue = Number(value);
  state.analyzer.centerMHz = clamp(Number.isFinite(nextValue) ? nextValue : state.analyzer.centerMHz, 10, 18000);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function setAnalyzerSpan(value) {
  const nextValue = Number(value);
  state.analyzer.spanMHz = clamp(Number.isFinite(nextValue) ? nextValue : state.analyzer.spanMHz, 0.001, 5000);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function setAnalyzerRbw(value) {
  const nextValue = Number(value);
  const clampedValue = clamp(Number.isFinite(nextValue) ? nextValue : state.analyzer.rbwKHz, analyzerRbwOptions[0], analyzerRbwOptions[analyzerRbwOptions.length - 1]);
  state.analyzer.rbwKHz = snapToOptions(clampedValue, analyzerRbwOptions);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function fireGenerator() {
  state.generator.liveFrequencyHz = getGeneratorFrequencyHz();
  state.generator.liveLevelDbm = state.generator.levelDbm;
  state.generator.outputEnabled = true;
  state.generator.hasFired = true;
  syncAnalyzerFromGenerator();
  if (state.analyzer.signalTrackEnabled || !state.analyzer.referenceSnapshot) state.analyzer.centerMHz = state.analyzer.carrierMHz;
  if (elements.analyzerCenterInput) elements.analyzerCenterInput.value = String(state.analyzer.centerMHz);
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function stopGenerator() {
  state.generator.outputEnabled = false;
  markAnalyzerDirty();
  syncAnalyzerOutputs();
}

function clearAntennaDropStates() {
  elements.txDropZone?.classList.remove("is-dragover");
  elements.rxDropZone?.classList.remove("is-dragover");
  elements.shieldDropZone?.classList.remove("is-dragover");
  elements.antennaInventory?.querySelectorAll(".antenna-card").forEach((card) => card.classList.remove("is-dragging"));
}

function updateStageSlot(role, antenna) {
  const slotMap = {
    tx: { zone: elements.txDropZone, nameNode: elements.txStageName, bandNode: elements.txStageBand, emptyBand: tx("stageEmptyBand") },
    rx: { zone: elements.rxDropZone, nameNode: elements.rxStageName, bandNode: elements.rxStageBand, emptyBand: tx("stageOpenBand") },
    shield: { zone: elements.shieldDropZone, nameNode: elements.shieldStageName, bandNode: elements.shieldStageBand, emptyBand: tx("stageShieldBand") },
  };
  const { zone, nameNode, bandNode, emptyBand } = slotMap[role] || {};
  if (!zone || !nameNode || !bandNode) return;
  if (!antenna) {
    zone.classList.remove("is-occupied");
    nameNode.textContent = tx("stageEmptyName");
    bandNode.textContent = emptyBand;
    return;
  }
  zone.classList.add("is-occupied");
  nameNode.textContent = antenna.label[state.language];
  bandNode.textContent = formatAntennaBand(antenna);
}

function syncAntennaStage() {
  const txAntenna = getAntenna(state.analyzer.txAntennaId);
  const rxAntenna = getAntenna(state.analyzer.rxAntennaId);
  updateStageSlot("tx", txAntenna);
  updateStageSlot("rx", state.analyzer.rxPlacement === "open" ? rxAntenna : null);
  updateStageSlot("shield", state.analyzer.rxPlacement === "shield" ? rxAntenna : null);
  if (elements.stageDistanceValue) elements.stageDistanceValue.textContent = fmtM(state.analyzer.distanceM);
  if (elements.shieldStageBadge) elements.shieldStageBadge.textContent = state.analyzer.shieldEnabled ? tx("stageShieldOn") : tx("stageShieldOff");
  elements.shieldDropZone?.classList.toggle("is-shielded", state.analyzer.shieldEnabled);
  elements.antennaInventory?.querySelectorAll(".antenna-card").forEach((card) => {
    const { antennaId } = card.dataset;
    card.classList.toggle("is-selected-tx", antennaId === state.analyzer.txAntennaId);
    card.classList.toggle("is-selected-rx", antennaId === state.analyzer.rxAntennaId);
  });
}

function renderAntennaInventory() {
  if (!elements.antennaInventory) return;
  const fragment = document.createDocumentFragment();
  antennaCatalog.slice(0, 4).forEach((antenna) => {
    const card = document.createElement("article");
    card.className = "antenna-card";
    card.draggable = true;
    card.dataset.antennaId = antenna.id;

    const thumb = document.createElement("div");
    thumb.className = "antenna-thumb";
    const thumbLabel = document.createElement("span");
    thumbLabel.textContent = st("stageImagePlaceholder");
    thumb.appendChild(thumbLabel);

    const copy = document.createElement("div");
    copy.className = "antenna-card-copy";
    const name = document.createElement("strong");
    name.className = "antenna-card-name";
    name.textContent = antenna.label[state.language];
    const band = document.createElement("span");
    band.className = "antenna-card-band";
    band.textContent = formatAntennaBand(antenna);
    copy.append(name, band);

    const meta = document.createElement("div");
    meta.className = "antenna-card-meta";
    [
      `${Math.round(antenna.minMHz)} - ${Math.round(antenna.maxMHz)} MHz`,
      `${state.language === "ko" ? "이득" : "Gain"} ${antenna.gainDb.toFixed(1)} dBi`,
    ].forEach((label) => {
      const chip = document.createElement("span");
      chip.className = "antenna-meta-chip";
      chip.textContent = label;
      meta.appendChild(chip);
    });

    card.append(thumb, copy, meta);
    card.addEventListener("dragstart", (event) => {
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", antenna.id);
    });
    card.addEventListener("dragend", () => clearAntennaDropStates());
    fragment.appendChild(card);
  });
  elements.antennaInventory.replaceChildren(fragment);
  syncAntennaStage();
}

function assignStageAntenna(role, antennaId) {
  if (!getAntenna(antennaId)) return;
  if (role === "tx") {
    state.analyzer.txAntennaId = antennaId;
    elements.txAntennaSelect.value = antennaId;
  } else if (role === "rx") {
    state.analyzer.rxAntennaId = antennaId;
    state.analyzer.rxPlacement = "open";
    state.analyzer.shieldEnabled = false;
    elements.rxAntennaSelect.value = antennaId;
    elements.shieldEnabledToggle.checked = false;
  } else if (role === "shield") {
    state.analyzer.rxAntennaId = antennaId;
    state.analyzer.rxPlacement = "shield";
    state.analyzer.shieldEnabled = true;
    elements.rxAntennaSelect.value = antennaId;
    elements.shieldEnabledToggle.checked = true;
  }
  markAnalyzerDirty();
  syncAntennaStage();
  syncAnalyzerOutputs();
}

function syncGeneratorOutputs() {
  const frequencyLabel = `${fmtGeneratorValue(state.generator.frequencyValue)} ${generatorUnitLabel[state.generator.frequencyUnit]}`;
  const analyzerLink = state.generator.outputEnabled
    ? `${fmtRfFrequency(getLiveGeneratorFrequencyHz())} / ${fmtDbm(state.generator.liveLevelDbm)}`
    : tx("generatorPendingFeed");
  if (elements.generatorFrequencyInput) elements.generatorFrequencyInput.value = String(state.generator.frequencyValue);
  if (elements.generatorLevelInput) elements.generatorLevelInput.value = state.generator.levelDbm.toFixed(1);
  elements.generatorUnitButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.generatorUnit === state.generator.frequencyUnit));
  if (elements.generatorFrequencyDisplay) elements.generatorFrequencyDisplay.textContent = frequencyLabel;
  if (elements.generatorLevelDisplay) elements.generatorLevelDisplay.textContent = fmtDbm(state.generator.levelDbm);
  if (elements.generatorUnitDisplay) elements.generatorUnitDisplay.textContent = generatorUnitLabel[state.generator.frequencyUnit];
  if (elements.generatorLinkDisplay) elements.generatorLinkDisplay.textContent = analyzerLink;
  if (elements.generatorSummaryFreqValue) elements.generatorSummaryFreqValue.textContent = frequencyLabel;
  if (elements.generatorSummaryLevelValue) elements.generatorSummaryLevelValue.textContent = fmtDbm(state.generator.levelDbm);
  if (elements.generatorSummaryAnalyzerValue) elements.generatorSummaryAnalyzerValue.textContent = analyzerLink;
  if (elements.generatorConsoleMode) elements.generatorConsoleMode.textContent = state.generator.editTarget === "level" ? "LEVEL" : "FREQ";
  if (elements.generatorOutputState) elements.generatorOutputState.textContent = state.generator.outputEnabled ? tx("generatorOutputOn") : tx("generatorOutputOff");
  if (elements.generatorSummaryOutputValue) elements.generatorSummaryOutputValue.textContent = state.generator.outputEnabled ? tx("generatorOutputOn") : tx("generatorOutputOff");
  if (elements.generatorOutputToggle) elements.generatorOutputToggle.disabled = !state.generator.outputEnabled;
  if (elements.generatorFireButton) elements.generatorFireButton.classList.toggle("is-active", state.generator.outputEnabled);
  elements.generatorOutputDot?.classList.toggle("paused", !state.generator.outputEnabled);
  elements.generatorLevelButton?.classList.toggle("is-active", state.generator.editTarget === "level");
  syncFlowSummaryPanels();
}

function syncWorkflowSummary() {
  if (elements.workflowTxValue) elements.workflowTxValue.textContent = getAntennaLabel(state.analyzer.txAntennaId);
  if (elements.workflowRxValue) elements.workflowRxValue.textContent = getAntennaLabel(state.analyzer.rxAntennaId);
  if (elements.workflowRxPlacementValue) elements.workflowRxPlacementValue.textContent = state.analyzer.shieldEnabled ? tx("summaryShielded") : tx("summaryOpen");
  if (elements.workflowFrequencyValue) elements.workflowFrequencyValue.textContent = state.generator.outputEnabled ? fmtRfFrequency(getLiveGeneratorFrequencyHz()) : tx("generatorPendingFeed");
  if (elements.workflowLevelValue) elements.workflowLevelValue.textContent = state.generator.outputEnabled ? fmtDbm(state.generator.liveLevelDbm) : tx("generatorPendingFeed");
  if (elements.workflowCenterValue) elements.workflowCenterValue.textContent = fmtMHz(state.analyzer.centerMHz);
  if (elements.workflowRbwValue) elements.workflowRbwValue.textContent = `${state.analyzer.rbwKHz.toFixed(0)} kHz`;
}

function syncFlowSummaryPanels() {
  const shieldMaterialLabel = getShieldMaterial(state.analyzer.shieldMaterialId)?.label[state.language] || "-";
  const values = {
    tx: getAntennaLabel(state.analyzer.txAntennaId),
    rx: getAntennaLabel(state.analyzer.rxAntennaId),
    placement: state.analyzer.shieldEnabled ? tx("summaryShielded") : tx("summaryOpen"),
    distance: fmtM(state.analyzer.distanceM),
    shieldMaterial: shieldMaterialLabel,
    shieldEffectiveness: fmtDb(state.analyzer.shieldEffectivenessDb),
    shieldLeakage: `${state.analyzer.shieldLeakagePct.toFixed(0)} %`,
    generatorFreq: fmtRfFrequency(getGeneratorFrequencyHz()),
    generatorLevel: fmtDbm(state.generator.levelDbm),
    generatorState: state.generator.outputEnabled ? tx("generatorOutputOn") : tx("generatorOutputOff"),
    center: fmtMHz(state.analyzer.centerMHz),
    span: fmtMHz(state.analyzer.spanMHz),
    rbw: `${state.analyzer.rbwKHz.toFixed(0)} kHz`,
  };
  elements.flowSummaryValues.forEach((node) => {
    const key = node.dataset.flowSummaryValue;
    node.textContent = values[key] || "-";
  });
}

function applyTranslations() {
  document.title = tx("pageTitle");
  document.documentElement.lang = state.language;
  elements.translationNodes.forEach((node) => { node.textContent = st(node.dataset.i18n); });
  populateSelect(elements.presetSelect, scopePresets, String(state.scope.presetIndex), (_, i) => String(i), (item) => item.name[state.language]);
  populateSelect(elements.waveformSelect, waveformOptions, state.scope.waveform, (item) => item.value, (item) => item.label[state.language]);
  populateSelect(elements.txAntennaSelect, antennaCatalog, state.analyzer.txAntennaId, (item) => item.id, (item) => item.label[state.language]);
  populateSelect(elements.rxAntennaSelect, antennaCatalog, state.analyzer.rxAntennaId, (item) => item.id, (item) => item.label[state.language]);
  populateSelect(elements.sourceProfileSelect, sourceProfiles, state.analyzer.sourceProfileId, (item) => item.id, (item) => item.label[state.language]);
  populateSelect(elements.shieldMaterialSelect, shieldMaterials, state.analyzer.shieldMaterialId, (item) => item.id, (item) => item.label[state.language]);
  renderAntennaInventory();
  syncAnalyzerFromGenerator();
  markScopeDirty();
  markAnalyzerDirty();
  elements.languageToggle.textContent = tx("languageButton");
  syncScopeOutputs();
  syncGeneratorOutputs();
  syncQuickSetupInputs();
  syncWorkflowSummary();
  syncFlowSummaryPanels();
  syncAnalyzerOutputs();
}

function syncShieldFlowPanels(view) {
  const hiddenHost = elements.shieldFlowHiddenHost;
  if (!hiddenHost) return;
  const experimentTarget = view === "shieldAntenna" ? elements.shieldAntennaSlot : hiddenHost;
  const setupTarget = view === "shieldSetup" ? elements.shieldSetupSlot : hiddenHost;
  if (elements.experimentSetupPanel && experimentTarget && elements.experimentSetupPanel.parentElement !== experimentTarget) {
    experimentTarget.appendChild(elements.experimentSetupPanel);
  }
  if (elements.quickSetupPanel && setupTarget && elements.quickSetupPanel.parentElement !== setupTarget) {
    setupTarget.appendChild(elements.quickSetupPanel);
  }
}

function setActiveView(view, updateHash = true) {
  const next = validViews.has(view) ? view : "home";
  state.activeView = next;
  syncShieldFlowPanels(next);
  Object.entries(elements.views).forEach(([name, node]) => node.classList.toggle("is-active", name === next));
  elements.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.viewTarget === next));
  elements.navShieldButton?.classList.toggle("is-active", shieldExperimentViews.has(next));
  if (next === "scope") markScopeDirty();
  if (next === "analyzer") state.render.analyzerCanvasDirty = true;
  if (updateHash && window.location.hash !== `#${next}`) window.location.hash = next;
}

function focusPanel(node) {
  if (!node) return;
  requestAnimationFrame(() => {
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof node.focus === "function") {
      if (node.tabIndex < 0 && !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(node.tagName)) node.tabIndex = -1;
      node.focus({ preventScroll: true });
    }
  });
}

function navigateFromFlowSummary(key) {
  const targetMap = {
    tx: { view: "shieldAntenna", node: elements.txDropZone },
    rx: { view: "shieldAntenna", node: elements.rxDropZone },
    placement: { view: "shieldAntenna", node: state.analyzer.shieldEnabled ? elements.shieldDropZone : elements.rxDropZone },
    distance: { view: "shieldSetup", node: elements.quickDistanceInput },
    shieldMaterial: { view: "analyzer", node: elements.analyzerReportRack },
    shieldEffectiveness: { view: "shieldSetup", node: elements.quickShieldEffectivenessInput },
    shieldLeakage: { view: "shieldSetup", node: elements.quickShieldLeakageInput },
    generatorFreq: { view: "generator", node: elements.generatorFrequencyInput },
    generatorLevel: { view: "generator", node: elements.generatorLevelInput },
    generatorState: { view: "generator", node: elements.generatorFireButton },
    center: { view: "shieldSetup", node: elements.quickCenterInput },
    span: { view: "shieldSetup", node: elements.quickSpanInput },
    rbw: { view: "shieldSetup", node: elements.quickRbwInput },
  };
  const target = targetMap[key];
  if (!target) return;
  setActiveView(target.view);
  focusPanel(target.node);
}

function scopeValue(waveform, t) {
  switch (waveform) {
    case "square": return Math.sin(t * Math.PI * 2) >= 0 ? 1 : -1;
    case "triangle": return 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
    case "sawtooth": return 2 * (t - Math.floor(t + 0.5));
    case "am": return Math.sin(t * Math.PI * 2) * (0.55 + 0.45 * Math.sin(t * Math.PI * 0.16));
    case "chirp": return Math.sin((1 + 0.55 * t) * Math.PI * 2 * t);
    default: return Math.sin(t * Math.PI * 2);
  }
}

function generateScopeWaveform() {
  const totalTime = state.scope.timePerDiv * scopeDivisions.horizontal;
  const sampleCount = Math.max(1200, Math.floor(elements.scopeCanvas.width * 1.4));
  const dt = totalTime / sampleCount;
  const raw = new Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) raw[i] = state.scope.offset + state.scope.amplitude * scopeValue(state.scope.waveform, (state.scope.phase + i * dt) * state.scope.frequency);
  const mean = raw.reduce((sum, value) => sum + value, 0) / raw.length;
  return raw.map((value, i) => {
    let adjusted = state.scope.coupling === "ac" ? value - mean : value;
    if (state.scope.invert) adjusted *= -1;
    return adjusted + (state.scope.noise / 100) * state.scope.amplitude * 0.35 * simNoise(i + 19);
  });
}

function estimateScopeFrequency(samples) {
  const totalTime = state.scope.timePerDiv * scopeDivisions.horizontal;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const crossings = [];
  for (let i = 1; i < samples.length; i += 1) if (samples[i - 1] - mean < 0 && samples[i] - mean >= 0) crossings.push(i);
  if (crossings.length < 2) return state.scope.measurementFrequency;
  const periods = [];
  for (let i = 1; i < crossings.length; i += 1) periods.push((crossings[i] - crossings[i - 1]) * (totalTime / samples.length));
  const period = periods.reduce((sum, value) => sum + value, 0) / periods.length;
  state.scope.measurementFrequency = period > 0 ? 1 / period : state.scope.measurementFrequency;
  return state.scope.measurementFrequency;
}

function drawScopeGrid() {
  const width = elements.scopeCanvas.width;
  const height = elements.scopeCanvas.height;
  const style = getComputedStyle(document.documentElement);
  const majorX = width / scopeDivisions.horizontal;
  const majorY = height / scopeDivisions.vertical;
  scopeCtx.clearRect(0, 0, width, height);
  scopeCtx.fillStyle = "#041018";
  scopeCtx.fillRect(0, 0, width, height);
  for (let x = 0; x <= scopeDivisions.horizontal; x += 1) {
    const px = x * majorX;
    scopeCtx.strokeStyle = style.getPropertyValue("--grid-major");
    scopeCtx.lineWidth = x === scopeDivisions.horizontal / 2 ? 1.6 : 1;
    scopeCtx.beginPath();
    scopeCtx.moveTo(px, 0);
    scopeCtx.lineTo(px, height);
    scopeCtx.stroke();
  }
  for (let y = 0; y <= scopeDivisions.vertical; y += 1) {
    const py = y * majorY;
    scopeCtx.strokeStyle = style.getPropertyValue("--grid-major");
    scopeCtx.lineWidth = y === scopeDivisions.vertical / 2 ? 1.6 : 1;
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, py);
    scopeCtx.lineTo(width, py);
    scopeCtx.stroke();
  }
}

function drawScope(samples) {
  const width = elements.scopeCanvas.width;
  const height = elements.scopeCanvas.height;
  let start = 0;
  for (let i = 1; i < samples.length; i += 1) if (samples[i - 1] < state.scope.triggerLevel && samples[i] >= state.scope.triggerLevel) { start = i; break; }
  const aligned = samples.slice(start).concat(samples.slice(0, start)).slice(0, Math.min(samples.length, width * 2));
  const voltsVisible = state.scope.voltsPerDiv * scopeDivisions.vertical;
  const draw = (color, lineWidth) => {
    scopeCtx.strokeStyle = color;
    scopeCtx.lineWidth = lineWidth;
    scopeCtx.beginPath();
    aligned.forEach((value, i) => {
      const x = (i / (aligned.length - 1)) * width;
      const y = height * (0.5 - value / voltsVisible);
      if (i === 0) scopeCtx.moveTo(x, y);
      else scopeCtx.lineTo(x, y);
    });
    scopeCtx.stroke();
  };
  draw("rgba(255, 222, 112, 0.16)", 8);
  draw(getComputedStyle(document.documentElement).getPropertyValue("--trace"), 2.2);
  const y = Math.min(height - 12, Math.max(12, (0.5 - state.scope.triggerLevel / voltsVisible) * height));
  scopeCtx.fillStyle = "rgba(255, 136, 112, 0.9)";
  scopeCtx.beginPath();
  scopeCtx.moveTo(width - 12, y);
  scopeCtx.lineTo(width - 34, y - 10);
  scopeCtx.lineTo(width - 34, y + 10);
  scopeCtx.closePath();
  scopeCtx.fill();
}

function updateScopeMeasurements(samples) {
  const max = Math.max(...samples);
  const min = Math.min(...samples);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const vrms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  const freq = estimateScopeFrequency(samples);
  elements.metricVpp.textContent = fmtV(max - min);
  elements.metricVrms.textContent = fmtV(vrms);
  elements.metricFreq.textContent = fmtHz(freq);
  elements.metricPeriod.textContent = fmtTime(freq > 0 ? 1 / freq : 0);
  elements.metricMean.textContent = fmtV(mean);
  elements.metricMax.textContent = fmtV(max);
}

function syncScopeOutputs() {
  markScopeDirty();
  elements.amplitudeOutput.textContent = `${state.scope.amplitude.toFixed(1)} V`;
  elements.frequencyOutput.textContent = fmtHz(state.scope.frequency);
  elements.offsetOutput.textContent = `${state.scope.offset.toFixed(1)} V`;
  elements.noiseOutput.textContent = `${state.scope.noise.toFixed(0)} %`;
  elements.triggerOutput.textContent = `${state.scope.triggerLevel.toFixed(1)} V`;
  elements.overlayScale.textContent = `CH1 ${state.scope.voltsPerDiv} V/div | ${tx("overlayTime")} ${fmtTime(state.scope.timePerDiv)}/div`;
  elements.overlayTrigger.textContent = `${tx("overlayTrigger")} ${state.scope.triggerLevel.toFixed(1)} V`;
  elements.runStateLabel.textContent = state.scope.running ? tx("runStateRunning") : tx("runStateStopped");
  elements.runIndicator.classList.toggle("paused", !state.scope.running);
  elements.runToggle.textContent = state.scope.running ? tx("runToggleStop") : tx("runToggleRun");
}

function applyScopePreset(index) {
  const preset = scopePresets[index];
  state.scope.presetIndex = index;
  state.scope.waveform = preset.waveform;
  state.scope.amplitude = preset.amplitude;
  state.scope.frequency = preset.frequency;
  state.scope.offset = preset.offset;
  state.scope.noise = preset.noise;
  elements.amplitudeInput.value = String(state.scope.amplitude);
  elements.frequencyInput.value = String(state.scope.frequency);
  elements.offsetInput.value = String(state.scope.offset);
  elements.noiseInput.value = String(state.scope.noise);
  markScopeDirty();
  syncScopeOutputs();
}

function refreshFrozenScope() {
  markScopeDirty();
  if (!state.scope.running) state.scope.frozenWaveform = generateScopeWaveform();
}
function antennaResponseDb(antenna, frequencyMHz) {
  if (!antenna) return -60;
  let response = antenna.gainDb;
  if (frequencyMHz < antenna.minMHz) response -= 18 + 24 * Math.log10(antenna.minMHz / Math.max(frequencyMHz, 1));
  else if (frequencyMHz > antenna.maxMHz) response -= 18 + 24 * Math.log10(frequencyMHz / antenna.maxMHz);
  else response -= (Math.abs(frequencyMHz - (antenna.minMHz + antenna.maxMHz) / 2) / Math.max((antenna.maxMHz - antenna.minMHz) / 2, 1)) * 2.6;
  return Math.max(response, -60);
}

function fsplDb(frequencyMHz, distanceM) {
  return 32.44 + 20 * Math.log10(Math.max(frequencyMHz, 1)) + 20 * Math.log10(Math.max(distanceM / 1000, 0.001));
}

function shieldLossDb(config, frequencyMHz) {
  if (!config.shieldEnabled) return 0;
  const material = getShieldMaterial(config.shieldMaterialId);
  const leakagePenalty = config.shieldLeakagePct * 0.55;
  const frequencyLeak = Math.max(0, 8 * Math.log10(Math.max(frequencyMHz, 20) / 100)) * (config.shieldLeakagePct / 80);
  const resonanceLeak = 6 * Math.sin(frequencyMHz * 0.045) ** 2 * (config.shieldLeakagePct / 100);
  return Math.max(0, config.shieldEffectivenessDb + (material ? material.baseDb : 0) - leakagePenalty - frequencyLeak - resonanceLeak);
}

function overlapBand(txId, rxId) {
  const txAntenna = getAntenna(txId);
  const rxAntenna = getAntenna(rxId);
  if (!txAntenna || !rxAntenna) return null;
  const start = Math.max(txAntenna.minMHz, rxAntenna.minMHz);
  const stop = Math.min(txAntenna.maxMHz, rxAntenna.maxMHz);
  return start <= stop ? { start, stop } : null;
}

function analyzerSnapshot() {
  return {
    txAntennaId: state.analyzer.txAntennaId,
    rxAntennaId: state.analyzer.rxAntennaId,
    sourceProfileId: state.analyzer.sourceProfileId,
    carrierMHz: state.analyzer.carrierMHz,
    txPowerDbm: state.analyzer.txPowerDbm,
    distanceM: state.analyzer.distanceM,
    shieldEnabled: state.analyzer.shieldEnabled,
    shieldMaterialId: state.analyzer.shieldMaterialId,
    shieldEffectivenessDb: state.analyzer.shieldEffectivenessDb,
    shieldLeakagePct: state.analyzer.shieldLeakagePct,
  };
}

function sourceComponents(config, sweepStopMHz) {
  if (!state.generator.outputEnabled) return [];
  if (config.sourceProfileId === "am") return [{ freq: config.carrierMHz, relDb: 0, width: 1.1 }, { freq: Math.max(1, config.carrierMHz - 5), relDb: -12, width: 0.9 }, { freq: config.carrierMHz + 5, relDb: -12, width: 0.9 }];
  if (config.sourceProfileId === "clock") {
    const components = [];
    for (let harmonic = 1; harmonic <= 6; harmonic += 1) {
      const freq = config.carrierMHz * harmonic;
      if (freq <= sweepStopMHz * 1.2) components.push({ freq, relDb: -(harmonic - 1) * 7.5, width: 1 + harmonic * 0.35 });
    }
    return components;
  }
  return [{ freq: config.carrierMHz, relDb: 0, width: 1.2 }];
}

function receivedPeakDbm(config, frequencyMHz, relativeDb) {
  if (!state.generator.outputEnabled) return -160;
  return config.txPowerDbm + relativeDb + antennaResponseDb(getAntenna(config.txAntennaId), frequencyMHz) + antennaResponseDb(getAntenna(config.rxAntennaId), frequencyMHz) - fsplDb(frequencyMHz, config.distanceM) - 2.5 - shieldLossDb(config, frequencyMHz);
}

function buildAnalyzerTrace(snapshot) {
  const startMHz = Math.max(1, state.analyzer.centerMHz - state.analyzer.spanMHz / 2);
  const stopMHz = startMHz + state.analyzer.spanMHz;
  const overlap = overlapBand(snapshot.txAntennaId, snapshot.rxAntennaId);
  const carrierInBand = overlap && snapshot.carrierMHz >= overlap.start && snapshot.carrierMHz <= overlap.stop;
  const noiseFloorDbm = -98 + 10 * Math.log10(state.analyzer.rbwKHz / 120);
  const components = sourceComponents(snapshot, stopMHz);
  const points = 720;
  const frequencies = new Array(points);
  const levels = new Array(points);
  for (let i = 0; i < points; i += 1) {
    const freq = startMHz + (i / (points - 1)) * (stopMHz - startMHz);
    let level = noiseFloorDbm + simNoise(i + freq * 0.21) * 1.7;
    components.forEach((component, index) => {
      const width = Math.max(component.width, state.analyzer.spanMHz / 260);
      const shaped = receivedPeakDbm(snapshot, component.freq, component.relDb) - 12 * (((freq - component.freq) / width) ** 2);
      level = Math.max(level, shaped + 0.12 * simNoise(i * (index + 3)));
    });
    frequencies[i] = freq;
    levels[i] = level;
  }
  let peakIndex = 0;
  for (let i = 1; i < levels.length; i += 1) if (levels[i] > levels[peakIndex]) peakIndex = i;
  return { startMHz, stopMHz, frequencies, levels, overlap, carrierInBand, noiseFloorDbm, peakIndex, peakFreqMHz: frequencies[peakIndex], peakLevelDbm: levels[peakIndex], carrierLevelDbm: receivedPeakDbm(snapshot, snapshot.carrierMHz, 0), shieldLoss: shieldLossDb(snapshot, snapshot.carrierMHz), pathLoss: fsplDb(snapshot.carrierMHz, snapshot.distanceM) + 2.5 };
}

function computeAnalyzerState() {
  syncAnalyzerFromGenerator();
  if (!state.analyzer.sweepRunning && state.analyzer.latestTrace) {
    if (state.analyzer.referenceSnapshot && !state.analyzer.latestReferenceTrace) {
      state.analyzer.latestReferenceTrace = buildAnalyzerTrace(state.analyzer.referenceSnapshot);
    }
    if (!state.analyzer.referenceSnapshot) state.analyzer.latestReferenceTrace = null;
    state.render.analyzerStateDirty = false;
    return { trace: state.analyzer.latestTrace, ref: state.analyzer.latestReferenceTrace };
  }
  if (!state.render.analyzerStateDirty && state.analyzer.latestTrace) {
    return { trace: state.analyzer.latestTrace, ref: state.analyzer.latestReferenceTrace };
  }
  const trace = buildAnalyzerTrace(analyzerSnapshot());
  const ref = state.analyzer.referenceSnapshot
    ? state.analyzer.latestReferenceTrace || buildAnalyzerTrace(state.analyzer.referenceSnapshot)
    : null;
  state.analyzer.latestTrace = trace;
  state.analyzer.latestReferenceTrace = ref;
  state.render.analyzerStateDirty = false;
  return { trace, ref };
}

function traceLevelAt(trace, frequencyMHz) {
  if (!trace) return null;
  if (frequencyMHz <= trace.startMHz) return trace.levels[0];
  if (frequencyMHz >= trace.stopMHz) return trace.levels[trace.levels.length - 1];
  return trace.levels[Math.round(((frequencyMHz - trace.startMHz) / (trace.stopMHz - trace.startMHz)) * (trace.levels.length - 1))];
}

function drawAnalyzerGrid(trace) {
  const width = elements.analyzerCanvas.width;
  const height = elements.analyzerCanvas.height;
  const { topDbm, rangeDb } = getAnalyzerScale();
  const style = getComputedStyle(document.documentElement);
  analyzerCtx.clearRect(0, 0, width, height);
  analyzerCtx.fillStyle = "#041018";
  analyzerCtx.fillRect(0, 0, width, height);
  analyzerCtx.font = "12px Segoe UI";
  analyzerCtx.fillStyle = "rgba(205, 234, 245, 0.68)";
  for (let x = 0; x <= 10; x += 1) {
    const px = (x / 10) * width;
    analyzerCtx.strokeStyle = style.getPropertyValue("--grid-major");
    analyzerCtx.lineWidth = 1;
    analyzerCtx.beginPath();
    analyzerCtx.moveTo(px, 0);
    analyzerCtx.lineTo(px, height);
    analyzerCtx.stroke();
    analyzerCtx.fillText(fmtMHz(trace.startMHz + (x / 10) * (trace.stopMHz - trace.startMHz)), Math.min(width - 70, px + 4), height - 8);
  }
  for (let y = 0; y <= 8; y += 1) {
    const py = (y / 8) * height;
    analyzerCtx.strokeStyle = style.getPropertyValue("--grid-major");
    analyzerCtx.beginPath();
    analyzerCtx.moveTo(0, py);
    analyzerCtx.lineTo(width, py);
    analyzerCtx.stroke();
    analyzerCtx.fillText(`${(topDbm - (y / 8) * rangeDb).toFixed(0)} dBm`, 10, Math.max(14, py - 6));
  }
}

function plotAnalyzerTrace(trace, strokeStyle, glowStyle) {
  const width = elements.analyzerCanvas.width;
  const height = elements.analyzerCanvas.height;
  const { topDbm, rangeDb } = getAnalyzerScale();
  const toY = (level) => ((topDbm - level) / rangeDb) * height;
  const draw = (color, lineWidth) => {
    analyzerCtx.strokeStyle = color;
    analyzerCtx.lineWidth = lineWidth;
    analyzerCtx.beginPath();
    trace.levels.forEach((level, i) => {
      const x = (i / (trace.levels.length - 1)) * width;
      const y = toY(level);
      if (i === 0) analyzerCtx.moveTo(x, y);
      else analyzerCtx.lineTo(x, y);
    });
    analyzerCtx.stroke();
  };
  draw(glowStyle, 7);
  draw(strokeStyle, 2);
}

function renderAnalyzer() {
  const { trace, ref } = computeAnalyzerState();
  const { topDbm, rangeDb } = getAnalyzerScale();
  drawAnalyzerGrid(trace);
  if (ref && state.analyzer.showReferenceTrace) plotAnalyzerTrace(ref, "rgba(124, 242, 255, 0.92)", "rgba(124, 242, 255, 0.12)");
  plotAnalyzerTrace(trace, "rgba(255, 222, 112, 0.95)", "rgba(255, 222, 112, 0.14)");
  if (state.analyzer.markerEnabled) {
    const width = elements.analyzerCanvas.width;
    const height = elements.analyzerCanvas.height;
    const markerFreqMHz = state.analyzer.markerFreqMHz ?? trace.peakFreqMHz;
    const markerLevelDbm = traceLevelAt(trace, markerFreqMHz) ?? trace.peakLevelDbm;
    const x = clamp(((markerFreqMHz - trace.startMHz) / Math.max(trace.stopMHz - trace.startMHz, 1)) * width, 0, width);
    const y = clamp(((topDbm - markerLevelDbm) / rangeDb) * height, 0, height);
    analyzerCtx.fillStyle = "rgba(255, 222, 112, 0.95)";
    analyzerCtx.beginPath();
    analyzerCtx.arc(x, y, 5, 0, Math.PI * 2);
    analyzerCtx.fill();
    analyzerCtx.font = "12px Segoe UI";
    analyzerCtx.fillText(`M1 ${fmtMHz(markerFreqMHz)} / ${fmtDbm(markerLevelDbm)}`, Math.min(width - 230, x + 10), Math.max(22, y - 12));
  }
  state.render.analyzerCanvasDirty = false;
}

function syncAnalyzerOutputs() {
  const { trace, ref } = computeAnalyzerState();
  const delta = ref ? trace.carrierLevelDbm - traceLevelAt(ref, state.analyzer.carrierMHz) : null;
  elements.carrierFreqOutput.textContent = state.generator.outputEnabled ? fmtRfFrequency(getLiveGeneratorFrequencyHz()) : tx("generatorPendingFeed");
  elements.txPowerOutput.textContent = state.generator.outputEnabled ? fmtDbm(state.analyzer.txPowerDbm) : tx("generatorPendingFeed");
  elements.distanceInput.value = String(state.analyzer.distanceM);
  elements.distanceOutput.textContent = fmtM(state.analyzer.distanceM);
  elements.shieldEffectivenessInput.value = String(state.analyzer.shieldEffectivenessDb);
  elements.shieldEffectivenessOutput.textContent = fmtDb(state.analyzer.shieldEffectivenessDb);
  elements.shieldLeakageInput.value = String(state.analyzer.shieldLeakagePct);
  elements.shieldLeakageOutput.textContent = `${state.analyzer.shieldLeakagePct.toFixed(0)} %`;
  elements.analyzerCenterInput.value = String(state.analyzer.centerMHz);
  elements.analyzerCenterOutput.textContent = fmtMHz(state.analyzer.centerMHz);
  elements.analyzerSpanSelect.value = String(state.analyzer.spanMHz);
  elements.analyzerRbwSelect.value = String(state.analyzer.rbwKHz);
  elements.analyzerSweepReadout.textContent = `${state.analyzer.sweepRunning ? "RUN" : "HOLD"} | ${fmtMHz(trace.startMHz)} ~ ${fmtMHz(trace.stopMHz)} | RBW ${state.analyzer.rbwKHz.toFixed(0)} kHz`;
  elements.baselineState.textContent = state.analyzer.referenceSnapshot
    ? `${tx("baselineStored")} / ${state.analyzer.showReferenceTrace ? tx("referenceVisible") : tx("referenceHidden")}`
    : tx("baselineEmpty");
  if (elements.clearBaselineButton) elements.clearBaselineButton.disabled = !state.analyzer.referenceSnapshot;
  elements.analyzerScaleDisplay.textContent = `Ref ${fmtDbm(state.analyzer.refLevelDbm)} | ${state.analyzer.dbPerDiv.toFixed(0)} dB/div`;
  elements.analyzerOverlayScale.textContent = `Center ${fmtMHz(state.analyzer.centerMHz)} | Span ${fmtMHz(state.analyzer.spanMHz)} | Ref ${fmtDbm(state.analyzer.refLevelDbm)}`;
  elements.analyzerOverlayBand.textContent = trace.overlap ? `Band ${fmtMHz(trace.overlap.start)} ~ ${fmtMHz(trace.overlap.stop)}` : tx("summaryCarrierNoOverlap");
  elements.analyzerMetricPeakFreq.textContent = fmtMHz(trace.peakFreqMHz);
  elements.analyzerMetricPeakLevel.textContent = fmtDbm(trace.peakLevelDbm);
  elements.analyzerMetricDelta.textContent = delta === null ? "-" : fmtDb(delta);
  elements.analyzerMetricShieldLoss.textContent = fmtDb(trace.shieldLoss);
  elements.analyzerMetricPathLoss.textContent = fmtDb(trace.pathLoss);
  elements.analyzerMetricNoiseFloor.textContent = fmtDbm(trace.noiseFloorDbm);
  elements.summaryTxAntennaValue.textContent = getAntennaLabel(state.analyzer.txAntennaId);
  elements.summaryRxAntennaValue.textContent = getAntennaLabel(state.analyzer.rxAntennaId);
  elements.summaryOverlapValue.textContent = trace.overlap ? `${fmtMHz(trace.overlap.start)} ~ ${fmtMHz(trace.overlap.stop)}` : tx("summaryCarrierNoOverlap");
  elements.summaryCarrierBandValue.textContent = !trace.overlap ? tx("summaryCarrierNoOverlap") : trace.carrierInBand ? tx("summaryCarrierInBand") : tx("summaryCarrierOutBand");
  elements.summaryShieldStateValue.textContent = state.analyzer.shieldEnabled ? tx("summaryShielded") : tx("summaryOpen");
  elements.summaryReferenceValue.textContent = state.analyzer.referenceSnapshot ? tx("baselineStored") : tx("baselineEmpty");
  syncQuickSetupInputs();
  syncAntennaStage();
  syncAnalyzerConsoleOutputs();
  if (!state.generator.outputEnabled) {
    elements.analyzerLinkStatus.textContent = tx("generatorOutputOff");
    elements.analyzerStatusDot.classList.add("warning");
  } else if (!trace.overlap || !trace.carrierInBand) {
    elements.analyzerLinkStatus.textContent = tx("analyzerLinkOutOfBand");
    elements.analyzerStatusDot.classList.add("warning");
  } else if (state.analyzer.shieldEnabled) {
    elements.analyzerLinkStatus.textContent = tx("analyzerLinkShield");
    elements.analyzerStatusDot.classList.remove("warning");
  } else {
    elements.analyzerLinkStatus.textContent = tx("analyzerLinkLos");
    elements.analyzerStatusDot.classList.remove("warning");
  }
  elements.analyzerStatusNote.textContent = !state.generator.outputEnabled
    ? tx("statusNoteGeneratorOff")
    : !trace.overlap
      ? tx("statusNoteNoOverlap")
      : !trace.carrierInBand
        ? tx("statusNoteOutOfBand")
        : state.analyzer.shieldEnabled
          ? tx("statusNoteShield")
          : tx("statusNoteOpen");
  syncGeneratorOutputs();
  syncWorkflowSummary();
  syncFlowSummaryPanels();
}
function attachEvents() {
  elements.navButtons.forEach((button) => button.addEventListener("click", () => setActiveView(button.dataset.viewTarget)));
  elements.analyzerActionButtons.forEach((button) => button.addEventListener("click", () => handleAnalyzerAction(button.dataset.analyzerAction)));
  elements.analyzerKeypadButtons.forEach((button) => button.addEventListener("click", () => appendAnalyzerEntry(button.dataset.analyzerKeypad)));
  elements.analyzerUnitButtons.forEach((button) => button.addEventListener("click", () => {
    if (state.analyzerConsole.editTarget === "ref") return;
    state.analyzerConsole.entryUnit = button.dataset.analyzerUnit;
    if (state.analyzerConsole.entryBuffer && state.analyzerConsole.editTarget !== "ref") commitAnalyzerEntry(button.dataset.analyzerUnit);
    else syncAnalyzerConsoleOutputs();
  }));
  elements.flowSummaryValues.forEach((node) => {
    node.classList.add("flow-summary-link");
    node.tabIndex = 0;
    node.setAttribute("role", "button");
    node.addEventListener("click", () => navigateFromFlowSummary(node.dataset.flowSummaryValue));
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      navigateFromFlowSummary(node.dataset.flowSummaryValue);
    });
  });
  elements.homeShieldButton?.addEventListener("click", () => setActiveView("shieldAntenna"));
  elements.shieldingCardButton?.addEventListener("click", () => setActiveView("shieldAntenna"));
  elements.shieldAntennaNextButton?.addEventListener("click", () => setActiveView("shieldSetup"));
  elements.shieldSetupBackButton?.addEventListener("click", () => setActiveView("shieldAntenna"));
  elements.shieldSetupNextButton?.addEventListener("click", () => setActiveView("generator"));
  elements.openGeneratorButton?.addEventListener("click", () => setActiveView("generator"));
  elements.workflowToGeneratorButton?.addEventListener("click", () => setActiveView("generator"));
  elements.quickSetupToGeneratorButton?.addEventListener("click", () => setActiveView("generator"));
  elements.generatorToAntennaButton?.addEventListener("click", () => {
    setActiveView("shieldSetup");
    focusPanel(elements.quickSetupPanel);
  });
  elements.generatorToAnalyzerButton?.addEventListener("click", () => {
    setActiveView("analyzer");
    focusPanel(elements.analyzerCheckPanel);
  });
  [elements.txDropZone, elements.rxDropZone, elements.shieldDropZone].forEach((zone) => {
    zone?.addEventListener("dragenter", (event) => {
      event.preventDefault();
      zone.classList.add("is-dragover");
    });
    zone?.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      zone.classList.add("is-dragover");
    });
    zone?.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone?.addEventListener("drop", (event) => {
      event.preventDefault();
      const antennaId = event.dataTransfer.getData("text/plain");
      clearAntennaDropStates();
      assignStageAntenna(zone.dataset.role, antennaId);
    });
  });
  elements.languageToggle.addEventListener("click", () => {
    state.language = state.language === "ko" ? "en" : "ko";
    safeStorageSet("simulatorLanguage", state.language);
    applyTranslations();
  });
  elements.presetSelect.addEventListener("change", (event) => { applyScopePreset(Number(event.target.value)); refreshFrozenScope(); });
  elements.waveformSelect.addEventListener("change", (event) => { state.scope.waveform = event.target.value; refreshFrozenScope(); syncScopeOutputs(); });
  elements.amplitudeInput.addEventListener("input", (event) => { state.scope.amplitude = Number(event.target.value); refreshFrozenScope(); syncScopeOutputs(); });
  elements.frequencyInput.addEventListener("input", (event) => { state.scope.frequency = Number(event.target.value); refreshFrozenScope(); syncScopeOutputs(); });
  elements.offsetInput.addEventListener("input", (event) => { state.scope.offset = Number(event.target.value); refreshFrozenScope(); syncScopeOutputs(); });
  elements.noiseInput.addEventListener("input", (event) => { state.scope.noise = Number(event.target.value); refreshFrozenScope(); syncScopeOutputs(); });
  elements.voltsPerDiv.addEventListener("change", (event) => { state.scope.voltsPerDiv = Number(event.target.value); syncScopeOutputs(); });
  elements.couplingSelect.addEventListener("change", (event) => { state.scope.coupling = event.target.value; refreshFrozenScope(); });
  elements.invertToggle.addEventListener("change", (event) => { state.scope.invert = event.target.checked; refreshFrozenScope(); });
  elements.timePerDiv.addEventListener("change", (event) => { state.scope.timePerDiv = Number(event.target.value); refreshFrozenScope(); syncScopeOutputs(); });
  elements.triggerLevel.addEventListener("input", (event) => { state.scope.triggerLevel = Number(event.target.value); refreshFrozenScope(); syncScopeOutputs(); });
  elements.runToggle.addEventListener("click", () => {
    state.scope.running = !state.scope.running;
    state.scope.frozenWaveform = state.scope.running ? null : generateScopeWaveform();
    state.scope.lastFrameTime = performance.now();
    syncScopeOutputs();
  });
  elements.txAntennaSelect.addEventListener("change", (event) => { state.analyzer.txAntennaId = event.target.value; markAnalyzerDirty(); syncAnalyzerOutputs(); });
  elements.rxAntennaSelect.addEventListener("change", (event) => { state.analyzer.rxAntennaId = event.target.value; markAnalyzerDirty(); syncAnalyzerOutputs(); });
  elements.sourceProfileSelect.addEventListener("change", (event) => { state.analyzer.sourceProfileId = event.target.value; markAnalyzerDirty(); syncAnalyzerOutputs(); });
  elements.distanceInput.addEventListener("input", (event) => setAnalyzerDistance(event.target.value));
  elements.quickDistanceInput?.addEventListener("input", (event) => setAnalyzerDistance(event.target.value));
  elements.shieldEnabledToggle.addEventListener("change", (event) => {
    state.analyzer.shieldEnabled = event.target.checked;
    state.analyzer.rxPlacement = event.target.checked ? "shield" : "open";
    markAnalyzerDirty();
    syncAnalyzerOutputs();
  });
  elements.shieldMaterialSelect.addEventListener("change", (event) => { state.analyzer.shieldMaterialId = event.target.value; markAnalyzerDirty(); syncAnalyzerOutputs(); });
  elements.shieldEffectivenessInput.addEventListener("input", (event) => setShieldEffectiveness(event.target.value));
  elements.quickShieldEffectivenessInput?.addEventListener("input", (event) => setShieldEffectiveness(event.target.value));
  elements.shieldLeakageInput.addEventListener("input", (event) => setShieldLeakage(event.target.value));
  elements.quickShieldLeakageInput?.addEventListener("input", (event) => setShieldLeakage(event.target.value));
  elements.analyzerCenterInput.addEventListener("input", (event) => setAnalyzerCenter(event.target.value));
  elements.quickCenterInput?.addEventListener("input", (event) => setAnalyzerCenter(event.target.value));
  elements.analyzerSpanSelect.addEventListener("change", (event) => setAnalyzerSpan(event.target.value));
  elements.quickSpanInput?.addEventListener("input", (event) => setAnalyzerSpan(event.target.value));
  elements.analyzerRbwSelect.addEventListener("change", (event) => setAnalyzerRbw(event.target.value));
  elements.quickRbwInput?.addEventListener("input", (event) => setAnalyzerRbw(event.target.value));
  elements.autoTuneButton.addEventListener("click", runAnalyzerAutoSet);
  elements.captureBaselineButton.addEventListener("click", () => handleAnalyzerAction("capture-baseline"));
  elements.clearBaselineButton.addEventListener("click", () => handleAnalyzerAction("clear-baseline"));
  elements.generatorFrequencyInput?.addEventListener("input", (event) => {
    state.generator.editTarget = "freq";
    state.generator.frequencyValue = Math.max(0.001, Number(event.target.value) || 0.001);
    syncGeneratorOutputs();
  });
  elements.generatorLevelInput?.addEventListener("input", (event) => {
    state.generator.editTarget = "level";
    state.generator.levelDbm = Math.max(-120, Math.min(30, Number(event.target.value) || 0));
    syncGeneratorOutputs();
  });
  elements.generatorLevelButton?.addEventListener("click", () => {
    state.generator.editTarget = "level";
    elements.generatorLevelInput?.focus();
    syncGeneratorOutputs();
  });
  elements.generatorUnitButtons.forEach((button) => button.addEventListener("click", () => {
    state.generator.editTarget = "freq";
    const frequencyHz = getGeneratorFrequencyHz();
    state.generator.frequencyUnit = button.dataset.generatorUnit;
    state.generator.frequencyValue = frequencyHz / generatorUnitScale[state.generator.frequencyUnit];
    syncGeneratorOutputs();
  }));
  elements.generatorLevelStepButtons.forEach((button) => button.addEventListener("click", () => {
    state.generator.editTarget = "level";
    state.generator.levelDbm = Math.max(-120, Math.min(30, state.generator.levelDbm + Number(button.dataset.levelStep)));
    syncGeneratorOutputs();
  }));
  elements.generatorFireButton?.addEventListener("click", fireGenerator);
  elements.generatorOutputToggle?.addEventListener("click", stopGenerator);
  window.addEventListener("hashchange", () => setActiveView(getViewFromHash(), false));
}

function renderScope(timestamp) {
  if (state.scope.running) {
    state.scope.phase += Math.min((timestamp - state.scope.lastFrameTime) / 1000, 0.05);
    state.scope.lastFrameTime = timestamp;
  }
  const samples = state.scope.running ? generateScopeWaveform() : state.scope.frozenWaveform || generateScopeWaveform();
  if (!state.scope.running) state.scope.frozenWaveform = samples;
  drawScopeGrid();
  drawScope(samples);
  updateScopeMeasurements(samples);
  state.render.scopeCanvasDirty = false;
}

function frame(timestamp) {
  state.animationTime = timestamp / 1000;
  if (state.activeView === "scope") {
    if (state.scope.running || state.render.scopeCanvasDirty) renderScope(timestamp);
    else state.scope.lastFrameTime = timestamp;
  } else {
    state.scope.lastFrameTime = timestamp;
  }
  if (state.activeView === "analyzer") {
    if (state.analyzer.sweepRunning && timestamp - state.analyzer.lastSweepTime >= 140) {
      state.analyzer.lastSweepTime = timestamp;
      state.render.analyzerStateDirty = true;
      state.render.analyzerCanvasDirty = true;
    }
    if (state.render.analyzerCanvasDirty) renderAnalyzer();
  }
  requestAnimationFrame(frame);
}

function init() {
  elements.amplitudeInput.value = String(state.scope.amplitude);
  elements.frequencyInput.value = String(state.scope.frequency);
  elements.offsetInput.value = String(state.scope.offset);
  elements.noiseInput.value = String(state.scope.noise);
  elements.voltsPerDiv.value = String(state.scope.voltsPerDiv);
  elements.timePerDiv.value = String(state.scope.timePerDiv);
  elements.triggerLevel.value = String(state.scope.triggerLevel);
  elements.couplingSelect.value = state.scope.coupling;
  elements.invertToggle.checked = state.scope.invert;
  elements.distanceInput.value = String(state.analyzer.distanceM);
  elements.shieldEnabledToggle.checked = state.analyzer.shieldEnabled;
  elements.shieldEffectivenessInput.value = String(state.analyzer.shieldEffectivenessDb);
  elements.shieldLeakageInput.value = String(state.analyzer.shieldLeakagePct);
  elements.analyzerCenterInput.value = String(state.analyzer.centerMHz);
  elements.analyzerSpanSelect.value = String(state.analyzer.spanMHz);
  elements.analyzerRbwSelect.value = String(state.analyzer.rbwKHz);
  elements.generatorFrequencyInput.value = String(state.generator.frequencyValue);
  elements.generatorLevelInput.value = state.generator.levelDbm.toFixed(1);
  syncAnalyzerFromGenerator();
  applyScopePreset(0);
  attachEvents();
  applyTranslations();
  setActiveView(state.activeView, false);
  requestAnimationFrame(frame);
}

init();

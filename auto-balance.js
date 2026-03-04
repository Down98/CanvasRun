#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { DEFAULT_TRACK, TRAITS, collectStats } from "./test.js";

const DEFAULT_SAVE_PATH = path.join("balance-results", "trait-balance-save.json");

const DEFAULTS = {
  steps: 1,
  runs: 1200,
  verifyRuns: 3000,
  track: DEFAULT_TRACK,
  seed: 42,
  tolerance: 0.01,
  adjustGain: 0.0045,
  minAdjustPct: 0.001,
  maxAdjustPct: 0.015,
  minMultiplier: 0.9,
  maxMultiplier: 1.1,
  savePath: DEFAULT_SAVE_PATH,
  reset: false
};

function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function round6(v) {
  return Number(v.toFixed(6));
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];

    if ((key === "--steps" || key === "-s") && next) {
      opts.steps = Math.max(1, Number(next) || DEFAULTS.steps);
      i += 1;
      continue;
    }
    if ((key === "--runs" || key === "-n") && next) {
      opts.runs = Math.max(50, Number(next) || DEFAULTS.runs);
      i += 1;
      continue;
    }
    if (key === "--verify-runs" && next) {
      opts.verifyRuns = Math.max(100, Number(next) || DEFAULTS.verifyRuns);
      i += 1;
      continue;
    }
    if ((key === "--track" || key === "-t") && next) {
      opts.track = Math.max(100, Number(next) || DEFAULTS.track);
      i += 1;
      continue;
    }
    if (key === "--seed" && next) {
      opts.seed = Number(next) || DEFAULTS.seed;
      i += 1;
      continue;
    }
    if (key === "--tolerance" && next) {
      opts.tolerance = clamp(Number(next) || DEFAULTS.tolerance, 0, 0.2);
      i += 1;
      continue;
    }
    if (key === "--adjust-gain" && next) {
      opts.adjustGain = clamp(Number(next) || DEFAULTS.adjustGain, 0.0001, 0.2);
      i += 1;
      continue;
    }
    if (key === "--min-adjust" && next) {
      opts.minAdjustPct = clamp(Number(next) || DEFAULTS.minAdjustPct, 0, 0.2);
      i += 1;
      continue;
    }
    if (key === "--max-adjust" && next) {
      opts.maxAdjustPct = clamp(Number(next) || DEFAULTS.maxAdjustPct, 0, 0.3);
      i += 1;
      continue;
    }
    if (key === "--min" && next) {
      opts.minMultiplier = clamp(Number(next) || DEFAULTS.minMultiplier, 0.4, 1.0);
      i += 1;
      continue;
    }
    if (key === "--max" && next) {
      opts.maxMultiplier = clamp(Number(next) || DEFAULTS.maxMultiplier, 1.0, 2.0);
      i += 1;
      continue;
    }
    if (key === "--reset") {
      opts.reset = true;
      continue;
    }
    if ((key === "--save" || key === "--out" || key === "-o") && next) {
      opts.savePath = path.normalize(next);
      i += 1;
    }
  }
  if (opts.minMultiplier > opts.maxMultiplier) {
    const tmp = opts.minMultiplier;
    opts.minMultiplier = opts.maxMultiplier;
    opts.maxMultiplier = tmp;
  }
  if (opts.minAdjustPct > opts.maxAdjustPct) {
    const tmp = opts.minAdjustPct;
    opts.minAdjustPct = opts.maxAdjustPct;
    opts.maxAdjustPct = tmp;
  }
  return opts;
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createDefaultSave() {
  const target = 1 / TRAITS.length;
  const traitMultipliers = {};
  const targetWinRateByTrait = {};
  const emaWinRateByTrait = {};
  for (const t of TRAITS) {
    traitMultipliers[t.id] = 1;
    targetWinRateByTrait[t.id] = target;
    emaWinRateByTrait[t.id] = target;
  }

  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    iterationsTotal: 0,
    traitMultipliers,
    targetWinRateByTrait,
    emaWinRateByTrait,
    params: {
      tolerance: DEFAULTS.tolerance,
      adjustGain: DEFAULTS.adjustGain,
      minAdjustPct: DEFAULTS.minAdjustPct,
      maxAdjustPct: DEFAULTS.maxAdjustPct,
      minMultiplier: DEFAULTS.minMultiplier,
      maxMultiplier: DEFAULTS.maxMultiplier
    },
    lastTrain: null,
    lastVerify: null
  };
}

function loadSave(savePath, reset = false) {
  if (reset || !fs.existsSync(savePath)) return createDefaultSave();

  const raw = fs.readFileSync(savePath, "utf8");
  const parsed = JSON.parse(raw);
  const base = createDefaultSave();

  const merged = {
    ...base,
    ...parsed,
    traitMultipliers: { ...base.traitMultipliers, ...(parsed.traitMultipliers ?? {}) },
    targetWinRateByTrait: { ...base.targetWinRateByTrait, ...(parsed.targetWinRateByTrait ?? {}) },
    emaWinRateByTrait: { ...base.emaWinRateByTrait, ...(parsed.emaWinRateByTrait ?? {}) },
    params: { ...base.params, ...(parsed.params ?? {}) }
  };

  for (const t of TRAITS) {
    const m = Number(merged.traitMultipliers[t.id]);
    merged.traitMultipliers[t.id] = Number.isFinite(m) ? m : 1;
    const target = Number(merged.targetWinRateByTrait[t.id]);
    merged.targetWinRateByTrait[t.id] = Number.isFinite(target) ? target : 1 / TRAITS.length;
    const ema = Number(merged.emaWinRateByTrait[t.id]);
    merged.emaWinRateByTrait[t.id] = Number.isFinite(ema) ? ema : 1 / TRAITS.length;
  }

  return merged;
}

function compactRows(rows) {
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    winRate: round6(r.winRate),
    podiumRate: round6(r.podiumRate),
    avgRank: round6(r.avgRank),
    avgTime: round6(r.avgTime)
  }));
}

function buildTunedTraits(saveData, opts) {
  return TRAITS.map((t) => {
    const multiplier = clamp(
      saveData.traitMultipliers[t.id] ?? 1,
      opts.minMultiplier,
      opts.maxMultiplier
    );
    return {
      ...t,
      tuning: {
        speedMul: round6(multiplier),
        drainMul: 1,
        regenMul: 1,
        varianceMul: 1,
        earlySpeedMul: 1,
        midSpeedMul: 1,
        lateSpeedMul: 1
      }
    };
  });
}

function runOneStep(saveData, opts, stepIndex) {
  const trainSeed = opts.seed + stepIndex;
  const tunedTraits = buildTunedTraits(saveData, opts);
  const rows = collectStats({
    runs: opts.runs,
    track: opts.track,
    seed: trainSeed,
    traits: tunedTraits
  });

  const adjustments = [];
  const emaAlpha = 0.22;
  for (const row of rows) {
    const id = row.id;
    const target = saveData.targetWinRateByTrait[id] ?? 1 / TRAITS.length;
    const current = saveData.traitMultipliers[id] ?? 1;
    const prevEma = saveData.emaWinRateByTrait[id] ?? target;
    const emaWinRate = prevEma * (1 - emaAlpha) + row.winRate * emaAlpha;
    saveData.emaWinRateByTrait[id] = round6(emaWinRate);
    let next = current;
    let action = "hold";
    let adjustPct = 0;

    if (emaWinRate > target + opts.tolerance) {
      const errorRatio = (emaWinRate - target) / Math.max(0.0001, target);
      adjustPct = clamp(Math.abs(errorRatio) * opts.adjustGain, opts.minAdjustPct, opts.maxAdjustPct);
      next = clamp(current * (1 - adjustPct), opts.minMultiplier, opts.maxMultiplier);
      action = "down";
    } else if (emaWinRate < target - opts.tolerance) {
      const errorRatio = (target - emaWinRate) / Math.max(0.0001, target);
      adjustPct = clamp(Math.abs(errorRatio) * opts.adjustGain, opts.minAdjustPct, opts.maxAdjustPct);
      next = clamp(current * (1 + adjustPct), opts.minMultiplier, opts.maxMultiplier);
      action = "up";
    }

    saveData.traitMultipliers[id] = round6(next);
    adjustments.push({
      id,
      targetWinRate: round6(target),
      winRate: round6(row.winRate),
      emaWinRate: round6(emaWinRate),
      action,
      adjustPct: round6(adjustPct),
      before: round6(current),
      after: round6(next)
    });
  }

  saveData.iterationsTotal += 1;
  saveData.lastTrain = {
    at: new Date().toISOString(),
    stepInRun: stepIndex + 1,
    totalIterations: saveData.iterationsTotal,
    runs: opts.runs,
    track: opts.track,
    seed: trainSeed,
    rows: compactRows(rows),
    adjustments
  };
}

function runVerify(saveData, opts) {
  const verifySeed = opts.seed + 999999;
  const tunedTraits = buildTunedTraits(saveData, opts);
  const rows = collectStats({
    runs: opts.verifyRuns,
    track: opts.track,
    seed: verifySeed,
    traits: tunedTraits
  });
  saveData.lastVerify = {
    at: new Date().toISOString(),
    runs: opts.verifyRuns,
    track: opts.track,
    seed: verifySeed,
    rows: compactRows(rows)
  };
}

function saveState(savePath, saveData, opts) {
  const toSave = { ...saveData };
  // Keep one compact save-state file; drop legacy history if present.
  if ("history" in toSave) delete toSave.history;

  saveData.updatedAt = new Date().toISOString();
  toSave.updatedAt = saveData.updatedAt;
  toSave.params = {
    tolerance: opts.tolerance,
    adjustGain: opts.adjustGain,
    minAdjustPct: opts.minAdjustPct,
    maxAdjustPct: opts.maxAdjustPct,
    minMultiplier: opts.minMultiplier,
    maxMultiplier: opts.maxMultiplier
  };
  ensureDirForFile(savePath);
  fs.writeFileSync(savePath, JSON.stringify(toSave, null, 2), "utf8");
}

function formatPct(v) {
  return `${(v * 100).toFixed(2)}%`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const saveData = loadSave(opts.savePath, opts.reset);

  for (let i = 0; i < opts.steps; i += 1) {
    runOneStep(saveData, opts, i);
  }
  runVerify(saveData, opts);
  saveState(opts.savePath, saveData, opts);

  const sorted = [...saveData.lastVerify.rows].sort((a, b) => b.winRate - a.winRate);
  const top = sorted
    .slice(0, 3)
    .map((r) => `${r.id}:${formatPct(r.winRate)}`)
    .join(", ");
  const bottom = sorted
    .slice(-3)
    .reverse()
    .map((r) => `${r.id}:${formatPct(r.winRate)}`)
    .join(", ");
  const multiplierLine = TRAITS.map((t) => `${t.id}:${saveData.traitMultipliers[t.id].toFixed(4)}`).join(", ");

  console.log(`saved: ${opts.savePath}`);
  console.log(`iterationsTotal=${saveData.iterationsTotal}, stepsThisRun=${opts.steps}`);
  console.log(`top=[${top}]`);
  console.log(`bottom=[${bottom}]`);
  console.log(`multipliers=${multiplierLine}`);
}

main();

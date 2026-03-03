#!/usr/bin/env node

const DEFAULT_RUNS = 1000;
const DEFAULT_TRACK = 1200;
const DEFAULT_RUNNERS = 9;
const DT = 0.2;
const RACE_TIMEOUT_SEC = 900;
const FRONT_RUNNER_SCALE = 1;
const CLOSER_TRAIT_SCALE = 0.97;

const PACE_MIN_RUN_HOLD_SEC = 0.8;
const PACE_MIN_RECOVER_HOLD_SEC = 0.7;

const STAMINA_PHASE_TARGET_BASE = {
  opening: 0.75,
  middle: 0.4,
  final: 0.1
};

const DEFAULT_NAMES = [
  "Rabbit",
  "Turtle",
  "Wolf",
  "Cheetah",
  "Cat",
  "Dog",
  "Hamster",
  "Snake",
  "Mouse",
  "Fox",
  "Panda",
  "Eagle"
];

const TRAITS = [
  { id: "steady", label: "steady", baseSpeed: 10.99, variance: 0.5, staminaDrainBase: 0.0125, staminaRegenBase: 0.0106 },
  { id: "mid_spender", label: "mid_spender", baseSpeed: 11.11, variance: 0.6, staminaDrainBase: 0.013, staminaRegenBase: 0.0102 },
  { id: "late_runner", label: "late_runner", baseSpeed: 10.94, variance: 0.64, staminaDrainBase: 0.0133, staminaRegenBase: 0.0102 },
  { id: "front_runner", label: "front_runner", baseSpeed: 11.35, variance: 0.67, staminaDrainBase: 0.0141, staminaRegenBase: 0.0098 },
  { id: "closer", label: "closer", baseSpeed: 10.78, variance: 0.58, staminaDrainBase: 0.0137, staminaRegenBase: 0.0101 },
  { id: "endurance", label: "endurance", baseSpeed: 11.03, variance: 0.41, staminaDrainBase: 0.0117, staminaRegenBase: 0.0118 },
  { id: "sprinter", label: "sprinter", baseSpeed: 11.24, variance: 0.58, staminaDrainBase: 0.0143, staminaRegenBase: 0.0095 },
  { id: "risk_taker", label: "risk_taker", baseSpeed: 10.92, variance: 0.95, staminaDrainBase: 0.0141, staminaRegenBase: 0.0099 },
  { id: "tactician", label: "tactician", baseSpeed: 11.08, variance: 0.5, staminaDrainBase: 0.0128, staminaRegenBase: 0.0109 },
  { id: "last_fight", label: "last_fight", baseSpeed: 11.32, variance: 0.62, staminaDrainBase: 0.0126, staminaRegenBase: 0.0105 }
];

function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function parseArgs(argv) {
  const opts = {
    runs: DEFAULT_RUNS,
    track: DEFAULT_TRACK,
    runners: DEFAULT_RUNNERS,
    seed: null,
    traitOnly: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];

    if ((key === "--runs" || key === "-n") && next) {
      opts.runs = Math.max(1, Number(next) || DEFAULT_RUNS);
      i += 1;
      continue;
    }
    if ((key === "--track" || key === "-t") && next) {
      opts.track = Math.max(100, Number(next) || DEFAULT_TRACK);
      i += 1;
      continue;
    }
    if ((key === "--runners" || key === "-p") && next) {
      opts.runners = Math.max(2, Number(next) || DEFAULT_RUNNERS);
      i += 1;
      continue;
    }
    if (key === "--seed" && next) {
      opts.seed = Number(next);
      i += 1;
      continue;
    }
    if (key === "--trait-only") {
      opts.traitOnly = true;
    }
  }

  return opts;
}

function createRng(seedValue) {
  if (!Number.isFinite(seedValue)) return Math.random;
  let t = seedValue >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTrait(rng) {
  return TRAITS[Math.floor(rng() * TRAITS.length)];
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function createStaminaPlan(traitId) {
  const plan = { ...STAMINA_PHASE_TARGET_BASE };

  if (traitId === "steady") {
    plan.opening += 0.04;
    plan.middle += 0.04;
    plan.final += 0.01;
  } else if (traitId === "endurance") {
    plan.opening += 0.015;
    plan.middle += 0.015;
    plan.final += 0.008;
  } else if (traitId === "late_runner" || traitId === "closer") {
    plan.opening += 0.05;
    plan.middle += 0.05;
    plan.final -= 0.01;
  } else if (traitId === "front_runner" || traitId === "sprinter") {
    plan.opening -= 0.08;
    plan.middle -= 0.06;
    plan.final += 0.02;
  } else if (traitId === "mid_spender") {
    plan.opening -= 0.04;
    plan.middle -= 0.1;
    plan.final += 0.01;
  } else if (traitId === "risk_taker") {
    plan.opening -= 0.06;
    plan.middle -= 0.08;
    plan.final -= 0.01;
  } else if (traitId === "last_fight") {
    plan.opening += 0.02;
    plan.middle += 0.02;
    plan.final -= 0.02;
  }

  plan.opening = clamp(plan.opening, 0.56, 0.9);
  plan.middle = clamp(plan.middle, 0.22, 0.72);
  plan.final = clamp(plan.final, 0.04, 0.26);
  if (plan.middle > plan.opening - 0.05) plan.middle = plan.opening - 0.05;
  if (plan.final > plan.middle - 0.05) plan.final = plan.middle - 0.05;

  return plan;
}

function createPaceProfile(traitId) {
  const base = {
    runMinSec: 2.3,
    runMaxSec: 3.5,
    recoverMinSec: 1.1,
    recoverMaxSec: 1.9,
    runSpeedMul: 1.5,
    recoverSpeedMul: 0.8,
    runDrainMul: 1.62,
    recoverDrainMul: 0.26,
    recoverRegenPerSec: 0.0048,
    recoverStartStamina: 0.34,
    resumeStamina: 0.68,
    earlyRunBias: 1,
    lateRunBias: 1
  };

  if (traitId === "steady") {
    Object.assign(base, {
      runMinSec: 2.2,
      runMaxSec: 3.3,
      recoverMinSec: 1.3,
      recoverMaxSec: 2.1,
      runSpeedMul: 1.46,
      recoverSpeedMul: 0.83,
      runDrainMul: 1.45,
      recoverDrainMul: 0.24,
      recoverRegenPerSec: 0.0054,
      recoverStartStamina: 0.33,
      resumeStamina: 0.69
    });
  } else if (traitId === "mid_spender") {
    Object.assign(base, {
      runMinSec: 3.1,
      runMaxSec: 4.9,
      recoverMinSec: 0.9,
      recoverMaxSec: 1.5,
      runSpeedMul: 1.54,
      recoverSpeedMul: 0.79,
      runDrainMul: 1.88,
      recoverDrainMul: 0.24,
      recoverRegenPerSec: 0.0043,
      recoverStartStamina: 0.36,
      resumeStamina: 0.66,
      earlyRunBias: 0.92
    });
  } else if (traitId === "late_runner") {
    Object.assign(base, {
      runMinSec: 2.5,
      runMaxSec: 3.8,
      recoverMinSec: 1.6,
      recoverMaxSec: 2.6,
      runSpeedMul: 1.38,
      recoverSpeedMul: 0.84,
      runDrainMul: 1.58,
      recoverDrainMul: 0.22,
      recoverRegenPerSec: 0.0059,
      recoverStartStamina: 0.34,
      resumeStamina: 0.74,
      earlyRunBias: 0.68,
      lateRunBias: 1.34
    });
  } else if (traitId === "front_runner") {
    Object.assign(base, {
      runMinSec: 3.8,
      runMaxSec: 5.8,
      recoverMinSec: 0.9,
      recoverMaxSec: 1.6,
      runSpeedMul: 1.56,
      recoverSpeedMul: 0.78,
      runDrainMul: 1.95,
      recoverDrainMul: 0.28,
      recoverRegenPerSec: 0.0041,
      recoverStartStamina: 0.4,
      resumeStamina: 0.67,
      lateRunBias: 0.9
    });
  } else if (traitId === "closer") {
    Object.assign(base, {
      runMinSec: 2,
      runMaxSec: 3.1,
      recoverMinSec: 1.5,
      recoverMaxSec: 2.5,
      runSpeedMul: 1.47,
      recoverSpeedMul: 0.85,
      runDrainMul: 1.5,
      recoverDrainMul: 0.22,
      recoverRegenPerSec: 0.006,
      recoverStartStamina: 0.3,
      resumeStamina: 0.73,
      earlyRunBias: 0.82,
      lateRunBias: 1.24
    });
  } else if (traitId === "endurance") {
    Object.assign(base, {
      runMinSec: 2.6,
      runMaxSec: 3.9,
      recoverMinSec: 1.45,
      recoverMaxSec: 2.85,
      runSpeedMul: 1.43,
      recoverSpeedMul: 0.84,
      runDrainMul: 1.34,
      recoverDrainMul: 0.22,
      recoverRegenPerSec: 0.0066,
      recoverStartStamina: 0.29,
      resumeStamina: 0.76
    });
  } else if (traitId === "sprinter") {
    Object.assign(base, {
      runMinSec: 3.3,
      runMaxSec: 5.5,
      recoverMinSec: 0.8,
      recoverMaxSec: 1.4,
      runSpeedMul: 1.58,
      recoverSpeedMul: 0.77,
      runDrainMul: 2.04,
      recoverDrainMul: 0.3,
      recoverRegenPerSec: 0.0038,
      recoverStartStamina: 0.42,
      resumeStamina: 0.66,
      lateRunBias: 1.08
    });
  } else if (traitId === "risk_taker") {
    Object.assign(base, {
      runMinSec: 1.7,
      runMaxSec: 5.9,
      recoverMinSec: 0.7,
      recoverMaxSec: 2.2,
      runSpeedMul: 1.53,
      recoverSpeedMul: 0.79,
      runDrainMul: 1.86,
      recoverDrainMul: 0.25,
      recoverRegenPerSec: 0.0046,
      recoverStartStamina: 0.35,
      resumeStamina: 0.68
    });
  } else if (traitId === "tactician") {
    Object.assign(base, {
      runMinSec: 2.6,
      runMaxSec: 3.9,
      recoverMinSec: 1.2,
      recoverMaxSec: 2.1,
      runSpeedMul: 1.48,
      recoverSpeedMul: 0.84,
      runDrainMul: 1.44,
      recoverDrainMul: 0.22,
      recoverRegenPerSec: 0.0058,
      recoverStartStamina: 0.3,
      resumeStamina: 0.73
    });
  } else if (traitId === "last_fight") {
    Object.assign(base, {
      runMinSec: 2.2,
      runMaxSec: 3.6,
      recoverMinSec: 1.6,
      recoverMaxSec: 3.1,
      runSpeedMul: 1.41,
      recoverSpeedMul: 0.83,
      runDrainMul: 1.58,
      recoverDrainMul: 0.21,
      recoverRegenPerSec: 0.0064,
      recoverStartStamina: 0.3,
      resumeStamina: 0.78,
      earlyRunBias: 0.7,
      lateRunBias: 1.34
    });
  }

  return base;
}

function rollPaceDuration(minSec, maxSec, bias, rng) {
  const r = clamp(bias + (rng() - 0.5) * 0.38, 0, 1);
  return lerp(minSec, maxSec, r);
}

function phaseKeyFromProgress(progress) {
  if (progress < 0.33) return "opening";
  if (progress < 0.67) return "middle";
  if (progress < 0.9) return "final";
  return "climax";
}

function createRunner(name, idx, rng, forcedTrait = null) {
  const trait = forcedTrait ?? pickTrait(rng);
  const paceProfile = createPaceProfile(trait.id);
  return {
    id: idx + 1,
    name,
    trait,
    distance: 0,
    stamina: 1,
    finishTime: null,
    paceProfile,
    staminaPlan: createStaminaPlan(trait.id),
    paceMode: "run",
    paceModeUntil: rollPaceDuration(paceProfile.runMinSec, paceProfile.runMaxSec, 0.62, rng),
    paceLockedUntil: 0
  };
}

function buildNames(count) {
  const names = [];
  for (let i = 0; i < count; i += 1) {
    names.push(DEFAULT_NAMES[i] ?? `Runner${i + 1}`);
  }
  return names;
}

function simulateRace(trackMeters, runnerCount, rng) {
  const effectiveRunnerCount = TRAITS.length;
  const names = buildNames(effectiveRunnerCount);
  const traitOrder = shuffleInPlace([...TRAITS], rng);
  const runners = names.map((name, idx) => createRunner(name, idx, rng, traitOrder[idx]));

  let time = 0;
  let done = 0;
  while (done < runners.length && time < RACE_TIMEOUT_SEC) {
    const sorted = [...runners].sort((a, b) => b.distance - a.distance);
    const rankIndex = new Map(sorted.map((r, i) => [r.id, i + 1]));

    for (const r of runners) {
      if (r.finishTime !== null) continue;

      const rank = rankIndex.get(r.id);
      const progress = clamp(r.distance / trackMeters, 0, 1);
      const phaseKey = phaseKeyFromProgress(progress);
      const leader = sorted[0];
      const gapLeader = leader ? Math.max(0, leader.distance - r.distance) : 0;
      const fieldSize = runners.length;

      let speedMul = 1;
      let flat = 0;
      let varMul = 1;
      let drainMul = 1;
      let regen = r.trait.staminaRegenBase;
      let fatigueIgnore = 0;
      let spendDrive = 1;

      const paceProfile = r.paceProfile;
      const staminaPlan = r.staminaPlan;
      const latePhase = phaseKey === "final" || phaseKey === "climax";
      const desperateChase = latePhase && rank >= Math.max(3, fieldSize - 1);
      const lowStaminaGate = clamp(paceProfile.recoverStartStamina + (progress > 0.78 ? 0.02 : 0), 0.12, 0.82);
      const highStaminaGate = clamp(paceProfile.resumeStamina - (latePhase ? 0.03 : 0), lowStaminaGate + 0.08, 0.95);
      const phaseTargetStamina = phaseKey === "opening" ? staminaPlan.opening : phaseKey === "middle" ? staminaPlan.middle : staminaPlan.final;
      const staminaGap = phaseTargetStamina - r.stamina;
      const preserveStrength = clamp(staminaGap / 0.28, 0, 1);
      const surplusStrength = clamp(-staminaGap / 0.32, 0, 1);
      const canSwitchPaceMode = time >= r.paceLockedUntil;

      const rollRunWindow = () => {
        let d = rollPaceDuration(paceProfile.runMinSec, paceProfile.runMaxSec, 0.56, rng);
        if (progress < 0.24) d *= paceProfile.earlyRunBias;
        if (progress > 0.72) d *= paceProfile.lateRunBias;
        if (desperateChase) d *= 1.22;
        return clamp(d, 0.8, 8.2);
      };

      const rollRecoverWindow = (forceRecover = false) => {
        let d = rollPaceDuration(paceProfile.recoverMinSec, paceProfile.recoverMaxSec, forceRecover ? 0.72 : 0.48, rng);
        if (progress > 0.78) d *= 0.88;
        if (desperateChase) d *= 0.7;
        return clamp(d, 0.45, 5.3);
      };

      if (r.paceMode === "run") {
        const timedOut = time >= r.paceModeUntil;
        const forced = r.stamina <= lowStaminaGate;
        if ((forced || timedOut) && canSwitchPaceMode) {
          r.paceMode = "recover";
          r.paceModeUntil = time + rollRecoverWindow(forced);
          r.paceLockedUntil = time + PACE_MIN_RECOVER_HOLD_SEC;
        }
      } else {
        const timedOut = time >= r.paceModeUntil;
        const recoveredEnough = r.stamina >= highStaminaGate;
        const wantRunSwitch = (recoveredEnough && time >= r.paceModeUntil - 0.28) || timedOut || desperateChase;
        if (wantRunSwitch && canSwitchPaceMode) {
          r.paceMode = "run";
          r.paceModeUntil = time + rollRunWindow();
          r.paceLockedUntil = time + PACE_MIN_RUN_HOLD_SEC;
        }
      }

      let runSpeedMul = paceProfile.runSpeedMul;
      let runDrainMul = paceProfile.runDrainMul;
      let recoverSpeedMul = paceProfile.recoverSpeedMul;
      let recoverDrainMul = paceProfile.recoverDrainMul;
      let recoverRegen = paceProfile.recoverRegenPerSec;

      if (r.trait.id === "late_runner" || r.trait.id === "closer") {
        if (progress < 0.58) {
          if (r.trait.id === "late_runner") {
            runSpeedMul *= 0.88;
            runDrainMul *= 0.98;
            recoverRegen *= 1.06;
          } else {
            runSpeedMul *= 0.93;
            runDrainMul *= 0.88;
            recoverRegen *= 1.1;
          }
        } else {
          runSpeedMul *= r.trait.id === "late_runner" ? 1.14 : 1.1;
          runDrainMul *= r.trait.id === "late_runner" ? 1.1 : 1.06;
          recoverSpeedMul *= 0.95;
        }
      }
      if (r.trait.id === "front_runner" && progress > 0.72) {
        runSpeedMul *= 0.94;
        runDrainMul *= 0.88;
      }
      if (r.trait.id === "last_fight") {
        if (rank === fieldSize) runSpeedMul *= 1.1;
        else if (rank <= Math.max(1, Math.floor(fieldSize * 0.4))) runSpeedMul *= 0.92;
      }

      if (r.paceMode === "run") {
        speedMul *= runSpeedMul;
        drainMul *= runDrainMul;
        spendDrive *= 1.14;
      } else {
        speedMul *= recoverSpeedMul;
        drainMul *= recoverDrainMul;
        regen += recoverRegen * 5;
        spendDrive *= 0.74;
      }

      if (r.trait.id === "steady") {
        speedMul *= 1.01;
        varMul *= 0.84;
        drainMul *= 0.92;
        spendDrive *= 0.86;
      }
      if (r.trait.id === "mid_spender") {
        if (progress < 0.32) {
          speedMul *= 0.97;
          drainMul *= 0.46;
          spendDrive *= 0.55;
          regen += 0.0012;
        } else if (progress <= 0.72) {
          speedMul *= 1.21;
          flat += 0.95;
          drainMul *= 1.58;
          spendDrive *= 1.46;
        } else {
          speedMul *= 0.99;
          drainMul *= 1.08;
        }
      }
      if (r.trait.id === "late_runner") {
        if (progress < 0.62) {
          const frontPackCutoff = Math.max(2, Math.ceil(fieldSize * 0.35));
          const isFrontPack = rank <= frontPackCutoff;
          speedMul *= isFrontPack ? 0.93 : 0.98;
          flat += isFrontPack ? -0.12 : 0.02;
          drainMul *= isFrontPack ? 0.98 : 0.88;
          spendDrive *= isFrontPack ? 0.88 : 0.94;
          if (phaseKey === "opening") speedMul *= 0.99;
        } else {
          speedMul *= 1.38;
          flat += 1.08;
          drainMul *= 1.2;
          spendDrive *= 1.33;
        }
      }
      if (r.trait.id === "front_runner") {
        if (progress < 0.36) {
          speedMul *= 1.29;
          flat += 1.15;
          drainMul *= 1.38;
          spendDrive *= 1.4;
          if (phaseKey === "opening" && progress < 0.2) {
            speedMul *= 1.06;
            flat += 0.3;
          }
        } else if (progress > 0.7) {
          speedMul *= 0.95;
        }
        speedMul *= FRONT_RUNNER_SCALE;
      }
      if (r.trait.id === "closer") {
        const catchMul = 1 + clamp(gapLeader / Math.max(18, trackMeters * 0.04), 0, 0.16);
        speedMul *= catchMul;
        spendDrive *= 1.06;
        speedMul *= CLOSER_TRAIT_SCALE;
      }
      if (r.trait.id === "endurance") {
        speedMul *= 1.01;
        drainMul *= 0.88;
        regen += 0.0009;
        fatigueIgnore += 0.03;
        spendDrive *= 0.88;
        if (phaseKey === "final" || phaseKey === "climax") {
          speedMul *= 1.08;
          spendDrive *= 0.84;
          drainMul *= 0.9;
        }
      }
      if (r.trait.id === "sprinter") {
        if (phaseKey === "final" || phaseKey === "climax") {
          speedMul *= 1.2;
          flat += 0.75;
          drainMul *= 1.35;
          spendDrive *= 1.38;
        } else {
          speedMul *= 0.955;
        }
      }
      if (r.trait.id === "risk_taker") {
        speedMul *= lerp(0.94, 1.28, rng());
        varMul *= 1.24;
        spendDrive *= 1.18;
      }
      if (r.trait.id === "tactician") {
        speedMul *= 1.02;
        varMul *= 0.92;
        drainMul *= 0.95;
        spendDrive *= 0.94;
      }
      if (r.trait.id === "last_fight") {
        const isLast = rank === fieldSize;
        const isBottom = rank >= Math.max(2, fieldSize - 1);
        const isFrontPack = rank <= Math.max(1, Math.floor(fieldSize * 0.4));
        if (isLast) {
          speedMul *= 1.24;
          flat += 0.88;
          drainMul *= 1.3;
          spendDrive *= 1.48;
          regen += 0.0006;
        } else if (isBottom) {
          speedMul *= 1.12;
          flat += 0.42;
          drainMul *= 1.18;
          spendDrive *= 1.24;
        } else if (isFrontPack) {
          speedMul *= 0.9;
          drainMul *= 0.9;
          spendDrive *= 0.86;
        } else {
          speedMul *= 0.97;
        }
      }

      if (preserveStrength > 0) {
        speedMul *= 1 - preserveStrength * 0.16;
        drainMul *= 1 - preserveStrength * 0.34;
        spendDrive *= 1 - preserveStrength * 0.3;
        regen += preserveStrength * (r.paceMode === "recover" ? 0.0032 : 0.0014);
      } else if (surplusStrength > 0) {
        const phaseSpendMul = phaseKey === "opening" ? 0.45 : phaseKey === "middle" ? 0.78 : 1;
        speedMul *= 1 + surplusStrength * 0.11 * phaseSpendMul;
        drainMul *= 1 + surplusStrength * 0.16 * phaseSpendMul;
        spendDrive *= 1 + surplusStrength * 0.2 * phaseSpendMul;
      }

      const variation = (rng() - 0.5) * r.trait.variance * varMul;
      let fatigueMul = 1;
      if (r.stamina < 0.2) fatigueMul = lerp(0.74, 1, clamp(r.stamina / 0.2, 0, 1));
      fatigueMul = lerp(fatigueMul, 1, clamp(fatigueIgnore, 0, 0.95));

      const speed = Math.max(2.4, (r.trait.baseSpeed + variation + flat) * speedMul * fatigueMul);
      const drain = r.trait.staminaDrainBase * drainMul * spendDrive;
      r.stamina = clamp(r.stamina + (regen - drain) * DT, 0.02, 1);

      const prev = r.distance;
      const next = prev + speed * DT;
      if (next >= trackMeters) {
        const section = next - prev;
        const ratio = section > 0 ? (trackMeters - prev) / section : 1;
        r.distance = trackMeters;
        r.finishTime = time + DT * clamp(ratio, 0, 1) + rng() * 0.000001;
        done += 1;
      } else {
        r.distance = next;
      }
    }
    time += DT;
  }

  return [...runners].sort((a, b) => a.finishTime - b.finishTime);
}

function formatPct(v) {
  return `${(v * 100).toFixed(2)}%`;
}

function pad(value, len) {
  const text = String(value);
  if (text.length >= len) return text;
  return `${text}${" ".repeat(len - text.length)}`;
}

function run() {
  const opts = parseArgs(process.argv.slice(2));
  const rng = createRng(opts.seed);
  const effectiveRunners = TRAITS.length;

  const stats = new Map();
  for (const t of TRAITS) {
    stats.set(t.id, {
      id: t.id,
      label: t.label,
      picks: 0,
      wins: 0,
      podiums: 0,
      rankSum: 0,
      finishSum: 0
    });
  }

  for (let runIdx = 0; runIdx < opts.runs; runIdx += 1) {
    const results = simulateRace(opts.track, effectiveRunners, rng);
    for (let i = 0; i < results.length; i += 1) {
      const r = results[i];
      const rank = i + 1;
      const s = stats.get(r.trait.id);
      s.picks += 1;
      s.rankSum += rank;
      s.finishSum += r.finishTime;
      if (rank === 1) s.wins += 1;
      if (rank <= 3) s.podiums += 1;
    }
  }

  const rows = [...stats.values()]
    .filter((s) => s.picks > 0)
    .map((s) => ({
      ...s,
      winRate: s.wins / s.picks,
      podiumRate: s.podiums / s.picks,
      avgRank: s.rankSum / s.picks,
      avgTime: s.finishSum / s.picks
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const best = rows[0];
  const worst = rows[rows.length - 1];

  console.log("");
  console.log(`[CanvasRun Trait Sim from App.jsx] runs=${opts.runs}, track=${opts.track}m, runners=${effectiveRunners}${opts.seed !== null ? `, seed=${opts.seed}` : ""}`);
  console.log("mode: trait formulas mirrored from App.jsx (pace profile + stamina plan + trait modifiers)");
  console.log("lineup: one runner per trait each race (balanced trait sampling)");
  console.log("");
  console.log(`${pad("Trait", 14)} ${pad("Win", 8)} ${pad("Podium", 8)} ${pad("AvgRank", 8)} AvgTime`);
  console.log("-".repeat(52));
  for (const r of rows) {
    console.log(
      `${pad(r.label, 14)} ${pad(formatPct(r.winRate), 8)} ${pad(formatPct(r.podiumRate), 8)} ${pad(r.avgRank.toFixed(2), 8)} ${r.avgTime.toFixed(3)}s`
    );
  }
  console.log("");
  console.log(`BEST  : ${best.label} (win ${formatPct(best.winRate)})`);
  console.log(`WORST : ${worst.label} (win ${formatPct(worst.winRate)})`);
  console.log("");
}

run();

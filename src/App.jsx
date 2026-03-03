import React, { useEffect, useMemo, useRef, useState } from "react";

const MIN_TRACK = 1;
const MAX_TRACK = 10000;
const HUD_SYNC_MS = 120;
const MAX_ACTIVE_EFFECTS = 3;
const BASE_PX_PER_METER = 9.6;
const MIN_TRACK_PIXELS = 960;
const MAX_TRACK_PIXELS = 100000;
const FINISH_EXIT_SECONDS = 1.25;
const FINISH_EXIT_METERS = 22;
const TRACK_TIME_SCALE_REF = 1200;
const TRACK_TIME_SCALE_EXP = 0.33;
const TRACK_TIME_SCALE_MAX = 2.2;
const MAX_PARTICLES = 900;
const DUST_COLORS = ["#e2e8f0", "#cbd5e1", "#94a3b8", "#f8fafc"];

const SKILL_PREFIXES = [
  "Crimson",
  "Azure",
  "Emerald",
  "Golden",
  "Silver",
  "Shadow",
  "Blaze",
  "Storm",
  "Lunar",
  "Solar",
  "Iron",
  "Rapid",
  "Silent",
  "Wild",
  "Turbo",
  "Royal",
  "Comet",
  "Nova",
  "Echo",
  "Phantom",
  "Frost",
  "Inferno",
  "Volt",
  "Aero",
  "Titan",
  "Mirage"
];
const SKILL_SUFFIXES = ["Dash", "Pulse", "Stride", "Drive", "Surge"];
const SKILL_TYPES = [
  { id: "burst", label: "폭발가속", color: "#f97316" },
  { id: "tempo", label: "리듬", color: "#14b8a6" },
  { id: "late", label: "종반", color: "#8b5cf6" },
  { id: "chase", label: "추입", color: "#22c55e" },
  { id: "gamble", label: "도박", color: "#f43f5e" },
  { id: "draft", label: "슬립", color: "#0ea5e9" },
  { id: "guard", label: "집중", color: "#eab308" },
  { id: "breakaway", label: "도주", color: "#fb7185" },
  { id: "pressure", label: "압박", color: "#a855f7" },
  { id: "duel", label: "결투", color: "#06b6d4" }
];
const RECOVERY_SKILL_TYPE = { id: "recover", label: "회복", color: "#34d399" };
const TOTAL_SKILL_TYPE_COUNT = SKILL_TYPES.length + 1;
const SKILL_RANKS = [
  { rank: "S", color: "#facc15", weight: 0.08, staminaCost: 0.2, chanceMul: 1.14, cooldownMul: 0.84, effectMul: 1.22, particlePower: 1.56, particleCount: 1.65 },
  { rank: "A", color: "#fb923c", weight: 0.2, staminaCost: 0.16, chanceMul: 1.08, cooldownMul: 0.9, effectMul: 1.12, particlePower: 1.32, particleCount: 1.36 },
  { rank: "B", color: "#60a5fa", weight: 0.34, staminaCost: 0.12, chanceMul: 1.02, cooldownMul: 0.97, effectMul: 1.04, particlePower: 1.12, particleCount: 1.14 },
  { rank: "C", color: "#a78bfa", weight: 0.26, staminaCost: 0.09, chanceMul: 0.96, cooldownMul: 1.04, effectMul: 0.96, particlePower: 0.98, particleCount: 0.96 },
  { rank: "D", color: "#94a3b8", weight: 0.12, staminaCost: 0.06, chanceMul: 0.9, cooldownMul: 1.12, effectMul: 0.9, particlePower: 0.86, particleCount: 0.84 }
];

const STAMINA_TIER_COLORS = ["#ef4444", "#f97316", "#facc15", "#84cc16", "#22c55e"];
const STAMINA_TIER_SPEED_BONUS = [0, 0.012, 0.028, 0.05, 0.078];

const RUNNER_TRAITS = [
  { id: "steady", label: "안정형", color: "#10b981" },
  { id: "mid_spender", label: "중반 몰아형", color: "#f59e0b" },
  { id: "late_runner", label: "후반 추격형", color: "#8b5cf6" },
  { id: "front_runner", label: "선행형", color: "#f97316" },
  { id: "closer", label: "추입형", color: "#22c55e" },
  { id: "endurance", label: "지구력형", color: "#0ea5e9" },
  { id: "sprinter", label: "스퍼트형", color: "#ef4444" },
  { id: "risk_taker", label: "난전형", color: "#ec4899" },
  { id: "tactician", label: "전략형", color: "#6366f1" },
  { id: "last_fight", label: "꼴지 반격형", color: "#fb7185" }
];

const ULTIMATE_POOL = [
  { id: "ult-sidewinder", name: "쌍주행 파열", trigger: "side_by_side", needSec: 5, color: "#fb7185", durationSec: 4.6, speedMul: 1.24, flatSpeed: 1.2, staminaDrainMul: 1.06, fatigueIgnore: 0.08, trailBoost: 1.22, hitStopMs: 140 },
  { id: "ult-echo-link", name: "연쇄 공명", trigger: "chain_react", reactWindowSec: 2.2, color: "#60a5fa", durationSec: 4.2, speedMul: 1.2, flatSpeed: 1.05, staminaDrainMul: 0.98, fatigueIgnore: 0.1, trailBoost: 1.18, hitStopMs: 120 },
  { id: "ult-last-stand", name: "꼴지 폭주", trigger: "last_place_hold", needSec: 5.4, color: "#ef4444", durationSec: 5, speedMul: 1.26, flatSpeed: 1.3, staminaDrainMul: 1.02, fatigueIgnore: 0.14, trailBoost: 1.35, hitStopMs: 170 },
  { id: "ult-mid-storm", name: "중반 폭풍", trigger: "phase_middle", minProgress: 0.48, color: "#22d3ee", durationSec: 4.1, speedMul: 1.19, flatSpeed: 1.02, staminaDrainMul: 0.97, fatigueIgnore: 0.08, trailBoost: 1.15, hitStopMs: 110 },
  { id: "ult-final-drive", name: "종반 각성", trigger: "phase_final", color: "#f97316", durationSec: 4.9, speedMul: 1.25, flatSpeed: 1.22, staminaDrainMul: 1.04, fatigueIgnore: 0.12, trailBoost: 1.3, hitStopMs: 150 },
  { id: "ult-front-emperor", name: "선두 제왕", trigger: "first_place_hold", needSec: 4, color: "#facc15", durationSec: 4.2, speedMul: 1.18, flatSpeed: 0.92, staminaDrainMul: 0.92, fatigueIgnore: 0.08, trailBoost: 1.12, hitStopMs: 100 },
  { id: "ult-hunter-gap", name: "격차 사냥", trigger: "big_gap", minGapMeters: 16, color: "#34d399", durationSec: 4.5, speedMul: 1.24, flatSpeed: 1.12, staminaDrainMul: 1, fatigueIgnore: 0.12, trailBoost: 1.24, hitStopMs: 140 },
  { id: "ult-desperate-heart", name: "절체절명", trigger: "low_stamina", maxStamina: 0.24, color: "#e11d48", durationSec: 5.1, speedMul: 1.27, flatSpeed: 1.36, staminaDrainMul: 0.92, fatigueIgnore: 0.16, staminaRegenPerSec: 0.004, trailBoost: 1.36, hitStopMs: 180 },
  { id: "ult-full-charge", name: "풀차지 돌입", trigger: "high_stamina_opening", minStamina: 0.86, maxProgress: 0.3, color: "#0ea5e9", durationSec: 3.9, speedMul: 1.21, flatSpeed: 1.02, staminaDrainMul: 1.08, fatigueIgnore: 0.07, trailBoost: 1.2, hitStopMs: 120 },
  { id: "ult-comeback-sync", name: "역전 공명", trigger: "comeback_active", color: "#fb7185", durationSec: 4.7, speedMul: 1.23, flatSpeed: 1.16, staminaDrainMul: 0.98, fatigueIgnore: 0.13, trailBoost: 1.26, hitStopMs: 150 },
  { id: "ult-photo-finish", name: "포토피니시 모드", trigger: "duel_top", duelGap: 2.4, color: "#a855f7", durationSec: 4.3, speedMul: 1.22, flatSpeed: 1.15, staminaDrainMul: 1.02, fatigueIgnore: 0.11, trailBoost: 1.25, hitStopMs: 135 },
  { id: "ult-finish-hawk", name: "피니시 호크", trigger: "near_finish", remainMeters: 170, color: "#f59e0b", durationSec: 3.7, speedMul: 1.26, flatSpeed: 1.3, staminaDrainMul: 1.05, fatigueIgnore: 0.14, trailBoost: 1.34, hitStopMs: 140 },
  { id: "ult-crowd-crush", name: "밀집 분쇄", trigger: "packed_run", needSec: 4.2, color: "#14b8a6", durationSec: 4.4, speedMul: 1.2, flatSpeed: 1.04, staminaDrainMul: 0.97, fatigueIgnore: 0.09, trailBoost: 1.17, hitStopMs: 110 },
  { id: "ult-recovery-wave", name: "회복 반전", trigger: "recover_hold", needSec: 4.1, color: "#10b981", durationSec: 4.8, speedMul: 1.22, flatSpeed: 1.08, staminaDrainMul: 0.84, staminaRegenPerSec: 0.009, fatigueIgnore: 0.14, trailBoost: 1.24, hitStopMs: 130 },
  { id: "ult-cycle-overdrive", name: "사이클 오버드라이브", trigger: "cycle_count", needCycles: 3, minProgress: 0.42, color: "#f43f5e", durationSec: 4.9, speedMul: 1.24, flatSpeed: 1.18, staminaDrainMul: 0.94, fatigueIgnore: 0.14, trailBoost: 1.28, hitStopMs: 150 },
  { id: "ult-mid-top-control", name: "중반 상위 지배", trigger: "top3_middle", color: "#38bdf8", durationSec: 3.9, speedMul: 1.19, flatSpeed: 0.96, staminaDrainMul: 0.92, fatigueIgnore: 0.08, trailBoost: 1.14, hitStopMs: 110 },
  { id: "ult-bottom-fury", name: "하위 광분", trigger: "bottom2_final", color: "#ef4444", durationSec: 5, speedMul: 1.27, flatSpeed: 1.34, staminaDrainMul: 0.96, fatigueIgnore: 0.16, trailBoost: 1.38, hitStopMs: 180 },
  { id: "ult-surge-lock", name: "돌파 고정", trigger: "surge_hold", needSec: 2.2, color: "#06b6d4", durationSec: 4.5, speedMul: 1.22, flatSpeed: 1.06, staminaDrainMul: 0.95, fatigueIgnore: 0.1, trailBoost: 1.2, hitStopMs: 130 },
  { id: "ult-silent-timer", name: "침묵 타이머", trigger: "no_skill_long", needSec: 11, minProgress: 0.34, color: "#94a3b8", durationSec: 4.4, speedMul: 1.21, flatSpeed: 1.1, staminaDrainMul: 0.93, fatigueIgnore: 0.11, trailBoost: 1.19, hitStopMs: 125 },
  { id: "ult-crown-guard", name: "왕관 수호", trigger: "lead_late", minProgress: 0.78, color: "#fbbf24", durationSec: 4.3, speedMul: 1.2, flatSpeed: 1, staminaDrainMul: 0.88, fatigueIgnore: 0.1, trailBoost: 1.15, hitStopMs: 115 },
  { id: "ult-horizon-break", name: "호라이즌 브레이크", trigger: "phase_final", color: "#f97316", durationSec: 5.2, speedMul: 1.31, flatSpeed: 1.4, staminaDrainMul: 1.08, fatigueIgnore: 0.16, trailBoost: 1.42, hitStopMs: 190 },
  { id: "ult-dragoon-spear", name: "드라군 스피어", trigger: "big_gap", minGapMeters: 20, color: "#06b6d4", durationSec: 5, speedMul: 1.29, flatSpeed: 1.35, staminaDrainMul: 1.02, fatigueIgnore: 0.15, trailBoost: 1.4, hitStopMs: 185 },
  { id: "ult-apex-duel", name: "에이펙스 듀얼", trigger: "duel_top", duelGap: 1.8, color: "#a855f7", durationSec: 4.8, speedMul: 1.3, flatSpeed: 1.28, staminaDrainMul: 1.04, fatigueIgnore: 0.16, trailBoost: 1.41, hitStopMs: 195 },
  { id: "ult-skyline-charge", name: "스카이라인 차지", trigger: "near_finish", remainMeters: 220, color: "#f59e0b", durationSec: 4.3, speedMul: 1.33, flatSpeed: 1.46, staminaDrainMul: 1.1, fatigueIgnore: 0.17, trailBoost: 1.45, hitStopMs: 200 },
  { id: "ult-shockwave-run", name: "쇼크웨이브 런", trigger: "side_by_side", needSec: 6.2, color: "#fb7185", durationSec: 5.4, speedMul: 1.32, flatSpeed: 1.38, staminaDrainMul: 1.06, fatigueIgnore: 0.18, trailBoost: 1.46, hitStopMs: 205 },
  { id: "ult-spiral-gate", name: "스파이럴 게이트", trigger: "cycle_count", needCycles: 4, minProgress: 0.5, color: "#f43f5e", durationSec: 5.3, speedMul: 1.31, flatSpeed: 1.36, staminaDrainMul: 0.99, fatigueIgnore: 0.17, trailBoost: 1.44, hitStopMs: 188 },
  { id: "ult-mind-breaker", name: "마인드 브레이커", trigger: "no_skill_long", needSec: 13, minProgress: 0.38, color: "#94a3b8", durationSec: 5.1, speedMul: 1.28, flatSpeed: 1.3, staminaDrainMul: 0.96, fatigueIgnore: 0.15, trailBoost: 1.38, hitStopMs: 178 },
  { id: "ult-rally-crest", name: "랠리 크레스트", trigger: "recover_hold", needSec: 5.2, color: "#10b981", durationSec: 5.5, speedMul: 1.3, flatSpeed: 1.26, staminaDrainMul: 0.9, staminaRegenPerSec: 0.01, fatigueIgnore: 0.18, trailBoost: 1.4, hitStopMs: 176 },
  { id: "ult-understorm", name: "언더스톰", trigger: "bottom2_final", color: "#ef4444", durationSec: 5.6, speedMul: 1.35, flatSpeed: 1.52, staminaDrainMul: 1.02, fatigueIgnore: 0.2, trailBoost: 1.5, hitStopMs: 220 },
  { id: "ult-vanguard-throne", name: "뱅가드 쓰론", trigger: "first_place_hold", needSec: 5, color: "#fbbf24", durationSec: 4.9, speedMul: 1.27, flatSpeed: 1.18, staminaDrainMul: 0.9, fatigueIgnore: 0.15, trailBoost: 1.34, hitStopMs: 165 },
  { id: "ult-time-stop", name: "크로노 락", trigger: "duel_top", duelGap: 2.1, color: "#60a5fa", durationSec: 4.2, speedMul: 1.26, flatSpeed: 1.25, staminaDrainMul: 1.05, fatigueIgnore: 0.16, trailBoost: 1.42, hitStopMs: 220, specialKind: "time_stop", timeStopSec: 3 },
  { id: "ult-dice-jackpot", name: "잭팟 다이스", trigger: "phase_middle", minProgress: 0.52, color: "#f97316", durationSec: 4.4, speedMul: 1.2, flatSpeed: 0.8, staminaDrainMul: 1.02, fatigueIgnore: 0.1, trailBoost: 1.24, hitStopMs: 145, specialKind: "dice", diceSpeedPerPip: 0.048, diceFlatPerPip: 0.5 },
  { id: "ult-warp-step", name: "워프 스텝", trigger: "near_finish", remainMeters: 280, color: "#a855f7", durationSec: 3.8, speedMul: 1.22, flatSpeed: 1.05, staminaDrainMul: 1.04, fatigueIgnore: 0.14, trailBoost: 1.36, hitStopMs: 180, specialKind: "blink", blinkMeters: 34, blinkTrackRatio: 0.016 },
  { id: "ult-all-in", name: "올인 오버드라이브", trigger: "low_stamina", maxStamina: 0.36, color: "#ef4444", durationSec: 4.9, speedMul: 1.24, flatSpeed: 1.12, staminaDrainMul: 1.08, fatigueIgnore: 0.15, trailBoost: 1.38, hitStopMs: 185, specialKind: "all_in", burstStaminaCost: 0.19 },
  { id: "ult-vacuum-field", name: "베큠 필드", trigger: "packed_run", needSec: 5.2, color: "#14b8a6", durationSec: 5.1, speedMul: 1.2, flatSpeed: 1.05, staminaDrainMul: 0.96, fatigueIgnore: 0.13, trailBoost: 1.33, hitStopMs: 175, specialKind: "drain_field", specialDragAura: 0.13, specialDragRange: 15, specialRegenPerSec: 0.0058 }
];

const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));
const lerp = (a, b, r) => a + (b - a) * r;
const sr = (i, p) => ((i * p) % 997) / 996;

const parseRunnerNames = (raw) =>
  raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

function pickSkillRank(seed) {
  let acc = 0;
  for (const r of SKILL_RANKS) {
    acc += r.weight;
    if (seed <= acc) return r;
  }
  return SKILL_RANKS[SKILL_RANKS.length - 1];
}

function tuneSkillByRank(skill, rankInfo) {
  const e = rankInfo.effectMul;
  skill.triggerChance = clamp(skill.triggerChance * rankInfo.chanceMul, 0.04, 0.45);
  skill.cooldownSec = clamp(skill.cooldownSec * rankInfo.cooldownMul, 3.2, 16);
  skill.durationSec = clamp(skill.durationSec * lerp(0.9, 1.18, (e - 0.9) / 0.32), 0.8, 6.4);

  if (typeof skill.speedMul === "number") {
    if (skill.speedMul >= 1) skill.speedMul = 1 + (skill.speedMul - 1) * e;
    else skill.speedMul = 1 - (1 - skill.speedMul) / e;
  }
  if (typeof skill.flatSpeed === "number") skill.flatSpeed *= e;
  if (typeof skill.finishScale === "number") skill.finishScale *= lerp(0.88, 1.2, (e - 0.9) / 0.32);
  if (typeof skill.maxGapMul === "number") skill.maxGapMul *= lerp(0.9, 1.18, (e - 0.9) / 0.32);
  if (typeof skill.gapPerMeter === "number") skill.gapPerMeter *= lerp(0.9, 1.16, (e - 0.9) / 0.32);
  if (typeof skill.duelScale === "number") skill.duelScale *= lerp(0.88, 1.2, (e - 0.9) / 0.32);
  if (typeof skill.auraDrag === "number") skill.auraDrag *= lerp(0.9, 1.18, (e - 0.9) / 0.32);
  if (typeof skill.staminaRegenPerSec === "number") {
    const regenMul = skill.kind === "recover" ? lerp(0.56, 0.82, (e - 0.9) / 0.32) : lerp(0.9, 1.22, (e - 0.9) / 0.32);
    skill.staminaRegenPerSec *= regenMul;
  }
  if (typeof skill.instantStaminaGain === "number") {
    const instantMul = skill.kind === "recover" ? lerp(0.54, 0.8, (e - 0.9) / 0.32) : lerp(0.88, 1.16, (e - 0.9) / 0.32);
    skill.instantStaminaGain *= instantMul;
  }
}

function getStaminaTier(stamina) {
  if (stamina < 0.2) return 0;
  if (stamina < 0.4) return 1;
  if (stamina < 0.6) return 2;
  if (stamina < 0.8) return 3;
  return 4;
}

function getTrackTimeScale(trackMeters) {
  if (trackMeters <= TRACK_TIME_SCALE_REF) return 1;
  return clamp(Math.pow(trackMeters / TRACK_TIME_SCALE_REF, TRACK_TIME_SCALE_EXP), 1, TRACK_TIME_SCALE_MAX);
}

function markerStepMeters(meterToPixel, trackMeters) {
  const targetPx = 220;
  const minStepByCount = Math.max(1, Math.ceil(trackMeters / 240));
  const required = Math.max(targetPx / Math.max(0.001, meterToPixel), minStepByCount);
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  for (const step of steps) {
    if (step >= required) return step;
  }
  return Math.ceil(required / 500) * 500;
}

function getFinishedVisual(raceElapsed, runner) {
  if (runner.finishedAt === null || runner.finishedAt === undefined) {
    return { visible: true, fade: 1, extraMeters: 0 };
  }
  const t = raceElapsed - runner.finishedAt;
  if (t >= FINISH_EXIT_SECONDS) {
    return { visible: false, fade: 0, extraMeters: FINISH_EXIT_METERS };
  }
  const ratio = clamp(t / FINISH_EXIT_SECONDS, 0, 1);
  const eased = 1 - (1 - ratio) * (1 - ratio);
  return {
    visible: true,
    fade: 1 - ratio,
    extraMeters: FINISH_EXIT_METERS * eased
  };
}

function pushParticles(race, particles) {
  if (!particles.length) return;
  if (!race.particles) race.particles = [];
  race.particles.push(...particles);
  if (race.particles.length > MAX_PARTICLES) {
    race.particles.splice(0, race.particles.length - MAX_PARTICLES);
  }
}

function emitTrailParticles(race, runner, amount = 1, power = 1) {
  const list = [];
  const x = runner.distance * race.meterToPixel;
  for (let i = 0; i < amount; i += 1) {
    const life = 0.26 + Math.random() * 0.34;
    const speedMul = 0.74 + Math.random() * 0.66;
    list.push({
      x: x - (8 + Math.random() * 16),
      y: 6 + (Math.random() - 0.5) * 8,
      laneOffset: runner.laneOffset,
      vx: -(45 + Math.random() * 95) * power * speedMul,
      vy: -18 - Math.random() * 34,
      gravity: 92 + Math.random() * 88,
      drag: 2.4 + Math.random() * 1.8,
      life,
      maxLife: life,
      size: (1.4 + Math.random() * 2.2) * (0.85 + power * 0.22),
      alpha: 0.34 + Math.random() * 0.33,
      glow: 0,
      color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)]
    });
  }
  pushParticles(race, list);
}

function emitBurstParticles(race, runner, color, count = 14, power = 1, accentColor = "#f8fafc") {
  const list = [];
  const x = runner.distance * race.meterToPixel + 4;
  for (let i = 0; i < count; i += 1) {
    const life = 0.34 + Math.random() * 0.46;
    const angle = Math.random() * Math.PI * 2;
    const speed = (72 + Math.random() * 165) * power;
    const useAccent = Math.random() < 0.34;
    list.push({
      x,
      y: (Math.random() - 0.5) * 14,
      laneOffset: runner.laneOffset,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.6 - 34,
      gravity: 54 + Math.random() * 72,
      drag: 1.8 + Math.random() * 1.4,
      life,
      maxLife: life,
      size: 1.8 + Math.random() * 2.6,
      alpha: 0.66 + Math.random() * 0.26,
      glow: 1 + Math.random() * 1.8,
      color: useAccent ? accentColor : color
    });
  }
  const ringCount = Math.max(4, Math.floor(count * 0.16));
  for (let i = 0; i < ringCount; i += 1) {
    const angle = (Math.PI * 2 * i) / ringCount + Math.random() * 0.2;
    const speed = (140 + Math.random() * 90) * power;
    const life = 0.28 + Math.random() * 0.2;
    list.push({
      x,
      y: (Math.random() - 0.5) * 6,
      laneOffset: runner.laneOffset,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.5,
      gravity: 26 + Math.random() * 30,
      drag: 2.8 + Math.random() * 1.4,
      life,
      maxLife: life,
      size: 1.2 + Math.random() * 1.8,
      alpha: 0.5 + Math.random() * 0.2,
      glow: 2.4 + Math.random() * 1.8,
      color: accentColor
    });
  }
  pushParticles(race, list);
}

function emitUltimateActivationParticles(race, runner, color, accentColor = "#f8fafc", power = 1) {
  emitBurstParticles(race, runner, color, Math.round(26 * power), 1.45 * power, accentColor);
  emitBurstParticles(race, runner, accentColor, Math.round(16 * power), 1.22 * power, color);
}

function emitUltimateTrailParticles(race, runner, color, power = 1) {
  const list = [];
  const x = runner.distance * race.meterToPixel;
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i += 1) {
    const life = 0.18 + Math.random() * 0.24;
    list.push({
      x: x - (10 + Math.random() * 18),
      y: (Math.random() - 0.5) * 12,
      laneOffset: runner.laneOffset,
      vx: -(70 + Math.random() * 130) * power,
      vy: -20 - Math.random() * 40,
      gravity: 42 + Math.random() * 52,
      drag: 2.7 + Math.random() * 1.5,
      life,
      maxLife: life,
      size: (1.6 + Math.random() * 2.8) * (0.8 + power * 0.26),
      alpha: 0.48 + Math.random() * 0.34,
      glow: 2.1 + Math.random() * 2.1,
      color
    });
  }
  pushParticles(race, list);
}

function advanceParticles(race, dt) {
  if (!race.particles?.length) return;
  const next = [];
  for (const p of race.particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    const drag = clamp(1 - p.drag * dt, 0.18, 1);
    p.vx *= drag;
    p.vy *= clamp(1 - p.drag * dt * 0.35, 0.42, 1);
    next.push(p);
  }
  race.particles = next;
}

function colorForIndex(index, total) {
  const hue = Math.round((360 / Math.max(total, 1)) * index);
  return `hsl(${hue} 76% 56%)`;
}

function buildSkillPool() {
  const skills = [];
  let idx = 0;
  for (const p of SKILL_PREFIXES) {
    for (const s of SKILL_SUFFIXES) {
      const baseType = SKILL_TYPES[idx % SKILL_TYPES.length];
      const isRecoveryVariant = (idx + 1) % 11 === 0 || (idx + 1) % 17 === 0;
      const type = isRecoveryVariant ? RECOVERY_SKILL_TYPE : baseType;
      const t1 = sr(idx + 1, 37);
      const t2 = sr(idx + 1, 89);
      const t3 = sr(idx + 1, 173);
      const t4 = sr(idx + 1, 307);
      const rankInfo = pickSkillRank(sr(idx + 1, 433));

      const skill = {
        id: `skill-${idx + 1}`,
        name: `${p} ${s}`,
        kind: type.id,
        kindLabel: type.label,
        color: type.color,
        rank: rankInfo.rank,
        rankColor: rankInfo.color,
        staminaCostRate: rankInfo.staminaCost,
        particlePower: rankInfo.particlePower,
        particleCount: rankInfo.particleCount,
        triggerChance: 0.12,
        cooldownSec: 6,
        durationSec: 2
      };

      if (type.id === "burst") {
        Object.assign(skill, {
          triggerChance: lerp(0.12, 0.19, t1),
          cooldownSec: lerp(4.4, 7.2, t2),
          durationSec: lerp(0.9, 1.8, t3),
          speedMul: lerp(1.13, 1.28, t1),
          flatSpeed: lerp(0.5, 1.6, t2)
        });
      }
      if (type.id === "tempo") {
        Object.assign(skill, {
          triggerChance: lerp(0.09, 0.15, t1),
          cooldownSec: lerp(6.4, 11, t2),
          durationSec: lerp(2.5, 4.6, t3),
          speedMul: lerp(1.03, 1.1, t1),
          varianceMul: lerp(0.72, 0.9, t2),
          staminaDrainMul: lerp(0.82, 0.95, t4)
        });
      }
      if (type.id === "late") {
        Object.assign(skill, {
          triggerChance: lerp(0.1, 0.16, t1),
          cooldownSec: lerp(6.2, 10.8, t2),
          durationSec: lerp(1.4, 2.8, t3),
          speedMul: lerp(1.08, 1.22, t1),
          minProgress: lerp(0.52, 0.78, t2),
          finishScale: lerp(0.18, 0.38, t3)
        });
      }
      if (type.id === "chase") {
        Object.assign(skill, {
          triggerChance: lerp(0.1, 0.16, t1),
          cooldownSec: lerp(5.8, 9.5, t2),
          durationSec: lerp(1.5, 2.9, t3),
          speedMul: lerp(1.05, 1.13, t1),
          minGapMeters: lerp(6, 20, t2),
          gapPerMeter: lerp(0.004, 0.009, t3),
          maxGapMul: lerp(0.2, 0.32, t4)
        });
      }
      if (type.id === "gamble") {
        Object.assign(skill, {
          triggerChance: lerp(0.12, 0.18, t1),
          cooldownSec: lerp(4.8, 8.4, t2),
          durationSec: lerp(1, 2, t3),
          minMul: lerp(0.88, 0.99, t1),
          maxMul: lerp(1.2, 1.4, t2),
          flatSpeed: lerp(-0.5, 1.2, t3),
          backfireChance: lerp(0.2, 0.35, t4)
        });
      }
      if (type.id === "draft") {
        Object.assign(skill, {
          triggerChance: lerp(0.12, 0.19, t1),
          cooldownSec: lerp(5.2, 9.2, t2),
          durationSec: lerp(1.4, 2.5, t3),
          speedMul: lerp(1.09, 1.2, t1),
          draftMaxGap: lerp(3, 9, t2)
        });
      }
      if (type.id === "guard") {
        Object.assign(skill, {
          triggerChance: lerp(0.09, 0.15, t1),
          cooldownSec: lerp(7, 12, t2),
          durationSec: lerp(2.2, 4, t3),
          speedMul: lerp(1.02, 1.08, t1),
          staminaDrainMul: lerp(0.6, 0.82, t2),
          staminaRegenPerSec: lerp(0.018, 0.04, t3),
          fatigueIgnore: lerp(0.05, 0.12, t4),
          debuffResist: lerp(0.58, 0.78, t1),
          triggerStaminaMax: lerp(0.62, 0.85, t2)
        });
      }
      if (type.id === "breakaway") {
        Object.assign(skill, {
          triggerChance: lerp(0.08, 0.13, t1),
          cooldownSec: lerp(8.5, 13, t2),
          durationSec: lerp(1.3, 2.4, t3),
          speedMul: lerp(1.1, 1.22, t1),
          flatSpeed: lerp(0.2, 0.9, t2),
          maxGapBehind: lerp(6, 16, t3),
          recoilDuration: lerp(1.2, 2.2, t4),
          recoilMul: lerp(0.9, 0.97, t1),
          recoilFlat: lerp(-0.6, 0.1, t2)
        });
      }
      if (type.id === "pressure") {
        Object.assign(skill, {
          triggerChance: lerp(0.08, 0.14, t1),
          cooldownSec: lerp(7, 11, t2),
          durationSec: lerp(1.4, 2.4, t3),
          speedMul: lerp(1.03, 1.09, t1),
          auraRange: lerp(6, 15, t2),
          auraDrag: lerp(0.03, 0.09, t3)
        });
      }
      if (type.id === "duel") {
        Object.assign(skill, {
          triggerChance: lerp(0.1, 0.17, t1),
          cooldownSec: lerp(5.4, 9.4, t2),
          durationSec: lerp(1.4, 2.6, t3),
          speedMul: lerp(1.05, 1.14, t1),
          duelRange: lerp(4, 10, t2),
          duelScale: lerp(0.08, 0.19, t3)
        });
      }
      if (type.id === "recover") {
        Object.assign(skill, {
          triggerChance: lerp(0.09, 0.16, t1),
          cooldownSec: lerp(6.8, 12.2, t2),
          durationSec: lerp(2.1, 4.2, t3),
          speedMul: lerp(0.98, 1.03, t4),
          staminaDrainMul: lerp(0.76, 0.94, t2),
          staminaRegenPerSec: lerp(0.0055, 0.0175, t3),
          instantStaminaGain: lerp(0.006, 0.022, t1),
          fatigueIgnore: lerp(0.015, 0.05, t4),
          triggerStaminaMax: lerp(0.52, 0.82, t2)
        });
      }

      tuneSkillByRank(skill, rankInfo);

      skills.push(skill);
      idx += 1;
    }
  }
  return skills;
}

function pickUnique(pool, n) {
  const ids = Array.from({ length: pool.length }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, n).map((i) => pool[i]);
}

function limitRecoverSkills(skills, pool, maxRecover = 1) {
  const targetCount = skills.length;
  const next = [];
  const usedIds = new Set();
  let recoverCount = 0;

  for (const s of skills) {
    if (!s || usedIds.has(s.id)) continue;
    if (s.kind === "recover") {
      if (recoverCount >= maxRecover) continue;
      recoverCount += 1;
    }
    next.push(s);
    usedIds.add(s.id);
  }

  if (next.length < targetCount) {
    const shuffled = pickUnique(pool, pool.length);
    for (const s of shuffled) {
      if (usedIds.has(s.id)) continue;
      if (s.kind === "recover" && recoverCount >= maxRecover) continue;
      next.push(s);
      usedIds.add(s.id);
      if (s.kind === "recover") recoverCount += 1;
      if (next.length >= targetCount) break;
    }
  }

  if (next.length < targetCount) {
    const shuffled = pickUnique(pool, pool.length);
    for (const s of shuffled) {
      if (usedIds.has(s.id)) continue;
      next.push(s);
      usedIds.add(s.id);
      if (next.length >= targetCount) break;
    }
  }

  return next.slice(0, targetCount);
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
      runMinSec: 2.1,
      runMaxSec: 3.2,
      recoverMinSec: 1.4,
      recoverMaxSec: 2.3,
      runSpeedMul: 1.46,
      recoverSpeedMul: 0.84,
      runDrainMul: 1.52,
      recoverDrainMul: 0.22,
      recoverRegenPerSec: 0.0057,
      recoverStartStamina: 0.31,
      resumeStamina: 0.71,
      earlyRunBias: 0.84,
      lateRunBias: 1.22
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
      runMinSec: 2.0,
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
      runMinSec: 2.5,
      runMaxSec: 3.8,
      recoverMinSec: 1.4,
      recoverMaxSec: 2.7,
      runSpeedMul: 1.43,
      recoverSpeedMul: 0.86,
      runDrainMul: 1.34,
      recoverDrainMul: 0.2,
      recoverRegenPerSec: 0.0069,
      recoverStartStamina: 0.28,
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
      runMinSec: 1.9,
      runMaxSec: 3.2,
      recoverMinSec: 1.6,
      recoverMaxSec: 2.8,
      runSpeedMul: 1.49,
      recoverSpeedMul: 0.85,
      runDrainMul: 1.52,
      recoverDrainMul: 0.21,
      recoverRegenPerSec: 0.0062,
      recoverStartStamina: 0.27,
      resumeStamina: 0.75,
      earlyRunBias: 0.8,
      lateRunBias: 1.28
    });
  }

  return base;
}

function rollPaceDuration(minSec, maxSec, bias = 0.5) {
  const r = clamp(bias + (Math.random() - 0.5) * 0.38, 0, 1);
  return lerp(minSec, maxSec, r);
}

function createRunners(names, pool, ultimatePool = ULTIMATE_POOL) {
  return names.map((name, i) => {
    const loadout = limitRecoverSkills(pickUnique(pool, 4), pool, 1);
    const trait = RUNNER_TRAITS[Math.floor(Math.random() * RUNNER_TRAITS.length)];
    const paceProfile = createPaceProfile(trait.id);
    const initialRunSec = rollPaceDuration(paceProfile.runMinSec, paceProfile.runMaxSec, 0.62);
    const ultimate = { ...ultimatePool[Math.floor(Math.random() * ultimatePool.length)] };
    return {
      id: `${name}-${i}-${Date.now()}`,
      name,
      color: colorForIndex(i, names.length),
      distance: 0,
      speed: 0,
      baseSpeed: 15.2 + Math.random() * 3.3,
      paceSeed: Math.random() * Math.PI * 2,
      laneOffset: (Math.random() - 0.5) * 120,
      finalKickStart: 0.7 + Math.random() * 0.16,
      finalKickPower: 0.32 + Math.random() * 0.42,
      stamina: 0.74 + Math.random() * 0.2,
      staminaRegenBase: 0.0012 + Math.random() * 0.0015,
      traitId: trait.id,
      traitLabel: trait.label,
      traitColor: trait.color,
      traitSeed: Math.random(),
      paceProfile,
      paceMode: "run",
      paceModeUntil: initialRunSec,
      paceCycle: 0,
      ultimate,
      ultimateUsed: false,
      ultimateActiveUntil: 0,
      nextUltimateCheckAt: 1 + Math.random() * 0.8,
      sideBySideSec: 0,
      packedRunSec: 0,
      firstPlaceSec: 0,
      lastPlaceSec: 0,
      recoverModeSec: 0,
      surgeHoldSec: 0,
      lastSkillCastAt: 0,
      lastSeenUltimateAt: -999,
      skills: loadout,
      cooldownUntil: Object.fromEntries(loadout.map((s) => [s.id, 0])),
      nextSkillCheckAt: 0.7 + Math.random() * 0.45,
      nextComebackCheckAt: 1 + Math.random() * 0.7,
      comebackActiveUntil: 0,
      comebackCooldownUntil: 0,
      activeEffects: [],
      lastSkillName: "",
      lastSkillUntil: 0,
      finishedAt: null
    };
  });
}

function prepareRunnersForRace(baseRunners) {
  return baseRunners.map((r, i) => {
    const skills = r.skills.map((s) => ({ ...s }));
    const paceProfile = { ...(r.paceProfile ?? createPaceProfile(r.traitId)) };
    return {
      ...r,
      id: `${r.name}-${i}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      distance: 0,
      speed: 0,
      skills,
      cooldownUntil: Object.fromEntries(skills.map((s) => [s.id, 0])),
      nextSkillCheckAt: 0.7 + Math.random() * 0.45,
      nextComebackCheckAt: 1 + Math.random() * 0.7,
      comebackActiveUntil: 0,
      comebackCooldownUntil: 0,
      activeEffects: [],
      lastSkillName: "",
      lastSkillUntil: 0,
      finishedAt: null,
      paceProfile,
      paceMode: "run",
      paceModeUntil: rollPaceDuration(paceProfile.runMinSec, paceProfile.runMaxSec, 0.62),
      paceCycle: 0,
      ultimate: { ...(r.ultimate ?? ULTIMATE_POOL[0]) },
      ultimateUsed: false,
      ultimateActiveUntil: 0,
      nextUltimateCheckAt: 1 + Math.random() * 0.8,
      sideBySideSec: 0,
      packedRunSec: 0,
      firstPlaceSec: 0,
      lastPlaceSec: 0,
      recoverModeSec: 0,
      surgeHoldSec: 0,
      lastSkillCastAt: 0,
      lastSeenUltimateAt: -999
    };
  });
}

function phaseByProgress(progress) {
  if (progress < 0.22) return { key: "opening", label: "초반 탐색전", msg: "초반 탐색전 시작!" };
  if (progress < 0.58) return { key: "middle", label: "중반 포지션 싸움", msg: "중반 포지션 경쟁!" };
  if (progress < 0.86) return { key: "final", label: "종반 스퍼트", msg: "종반 스퍼트 돌입!" };
  return { key: "climax", label: "결승 직선 난전", msg: "결승 직선, 난전 시작!" };
}

function ultimateDifficulty(ult) {
  let base = 1.3;
  switch (ult?.trigger) {
    case "phase_middle":
    case "top3_middle":
      base = 1;
      break;
    case "phase_final":
    case "lead_late":
      base = 1.1;
      break;
    case "near_finish":
    case "high_stamina_opening":
      base = 1.2;
      break;
    case "first_place_hold":
      base = 1.25;
      break;
    case "side_by_side":
    case "packed_run":
      base = 1.3;
      break;
    case "surge_hold":
    case "recover_hold":
      base = 1.35;
      break;
    case "chain_react":
      base = 1.4;
      break;
    case "no_skill_long":
      base = 1.45;
      break;
    case "cycle_count":
      base = 1.55;
      break;
    case "comeback_active":
      base = 1.6;
      break;
    case "big_gap":
      base = 1.7;
      break;
    case "duel_top":
      base = 1.75;
      break;
    case "last_place_hold":
    case "low_stamina":
      base = 1.8;
      break;
    case "bottom2_final":
      base = 1.85;
      break;
    default:
      base = 1.3;
      break;
  }
  if (ult?.specialKind === "time_stop") base += 0.18;
  if (ult?.specialKind === "dice") base += 0.05;
  if (ult?.specialKind === "blink") base += 0.1;
  if (ult?.specialKind === "all_in") base += 0.12;
  if (ult?.specialKind === "drain_field") base += 0.1;
  return clamp(base, 1, 2.1);
}

function buildContexts(sorted, trackMeters) {
  const m = new Map();
  sorted.forEach((r, i) => {
    const ahead = i > 0 ? sorted[i - 1] : null;
    const behind = i < sorted.length - 1 ? sorted[i + 1] : null;
    m.set(r.id, {
      rank: i + 1,
      gapLeader: sorted[0] ? sorted[0].distance - r.distance : 0,
      gapAhead: ahead ? ahead.distance - r.distance : Infinity,
      gapBehind: behind ? r.distance - behind.distance : Infinity,
      closeGap: Math.min(ahead ? ahead.distance - r.distance : Infinity, behind ? r.distance - behind.distance : Infinity),
      progress: r.distance / trackMeters
    });
  });
  return m;
}

function sortRunnersByRaceState(runners) {
  return [...runners].sort((a, b) => {
    const aFinished = a.finishedAt !== null && a.finishedAt !== undefined;
    const bFinished = b.finishedAt !== null && b.finishedAt !== undefined;

    if (aFinished && bFinished) return a.finishedAt - b.finishedAt;
    if (aFinished) return -1;
    if (bFinished) return 1;
    return b.distance - a.distance;
  });
}

function buildHud(race) {
  const sorted = sortRunnersByRaceState(race.runners);
  const leader = sorted[0];
  const unfinishedLeader = sorted.find((r) => r.finishedAt === null || r.finishedAt === undefined);
  const progressLeader = unfinishedLeader ?? leader;
  const surge = sorted.find((r) => r.id === race.surgeId);
  return {
    leaderName: leader ? leader.name : "-",
    surgeName: surge ? surge.name : "-",
    remainingMeters: progressLeader ? Math.max(0, race.trackMeters - progressLeader.distance) : race.trackMeters,
    note: race.noteUntil > race.elapsed ? race.note : "",
    noteColor: race.noteColor,
    phaseLabel: race.phaseLabel,
    intensity: race.intensity,
    top3: sorted.slice(0, 3).map((r, i) => ({ id: r.id, rank: i + 1, name: r.name, color: r.color, distance: r.distance }))
  };
}

function buildCards(race) {
  return sortRunnersByRaceState(race.runners)
    .map((r, i) => {
      const active = r.activeEffects.filter((e) => e.startsAt <= race.elapsed && e.expiresAt > race.elapsed);
      const comebackActive = r.comebackActiveUntil > race.elapsed;
      const activeSkillText = active.length ? active.slice(0, 2).map((e) => e.name).join(", ") : "";
      return {
        id: r.id,
        rank: i + 1,
        name: r.name,
        color: r.color,
        traitLabel: r.traitLabel,
        traitColor: r.traitColor,
        distance: r.distance,
        speed: r.speed,
        stamina: r.stamina,
        staminaTier: getStaminaTier(r.stamina),
        finished: r.finishedAt !== null && r.finishedAt !== undefined,
        paceMode: r.paceMode === "recover" ? "회복 페이스" : "질주 페이스",
        ultimateName: r.ultimate?.name ?? "-",
        ultimateColor: r.ultimate?.color ?? "#64748b",
        ultimateState: r.ultimateUsed ? (r.ultimateActiveUntil > race.elapsed ? "발동 중" : "사용 완료") : "대기",
        activeSkill: comebackActive
          ? activeSkillText
            ? `역전 가속, ${activeSkillText}`
            : "역전 가속"
          : activeSkillText,
        skills: r.skills.map((s) => ({
          id: s.id,
          name: s.name,
          kindLabel: s.kindLabel,
          color: s.color,
          rank: s.rank,
          rankColor: s.rankColor,
          staminaCostRate: s.staminaCostRate
        }))
      };
    });
}

export default function App() {
  const [nameInput, setNameInput] = useState("토끼, 거북이, 치타, 늑대");
  const [trackInput, setTrackInput] = useState("1200");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [winner, setWinner] = useState("");
  const [viewMode, setViewMode] = useState("setup");
  const [deployedRunners, setDeployedRunners] = useState([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [hud, setHud] = useState({
    leaderName: "-",
    surgeName: "-",
    remainingMeters: 0,
    note: "",
    noteColor: "#1d4ed8",
    phaseLabel: "-",
    intensity: 0,
    top3: []
  });
  const [runnerCards, setRunnerCards] = useState([]);
  const [finalResults, setFinalResults] = useState([]);
  const [raceLogs, setRaceLogs] = useState([]);

  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const canvasElementRef = useRef(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const skillPool = useMemo(() => buildSkillPool(), []);

  const raceRef = useRef({
    running: false,
    trackMeters: 1200,
    trackPixels: 1200 * BASE_PX_PER_METER,
    meterToPixel: BASE_PX_PER_METER,
    timeScale: 1,
    elapsed: 0,
    prevTimestamp: 0,
    cameraX: 0,
    cameraZoom: 1,
    cameraShake: 0,
    intensity: 0,
    feelBoost: 1,
    flowOffset: 0,
    phaseKey: "opening",
    phaseLabel: "초반 탐색전",
    leaderId: "",
    surgeId: "",
    note: "",
    noteColor: "#1d4ed8",
    noteUntil: 0,
    nextNoteAllowed: 0,
    hitStopUntilTs: 0,
    ultimatePulseUntil: 0,
    ultimateFocusId: "",
    ultimateFlashColor: "#f8fafc",
    lastUltimateAt: -999,
    lastUltimateCasterId: "",
    lastScreenFxTs: -99999,
    timeStopUntil: 0,
    timeStopRunnerId: "",
    timeStopColor: "#60a5fa",
    runners: [],
    particles: [],
    prevRanks: new Map(),
    lastHudSyncAt: 0
  });

  const appendRaceLog = (text, color = "#1e293b") => {
    const sec = raceRef.current?.elapsed ?? 0;
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(Math.floor(sec % 60)).padStart(2, "0");
    const next = { id: `${Date.now()}-${Math.floor(Math.random() * 9999)}`, text, color, time: `${mm}:${ss}` };
    setRaceLogs((prev) => [...prev, next].slice(-90));
  };

  const announce = (race, text, color, lock = 0.6, dur = 1.45) => {
    race.note = text;
    race.noteColor = color;
    race.noteUntil = race.elapsed + dur;
    race.nextNoteAllowed = race.elapsed + lock;
  };

  const syncUi = (race, now, force = false) => {
    if (!force && now - race.lastHudSyncAt < HUD_SYNC_MS) return;
    race.lastHudSyncAt = now;
    setHud(buildHud(race));
    setRunnerCards(buildCards(race));
  };

  const canUseSkill = (skill, runner, c) => {
    if (skill.kind !== "recover" && runner.stamina <= Math.min(0.26, (skill.staminaCostRate ?? 0.08) + 0.02)) return false;
    if (skill.kind === "recover" && runner.stamina > skill.triggerStaminaMax) return false;
    if (skill.kind === "late" && c.progress < skill.minProgress) return false;
    if (skill.kind === "chase" && c.gapLeader < skill.minGapMeters) return false;
    if (skill.kind === "draft" && (c.gapAhead === Infinity || c.gapAhead < 0.5 || c.gapAhead > skill.draftMaxGap)) return false;
    if (skill.kind === "guard" && runner.stamina > skill.triggerStaminaMax && c.rank > 3) return false;
    if (skill.kind === "breakaway" && (c.rank !== 1 || c.gapBehind > skill.maxGapBehind)) return false;
    if (skill.kind === "pressure" && (c.rank > 3 || c.gapBehind === Infinity || c.gapBehind > skill.auraRange)) return false;
    if (skill.kind === "duel" && c.closeGap > skill.duelRange) return false;
    return true;
  };

  const weightedSkill = (list, c, race, runner) => {
    const weighted = list.map((s) => {
      let w = 1;
      if (s.kind === "late") w += clamp((c.progress - 0.55) * 2.6, 0, 1.2);
      if (s.kind === "chase") w += clamp(c.gapLeader / 20, 0, 1.2);
      if (s.kind === "duel" && c.closeGap < 6) w += 1.1;
      if (s.kind === "pressure" && c.rank <= 2) w += 0.6;
      if (s.kind === "breakaway" && (race.phaseKey === "final" || race.phaseKey === "climax")) w += 0.8;
      if (s.kind === "gamble" && race.phaseKey === "climax") w += 0.9;
      if (s.kind === "recover") w += clamp(((s.triggerStaminaMax ?? 0.72) - runner.stamina) * 7, 0, 1.9);
      if (s.rank === "S") w += 0.18;
      if (s.rank === "A") w += 0.1;
      return { s, w };
    });
    const sum = weighted.reduce((a, i) => a + i.w, 0);
    let p = Math.random() * sum;
    for (const i of weighted) {
      p -= i.w;
      if (p <= 0) return i.s;
    }
    return weighted[weighted.length - 1].s;
  };

  const trySkill = (race, runner, c) => {
    if (runner.activeEffects.length >= MAX_ACTIVE_EFFECTS) return;
    const avail = runner.skills.filter((s) => race.elapsed >= runner.cooldownUntil[s.id] && canUseSkill(s, runner, c));
    if (!avail.length) return;

    const skill = weightedSkill(avail, c, race, runner);
    let traitSkillChanceMul = 1;
    if (runner.traitId === "tactician") traitSkillChanceMul = 1.24;
    if (runner.traitId === "risk_taker") traitSkillChanceMul = 1.12;
    if (runner.traitId === "endurance") traitSkillChanceMul = 0.85;
    if (runner.traitId === "steady") traitSkillChanceMul = 0.96;
    if (Math.random() >= skill.triggerChance * (0.92 + race.intensity * 0.22) * traitSkillChanceMul) return;

    let skillCostMul = 1;
    if (runner.traitId === "endurance") skillCostMul *= 0.88;
    if (runner.traitId === "tactician") skillCostMul *= 0.93;
    if (runner.traitId === "risk_taker") skillCostMul *= 1.08;
    const baseSkillCost = skill.staminaCostRate ?? 0.08;
    const skillCost = clamp(baseSkillCost * skillCostMul * (skill.kind === "recover" ? 0.5 : 1), 0.02, 0.2);
    if (skill.kind !== "recover" && runner.stamina <= skillCost + 0.01) return;
    runner.stamina = clamp(runner.stamina - skillCost, 0.04, 1);
    if (skill.kind === "recover") {
      runner.stamina = clamp(runner.stamina + (skill.instantStaminaGain ?? 0), 0.04, 1);
    }

    let color = skill.color;
    const effect = {
      id: `${skill.id}-${race.elapsed.toFixed(3)}-${Math.floor(Math.random() * 9999)}`,
      name: `[${skill.rank}] ${skill.name}`,
      startsAt: race.elapsed,
      expiresAt: race.elapsed + skill.durationSec,
      noStaminaCost: false,
      speedMul: 1,
      flatSpeed: 0,
      varianceMul: 1,
      staminaDrainMul: 1,
      staminaRegenPerSec: 0,
      fatigueIgnore: 0,
      debuffResist: 1,
      dragAura: 0,
      dragRange: 0,
      dynamicDraft: false,
      draftMaxGap: 0,
      duelRange: 0,
      duelScale: 0,
      color: skill.color
    };

    if (skill.kind === "burst") {
      effect.speedMul = skill.speedMul;
      effect.flatSpeed = skill.flatSpeed;
    }
    if (skill.kind === "tempo") {
      effect.speedMul = skill.speedMul;
      effect.varianceMul = skill.varianceMul;
      effect.staminaDrainMul = skill.staminaDrainMul;
    }
    if (skill.kind === "late") {
      effect.speedMul = skill.speedMul + Math.max(0, c.progress - skill.minProgress) * skill.finishScale;
      effect.staminaDrainMul = 1.03;
    }
    if (skill.kind === "chase") {
      effect.speedMul = skill.speedMul + Math.min(skill.maxGapMul, c.gapLeader * skill.gapPerMeter);
    }
    if (skill.kind === "gamble") {
      if (Math.random() < skill.backfireChance) {
        effect.speedMul = lerp(0.82, 0.98, Math.random());
        effect.flatSpeed = -Math.abs(skill.flatSpeed * lerp(0.2, 0.9, Math.random()));
        effect.varianceMul = 1.12;
        color = "#ef4444";
      } else {
        effect.speedMul = lerp(skill.minMul, skill.maxMul, Math.random());
        effect.flatSpeed = skill.flatSpeed;
      }
    }
    if (skill.kind === "draft") {
      effect.dynamicDraft = true;
      effect.draftMaxGap = skill.draftMaxGap;
      effect.speedMul = skill.speedMul;
      effect.staminaDrainMul = 0.86;
    }
    if (skill.kind === "guard") {
      effect.speedMul = skill.speedMul;
      effect.staminaDrainMul = skill.staminaDrainMul;
      effect.staminaRegenPerSec = skill.staminaRegenPerSec;
      effect.fatigueIgnore = skill.fatigueIgnore;
      effect.debuffResist = skill.debuffResist;
    }
    if (skill.kind === "recover") {
      effect.speedMul = skill.speedMul;
      effect.staminaDrainMul = skill.staminaDrainMul;
      effect.staminaRegenPerSec = skill.staminaRegenPerSec;
      effect.fatigueIgnore = skill.fatigueIgnore;
    }
    if (skill.kind === "breakaway") {
      effect.speedMul = skill.speedMul;
      effect.flatSpeed = skill.flatSpeed;
      effect.staminaDrainMul = 1.26;
      runner.activeEffects.push({
        id: `${skill.id}-recoil-${race.elapsed.toFixed(3)}`,
        name: `${skill.name} 후딜`,
        startsAt: effect.expiresAt,
        expiresAt: effect.expiresAt + skill.recoilDuration,
        noStaminaCost: false,
        speedMul: skill.recoilMul,
        flatSpeed: skill.recoilFlat,
        varianceMul: 1,
        staminaDrainMul: 1.05,
        staminaRegenPerSec: 0,
        fatigueIgnore: -0.02,
        debuffResist: 1,
        dragAura: 0,
        dragRange: 0,
        dynamicDraft: false,
        draftMaxGap: 0,
        duelRange: 0,
        duelScale: 0,
        color: "#64748b"
      });
    }
    if (skill.kind === "pressure") {
      effect.speedMul = skill.speedMul;
      effect.dragAura = skill.auraDrag;
      effect.dragRange = skill.auraRange;
    }
    if (skill.kind === "duel") {
      effect.speedMul = skill.speedMul;
      effect.duelRange = skill.duelRange;
      effect.duelScale = skill.duelScale;
    }

    runner.cooldownUntil[skill.id] = race.elapsed + skill.cooldownSec;
    runner.activeEffects.push(effect);
    runner.lastSkillName = `[${skill.rank}] ${skill.name}`;
    runner.lastSkillUntil = race.elapsed + Math.min(2.2, skill.durationSec + 0.25);
    runner.lastSkillCastAt = race.elapsed;
    const particleCount = Math.round((12 + Math.floor(Math.random() * 7)) * (skill.particleCount ?? 1));
    const particlePower = (0.9 + race.intensity * 0.52) * (skill.particlePower ?? 1);
    emitBurstParticles(race, runner, color, particleCount, particlePower, skill.rankColor);
    emitBurstParticles(race, runner, "#f8fafc", Math.max(5, Math.floor(particleCount * 0.34)), particlePower * 0.75, skill.rankColor);
    appendRaceLog(
      `${runner.name} 스킬 [${skill.rank}] ${skill.kindLabel} ${skill.name} 발동 (스태미나 -${Math.round(skillCost * 100)}%)`,
      color
    );

    if (race.elapsed >= race.nextNoteAllowed && (c.rank <= 3 || skill.kind === "duel" || skill.kind === "gamble")) {
      announce(
        race,
        `${runner.name} - [${skill.rank}] ${skill.kindLabel} ${skill.name} (-${Math.round(skillCost * 100)}%)`,
        color,
        0.55,
        1.35
      );
    }
  };

  const tryUltimate = (race, runner, c, ts, fieldSize) => {
    if (!runner.ultimate || runner.ultimateUsed) return;
    if (race.elapsed < runner.nextUltimateCheckAt) return;
    runner.nextUltimateCheckAt += 0.22;

    const ult = runner.ultimate;
    let ready = false;

    if (ult.trigger === "side_by_side") ready = runner.sideBySideSec >= (ult.needSec ?? 5);
    if (ult.trigger === "chain_react") {
      const hasNewUltimate = race.lastUltimateAt > (runner.lastSeenUltimateAt ?? -999);
      if (hasNewUltimate) runner.lastSeenUltimateAt = race.lastUltimateAt;
      ready = hasNewUltimate && race.lastUltimateCasterId !== runner.id && race.elapsed - race.lastUltimateAt <= (ult.reactWindowSec ?? 2);
    }
    if (ult.trigger === "last_place_hold") ready = runner.lastPlaceSec >= (ult.needSec ?? 5);
    if (ult.trigger === "phase_middle") ready = race.phaseKey === "middle" && c.progress >= (ult.minProgress ?? 0.5);
    if (ult.trigger === "phase_final") ready = race.phaseKey === "final" || race.phaseKey === "climax";
    if (ult.trigger === "first_place_hold") ready = c.rank === 1 && runner.firstPlaceSec >= (ult.needSec ?? 4);
    if (ult.trigger === "big_gap") ready = c.rank > 1 && c.gapLeader >= (ult.minGapMeters ?? 16);
    if (ult.trigger === "low_stamina") ready = runner.stamina <= (ult.maxStamina ?? 0.24);
    if (ult.trigger === "high_stamina_opening") ready = runner.stamina >= (ult.minStamina ?? 0.86) && c.progress <= (ult.maxProgress ?? 0.3);
    if (ult.trigger === "comeback_active") ready = runner.comebackActiveUntil > race.elapsed;
    if (ult.trigger === "duel_top")
      ready = c.rank <= 2 && (race.phaseKey === "final" || race.phaseKey === "climax") && c.closeGap <= (ult.duelGap ?? 2.4);
    if (ult.trigger === "near_finish") ready = race.trackMeters - runner.distance <= (ult.remainMeters ?? 170);
    if (ult.trigger === "packed_run") ready = runner.packedRunSec >= (ult.needSec ?? 4);
    if (ult.trigger === "recover_hold") ready = runner.recoverModeSec >= (ult.needSec ?? 4);
    if (ult.trigger === "cycle_count") ready = (runner.paceCycle ?? 0) >= (ult.needCycles ?? 3) && c.progress >= (ult.minProgress ?? 0.42);
    if (ult.trigger === "top3_middle") ready = race.phaseKey === "middle" && c.rank <= 3 && c.progress >= 0.42;
    if (ult.trigger === "bottom2_final")
      ready = (race.phaseKey === "final" || race.phaseKey === "climax") && c.rank >= Math.max(2, fieldSize - 1);
    if (ult.trigger === "surge_hold") ready = runner.surgeHoldSec >= (ult.needSec ?? 2.2);
    if (ult.trigger === "no_skill_long")
      ready = race.elapsed - (runner.lastSkillCastAt ?? 0) >= (ult.needSec ?? 11) && c.progress >= (ult.minProgress ?? 0.34);
    if (ult.trigger === "lead_late") ready = c.rank === 1 && c.progress >= (ult.minProgress ?? 0.78);

    let randomFallback = false;
    if (!ready && c.progress >= 0.58) {
      const progressFactor = clamp((c.progress - 0.58) / 0.42, 0, 1);
      const rankFactor = fieldSize > 1 ? clamp((c.rank - 1) / (fieldSize - 1), 0, 1) : 0;
      const fallbackChance = clamp(0.04 + progressFactor * 0.22 + rankFactor * 0.08 + race.intensity * 0.06, 0.04, 0.42);
      if (c.progress >= 0.96 || Math.random() < fallbackChance) {
        ready = true;
        randomFallback = true;
      }
    }

    if (!ready) return;

    const difficulty = ultimateDifficulty(ult);
    const rankPressure = fieldSize > 1 ? clamp((c.rank - 1) / (fieldSize - 1), 0, 1) : 0;
    const underdogBoost = 1 + rankPressure * 0.18;
    const triggerBaseBoost = clamp(0.92 + difficulty * 0.33, 1.1, 1.85);
    let ultPower = clamp(triggerBaseBoost * (1 + race.intensity * 0.18) * underdogBoost, 1.08, 2.18);
    const durationMul = clamp(0.88 + difficulty * 0.14, 0.98, 1.2);
    let boostedDuration = clamp((ult.durationSec ?? 4.2) * durationMul * (1.06 + race.intensity * 0.07), 3.4, 7.8);
    let boostedSpeedMul = 1 + ((ult.speedMul ?? 1.2) - 1) * ultPower;
    let boostedFlatSpeed = (ult.flatSpeed ?? 1) * clamp(0.85 + ultPower * 0.52, 1, 2.05);
    let boostedTrail = (ult.trailBoost ?? 1.2) * (1.16 + race.intensity * 0.13) * (0.88 + difficulty * 0.22);
    let boostedFatigueIgnore = (ult.fatigueIgnore ?? 0.1) * (1.1 + race.intensity * 0.08 + rankPressure * 0.12) * (0.92 + difficulty * 0.2);
    let specialLogText = "";
    let specialAnnounceText = "";
    let specialDragAura = 0;
    let specialDragRange = 0;
    let specialRegenPerSec = 0;
    const msSinceFx = ts - (race.lastScreenFxTs ?? -99999);
    const isRapidFx = msSinceFx < 420;
    const fxDamp = isRapidFx ? clamp(msSinceFx / 420, 0.44, 0.9) : 1;
    const hitStopDifficultyMul = difficulty <= 1.15 ? 0.82 : difficulty >= 1.65 ? 1.08 : 1;
    const boostedHitStopMs = Math.round(((ult.hitStopMs ?? 120) + 52 + race.intensity * 30) * hitStopDifficultyMul * (isRapidFx ? 0.46 : 1));

    if (ult.specialKind === "dice") {
      const dice = 1 + Math.floor(Math.random() * 6);
      boostedSpeedMul *= 1 + dice * (ult.diceSpeedPerPip ?? 0.045);
      boostedFlatSpeed += dice * (ult.diceFlatPerPip ?? 0.45);
      specialLogText = ` / 주사위 ${dice}`;
      specialAnnounceText = `주사위 ${dice}!`;
    }
    if (ult.specialKind === "all_in") {
      const burstCost = clamp(ult.burstStaminaCost ?? 0.18, 0.08, 0.35);
      runner.stamina = clamp(runner.stamina - burstCost, 0.04, 1);
      ultPower *= 1.1;
      boostedSpeedMul *= 1.12;
      boostedFlatSpeed += 0.9 + burstCost * 4.2;
      boostedFatigueIgnore += 0.06;
      specialLogText = ` / 올인 -${Math.round(burstCost * 100)}%`;
      specialAnnounceText = "올인 폭주!";
    }
    if (ult.specialKind === "blink") {
      const blinkMeters = clamp((ult.blinkMeters ?? 28) + race.trackMeters * (ult.blinkTrackRatio ?? 0), 10, Math.max(12, race.trackMeters * 0.12));
      const before = runner.distance;
      runner.distance = Math.min(race.trackMeters, runner.distance + blinkMeters);
      const moved = Math.max(0, runner.distance - before);
      if ((runner.finishedAt === null || runner.finishedAt === undefined) && runner.distance >= race.trackMeters) {
        runner.finishedAt = race.elapsed;
      }
      emitBurstParticles(race, runner, ult.color ?? "#a855f7", 26, 1.34);
      specialLogText = ` / 순간도약 +${moved.toFixed(1)}m`;
      specialAnnounceText = "순간도약!";
    }
    if (ult.specialKind === "drain_field") {
      specialDragAura = clamp(ult.specialDragAura ?? 0.1, 0.05, 0.2);
      specialDragRange = clamp(ult.specialDragRange ?? 12, 6, 22);
      specialRegenPerSec = clamp(ult.specialRegenPerSec ?? 0.004, 0.001, 0.012);
      boostedDuration = clamp(boostedDuration * 1.08, 3.6, 8.2);
      specialLogText = " / 흡수장 전개";
      specialAnnounceText = "흡수장 전개!";
    }

    runner.ultimateUsed = true;
    runner.ultimateActiveUntil = race.elapsed + boostedDuration;
    race.lastUltimateAt = race.elapsed;
    race.lastUltimateCasterId = runner.id;
    const pulseDuration = Math.min(2.2, 1.2 + boostedDuration * 0.18) * (isRapidFx ? 0.62 : 1);
    race.ultimatePulseUntil = Math.max(race.ultimatePulseUntil, race.elapsed + pulseDuration);
    race.ultimateFocusId = runner.id;
    if (!isRapidFx || msSinceFx > 180) race.ultimateFlashColor = ult.color;
    race.hitStopUntilTs = Math.max(race.hitStopUntilTs ?? 0, ts + boostedHitStopMs);
    race.lastScreenFxTs = ts;
    if (ult.specialKind === "time_stop") {
      const stopSec = clamp(ult.timeStopSec ?? 3, 1.2, 3.4);
      race.timeStopUntil = Math.max(race.timeStopUntil ?? 0, race.elapsed + stopSec);
      race.timeStopRunnerId = runner.id;
      race.timeStopColor = ult.color ?? "#60a5fa";
      specialLogText = ` / 타임스탑 ${stopSec.toFixed(1)}s`;
      specialAnnounceText = `타임스탑 ${stopSec.toFixed(1)}s`;
    }

    runner.activeEffects.push({
      id: `${ult.id}-${race.elapsed.toFixed(3)}`,
      name: `궁극기 ${ult.name}`,
      startsAt: race.elapsed,
      expiresAt: race.elapsed + boostedDuration,
      noStaminaCost: false,
      speedMul: boostedSpeedMul,
      flatSpeed: boostedFlatSpeed,
      varianceMul: 1,
      staminaDrainMul: (ult.staminaDrainMul ?? 1) * lerp(1, 1.12, clamp((ultPower - 1.45) / 0.7, 0, 1)),
      staminaRegenPerSec: (ult.staminaRegenPerSec ?? 0) + specialRegenPerSec,
      fatigueIgnore: boostedFatigueIgnore,
      debuffResist: 0.74,
      dragAura: specialDragAura,
      dragRange: specialDragRange,
      dynamicDraft: false,
      draftMaxGap: 0,
      duelRange: 0,
      duelScale: 0,
      color: ult.color,
      trailBoost: boostedTrail,
      isUltimate: true
    });
    runner.lastSkillName = `궁극기 ${ult.name}`;
    runner.lastSkillUntil = race.elapsed + Math.min(3.3, boostedDuration);
    runner.lastSkillCastAt = race.elapsed;

    const difficultyFx = clamp(0.84 + difficulty * 0.22, 0.95, 1.34);
    emitUltimateActivationParticles(race, runner, ult.color, "#f8fafc", (1.34 + race.intensity * 0.72) * fxDamp * difficultyFx);
    const fallbackTag = randomFallback ? " / 중반 랜덤 발동" : "";
    appendRaceLog(
      `${runner.name} 궁극기 ${ult.name} 발동 (x${boostedSpeedMul.toFixed(2)}, +${boostedFlatSpeed.toFixed(1)}m/s, 난도 ${difficulty.toFixed(2)})${specialLogText}${fallbackTag}`,
      ult.color
    );
    const ultNote = specialAnnounceText || (randomFallback ? "랜덤 궁극기" : ultPower >= 1.9 ? "역전 궁극기" : "궁극기 발동");
    announce(race, `${ultNote}! ${runner.name} - ${ult.name}`, ult.color, 0.95, 1.8);
  };

  const tryComebackBoost = (race, runner, c) => {
    if (race.elapsed < runner.comebackCooldownUntil) return;
    if (race.elapsed < runner.comebackActiveUntil) return;

    const fieldSize = race.runners.length;
    if (fieldSize < 3) return;

    const isLast = c.rank === fieldSize;
    const isNearLast = c.rank === fieldSize - 1;
    if (!isLast && !(isNearLast && race.phaseKey !== "opening")) return;

    const minGap = Math.max(12, race.trackMeters * 0.012);
    if (c.gapLeader < minGap) return;

    const gapFactor = clamp(c.gapLeader / Math.max(22, race.trackMeters * 0.04), 0, 1.35);
    const phaseFactor = race.phaseKey === "climax" ? 1.4 : race.phaseKey === "final" ? 1.2 : 0.8;
    const chance = clamp(0.07 + (isLast ? 0.12 : 0.06) + gapFactor * 0.16 + phaseFactor * 0.06, 0.08, 0.48);

    if (Math.random() >= chance) return;

    const duration = 2.6 + Math.random() * 1.8;
    runner.comebackActiveUntil = race.elapsed + duration;
    runner.comebackCooldownUntil = race.elapsed + 8.5 + Math.random() * 5;
    emitBurstParticles(race, runner, "#fb7185", 18, 1.15);

    if (race.elapsed >= race.nextNoteAllowed) {
      announce(race, `${runner.name} 대역전 가속!`, "#fb7185", 0.8, 1.4);
    }
  };

  const updateRace = (ts) => {
    const race = raceRef.current;
    if (!race.running) {
      if (!race.prevTimestamp) race.prevTimestamp = ts;
      const idleDt = clamp((ts - race.prevTimestamp) / 1000, 0.001, 0.05);
      race.prevTimestamp = ts;
      advanceParticles(race, idleDt);
      return syncUi(race, ts, false);
    }
    if (!race.prevTimestamp) {
      race.prevTimestamp = ts;
      return syncUi(race, ts, true);
    }
    if ((race.hitStopUntilTs ?? 0) > ts) {
      race.prevTimestamp = ts;
      return syncUi(race, ts, false);
    }

    const frameDt = clamp((ts - race.prevTimestamp) / 1000, 0.001, 0.05);
    const dt = clamp(frameDt * race.timeScale, 0.001, 0.09);
    race.prevTimestamp = ts;
    race.elapsed += dt;
    if ((race.timeStopUntil ?? 0) <= race.elapsed) {
      race.timeStopUntil = 0;
      race.timeStopRunnerId = "";
    }
    const timeStopActive = (race.timeStopUntil ?? 0) > race.elapsed && !!race.timeStopRunnerId;
    advanceParticles(race, dt);

    const pre = [...race.runners].sort((a, b) => b.distance - a.distance);
    if (!pre.length) {
      race.running = false;
      setIsRunning(false);
      return syncUi(race, ts, true);
    }

    const phase = phaseByProgress(pre[0].distance / race.trackMeters);
    if (phase.key !== race.phaseKey) {
      race.phaseKey = phase.key;
      race.phaseLabel = phase.label;
      if (race.elapsed >= race.nextNoteAllowed) announce(race, phase.msg, "#38bdf8", 0.8, 1.2);
    }

    const ctxMap = buildContexts(pre, race.trackMeters);

    for (const r of race.runners) {
      r.activeEffects = r.activeEffects.filter((e) => e.expiresAt > race.elapsed);
      const c = ctxMap.get(r.id);
      if (!c) continue;
      if (r.finishedAt !== null && r.finishedAt !== undefined) {
        r.speed = 0;
        continue;
      }
      if (timeStopActive && race.timeStopRunnerId !== r.id) {
        r.speed = 0;
        continue;
      }

      const fieldSize = race.runners.length;
      const sideBySideGap = Math.max(1.35, race.trackMeters * 0.0014);
      const packedGap = Math.max(0.92, race.trackMeters * 0.001);
      r.sideBySideSec = c.closeGap <= sideBySideGap ? r.sideBySideSec + dt : Math.max(0, r.sideBySideSec - dt * 0.74);
      r.packedRunSec = c.closeGap <= packedGap ? r.packedRunSec + dt : Math.max(0, r.packedRunSec - dt * 0.86);
      r.lastPlaceSec = c.rank === fieldSize ? r.lastPlaceSec + dt : Math.max(0, r.lastPlaceSec - dt);
      r.firstPlaceSec = c.rank === 1 ? r.firstPlaceSec + dt : Math.max(0, r.firstPlaceSec - dt * 0.8);
      r.recoverModeSec = r.paceMode === "recover" ? r.recoverModeSec + dt : Math.max(0, r.recoverModeSec - dt);
      r.surgeHoldSec = race.surgeId === r.id ? r.surgeHoldSec + dt : Math.max(0, r.surgeHoldSec - dt * 1.4);

      const skillCheckInterval =
        r.traitId === "tactician" ? 0.76 : r.traitId === "steady" ? 1.08 : r.traitId === "endurance" ? 1.12 : 1;
      if (race.elapsed >= r.nextSkillCheckAt) {
        r.nextSkillCheckAt += skillCheckInterval;
        trySkill(race, r, c);
      }
      tryUltimate(race, r, c, ts, fieldSize);
      if (race.elapsed >= r.nextComebackCheckAt) {
        r.nextComebackCheckAt += 1;
        tryComebackBoost(race, r, c);
      }
    }

    const dragMap = new Map(race.runners.map((r) => [r.id, 1]));
    for (const src of race.runners) {
      const aura = src.activeEffects.filter((e) => e.startsAt <= race.elapsed && e.expiresAt > race.elapsed && e.dragAura > 0);
      if (!aura.length) continue;
      for (const tgt of race.runners) {
        if (tgt.id === src.id || tgt.distance >= src.distance) continue;
        const gap = src.distance - tgt.distance;
        let resist = 1;
        for (const e of tgt.activeEffects) {
          if (e.startsAt <= race.elapsed && e.expiresAt > race.elapsed && e.debuffResist) resist = Math.min(resist, e.debuffResist);
        }
        for (const a of aura) {
          if (gap > a.dragRange) continue;
          const debuff = a.dragAura * (1 - gap / a.dragRange) * resist;
          dragMap.set(tgt.id, clamp((dragMap.get(tgt.id) ?? 1) * (1 - debuff), 0.8, 1));
        }
      }
    }
    for (const r of race.runners) {
      const c = ctxMap.get(r.id);
      if (!c) continue;
      if (r.finishedAt !== null && r.finishedAt !== undefined) {
        r.speed = 0;
        continue;
      }
      if (timeStopActive && race.timeStopRunnerId !== r.id) {
        r.speed = 0;
        continue;
      }
      const active = r.activeEffects.filter((e) => e.startsAt <= race.elapsed && e.expiresAt > race.elapsed);

      let speedMul = 1;
      let flat = 0;
      let varMul = 1;
      let drainMul = 1;
      let regen = r.staminaRegenBase;
      let fatigueIgnore = 0;
      const comebackActive = r.comebackActiveUntil > race.elapsed;
      let ultimateTrailBoost = 0;
      const staminaTier = getStaminaTier(r.stamina);
      const tierSpeedBonus = STAMINA_TIER_SPEED_BONUS[staminaTier];
      let spendDrive = 1;

      const fieldSize = race.runners.length;
      const paceProfile = r.paceProfile ?? createPaceProfile(r.traitId);
      if (!r.paceProfile) r.paceProfile = paceProfile;
      if (!r.paceMode) r.paceMode = "run";
      if (!r.paceModeUntil || Number.isNaN(r.paceModeUntil)) {
        r.paceModeUntil = race.elapsed + rollPaceDuration(paceProfile.runMinSec, paceProfile.runMaxSec, 0.58);
      }

      const latePhase = race.phaseKey === "final" || race.phaseKey === "climax";
      const desperateChase = latePhase && c.rank >= Math.max(3, fieldSize - 1);
      const lowStaminaGate = clamp(paceProfile.recoverStartStamina + (c.progress > 0.78 ? 0.02 : 0), 0.12, 0.82);
      const highStaminaGate = clamp(paceProfile.resumeStamina - (latePhase ? 0.03 : 0), lowStaminaGate + 0.08, 0.95);

      const rollRunWindow = () => {
        let d = rollPaceDuration(paceProfile.runMinSec, paceProfile.runMaxSec, 0.56);
        if (c.progress < 0.24) d *= paceProfile.earlyRunBias;
        if (c.progress > 0.72) d *= paceProfile.lateRunBias;
        if (desperateChase) d *= 1.22;
        return clamp(d, 0.8, 8.2);
      };
      const rollRecoverWindow = (forceRecover = false) => {
        let d = rollPaceDuration(paceProfile.recoverMinSec, paceProfile.recoverMaxSec, forceRecover ? 0.72 : 0.48);
        if (c.progress > 0.78) d *= 0.88;
        if (desperateChase) d *= 0.7;
        return clamp(d, 0.45, 5.3);
      };

      if (r.paceMode === "run") {
        const timedOut = race.elapsed >= r.paceModeUntil;
        const forced = r.stamina <= lowStaminaGate;
        if (forced || timedOut) {
          r.paceMode = "recover";
          r.paceModeUntil = race.elapsed + rollRecoverWindow(forced);
          r.paceCycle = (r.paceCycle ?? 0) + 1;
        }
      } else {
        const timedOut = race.elapsed >= r.paceModeUntil;
        const recoveredEnough = r.stamina >= highStaminaGate;
        if ((recoveredEnough && race.elapsed >= r.paceModeUntil - 0.28) || timedOut || desperateChase) {
          r.paceMode = "run";
          r.paceModeUntil = race.elapsed + rollRunWindow();
        }
      }

      let runSpeedMul = paceProfile.runSpeedMul;
      let runDrainMul = paceProfile.runDrainMul;
      let recoverSpeedMul = paceProfile.recoverSpeedMul;
      let recoverDrainMul = paceProfile.recoverDrainMul;
      let recoverRegen = paceProfile.recoverRegenPerSec;

      if (r.traitId === "late_runner" || r.traitId === "closer") {
        if (c.progress < 0.58) {
          runSpeedMul *= 0.93;
          runDrainMul *= 0.88;
          recoverRegen *= 1.1;
        } else {
          runSpeedMul *= 1.1;
          runDrainMul *= 1.06;
          recoverSpeedMul *= 0.95;
        }
      }
      if (r.traitId === "front_runner" && c.progress > 0.72) {
        runSpeedMul *= 0.94;
        runDrainMul *= 0.88;
      }
      if (r.traitId === "last_fight" && c.rank >= fieldSize - 1) {
        runSpeedMul *= 1.08;
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

      if (r.traitId === "steady") {
        speedMul *= 1.01;
        varMul *= 0.84;
        drainMul *= 0.92;
        spendDrive *= 0.86;
      }
      if (r.traitId === "mid_spender") {
        if (c.progress < 0.32) {
          speedMul *= 0.97;
          drainMul *= 0.46;
          spendDrive *= 0.55;
          regen += 0.0012;
        } else if (c.progress <= 0.72) {
          speedMul *= 1.17;
          flat += 0.75;
          drainMul *= 1.62;
          spendDrive *= 1.46;
        } else {
          speedMul *= 0.965;
          drainMul *= 1.08;
        }
      }
      if (r.traitId === "late_runner") {
        if (c.progress < 0.58) {
          speedMul *= 0.95;
          drainMul *= 0.78;
          spendDrive *= 0.8;
        } else {
          speedMul *= 1.2;
          flat += 0.4;
          drainMul *= 1.22;
          spendDrive *= 1.26;
        }
      }
      if (r.traitId === "front_runner") {
        if (c.progress < 0.36) {
          speedMul *= 1.26;
          flat += 1.05;
          drainMul *= 1.36;
          spendDrive *= 1.35;
          if (race.phaseKey === "opening" && c.progress < 0.2) {
            speedMul *= 1.05;
            flat += 0.25;
          }
        } else if (c.progress > 0.7) {
          speedMul *= 0.94;
        }
      }
      if (r.traitId === "closer") {
        const catchMul = 1 + clamp(c.gapLeader / Math.max(18, race.trackMeters * 0.04), 0, 0.24);
        speedMul *= catchMul;
        spendDrive *= 1.1;
      }
      if (r.traitId === "endurance") {
        speedMul *= 0.985;
        drainMul *= 0.86;
        regen += 0.0008;
        fatigueIgnore += 0.04;
        spendDrive *= 0.88;
      }
      if (r.traitId === "sprinter") {
        if (race.phaseKey === "final" || race.phaseKey === "climax") {
          speedMul *= 1.2;
          flat += 0.75;
          drainMul *= 1.35;
          spendDrive *= 1.38;
        } else {
          speedMul *= 0.955;
        }
      }
      if (r.traitId === "risk_taker") {
        speedMul *= lerp(0.9, 1.22, Math.random());
        varMul *= 1.18;
        spendDrive *= 1.28;
      }
      if (r.traitId === "tactician") {
        speedMul *= 1.02;
        varMul *= 0.92;
        drainMul *= 0.95;
        spendDrive *= 0.94;
      }
      if (r.traitId === "last_fight") {
        if (c.progress < 0.34) {
          speedMul *= 0.985;
          drainMul *= 0.44;
          spendDrive *= 0.52;
          regen += 0.001;
        } else if (c.rank >= fieldSize - 1) {
          speedMul *= 1.22;
          flat += 0.8;
          drainMul *= 1.32;
          spendDrive *= 1.46;
        } else if (c.rank === 1) {
          speedMul *= 0.97;
        }
      }

      for (const e of active) {
        if (e.isUltimate) ultimateTrailBoost = Math.max(ultimateTrailBoost, e.trailBoost ?? 1.2);
        if (e.dynamicDraft) {
          if (c.gapAhead < Infinity && c.gapAhead <= e.draftMaxGap) {
            const closeness = 1 - clamp((c.gapAhead - 0.5) / Math.max(0.5, e.draftMaxGap - 0.5), 0, 1);
            speedMul *= 1 + (e.speedMul - 1) * closeness;
          } else speedMul *= 1.01;
        } else speedMul *= e.speedMul;
        if (e.duelRange > 0 && c.closeGap <= e.duelRange) speedMul *= 1 + e.duelScale * (1 - c.closeGap / e.duelRange);
        flat += e.flatSpeed;
        varMul *= e.varianceMul;
        drainMul *= e.staminaDrainMul;
        regen += e.staminaRegenPerSec;
        fatigueIgnore += e.fatigueIgnore;
      }

      speedMul *= dragMap.get(r.id) ?? 1;
      if (comebackActive) {
        const remainRatio = clamp((r.comebackActiveUntil - race.elapsed) / 4, 0, 1);
        speedMul *= 1.1 + remainRatio * 0.22;
        flat += 0.8 + remainRatio * 0.9;
        drainMul *= 1.18;
        spendDrive *= 1.2;
      }

      speedMul *= 1 + tierSpeedBonus;

      const fatigue = clamp(1 - c.progress * 0.11 - (1 - r.stamina) * 0.68 + fatigueIgnore, 0.45, 1.12);
      const pace = 0.95 + Math.sin(race.elapsed * 2.25 + r.paceSeed) * 0.055;
      const jitter = (0.93 + Math.random() * 0.14) * varMul;
      const chase = 1 + clamp((c.gapLeader / race.trackMeters) * 0.55, 0, 0.14);
      const draft = c.gapAhead < Math.max(3.8, race.trackMeters * 0.0038) ? 1.02 : 1;
      const kick = c.progress > r.finalKickStart ? 1 + (c.progress - r.finalKickStart) * r.finalKickPower : 1;

      let phaseBoost = 1;
      if (race.phaseKey === "final" && c.rank <= 4) phaseBoost += 0.03;
      if (race.phaseKey === "climax") {
        if (c.rank <= 3) phaseBoost += 0.06;
        if (c.rank > 1 && c.gapLeader < Math.max(10, race.trackMeters * 0.01)) phaseBoost += 0.08;
      }

      const lastPlaceBoost =
        c.rank === race.runners.length
          ? 1 + clamp(c.gapLeader / Math.max(28, race.trackMeters * 0.03), 0, 0.22)
          : 1;

      let target = r.baseSpeed * fatigue * pace * jitter * chase * draft * kick * phaseBoost * speedMul * lastPlaceBoost + flat;
      const spendIntensity = clamp((target / 22) * drainMul, 0, 3);
      const spendSpeedBonus = clamp((spendIntensity - 0.75) * 0.09 * spendDrive, 0, 0.34);
      target *= 1 + spendSpeedBonus;
      if (c.rank > 3 && race.phaseKey !== "opening") target *= 1.01 + clamp((c.gapLeader / race.trackMeters) * 0.06, 0, 0.03);
      target = clamp(target, 7.2, 42);
      r.speed += (target - r.speed) * 0.52;
      const before = r.distance;
      r.distance = Math.min(race.trackMeters, r.distance + r.speed * dt);
      if ((r.finishedAt === null || r.finishedAt === undefined) && before < race.trackMeters && r.distance >= race.trackMeters) {
        r.finishedAt = race.elapsed;
        emitBurstParticles(race, r, "#fde68a", 20, 1.22);
      }

      const speedNorm = clamp((r.speed - 9) / 26, 0, 1);
      const dustChance = dt * (5 + speedNorm * 13 + race.intensity * 8 + (comebackActive ? 6 : 0));
      if (Math.random() < dustChance) {
        const dustCount = 1 + (Math.random() < 0.48 + speedNorm * 0.24 ? 1 : 0);
        emitTrailParticles(race, r, dustCount, 0.86 + speedNorm * 0.58 + (comebackActive ? 0.22 : 0));
      }
      if (ultimateTrailBoost > 0 && Math.random() < dt * (18 + race.intensity * 14)) {
        emitUltimateTrailParticles(race, r, r.ultimate?.color ?? "#f8fafc", ultimateTrailBoost * (0.7 + speedNorm * 0.6));
      }

      let drain = dt * (r.speed / 24.5) * 0.032 * drainMul;
      let recover = dt * (regen + (r.speed < 11 ? 0.004 : 0));
      if (race.phaseKey === "opening") recover += dt * 0.0014;
      if (race.phaseKey === "climax") drain *= 1.14;
      drain *= clamp(0.86 + spendDrive * 0.34, 0.72, 1.42);
      r.stamina = clamp(r.stamina - drain + recover, 0.04, 1);
    }

    const sorted = sortRunnersByRaceState(race.runners);
    const leader = sorted[0];
    if (!leader) {
      race.running = false;
      setIsRunning(false);
      return syncUi(race, ts, true);
    }

    const paceLeader = sorted.find((r) => r.finishedAt === null || r.finishedAt === undefined) ?? leader;
    race.leaderId = paceLeader.id;
    const surge = sorted
      .filter((r) => r.id !== paceLeader.id && (r.finishedAt === null || r.finishedAt === undefined))
      .filter((r) => paceLeader.distance - r.distance <= Math.max(8, race.trackMeters * 0.02))
      .sort((a, b) => b.speed - a.speed)[0];
    race.surgeId = surge && surge.speed > paceLeader.speed * 1.06 ? surge.id : "";

    const rankMap = new Map(sorted.map((r, i) => [r.id, i + 1]));
    const overtaker = sorted.slice(0, 4).find((r) => (race.prevRanks.get(r.id) ?? 99) > (rankMap.get(r.id) ?? 99));
    if (overtaker && race.elapsed >= race.nextNoteAllowed) announce(race, `${overtaker.name} 추월!`, "#22c55e", 0.68, 1.2);
    if (race.phaseKey === "climax" && sorted.length > 1) {
      const duelGap = sorted[0].distance - sorted[1].distance;
      if (duelGap <= Math.max(2.2, race.trackMeters * 0.0022) && race.elapsed >= race.nextNoteAllowed) {
        announce(race, "포토피니시 접전!", "#fb7185", 0.85, 1);
      }
    }
    race.prevRanks = rankMap;

    const activeSorted = sorted.filter((r) => r.finishedAt === null || r.finishedAt === undefined);
    const tensionPack = activeSorted.length ? activeSorted : sorted;
    const paceReference = activeSorted[0] ?? leader;
    const thirdGap =
      tensionPack.length > 2
        ? tensionPack[0].distance - tensionPack[2].distance
        : tensionPack.length > 1
          ? tensionPack[0].distance - tensionPack[1].distance
          : race.trackMeters;
    const tight = 1 - clamp(thirdGap / Math.max(14, race.trackMeters * 0.012), 0, 1);
    const finishHeat = clamp((paceReference.distance / race.trackMeters - 0.52) / 0.48, 0, 1);
    const activeTop3 = sorted
      .slice(0, 3)
      .reduce((n, r) => n + r.activeEffects.filter((e) => e.startsAt <= race.elapsed && e.expiresAt > race.elapsed).length, 0);
    const comebackHeat = sorted.reduce((n, r) => n + (r.comebackActiveUntil > race.elapsed ? 1 : 0), 0);
    race.intensity = clamp(
      tight * 0.4 + finishHeat * 0.32 + clamp(activeTop3 / 7, 0, 1) * 0.2 + clamp(comebackHeat / 3, 0, 1) * 0.12 + (race.surgeId ? 0.15 : 0),
      0,
      1
    );
    race.feelBoost = clamp(0.9 + race.intensity * 0.55 + (paceReference.speed / 30) * 0.25, 0.9, 1.75);
    const cameraPackThreshold = Math.max(3.2, race.trackMeters * 0.004);
    const cameraPackBase = activeSorted.length ? activeSorted : sorted;
    const frontPack = cameraPackBase
      .filter((r) => cameraPackBase[0].distance - r.distance <= cameraPackThreshold)
      .slice(0, 4);
    const packStability = clamp((frontPack.length - 1) / 3, 0, 1);
    const anchorDistance =
      frontPack.length >= 3
        ? frontPack.reduce((sum, r) => sum + r.distance, 0) / frontPack.length
        : paceReference.distance;
    const ultFocusWeight = clamp((race.ultimatePulseUntil - race.elapsed) / 1.6, 0, 1);
    const hitStopShake = (race.hitStopUntilTs ?? 0) > ts ? clamp((race.hitStopUntilTs - ts) / 180, 0, 1) : 0;
    race.cameraShake = race.intensity * (race.phaseKey === "climax" ? 2.9 : 1.6) * (1 - packStability * 0.35) + hitStopShake * 1.6;
    race.flowOffset = (race.flowOffset + dt * (130 + race.feelBoost * 140)) % 10000;

    const cw = Math.max(320, canvasSizeRef.current.width || 960);
    const leadX = anchorDistance * race.meterToPixel;
    const focusRunner = race.runners.find((r) => r.id === race.ultimateFocusId && (r.finishedAt === null || r.finishedAt === undefined));
    const focusX = (focusRunner?.distance ?? paceLeader.distance) * race.meterToPixel;
    const cameraAnchorX = lerp(leadX, focusX, ultFocusWeight * 0.68);
    const zoomTarget = clamp(1 + race.intensity * 0.11 + (race.phaseKey === "climax" ? 0.05 : 0) + ultFocusWeight * 0.06 - packStability * 0.03, 1, 1.32);
    race.cameraZoom += (zoomTarget - race.cameraZoom) * 0.1;
    const vw = cw / race.cameraZoom;
    const targetCam = clamp(cameraAnchorX - vw * (0.42 - race.intensity * 0.05), 0, Math.max(0, race.trackPixels - vw));
    race.cameraX += (targetCam - race.cameraX) * clamp(0.07 + race.feelBoost * 0.025 - packStability * 0.02, 0.055, 0.14);

    const allFinished = race.runners.length > 0 && race.runners.every((r) => r.finishedAt !== null && r.finishedAt !== undefined);
    if (allFinished) {
      race.running = false;
      race.prevTimestamp = 0;
      announce(race, `전원 완주! ${leader.name} 우승`, "#f59e0b", 1.9, 2.2);
      appendRaceLog(`전원 완주! 우승: ${leader.name}`, "#f59e0b");
      setWinner(leader.name);
      setFinalResults(
        sorted.map((r, i) => ({
          id: r.id,
          rank: i + 1,
          name: r.name,
          color: r.color,
          finishTime: r.finishedAt ?? race.elapsed
        }))
      );
      setShowResultModal(true);
      setIsRunning(false);
      return syncUi(race, ts, true);
    }

    syncUi(race, ts, false);
  };

  const drawRace = (ts) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvasElementRef.current !== canvas) {
      canvasElementRef.current = canvas;
      canvasSizeRef.current = { width: 0, height: 0, dpr: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (canvasSizeRef.current.width !== width || canvasSizeRef.current.height !== height || canvasSizeRef.current.dpr !== dpr) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvasSizeRef.current = { width, height, dpr };
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const race = raceRef.current;
    const top = height * 0.42;
    const bottom = height * 0.9;
    const h = bottom - top;
    const worldW = Math.max(race.trackPixels + 120, width / race.cameraZoom + 20);
    const shakeX = Math.sin(ts * 0.08) * race.cameraShake;
    const shakeY = Math.cos(ts * 0.11) * race.cameraShake * 0.5;

    ctx.setTransform(dpr, 0, 0, dpr, shakeX, shakeY);
    ctx.clearRect(-12, -12, width + 24, height + 24);

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#dff4ff");
    sky.addColorStop(0.5, "#bfe5ff");
    sky.addColorStop(1, "#94c8ea");
    ctx.fillStyle = sky;
    ctx.fillRect(-8, -8, width + 16, height + 16);
    ctx.fillStyle = "#8fd173";
    ctx.fillRect(0, top - 42, width, 42);
    ctx.fillStyle = "#4f6179";
    ctx.fillRect(0, top, width, height - top);

    if (race.intensity > 0.56) {
      ctx.strokeStyle = `rgba(255,255,255,${(0.07 + race.intensity * 0.12).toFixed(3)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 14 + Math.floor(race.intensity * 10); i += 1) {
        const off = (race.flowOffset * 2 + i * 64) % (width + 180);
        const x = width - off;
        ctx.beginPath();
        ctx.moveTo(x, top - 6);
        ctx.lineTo(x + 90, bottom + 10);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.scale(race.cameraZoom, race.cameraZoom);
    ctx.translate(-race.cameraX, 0);
    const tg = ctx.createLinearGradient(0, top, 0, bottom);
    tg.addColorStop(0, "#748dac");
    tg.addColorStop(1, "#42556f");
    ctx.fillStyle = tg;
    ctx.fillRect(0, top, worldW, h);

    const shift = (race.flowOffset * 1.35) % 82;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let x = -shift; x < worldW + 82; x += 82) ctx.fillRect(x, top, 3, h);

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i += 1) {
      const y = top + (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(worldW, y);
      ctx.stroke();
    }
    const step = markerStepMeters(race.meterToPixel, race.trackMeters);
    for (let m = 0; m <= race.trackMeters; m += step) {
      const x = m * race.meterToPixel;
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top - 8);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillStyle = "rgba(248,250,252,0.95)";
      ctx.font = "600 11px Bahnschrift, Segoe UI, sans-serif";
      ctx.fillText(`${m}m`, x + 4, top - 12);
    }

    const fx = race.trackMeters * race.meterToPixel;
    ctx.fillStyle = "#fff";
    ctx.fillRect(fx - 4, top - 5, 8, h + 8);
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#111827" : "#f8fafc";
      ctx.fillRect(fx - 4, top + (h / 18) * i, 8, h / 18);
    }
    if (race.phaseKey === "climax") {
      ctx.strokeStyle = "rgba(251,113,133,0.65)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(fx, top - 16);
      ctx.lineTo(fx, bottom + 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 11px Bahnschrift, Segoe UI, sans-serif";
    ctx.fillText("FINISH", fx - 18, top - 14);

    const pulse = 0.5 + Math.sin(ts * 0.015) * 0.5;

    if (race.particles?.length) {
      const viewStart = race.cameraX - 220;
      const viewEnd = race.cameraX + width / race.cameraZoom + 220;
      for (const p of race.particles) {
        if (p.x < viewStart || p.x > viewEnd) continue;
        const baseY = clamp(top + h * 0.52 + p.laneOffset, top + 18, bottom - 18);
        const py = baseY + p.y;
        if (py < top - 46 || py > bottom + 64) continue;
        const lifeRatio = clamp(p.life / p.maxLife, 0, 1);
        const alpha = lifeRatio * lifeRatio * p.alpha;
        if (alpha <= 0.01) continue;
        const size = p.size * (0.72 + lifeRatio * 0.58);
        if (p.glow > 0) {
          ctx.globalAlpha = alpha * 0.4;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, py, size * (1.6 + p.glow * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const drawOrder = [...race.runners].sort((a, b) => a.laneOffset - b.laneOffset);
    for (const r of drawOrder) {
      const finishVisual = getFinishedVisual(race.elapsed, r);
      if (!finishVisual.visible) continue;
      const x = (r.distance + finishVisual.extraMeters) * race.meterToPixel;
      const y = clamp(top + h * 0.52 + r.laneOffset, top + 18, bottom - 18);
      const active = r.activeEffects.filter((e) => e.startsAt <= race.elapsed && e.expiresAt > race.elapsed);
      const head = active[active.length - 1];
      const isComeback = r.comebackActiveUntil > race.elapsed;
      const isUltimate = r.ultimateActiveUntil > race.elapsed;
      const speedRatio = clamp((r.speed - 8) / 24, 0, 1);
      const trail = 8 + speedRatio * 24 + race.intensity * 10 + (isComeback ? 16 : 0);

      ctx.save();
      if (finishVisual.fade < 1) ctx.globalAlpha = finishVisual.fade;
      ctx.save();
      ctx.globalAlpha = (0.25 + race.intensity * 0.15 + (isComeback ? 0.12 : 0)) * finishVisual.fade;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 + speedRatio * 1.5 + (isComeback ? 1.8 : 0);
      ctx.beginPath();
      ctx.moveTo(x - trail, y);
      ctx.lineTo(x - 2, y);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(15,23,42,0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y + 11, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (head) {
        ctx.strokeStyle = `${head.color}${r.id === race.surgeId ? "ff" : "cc"}`;
        ctx.lineWidth = r.id === race.surgeId ? 5 : 3;
        ctx.beginPath();
        ctx.arc(x, y, 16 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (r.id === race.leaderId) {
        ctx.strokeStyle = "rgba(250,204,21,0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (r.id === race.surgeId) {
        ctx.strokeStyle = "rgba(34,211,238,0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 21 + pulse * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (isComeback) {
        ctx.strokeStyle = "rgba(251,113,133,0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 24 + pulse * 1.8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (isUltimate) {
        const uPulse = 0.7 + Math.sin(ts * 0.028) * 0.3;
        ctx.strokeStyle = r.ultimate?.color ?? "#f8fafc";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y, 27 + uPulse * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(248,250,252,0.92)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 31 + uPulse * 3.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(248,250,252,0.98)";
      ctx.font = "700 12px Bahnschrift, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(r.name, x, y - 19);

      const barTier = getStaminaTier(r.stamina);
      ctx.fillStyle = "rgba(15,23,42,0.6)";
      ctx.fillRect(x - 15, y + 14, 30, 4);
      ctx.fillStyle = STAMINA_TIER_COLORS[barTier];
      ctx.fillRect(x - 15, y + 14, 30 * r.stamina, 4);
      if (race.elapsed < r.lastSkillUntil) {
        ctx.fillStyle = "rgba(15,23,42,0.72)";
        ctx.fillRect(x - 42, y + 20, 84, 16);
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.font = "600 10px Bahnschrift, Segoe UI, sans-serif";
        ctx.fillText(r.lastSkillName, x, y + 32);
      }
      ctx.restore();
    }
    ctx.restore();

    if (race.intensity > 0.62) {
      const alpha = clamp((race.intensity - 0.62) * 1.9, 0, 0.28);
      const vg = ctx.createRadialGradient(width * 0.5, height * 0.6, Math.min(width, height) * 0.15, width * 0.5, height * 0.6, Math.max(width, height) * 0.65);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(13,18,28,${alpha.toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, width, height);
    }

    const ultPulse = clamp((race.ultimatePulseUntil - race.elapsed) / 1.6, 0, 1);
    const ultPulseEase = ultPulse * ultPulse;
    if (ultPulseEase > 0) {
      const focusRunner = race.runners.find((r) => r.id === race.ultimateFocusId);
      const overlayLabelY = clamp(Math.round(height * 0.34), 186, 256);
      ctx.save();
      ctx.globalAlpha = 0.045 + ultPulseEase * 0.1;
      ctx.fillStyle = race.ultimateFlashColor || "#f8fafc";
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.16 + ultPulseEase * 0.16;
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.fillRect(width * 0.18, overlayLabelY - 26, width * 0.64, 48);
      ctx.globalAlpha = 1;
      ctx.fillStyle = race.ultimateFlashColor || "#f8fafc";
      ctx.font = "800 18px Bahnschrift, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`ULTIMATE ${focusRunner ? `- ${focusRunner.name}` : ""}`, width * 0.5, overlayLabelY + 5);
      ctx.restore();
    }

    const hitStopRatio = (race.hitStopUntilTs ?? 0) > ts ? clamp((race.hitStopUntilTs - ts) / 180, 0, 1) : 0;
    if (hitStopRatio > 0) {
      const hitStopEase = hitStopRatio * hitStopRatio;
      ctx.save();
      ctx.globalAlpha = 0.05 + hitStopEase * 0.14;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.24 + hitStopEase * 0.22;
      ctx.strokeStyle = race.ultimateFlashColor || "#f8fafc";
      ctx.lineWidth = 2 + hitStopEase * 1.4;
      ctx.strokeRect(6, 6, width - 12, height - 12);
      ctx.restore();
    }

    const timeStopRemain = (race.timeStopUntil ?? 0) - race.elapsed;
    if (timeStopRemain > 0 && race.timeStopRunnerId) {
      const timeStopRatio = clamp(timeStopRemain / 3, 0, 1);
      const caster = race.runners.find((r) => r.id === race.timeStopRunnerId);
      const overlayLabelY = clamp(Math.round(height * 0.34), 186, 256);
      ctx.save();
      ctx.globalAlpha = 0.06 + timeStopRatio * 0.14;
      ctx.fillStyle = race.timeStopColor || "#60a5fa";
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.22 + timeStopRatio * 0.24;
      ctx.strokeStyle = race.timeStopColor || "#60a5fa";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "800 16px Bahnschrift, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`TIME STOP${caster ? ` - ${caster.name}` : ""}`, width * 0.5, overlayLabelY + 34);
      ctx.restore();
    }

    ctx.fillStyle = "rgba(15,23,42,0.58)";
    ctx.fillRect(12, height - 44, 352, 30);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 12px Bahnschrift, Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `Track ${race.trackMeters}m | Skill ${skillPool.length} / Type ${TOTAL_SKILL_TYPE_COUNT} | ${race.phaseLabel} | Heat ${Math.round(
        race.intensity * 100
      )}%`,
      20,
      height - 24
    );
    if (!race.runners.length) {
      ctx.fillStyle = "rgba(15,23,42,0.72)";
      ctx.font = "700 20px Bahnschrift, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Start to run the race", width * 0.5, height * 0.5);
    }
  };

  useEffect(() => {
    const loop = (ts) => {
      updateRace(ts);
      drawRace(ts);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const readSetupInput = () => {
    const names = parseRunnerNames(nameInput);
    const track = Number(trackInput);
    if (!names.length) {
      setError("참가자 이름을 1명 이상 입력하세요. 예: 토끼,거북이,치타");
      return null;
    }
    if (!Number.isInteger(track) || track < MIN_TRACK || track > MAX_TRACK) {
      setError(`코스 길이는 ${MIN_TRACK}~${MAX_TRACK}m 정수만 가능합니다.`);
      return null;
    }
    return { names, track };
  };

  const lineupMatchesInput = (lineup, names) => lineup.length === names.length && lineup.every((r, i) => r.name === names[i]);

  const deployLineup = () => {
    const setup = readSetupInput();
    if (!setup) return;
    const runners = createRunners(setup.names, skillPool, ULTIMATE_POOL);
    setDeployedRunners(runners);
    setError("");
    setWinner("");
    setFinalResults([]);
    setShowResultModal(false);
    setRaceLogs([]);
    appendRaceLog(`배치 완료: ${runners.length}명, 코스 ${setup.track}m`, "#0ea5e9");
  };

  const startRace = () => {
    const setup = readSetupInput();
    if (!setup) return;

    let lineup = deployedRunners;
    if (!lineupMatchesInput(lineup, setup.names)) {
      lineup = createRunners(setup.names, skillPool, ULTIMATE_POOL);
      setDeployedRunners(lineup);
    }
    lineup = lineup.map((r) => ({
      ...r,
      skills: limitRecoverSkills(r.skills ?? [], skillPool, 1)
    }));
    setDeployedRunners(lineup);

    const race = raceRef.current;
    const runners = prepareRunnersForRace(lineup);
    const trackPixels = clamp(setup.track * BASE_PX_PER_METER, MIN_TRACK_PIXELS, MAX_TRACK_PIXELS);
    const timeScale = getTrackTimeScale(setup.track);

    Object.assign(race, {
      running: true,
      trackMeters: setup.track,
      trackPixels,
      meterToPixel: trackPixels / setup.track,
      timeScale,
      elapsed: 0,
      prevTimestamp: 0,
      cameraX: 0,
      cameraZoom: 1,
      cameraShake: 0,
      intensity: 0,
      feelBoost: 1,
      flowOffset: 0,
      phaseKey: "opening",
      phaseLabel: "초반 탐색전",
      leaderId: runners[0]?.id ?? "",
      surgeId: "",
      note: "출발!",
      noteColor: "#0ea5e9",
      noteUntil: 1.5,
      nextNoteAllowed: 0.8,
      hitStopUntilTs: 0,
      ultimatePulseUntil: 0,
      ultimateFocusId: "",
      ultimateFlashColor: "#f8fafc",
      lastUltimateAt: -999,
      lastUltimateCasterId: "",
      lastScreenFxTs: -99999,
      timeStopUntil: 0,
      timeStopRunnerId: "",
      timeStopColor: "#60a5fa",
      runners,
      particles: [],
      prevRanks: new Map(runners.map((r, i) => [r.id, i + 1])),
      lastHudSyncAt: 0
    });

    setError("");
    setWinner("");
    setFinalResults([]);
    setShowResultModal(false);
    setRaceLogs([]);
    appendRaceLog(`레이스 시작: ${runners.length}명 / ${setup.track}m`, "#22c55e");
    setIsRunning(true);
    setViewMode("race");
    setHud(buildHud(race));
    setRunnerCards(buildCards(race));
  };

  const stopRace = () => {
    const race = raceRef.current;
    race.running = false;
    race.prevTimestamp = 0;
    race.note = "레이스 정지";
    race.noteColor = "#475569";
    race.noteUntil = race.elapsed + 1.4;
    setIsRunning(false);
    appendRaceLog("레이스 정지", "#64748b");
    setHud(buildHud(race));
    setRunnerCards(buildCards(race));
  };

  const backToSetup = () => {
    stopRace();
    setShowResultModal(false);
    setViewMode("setup");
  };

  const raceTrackMeters = Math.max(1, raceRef.current.trackMeters || Number(trackInput) || MIN_TRACK);
  const minimapRunners = runnerCards.map((c) => ({
    ...c,
    progress: clamp(c.distance / raceTrackMeters, 0, 1)
  }));
  const leaderMiniProgress = minimapRunners[0]?.progress ?? 0;

  return (
    <main className={`page ${viewMode === "race" ? "page-race" : "page-setup"}`}>
      {viewMode === "setup" ? (
        <>
          <section className="panel setup-panel">
            <h1>캔버스 달리기</h1>
            <div className="controls">
              <label>
                참가자 이름 (`,`로 구분)
                <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="예: 토끼,거북이,치타" />
              </label>
              <label>
                코스 길이 (1~10000m)
                <input type="number" min={MIN_TRACK} max={MAX_TRACK} step={1} value={trackInput} onChange={(e) => setTrackInput(e.target.value)} />
              </label>
              <div className="buttons">
                <button onClick={deployLineup}>배치</button>
                <button onClick={startRace} className="ghost" disabled={!deployedRunners.length}>
                  레이스 시작
                </button>
              </div>
            </div>
            <p className="meta">스킬 풀: {skillPool.length}종 / 타입: {TOTAL_SKILL_TYPE_COUNT}종 / 궁극기: {ULTIMATE_POOL.length}종</p>
            <p className="meta">밸런스 룰: 회복 스킬은 참가자당 최대 1개로 제한됩니다.</p>
            <p className="meta">배치를 누를 때마다 각 폰의 성향/스킬/궁극기가 랜덤으로 다시 배정됩니다.</p>
            {error && <p className="error">{error}</p>}
          </section>

          <section className="panel deploy-panel">
            <h2>배치 결과</h2>
            {!deployedRunners.length ? (
              <p className="meta">먼저 배치를 눌러 참가자 구성을 생성하세요.</p>
            ) : (
              <div className="deploy-grid">
                {deployedRunners.map((r) => (
                  <article className="deploy-card" key={r.id}>
                    <header>
                      <span className="dot" style={{ background: r.color }} />
                      <strong style={{ color: r.color }}>{r.name}</strong>
                    </header>
                    <p>성향: <span style={{ color: r.traitColor }}>{r.traitLabel}</span></p>
                    <p>궁극기: <span style={{ color: r.ultimate?.color }}>{r.ultimate?.name}</span></p>
                    <div className="skill-list">
                      {r.skills.map((s) => (
                        <span key={s.id} style={{ borderColor: s.rankColor ?? s.color, background: `${s.color}22` }}>
                          [{s.rank}] {s.kindLabel}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="race-screen">
            <div className="race-main">
              <div className="race-actions">
                <button onClick={stopRace} disabled={!isRunning}>레이스 정지</button>
                <button onClick={() => setShowResultModal(true)} className="ghost" disabled={!finalResults.length}>
                  순위보기
                </button>
                <button onClick={backToSetup} className="ghost">설정 화면</button>
              </div>

              <div className="canvas-shell race-canvas-shell">
                <canvas ref={canvasRef} className="race-canvas" />
                <div className="race-hud race-hud-overlay">
                  <div className="hud-item">
                    <span>현재 1등</span>
                    <strong>{hud.leaderName}</strong>
                  </div>
                  <div className="hud-item">
                    <span>치고 나오는 참가자</span>
                    <strong>{hud.surgeName}</strong>
                  </div>
                  <div className="hud-item">
                    <span>남은 거리</span>
                    <strong>{hud.remainingMeters.toFixed(1)}m</strong>
                  </div>
                  <div className="hud-item heat">
                    <span>레이스 텐션</span>
                    <strong>{Math.round(hud.intensity * 100)}%</strong>
                    <div className="heat-bar">
                      <i style={{ width: `${Math.round(hud.intensity * 100)}%` }} />
                    </div>
                    <small>{hud.phaseLabel}</small>
                  </div>
                </div>
                {hud.note && (
                  <p className="race-note" style={{ borderColor: hud.noteColor }}>
                    {hud.note}
                  </p>
                )}
              </div>

              {winner && <p className="winner">우승: {winner}</p>}

              <div className="progress-panel">
                <div className="progress-head">
                  <h3>전체 진행 미니맵</h3>
                  <strong>{Math.round(leaderMiniProgress * 100)}%</strong>
                </div>
                <div className="mini-track">
                  <span className="finish-tag">FINISH</span>
                  {minimapRunners.map((r) => (
                    <span
                      key={r.id}
                      className={`mini-runner ${r.finished ? "finished" : ""}`}
                      style={{ left: `${Math.round(r.progress * 1000) / 10}%`, background: r.color }}
                      title={`#${r.rank} ${r.name} ${r.distance.toFixed(1)}m`}
                    />
                  ))}
                </div>
                <div className="mini-scale">
                  <span>0m</span>
                  <span>{raceTrackMeters}m</span>
                </div>
                <div className="mini-legend">
                  {minimapRunners.slice(0, 4).map((r) => (
                    <div className="mini-legend-item" key={`${r.id}-mini`}>
                      <i style={{ background: r.color }} />
                      <span>{`#${r.rank} ${r.name}`}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="log-panel">
                <h3>레이스 로그</h3>
                <div className="log-list">
                  {[...raceLogs].reverse().map((log) => (
                    <div className="log-item" key={log.id}>
                      <span className="log-time">{log.time}</span>
                      <span className="log-text" style={{ color: log.color }}>
                        {log.text}
                      </span>
                    </div>
                  ))}
                  {!raceLogs.length && <p className="meta">아직 기록된 로그가 없습니다.</p>}
                </div>
              </div>
            </div>

            <aside className="race-side">
              <div className="side-box">
                <h3>현재 순위</h3>
                <div className="live-rank-list">
                  {runnerCards.map((c) => (
                    <div className="live-rank-item" key={c.id}>
                      <span className="rank-no">#{c.rank}</span>
                      <span className="name" style={{ color: c.color }}>{c.name}</span>
                      <span className="dist">{c.distance.toFixed(1)}m</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="side-box">
                <h3>참가자 상세</h3>
                <p className="meta">진행: {isRunning ? "레이스 중" : "정지/완주"}</p>
                <div className="runner-grid runner-grid-side">
                  {runnerCards.map((c) => {
                    const filled = Math.max(0, Math.ceil(c.stamina * 5 - 0.001));
                    return (
                      <article className="runner-card" key={`${c.id}-detail`}>
                        <header>
                          <span className="dot" style={{ background: c.color }} />
                          <strong style={{ color: c.color }}>{c.name}</strong>
                          <span className="card-rank">#{c.rank}</span>
                        </header>
                        <p className="meta-tight">
                          성향: <span style={{ color: c.traitColor }}>{c.traitLabel}</span>
                        </p>
                        <p className="meta-tight">
                          궁극기: <span style={{ color: c.ultimateColor }}>{c.ultimateName}</span> ({c.ultimateState})
                        </p>
                        <p className="meta-tight">스태미나: {Math.round(c.stamina * 100)}% / {c.paceMode}</p>
                        <div className="stamina-gauge">
                          {Array.from({ length: 5 }, (_, i) => (
                            <i
                              key={i}
                              className={i < filled ? "on" : ""}
                              style={i < filled ? { background: STAMINA_TIER_COLORS[c.staminaTier], borderColor: `${STAMINA_TIER_COLORS[c.staminaTier]}88` } : undefined}
                            />
                          ))}
                        </div>
                        {c.activeSkill ? <p className="active-skill">현재 효과: {c.activeSkill}</p> : <p className="meta-tight">현재 효과: -</p>}
                        <div className="skill-list compact-skill-list">
                          {c.skills.map((s) => (
                            <span key={s.id} style={{ borderColor: s.rankColor ?? s.color, background: `${s.color}22` }}>
                              [{s.rank}] {s.kindLabel}
                            </span>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </aside>
          </section>

          {showResultModal && finalResults.length > 0 && (
            <div className="result-overlay" onClick={() => setShowResultModal(false)}>
              <div className="result-modal" onClick={(e) => e.stopPropagation()}>
                <h2>최종 순위</h2>
                <p className="meta">우승: {winner || finalResults[0]?.name || "-"}</p>
                <div className="final-list">
                  {finalResults.map((r) => (
                    <div className="final-item" key={r.id}>
                      <span className="final-rank">#{r.rank}</span>
                      <span className="final-name" style={{ color: r.color }}>
                        {r.name}
                      </span>
                      <span className="final-time">{r.finishTime.toFixed(2)}s</span>
                    </div>
                  ))}
                </div>
                <div className="modal-actions">
                  <button className="ghost" onClick={() => setShowResultModal(false)}>
                    닫기
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

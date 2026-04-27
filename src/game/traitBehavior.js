const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));
const lerp = (a, b, r) => a + (b - a) * r;

const DEFAULT_INTENT = {
  action: "hold",
  label: "페이스 유지",
  speedMul: 1,
  flatSpeed: 0,
  drainMul: 1,
  regenAdd: 0,
  varianceMul: 1,
  fatigueIgnore: 0,
  spendDriveMul: 1,
  runWindowMul: 1,
  recoverWindowMul: 1,
  skillChanceMul: 1,
  forceRun: false,
  forceRecover: false
};

const SKILL_KIND_WEIGHTS = {
  steady: { tempo: 2.4, guard: 2.2, recover: 1.7, draft: 1.35 },
  mid_spender: { tempo: 2.3, burst: 1.9, pressure: 1.45, breakaway: 1.35 },
  late_runner: { late: 2.8, chase: 2.2, recover: 1.5, draft: 1.35 },
  front_runner: { breakaway: 2.6, pressure: 2.2, burst: 1.8, duel: 1.25 },
  closer: { chase: 2.7, late: 2.15, draft: 1.7, burst: 1.35 },
  endurance: { guard: 2.6, recover: 2.2, tempo: 1.75, draft: 1.25 },
  sprinter: { burst: 2.7, late: 2.2, gamble: 1.45, chase: 1.25 },
  risk_taker: { gamble: 2.8, duel: 1.9, burst: 1.6, pressure: 1.35 },
  tactician: { tempo: 2.5, draft: 2.15, guard: 1.8, duel: 1.45 },
  last_fight: { chase: 2.45, late: 2.1, recover: 1.75, gamble: 1.35 }
};

const ULT_TRIGGER_WEIGHTS = {
  steady: { recover_hold: 2.2, cycle_count: 1.9, no_skill_long: 1.6, chain_react: 1.3 },
  mid_spender: { phase_middle: 2.8, top3_middle: 2.3, cycle_count: 1.5, packed_run: 1.25 },
  late_runner: { phase_final: 2.5, near_finish: 2.4, big_gap: 1.9, leader_snap: 1.8 },
  front_runner: { first_place_hold: 2.8, lead_late: 2.4, high_stamina_opening: 1.8, side_by_side: 1.25 },
  closer: { big_gap: 2.6, near_finish: 2.4, leader_snap: 2.1, duel_top: 1.45 },
  endurance: { recover_hold: 2.7, cycle_count: 2.2, low_stamina: 1.7, no_skill_long: 1.35 },
  sprinter: { near_finish: 2.8, phase_final: 2.5, blink: 2.1, all_in: 1.7 },
  risk_taker: { dice: 2.8, side_by_side: 2.1, packed_run: 1.8, duel_top: 1.45 },
  tactician: { chain_react: 2.6, no_skill_long: 2.1, time_stop: 1.9, drain_field: 1.6 },
  last_fight: { last_place_hold: 2.8, bottom2_final: 2.5, comeback_active: 2.1, big_gap: 1.55 }
};

function withIntent(next) {
  return { ...DEFAULT_INTENT, ...next };
}

function weightedPick(items, scoreOf, random = Math.random) {
  if (!items.length) return null;
  const scored = items.map((item) => ({ item, score: Math.max(0.001, scoreOf(item)) }));
  const sum = scored.reduce((acc, item) => acc + item.score, 0);
  let p = random() * sum;
  for (const item of scored) {
    p -= item.score;
    if (p <= 0) return item.item;
  }
  return scored[scored.length - 1].item;
}

function skillRankScore(skill) {
  if (skill.rank === "S") return 1.16;
  if (skill.rank === "A") return 1.1;
  if (skill.rank === "D") return 0.94;
  return 1;
}

function scoreSkillForTrait(skill, traitId) {
  const weights = SKILL_KIND_WEIGHTS[traitId] ?? {};
  return (weights[skill.kind] ?? 0.72) * skillRankScore(skill);
}

function scoreUltimateForTrait(ultimate, traitId) {
  const weights = ULT_TRIGGER_WEIGHTS[traitId] ?? {};
  const triggerScore = weights[ultimate.trigger] ?? 0.75;
  const specialScore = ultimate.specialKind ? weights[ultimate.specialKind] ?? 1 : 1;
  return triggerScore * specialScore;
}

export function pickTraitSkillLoadout(pool, traitId, count = 4, random = Math.random) {
  const available = [...pool];
  const chosen = [];
  let recoverCount = 0;

  while (available.length && chosen.length < count) {
    const pick = weightedPick(
      available,
      (skill) => {
        let score = scoreSkillForTrait(skill, traitId);
        if (skill.kind === "recover" && recoverCount >= 1) score *= 0.08;
        if (chosen.some((item) => item.kind === skill.kind)) score *= 0.72;
        return score;
      },
      random
    );
    if (!pick) break;
    available.splice(available.indexOf(pick), 1);
    if (pick.kind === "recover" && recoverCount >= 1) continue;
    chosen.push(pick);
    if (pick.kind === "recover") recoverCount += 1;
  }

  return chosen;
}

export function pickTraitUltimate(pool, traitId, random = Math.random) {
  return { ...weightedPick(pool, (ultimate) => scoreUltimateForTrait(ultimate, traitId), random) };
}

export function getTraitRaceIntent({ traitId, progress, rank, fieldSize, gapLeader, gapAhead, gapBehind, stamina, phaseKey }) {
  const tail01 = clamp((rank - 1) / Math.max(1, fieldSize - 1), 0, 1);
  const front01 = 1 - tail01;
  const gap01 = clamp(gapLeader / 42, 0, 1.6);
  const closeAhead = gapAhead < Infinity && gapAhead <= 7;
  const safeLead = rank === 1 && gapBehind < Infinity && gapBehind > 7;
  const late = phaseKey === "final" || phaseKey === "climax";

  if (traitId === "front_runner") {
    if (progress < 0.34) {
      return withIntent({
        action: "claim_front",
        label: "선두 선점",
        speedMul: 1,
        flatSpeed: 0,
        drainMul: 1,
        spendDriveMul: 1,
        runWindowMul: 1,
        recoverWindowMul: 1,
        forceRun: false
      });
    }
    if (safeLead && progress < 0.72) {
      return withIntent({
        action: "control_lead",
        label: "선두 페이스 조절",
        speedMul: 1,
        drainMul: 1,
        regenAdd: 0,
        spendDriveMul: 1
      });
    }
    return withIntent({
      action: late ? "defend_front" : "press_front",
      label: late ? "선두 방어" : "앞선 압박",
      speedMul: 1,
      flatSpeed: 0,
      drainMul: late ? 0.96 : 1.02,
      skillChanceMul: rank <= 2 ? 1.08 : 1
    });
  }

  if (traitId === "mid_spender") {
    if (progress < 0.3) {
      return withIntent({
        action: "save_for_middle",
        label: "중반 대비",
        speedMul: 1,
        drainMul: 1,
        regenAdd: 0,
        spendDriveMul: 1,
        recoverWindowMul: 1
      });
    }
    if (progress < 0.72) {
      return withIntent({
        action: "middle_surge",
        label: "중반 승부",
        speedMul: 1.09 + clamp((rank - 1) * 0.005, 0, 0.025),
        flatSpeed: 0.55,
        drainMul: 1.18,
        spendDriveMul: 1.2,
        runWindowMul: 1.18,
        forceRun: false,
        skillChanceMul: 1.12
      });
    }
    return withIntent({
      action: "hang_on",
      label: "남은 힘 버티기",
      speedMul: 0.985,
      drainMul: 0.92,
      fatigueIgnore: 0.02
    });
  }

  if (traitId === "late_runner") {
    if (progress < 0.6) {
      return withIntent({
        action: "wait_late",
        label: "후방 대기",
        speedMul: rank <= Math.ceil(fieldSize * 0.35) ? 0.96 : 0.99,
        drainMul: 0.88,
        regenAdd: 0.001,
        spendDriveMul: 0.86,
        recoverWindowMul: 1.08,
        forceRecover: false
      });
    }
    return withIntent({
      action: "late_charge",
      label: "후반 추격",
      speedMul: 1.12 + clamp(gapLeader / 130, 0, 0.05),
      flatSpeed: 0.62,
      drainMul: 1.18,
      fatigueIgnore: 0.06,
      spendDriveMul: 1.22,
      runWindowMul: 1.12,
      recoverWindowMul: 0.72,
      forceRun: false,
      skillChanceMul: 1.14
    });
  }

  if (traitId === "closer") {
    if (progress < 0.58) {
      return withIntent({
        action: "shadow_pack",
        label: closeAhead ? "슬립 대기" : "후방 축적",
        speedMul: closeAhead ? 0.99 : 0.952,
        drainMul: closeAhead ? 0.94 : 0.88,
        regenAdd: 0.0006,
        spendDriveMul: 0.9,
        skillChanceMul: closeAhead ? 1.08 : 0.98
      });
    }
    return withIntent({
      action: "closing_run",
      label: "외곽 추입",
      speedMul: 0.99 + clamp(gapLeader / 200, 0, 0.015),
      flatSpeed: 0,
      drainMul: 1.06,
      fatigueIgnore: 0.015,
      spendDriveMul: 1.02,
      forceRun: false,
      skillChanceMul: 1.18
    });
  }

  if (traitId === "endurance") {
    return withIntent({
      action: "grind",
      label: late ? "지구력 유지" : "장거리 페이스",
      speedMul: late ? 1.06 : 0.995,
      flatSpeed: late ? 0.32 : 0,
      drainMul: 0.72,
      regenAdd: 0.0018,
      fatigueIgnore: 0.08,
      spendDriveMul: 0.76,
      runWindowMul: 1.12,
      recoverWindowMul: 0.92
    });
  }

  if (traitId === "sprinter") {
    if (progress < 0.68) {
      return withIntent({
        action: "wait_sprint",
        label: "스퍼트 대기",
        speedMul: 0.995,
        drainMul: 1,
        regenAdd: 0,
        spendDriveMul: 1,
        forceRecover: false
      });
    }
    return withIntent({
      action: "sprint",
      label: "직선 폭발",
      speedMul: 1.05 + clamp((1 - progress) * 0.02, 0, 0.01),
      flatSpeed: 0.28,
      drainMul: 1.18,
      fatigueIgnore: 0.035,
      spendDriveMul: 1.08,
      runWindowMul: 1.04,
      recoverWindowMul: 0.82,
      forceRun: stamina > 0.08,
      skillChanceMul: 1.16
    });
  }

  if (traitId === "risk_taker") {
    const swing = lerp(-0.045, 0.145, Math.random());
    return withIntent({
      action: "gamble",
      label: swing >= 0 ? "난전 돌파" : "무리수 흔들림",
      speedMul: 1 + swing,
      flatSpeed: swing > 0.06 ? 0.35 : 0,
      drainMul: 1.08 + Math.max(0, swing) * 1.4,
      varianceMul: 1.14,
      spendDriveMul: 1.18,
      skillChanceMul: 1.12
    });
  }

  if (traitId === "tactician") {
    if (rank <= 2 && gapBehind < 4.5) {
      return withIntent({
        action: "cover_rival",
        label: "상대 견제",
        speedMul: 1.015,
        drainMul: 0.96,
        fatigueIgnore: 0.025,
        skillChanceMul: 1.18
      });
    }
    if (rank > 3 && closeAhead) {
      return withIntent({
        action: "draft_plan",
        label: "슬립스트림 계산",
        speedMul: 1.025,
        drainMul: 0.88,
        regenAdd: 0.001,
        skillChanceMul: 1.22
      });
    }
    return withIntent({
      action: "read_race",
      label: "전개 읽기",
      speedMul: 1.002,
      drainMul: 0.9,
      varianceMul: 0.9,
      fatigueIgnore: 0.035,
      skillChanceMul: 1.16
    });
  }

  if (traitId === "last_fight") {
    const shouldRestInFront = late ? front01 > 0.92 : front01 > 0.78;
    if (rank === fieldSize || (late && rank >= Math.max(2, Math.ceil(fieldSize * 0.45)))) {
      return withIntent({
        action: "last_revenge",
        label: "꼴찌 반격",
      speedMul: 1.22 + clamp(gap01 * 0.08, 0, 0.13),
      flatSpeed: late ? 1.45 : 1.15,
      drainMul: 1.12,
      regenAdd: 0.0014,
      fatigueIgnore: 0.1,
      spendDriveMul: 1.22,
        forceRun: stamina > 0.08,
        skillChanceMul: 1.2
      });
    }
    return withIntent({
      action: "avoid_front",
      label: shouldRestInFront ? "앞자리 숨고르기" : "반격 준비",
      speedMul: shouldRestInFront ? 0.99 : late ? 1.13 : 1.06,
      flatSpeed: !shouldRestInFront && late ? 0.5 : 0,
      drainMul: shouldRestInFront ? 0.84 : 0.95,
      regenAdd: 0.0012,
      spendDriveMul: shouldRestInFront ? 0.78 : 0.98
    });
  }

  return withIntent({
    action: "steady",
    label: "안정 운행",
    speedMul: 1.015,
    drainMul: 0.86,
    regenAdd: 0.0012,
    varianceMul: 0.82,
    fatigueIgnore: 0.04,
    spendDriveMul: 0.82,
    skillChanceMul: 0.98
  });
}

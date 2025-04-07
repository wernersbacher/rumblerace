import { Driver } from '../models/driver.model';
import { SkillSet } from '../models/skills.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';

export function mergeSkills(
  base: SkillSet,
  specific?: Partial<SkillSet>,
  hardwareBonus?: Partial<SkillSet>
): SkillSet {
  const merged: SkillSet = { ...base };

  // Apply base skills
  for (const key in base) {
    const typedKey = key as keyof SkillSet;

    // Apply vehicle-specific skills (30% effectiveness)
    const specificBonus = specific?.[typedKey] ?? 0;
    merged[typedKey] = base[typedKey] + specificBonus * 0.3;

    // Apply hardware bonuses (full effectiveness)
    if (hardwareBonus && hardwareBonus[typedKey]) {
      merged[typedKey] += hardwareBonus[typedKey] || 0;
    }
  }

  return merged;
}

export function calculateLapTime(
  driver: Driver,
  track: Track,
  vehicleClass: VehicleClass,
  hardwareBonus: Partial<SkillSet> = {}
): number {
  const specific = driver.specificSkills[vehicleClass];
  const skills = mergeSkills(driver.skills, specific, hardwareBonus);

  const refTime =
    track.referenceLapTimes[
      vehicleClass as keyof typeof track.referenceLapTimes
    ];

  const totalSections =
    track.slowCorners +
    track.mediumCorners +
    track.fastCorners +
    track.straights;

  const cornerSkillFactor = {
    slow: skills.linesAndApex * 0.07 + skills.throttleControl * 0.03,
    medium: skills.linesAndApex * 0.06 + skills.brakeControl * 0.04,
    fast: skills.linesAndApex * 0.05 + skills.trackAwareness * 0.03,
  };

  const slowTime = track.slowCorners * (1 - cornerSkillFactor.slow);
  const mediumTime = track.mediumCorners * (1 - cornerSkillFactor.medium);
  const fastTime = track.fastCorners * (1 - cornerSkillFactor.fast);
  const straightTime = track.straights;

  const totalRelativeTime = slowTime + mediumTime + fastTime + straightTime;
  const timeScalingFactor = refTime! / totalSections;

  let rawTime = totalRelativeTime * timeScalingFactor;

  const consistencyBonus = 1 - Math.min(0.05, skills.consistency * 0.05);
  rawTime *= consistencyBonus;

  return Math.round(rawTime * 1000) / 1000;
}

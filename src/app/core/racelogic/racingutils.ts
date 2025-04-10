import { RaceDriver } from '../models/race.model';
import { Track } from '../models/track.model';
import { DirtyAirCharacteristics } from '../models/vehicle.model';
import { SIMCONFIG } from './simulation';

export class RacingUtils {
  /**
   * Calculates the minimum time gap based on vehicle characteristics,
   * driver defense skill, and track dirty air factor
   */
  static calculateMinTimeGap(
    aeroCharacteristics: DirtyAirCharacteristics,
    defenderRacecraftDefense: number,
    trackDirtyAirFactor: number
  ): number {
    return (
      aeroCharacteristics.minFollowingTimeGap *
      (1 + defenderRacecraftDefense * 0.1) *
      trackDirtyAirFactor
    );
  }

  /**
   * Calculates track dirty air factor based on corner composition
   */
  static calculateTrackDirtyAirFactor(track: Track): number {
    // Base factor - higher values mean more dirty air effect
    const totalCorners =
      track.slowCorners + track.mediumCorners + track.fastCorners;

    // Slow corners create more dirty air problems than fast corners
    const cornerWeightedSum =
      track.slowCorners * 1.5 +
      track.mediumCorners * 1.0 +
      track.fastCorners * 0.7;

    // More straights means more opportunity for slipstream and recovery
    const straightsEffect = Math.max(0.6, 1.0 - (track.straights / 15) * 0.4);

    // Calculate dirty air factor
    return (cornerWeightedSum / totalCorners) * straightsEffect;
  }

  /**
   * Calculates the base chance of a successful overtake based on driver skills
   */
  static calculateBaseOvertakeChance(
    driver: RaceDriver,
    driverAhead: RaceDriver
  ): number {
    const baseChance =
      (driver.aggression * driver.racecraft.attack) /
      driverAhead.racecraft.defense;

    // Set reasonable minimum and maximum chances
    return (
      Math.min(Math.max(baseChance, 0.1), 0.5) +
      SIMCONFIG.OVERTAKE_BASE_CHANCE_PER_TICK
    );
  }
}

import { RaceDriver } from '../models/race.model';
import { SIMCONFIG } from './simulation';
import { Track } from '../models/track.model';
import { RacingUtils } from './racingutils';

// Helper function to create test drivers
function createTestDriver(
  aggression: number,
  attackSkill: number,
  defenseSkill: number
): RaceDriver {
  return {
    id: 0,
    driver: {
      name: 'Test Driver',
      xp: 0,
      skills: {},
      specificSkills: {},
    },
    baseLapTime: 60,
    damage: 0,
    aggression: aggression,
    racecraft: {
      attack: attackSkill,
      defense: defenseSkill,
    },
    isPlayer: false,
    currentLap: 1,
    trackPosition: 0,
    finished: false,
    totalTime: 0,
    overtakeCooldown: 0,
  } as RaceDriver;
}

describe('Race Static Methods', () => {
  describe('calculateMinTimeGap', () => {
    it('should calculate minimum time gap correctly', () => {
      const aeroCharacteristics = {
        minFollowingTimeGap: 0.5,
        dirtyAirSensitivity: 0.8,
      };
      const defenderDefense = 0.8;
      const trackDirtyAirFactor = 1.2;

      const result = RacingUtils.calculateMinTimeGap(
        aeroCharacteristics,
        defenderDefense,
        trackDirtyAirFactor
      );

      // Expected: 0.5 * (1 + 0.8 * 0.1) * 1.2 = 0.5 * 1.08 * 1.2 = 0.648
      expect(result).toBeCloseTo(0.648);
    });

    it('should handle edge cases', () => {
      // Zero defense skill
      expect(
        RacingUtils.calculateMinTimeGap(
          { minFollowingTimeGap: 0.5, dirtyAirSensitivity: 0.8 },
          0,
          1.0
        )
      ).toBeCloseTo(0.5);

      // Zero dirty air factor (impossible in reality, but testing edge case)
      expect(
        RacingUtils.calculateMinTimeGap(
          { minFollowingTimeGap: 0.5, dirtyAirSensitivity: 0.8 },
          0.8,
          0
        )
      ).toBeCloseTo(0);
    });
  });

  describe('calculateTrackDirtyAirFactor', () => {
    it('should calculate dirty air factor for balanced track', () => {
      const track: Track = {
        id: 'test-track',
        name: 'Test Track',
        lengthMeters: 5000,
        slowCorners: 3,
        mediumCorners: 3,
        fastCorners: 3,
        straights: 3,
        country: 'Test',
        difficulty: 3,
        referenceLapTimes: { GT3: 120 },
      };

      const result = RacingUtils.calculateTrackDirtyAirFactor(track);

      // Expected calculation for balanced track:
      // cornerWeightedSum = (3*1.5) + (3*1.0) + (3*0.7) = 4.5 + 3 + 2.1 = 9.6
      // totalCorners = 3 + 3 + 3 = 9
      // straightsEffect = max(0.6, 1 - (3/15)*0.4) = max(0.6, 1 - 0.08) = max(0.6, 0.92) = 0.92
      // result = (9.6/9) * 0.92 ≈ 1.067 * 0.92 ≈ 0.982
      expect(result).toBeCloseTo(0.9813, 2);
    });

    it('should calculate higher dirty air factor for track with many slow corners', () => {
      const slowTrack: Track = {
        id: 'slow-track',
        name: 'Slow Track',
        lengthMeters: 5000,
        slowCorners: 8,
        mediumCorners: 1,
        fastCorners: 1,
        straights: 2,
        country: 'Test',
        difficulty: 4,
        referenceLapTimes: { GT3: 120 },
      };

      const result = RacingUtils.calculateTrackDirtyAirFactor(slowTrack);

      // This should be higher than the balanced track
      expect(result).toBeGreaterThan(1.0);
    });
  });

  describe('calculateBaseOvertakeChance', () => {
    it('should calculate overtake chance based on driver skills', () => {
      // Create driver objects instead of using raw values
      const attacker = createTestDriver(4, 0.9, 0.5);
      const defender = createTestDriver(2, 0.5, 0.6);

      // Set expected base chance
      const originalBaseChance = SIMCONFIG.OVERTAKE_BASE_CHANCE_PER_TICK;
      SIMCONFIG.OVERTAKE_BASE_CHANCE_PER_TICK = 0.003;

      const result = RacingUtils.calculateBaseOvertakeChance(
        attacker,
        defender
      );

      // Expected: min(max((4*0.9)/0.6, 0.1), 0.5) + 0.003 = min(max(6, 0.1), 0.5) + 0.003 = 0.5 + 0.003 = 0.503
      expect(result).toBeCloseTo(0.503);

      // Reset base chance for other tests
      SIMCONFIG.OVERTAKE_BASE_CHANCE_PER_TICK = originalBaseChance;
    });

    it('should respect minimum and maximum thresholds', () => {
      // Store original value to restore later
      const originalBaseChance = SIMCONFIG.OVERTAKE_BASE_CHANCE_PER_TICK;
      SIMCONFIG.OVERTAKE_BASE_CHANCE_PER_TICK = 0.003;

      // Test minimum threshold (weak attacker vs strong defender)
      const weakAttacker = createTestDriver(1, 0.1, 0.5);
      const strongDefender = createTestDriver(3, 0.5, 5.0);

      const minResult = RacingUtils.calculateBaseOvertakeChance(
        weakAttacker,
        strongDefender
      );
      expect(minResult).toBeCloseTo(0.103); // 0.1 (min) + 0.003

      // Test maximum threshold (strong attacker vs weak defender)
      const strongAttacker = createTestDriver(5, 1.0, 0.5);
      const weakDefender = createTestDriver(1, 0.3, 0.1);

      const maxResult = RacingUtils.calculateBaseOvertakeChance(
        strongAttacker,
        weakDefender
      );
      expect(maxResult).toBeCloseTo(0.503); // 0.5 (max) + 0.003

      // Restore original value
      SIMCONFIG.OVERTAKE_BASE_CHANCE_PER_TICK = originalBaseChance;
    });
  });
});

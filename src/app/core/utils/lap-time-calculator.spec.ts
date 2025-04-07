import { calculateLapTime, mergeSkills } from './lap-time-calculator';
import { Driver } from '../models/driver.model';
import { SkillSet } from '../models/skills.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';

describe('mergeSkills', () => {
  let baseSkills: SkillSet;

  beforeEach(() => {
    baseSkills = {
      linesAndApex: 0.5,
      brakeControl: 0.4,
      throttleControl: 0.3,
      consistency: 0.6,
      tireManagement: 0.2,
      racecraft: 0.3,
      setupUnderstanding: 0.1,
      trackAwareness: 0.4,
      adaptability: 0.2,
    };
  });

  it('should return base skills when no specific or hardware bonuses are provided', () => {
    const result = mergeSkills(baseSkills);
    expect(result).toEqual(baseSkills);
  });

  it('should apply vehicle-specific skills at 30% effectiveness', () => {
    const specificSkills: Partial<SkillSet> = {
      linesAndApex: 0.2,
      brakeControl: 0.3,
    };

    const result = mergeSkills(baseSkills, specificSkills);

    expect(result.linesAndApex).toBeCloseTo(0.5 + 0.2 * 0.3, 5);
    expect(result.brakeControl).toBeCloseTo(0.4 + 0.3 * 0.3, 5);
    expect(result.throttleControl).toBe(0.3); // Unchanged
  });

  it('should apply hardware bonuses at full effectiveness', () => {
    const hardwareBonus: Partial<SkillSet> = {
      linesAndApex: 0.1,
      throttleControl: 0.2,
    };

    const result = mergeSkills(baseSkills, undefined, hardwareBonus);

    expect(result.linesAndApex).toBeCloseTo(0.5 + 0.1, 5);
    expect(result.throttleControl).toBeCloseTo(0.3 + 0.2, 5);
    expect(result.brakeControl).toBe(0.4); // Unchanged
  });

  it('should combine base, specific, and hardware bonuses correctly', () => {
    const specificSkills: Partial<SkillSet> = {
      linesAndApex: 0.2,
      brakeControl: 0.3,
    };

    const hardwareBonus: Partial<SkillSet> = {
      linesAndApex: 0.1,
      throttleControl: 0.2,
    };

    const result = mergeSkills(baseSkills, specificSkills, hardwareBonus);

    expect(result.linesAndApex).toBeCloseTo(0.5 + 0.2 * 0.3 + 0.1, 5);
    expect(result.brakeControl).toBeCloseTo(0.4 + 0.3 * 0.3, 5);
    expect(result.throttleControl).toBeCloseTo(0.3 + 0.2, 5);
  });
});

describe('calculateLapTime', () => {
  // Mock data
  let driver: Driver;
  let track: Track;

  beforeEach(() => {
    driver = {
      name: 'Test Driver',
      xp: 1000,
      skills: {
        linesAndApex: 0.5,
        brakeControl: 0.4,
        throttleControl: 0.3,
        consistency: 0.6,
        tireManagement: 0.2,
        racecraft: 0.3,
        setupUnderstanding: 0.1,
        trackAwareness: 0.4,
        adaptability: 0.2,
      },
      specificSkills: {
        [VehicleClass.GT3]: {
          linesAndApex: 0.3,
          brakeControl: 0.2,
        },
      },
    };

    track = {
      id: 'test-track',
      name: 'Test Track',
      slowCorners: 5,
      mediumCorners: 6,
      fastCorners: 3,
      straights: 4,
      referenceLapTimes: {
        [VehicleClass.GT3]: 90, // 1:30.000
        [VehicleClass.GT4]: 100, // 1:40.000
      },
      difficulty: 7,
    };
  });

  it('should calculate lap time correctly with no hardware bonus', () => {
    const lapTime = calculateLapTime(driver, track, VehicleClass.GT3);

    // We can't predict the exact value due to complex calculations,
    // but we can check it's a reasonable number and rounded to 3 decimals
    expect(lapTime).toBeGreaterThan(80);
    expect(lapTime).toBeLessThan(100);
    expect(Math.round(lapTime * 1000) / 1000).toBe(lapTime);
  });

  it('should calculate lap time correctly with hardware bonus', () => {
    const hardwareBonus: Partial<SkillSet> = {
      linesAndApex: 0.1,
      throttleControl: 0.1,
    };

    const lapTimeWithoutBonus = calculateLapTime(
      driver,
      track,
      VehicleClass.GT3
    );
    const lapTimeWithBonus = calculateLapTime(
      driver,
      track,
      VehicleClass.GT3,
      hardwareBonus
    );

    // With better hardware, lap time should be faster
    expect(lapTimeWithBonus).toBeLessThan(lapTimeWithoutBonus);
  });

  it('should use different reference times for different vehicle classes', () => {
    const gt3Time = calculateLapTime(driver, track, VehicleClass.GT3);
    const gt4Time = calculateLapTime(driver, track, VehicleClass.GT4);

    // GT4 should be slower than GT3
    expect(gt4Time).toBeGreaterThan(gt3Time);
  });

  it('should apply consistency bonus correctly', () => {
    // Create a driver with different consistency
    const consistentDriver = { ...driver };
    consistentDriver.skills = { ...driver.skills, consistency: 1.0 };

    const regularTime = calculateLapTime(driver, track, VehicleClass.GT3);
    const consistentTime = calculateLapTime(
      consistentDriver,
      track,
      VehicleClass.GT3
    );

    // More consistent driver should be faster
    expect(consistentTime).toBeLessThan(regularTime);

    // Calculate maximum consistency bonus (5%)
    const expectedMaxBonus = regularTime * 0.05;
    const actualDifference = regularTime - consistentTime;

    // The difference should be at most 5% of regular time
    expect(actualDifference).toBeLessThanOrEqual(expectedMaxBonus + 0.001); // Small epsilon for floating point
  });

  it('should give different lap times for tracks with different configurations', () => {
    const technicalTrack: Track = {
      ...track,
      slowCorners: 10,
      mediumCorners: 4,
      fastCorners: 2,
      straights: 2,
    };

    const fastTrack: Track = {
      ...track,
      slowCorners: 2,
      mediumCorners: 3,
      fastCorners: 8,
      straights: 5,
    };

    const standardTime = calculateLapTime(driver, track, VehicleClass.GT3);
    const technicalTime = calculateLapTime(
      driver,
      technicalTrack,
      VehicleClass.GT3
    );
    const fastTrackTime = calculateLapTime(driver, fastTrack, VehicleClass.GT3);

    // Different track configurations should lead to different lap times
    expect(technicalTime).not.toEqual(standardTime);
    expect(fastTrackTime).not.toEqual(standardTime);
  });
});

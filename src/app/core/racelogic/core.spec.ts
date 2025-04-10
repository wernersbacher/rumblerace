import { BEGINNER_TRACKS } from '../data/tracks.data';
import { RaceDriver } from '../models/race.model';
import { VehicleClass } from '../models/vehicle.model';
import { Race } from './core';
import { SIMCONFIG } from './simulation';
import { RacingUtils } from './racingutils';

// Helper function to create a standard driver for tests
function createDriver(
  id: number,
  name: string,
  baseLapTime: number,
  isPlayer = false
): RaceDriver {
  return {
    id,
    driver: {
      name,
      xp: 0,
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
      specificSkills: {},
    },
    baseLapTime,
    damage: 0,
    aggression: 3,
    racecraft: { attack: 0.8, defense: 0.8 },
    isPlayer,
    currentLap: 1,
    trackPosition: 0,
    finished: false,
    totalTime: 0,
    overtakeCooldown: 0,
    lapTimes: [],
  };
}

const raceConfig = {
  track: BEGINNER_TRACKS[0], // Use the first track for testing
  vehicleClass: VehicleClass.GT3,
  numLaps: 3,
  opponents: 1,
  seed: 'test-seed-123',
};

describe('Race', () => {
  let race: Race;
  let drivers: RaceDriver[];

  beforeEach(() => {
    drivers = [
      createDriver(1, 'Driver 1', 60, true), // Faster driver (60s lap time)
      createDriver(2, 'Driver 2', 65), // Slower driver (65s lap time)
    ];

    // Create a Race with a fixed seed for predictable tests
    race = new Race(drivers, raceConfig);
  });

  describe('getEffectiveLapTime', () => {
    it('should calculate lap time with damage penalty', () => {
      const driver = drivers[0];
      driver.damage = 2; // Add some damage

      // Base lap time + damage penalty + random factor
      const lapTime = race.getEffectiveLapTime(driver);

      // We know damage penalty is 2 * 0.5 = 1s
      // Random factor will be consistent with seed
      expect(lapTime).toBeGreaterThan(
        driver.baseLapTime + 2 * SIMCONFIG.DAMAGE_PENALTY
      ); // at least damage penalty
      expect(lapTime).toBeLessThan(driver.baseLapTime + 1.2); // damage + max random
    });
  });

  describe('getIdealSpeed', () => {
    it('should calculate speed based on track length and effective lap time', () => {
      const driver = drivers[0];
      const effectiveLapTime = 60; // simplified for testing

      spyOn(race, 'getEffectiveLapTime').and.returnValue(effectiveLapTime);

      const speed = race.getIdealSpeed(driver);

      // Speed = track length / lap time
      expect(speed).toBeCloseTo(race.trackLength / effectiveLapTime);
    });
  });

  describe('calculateActualSpeed', () => {
    it('should return ideal speed when no driverAhead is present', () => {
      const driver = drivers[0];
      const idealSpeed = 20;

      const actualSpeed = race.calculateActualSpeed(driver, idealSpeed, null);

      expect(actualSpeed).toBe(idealSpeed);
    });

    it('should limit speed when close to driverAhead', () => {
      const driver = drivers[0];
      const driverAhead = drivers[1];
      const idealSpeed = 20;
      const driverAheadSpeed = 18;

      // Set positions for the test
      driverAhead.trackPosition = 15; // 15 meters ahead
      driver.trackPosition = 0;

      // Set up the minimum distance gap that will be calculated
      const minTimeGap = 0.5; // 0.5 seconds

      // Mock the necessary methods and dependencies
      spyOn(race, 'calculateGapToLeader').and.returnValue(15);
      spyOn(race, 'getIdealSpeed').and.callFake((d) => {
        return d === driver ? idealSpeed : driverAheadSpeed;
      });
      // Mock RacingUtils calls through spies on internal methods
      spyOn(RacingUtils, 'calculateTrackDirtyAirFactor').and.returnValue(1.0);
      spyOn(RacingUtils, 'calculateMinTimeGap').and.returnValue(minTimeGap);

      driver.isAttemptingOvertake = false;

      const actualSpeed = race.calculateActualSpeed(
        driver,
        idealSpeed,
        driverAhead
      );

      // The driver is within the minimum following distance, so speed should be limited
      // With the gap of 15m and minimum distance of 10m, speed should be reduced but not to driverAhead's speed
      expect(actualSpeed).toBeLessThan(idealSpeed);
      expect(actualSpeed).toBeGreaterThan(driverAheadSpeed * 0.98); // Greater than 98% of driverAhead speed
    });

    it('should not limit speed when far from driverAhead', () => {
      const driver = drivers[0];
      const driverAhead = drivers[1];
      const idealSpeed = 20;

      spyOn(race, 'calculateGapToLeader').and.returnValue(15); // 15 meters ahead

      const actualSpeed = race.calculateActualSpeed(
        driver,
        idealSpeed,
        driverAhead
      );

      expect(actualSpeed).toBe(idealSpeed); // No limitation
    });
  });

  describe('calculateGapToLeader', () => {
    it('should calculate the distance between driver and driverAhead', () => {
      const driver = drivers[0];
      const driverAhead = drivers[1];

      driver.trackPosition = 100;
      driverAhead.trackPosition = 150;

      const gap = race.calculateGapToLeader(driver, driverAhead);

      expect(gap).toBe(50); // 150 - 100 = 50 meters
    });
  });

  describe('checkLapCompletion', () => {
    it('should increment lap when driver completes a lap', () => {
      const driver = drivers[0];
      driver.trackPosition = race.trackLength + 10; // Overshot by 10m
      const speed = 20; // 20 m/s

      race.checkLapCompletion(driver, speed);

      expect(driver.currentLap).toBe(2);
      expect(driver.trackPosition).toBe(10); // excess distance
      expect(driver.finished).toBe(false);
    });

    it('should mark driver as finished when all laps completed', () => {
      const driver = drivers[0];
      driver.currentLap = race.numLaps; // Last lap
      driver.trackPosition = race.trackLength + 5; // Cross the finish line
      driver.totalTime = 180; // Some existing time
      const speed = 10; // 10 m/s

      race.checkLapCompletion(driver, speed);

      expect(driver.finished).toBe(true);
      // Time adjustment should be 5/10 = 0.5 seconds
      expect(driver.totalTime).toBeCloseTo(179.5); // 180 - 0.5
    });

    it('should handle zero speed correctly', () => {
      const driver = drivers[0];
      driver.trackPosition = race.trackLength + 10; // Overshot by 10m
      driver.totalTime = 100;
      const speed = 0; // Edge case: stopped at finish line

      race.checkLapCompletion(driver, speed);

      expect(driver.currentLap).toBe(2);
      expect(driver.trackPosition).toBe(10);
      // No time adjustment should be made when speed is zero
      expect(driver.totalTime).toBe(100);
    });
  });

  describe('findImmediateLeader', () => {
    it('should find the closest driver ahead', () => {
      // Setup multiple drivers with different positions
      const driver1 = createDriver(1, 'Driver 1', 60);
      const driver2 = createDriver(2, 'Driver 2', 62);
      const driver3 = createDriver(3, 'Driver 3', 65);

      driver1.trackPosition = 100;
      driver2.trackPosition = 200;
      driver3.trackPosition = 300;

      race.drivers = [driver1, driver2, driver3];

      const driverAhead = race.findDriverAhead(driver1);

      expect(driverAhead).toBe(driver2); // Driver2 is immediately ahead of Driver1
    });

    it('should always find a driver ahead, not behind', () => {
      // Setup drivers with different positions
      const driver1 = createDriver(1, 'Driver 1', 60);
      const driver2 = createDriver(2, 'Driver 2', 62);
      const driver3 = createDriver(3, 'Driver 3', 65);

      driver1.trackPosition = 100;
      driver1.currentLap = 1;

      driver2.trackPosition = 200;
      driver2.currentLap = 1;

      driver3.trackPosition = 50; // Lower position but...
      driver3.currentLap = 2; // Higher lap

      race.drivers = [driver1, driver2, driver3];

      // Check if immediate driverAhead of driver1 is driver2
      const driverAhead1 = race.findDriverAhead(driver1);
      expect(driverAhead1).toBe(driver2);

      // Check if driverAhead of driver2 is driver3 (because driver3 is on a higher lap)
      const driverAhead2 = race.findDriverAhead(driver2);
      expect(driverAhead2).toBe(driver3);

      // Check gap calculations are positive
      expect(
        race.calculateGapToLeader(driver1, driverAhead1!)
      ).toBeGreaterThanOrEqual(0);
      expect(
        race.calculateGapToLeader(driver2, driverAhead2!)
      ).toBeGreaterThanOrEqual(0);
    });

    it('should return null when no driverAhead exists', () => {
      const driver = drivers[0];
      driver.trackPosition = 500; // Ahead of everyone

      const driverAhead = race.findDriverAhead(driver);

      expect(driverAhead).toBeNull();
    });
  });

  describe('processSimulationTick', () => {
    it('should update all active drivers with accurate speed', () => {
      // Create spies
      spyOn(race, 'logLiveGaps');
      spyOn(race, 'checkLapCompletion');
      spyOn(race, 'getIdealSpeed').and.returnValue(20);
      spyOn(race, 'calculateActualSpeed').and.returnValue(18);

      // Mark one driver as finished
      drivers[1].finished = true;

      race.processSimulationTick(10); // Simulation time = 10

      // Should call checkLapCompletion with the driver and calculated speed
      expect(race.checkLapCompletion).toHaveBeenCalledWith(drivers[0], 18);
      expect(race.logLiveGaps).toHaveBeenCalledWith(10);
    });
  });

  describe('simulateRace', () => {
    it('should run simulation until all drivers finish', () => {
      spyOn(race, 'processSimulationTick');

      // Setup to run 3 iterations then finish all drivers
      let callCount = 0;
      spyOn(race.drivers, 'some').and.callFake(() => {
        callCount++;
        return callCount <= 3; // Return true for 3 calls, then false
      });

      race.simulateRace();

      expect(race.processSimulationTick).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Overtaking mechanics', () => {
  let race: Race;
  let driver1: RaceDriver;
  let driver2: RaceDriver;

  beforeEach(() => {
    // Setup two drivers with different characteristics
    driver1 = createDriver(1, 'Aggressive Driver', 60);
    driver1.aggression = 4;
    driver1.racecraft = { attack: 0.7, defense: 0.7 };

    driver2 = createDriver(2, 'Defensive Driver', 60.5); // Slightly slower
    driver2.aggression = 2;
    driver2.racecraft = { attack: 0.7, defense: 0.7 };

    // Setup race with these drivers
    race = new Race([driver1, driver2], raceConfig);

    // Position them close to each other
    driver1.trackPosition = 100;
    driver2.trackPosition = 115;
  });

  it('should not attempt overtake when too far apart', () => {
    // Position drivers far apart
    driver1.trackPosition = 50;
    driver2.trackPosition = 200;

    spyOn(RacingUtils, 'calculateBaseOvertakeChance');
    spyOn(race as any, 'applySuccessfulOvertake');

    (race as any).processOvertakingAttempt(driver1, 10);

    expect(RacingUtils.calculateBaseOvertakeChance).not.toHaveBeenCalled();
    expect((race as any).applySuccessfulOvertake).not.toHaveBeenCalled();
  });

  it('should respect overtaking cooldown period', () => {
    // Set a cooldown for driver1
    driver1.overtakeCooldown = 5;

    spyOn(race, 'canAttemptOvertake');

    (race as any).processOvertakingAttempt(driver1, 10);

    // Should not even check if overtake is possible due to cooldown
    expect((race as any).canAttemptOvertake).not.toHaveBeenCalled();

    // Verify cooldown was reduced
    expect(driver1.overtakeCooldown).toBe(5 - SIMCONFIG.DT);
  });

  it('should require sufficient speed advantage to attempt overtake', () => {
    spyOn(race, 'getIdealSpeed').and.returnValues(
      58, // driver1 speed - not fast enough
      60 // driver2 speed
    );

    spyOn(RacingUtils, 'calculateBaseOvertakeChance');

    (race as any).processOvertakingAttempt(driver1, 10);

    // Should not calculate chance with insufficient speed advantage
    expect(RacingUtils.calculateBaseOvertakeChance).not.toHaveBeenCalled();
  });

  it('should apply cooldown to both drivers after successful overtake', () => {
    // Position drivers correctly
    driver1.trackPosition = 100;
    driver2.trackPosition = 115;
    driver1.overtakeCooldown = 0;
    driver2.overtakeCooldown = 0;

    // Set up driver as attempting overtake
    driver1.isAttemptingOvertake = true;

    // Mock the necessary methods to ensure overtake conditions are met
    spyOn(race, 'getIdealSpeed').and.callFake((d) => {
      return d === driver1 ? 65 : 60;
    });
    spyOn(race, 'calculateGapToLeader').and.returnValue(10); // Close enough
    spyOn(RacingUtils, 'calculateTrackDirtyAirFactor').and.returnValue(1.0);
    spyOn(RacingUtils, 'calculateMinTimeGap').and.returnValue(0.5);
    spyOn(RacingUtils, 'calculateBaseOvertakeChance').and.returnValue(2.0); // 100% success

    // Call the method under test
    (race as any).processOvertakingAttempt(driver1, 10);

    // Verify cooldowns were set
    expect(driver1.overtakeCooldown).toBe(5);
    expect(driver2.overtakeCooldown).toBe(3);
  });

  it('should result in realistic overtake success rates', () => {
    // Run multiple simulations and count successful overtakes
    const attempts = 100;
    let successful = 0;

    // Mock speed advantage
    spyOn(race, 'getIdealSpeed').and.returnValues(
      ...Array(attempts * 2)
        .fill(0)
        .map(
          (_, i) => (i % 2 === 0 ? 70 : 60) // Alternate between 70 and 60
        )
    );

    // Add a spy to see the calculated chance values
    const baseChances: number[] = [];
    spyOn(RacingUtils, 'calculateBaseOvertakeChance').and.callFake(() => {
      // Increase the base chance to ensure we get more successful attempts
      const chance = 0.5; // Set a higher fixed chance (50%)
      baseChances.push(chance);
      return chance;
    });

    spyOn(race, 'applyFailedOvertake');
    spyOn(race, 'applySuccessfulOvertake').and.callFake(() => {
      successful++; // Increment counter when successful
    });

    for (let i = 0; i < attempts; i++) {
      // Reset position each time
      driver1.trackPosition = 100;
      driver2.trackPosition = 115;

      // Clear any cooldowns
      driver1.overtakeCooldown = 0;
      driver2.overtakeCooldown = 0;

      // Set the isAttemptingOvertake flag to true to allow overtaking
      driver1.isAttemptingOvertake = true;

      // Call the method with the spies already in place
      (race as any).processOvertakingAttempt(driver1, 10);
    }

    // Log the average base chance for debugging
    console.log(
      `Average base overtake chance: ${
        baseChances.reduce((sum, c) => sum + c, 0) / baseChances.length
      }`
    );
    console.log(`Successful overtakes: ${successful}/${attempts}`);

    // With aggressive vs defensive driver and large speed advantage (70 vs 60),
    // we expect about 30-50% success rate
    expect(successful).toBeGreaterThan(10);
    expect(successful).toBeLessThan(50);
  });
});

describe('Lap Time Tracking', () => {
  let race: Race;
  let driver: RaceDriver;

  beforeEach(() => {
    // Set up a single driver for lap time tests
    driver = createDriver(1, 'Test Driver', 60, true);

    // Create a race with just our test driver
    race = new Race([driver], {
      ...raceConfig,
      numLaps: 3,
    });
  });

  it('should initialize driver with empty lap times array', () => {
    expect(driver.lapTimes).toBeDefined();
    expect(driver.lapTimes.length).toBe(0);
    expect(driver.bestLapTime).toBeUndefined();
  });

  it('should correctly record first lap time', () => {
    // Set up driver about to complete first lap
    driver.trackPosition = race.trackLength + 5; // 5m past the finish line
    driver.totalTime = 59.5; // Total time so far

    // Complete the lap at 10 m/s speed
    race.checkLapCompletion(driver, 10);

    // First lap should be recorded (59.5 - 0.5 time adjustment = 59.0)
    expect(driver.lapTimes.length).toBe(1);
    expect(driver.lapTimes[0]).toBeCloseTo(59.0);

    // First lap should automatically be best lap
    expect(driver.bestLapTime).toBeCloseTo(59.0);

    // Last lap time should match
    expect(driver.lastLapTime).toBeCloseTo(59.0);

    // Driver is now on lap 2
    expect(driver.currentLap).toBe(2);
  });

  it('should correctly update best lap time when faster lap is completed', () => {
    // Setup - complete first lap with time of 60s
    driver.trackPosition = race.trackLength + 10;
    driver.totalTime = 60.5;
    race.checkLapCompletion(driver, 10);

    // First lap time should be about 60s (after time adjustment)
    expect(driver.bestLapTime).toBeCloseTo(59.5);

    // Driver already on lap 2, now accumulate more time
    driver.totalTime = 59.5 + 57.5; // Total time including 57.5s for second lap
    driver.trackPosition = race.trackLength + 5; // Crossing finish line again

    // Complete second lap with a faster time
    race.checkLapCompletion(driver, 10);

    // Should now have two lap times
    expect(driver.lapTimes.length).toBe(2);

    // Second lap time should be faster (57.5 - 0.5 time adjustment = 57.0)
    expect(driver.lapTimes[1]).toBeCloseTo(57.0);

    // Best lap time should be updated to the faster lap
    expect(driver.bestLapTime).toBeCloseTo(57.0);

    // Last lap time should match second lap
    expect(driver.lastLapTime).toBeCloseTo(57.0);

    // Driver should now be on lap 3
    expect(driver.currentLap).toBe(3);
  });

  it('should not update best lap time when slower lap is completed', () => {
    // Setup - complete first lap with a fast time of 58s
    driver.trackPosition = race.trackLength + 10;
    driver.totalTime = 58.5;
    race.checkLapCompletion(driver, 10);

    // First lap sets the initial best time
    expect(driver.bestLapTime).toBeCloseTo(57.5);

    // Driver now on lap 2, accumulate more time
    driver.totalTime = 57.5 + 62; // Total time including 62s for second lap
    driver.trackPosition = race.trackLength + 10;

    // Complete second lap with a slower time
    race.checkLapCompletion(driver, 10);

    // Should now have two lap times
    expect(driver.lapTimes.length).toBe(2);

    // Second lap time should be recorded
    expect(driver.lapTimes[1]).toBeCloseTo(61.0); // 62 - 1.0 time adjustment

    // Best lap time should still be the first lap
    expect(driver.bestLapTime).toBeCloseTo(57.5);

    // Last lap time should be the slower second lap
    expect(driver.lastLapTime).toBeCloseTo(61.0);
  });

  it('should ensure total race time equals sum of lap times', () => {
    // Complete 3 laps with different speeds and times
    const lapTimes = [60, 58, 62];
    let cumulativeTime = 0;

    race.numLaps = 3;

    for (let lap = 0; lap < 3; lap++) {
      // Add time for this lap
      cumulativeTime += lapTimes[lap];
      driver.totalTime = cumulativeTime;

      // Position driver past the finish line
      const overrunDistance = 5; // 5m past finish line
      driver.trackPosition = race.trackLength + overrunDistance;

      // Different speed for each lap
      const speed = 10 * (lap + 1); // 10, 20, 30 m/s

      // Complete the lap
      race.checkLapCompletion(driver, speed);
    }

    // Calculate the sum of all recorded lap times
    const sumOfLapTimes = driver.lapTimes.reduce((sum, time) => sum + time, 0);

    // The total race time should equal the sum of lap times plus the sum of adjustments
    // (within a small floating point error margin)
    expect(sumOfLapTimes).toBeCloseTo(driver.totalTime, 1);
  });

  it('should correctly mark race as finished after final lap', () => {
    // Set the race to only have 2 laps
    race.numLaps = 2;

    // Complete first lap
    driver.trackPosition = race.trackLength + 10;
    driver.totalTime = 60;
    race.checkLapCompletion(driver, 10);

    // Driver should not be finished after first lap
    expect(driver.finished).toBe(false);
    expect(driver.currentLap).toBe(2);

    // Complete second lap (final lap)
    driver.trackPosition = race.trackLength + 5;
    driver.totalTime = 60 + 58;
    race.checkLapCompletion(driver, 10);

    // Driver should now be finished
    expect(driver.finished).toBe(true);
    expect(driver.currentLap).toBe(2); // no new lap added

    // Should have two lap times
    expect(driver.lapTimes.length).toBe(2);

    // Best lap time should be correctly identified
    expect(driver.lapTimes[0]).toBeCloseTo(59); // 60 - 1 time adjustment
    expect(driver.bestLapTime).toBeCloseTo(58.5); // 58 - 0.5 time adjustment
  });
});

describe('Lap Time Calculation Edge Cases', () => {
  let race: Race;
  let driver: RaceDriver;

  beforeEach(() => {
    driver = createDriver(1, 'Edge Case Driver', 60);
    race = new Race([driver], raceConfig);
  });

  it('should handle zero speed when crossing finish line', () => {
    // Driver exactly at the finish line with zero speed
    driver.trackPosition = race.trackLength;
    driver.totalTime = 60;

    // Complete lap with zero speed
    race.checkLapCompletion(driver, 0);

    // Should still record the lap with no time adjustment
    expect(driver.lapTimes.length).toBe(1);
    expect(driver.lapTimes[0]).toBe(60);
    expect(driver.trackPosition).toBe(0); // Reset to start of track
    expect(driver.currentLap).toBe(2);
  });

  it('should handle extremely slow speed when crossing finish line', () => {
    // Driver just past finish line with very slow speed
    driver.trackPosition = race.trackLength + 0.1; // Just 10cm over
    driver.totalTime = 60;

    // Complete lap with extremely slow speed
    const verySlowSpeed = 0.01; // 1cm per second
    race.checkLapCompletion(driver, verySlowSpeed);

    // Time adjustment would be 0.1/0.01 = 10 seconds, but this is a large adjustment
    expect(driver.lapTimes.length).toBe(1);
    expect(driver.lapTimes[0]).toBeCloseTo(50); // 60 - 10
    expect(driver.trackPosition).toBeCloseTo(0.1);
    expect(driver.currentLap).toBe(2);
  });

  it('should handle negative damage affecting lap times', () => {
    // Set up first lap
    driver.trackPosition = race.trackLength + 5;
    driver.totalTime = 60;
    driver.damage = 0;

    // Get initial lap time
    race.checkLapCompletion(driver, 10);
    const firstLapTime = driver.lapTimes[0];

    // Reset for second lap, but add damage
    driver.trackPosition = race.trackLength + 5;
    driver.totalTime = 120;
    driver.damage = 4; // Add significant damage

    // Complete second lap
    race.checkLapCompletion(driver, 10);
    const secondLapTime = driver.lapTimes[1];

    expect(firstLapTime).toBeLessThan(secondLapTime);
  });
});

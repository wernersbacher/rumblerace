import { RaceDriver } from '../models/race.model';
import { Race } from './core';
import { DAMAGE_PENALTY } from './damage';

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
  };
}

describe('Race', () => {
  let race: Race;
  let drivers: RaceDriver[];

  beforeEach(() => {
    drivers = [
      createDriver(1, 'Driver 1', 60, true), // Faster driver (60s lap time)
      createDriver(2, 'Driver 2', 65), // Slower driver (65s lap time)
    ];

    // Create a Race with a fixed seed for predictable tests
    race = new Race(drivers, 3, 'test-seed-123');
  });

  describe('getEffectiveLapTime', () => {
    it('should calculate lap time with damage penalty', () => {
      const driver = drivers[0];
      driver.damage = 2; // Add some damage

      // Base lap time + damage penalty + random factor
      const lapTime = race.getEffectiveLapTime(driver);

      // We know damage penalty is 2 * 0.5 = 1s
      // Random factor will be consistent with seed
      expect(lapTime).toBeGreaterThan(driver.baseLapTime + 2 * DAMAGE_PENALTY); // at least damage penalty
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
    it('should return ideal speed when no leader is present', () => {
      const driver = drivers[0];
      const idealSpeed = 20;

      const actualSpeed = race.calculateActualSpeed(driver, idealSpeed, null);

      expect(actualSpeed).toBe(idealSpeed);
    });

    it('should limit speed when close to leader', () => {
      const driver = drivers[0];
      const leader = drivers[1];
      const idealSpeed = 20;
      const leaderSpeed = 18;

      leader.trackPosition = 8; // Only 8 meters ahead
      driver.trackPosition = 0;

      spyOn(race, 'calculateGapToLeader').and.returnValue(8);
      spyOn(race, 'getIdealSpeed').and.returnValue(leaderSpeed);

      const actualSpeed = race.calculateActualSpeed(driver, idealSpeed, leader);

      // When gap < 10, speed should be limited to leader's speed
      expect(actualSpeed).toBe(leaderSpeed);
    });

    it('should not limit speed when far from leader', () => {
      const driver = drivers[0];
      const leader = drivers[1];
      const idealSpeed = 20;

      spyOn(race, 'calculateGapToLeader').and.returnValue(15); // 15 meters ahead

      const actualSpeed = race.calculateActualSpeed(driver, idealSpeed, leader);

      expect(actualSpeed).toBe(idealSpeed); // No limitation
    });
  });

  describe('calculateGapToLeader', () => {
    it('should calculate the distance between driver and leader', () => {
      const driver = drivers[0];
      const leader = drivers[1];

      driver.trackPosition = 100;
      leader.trackPosition = 150;

      const gap = race.calculateGapToLeader(driver, leader);

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
      // Time adjustment should be 10/20 = 0.5 seconds
      // Initial totalTime is 0, so it should be -0.5 after adjustment
      expect(driver.totalTime).toBeCloseTo(-0.5);
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

      const leader = race.findImmediateLeader(driver1);

      expect(leader).toBe(driver2); // Driver2 is immediately ahead of Driver1
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

      // Check if immediate leader of driver1 is driver2
      const leader1 = race.findImmediateLeader(driver1);
      expect(leader1).toBe(driver2);

      // Check if leader of driver2 is driver3 (because driver3 is on a higher lap)
      const leader2 = race.findImmediateLeader(driver2);
      expect(leader2).toBe(driver3);

      // Check gap calculations are positive
      expect(
        race.calculateGapToLeader(driver1, leader1!)
      ).toBeGreaterThanOrEqual(0);
      expect(
        race.calculateGapToLeader(driver2, leader2!)
      ).toBeGreaterThanOrEqual(0);
    });

    it('should return null when no leader exists', () => {
      const driver = drivers[0];
      driver.trackPosition = 500; // Ahead of everyone

      const leader = race.findImmediateLeader(driver);

      expect(leader).toBeNull();
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
    driver1.racecraft = { attack: 0.9, defense: 0.6 };

    driver2 = createDriver(2, 'Defensive Driver', 60.5); // Slightly slower
    driver2.aggression = 2;
    driver2.racecraft = { attack: 0.6, defense: 0.9 };

    // Setup race with these drivers
    race = new Race([driver1, driver2], 3, 'test-seed-123');

    // Position them close to each other
    driver1.trackPosition = 100;
    driver2.trackPosition = 115;
  });

  it('should not attempt overtake when too far apart', () => {
    // Position drivers far apart
    driver1.trackPosition = 50;
    driver2.trackPosition = 200;

    spyOn(race as any, 'calculateOvertakeChance');
    spyOn(race as any, 'applySuccessfulOvertake');

    (race as any).processOvertakingAttempt(driver1, 10);

    expect((race as any).calculateOvertakeChance).not.toHaveBeenCalled();
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
    expect(driver1.overtakeCooldown).toBe(5 - race.dt);
  });

  it('should require sufficient speed advantage to attempt overtake', () => {
    spyOn(race, 'getIdealSpeed').and.returnValues(
      58, // driver1 speed - not fast enough
      60 // driver2 speed
    );

    spyOn(race as any, 'calculateOvertakeChance');

    (race as any).processOvertakingAttempt(driver1, 10);

    // Should not calculate chance with insufficient speed advantage
    expect((race as any).calculateOvertakeChance).not.toHaveBeenCalled();
  });

  it('should apply cooldown to both drivers after successful overtake', () => {
    // Setup to ensure overtake will succeed
    spyOn(race, 'getIdealSpeed').and.returnValues(65, 60); // Faster than needed
    spyOn(race, 'calculateOvertakeChance').and.returnValue(1.0); // 100% chance

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
          (_, i) => (i % 2 === 0 ? 70 : 60) // Alternate between 62 and 60
        )
    );

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

      // Call the method with the spies already in place
      (race as any).processOvertakingAttempt(driver1, 10);
    }

    // With aggressive vs defensive driver and 3.3% speed advantage,
    // we expect about 30-50% success rate
    expect(successful).toBeGreaterThan(30);
    expect(successful).toBeLessThan(70);
  });
});

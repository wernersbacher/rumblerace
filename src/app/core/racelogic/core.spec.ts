import { Race } from './core';
import { DAMAGE_PENALTY } from './damage';
import { Driver } from './models';

fdescribe('Race', () => {
  let race: Race;
  let drivers: Driver[];

  // Helper function to create a standard driver
  function createDriver(
    id: number,
    name: string,
    baseLapTime: number,
    isPlayer = false
  ): Driver {
    return {
      id,
      name,
      baseLapTime,
      damage: 0,
      aggression: 3,
      racecraft: { attack: 0.8, defense: 0.8 },
      isPlayer,
      currentLap: 1,
      trackPosition: 0,
      finished: false,
      totalTime: 0,
    };
  }

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

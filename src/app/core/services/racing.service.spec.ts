import { CurrencyService } from 'src/app/core/services/currency.service';
// src/app/core/services/race.service.spec.ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameLoopService } from './game-loop.service';
import { DriverService } from './driver.service';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { RaceConfig } from '../models/race.model';
import { RaceService } from './racing.service';

describe('RaceService', () => {
  let raceService: RaceService;
  let driverDataService: DriverService;
  let currencyService: CurrencyService;

  // Sample race configuration for testing
  const testTrack: Track = {
    id: 'test-track',
    name: 'Test Circuit',
    country: 'Test Country',
    slowCorners: 3,
    mediumCorners: 5,
    fastCorners: 4,
    straights: 2,
    referenceLapTimes: {
      [VehicleClass.GT3]: 90,
      [VehicleClass.GT4]: 100,
    },
    difficulty: 3,
  };

  const testRaceConfig: RaceConfig = {
    track: testTrack,
    vehicleClass: VehicleClass.GT3,
    numLaps: 3,
    opponents: 5,
    seed: 'test-seed',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RaceService, GameLoopService, DriverService],
    });

    raceService = TestBed.inject(RaceService);
    driverDataService = TestBed.inject(DriverService);
    currencyService = TestBed.inject(CurrencyService);

    // Set up player driver with some skills
    driverDataService.driver.skills = {
      linesAndApex: 30,
      brakeControl: 25,
      throttleControl: 20,
      consistency: 15,
      tireManagement: 10,
      trackAwareness: 10,
      racecraft: 15,
      setupUnderstanding: 5,
      adaptability: 10,
    };
  });

  it('should be created', () => {
    expect(raceService).toBeTruthy();
  });

  describe('startRace', () => {
    it('should initialize a new race with the given configuration', () => {
      spyOn(raceService as any, 'simulateRace').and.stub();

      raceService.startRace(testRaceConfig);

      const state = raceService.getRaceState();
      expect(state.isActive).toBeTrue();
      expect(state.currentTime).toBe(0);
      expect(state.positions.length).toBe(testRaceConfig.opponents + 1); // Player + opponents
    });

    it('should not start a new race if one is already active', () => {
      spyOn(raceService as any, 'simulateRace').and.stub();

      raceService.startRace(testRaceConfig);

      // Try to start another race
      raceService.startRace({
        ...testRaceConfig,
        numLaps: 5, // Different config
      });

      // Should still have the original config
      const state = raceService.getRaceState();
      expect(state.positions.length).toBe(testRaceConfig.opponents + 1);
    });

    it('should create race drivers with proper properties', () => {
      spyOn(raceService as any, 'simulateRace').and.stub();

      raceService.startRace(testRaceConfig);

      const state = raceService.getRaceState();
      const playerDriver = state.positions.find((d) => d.isPlayer);

      expect(playerDriver).toBeDefined();
      expect(playerDriver?.driver.name).toBe(driverDataService.driver.name);
      expect(playerDriver?.currentLap).toBe(1);
      expect(playerDriver?.trackPosition).toBe(0);
      expect(playerDriver?.baseLapTime).toBeDefined();
      expect(playerDriver?.racecraft.attack).toBeGreaterThan(0);
      expect(playerDriver?.racecraft.defense).toBeGreaterThan(0);
    });
  });

  describe('cancelRace', () => {
    it('should stop an active race', () => {
      spyOn(raceService as any, 'simulateRace').and.stub();

      raceService.startRace(testRaceConfig);
      expect(raceService.getRaceState().isActive).toBeTrue();

      raceService.cancelRace();
      expect(raceService.getRaceState().isActive).toBeFalse();
    });
  });

  describe('race simulation', () => {
    xit('should update race state during simulation', fakeAsync(() => {
      // Create a simulated Race instance that will finish after a few ticks
      const mockRace = {
        dt: 1,
        drivers: [{ finished: false, driver: { name: 'Test' } }],
        log: [],
        processSimulationTick: jasmine.createSpy('processSimulationTick'),
      };

      spyOn(raceService as any, 'updateRaceState').and.callThrough();
      spyOn(raceService as any, 'createRaceDrivers').and.returnValue([]);

      // Replace the race instance with our mock
      (raceService as any).race = mockRace;

      // Start the race
      raceService.startRace(testRaceConfig);

      // Set up property to simulate race completion after 3 ticks
      let tickCount = 0;
      Object.defineProperty(mockRace, 'drivers', {
        get: function () {
          tickCount++;
          return [{ finished: tickCount >= 3 }];
        },
      });

      // Fast-forward to process 3 simulation ticks
      tick(300); // 3 * 100ms tick interval

      // Verify the race state was updated
      expect((raceService as any).updateRaceState).toHaveBeenCalled();

      // Clean up timers
      raceService.cancelRace();
    }));

    it('should emit race updates during simulation', fakeAsync(() => {
      let updateCount = 0;
      let isComplete = false;

      // Subscribe to race updates
      raceService.raceUpdates.subscribe(() => {
        updateCount++;
      });

      raceService.raceCompleted.subscribe(() => {
        isComplete = true;
      });

      // Create a race that will finish quickly
      const mockRace: any = {
        dt: 1,
        drivers: [{ finished: false, driver: { name: 'Test' } }],
        log: [],
        processSimulationTick: jasmine.createSpy('processSimulationTick'),
      };

      // Start race and replace race instance
      raceService.startRace(testRaceConfig);
      (raceService as any).race = mockRace;

      // Set up race to process race results
      spyOn(raceService as any, 'processRaceResults').and.returnValue([
        {
          position: 1,
          driver: { name: 'Test' },
          totalTime: 10,
          bestLap: 10,
          damage: 0,
        },
      ]);

      // Finish race after 2 ticks
      tick(100);
      mockRace.drivers[0].finished = true;
      tick(100);

      // Verify we got updates and completion
      expect(updateCount).toBeGreaterThan(0);
      expect(isComplete).toBeTrue();

      // Clean up timers
      raceService.cancelRace();
    }));
  });

  describe('race rewards', () => {
    it('should award XP and money for completed races', fakeAsync(() => {
      const initialXP = driverDataService.driver.xp;
      const initialMoney = currencyService.currency.money;

      // Create a race that will finish immediately
      const mockRace: any = {
        dt: 1,
        drivers: [
          {
            id: 0,
            finished: true,
            isPlayer: true,
            driver: driverDataService.driver,
            totalTime: 100,
            damage: 0,
          },
        ],
        log: [],
        processSimulationTick: jasmine.createSpy('processSimulationTick'),
      };

      // Start race and replace race instance
      raceService.startRace(testRaceConfig);
      (raceService as any).race = mockRace;

      tick(200);

      // Verify rewards were given
      expect(driverDataService.driver.xp).toBeGreaterThan(initialXP);
      expect(currencyService.currency.money).toBeGreaterThan(initialMoney);

      // Clean up timers
      raceService.cancelRace();
    }));

    it('should improve skills based on race performance', fakeAsync(() => {
      const initialSkills = JSON.parse(
        JSON.stringify(driverDataService.driver.skills)
      );

      // Create a race that will finish immediately
      const mockRace: any = {
        dt: 1,
        drivers: [
          {
            id: 0,
            finished: true,
            isPlayer: true,
            driver: driverDataService.driver,
            totalTime: 100,
            damage: 0,
          },
        ],
        log: [],
        processSimulationTick: jasmine.createSpy('processSimulationTick'),
      };

      // Start race and replace race instance
      raceService.startRace(testRaceConfig);
      (raceService as any).race = mockRace;

      tick(200);

      // Verify skills improved
      expect(driverDataService.driver.skills.linesAndApex).toBeGreaterThan(
        initialSkills.linesAndApex
      );

      // Clean up timers
      raceService.cancelRace();
    }));
  });

  describe('racelogic integration', () => {
    it('should properly initialize the Race class with correct parameters', () => {
      // Since we can't spy on the Race class constructor directly,
      // we'll verify the side effects instead
      spyOn(raceService as any, 'simulateRace').and.stub();

      raceService.startRace(testRaceConfig);

      // Check that race is initialized
      expect((raceService as any).race).toBeTruthy();
    });

    it('should create AI drivers with appropriate skill levels', () => {
      spyOn(raceService as any, 'simulateRace').and.stub();

      raceService.startRace(testRaceConfig);

      const state = raceService.getRaceState();
      const aiDrivers = state.positions.filter((d) => !d.isPlayer);

      expect(aiDrivers.length).toBe(testRaceConfig.opponents);

      // Check that AI drivers have appropriate properties
      aiDrivers.forEach((driver) => {
        expect(driver.baseLapTime).toBeGreaterThan(0);
        expect(driver.racecraft.attack).toBeGreaterThan(0);
        expect(driver.racecraft.defense).toBeGreaterThan(0);
        expect(driver.aggression).toBeGreaterThanOrEqual(2);
        expect(driver.aggression).toBeLessThanOrEqual(5);
      });
    });
  });
});

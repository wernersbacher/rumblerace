// src/app/core/services/race.service.spec.ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameLoopService } from './game-loop.service';
import { DriverService } from './driver.service';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { RaceConfig } from '../models/race.model';
import { RaceService } from './racing.service';

describe('RaceService', () => {
  let service: RaceService;
  let gameLoopService: GameLoopService;
  let driverDataService: DriverService;

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

    service = TestBed.inject(RaceService);
    gameLoopService = TestBed.inject(GameLoopService);
    driverDataService = TestBed.inject(DriverService);

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
    expect(service).toBeTruthy();
  });

  describe('startRace', () => {
    it('should initialize a new race with the given configuration', () => {
      spyOn(service as any, 'simulateRace').and.stub();

      service.startRace(testRaceConfig);

      const state = service.getRaceState();
      expect(state.isActive).toBeTrue();
      expect(state.currentTime).toBe(0);
      expect(state.positions.length).toBe(testRaceConfig.opponents + 1); // Player + opponents
    });

    it('should not start a new race if one is already active', () => {
      spyOn(service as any, 'simulateRace').and.stub();

      service.startRace(testRaceConfig);

      // Try to start another race
      service.startRace({
        ...testRaceConfig,
        numLaps: 5, // Different config
      });

      // Should still have the original config
      const state = service.getRaceState();
      expect(state.positions.length).toBe(testRaceConfig.opponents + 1);
    });

    it('should create race drivers with proper properties', () => {
      spyOn(service as any, 'simulateRace').and.stub();

      service.startRace(testRaceConfig);

      const state = service.getRaceState();
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
      spyOn(service as any, 'simulateRace').and.stub();

      service.startRace(testRaceConfig);
      expect(service.getRaceState().isActive).toBeTrue();

      service.cancelRace();
      expect(service.getRaceState().isActive).toBeFalse();
    });
  });

  describe('race simulation', () => {
    it('should update race state during simulation', fakeAsync(() => {
      // Create a simulated Race instance that will finish after a few ticks
      const mockRace = jasmine.createSpyObj('Race', ['processSimulationTick']);
      spyOn(service as any, 'updateRaceState').and.callThrough();

      // Mock the race creation with our controlled instance
      spyOn(service as any, 'createRaceDrivers').and.returnValue([]);
      spyOn(window as any, 'Race').and.returnValue(mockRace);

      // Set up race to complete after 3 ticks
      let tickCount = 0;
      mockRace.drivers = [];
      mockRace.dt = 1;

      // Define a property accessor for 'drivers' to simulate race completion
      Object.defineProperty(mockRace, 'drivers', {
        get: function () {
          return [{ finished: tickCount >= 3 }];
        },
      });

      // Start the race
      service.startRace(testRaceConfig);

      // Fast-forward to process 3 simulation ticks
      tick(300); // 3 * 100ms tick interval

      // Verify the race state was updated each tick
      expect((service as any).updateRaceState).toHaveBeenCalled();

      // Clean up timers
      service.cancelRace();
    }));

    it('should emit race updates during simulation', fakeAsync(() => {
      let updateCount = 0;
      let isComplete = false;

      // Subscribe to race updates
      service.raceUpdates.subscribe((state) => {
        updateCount++;
      });

      service.raceCompleted.subscribe((results) => {
        isComplete = true;
      });

      // Create a race that will finish quickly
      const mockRace: any = {
        dt: 1,
        drivers: [{ finished: false, driver: { name: 'Test' } }],
        log: [],
        processSimulationTick: jasmine.createSpy('processSimulationTick'),
      };

      // Set up race to complete after 2 ticks
      spyOn(window as any, 'Race').and.returnValue(mockRace);
      spyOn(service as any, 'processRaceResults').and.returnValue([
        {
          position: 1,
          driver: { name: 'Test' },
          totalTime: 10,
          bestLap: 10,
          damage: 0,
        },
      ]);

      // Start race
      service.startRace(testRaceConfig);

      // Finish race after 2 ticks
      tick(100);
      mockRace.drivers[0].finished = true;
      tick(100);

      // Verify we got updates and completion
      expect(updateCount).toBeGreaterThan(0);
      expect(isComplete).toBeTrue();

      // Clean up timers
      service.cancelRace();
    }));
  });

  describe('race rewards', () => {
    it('should award XP and money for completed races', fakeAsync(() => {
      const initialXP = driverDataService.driver.xp;
      const initialMoney = gameLoopService.currency.money;

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
      };

      spyOn(window as any, 'Race').and.returnValue(mockRace);

      // Start and immediately complete race
      service.startRace(testRaceConfig);
      tick(200);

      // Verify rewards were given
      expect(driverDataService.driver.xp).toBeGreaterThan(initialXP);
      expect(gameLoopService.currency.money).toBeGreaterThan(initialMoney);

      // Clean up timers
      service.cancelRace();
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
      };

      spyOn(window as any, 'Race').and.returnValue(mockRace);

      // Start and immediately complete race
      service.startRace(testRaceConfig);
      tick(200);

      // Verify skills improved
      expect(driverDataService.driver.skills.linesAndApex).toBeGreaterThan(
        initialSkills.linesAndApex
      );

      // Clean up timers
      service.cancelRace();
    }));
  });

  describe('racelogic integration', () => {
    it('should properly initialize the Race class with correct parameters', () => {
      const raceSpy = spyOn(window as any, 'Race').and.callFake(
        (drivers: any, laps: any, seed: any) => {
          return {
            dt: 1,
            drivers,
            numLaps: laps,
            log: [],
            processSimulationTick: jasmine.createSpy('processSimulationTick'),
          };
        }
      );

      spyOn(service as any, 'simulateRace').and.stub();

      service.startRace(testRaceConfig);

      expect(raceSpy).toHaveBeenCalledWith(
        jasmine.any(Array),
        testRaceConfig.numLaps,
        testRaceConfig.seed
      );
    });

    it('should create AI drivers with appropriate skill levels', () => {
      spyOn(service as any, 'simulateRace').and.stub();

      service.startRace(testRaceConfig);

      const state = service.getRaceState();
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

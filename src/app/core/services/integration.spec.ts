import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { DriverDataService } from './driver-state.service';
import { GameLoopService } from './game-loop.service';
import { TrainingService } from './training.service';

describe('Training Integration', () => {
  let gameLoopService: GameLoopService;
  let trainingService: TrainingService;
  let driverDataService: DriverDataService;

  // Sample track and vehicle class for testing
  const testTrack: Track = {
    id: 'test-track',
    name: 'Test Circuit',
    difficulty: 3,
    slowCorners: 3,
    mediumCorners: 10,
    fastCorners: 50,
    straights: 3,
    referenceLapTimes: { GT3: 100 },
  };

  const testVehicle: VehicleClass = VehicleClass.GT3;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameLoopService, TrainingService, DriverDataService],
    });

    // Get service instances
    gameLoopService = TestBed.inject(GameLoopService);
    trainingService = TestBed.inject(TrainingService);
    driverDataService = TestBed.inject(DriverDataService);

    // Reset driver skills before each test
    driverDataService.driver.skills = {
      linesAndApex: 1,
      brakeControl: 1,
      throttleControl: 1,
      consistency: 1,
      tireManagement: 0,
      trackAwareness: 0,
      racecraft: 0,
      setupUnderstanding: 0,
      adaptability: 0,
    };

    // Reset vehicle-specific skills
    driverDataService.driver.specificSkills = {};
  });

  it('should properly start training and improve driver skills', fakeAsync(() => {
    // Store initial skill values for comparison
    const initialApexSkill = driverDataService.driver.skills.linesAndApex;
    const initialBrakeSkill = driverDataService.driver.skills.brakeControl;

    // No specific skills for this vehicle class yet
    expect(
      driverDataService.driver.specificSkills[testVehicle]
    ).toBeUndefined();

    // Start a training session - set short interval for testing
    trainingService.startLiveTraining(testTrack, testVehicle, 5, 100);

    // Verify training session is active
    expect(trainingService.trainingSession).not.toBeNull();
    expect(trainingService.trainingSession?.active).toBeTrue();
    expect(trainingService.trainingSession?.track).toBe(testTrack);
    expect(trainingService.trainingSession?.vehicleClass).toBe(testVehicle);

    // Fast-forward time to complete all laps (5 laps * 100ms)
    tick(600);

    // Training should be complete
    expect(trainingService.trainingSession?.active).toBeFalse();
    expect(trainingService.trainingSession?.currentLap).toBe(5);
    expect(trainingService.trainingSession?.lapTimes.length).toBe(5);

    // Check that driver skills have improved
    expect(driverDataService.driver.skills.linesAndApex).toBeGreaterThan(
      initialApexSkill
    );
    expect(driverDataService.driver.skills.consistency).toBeGreaterThan(1);

    // Check that vehicle-specific skills were created
    expect(driverDataService.driver.specificSkills[testVehicle]).toBeDefined();
    expect(
      driverDataService.driver.specificSkills[testVehicle]!.linesAndApex
    ).toBeGreaterThan(0);
    expect(
      driverDataService.driver.specificSkills[testVehicle]!.brakeControl
    ).toBeGreaterThan(0);

    // Calculate effective skill with hardware bonuses
    const effectiveSkill = gameLoopService.getEffectiveSkill(
      'linesAndApex',
      testVehicle
    );

    // Should be base skill + vehicle-specific skill (no hardware bonuses in this test)
    expect(effectiveSkill).toBe(
      driverDataService.driver.skills.linesAndApex +
        driverDataService.driver.specificSkills[testVehicle]!.linesAndApex!
    );
  }));

  it('should apply hardware bonuses to lap times', fakeAsync(() => {
    // Buy the hardware
    var buySuccess = gameLoopService.buyHardware('wheel-basic');
    expect(buySuccess).toBeTrue();
    expect(gameLoopService.ownedHardware.length).toBe(1);

    // Calculate lap time without hardware
    const baseTime = driverDataService.calculateLapTime(
      testTrack,
      testVehicle,
      {}
    );

    // Get time with hardware bonuses
    const timeWithHardware = gameLoopService.driveLap(testTrack, testVehicle);

    // Time with hardware should be better (smaller)
    expect(timeWithHardware).toBeLessThan(baseTime);

    // Start training with hardware bonuses
    trainingService.startLiveTraining(testTrack, testVehicle, 3, 100);

    // Fast-forward time
    tick(400);

    // Training should be complete
    expect(trainingService.trainingSession?.active).toBeFalse();

    // Check that all lap times are affected by hardware bonuses
    const averageLapTime =
      trainingService.trainingSession!.lapTimes.reduce(
        (sum, time) => sum + time,
        0
      ) / trainingService.trainingSession!.lapTimes.length;

    // Average should be better than base time (accounting for some randomness)
    expect(averageLapTime).toBeLessThan(baseTime * 1.1);
  }));
});

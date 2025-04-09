import { Hardware } from './../models/hardware.model';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { DriverService } from './driver.service';
import { GameLoopService } from './game-loop.service';
import { TrainingService } from './training.service';
import { HardwareService } from './hardware.service';

describe('Training Integration', () => {
  let gameLoopService: GameLoopService;
  let hardwareService: HardwareService;
  let trainingService: TrainingService;
  let driverService: DriverService;

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
      providers: [GameLoopService, TrainingService, DriverService],
    });

    // Get service instances
    hardwareService = TestBed.inject(HardwareService);
    gameLoopService = TestBed.inject(GameLoopService);
    trainingService = TestBed.inject(TrainingService);
    driverService = TestBed.inject(DriverService);

    // Reset driver skills before each test
    driverService.driver.skills = {
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
    driverService.driver.specificSkills = {};
  });

  it('should properly start training and improve driver skills', fakeAsync(() => {
    // Store initial skill values for comparison
    const initialApexSkill = driverService.driver.skills.linesAndApex;
    const initialBrakeSkill = driverService.driver.skills.brakeControl;

    // No specific skills for this vehicle class yet
    expect(driverService.driver.specificSkills[testVehicle]).toBeUndefined();

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
    expect(driverService.driver.skills.linesAndApex).toBeGreaterThan(
      initialApexSkill
    );
    expect(driverService.driver.skills.consistency).toBeGreaterThan(1);

    // Check that vehicle-specific skills were created
    expect(driverService.driver.specificSkills[testVehicle]).toBeDefined();
    expect(
      driverService.driver.specificSkills[testVehicle]!.linesAndApex
    ).toBeGreaterThan(0);
    expect(
      driverService.driver.specificSkills[testVehicle]!.brakeControl
    ).toBeGreaterThan(0);

    // Calculate effective skill with hardware bonuses
    const effectiveSkill = driverService.getEffectiveSkill(
      'linesAndApex',
      testVehicle,
      hardwareService.getHardwareBonus()
    );

    // Should be base skill + vehicle-specific skill (no hardware bonuses in this test)
    expect(effectiveSkill).toBe(
      driverService.driver.skills.linesAndApex +
        driverService.driver.specificSkills[testVehicle]!.linesAndApex!
    );
  }));

  // todo: test to test practice and stuff
});

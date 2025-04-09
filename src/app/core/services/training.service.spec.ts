import { TestBed } from '@angular/core/testing';
import { TrainingService } from './training.service';
import { DriverService } from './driver.service';
import { TimerService } from './timer.service';
import { Subject } from 'rxjs';
import { Driver } from '../models/driver.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';

describe('TrainingService', () => {
  let service: TrainingService;
  let driverServiceMock: jasmine.SpyObj<DriverService>;
  let timerServiceMock: jasmine.SpyObj<TimerService>;
  let timerSubject: Subject<number>;

  const mockTrack: Track = {
    id: 'track1',
    name: 'Test Track',
    slowCorners: 0,
    mediumCorners: 0,
    fastCorners: 0,
    straights: 0,
    referenceLapTimes: { GT3: 90 },
    difficulty: 0,
  };
  const mockVehicleClass: VehicleClass = VehicleClass.GT3;
  const initalDriver: Driver = {
    skills: {
      linesAndApex: 1,
      consistency: 1,
      brakeControl: 0,
      throttleControl: 0,
      tireManagement: 0,
      racecraft: 0,
      setupUnderstanding: 0,
      trackAwareness: 0,
      adaptability: 0,
    },
    name: '',
    xp: 0,
    specificSkills: {},
  };

  var mockDriver: Driver = {
    ...initalDriver,
  };

  beforeEach(() => {
    timerSubject = new Subject<number>();

    driverServiceMock = jasmine.createSpyObj(
      'DriverService',
      ['calculateLapTime'],
      {
        driver: mockDriver,
      }
    );
    driverServiceMock.calculateLapTime.and.returnValue(90.5);

    timerServiceMock = jasmine.createSpyObj('TimerService', [
      'createTimer',
      'stopTimer',
    ]);
    timerServiceMock.createTimer.and.returnValue(timerSubject.asObservable());

    TestBed.configureTestingModule({
      providers: [
        TrainingService,
        { provide: DriverService, useValue: driverServiceMock },
        { provide: TimerService, useValue: timerServiceMock },
      ],
    });

    service = TestBed.inject(TrainingService);

    // Reset driver's skills before each test
    mockDriver = {
      ...initalDriver,
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize training session correctly', () => {
    service.startLiveTraining(mockTrack, mockVehicleClass, 10);

    const session = service.getSession();
    expect(session).toBeTruthy();
    expect(session?.track).toEqual(mockTrack);
    expect(session?.vehicleClass).toEqual(mockVehicleClass);
    expect(session?.lapCount).toEqual(10);
    expect(session?.currentLap).toEqual(0);
    expect(session?.active).toBeTrue();
    expect(session?.lapTimes.length).toEqual(0);
  });

  it('should process lap correctly when timer emits', () => {
    service.startLiveTraining(mockTrack, mockVehicleClass, 10);
    timerSubject.next(0);

    const session = service.getSession();
    expect(session?.currentLap).toEqual(1);
    expect(session?.lapTimes.length).toEqual(1);
    expect(driverServiceMock.calculateLapTime).toHaveBeenCalledWith(
      mockTrack,
      mockVehicleClass
    );
  });

  it('should update driver skills after lap completion', () => {
    service.startLiveTraining(mockTrack, mockVehicleClass, 10);
    timerSubject.next(0);

    // Check that specific vehicle skills were created
    expect(mockDriver.specificSkills[mockVehicleClass]).toBeDefined();

    // Check that all skills were updated
    expect(
      mockDriver.specificSkills[mockVehicleClass]!.linesAndApex
    ).toBeGreaterThan(0);
    expect(
      mockDriver.specificSkills[mockVehicleClass]!.brakeControl
    ).toBeGreaterThan(0);
    expect(
      mockDriver.specificSkills[mockVehicleClass]!.consistency
    ).toBeGreaterThan(0);
    expect(mockDriver.skills.linesAndApex).toBeGreaterThan(1);
    expect(mockDriver.skills.consistency).toBeGreaterThan(1);
  });

  it('should track skill gains during training', () => {
    service.startLiveTraining(mockTrack, mockVehicleClass, 10);
    timerSubject.next(0);

    const gains = service.getSkillGains();
    expect(gains['linesAndApex']).toBeGreaterThan(0);
    expect(gains['brakeControl']).toBeGreaterThan(0);
    expect(gains['consistency']).toBeGreaterThan(0);
  });

  it('should end training automatically after completing all laps', () => {
    service.startLiveTraining(mockTrack, mockVehicleClass, 1);
    timerSubject.next(0); // First lap (completes the session)
    timerSubject.next(1); // Should not add another lap

    const session = service.getSession();
    expect(session?.active).toBeFalse();
    expect(session?.currentLap).toEqual(1);
    expect(session?.lapTimes.length).toEqual(1);
    expect(timerServiceMock.stopTimer).toHaveBeenCalled();
  });

  it('should end training when explicitly called', () => {
    service.startLiveTraining(mockTrack, mockVehicleClass, 10);
    service.endLiveTraining();

    const session = service.getSession();
    expect(session?.active).toBeFalse();
    expect(timerServiceMock.stopTimer).toHaveBeenCalled();
  });

  it('should cancel training completely when requested', () => {
    service.startLiveTraining(mockTrack, mockVehicleClass, 10);
    service.cancelLiveTraining();

    expect(service.getSession()).toBeNull();
    expect(timerServiceMock.stopTimer).toHaveBeenCalled();
  });
});

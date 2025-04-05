import { Driver } from '../models/driver.model';
import { Track } from '../models/track.model';
import { calculateLapTime } from './lap-time-calculator';

const testDriver: Driver = {
  name: 'Max Simdriver',
  xp: 100,
  skills: {
    linesAndApex: 0.6,
    brakeControl: 0.4,
    throttleControl: 0.5,
    consistency: 0.5,
    tireManagement: 0,
    trackAwareness: 0.2,
    racecraft: 0,
    setupUnderstanding: 0,
    adaptability: 0,
  },
  specificSkills: {
    GT3: {},
    F1: {},
    TCR: {},
    Kart: {},
    LMP1: {},
  },
};

const testTrack: Track = {
  id: 'track-1',
  name: 'Virtual Ring',
  slowCorners: 4,
  mediumCorners: 5,
  fastCorners: 3,
  straights: 4,
  referenceLapTimes: { GT3: 90, F1: 70, TCR: 110, Kart: 120, LMP1: 75 },
  difficulty: 5,
};

describe('Lap Time Calculation', () => {
  it('should return a lap time lower than reference with decent skills', () => {
    const lapTime = calculateLapTime(testDriver, testTrack, 'GT3');
    expect(lapTime).toBeLessThan(90);
    expect(lapTime).toBeGreaterThan(60);
  });

  it('should return reference time with no skills', () => {
    const baseDriver: Driver = {
      ...testDriver,
      skills: {
        linesAndApex: 0,
        brakeControl: 0,
        throttleControl: 0,
        consistency: 0,
        tireManagement: 0,
        trackAwareness: 0,
        racecraft: 0,
        setupUnderstanding: 0,
        adaptability: 0,
      },
    };
    const lapTime = calculateLapTime(baseDriver, testTrack, 'GT3');
    expect(lapTime).toBeCloseTo(90);
  });

  it('should return significantly better lap time with maxed skills', () => {
    const godDriver: Driver = {
      ...testDriver,
      skills: {
        linesAndApex: 1,
        brakeControl: 1,
        throttleControl: 1,
        consistency: 1,
        tireManagement: 1,
        trackAwareness: 1,
        racecraft: 1,
        setupUnderstanding: 1,
        adaptability: 1,
      },
    };
    const lapTime = calculateLapTime(godDriver, testTrack, 'GT3');
    expect(lapTime).toBeLessThan(80);
  });

  it('should improve lap time with specific skill boost', () => {
    const baseDriver: Driver = {
      name: 'Max',
      xp: 0,
      skills: {
        linesAndApex: 0.5,
        brakeControl: 0.5,
        throttleControl: 0.5,
        consistency: 0.5,
        tireManagement: 0,
        trackAwareness: 0,
        racecraft: 0,
        setupUnderstanding: 0,
        adaptability: 0,
      },
      specificSkills: {
        GT3: {
          linesAndApex: 0.5,
        },
        F1: {},
        TCR: {},
        Kart: {},
        LMP1: {},
      },
    };

    const timeWithBoost = calculateLapTime(baseDriver, testTrack, 'GT3');

    baseDriver.specificSkills.GT3!.linesAndApex = 0.0;
    const timeWithoutBoost = calculateLapTime(baseDriver, testTrack, 'GT3');

    expect(timeWithBoost).toBeLessThan(timeWithoutBoost);
  });
});

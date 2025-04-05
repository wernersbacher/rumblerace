import { Track } from '../models/track.model';
import { GameLoopService } from './game-loop.service';

const testTrack: Track = {
  id: 'spa',
  name: 'Spa Francorchamps',
  slowCorners: 4,
  mediumCorners: 5,
  fastCorners: 3,
  straights: 4,
  referenceLapTimes: { GT3: 90 },
  difficulty: 6,
};

describe('GameStateService', () => {
  let service: GameLoopService;

  beforeEach(() => {
    service = new GameLoopService();
  });

  it('should start with initial money and no hardware', () => {
    expect(service.money).toBe(300);
    expect(service.ownedHardware.length).toBe(0);
  });

  it('should allow hardware purchase if affordable', () => {
    const result = service.buyHardware('wheel-basic');
    expect(result).toBe(true);
    expect(service.ownedHardware.length).toBe(1);
    expect(service.money).toBeLessThan(300);
  });

  it('should calculate lap time and train skills', () => {
    const beforeLapSkill = service.driver.skills.linesAndApex;
    const lapTime = service.driveLap(testTrack, 'GT3');
    expect(lapTime).toBeGreaterThan(0);
    expect(service.driver.skills.linesAndApex).toBeGreaterThan(beforeLapSkill);
  });

  it('should train specific skills per track + class', () => {
    service.driveLap(testTrack, 'GT3');
    const spec = service.driver.specificSkills.GT3;
    expect(spec?.['linesAndApex']).toBeGreaterThan(0);
  });

  it('should not allow hardware purchase if unaffordable', () => {
    // Set money to a low value
    service.money = 10;
    const result = service.buyHardware('wheel-basic');
    expect(result).toBe(false);
    expect(service.ownedHardware.length).toBe(0);
    expect(service.money).toBe(10);
  });

  it('should add XP correctly', () => {
    const initialXP = service.driver.xp;
    service.addXP(100);
    expect(service.driver.xp).toBe(initialXP + 100);
  });

  it('should calculate total skill level', () => {
    // Initially all skills are 0
    expect(service.getTotalSkillLevel()).toBe(0);

    // After training there should be some skills
    service.driveLap(testTrack, 'GT3');
    expect(service.getTotalSkillLevel()).toBeGreaterThan(0);
  });

  it('should calculate effective skills with hardware bonus', () => {
    // Buy hardware with bonus to linesAndApex
    service.buyHardware('wheel-basic');

    // Train skills for this track
    service.driveLap(testTrack, 'GT3');

    // The effective skill should be greater than just the base skill
    const baseSkill = service.driver.skills.linesAndApex;
    const effectiveSkill = service.getEffectiveSkill(
      'linesAndApex',
      testTrack,
      'GT3'
    );

    expect(effectiveSkill).toBeGreaterThan(baseSkill);
  });

  it('should allow selling hardware', () => {
    // First buy hardware
    service.buyHardware('wheel-basic');
    const moneyAfterBuying = service.money;

    // Then sell it
    const result = service.sellHardware('wheel-basic');

    expect(result).toBe(true);
    expect(service.ownedHardware.length).toBe(0);
    expect(service.money).toBeGreaterThan(moneyAfterBuying);
    expect(service.availableHardware.some((h) => h.id === 'wheel-basic')).toBe(
      true
    );
  });

  it('should not allow selling hardware that is not owned', () => {
    const result = service.sellHardware('non-existent-item');
    expect(result).toBe(false);
  });
});

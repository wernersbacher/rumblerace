import { Driver } from '../models/driver.model';
import { SkillSet } from '../models/skills.model';

export const INITIAL_DRIVER: Driver = {
  name: 'Player 1',
  xp: 0,
  skills: createEmptySkillSet(),
  specificSkills: {},
};

export function createEmptySkillSet(): SkillSet {
  return {
    linesAndApex: 0,
    brakeControl: 0,
    throttleControl: 0,
    consistency: 0,
    tireManagement: 0,
    trackAwareness: 0,
    racecraft: 0,
    setupUnderstanding: 0,
    adaptability: 0,
  };
}

export type SkillSet = {
  linesAndApex: number; // 0.0 - 1.0
  brakeControl: number;
  throttleControl: number;
  consistency: number;
  tireManagement: number;
  racecraft: number;
  setupUnderstanding: number;
  trackAwareness: number;
};

export interface SkillDefinition {
  key: keyof SkillSet;
  name: string;
  description: string;
  maxLevel: number;
  affects: string[]; // e.g. ['slowCorners', 'tireWear']
}

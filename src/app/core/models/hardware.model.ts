import { SkillSet } from './skills.model';

export enum HardwareType {
  WHEEL = 'wheel',
  PEDALS = 'pedals',
  BASE = 'base',
  RIG = 'rig',
  MONITOR = 'monitor',
  PC = 'pc',
}

export interface Hardware {
  id: string;
  name: string;
  type: HardwareType;
  cost: number;
  bonusSkills?: Partial<SkillSet>;
  trainingBoost?: number; // z.B. +10% Skill Gain
  level?: number; // für Upgrades
}

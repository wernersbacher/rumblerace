import { SkillSet } from './skills.model';
import { VehicleClass } from './vehicle.model';

export interface Driver {
  name: string;
  xp: number;
  skills: SkillSet;
  specificSkills: Record<VehicleClass, Record<string, Partial<SkillSet>>>; // trackId → skill boost
}

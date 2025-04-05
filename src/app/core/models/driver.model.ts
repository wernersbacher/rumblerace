import { SkillSet } from './skills.model';
import { VehicleClass } from './vehicle.model';

export interface Driver {
  name: string;
  xp: number;
  skills: SkillSet;
  specificSkills: Partial<Record<VehicleClass, Partial<SkillSet>>>;
}

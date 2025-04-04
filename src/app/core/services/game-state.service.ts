import { Driver } from '../models/driver.model';
import { Hardware } from '../models/hardware.model';
import { SkillSet } from '../models/skills.model';

export class GameStateService {
  money = 100;
  driver: Driver;
  skills: SkillSet;
  hardware: Hardware[];
}

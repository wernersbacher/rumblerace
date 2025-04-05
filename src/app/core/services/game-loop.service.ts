import { TrainingService } from './training.service';
import { STARTING_HARDWARE } from '../data/hardware.data';
import { Driver } from '../models/driver.model';
import { Hardware } from '../models/hardware.model';
import { SkillSet } from '../models/skills.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { calculateLapTime } from '../utils/lap-time-calculator';

function createEmptySkillSet(): SkillSet {
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

export class GameLoopService {
  driver: Driver;
  money: number = 300;
  ownedHardware: Hardware[] = [];
  availableHardware: Hardware[] = [...STARTING_HARDWARE];

  constructor(private _trainingService: TrainingService) {
    this.driver = {
      name: 'Player 1',
      xp: 0,
      skills: createEmptySkillSet(),
      specificSkills: {},
    };
  }

  getHardwareBonus(): Partial<SkillSet> {
    const bonuses: Partial<SkillSet> = {};
    for (const hw of this.ownedHardware) {
      for (const key in hw.bonusSkills) {
        const typedKey = key as keyof SkillSet;
        bonuses[typedKey] =
          (bonuses[typedKey] || 0) + (hw.bonusSkills[typedKey] || 0);
      }
    }
    return bonuses;
  }

  buyHardware(hardwareId: string): boolean {
    const item = this.availableHardware.find((h) => h.id === hardwareId);
    if (!item || item.cost > this.money) return false;

    this.money -= item.cost;
    this.ownedHardware.push(item);
    this.availableHardware = this.availableHardware.filter(
      (h) => h.id !== hardwareId
    );
    return true;
  }

  driveLap(track: Track, vehicleClass: VehicleClass): number {
    const lapTime = calculateLapTime(this.driver, track, vehicleClass);
    this.trainSkills(track, vehicleClass);
    return lapTime;
  }

  startTraining(
    track: Track,
    vehicleClass: VehicleClass,
    laps: number = 20
  ): void {
    this._trainingService.startLiveTraining(track, vehicleClass, laps);
  }

  trainSkills(track: Track, vehicleClass: VehicleClass): void {
    const gain = 0.01; // Lernfortschritt pro Session

    // Global trainieren
    this.driver.skills.linesAndApex += gain * 0.5;
    this.driver.skills.brakeControl += gain * 0.3;
    this.driver.skills.throttleControl += gain * 0.2;
    this.driver.skills.consistency += gain * 0.2;

    // Streckenspezifisch
    if (!this.driver.specificSkills[vehicleClass]) {
      this.driver.specificSkills[vehicleClass] = {};
    }

    const vehicleClassSkills = this.driver.specificSkills;

    if (!vehicleClassSkills[vehicleClass]) {
      vehicleClassSkills[vehicleClass] = {};
    }

    const specSkills = vehicleClassSkills[vehicleClass];
    specSkills.linesAndApex = (specSkills.linesAndApex || 0) + gain * 0.7;
    specSkills.brakeControl = (specSkills.brakeControl || 0) + gain * 0.5;
  }

  addXP(amount: number): void {
    this.driver.xp += amount;
    // You could implement level-up logic here
  }

  getTotalSkillLevel(): number {
    // Calculate the sum of all skill values
    return Object.values(this.driver.skills).reduce(
      (sum, value) => sum + value,
      0
    );
  }

  getEffectiveSkill(
    skillName: keyof SkillSet,
    track: Track,
    vehicleClass: VehicleClass
  ): number {
    // Base skill
    let effectiveSkill = this.driver.skills[skillName] || 0;

    // Add hardware bonus
    const hardwareBonus = this.getHardwareBonus();
    effectiveSkill += hardwareBonus[skillName] || 0;

    // Add track-specific skill if it exists
    const trackSpecificSkill =
      this.driver.specificSkills[vehicleClass]?.[skillName] || 0;
    effectiveSkill += trackSpecificSkill;

    return effectiveSkill;
  }

  sellHardware(hardwareId: string): boolean {
    const index = this.ownedHardware.findIndex((h) => h.id === hardwareId);
    if (index === -1) return false;

    const item = this.ownedHardware[index];
    // Return 70% of the original cost when selling
    const sellValue = Math.floor(item.cost * 0.7);

    this.money += sellValue;
    this.ownedHardware.splice(index, 1);
    this.availableHardware.push(item);

    return true;
  }

  // Method to get all state for saving
  getSaveGameState() {
    return {
      driver: this.driver,
      money: this.money,
      ownedHardware: this.ownedHardware,
      availableHardware: this.availableHardware,
    };
  }

  // Method to restore state from save
  loadSaveGameState(saveData: any) {
    if (!saveData) return false;

    this.driver = saveData.driver;
    this.money = saveData.money;
    this.ownedHardware = saveData.ownedHardware;
    this.availableHardware = saveData.availableHardware;

    return true;
  }
}

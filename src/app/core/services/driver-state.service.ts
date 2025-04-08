import { Injectable } from '@angular/core';
import { Driver } from '../models/driver.model';
import { SkillSet } from '../models/skills.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { calculateLapTime } from '../utils/lap-time-calculator';

@Injectable({
  providedIn: 'root',
})
export class DriverDataService {
  driver: Driver;

  constructor() {
    this.driver = {
      name: 'Player 1',
      xp: 0,
      skills: this.createEmptySkillSet(),
      specificSkills: {},
    };
  }

  private createEmptySkillSet(): SkillSet {
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

  calculateLapTime(
    track: Track,
    vehicleClass: VehicleClass,
    hardwareBonus: Partial<SkillSet> = {}
  ): number {
    // We can now directly use the utility function with hardware bonuses
    return calculateLapTime(this.driver, track, vehicleClass, hardwareBonus);
  }

  improveSkills(vehicleClass: VehicleClass, gain: number = 0.01): void {
    // Global skill training
    this.driver.skills.linesAndApex += gain * 0.5;
    this.driver.skills.brakeControl += gain * 0.3;
    this.driver.skills.throttleControl += gain * 0.2;
    this.driver.skills.consistency += gain * 0.2;

    // Ensure vehicle class skills object exists
    if (!this.driver.specificSkills[vehicleClass]) {
      this.driver.specificSkills[vehicleClass] = {};
    }

    // Track & vehicle class specific skills
    const specSkills = this.driver.specificSkills[vehicleClass];
    specSkills.linesAndApex = (specSkills.linesAndApex || 0) + gain * 0.7;
    specSkills.brakeControl = (specSkills.brakeControl || 0) + gain * 0.5;
  }

  getEffectiveSkill(
    skillName: keyof SkillSet,
    vehicleClass: VehicleClass,
    hardwareBonus: Partial<SkillSet>
  ): number {
    // Base skill
    let effectiveSkill = this.driver.skills[skillName] || 0;

    // Add hardware bonus
    effectiveSkill += hardwareBonus[skillName] || 0;

    // Add vehicle-specific skill if it exists
    const vehicleSpecificSkill =
      this.driver.specificSkills[vehicleClass]?.[skillName] || 0;
    effectiveSkill += vehicleSpecificSkill;

    return effectiveSkill;
  }

  addXP(amount: number): void {
    this.driver.xp += amount;
    // Level-up logic can be implemented here
  }

  getTotalSkillLevel(): number {
    return Object.values(this.driver.skills).reduce(
      (sum, value) => sum + value,
      0
    );
  }

  getSaveState(): any {
    // Return a deep copy to prevent reference issues
    return {
      name: this.driver.name,
      xp: this.driver.xp,
      skills: { ...this.driver.skills },
      // todo: make this better
      specificSkills: JSON.parse(JSON.stringify(this.driver.specificSkills)),
    };
  }

  loadSaveState(driverData: any): boolean {
    if (!driverData) return false;

    try {
      this.driver = {
        name: driverData.name || 'Player 1',
        xp: driverData.xp || 0,
        skills: {
          ...this.createEmptySkillSet(),
          ...driverData.skills,
        },
        specificSkills: driverData.specificSkills || {},
      };

      // Ensure all vehicle classes have valid skill objects
      for (const vehicleClass in this.driver.specificSkills) {
        if (!this.driver.specificSkills[vehicleClass as VehicleClass]) {
          this.driver.specificSkills[vehicleClass as VehicleClass] = {};
        }
      }

      return true;
    } catch (error) {
      console.error('Error loading driver data:', error);
      return false;
    }
  }

  resetDriver(): void {
    this.driver = {
      name: 'Player 1',
      xp: 0,
      skills: this.createEmptySkillSet(),
      specificSkills: {},
    };
  }
}

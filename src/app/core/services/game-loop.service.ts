import { SaveGameService } from './savegame.service';
import { Currency } from './../models/economy.model';
import { Injectable } from '@angular/core';
import { SkillSet } from '../models/skills.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { DriverDataService } from './driver-state.service';
import { HardwareService } from './hardware.service';
import { SaveGameData } from '../models/gamesave';

@Injectable({
  providedIn: 'root',
})
export class GameLoopService {
  currency: Currency = {
    money: 3000,
    rating: 0,
  };

  constructor(
    private driverDataService: DriverDataService,
    private hardwareService: HardwareService,
    private saveGameService: SaveGameService
  ) {}

  get driver() {
    return this.driverDataService.driver;
  }

  get ownedHardware() {
    return this.hardwareService.ownedHardware;
  }

  get availableHardware() {
    return this.hardwareService.availableHardware;
  }

  getHardwareBonus(): Partial<SkillSet> {
    return this.hardwareService.getHardwareBonus();
  }

  buyHardware(hardwareId: string): boolean {
    const result = this.hardwareService.buyHardware(hardwareId, this.currency);
    if (result.success) {
      this.currency = result.currency;
    }
    return result.success;
  }

  driveLap(track: Track, vehicleClass: VehicleClass): number {
    var hardWareBonus = this.getHardwareBonus();
    const lapTime = this.driverDataService.calculateLapTime(
      track,
      vehicleClass,
      hardWareBonus
    );
    this.driverDataService.improveSkills(vehicleClass);
    return lapTime;
  }

  getEffectiveSkill(
    skillName: keyof SkillSet,
    vehicleClass: VehicleClass
  ): number {
    return this.driverDataService.getEffectiveSkill(
      skillName,
      vehicleClass,
      this.getHardwareBonus()
    );
  }

  getAllEffectiveSkills(vehicleClass: VehicleClass): Partial<SkillSet> {
    const skills: Partial<SkillSet> = {};
    for (const skillName in this.driverDataService.driver.skills) {
      skills[skillName as keyof SkillSet] = this.getEffectiveSkill(
        skillName as keyof SkillSet,
        vehicleClass
      );
    }
    return skills;
  }

  sellHardware(hardwareId: string): boolean {
    const result = this.hardwareService.sellHardware(hardwareId, this.currency);
    if (result.success) {
      this.currency = result.currency;
    }
    return result.success;
  }

  getSaveGameState(): SaveGameData {
    return {
      version: 1, // Add version for future compatibility
      timestamp: new Date().toISOString(),
      driver: this.driverDataService.getSaveState(),
      currency: this.currency,
      hardware: this.hardwareService.getHardwareState(),
    };
  }

  // Method to save game state to localStorage
  saveGame(slotName: string = 'auto'): boolean {
    const saveData = this.getSaveGameState();
    return this.saveGameService.saveGame(slotName, saveData);
  }

  // Method to load game state from localStorage
  loadGame(slotName: string = 'auto'): boolean {
    var saveData = this.saveGameService.loadGame(slotName);
    if (!saveData) return false;
    return this.loadSaveGameState(saveData);
  }

  listSaveSlots(): string[] {
    return this.saveGameService.listSaveSlots();
  }

  // Method to restore state from save
  loadSaveGameState(saveData: SaveGameData): boolean {
    if (!saveData) return false;

    // Load currency
    this.currency = saveData.currency;

    // Load driver data
    this.driverDataService.loadSaveState(saveData.driver);

    // Load hardware data
    this.hardwareService.loadHardwareState(saveData.hardware);

    return true;
  }
}

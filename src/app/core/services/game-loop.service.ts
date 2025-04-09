import { SaveGameService } from './savegame.service';
import { Currency } from './../models/economy.model';
import { Injectable } from '@angular/core';
import { SkillSet } from '../models/skills.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { DriverDataService } from './driver-state.service';
import { HardwareService } from './hardware.service';
import { SaveGameData } from '../models/gamesave';
import { BEGINNER_TRACKS } from '../data/tracks.data';
import { RaceService } from './racing.service';
import { CurrencyService } from './currency.service';

@Injectable({
  providedIn: 'root',
})
export class GameLoopService {
  constructor(
    private currencyService: CurrencyService,
    private driverDataService: DriverDataService,
    private hardwareService: HardwareService,
    private saveGameService: SaveGameService,
    private raceService: RaceService
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
    const currentCurrency = this.currencyService.getCurrencySave();
    const result = this.hardwareService.buyHardware(
      hardwareId,
      currentCurrency
    );
    if (result.success) {
      this.currencyService.loadCurrencySave(result.currency);
    }
    return result.success;
  }

  sellHardware(hardwareId: string): boolean {
    const currentCurrency = this.currencyService.getCurrencySave();
    const result = this.hardwareService.sellHardware(
      hardwareId,
      currentCurrency
    );
    if (result.success) {
      this.currencyService.loadCurrencySave(result.currency);
    }
    return result.success;
  }

  driveLap(track: Track, vehicleClass: VehicleClass): number {
    const hardwareBonus = this.getHardwareBonus();
    const lapTime = this.driverDataService.calculateLapTime(
      track,
      vehicleClass,
      hardwareBonus
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

  getTracks(): Track[] {
    return BEGINNER_TRACKS;
  }

  getSaveGameState(): SaveGameData {
    return {
      version: 1, // Add version for future compatibility
      timestamp: new Date().toISOString(),
      driver: this.driverDataService.getDriverSave(),
      currency: this.currencyService.getCurrencySave(),
      hardware: this.hardwareService.getHardwareSave(),
    };
  }

  // Method to save game state to localStorage
  saveGame(slotName: string = 'auto'): boolean {
    const saveData = this.getSaveGameState();
    return this.saveGameService.saveGame(slotName, saveData);
  }

  // Method to load game state from localStorage
  loadGame(slotName: string = 'auto'): boolean {
    const saveData = this.saveGameService.loadGame(slotName);
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
    this.currencyService.loadCurrencySave(saveData.currency);

    // Load driver data
    this.driverDataService.loadDriverSave(saveData.driver);

    // Load hardware data
    this.hardwareService.loadHardwareSave(saveData.hardware);

    return true;
  }

  resetGame(): void {
    // Reset currency to default values
    this.currencyService.resetCurrency();

    // Reset driver data
    this.driverDataService.resetDriver();

    // Reset hardware
    this.hardwareService.resetHardware();
  }
}

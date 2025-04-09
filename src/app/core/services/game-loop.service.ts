import { SaveGameService } from './savegame.service';
import { Injectable } from '@angular/core';
import { Track } from '../models/track.model';
import { DriverService } from './driver.service';
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
    private driverDataService: DriverService,
    private hardwareService: HardwareService,
    private saveGameService: SaveGameService,
    private raceService: RaceService
  ) {}

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

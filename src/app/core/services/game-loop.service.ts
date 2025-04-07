import { Currency } from './../models/economy.model';
import { Injectable } from '@angular/core';
import { SkillSet } from '../models/skills.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { DriverDataService } from './driver-state.service';
import { HardwareService } from './hardware.service';

@Injectable({
  providedIn: 'root',
})
export class GameLoopService {
  currency: Currency = {
    money: 300,
    rating: 0,
  };

  constructor(
    private driverData: DriverDataService,
    private hardwareService: HardwareService
  ) {}

  get driver() {
    return this.driverData.driver;
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
    const lapTime = this.driverData.calculateLapTime(
      track,
      vehicleClass,
      hardWareBonus
    );
    this.driverData.improveSkills(vehicleClass);
    return lapTime;
  }

  getEffectiveSkill(
    skillName: keyof SkillSet,
    vehicleClass: VehicleClass
  ): number {
    return this.driverData.getEffectiveSkill(
      skillName,
      vehicleClass,
      this.getHardwareBonus()
    );
  }

  sellHardware(hardwareId: string): boolean {
    const result = this.hardwareService.sellHardware(hardwareId, this.currency);
    if (result.success) {
      this.currency = result.currency;
    }
    return result.success;
  }

  // Method to get all state for saving
  getSaveGameState() {
    return {
      driver: this.driver,
      currency: this.currency,
      hardware: this.hardwareService.getHardwareState(),
    };
  }

  // Method to restore state from save
  loadSaveGameState(saveData: any) {
    if (!saveData) return false;

    this.driverData.driver = saveData.driver;
    this.currency = saveData.currency;
    this.hardwareService.loadHardwareState(saveData.hardware);

    return true;
  }
}

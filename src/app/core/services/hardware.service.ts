import { Currency } from './../models/economy.model';
import { Injectable } from '@angular/core';
import { STARTING_HARDWARE } from '../data/hardware.data';
import { Hardware } from '../models/hardware.model';
import { SkillSet } from '../models/skills.model';
import { calcResellValue } from '../utils/economy';
import { CurrencyService } from './currency.service';

@Injectable({
  providedIn: 'root',
})
export class HardwareService {
  ownedHardware: Hardware[] = [];

  availableHardware: Hardware[] = STARTING_HARDWARE;

  constructor(private currenyService: CurrencyService) {}

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
    if (!item || item.cost > this.currenyService.currency.money) {
      return false;
    }

    this.currenyService.subtractMoney(item.cost);
    this.ownedHardware.push(item);
    return true;
  }

  public sellHardware(hardwareId: string): boolean {
    const index = this.ownedHardware.findIndex((h) => h.id === hardwareId);
    if (index === -1) {
      console.log('Hardware to sell could not be found.');
      return false;
    }

    const item = this.ownedHardware[index];
    const sellValue = calcResellValue(item);

    this.ownedHardware.splice(index, 1);
    this.currenyService.addMoney(sellValue);

    return true;
  }

  // Methods for save/load functionality
  getHardwareSave() {
    return this.ownedHardware;
  }

  loadHardwareSave(ownedHardware: Hardware[]): boolean {
    try {
      // Handle owned hardware
      if (Array.isArray(ownedHardware)) {
        this.ownedHardware = ownedHardware.map((hw) => ({ ...hw }));
      }

      return true;
    } catch (error) {
      console.error('Error loading hardware state:', error);
      return false;
    }
  }

  // Reset hardware to initial state
  resetHardware(): void {
    this.ownedHardware = [];
  }
}

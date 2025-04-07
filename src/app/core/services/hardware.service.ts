import { Injectable } from '@angular/core';
import { STARTING_HARDWARE } from '../data/hardware.data';
import { Hardware } from '../models/hardware.model';
import { SkillSet } from '../models/skills.model';

@Injectable({
  providedIn: 'root',
})
export class HardwareService {
  ownedHardware: Hardware[] = [];

  availableHardware: Hardware[] = STARTING_HARDWARE;

  constructor() {}

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

  buyHardware(
    hardwareId: string,
    money: number
  ): { success: boolean; remainingMoney: number } {
    const item = this.availableHardware.find((h) => h.id === hardwareId);
    if (!item || item.cost > money) {
      return { success: false, remainingMoney: money };
    }

    const remainingMoney = money - item.cost;
    this.ownedHardware.push(item);
    this.availableHardware = this.availableHardware.filter(
      (h) => h.id !== hardwareId
    );

    return { success: true, remainingMoney };
  }

  sellHardware(
    hardwareId: string,
    money: number
  ): { success: boolean; newMoney: number } {
    const index = this.ownedHardware.findIndex((h) => h.id === hardwareId);
    if (index === -1) {
      return { success: false, newMoney: money };
    }

    const item = this.ownedHardware[index];
    // Return 70% of the original cost when selling
    const sellValue = Math.floor(item.cost * 0.7);

    const newMoney = money + sellValue;
    this.ownedHardware.splice(index, 1);
    this.availableHardware.push(item);

    return { success: true, newMoney };
  }

  // Methods for save/load functionality
  getHardwareState() {
    return {
      ownedHardware: this.ownedHardware,
      availableHardware: this.availableHardware,
    };
  }

  loadHardwareState(state: {
    ownedHardware: Hardware[];
    availableHardware: Hardware[];
  }) {
    if (!state) return false;

    this.ownedHardware = state.ownedHardware;
    return true;
  }
}

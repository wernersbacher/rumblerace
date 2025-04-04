import { Hardware } from '../models/hardware.model';
import { STARTING_HARDWARE } from '../data/hardware.data';

export class HardwareService {
  private _availableHardware: Hardware[] = [...STARTING_HARDWARE];
  private _ownedHardware: Hardware[] = [];
  private _money: number = 300;

  get money() {
    return this._money;
  }

  get availableHardware(): Hardware[] {
    return this._availableHardware;
  }

  get ownedHardware(): Hardware[] {
    return this._ownedHardware;
  }

  canAfford(hardwareId: string): boolean {
    const item = this._availableHardware.find((h) => h.id === hardwareId);
    return item ? item.cost <= this._money : false;
  }

  buyHardware(hardwareId: string): boolean {
    const item = this._availableHardware.find((h) => h.id === hardwareId);
    if (!item || item.cost > this._money) return false;

    this._money -= item.cost;
    this._ownedHardware.push(item);
    this._availableHardware = this._availableHardware.filter(
      (h) => h.id !== hardwareId
    );
    return true;
  }
}

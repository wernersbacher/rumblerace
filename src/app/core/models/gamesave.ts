import { Driver } from './driver.model';
import { Currency } from './economy.model';
import { Hardware } from './hardware.model';

export interface SaveGameData {
  version: number;
  timestamp: string;
  driver: Driver;
  currency: Currency;
  hardware: Hardware[];
}

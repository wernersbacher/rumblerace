import { Hardware } from './../models/hardware.model';

export function calcResellValue(hardware: Hardware) {
  // Return 70% of the original cost when selling
  return Math.floor(hardware.cost * 0.7);
}

export type VehicleClass = 'GT3' | 'F1' | 'TCR' | 'Kart' | 'LMP1';

export interface Vehicle {
  id: string;
  name: string;
  class: VehicleClass;
  power: number;
  basePerformance: number;
  topSpeed: number;
  handling: number;
  acceleration: number;
  braking: number;
  tireWear: number;
  fuelConsumption: number;
  weight: number;
  downforce: number;
  aerodynamics: number;
  reliability: number;
}

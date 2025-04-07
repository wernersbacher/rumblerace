export enum VehicleClass {
  GT3 = 'GT3',
  GT4 = 'GT4',
  F1 = 'F1',
  TCR = 'TCR',
  Kart = 'Kart',
  LMP1 = 'LMP1',
}

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

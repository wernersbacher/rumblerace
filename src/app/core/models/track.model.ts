import { VehicleClass } from './vehicle.model';

export interface Track {
  id: string;
  name: string;
  lengthMeters: number; // in meters
  slowCorners: number;
  mediumCorners: number;
  fastCorners: number;
  straights: number;
  referenceLapTimes: Partial<Record<VehicleClass, number>>;
  country?: string;
  difficulty: number; // 1-10
}

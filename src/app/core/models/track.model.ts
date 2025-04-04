import { VehicleClass } from './vehicle.model';

export interface Track {
  id: string;
  name: string;
  slowCorners: number;
  mediumCorners: number;
  fastCorners: number;
  straights: number;
  referenceLapTimes: Record<VehicleClass, number>; // e.g. { GT3: 90, F1: 70 }
  country?: string;
  difficulty: number; // 1-10
}

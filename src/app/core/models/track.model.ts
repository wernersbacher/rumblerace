import { VehicleClass } from './vehicle.model';

export interface Track {
  id: string;
  name: string;
  slowCorners: number;
  mediumCorners: number;
  fastCorners: number;
  straights: number;
  referenceLapTimes: Partial<Record<VehicleClass, number>>;
  country?: string;
  difficulty: number; // 1-10
}

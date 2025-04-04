import { VehicleClass } from './vehicle.model';
import { Track } from './track.model';

export interface Championship {
  id: string;
  name: string;
  vehicleClass: VehicleClass;
  tracks: Track[];
  prizePool: number;
  entryFee: number;
  minSkillLevel?: number;
}

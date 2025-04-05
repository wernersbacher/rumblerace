import { Track } from './track.model';
import { VehicleClass } from './vehicle.model';

export interface TrainingSession {
  track: Track;
  vehicleClass: VehicleClass;
  lapCount: number;
  lapTimes: number[];
  currentLap: number;
  active: boolean;
}

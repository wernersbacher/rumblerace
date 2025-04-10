import { VehicleClass, DirtyAirCharacteristics } from '../models/vehicle.model';

export const VEHICLE_AERO_CHARACTERISTICS: Record<
  VehicleClass,
  DirtyAirCharacteristics
> = {
  [VehicleClass.F1]: {
    minFollowingTimeGap: 0.8,
    dirtyAirSensitivity: 1.0,
  },
  [VehicleClass.LMP1]: {
    minFollowingTimeGap: 0.7,
    dirtyAirSensitivity: 0.9,
  },
  [VehicleClass.GT3]: {
    minFollowingTimeGap: 0.5,
    dirtyAirSensitivity: 0.7,
  },
  [VehicleClass.GT4]: {
    minFollowingTimeGap: 0.4,
    dirtyAirSensitivity: 0.5,
  },
  [VehicleClass.TCR]: {
    minFollowingTimeGap: 0.3,
    dirtyAirSensitivity: 0.3,
  },
  [VehicleClass.Kart]: {
    minFollowingTimeGap: 0.2,
    dirtyAirSensitivity: 0, // Least sensitive to dirty air
  },
};

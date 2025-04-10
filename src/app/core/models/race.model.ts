// src/app/core/models/race.model.ts
import { Driver } from './driver.model';
import { Track } from './track.model';
import { VehicleClass } from './vehicle.model';

export interface RaceDriver {
  id: number;
  driver: Driver;
  baseLapTime: number;
  damage: number;
  aggression: number;
  racecraft: {
    attack: number;
    defense: number;
  };
  isPlayer: boolean;

  // Race state properties
  currentLap: number;
  trackPosition: number;
  finished: boolean;
  isAttemptingOvertake?: boolean;
  lastLapTime?: number;
  bestLapTime?: number;
  lapTimes: number[];
  totalTime: number;
  timeDeltaToAhead?: number;
  overtakeCooldown: number;
}

export interface RaceResult {
  position: number;
  driver: Driver;
  totalTime: number;
  bestLap: number;
  damage: number;
  timeDelta?: number; // Time behind leader
}

export interface RaceConfig {
  track: Track;
  vehicleClass: VehicleClass;
  numLaps: number;
  opponents: number;
  seed?: string;
}

export interface RaceState {
  isActive: boolean;
  currentTime: number;
  positions: RaceDriver[];
  logs: string[];
}

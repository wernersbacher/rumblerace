import { Injectable } from '@angular/core';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { GameLoopService } from './game-loop.service';
import { TrainingSession } from '../models/training.model';

@Injectable({
  providedIn: 'root',
})
export class TrainingService {
  trainingSession: TrainingSession | null = null;
  private interval: any;

  constructor(private gameState: GameLoopService) {}

  startLiveTraining(
    track: Track,
    vehicleClass: VehicleClass,
    totalLaps = 20,
    intervalMs = 1000
  ): void {
    if (this.trainingSession?.active) return;

    this.trainingSession = {
      track,
      vehicleClass,
      lapCount: totalLaps,
      lapTimes: [],
      currentLap: 0,
      active: true,
    };

    let fatigue = 1.0;
    let skillGain = 0.01;

    this.interval = setInterval(() => {
      const session = this.trainingSession;
      if (
        !session ||
        !session.active ||
        session.currentLap >= session.lapCount
      ) {
        this.endLiveTraining();
        return;
      }

      const warmup = session.currentLap === 0 ? 0.15 : 0;
      const lapTime = this.gameState.driveLap(track, vehicleClass);
      const noise = (Math.random() * 2 - 1) * 0.5;
      const adjustedTime =
        Math.round((lapTime * (1 + warmup) + noise) * 1000) / 1000;

      session.lapTimes.push(adjustedTime);
      session.currentLap++;

      const gain = skillGain * fatigue;
      const driver = this.gameState.driver;

      if (!driver.specificSkills[vehicleClass]) {
        driver.specificSkills[vehicleClass] = {};
      }
      if (!driver.specificSkills[vehicleClass]) {
        driver.specificSkills[vehicleClass] = {};
      }

      const spec = driver.specificSkills[vehicleClass];
      spec.linesAndApex = (spec.linesAndApex || 0) + gain * 0.6;
      spec.brakeControl = (spec.brakeControl || 0) + gain * 0.4;
      spec.consistency = (spec.consistency || 0) + gain * 0.2;

      driver.skills.linesAndApex += gain * 0.2;
      driver.skills.consistency += gain * 0.1;

      fatigue *= 0.96;
    }, intervalMs);
  }

  endLiveTraining(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.trainingSession) {
      this.trainingSession.active = false;
    }
  }

  cancelLiveTraining(): void {
    this.endLiveTraining();
    this.trainingSession = null;
  }

  getSession(): TrainingSession | null {
    return this.trainingSession;
  }
}

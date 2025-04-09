import { Injectable } from '@angular/core';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { TrainingSession } from '../models/training.model';
import { DriverService } from './driver.service';

@Injectable({
  providedIn: 'root',
})
export class TrainingService {
  trainingSession: TrainingSession | null = null;
  private interval: any;
  private skillGains: { [key: string]: number } = {};

  constructor(private driverData: DriverService) {}

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

    // Reset skill gains
    this.skillGains = {
      linesAndApex: 0,
      brakeControl: 0,
      consistency: 0,
    };

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
      const lapTime = this.driverData.calculateLapTime(track, vehicleClass);
      const noise = (Math.random() * 2 - 1) * 0.5;
      const adjustedTime =
        Math.round((lapTime * (1 + warmup) + noise) * 1000) / 1000;

      session.lapTimes.push(adjustedTime);
      session.currentLap++;

      const gain = skillGain * fatigue;
      const driver = this.driverData.driver;

      if (!driver.specificSkills[vehicleClass]) {
        driver.specificSkills[vehicleClass] = {};
      }

      const spec = driver.specificSkills[vehicleClass];
      spec.linesAndApex = (spec.linesAndApex || 0) + gain * 0.6;
      spec.brakeControl = (spec.brakeControl || 0) + gain * 0.4;
      spec.consistency = (spec.consistency || 0) + gain * 0.2;

      driver.skills.linesAndApex += gain * 0.2;
      driver.skills.consistency += gain * 0.1;

      // Track skill gains
      // Track skill gains
      this.skillGains['linesAndApex'] += gain * 0.6;
      this.skillGains['brakeControl'] += gain * 0.4;
      this.skillGains['consistency'] += gain * 0.2;

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

  getSkillGains(): { [key: string]: number } {
    return this.skillGains;
  }
}

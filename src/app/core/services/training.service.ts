import { Injectable } from '@angular/core';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { TrainingSession } from '../models/training.model';
import { DriverService } from './driver.service';
import { TimerService } from './timer.service';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TrainingService {
  trainingSession: TrainingSession | null = null;
  private timerSubscription: Subscription | null = null;
  private skillGains: { [key: string]: number } = {};

  constructor(
    private driverData: DriverService,
    private timerService: TimerService
  ) {}

  startLiveTraining(
    track: Track,
    vehicleClass: VehicleClass,
    totalLaps = 20,
    intervalMs = 1000
  ): void {
    if (this.trainingSession?.active) return;

    this.initializeTrainingSession(track, vehicleClass, totalLaps);
    this.resetSkillGains();

    let fatigue = 1.0;
    const skillGain = 0.01;

    this.timerSubscription = this.timerService
      .createTimer(intervalMs)
      .subscribe(() => {
        this.processLap(track, vehicleClass, fatigue, skillGain);
        fatigue *= 0.96;
      });
  }

  private initializeTrainingSession(
    track: Track,
    vehicleClass: VehicleClass,
    totalLaps: number
  ): void {
    this.trainingSession = {
      track,
      vehicleClass,
      lapCount: totalLaps,
      lapTimes: [],
      currentLap: 0,
      active: true,
    };
  }

  private resetSkillGains(): void {
    this.skillGains = {
      linesAndApex: 0,
      brakeControl: 0,
      consistency: 0,
    };
  }

  processLap(
    track: Track,
    vehicleClass: VehicleClass,
    fatigue: number,
    skillGain: number
  ): void {
    const session = this.trainingSession;
    if (!session || !session.active || session.currentLap >= session.lapCount) {
      this.endLiveTraining();
      return;
    }

    this.recordLapTime(track, vehicleClass);
    this.updateDriverSkills(vehicleClass, fatigue, skillGain);
  }

  private recordLapTime(track: Track, vehicleClass: VehicleClass): void {
    if (!this.trainingSession) return;

    const warmup = this.trainingSession.currentLap === 0 ? 0.15 : 0;
    const lapTime = this.driverData.calculateLapTime(track, vehicleClass);
    const noise = (Math.random() * 2 - 1) * 0.5;
    const adjustedTime =
      Math.round((lapTime * (1 + warmup) + noise) * 1000) / 1000;

    this.trainingSession.lapTimes.push(adjustedTime);
    this.trainingSession.currentLap++;
  }

  private updateDriverSkills(
    vehicleClass: VehicleClass,
    fatigue: number,
    skillGain: number
  ): void {
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
    this.skillGains['linesAndApex'] += gain * 0.6;
    this.skillGains['brakeControl'] += gain * 0.4;
    this.skillGains['consistency'] += gain * 0.2;
  }

  endLiveTraining(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    if (this.trainingSession) {
      this.trainingSession.active = false;
    }
    this.timerService.stopTimer();
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

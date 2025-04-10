// src/app/core/services/racing.service.ts
import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { Driver } from '../models/driver.model';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import {
  RaceConfig,
  RaceDriver,
  RaceResult,
  RaceState,
} from '../models/race.model';
import { SkillSet } from '../models/skills.model';
import { DriverService } from './driver.service';
import { Race } from '../racelogic/core';
import { CurrencyService } from './currency.service';
import { TimerService } from './timer.service';
import { SIMCONFIG } from '../racelogic/simulation';

@Injectable({
  providedIn: 'root',
})
export class RaceService {
  private race: Race | null = null;
  private raceState: RaceState = {
    isActive: false,
    currentTime: 0,
    positions: [],
    logs: [],
  };

  private timerSubscription: Subscription | null = null;
  private raceUpdate$ = new Subject<RaceState>();
  private raceComplete$ = new Subject<RaceResult[]>();
  private aiDrivers: Driver[] = [];
  private playerDriver: Driver | null = null;

  constructor(
    private driverDataService: DriverService,
    private currencyService: CurrencyService,
    private timerService: TimerService
  ) {}

  get raceUpdates() {
    return this.raceUpdate$.asObservable();
  }

  get raceCompleted() {
    return this.raceComplete$.asObservable();
  }

  getRace() {
    return { ...this.race };
  }

  startRace(config: RaceConfig): void {
    if (this.raceState.isActive) {
      return;
    }

    this.playerDriver = this.driverDataService.driver;
    this.aiDrivers = this.generateAIDrivers(config);

    const raceDrivers = this.createRaceDrivers(config);
    this.race = new Race(raceDrivers, config, true);

    this.raceState = {
      isActive: true,
      currentTime: 0,
      positions: raceDrivers,
      logs: [],
    };

    // Start simulation in background
    this.simulateRace();
  }

  private createRaceDrivers(config: RaceConfig): RaceDriver[] {
    const raceDrivers: RaceDriver[] = [];

    // Add player
    const playerEffectiveSkills = this.driverDataService.getAllEffectiveSkills(
      config.vehicleClass
    );
    const playerBaseLapTime = this.calculateBaseLapTime(
      config.track,
      config.vehicleClass,
      playerEffectiveSkills
    );

    raceDrivers.push({
      id: 0,
      driver: this.playerDriver!,
      baseLapTime: playerBaseLapTime,
      damage: 0,
      aggression: 3, // Medium aggression for player
      racecraft: {
        attack: (playerEffectiveSkills.racecraft || 0) * 0.01 + 0.7, // Convert from 0-100 to 0-1 scale
        defense: (playerEffectiveSkills.consistency || 0) * 0.01 + 0.7,
      },
      isPlayer: true,
      currentLap: 1,
      trackPosition: 0,
      finished: false,
      totalTime: 0,
      overtakeCooldown: 0,
    });

    // Add AI drivers
    this.aiDrivers.forEach((aiDriver, index) => {
      // AI drivers have randomized lap times around reference lap time
      const deviation = Math.random() * 0.1 - 0.05; // -5% to +5%
      const aiBaseLapTime =
        config.track.referenceLapTimes[config.vehicleClass]! * (1 + deviation);

      raceDrivers.push({
        id: index + 1,
        driver: aiDriver,
        baseLapTime: aiBaseLapTime,
        damage: 0,
        aggression: 2 + Math.random() * 3, // Random aggression between 2-5
        racecraft: {
          attack: 0.7 + Math.random() * 0.3, // Random values between 0.7-1.0
          defense: 0.7 + Math.random() * 0.3,
        },
        isPlayer: false,
        currentLap: 1,
        trackPosition: 0,
        finished: false,
        totalTime: 0,
        overtakeCooldown: 0,
      });
    });

    return raceDrivers;
  }

  private generateAIDrivers(config: RaceConfig): Driver[] {
    const aiDrivers: Driver[] = [];

    // Generate a pool of AI opponents
    for (let i = 0; i < config.opponents; i++) {
      const aiDriver: Driver = {
        name: `AI Driver ${i + 1}`,
        xp: 0,
        skills: this.generateAISkills(config.vehicleClass),
        specificSkills: {},
      };

      aiDrivers.push(aiDriver);
    }

    return aiDrivers;
  }

  private generateAISkills(vehicleClass: VehicleClass): SkillSet {
    // Generate random skills based on difficulty level (could be adjusted later)
    const baseSkill = 50 + Math.random() * 30; // Base skill between 50-80

    return {
      linesAndApex: baseSkill + Math.random() * 20,
      brakeControl: baseSkill - 10 + Math.random() * 20,
      throttleControl: baseSkill - 5 + Math.random() * 15,
      consistency: baseSkill - 15 + Math.random() * 25,
      tireManagement: baseSkill - 20 + Math.random() * 20,
      trackAwareness: baseSkill - 10 + Math.random() * 20,
      racecraft: baseSkill - 5 + Math.random() * 15,
      setupUnderstanding: baseSkill - 25 + Math.random() * 25,
      adaptability: baseSkill - 20 + Math.random() * 20,
    };
  }

  private calculateBaseLapTime(
    track: Track,
    vehicleClass: VehicleClass,
    skills: Partial<SkillSet>
  ): number {
    // Use reference lap time as base
    const referenceLapTime = track.referenceLapTimes[vehicleClass] || 90;

    // Calculate skill-based improvements
    const skillFactor =
      1 -
      ((skills.linesAndApex || 0) +
        (skills.brakeControl || 0) +
        (skills.throttleControl || 0)) /
        300;

    // Return adjusted lap time
    return referenceLapTime * skillFactor;
  }

  private simulateRace(): void {
    if (!this.race) return;

    // Cancel any existing timer
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }

    // Set up simulation interval (100ms)
    this.timerSubscription = this.timerService
      .createTimer(100)
      .subscribe(() => {
        if (!this.race || !this.raceState.isActive) {
          this.timerService.stopTimer();
          return;
        }

        this.raceState.currentTime += SIMCONFIG.DT;
        this.race.processSimulationTick(this.raceState.currentTime);

        // Update race state from simulation
        this.updateRaceState();

        // Emit the current state
        this.raceUpdate$.next({ ...this.raceState });

        // Check if race is complete
        const isComplete = this.race.drivers.every((driver) => driver.finished);

        if (isComplete) {
          this.completeRace();
        }
      });
  }

  private updateRaceState(): void {
    if (!this.race) return;

    // Update logs
    this.raceState.logs = [...this.race.log];

    // Update positions - we don't need to copy as the race.drivers are already used in raceState.positions
  }

  private completeRace(): void {
    if (!this.race) return;

    this.raceState.isActive = false;

    // Stop the timer
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    this.timerService.stopTimer();

    // Process results
    const results = this.processRaceResults();

    // Award XP and currency to player based on position
    this.awardRaceRewards(results);

    // Notify subscribers
    this.raceComplete$.next(results);
  }

  private processRaceResults(): RaceResult[] {
    if (!this.race) return [];

    // Sort by total time
    const sortedDrivers = [...this.race.drivers].sort(
      (a, b) => a.totalTime - b.totalTime
    );

    const winnerTime = sortedDrivers[0].totalTime;

    return sortedDrivers.map((raceDriver, index) => {
      // Find original driver instance
      const originalDriver = raceDriver.isPlayer
        ? this.playerDriver!
        : this.aiDrivers[raceDriver.id - 1];

      return {
        position: index + 1,
        driver: originalDriver,
        totalTime: raceDriver.totalTime,
        bestLap: 0, // We would need to track this in the race simulation
        damage: raceDriver.damage,
        timeDelta: index === 0 ? 0 : raceDriver.totalTime - winnerTime,
      };
    });
  }

  private awardRaceRewards(results: RaceResult[]): void {
    // Find player's result
    const playerResult = results.find(
      (result) => result.driver.name === this.playerDriver?.name
    );

    if (!playerResult) return;

    // Award XP based on position (more for higher positions)
    const baseXP = 100;
    const positionMultiplier = Math.max(
      1,
      results.length - playerResult.position + 1
    );
    const xpGain = baseXP * positionMultiplier;

    // Award currency based on position
    const baseCurrency = 50;
    const currencyGain = baseCurrency * positionMultiplier;

    // Apply rewards through driver service
    this.driverDataService.addXP(xpGain);
    this.currencyService.addMoney(currencyGain);

    // Improve player skills based on race performance
    this.driverDataService.improveSkills(VehicleClass.GT3, 0.05); // Add more tracking for specific vehicle class
  }

  cancelRace(): void {
    this.raceState.isActive = false;
    this.race = null;

    // Stop the timer
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    this.timerService.stopTimer();
  }

  getRaceState(): RaceState {
    return { ...this.raceState };
  }
}

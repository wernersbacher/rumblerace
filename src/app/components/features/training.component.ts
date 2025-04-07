import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameLoopService } from '../../core/services/game-loop.service';
import { TrainingService } from '../../core/services/training.service';
import { DriverDataService } from '../../core/services/driver-state.service';
import { Track } from '../../core/models/track.model';
import { VehicleClass } from '../../core/models/vehicle.model';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-training',
  template: `
    <div class="training-container">
      <h2>Driver Training</h2>

      <!-- Track selection -->
      <div class="form-group">
        <label>Select Track:</label>
        <select [(ngModel)]="selectedTrack">
          <option *ngFor="let track of availableTracks" [ngValue]="track">
            {{ track.name }}
          </option>
        </select>
      </div>

      <!-- Vehicle class selection -->
      <div class="form-group">
        <label>Select Vehicle Class:</label>
        <select [(ngModel)]="selectedVehicleClass">
          <option
            *ngFor="let vehicleClass of vehicleClasses"
            [value]="vehicleClass"
          >
            {{ vehicleClass }}
          </option>
        </select>
      </div>

      <!-- Training settings -->
      <div class="form-group">
        <label>Number of Laps:</label>
        <input type="number" [(ngModel)]="lapCount" min="1" max="100" />
      </div>

      <!-- Start/Stop buttons -->
      <div class="actions">
        <button
          (click)="startTraining()"
          [disabled]="trainingActive || !selectedTrack || !selectedVehicleClass"
        >
          Start Training
        </button>
        <button (click)="stopTraining()" [disabled]="!trainingActive">
          Stop Training
        </button>
      </div>

      <!-- Training progress -->
      <div *ngIf="trainingActive" class="training-progress">
        <h3>Training in progress...</h3>
        <p>Track: {{ selectedTrack?.name }}</p>
        <p>Vehicle Class: {{ selectedVehicleClass }}</p>
        <p>Lap: {{ currentLap }} / {{ lapCount }}</p>
        <p>Latest Lap Time: {{ latestLapTime | number : '1.3-3' }}s</p>

        <!-- Progress bar -->
        <div class="progress-bar">
          <div
            class="progress"
            [style.width]="(currentLap / lapCount) * 100 + '%'"
          ></div>
        </div>
      </div>

      <!-- Skills gained during this session -->
      <div *ngIf="skillsGained" class="skills-gained">
        <h3>Skills Improved:</h3>
        <ul>
          <li *ngFor="let skill of skillsGained | keyvalue">
            {{ skill.key }}: +{{ skill.value | number : '1.2-2' }}
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
      .training-container {
        padding: 1rem;
        max-width: 600px;
        margin: 0 auto;
      }
      .form-group {
        margin-bottom: 1rem;
      }
      .training-progress {
        margin-top: 2rem;
        padding: 1rem;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
      .progress-bar {
        height: 20px;
        background-color: #e0e0e0;
        border-radius: 10px;
        overflow: hidden;
        margin: 1rem 0;
      }
      .progress {
        height: 100%;
        background-color: #4caf50;
        transition: width 0.3s ease;
      }
      .skills-gained {
        margin-top: 2rem;
        padding: 1rem;
        background-color: #e8f5e9;
        border-radius: 4px;
      }
    `,
  ],
})
export class TrainingComponent implements OnInit, OnDestroy {
  availableTracks = TRACK_LIST;
  vehicleClasses: VehicleClass[] = ['F1', 'GT3', 'Rally', 'Touring'];

  selectedTrack: Track | null = null;
  selectedVehicleClass: VehicleClass | null = null;
  lapCount: number = 20;

  trainingActive = false;
  currentLap = 0;
  latestLapTime = 0;
  skillsGained: Record<string, number> | null = null;

  private updateSubscription?: Subscription;
  private initialSkills: any;

  constructor(
    private gameLoop: GameLoopService,
    private trainingService: TrainingService,
    private driverData: DriverDataService
  ) {}

  ngOnInit(): void {
    // Check if there's an active training session when component initializes
    const activeSession = this.trainingService.getSession();
    if (activeSession?.active) {
      this.trainingActive = true;
      this.selectedTrack = activeSession.track;
      this.selectedVehicleClass = activeSession.vehicleClass;
      this.lapCount = activeSession.lapCount;
      this.currentLap = activeSession.currentLap;

      // Start monitoring progress
      this.monitorTrainingProgress();
    }
  }

  ngOnDestroy(): void {
    this.updateSubscription?.unsubscribe();
  }

  startTraining(): void {
    if (
      !this.selectedTrack ||
      !this.selectedVehicleClass ||
      this.trainingActive
    ) {
      return;
    }

    // Store initial skills to calculate gains
    this.storeInitialSkills();

    // Start training session
    this.trainingService.startLiveTraining(
      this.selectedTrack,
      this.selectedVehicleClass,
      this.lapCount
    );

    this.trainingActive = true;
    this.currentLap = 0;
    this.skillsGained = null;

    // Monitor training progress
    this.monitorTrainingProgress();
  }

  stopTraining(): void {
    this.trainingService.endLiveTraining();
    this.trainingActive = false;
    this.calculateSkillsGained();
    this.updateSubscription?.unsubscribe();
  }

  private monitorTrainingProgress(): void {
    // Update component state every half second based on training service state
    this.updateSubscription = interval(500).subscribe(() => {
      const session = this.trainingService.getSession();

      if (!session || !session.active) {
        this.trainingActive = false;
        this.calculateSkillsGained();
        this.updateSubscription?.unsubscribe();
        return;
      }

      this.currentLap = session.currentLap;
      if (session.lapTimes.length > 0) {
        this.latestLapTime = session.lapTimes[session.lapTimes.length - 1];
      }
    });
  }

  private storeInitialSkills(): void {
    const driver = this.driverData.driver;
    this.initialSkills = {
      base: { ...driver.skills },
      specific: this.selectedVehicleClass
        ? { ...(driver.specificSkills[this.selectedVehicleClass] || {}) }
        : {},
    };
  }

  private calculateSkillsGained(): void {
    if (!this.initialSkills || !this.selectedVehicleClass) return;

    const driver = this.driverData.driver;
    const skillsGained: Record<string, number> = {};

    // Calculate general skill gains
    for (const key in driver.skills) {
      const skillKey = key as keyof typeof driver.skills;
      const initial = this.initialSkills.base[skillKey] || 0;
      const current = driver.skills[skillKey] || 0;
      const gain = current - initial;

      if (gain > 0) {
        skillsGained[`General ${skillKey}`] = gain;
      }
    }

    // Calculate vehicle-specific skill gains
    const specificSkills =
      driver.specificSkills[this.selectedVehicleClass] || {};
    const initialSpecific = this.initialSkills.specific || {};

    for (const key in specificSkills) {
      const skillKey = key as keyof typeof specificSkills;
      const initial = initialSpecific[skillKey] || 0;
      const current = specificSkills[skillKey] || 0;
      const gain = current - initial;

      if (gain > 0) {
        skillsGained[`${this.selectedVehicleClass} ${skillKey}`] = gain;
      }
    }

    this.skillsGained = skillsGained;
  }
}

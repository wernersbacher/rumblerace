import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';

import { ScrollPanelModule } from 'primeng/scrollpanel';

import { Track } from 'src/app/core/models/track.model';
import { VehicleClass } from 'src/app/core/models/vehicle.model';
import { TrackService } from 'src/app/core/services/track.service';
import { RaceService } from 'src/app/core/services/racing.service';
import {
  RaceConfig,
  RaceResult,
  RaceState,
} from 'src/app/core/models/race.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-racing',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    DropdownModule,
    ButtonModule,
    FormsModule,
    CardModule,
    ScrollPanelModule,
  ],
  template: `
    <div class="racing-component">
      <h2>Race</h2>

      <div class="setup-section" *ngIf="!isRacing">
        <h3>Race Setup</h3>
        <div class="flex flex-col gap-3">
          <div>
            <label for="vehicle-class">Vehicle Class:</label>
            <p-dropdown
              id="vehicle-class"
              [options]="vehicleClasses"
              [(ngModel)]="selectedVehicleClass"
              placeholder="Select Vehicle Class"
              (ngModelChange)="onVehicleClassChange()"
              [disabled]="isRacing"
            ></p-dropdown>
          </div>

          <div *ngIf="selectedVehicleClass">
            <h4>Select Track:</h4>
            <p-table
              [value]="filteredTracks"
              [(selection)]="selectedTrack"
              selectionMode="single"
              [tableStyle]="{ 'min-width': '20rem', width: '100%' }"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th>Name</th>
                  <th>Country</th>
                  <th>Difficulty</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-track>
                <tr [pSelectableRow]="track">
                  <td>{{ track.name }}</td>
                  <td>{{ track.country }}</td>
                  <td>{{ track.difficulty }}</td>
                </tr>
              </ng-template>
            </p-table>
          </div>

          <div class="flex gap-4 mt-2">
            <p-dropdown
              [(ngModel)]="numLaps"
              [options]="lapOptions"
              placeholder="Number of Laps"
              [disabled]="isRacing"
            ></p-dropdown>

            <p-dropdown
              [(ngModel)]="numOpponents"
              [options]="opponentOptions"
              placeholder="Number of Opponents"
              [disabled]="isRacing"
            ></p-dropdown>
          </div>

          <div>
            <p-button
              label="Start Race"
              icon="pi pi-flag"
              [disabled]="!canStartRace"
              (click)="startRace()"
            ></p-button>
          </div>
        </div>
      </div>

      <div class="race-section" *ngIf="isRacing">
        <h3>Race in Progress</h3>
        <div class="flex flex-col gap-3">
          <p-card>
            <p class="font-bold">
              {{ selectedTrack?.name }} - {{ selectedVehicleClass }}
            </p>
            <p>Lap: {{ getCurrentLap() }}</p>
            <p>Time: {{ formatTime(raceState.currentTime) }}</p>
          </p-card>

          <p-table
            [value]="getRacePositions()"
            [tableStyle]="{ 'min-width': '20rem', width: '100%' }"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Pos</th>
                <th>Driver</th>
                <th>Lap</th>
                <th>Last Lap</th>
                <th>Damage</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-driver let-i="rowIndex">
              <tr [ngClass]="{ 'bg-yellow-100': driver.isPlayer }">
                <td>{{ i + 1 }}</td>
                <td>{{ driver.driver.name }}</td>
                <td>{{ driver.currentLap }}/{{ numLaps }}</td>
                <td>
                  {{
                    driver.lastLapTime ? formatTime(driver.lastLapTime) : '-'
                  }}
                </td>
                <td>
                  {{ driver.damage ? driver.damage.toFixed(2) + '%' : '0%' }}
                </td>
              </tr>
            </ng-template>
          </p-table>

          <p-button
            label="Cancel Race"
            icon="pi pi-times"
            (click)="cancelRace()"
          ></p-button>
        </div>
      </div>

      <div class="results-section" *ngIf="raceResults.length > 0 && !isRacing">
        <h3>Race Results</h3>
        <p-table
          [value]="raceResults"
          [tableStyle]="{ 'min-width': '20rem', width: '100%' }"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Position</th>
              <th>Driver</th>
              <th>Time</th>
              <th>Gap</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-result>
            <tr [ngClass]="{ 'bg-yellow-100': isPlayerResult(result) }">
              <td>{{ result.position }}</td>
              <td>{{ result.driver.name }}</td>
              <td>{{ formatTime(result.totalTime) }}</td>
              <td>
                {{
                  result.timeDelta ? '+' + formatTime(result.timeDelta) : '-'
                }}
              </td>
            </tr>
          </ng-template>
        </p-table>

        <div class="mt-3" *ngIf="raceResults.length > 0">
          <p-button
            label="Race Again"
            icon="pi pi-refresh"
            (click)="prepareNewRace()"
          ></p-button>
        </div>
      </div>
      <p-card>
        <p-scrollpanel
          class="race-log mt-4"
          *ngIf="raceResults.length > 0 || isRacing"
        >
          <p *ngFor="let log of getReversedLogs()">{{ log }}</p>
        </p-scrollpanel>
      </p-card>
    </div>
  `,
  styles: [
    `
      .racing-component {
        padding: 1rem;
      }
      .log-entries {
        font-family: monospace;
        background-color: #f5f5f5;
      }
    `,
  ],
})
export class RacingComponent implements OnInit, OnDestroy {
  tracks: Track[] = [];
  filteredTracks: Track[] = [];
  vehicleClasses = Object.values(VehicleClass);
  selectedTrack: Track | null = null;
  selectedVehicleClass: VehicleClass | null = null;

  numLaps: number = 3;
  numOpponents: number = 5;

  lapOptions = [
    { label: '3 Laps', value: 3 },
    { label: '5 Laps', value: 5 },
    { label: '10 Laps', value: 10 },
  ];

  opponentOptions = [
    { label: '3 Opponents', value: 3 },
    { label: '5 Opponents', value: 5 },
    { label: '8 Opponents', value: 8 },
  ];

  isRacing = false;
  raceState: RaceState = {
    isActive: false,
    currentTime: 0,
    positions: [],
    logs: [],
  };
  raceResults: RaceResult[] = [];

  private raceUpdateSubscription?: Subscription;
  private raceCompletedSubscription?: Subscription;

  constructor(
    private trackService: TrackService,
    private raceService: RaceService
  ) {}

  ngOnInit(): void {
    this.tracks = this.trackService.getAllTracks();
    this.filteredTracks = this.tracks;

    this.raceUpdateSubscription = this.raceService.raceUpdates.subscribe(
      (state) => {
        this.raceState = state;
      }
    );

    this.raceCompletedSubscription = this.raceService.raceCompleted.subscribe(
      (results) => {
        this.raceResults = results;
        this.isRacing = false;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.raceUpdateSubscription) {
      this.raceUpdateSubscription.unsubscribe();
    }

    if (this.raceCompletedSubscription) {
      this.raceCompletedSubscription.unsubscribe();
    }

    this.raceService.cancelRace();
  }

  onVehicleClassChange(): void {
    this.selectedTrack = null;
    this.filteredTracks = this.trackService.getTracksByVehicleClass(
      this.selectedVehicleClass
    );
  }

  get canStartRace(): boolean {
    return (
      !!this.selectedTrack &&
      !!this.selectedVehicleClass &&
      this.numLaps > 0 &&
      this.numOpponents > 0
    );
  }

  startRace(): void {
    if (!this.canStartRace) return;

    const config: RaceConfig = {
      track: this.selectedTrack!,
      vehicleClass: this.selectedVehicleClass!,
      numLaps: this.numLaps,
      opponents: this.numOpponents,
      seed: Date.now().toString(), // Random seed based on current time
    };

    this.raceResults = []; // Clear previous results
    this.raceService.startRace(config);
    this.isRacing = true;
  }

  cancelRace(): void {
    this.raceService.cancelRace();
    this.isRacing = false;
  }

  prepareNewRace(): void {
    this.raceResults = [];
  }

  getRacePositions(): any[] {
    return [...this.raceState.positions].sort((a, b) => {
      // Sort by total progress (lap * track length + position)
      const progressA = a.currentLap * 1000 + a.trackPosition; // assuming track length is around 1000
      const progressB = b.currentLap * 1000 + b.trackPosition;
      return progressB - progressA; // descending order
    });
  }

  getCurrentLap(): string {
    const playerDriver = this.raceState.positions.find((d) => d.isPlayer);
    if (!playerDriver) return `1/${this.numLaps}`;
    return `${playerDriver.currentLap}/${this.numLaps}`;
  }

  getReversedLogs(): string[] {
    return [...this.raceState.logs].reverse();
  }

  formatTime(timeInSeconds: number): string {
    if (timeInSeconds === 0) return '0:00.000';

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(3, '0')}`;
  }

  isPlayerResult(result: RaceResult): boolean {
    // Assuming the player name is stored in driver.name
    return (
      result.driver.name ===
      this.raceService.getRaceState().positions.find((d) => d.isPlayer)?.driver
        .name
    );
  }
}

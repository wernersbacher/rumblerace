import { GameLoopService } from 'src/app/core/services/game-loop.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { Track } from 'src/app/core/models/track.model';
import { VehicleClass } from 'src/app/core/models/vehicle.model';
import { TrainingService } from 'src/app/core/services/training.service';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-practice-session',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    DropdownModule,
    ButtonModule,
    FormsModule,
  ],
  template: `
    <div class="practice-session">
      <h2>Practice Session</h2>
      <p-dropdown
        [options]="vehicleClasses"
        [(ngModel)]="selectedVehicleClass"
        placeholder="Select Vehicle Class"
        (ngModelChange)="onVehicleClassChange()"
      ></p-dropdown>
      <div class="flex gap-4 mb-4">
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

      <p-button
        label="Start Practice"
        icon="pi pi-play"
        [disabled]="!selectedTrack || !selectedVehicleClass || isRunning"
        (click)="startPractice()"
        class="ml-2"
      ></p-button>
      <p-button
        label="Cancel Practice"
        icon="pi pi-stop"
        [disabled]="!isRunning"
        (click)="cancelPractice()"
        class="ml-2"
      ></p-button>

      <div class="flex flex-col gap-4 mt-4">
        <div *ngIf="lapTimes.length > 0" class="mt-4">
          <h3>Lap Times</h3>
          <p-table [value]="lapTimes" [tableStyle]="{ width: '100%' }">
            <ng-template pTemplate="header">
              <tr>
                <th>Lap</th>
                <th>Time (mm:ss.mmm)</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-lapTime let-i="rowIndex">
              <tr>
                <td>Lap {{ i + 1 }}</td>
                <td>{{ formatLapTime(lapTime) }}</td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <div *ngIf="skillGainsLength > 0" class="mt-4">
          <h3>Skills Gained</h3>
          <ul>
            <li>
              Lines and Apex:
              {{ skillGains['linesAndApex'] | number : '1.2-2' }}
            </li>
            <li>
              Brake Control: {{ skillGains['brakeControl'] | number : '1.2-2' }}
            </li>
            <li>
              Consistency: {{ skillGains['consistency'] | number : '1.2-2' }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .practice-session {
        padding: 1rem;
      }
    `,
  ],
})
export class PracticeSessionComponent implements OnInit, OnDestroy {
  constructor(
    private trainingService: TrainingService,
    private gameLoopService: GameLoopService
  ) {}

  tracks!: Track[];
  vehicleClasses = Object.values(VehicleClass);
  selectedTrack: Track | null = null;
  selectedVehicleClass: VehicleClass | null = null;
  lapTimes: number[] = [];
  isRunning = false;
  skillGains: { [key: string]: number } = {};
  get skillGainsLength(): number {
    return Object.keys(this.skillGains).length;
  }
  private intervalId: any;

  ngOnInit(): void {
    this.trainingService.cancelLiveTraining();
    this.tracks = this.gameLoopService.getTracks();
  }

  ngOnDestroy(): void {
    this.cancelPractice();
  }

  get filteredTracks(): Track[] {
    if (!this.selectedVehicleClass) {
      return this.tracks;
    }
    return this.tracks.filter(
      (track) =>
        track.referenceLapTimes[
          this.selectedVehicleClass as keyof typeof track.referenceLapTimes
        ] !== undefined
    );
  }

  onVehicleClassChange(): void {
    this.selectedTrack = null; // Reset selected track when vehicle class changes
  }

  startPractice(): void {
    if (this.selectedTrack && this.selectedVehicleClass) {
      this.isRunning = true;
      this.trainingService.startLiveTraining(
        this.selectedTrack,
        this.selectedVehicleClass,
        10,
        1000
      );

      this.intervalId = setInterval(() => {
        const session = this.trainingService.getSession();
        if (session) {
          this.lapTimes = session.lapTimes;
          this.skillGains = this.trainingService.getSkillGains();
          if (!session.active) {
            this.cancelPractice();
          }
        }
      }, 500);
    }
  }

  cancelPractice(): void {
    this.isRunning = false;
    this.trainingService.cancelLiveTraining();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  formatLapTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.round((time % 1) * 1000);
    return `${this.padZero(minutes)}:${this.padZero(seconds)}.${this.padZero(
      milliseconds,
      3
    )}`;
  }

  private padZero(value: number, length: number = 2): string {
    return value.toString().padStart(length, '0');
  }
}

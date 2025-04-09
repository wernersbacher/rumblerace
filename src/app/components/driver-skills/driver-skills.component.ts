import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { SkillSet } from 'src/app/core/models/skills.model';
import { VehicleClass } from 'src/app/core/models/vehicle.model';
import { GameLoopService } from 'src/app/core/services/game-loop.service';
import { MatSelectModule } from '@angular/material/select';
import { VehicleSelectorComponent } from '../shared/vehicle-select.component';
import { DriverService } from 'src/app/core/services/driver.service';

@Component({
  selector: 'app-driver',
  imports: [CommonModule, MatSelectModule, VehicleSelectorComponent],
  template: `
    <div class="driver">
      <!-- Vehicle Selector -->
      <app-vehicle-selector
        (vehicleClassChange)="onVehicleClassChange($event)"
      ></app-vehicle-selector>

      <div
        class="flex flex-wrap border-1 gap-2 border-2 border-gray-300 p-2 rounded"
      >
        <div>
          <span>Lines And Apexes</span>
          <div>{{ effectiveSkills.linesAndApex }}</div>
        </div>

        <div>
          <span>Braking</span>
          <div>{{ effectiveSkills.brakeControl }}</div>
        </div>

        <div>
          <span>Throttle Control</span>
          <div>{{ effectiveSkills.throttleControl }}</div>
        </div>

        <div>
          <span>Consistency</span>
          <div>{{ effectiveSkills.consistency }}</div>
        </div>

        <div>
          <span>Tire Management</span>
          <div>{{ effectiveSkills.tireManagement }}</div>
        </div>

        <div>
          <span>Racecraft</span>
          <div>{{ effectiveSkills.racecraft }}</div>
        </div>

        <div>
          <span>Setup Understanding</span>
          <div>{{ effectiveSkills.setupUnderstanding }}</div>
        </div>

        <div>
          <span>Track Awareness</span>
          <div>{{ effectiveSkills.trackAwareness }}</div>
        </div>

        <div>
          <span>Adaptability</span>
          <div>{{ effectiveSkills.adaptability }}</div>
        </div>
      </div>
    </div>
  `,
})
export class DriverSkillsComponent implements OnInit, OnDestroy {
  effectiveSkills: Partial<SkillSet> = {};
  private selectedVehicleClass: VehicleClass = VehicleClass.GT3; // same as default in VehicleSelectorComponent
  private refreshInterval: any;

  constructor(private driverService: DriverService) {}

  ngOnInit(): void {
    this.refreshEffectiveSkills();
    this.startRefreshingSkills();
  }

  ngOnDestroy(): void {
    this.stopRefreshingSkills();
  }

  onVehicleClassChange(vehicleClass: VehicleClass): void {
    this.selectedVehicleClass = vehicleClass;
    this.refreshEffectiveSkills();
  }

  private startRefreshingSkills(): void {
    this.refreshInterval = setInterval(() => {
      this.refreshEffectiveSkills();
    }, 1000);
  }

  private stopRefreshingSkills(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private refreshEffectiveSkills(): void {
    if (this.selectedVehicleClass) {
      this.effectiveSkills = this.driverService.getAllEffectiveSkills(
        this.selectedVehicleClass
      );
    }
  }
}

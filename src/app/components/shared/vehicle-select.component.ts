import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { VehicleClass } from 'src/app/core/models/vehicle.model';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-vehicle-selector',
  imports: [CommonModule, MatSelectModule],
  template: `
    <div>
      <h2>Select Vehicle Class</h2>
      <mat-form-field appearance="fill">
        <mat-label>Vehicle Class</mat-label>
        <mat-select
          [(value)]="selectedVehicleClass"
          (selectionChange)="onVehicleClassChange()"
        >
          <mat-option
            *ngFor="let vehicleClass of vehicleClasses"
            [value]="vehicleClass"
          >
            {{ vehicleClass }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
  styles: [
    `
      mat-form-field {
        width: 100%;
      }
    `,
  ],
})
export class VehicleSelectorComponent {
  vehicleClasses = Object.values(VehicleClass);
  selectedVehicleClass: VehicleClass = VehicleClass.GT3;

  @Output() vehicleClassChange = new EventEmitter<VehicleClass>();

  onVehicleClassChange(): void {
    if (this.selectedVehicleClass) {
      this.vehicleClassChange.emit(this.selectedVehicleClass);
    }
  }
}

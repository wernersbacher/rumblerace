import { Component } from '@angular/core';
import { CurrencyDisplayComponent } from '../currencies/currencies.component';
import { HardwareShopComponent } from '../hardware-shop/hardware-shop.component';
import { DriverSkillsComponent } from '../driver-skills/driver-skills.component';
import { DriverRigComponent } from '../driver-rig/driver-rig.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard flex flex-wrap gap-4">
      <mat-card class="w-full md:w-1/2 lg:w-1/3">
        <mat-card-header class="text-2xl"> Cash and Resources </mat-card-header>
        <mat-card-content>
          <app-currency-display></app-currency-display>
        </mat-card-content>
      </mat-card>

      <mat-card class="w-full md:w-1/2 lg:w-1/3">
        <mat-card-header class="text-2xl"> Your skills </mat-card-header>
        <mat-card-content>
          <app-driver></app-driver>
        </mat-card-content>
      </mat-card>

      <mat-card class="w-full md:w-1/2 lg:w-1/3">
        <mat-card-header class="text-2xl"> Cash and Resources </mat-card-header>
        <mat-card-content>
          <app-driver-rig></app-driver-rig>
        </mat-card-content>
      </mat-card>

      <mat-card class="w-full md:w-1/2 lg:w-1/3">
        <mat-card-header class="text-2xl"> Your rig </mat-card-header>
        <mat-card-content>
          <app-hardware-shop></app-hardware-shop>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  imports: [
    MatCardModule,
    CurrencyDisplayComponent,
    HardwareShopComponent,
    DriverSkillsComponent,
    DriverRigComponent,
  ],
})
export class DashboardComponent {}

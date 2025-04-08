import { Component } from '@angular/core';
import { CurrencyDisplayComponent } from '../currencies/currencies.component';
import { HardwareShopComponent } from '../hardware-shop/hardware-shop.component';
import { DriverSkillsComponent } from '../driver-skills/driver-skills.component';
import { DriverRigComponent } from '../driver-rig/driver-rig.component';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard flex flex-wrap gap-4">
      <p-card header="Cash and so" class="w-full md:w-1/2 lg:w-1/3">
        <app-currency-display></app-currency-display>
      </p-card>

      <p-card header="Your skills" class="w-full md:w-1/2 lg:w-1/3">
        <app-driver></app-driver>
      </p-card>

      <p-card header="Your rig" class="w-full md:w-1/2 lg:w-1/3">
        <app-driver-rig></app-driver-rig>
      </p-card>

      <p-card header="Hardware shop" class="w-full md:w-1/2 lg:w-1/3">
        <app-hardware-shop></app-hardware-shop>
      </p-card>
    </div>
  `,
  imports: [
    CardModule,
    ToolbarModule,
    ButtonModule,
    CurrencyDisplayComponent,
    HardwareShopComponent,
    DriverSkillsComponent,
    DriverRigComponent,
  ],
})
export class DashboardComponent {}

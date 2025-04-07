import { Component } from '@angular/core';
import { CurrencyDisplayComponent } from '../currencies/currencies.component';
import { HardwareShopComponent } from '../hardware-shop/hardware-shop.component';
import { DriverSkillsComponent } from '../driver-skills/driver-skills.component';
import { DriverRigComponent } from '../driver-rig/driver-rig.component';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <app-currency-display></app-currency-display>
      <app-hardware-shop></app-hardware-shop>
      <app-driver></app-driver>
      <app-driver-rig></app-driver-rig>
    </div>
  `,
  imports: [
    CurrencyDisplayComponent,
    HardwareShopComponent,
    DriverSkillsComponent,
    DriverRigComponent,
  ],
})
export class DashboardComponent {}

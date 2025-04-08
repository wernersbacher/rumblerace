import { Component } from '@angular/core';
import { CurrencyDisplayComponent } from '../currencies/currencies.component';
import { DriverSkillsComponent } from '../driver-skills/driver-skills.component';
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
    </div>
  `,
  imports: [
    CardModule,
    ToolbarModule,
    ButtonModule,
    CurrencyDisplayComponent,
    DriverSkillsComponent,
  ],
})
export class DashboardComponent {}

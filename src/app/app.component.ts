import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { CurrencyDisplayComponent } from './components/currencies/currencies.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuModule, DividerModule, CurrencyDisplayComponent],
  template: `
    <div class="layout flex flex-column h-screen">
      <p-menu [model]="menuItems" class="menu m-3">
        <ng-template pTemplate="start">
          <div class="div w-full text-center my-2 text-purple-700 text-2xl">
            Rumblerace
          </div>
          <app-currency-display></app-currency-display>
          <p-divider />
        </ng-template>
        <ng-template pTemplate="end">
          <p-divider />
          <div class="div w-full text-center text-xs my-2">
            2025 Rumblerace v0.0.1
          </div>
        </ng-template>
      </p-menu>
      <div class="main-content grow p-2 overflow-auto">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [],
})
export class AppComponent {
  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/main' },
    {
      label: 'Hardware Shop',
      icon: 'pi pi-shopping-cart',
      routerLink: '/hardware-shop',
    },
    { label: 'Driver Rig', icon: 'pi pi-cog', routerLink: '/driver-rig' },
    {
      label: 'Driver Skills',
      icon: 'pi pi-star',
      routerLink: '/driver-skills',
    },
  ];
}

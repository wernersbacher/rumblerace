import { Component } from '@angular/core';
import { Currency } from 'src/app/core/models/economy.model';
import { Hardware } from 'src/app/core/models/hardware.model';
import { HardwareService } from 'src/app/core/services/hardware.service';
import { CurrencyDisplayComponent } from '../currencies/currencies.component';
import { HardwareShopComponent } from '../hardware-shop/hardware-shop.component';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <app-currency-display [currency]="currency"></app-currency-display>
      <app-hardware-shop
        [availableHardware]="availableHardware"
        (hardwareBought)="onHardwareBought($event)"
      ></app-hardware-shop>
    </div>
  `,
  imports: [CurrencyDisplayComponent, HardwareShopComponent],
})
export class DashboardComponent {
  currency: Currency = { money: 1000, rating: 50 }; // Example data
  availableHardware: Hardware[];

  constructor(private hardwareService: HardwareService) {
    this.availableHardware = this.hardwareService.availableHardware;
  }

  onHardwareBought(item: Hardware) {
    if (item.cost <= this.currency.money) {
      this.currency.money -= item.cost;
      this.hardwareService.buyHardware(item.id, this.currency);
    } else {
      alert('Not enough money!');
    }
  }
}

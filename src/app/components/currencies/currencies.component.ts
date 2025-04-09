import { Component, Input } from '@angular/core';
import { Currency } from 'src/app/core/models/economy.model';
import { CurrencyService } from 'src/app/core/services/currency.service';

@Component({
  selector: 'app-currency-display',
  template: `
    <div class="currency-display">
      <p>Money: {{ currency.money }}</p>
      <p>Rating: {{ currency.rating }}</p>
    </div>
  `,
})
export class CurrencyDisplayComponent {
  constructor(private currencyService: CurrencyService) {}

  get currency(): Currency {
    return this.currencyService.currency;
  }
}

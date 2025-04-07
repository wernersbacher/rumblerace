import { Component, Input } from '@angular/core';
import { Currency } from 'src/app/core/models/economy.model';

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
  @Input() currency!: Currency;
}

import { Component, Input } from '@angular/core';
import { Currency } from 'src/app/core/models/economy.model';
import { GameLoopService } from 'src/app/core/services/game-loop.service';

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
  constructor(private gameLoopService: GameLoopService) {}

  get currency(): Currency {
    return this.gameLoopService.currency;
  }
}

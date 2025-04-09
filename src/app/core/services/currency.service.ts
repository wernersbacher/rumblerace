import { Injectable } from '@angular/core';
import { Currency } from '../models/economy.model';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private currency: Currency = {
    money: 3000,
    rating: 0,
  };

  addMoney(amount: number): void {
    if (amount > 0) {
      this.currency.money += amount;
    }
  }

  subtractMoney(amount: number): boolean {
    if (amount > 0 && this.currency.money >= amount) {
      this.currency.money -= amount;
      return true;
    }
    return false;
  }

  loadCurrencySave(newCurrency: Currency): void {
    this.currency = newCurrency;
  }

  public resetCurrency(): void {
    this.currency = { money: 3000, rating: 0 };
  }

  public getCurrencySave(): Currency {
    return this.currency;
  }
}

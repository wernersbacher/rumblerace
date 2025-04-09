import { Injectable } from '@angular/core';
import { Currency } from '../models/economy.model';
import { INITIAL_CURRENCY } from '../data/currency.data';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  public currency: Currency = { ...INITIAL_CURRENCY };

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
    this.currency = { ...INITIAL_CURRENCY };
  }

  public getCurrencySave(): Currency {
    return this.currency;
  }
}

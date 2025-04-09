import { TestBed } from '@angular/core/testing';
import { CurrencyService } from './currency.service';

describe('CurrencyService', () => {
  let currencyService: CurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CurrencyService],
    });
    currencyService = TestBed.inject(CurrencyService);
  });

  it('should initialize with default currency values', () => {
    const currency = currencyService.getCurrencySave();
    expect(currency.money).toBe(3000);
    expect(currency.rating).toBe(0);
  });

  it('should add money correctly', () => {
    currencyService.addMoney(500);
    expect(currencyService.getCurrencySave().money).toBe(3500);
  });

  it('should subtract money correctly', () => {
    const result = currencyService.subtractMoney(1000);
    expect(result).toBeTrue();
    expect(currencyService.getCurrencySave().money).toBe(2000);
  });

  it('should not subtract more money than available', () => {
    const result = currencyService.subtractMoney(4000);
    expect(result).toBeFalse();
    expect(currencyService.getCurrencySave().money).toBe(3000);
  });

  it('should reset currency to default values', () => {
    currencyService.addMoney(500);
    currencyService.resetCurrency();
    const currency = currencyService.getCurrencySave();
    expect(currency.money).toBe(3000);
    expect(currency.rating).toBe(0);
  });

  it('should set currency correctly', () => {
    const newCurrency = { money: 1000, rating: 5 };
    currencyService.loadCurrencySave(newCurrency);
    const currency = currencyService.getCurrencySave();
    expect(currency.money).toBe(1000);
    expect(currency.rating).toBe(5);
  });

  it('should save currency correctly', () => {
    const savedCurrency = currencyService.getCurrencySave();
    expect(savedCurrency.money).toBe(3000);
    expect(savedCurrency.rating).toBe(0);
  });
});

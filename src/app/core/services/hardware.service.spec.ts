import { TestBed } from '@angular/core/testing';
import { HardwareService } from './hardware.service';
import { CurrencyService } from './currency.service';
import { Hardware, HardwareType } from '../models/hardware.model';
import { STARTING_HARDWARE } from '../data/hardware.data';
import { calcResellValue } from '../utils/economy';

describe('HardwareService', () => {
  let hardwareService: HardwareService;
  let currencyService: CurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HardwareService, CurrencyService],
    });
    hardwareService = TestBed.inject(HardwareService);
    currencyService = TestBed.inject(CurrencyService);

    // Reset hardware before each test
    hardwareService.resetHardware();
  });

  it('should be created', () => {
    expect(hardwareService).toBeTruthy();
  });

  it('should initialize with available hardware from STARTING_HARDWARE', () => {
    expect(hardwareService.availableHardware).toEqual(STARTING_HARDWARE);
  });

  it('should initialize with empty owned hardware', () => {
    expect(hardwareService.ownedHardware.length).toBe(0);
  });

  describe('buyHardware', () => {
    it('should add hardware to owned list when purchased successfully', () => {
      const hardwareId = hardwareService.availableHardware[0].id;
      const result = hardwareService.buyHardware(hardwareId);
      expect(result).toBeTrue();
      expect(hardwareService.ownedHardware.length).toBe(1);
      expect(hardwareService.ownedHardware[0].id).toBe(hardwareId);
    });

    it('should subtract the correct amount from currency when hardware is purchased', () => {
      const hardware = hardwareService.availableHardware[0];
      const initialMoney = currencyService.currency.money;

      hardwareService.buyHardware(hardware.id);

      expect(currencyService.currency.money).toBe(initialMoney - hardware.cost);
    });

    it('should return false when trying to buy hardware with insufficient funds', () => {
      const hardware = hardwareService.availableHardware.find(
        (h) => h.cost > currencyService.currency.money
      );

      if (hardware) {
        const result = hardwareService.buyHardware(hardware.id);
        expect(result).toBeFalse();
        expect(hardwareService.ownedHardware.length).toBe(0);
      } else {
        // If all hardware is affordable, we need to make one that isn't
        currencyService.currency.money = 0;
        const result = hardwareService.buyHardware(
          hardwareService.availableHardware[0].id
        );
        expect(result).toBeFalse();
      }
    });

    it('should return false when trying to buy non-existent hardware', () => {
      const result = hardwareService.buyHardware('non-existent-id');
      expect(result).toBeFalse();
    });
  });

  describe('sellHardware', () => {
    beforeEach(() => {
      // Buy some hardware first
      hardwareService.buyHardware(hardwareService.availableHardware[0].id);
    });

    it('should remove hardware from owned list when sold', () => {
      const hardwareId = hardwareService.ownedHardware[0].id;
      const result = hardwareService.sellHardware(hardwareId);

      expect(result).toBeTrue();
      expect(hardwareService.ownedHardware.length).toBe(0);
    });

    it('should add the correct resell value to currency when hardware is sold', () => {
      const hardware = hardwareService.ownedHardware[0];
      const initialMoney = currencyService.currency.money;
      const expectedResellValue = calcResellValue(hardware);

      hardwareService.sellHardware(hardware.id);

      expect(currencyService.currency.money).toBe(
        initialMoney + expectedResellValue
      );
    });

    it('should return false when trying to sell non-owned hardware', () => {
      const result = hardwareService.sellHardware('non-existent-id');
      expect(result).toBeFalse();
    });
  });

  describe('getHardwareBonus', () => {
    it('should return empty object when no hardware is owned', () => {
      const bonuses = hardwareService.getHardwareBonus();
      expect(Object.keys(bonuses).length).toBe(0);
    });

    it('should calculate correct bonuses from owned hardware', () => {
      // Find hardware with skill bonuses
      const hardwareWithBonuses = hardwareService.availableHardware.filter(
        (hw) => hw.bonusSkills && Object.keys(hw.bonusSkills || {}).length > 0
      );

      if (hardwareWithBonuses.length >= 2) {
        // Buy two hardware items with bonuses
        hardwareService.buyHardware(hardwareWithBonuses[0].id);
        hardwareService.buyHardware(hardwareWithBonuses[1].id);

        const bonuses = hardwareService.getHardwareBonus();

        // Check that bonuses are combined correctly
        for (const skill of Object.keys(bonuses)) {
          let expectedBonus = 0;

          hardwareWithBonuses.slice(0, 2).forEach((hw) => {
            if (
              hw.bonusSkills &&
              hw.bonusSkills[skill as keyof typeof hw.bonusSkills]
            ) {
              expectedBonus +=
                hw.bonusSkills[skill as keyof typeof hw.bonusSkills] || 0;
            }
          });

          expect(bonuses[skill as keyof typeof bonuses]).toBe(expectedBonus);
        }
      }
    });
  });

  describe('saveLoad functionality', () => {
    it('should correctly save hardware state', () => {
      // Buy some hardware
      hardwareService.buyHardware(hardwareService.availableHardware[0].id);
      hardwareService.buyHardware(hardwareService.availableHardware[1].id);

      const savedState = hardwareService.getHardwareSave();

      expect(savedState).toEqual(hardwareService.ownedHardware);
      expect(savedState.length).toBe(2);
    });

    it('should correctly load hardware state', () => {
      // Create a hardware state to load
      const hardwareToLoad: Hardware[] = [
        {
          id: 'test-wheel',
          name: 'Test Wheel',
          type: HardwareType.WHEEL,
          cost: 500,
          bonusSkills: { linesAndApex: 3, throttleControl: 2 },
        },
        {
          id: 'test-pedals',
          name: 'Test Pedals',
          type: HardwareType.PEDALS,
          cost: 300,
          bonusSkills: { brakeControl: 4 },
        },
      ];

      const result = hardwareService.loadHardwareSave(hardwareToLoad);

      expect(result).toBeTrue();
      expect(hardwareService.ownedHardware.length).toBe(2);
      expect(hardwareService.ownedHardware[0].id).toBe('test-wheel');
      expect(hardwareService.ownedHardware[1].id).toBe('test-pedals');
    });

    it('should handle loading invalid hardware data gracefully', () => {
      const result = hardwareService.loadHardwareSave(null as any);
      expect(result).toBeTrue(); // Should still return true but handle the error
    });
  });

  describe('resetHardware', () => {
    it('should clear all owned hardware', () => {
      // Buy some hardware first
      hardwareService.buyHardware(hardwareService.availableHardware[0].id);
      hardwareService.buyHardware(hardwareService.availableHardware[1].id);

      expect(hardwareService.ownedHardware.length).toBe(2);

      hardwareService.resetHardware();

      expect(hardwareService.ownedHardware.length).toBe(0);
    });
  });
});

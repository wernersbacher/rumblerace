import { BEGINNER_TRACKS } from './../data/tracks.data';
import { Currency } from 'src/app/core/models/economy.model';
import { TestBed } from '@angular/core/testing';
import { GameLoopService } from './game-loop.service';
import { DriverService } from './driver.service';
import { HardwareService } from './hardware.service';
import { SaveGameService } from './savegame.service';
import { VehicleClass } from '../models/vehicle.model';
import { STARTING_HARDWARE } from '../data/hardware.data';
import { Track } from '../models/track.model';
import { CurrencyService } from './currency.service';
import { TrainingService } from './training.service';
import { INITIAL_CURRENCY } from '../data/currency.data';
import { INITIAL_DRIVER } from '../data/drivers.data';

describe('GameLoopService Save/Load Integration', () => {
  let gameLoopService: GameLoopService;
  let driverService: DriverService;
  let hardwareService: HardwareService;
  let saveGameService: SaveGameService;
  let currencyService: CurrencyService;
  let trainingService: TrainingService;

  // Sample track for testing
  const testTrack: Track = BEGINNER_TRACKS[0];

  beforeEach(() => {
    const testSetup = setup();

    gameLoopService = testSetup.services.gameLoopService;
    driverService = testSetup.services.driverService;
    hardwareService = testSetup.services.hardwareService;
    saveGameService = testSetup.services.saveGameService;
    currencyService = testSetup.services.currencyService;
    trainingService = testSetup.services.trainingService;
  });

  it('should save and load default state correctly', () => {
    // Save game with default state
    expect(gameLoopService.saveGame('default-test')).toBeTrue();

    // Verify save exists in localStorage
    expect(localStorage.getItem('save_default-test')).toBeTruthy();

    // Modify state
    currencyService.currency.money = 999;
    driverService.driver.name = 'Modified Name';

    // Load the saved default state
    expect(gameLoopService.loadGame('default-test')).toBeTrue();

    // Verify state is restored to defaults
    expect(currencyService.currency.money).toBe(INITIAL_CURRENCY.money); // Default starting money
    expect(driverService.driver.name).toBe('Player 1'); // Default name
  });

  it('should save and load complex modified state correctly', () => {
    // Modify game state extensively
    // 1. Change currency
    currencyService.currency.money = 2500;
    currencyService.currency.rating = 150;

    // 2. Modify driver
    driverService.driver.name = 'Pro Racer';
    driverService.driver.xp = 1000;
    driverService.driver.skills.linesAndApex = 0.5;
    driverService.driver.skills.brakeControl = 0.4;

    // 3. Add vehicle specific skills
    driverService.improveSkills(VehicleClass.GT3, 0.2);
    driverService.improveSkills(VehicleClass.F1, 0.3);

    // 4. Buy some hardware
    hardwareService.buyHardware(hardwareService.availableHardware[0].id);
    hardwareService.buyHardware(hardwareService.availableHardware[1].id);

    var expectedMoney = currencyService.currency.money;

    // Verify purchases reflected in hardware
    expect(hardwareService.ownedHardware.length).toBe(2);

    // 5. Drive some laps to develop skills more
    driverService.improveSkills(VehicleClass.GT3, 0.1); // Simulate driving laps

    // Save this complex state
    expect(gameLoopService.saveGame('complex-test')).toBeTrue();

    // Reset everything to defaults
    currencyService.resetCurrency();
    driverService.resetDriver();
    hardwareService.resetHardware();

    // Verify reset worked
    expect(currencyService.currency.money).toBe(INITIAL_CURRENCY.money);
    expect(driverService.driver.name).toBe(INITIAL_DRIVER.name);
    expect(hardwareService.ownedHardware.length).toBe(0);

    // Load the complex saved state
    expect(gameLoopService.loadGame('complex-test')).toBeTrue();

    // Verify everything was restored correctly
    // 1. Currency
    expect(currencyService.currency.money).toBe(expectedMoney);
    expect(currencyService.currency.rating).toBe(150);

    // 2. Driver basic info
    expect(driverService.driver.name).toBe('Pro Racer');
    expect(driverService.driver.xp).toBe(1000);

    // 3. Skills - should be greater than initially set due to lap driving
    expect(driverService.driver.skills.linesAndApex).toBeGreaterThan(0.5);
    expect(driverService.driver.skills.brakeControl).toBeGreaterThan(0.4);

    // 4. Vehicle specific skills
    expect(Object.keys(driverService.driver.specificSkills)).toContain(
      VehicleClass.GT3
    );
    expect(Object.keys(driverService.driver.specificSkills)).toContain(
      VehicleClass.F1
    );
    expect(
      driverService.driver.specificSkills[VehicleClass.GT3]!.linesAndApex
    ).toBeGreaterThan(0);

    // 5. Hardware - should have 2 items
    expect(hardwareService.ownedHardware.length).toBe(2);
  });

  it('should handle hardware bonuses correctly when loading saved game', () => {
    // Buy hardware with skill bonuses
    const hardwareWithBonus = hardwareService.availableHardware.find(
      (hw) => hw.bonusSkills && Object.keys(hw.bonusSkills).length > 0
    );

    if (hardwareWithBonus) {
      // Buy it
      hardwareService.buyHardware(hardwareWithBonus.id);

      // Verify bonus is applied
      const hardwareBonus = hardwareService.getHardwareBonus();
      const bonusKeys = Object.keys(hardwareBonus);
      expect(bonusKeys.length).toBeGreaterThan(0);

      // Save game
      gameLoopService.saveGame('hardware-bonus-test');

      // Reset
      hardwareService.ownedHardware = [];

      // Verify bonus is gone
      const resetBonus = hardwareService.getHardwareBonus();
      expect(Object.keys(resetBonus).length).toBe(0);

      // Load save
      gameLoopService.loadGame('hardware-bonus-test');

      // Verify bonus is restored
      const restoredBonus = hardwareService.getHardwareBonus();
      expect(Object.keys(restoredBonus).length).toBe(bonusKeys.length);
      for (const key of bonusKeys) {
        expect(restoredBonus[key as keyof typeof restoredBonus]).toBe(
          hardwareBonus[key as keyof typeof hardwareBonus]
        );
      }
    }
  });

  xit('should manage multiple save slots correctly', () => {
    // not working with mock storage currently

    // Save 1 - Default
    gameLoopService.saveGame('slot1');

    // Save 2 - Modified money
    currencyService.currency.money = 1000;
    gameLoopService.saveGame('slot2');

    // Save 3 - Different driver name and hardware
    driverService.driver.name = 'Slot 3 Driver';
    hardwareService.buyHardware(hardwareService.availableHardware[0].id);
    gameLoopService.saveGame('slot3');

    // Check we have 3 slots
    const slots = gameLoopService.listSaveSlots();
    expect(slots.length).toBe(3);
    expect(slots).toContain('slot1');
    expect(slots).toContain('slot2');
    expect(slots).toContain('slot3');

    // Load each slot and verify correct state is restored

    // Load slot1
    gameLoopService.loadGame('slot1');
    expect(currencyService.currency.money).toBe(300);
    expect(driverService.driver.name).toBe('Player 1');
    expect(hardwareService.ownedHardware.length).toBe(0);

    // Load slot2
    gameLoopService.loadGame('slot2');
    expect(currencyService.currency.money).toBe(1000);
    expect(driverService.driver.name).toBe('Player 1');
    expect(hardwareService.ownedHardware.length).toBe(0);

    // Load slot3
    gameLoopService.loadGame('slot3');
    expect(currencyService.currency.money).toBe(
      1000 - hardwareService.ownedHardware[0].cost
    );
    expect(driverService.driver.name).toBe('Slot 3 Driver');
    expect(hardwareService.ownedHardware.length).toBe(1);
  });

  it('should handle version compatibility in save files', () => {
    // Create a save with current version
    gameLoopService.saveGame('version-test');

    // Get the saved data and modify its version
    const saveJson = localStorage.getItem('save_version-test');
    if (saveJson) {
      const saveData = JSON.parse(saveJson);
      saveData.version = 2; // Future version
      localStorage.setItem('save_version-test', JSON.stringify(saveData));

      // Should still load fine (backwards compatibility)
      expect(gameLoopService.loadGame('version-test')).toBeTrue();
    }

    // Create a save without version (simulate old save format)
    const noVersionSave = {
      driver: driverService.driver,
      currency: currencyService.currency,
      hardware: hardwareService.ownedHardware,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('save_old-version', JSON.stringify(noVersionSave));

    // Should handle gracefully
    expect(gameLoopService.loadGame('old-version')).toBeTrue();
  });
});

function setup() {
  // Mock localStorage
  const localStorageMock: { [key: string]: string } = {};

  // Replace the global localStorage with the mock
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        Object.keys(localStorageMock).forEach(
          (key) => delete localStorageMock[key]
        );
      },
      length: () => Object.keys(localStorageMock).length,
      key: (index: number) => {
        const keys = Object.keys(localStorageMock);
        return keys[index] || null;
      },
    },
    configurable: true,
  });

  TestBed.configureTestingModule({
    providers: [
      GameLoopService,
      DriverService,
      HardwareService,
      SaveGameService,
    ],
  });

  // Initialize services
  const gameLoop = TestBed.inject(GameLoopService);
  const driver = TestBed.inject(DriverService);
  const hardware = TestBed.inject(HardwareService);
  const saveGame = TestBed.inject(SaveGameService);
  const currency = TestBed.inject(CurrencyService);
  const trainingService = TestBed.inject(TrainingService);

  return {
    services: {
      gameLoopService: gameLoop,
      driverService: driver,
      hardwareService: hardware,
      saveGameService: saveGame,
      currencyService: currency,
      trainingService: trainingService,
    },
    localStorageMock,
  };
}

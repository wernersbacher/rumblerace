import { HardwareService } from './hardware.service';

describe('HardwareService', () => {
  let service: HardwareService;

  beforeEach(() => {
    service = new HardwareService();
  });

  it('should start with 300 money', () => {
    expect(service.money).toBe(300);
  });

  it('should list all starting hardware', () => {
    expect(service.availableHardware.length).toBeGreaterThan(0);
  });

  it('should be able to buy affordable hardware', () => {
    const success = service.buyHardware('wheel-basic');
    expect(success).toBe(true);
    expect(service.money).toBeLessThan(300);
    expect(
      service.ownedHardware.find((h) => h.id === 'wheel-basic')
    ).toBeTruthy();
  });

  it('should not allow buying hardware twice', () => {
    service.buyHardware('wheel-basic');
    const secondTry = service.buyHardware('wheel-basic');
    expect(secondTry).toBe(false);
  });

  it('should not allow buying unaffordable hardware', () => {
    service.buyHardware('rig-basic'); // 150
    service.buyHardware('pedals-basic'); // 100
    const success = service.buyHardware('wheel-basic'); // 100, sollte nicht mehr gehen
    expect(success).toBe(false);
  });
});

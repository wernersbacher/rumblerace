import { HardwareType } from './../models/hardware.model';
import { Hardware } from '../models/hardware.model';

export const STARTING_HARDWARE: Hardware[] = [
  {
    id: 'wheel-basic',
    name: 'Basic Wheel',
    type: HardwareType.WHEEL,
    cost: 100,
  },
  {
    id: 'pedals-basic',
    name: 'Basic Pedals',
    type: HardwareType.PEDALS,
    cost: 100,
  },
  {
    id: 'rig-basic',
    name: 'Cheap Rig',
    type: HardwareType.RIG,
    cost: 150,
  },
  {
    id: 'monitor-basic',
    name: 'Standard Monitor',
    type: HardwareType.MONITOR,
    cost: 80,
    bonusSkills: {},
    trainingBoost: 0.05,
  },
];

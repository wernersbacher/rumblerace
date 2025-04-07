import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Hardware } from 'src/app/core/models/hardware.model';
import { GameLoopService } from 'src/app/core/services/game-loop.service';

@Component({
  selector: 'app-hardware-shop',
  template: `
    <div class="hardware-shop">
      <h2>Hardware Shop</h2>
      <ul>
        <li *ngFor="let item of availableHardware">
          <p>{{ item.name }} - {{ item.cost }}€</p>
          <button
            [disabled]="isHardwareOwned(item.id)"
            (click)="buyHardware(item)"
          >
            {{ isHardwareOwned(item.id) ? 'Owned' : 'Buy' }}
          </button>
        </li>
      </ul>
    </div>
  `,
  imports: [CommonModule],
})
export class HardwareShopComponent {
  @Input() availableHardware: Hardware[] = [];
  @Output() hardwareBought = new EventEmitter<Hardware>();

  constructor(private gameLoopService: GameLoopService) {}

  buyHardware(item: Hardware) {
    const success = this.gameLoopService.buyHardware(item.id);
    if (success) {
      this.hardwareBought.emit(item);
    } else {
      alert('Not enough money!');
    }
  }

  isHardwareOwned(hardwareId: string): boolean {
    return this.gameLoopService.ownedHardware.some(
      (ownedItem) => ownedItem.id === hardwareId
    );
  }
}

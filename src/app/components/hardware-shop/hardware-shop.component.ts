import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Hardware } from 'src/app/core/models/hardware.model';
import { GameLoopService } from 'src/app/core/services/game-loop.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-hardware-shop',
  template: `
    <div class="hardware-shop">
      <ul>
        <li *ngFor="let item of availableHardware">
          <p>{{ item.name }} - {{ item.cost }}€</p>
          <p-button
            [raised]="true"
            [disabled]="isHardwareOwned(item.id)"
            (click)="buyHardware(item)"
          >
            {{ isHardwareOwned(item.id) ? 'Owned' : 'Buy' }}
          </p-button>
        </li>
      </ul>
    </div>
  `,
  imports: [CommonModule, ButtonModule],
})
export class HardwareShopComponent {
  constructor(private gameLoopService: GameLoopService) {}

  get availableHardware(): Hardware[] {
    return this.gameLoopService.availableHardware;
  }

  buyHardware(item: Hardware) {
    const success = this.gameLoopService.buyHardware(item.id);
    if (!success) {
      alert('Not enough money!');
    }
  }

  isHardwareOwned(hardwareId: string): boolean {
    return this.gameLoopService.ownedHardware.some(
      (ownedItem) => ownedItem.id === hardwareId
    );
  }
}

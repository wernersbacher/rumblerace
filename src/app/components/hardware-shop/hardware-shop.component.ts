import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Hardware, HardwareType } from 'src/app/core/models/hardware.model';
import { GameLoopService } from 'src/app/core/services/game-loop.service';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-hardware-shop',
  template: `
    <div class="flex flex-wrap gap-4">
      <p-card
        *ngFor="let category of hardwareCategories"
        class="md:w-1/2 lg:w-1/3"
      >
        <p-table
          [value]="getHardwareByCategory(category)"
          [tableStyle]="{ 'min-width': '20rem', width: '100%' }"
        >
          <ng-template #caption>
            <div class="flex items-center justify-between">
              <span class="text-xl font-bold">{{ category }}</span>
            </div>
          </ng-template>
          <ng-template #body let-product>
            <tr>
              <td>{{ product.name }}</td>
              <td>
                <p-button
                  [raised]="true"
                  [disabled]="isHardwareOwned(product.id)"
                  (click)="buyHardware(product)"
                >
                  Buy
                </p-button>

                {{ product.cost }}€
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
  imports: [CommonModule, ButtonModule, TableModule, CardModule],
})
export class HardwareShopComponent {
  hardwareCategories = [
    HardwareType.WHEEL,
    HardwareType.PEDALS,
    HardwareType.RIG,
    HardwareType.MONITOR,
    HardwareType.PC,
  ];

  constructor(private gameLoopService: GameLoopService) {}

  get availableHardware(): Hardware[] {
    return this.gameLoopService.availableHardware;
  }

  getHardwareByCategory(category: string): Hardware[] {
    return this.availableHardware.filter(
      (item) => item.type.toLowerCase() === category.toLowerCase()
    );
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

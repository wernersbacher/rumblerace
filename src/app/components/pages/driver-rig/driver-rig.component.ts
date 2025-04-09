import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Hardware, HardwareType } from 'src/app/core/models/hardware.model';
import { GameLoopService } from 'src/app/core/services/game-loop.service';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { calcResellValue } from 'src/app/core/utils/economy';
import { HardwareService } from 'src/app/core/services/hardware.service';

@Component({
  selector: 'app-driver-rig',
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
          <ng-template #body let-hardware>
            <tr>
              <td>{{ hardware.name }}</td>
              <td>
                <p-button
                  severity="warn"
                  [raised]="true"
                  (click)="sellHardware(hardware)"
                >
                  Sell
                </p-button>

                {{ calcResellValue(hardware) }}€
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
  imports: [CommonModule, ButtonModule, TableModule, CardModule],
  styles: [
    `
      .driver-rig {
        margin-top: 20px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #f9f9f9;
      }
    `,
  ],
})
export class DriverRigComponent {
  hardwareCategories = [
    HardwareType.WHEEL,
    HardwareType.PEDALS,
    HardwareType.RIG,
    HardwareType.MONITOR,
    HardwareType.PC,
  ];
  calcResellValue = calcResellValue;

  constructor(private hardwareService: HardwareService) {}

  get ownedHardware(): Hardware[] {
    return this.hardwareService.ownedHardware;
  }

  getHardwareByCategory(category: string): Hardware[] {
    return this.ownedHardware.filter(
      (item) => item.type.toLowerCase() === category.toLowerCase()
    );
  }

  sellHardware(hardware: Hardware) {
    const success = this.hardwareService.sellHardware(hardware.id);
    if (!success) {
      alert('Unable to sell the hardware!');
    }
  }
}

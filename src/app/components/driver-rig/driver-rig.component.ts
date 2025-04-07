import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Hardware } from 'src/app/core/models/hardware.model';
import { GameLoopService } from 'src/app/core/services/game-loop.service';

@Component({
  selector: 'app-driver-rig',
  template: `
    <div class="driver-rig">
      <h2>Owned Hardware</h2>
      <ul>
        <li *ngFor="let hardware of ownedHardware">
          <p>{{ hardware.name }} ({{ hardware.type }})</p>
        </li>
      </ul>
    </div>
  `,
  imports: [CommonModule],
  styles: [
    `
      .driver-rig {
        margin-top: 20px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #f9f9f9;
      }

      .driver-rig h2 {
        margin-bottom: 10px;
      }

      .driver-rig ul {
        list-style: none;
        padding: 0;
      }

      .driver-rig li {
        margin: 5px 0;
      }
    `,
  ],
})
export class DriverRigComponent {
  constructor(private gameLoopService: GameLoopService) {}

  get ownedHardware(): Hardware[] {
    return this.gameLoopService.ownedHardware;
  }
}

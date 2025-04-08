import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { CurrencyDisplayComponent } from './components/currencies/currencies.component';
import { GameLoopService } from './core/services/game-loop.service';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    MenuModule,
    DividerModule,
    SelectModule,
    ButtonModule,
    InputTextModule,
    CurrencyDisplayComponent,
  ],
  template: `
    <div class="layout flex flex-column h-screen">
      <p-menu [model]="menuItems" class="menu m-3">
        <ng-template pTemplate="start">
          <div class="div w-full text-center my-2 text-purple-700 text-2xl">
            Rumblerace
          </div>
          <app-currency-display></app-currency-display>
          <p-divider />
        </ng-template>
        <ng-template pTemplate="end">
          <p-divider />
          <div class="div w-full text-center text-xs my-2">
            2025 Rumblerace v0.0.1
          </div>
        </ng-template>
      </p-menu>
      <div class="main-content grow p-2 overflow-auto">
        <div class="flex gap-4 mb-4">
          <input
            type="text"
            pInputText
            placeholder="Savegame name"
            [(ngModel)]="saveSlotName"
          />
          <p-button icon="pi pi-save" (click)="saveGame()" />
          <p-select
            [options]="saveSlots"
            [(ngModel)]="selectedSlot"
            optionLabel="slotName"
            placeholder="Select a save slot"
          ></p-select>
          <p-button
            label="Load Game"
            icon="pi pi-upload"
            [disabled]="!selectedSlot"
            severity="danger"
            (click)="loadGame()"
          ></p-button>
          <p-button
            label="Reset"
            icon="pi pi-refresh"
            severity="warn"
            (click)="resetGame()"
          ></p-button>
        </div>
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [],
})
export class AppComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/main' },
    {
      label: 'Hardware Shop',
      icon: 'pi pi-shopping-cart',
      routerLink: '/hardware-shop',
    },
    { label: 'Driver Rig', icon: 'pi pi-cog', routerLink: '/driver-rig' },
    {
      label: 'Driver Skills',
      icon: 'pi pi-star',
      routerLink: '/driver-skills',
    },
  ];

  saveSlotName: string = '';
  saveSlots: SaveSlotSelect[] = [];
  selectedSlot: SaveSlotSelect | null = null;

  constructor(private gameLoopService: GameLoopService) {
    this.refreshSaveSlots();
  }

  private autoSaveIntervalId: any;

  ngOnInit(): void {
    // Attempt to auto-load the "auto-save" slot
    const autoSaveSlot = 'auto-save';
    const success = this.gameLoopService.loadGame(autoSaveSlot);
    if (success) {
      console.log(`Game auto-loaded from slot: ${autoSaveSlot}`);
    } else {
      console.warn('No auto-save slot found or failed to load.');
    }

    // Start the auto-save interval
    this.autoSaveIntervalId = setInterval(() => {
      this.autoSave();
    }, 5000); // Adjust the interval as needed
  }

  ngOnDestroy(): void {
    // Clear the interval when the component is destroyed
    if (this.autoSaveIntervalId) {
      clearInterval(this.autoSaveIntervalId);
    }
  }

  saveGame(): void {
    const slotName = this.saveSlotName.trim() || 'manual-saving';
    if (this.gameLoopService.saveGame(slotName)) {
      this.refreshSaveSlots();
      alert(`Game saved to slot: ${slotName}`);
    } else {
      alert('Failed to save the game.');
    }
  }

  loadGame(): void {
    if (this.selectedSlot) {
      const success = this.gameLoopService.loadGame(this.selectedSlot.slotName);
      if (success) {
        console.log(`Game loaded from slot: ${this.selectedSlot.slotName}`);
      } else {
        alert('Failed to load the game.');
      }
    }
  }

  refreshSaveSlots(): void {
    this.saveSlots = this.gameLoopService
      .listSaveSlots()
      .map((slotName) => ({ slotName }));
  }

  resetGame(): void {
    if (
      confirm(
        'Are you sure you want to reset the game? This will erase all progress.'
      )
    ) {
      this.gameLoopService.resetGame();
      this.refreshSaveSlots();
      console.log('Game has been reset.');
    }
  }

  private autoSave(): void {
    const slotName = 'auto-save';
    if (this.gameLoopService.saveGame(slotName)) {
      console.log(`Game auto-saved to slot: ${slotName}`);
    } else {
      console.error('Auto-save failed.');
    }
  }
}

interface SaveSlotSelect {
  slotName: string;
}

// src/app/core/services/save-game.service.ts
import { Injectable } from '@angular/core';
import { SaveGameData } from '../models/gamesave';

@Injectable({
  providedIn: 'root',
})
export class SaveGameService {
  constructor() {}

  // Save game to specified slot
  saveGame(slotName: string = 'auto', saveData: any): boolean {
    try {
      localStorage.setItem(`save_${slotName}`, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Error saving game:', error);
      return false;
    }
  }

  // Load game from specified slot
  loadGame(slotName: string = 'auto'): any {
    try {
      const saveJson = localStorage.getItem(`save_${slotName}`);
      if (!saveJson) return false;

      const saveData = JSON.parse(saveJson) as SaveGameData;
      return saveData;
    } catch (error) {
      console.error('Error loading game:', error);
      return false;
    }
  }
  // Method to list all available save slots
  listSaveSlots(): string[] {
    const slots: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('save_')) {
        slots.push(key.substring(5));
      }
    }
    return slots;
  }

  // Get list of available save slots
  getSaveSlots(): SaveSlotInfo[] {
    const slots = this.listSaveSlots();
    return slots.map((slotName) => {
      try {
        const saveJson = localStorage.getItem(`save_${slotName}`);
        if (!saveJson) {
          return { slotName, valid: false };
        }

        const saveData = JSON.parse(saveJson) as SaveGameData;
        return {
          slotName,
          valid: true,
          timestamp: new Date(saveData.timestamp),
          driverName: saveData.driver?.name || 'Unknown',
          money: saveData.currency?.money || 0,
          rating: saveData.currency?.rating || 0,
        };
      } catch {
        return { slotName, valid: false };
      }
    });
  }

  // Delete save slot
  deleteSave(slotName: string): boolean {
    try {
      localStorage.removeItem(`save_${slotName}`);
      return true;
    } catch {
      return false;
    }
  }

  // Export save as a string for external storage
  exportSave(slotName: string = 'auto'): string | null {
    try {
      const saveJson = localStorage.getItem(`save_${slotName}`);
      if (!saveJson) return null;

      // Base64 encode to make it more portable
      return btoa(saveJson);
    } catch (error) {
      console.error('Error exporting save:', error);
      return null;
    }
  }

  // Import save from string
  importSave(saveData: string, slotName: string = 'import'): boolean {
    try {
      // Decode base64 string
      const saveJson = atob(saveData);

      // Validate the JSON
      const parsedData = JSON.parse(saveJson) as SaveGameData;
      if (!parsedData.version || !parsedData.driver || !parsedData.currency) {
        throw new Error('Invalid save data format');
      }

      // Store in localStorage
      localStorage.setItem(`save_${slotName}`, saveJson);
      return true;
    } catch (error) {
      console.error('Error importing save:', error);
      return false;
    }
  }
}

export interface SaveSlotInfo {
  slotName: string;
  valid: boolean;
  timestamp?: Date;
  driverName?: string;
  money?: number;
  rating?: number;
}

// src/app/core/services/track.service.ts
import { Injectable } from '@angular/core';
import { Track } from '../models/track.model';
import { VehicleClass } from '../models/vehicle.model';
import { BEGINNER_TRACKS } from '../data/tracks.data';

@Injectable({
  providedIn: 'root',
})
export class TrackService {
  private tracks: Track[] = BEGINNER_TRACKS;

  constructor() {}

  /**
   * Returns all available tracks
   */
  getAllTracks(): Track[] {
    return this.tracks;
  }

  /**
   * Returns tracks that support the specified vehicle class
   * @param vehicleClass The vehicle class to filter by
   * @returns Filtered list of compatible tracks
   */
  getTracksByVehicleClass(vehicleClass: VehicleClass | null): Track[] {
    if (!vehicleClass) {
      return this.tracks;
    }

    return this.tracks.filter(
      (track) => track.referenceLapTimes[vehicleClass] !== undefined
    );
  }

  /**
   * Gets a track by its ID
   * @param trackId The ID of the track to find
   * @returns The track or undefined if not found
   */
  getTrackById(trackId: string): Track | undefined {
    return this.tracks.find((track) => track.id === trackId);
  }

  /**
   * Adds a custom track (for admin or development purposes)
   * @param track The track to add
   */
  addTrack(track: Track): void {
    this.tracks.push(track);
  }
}

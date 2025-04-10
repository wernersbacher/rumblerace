import { Track } from '../models/track.model';

export const BEGINNER_TRACKS: Track[] = [
  {
    id: 'track1',
    name: 'Silverstone',
    lengthMeters: 5891,
    country: 'UK',
    slowCorners: 5,
    mediumCorners: 10,
    fastCorners: 15,
    straights: 5,
    referenceLapTimes: { GT3: 119, GT4: 128 },
    difficulty: 7,
  },
  {
    id: 'track2',
    name: 'Monza',
    lengthMeters: 5793,
    country: 'Italy',
    slowCorners: 3,
    mediumCorners: 5,
    fastCorners: 10,
    straights: 10,
    referenceLapTimes: { GT3: 106, GT4: 115 },
    difficulty: 5,
  },
];

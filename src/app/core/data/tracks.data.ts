import { Track } from '../models/track.model';

export const BEGINNER_TRACKS: Track[] = [
  {
    id: 'track1',
    name: 'Silverstone',
    country: 'UK',
    slowCorners: 5,
    mediumCorners: 10,
    fastCorners: 15,
    straights: 5,
    referenceLapTimes: { GT3: 120, GT4: 130 },
    difficulty: 7,
  },
  {
    id: 'track2',
    name: 'Monza',
    country: 'Italy',
    slowCorners: 3,
    mediumCorners: 5,
    fastCorners: 10,
    straights: 10,
    referenceLapTimes: { GT3: 110, GT4: 125 },
    difficulty: 5,
  },
];

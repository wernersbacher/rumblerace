export interface Racecraft {
  attack: number; // Offensivwert (z. B. 0.8 = 80% Effektivität)
  defense: number; // Defensivwert
}

export interface Driver {
  id: number;
  name: string;
  baseLapTime: number; // Basis-Rundenzeit in Sekunden (ohne Schaden)
  damage: number; // Ansammelter Schaden (jeder Punkt verzögert den Fahrer)
  aggression: number; // Aggressivitätslevel (z. B. 1 bis 5)
  racecraft: Racecraft;
  isPlayer: boolean;

  // Simulationszustand
  currentLap: number;
  trackPosition: number; // Zurückgelegte Strecke in der aktuellen Runde (in Metern)
  finished: boolean; // true, wenn der Fahrer das Rennen beendet hat
  totalTime: number; // Gesamte Rennzeit in Sekunden (wird inkrementell geführt)
}

import { Race } from './core';
import { Driver } from './models';

// Erstelle einen Spieler und 20 Gegner – Startpositionen sind im Array festgelegt
const drivers: Driver[] = [];

// Spieler
drivers.push({
  id: 0,
  name: 'Spieler',
  baseLapTime: 90, // 90 Sekunden pro Runde als Basis
  damage: 0,
  aggression: 4, // Anfangswert; kann live verändert werden
  racecraft: { attack: 0.9, defense: 0.8 },
  isPlayer: true,
  currentLap: 0,
  trackPosition: 0,
  finished: false,
  totalTime: 0,
});

for (let i = 1; i <= 4; i++) {
  drivers.push({
    id: i,
    name: `Gegner ${i}`,
    baseLapTime: 90 + Math.random() * 3, // leicht variierende Basiszeit
    damage: 0,
    aggression: 2 + Math.random() * 2, // zwischen 2 und 4
    racecraft: {
      attack: 0.8 + Math.random() * 0.2,
      defense: 0.8 + Math.random() * 0.2,
    },
    isPlayer: false,
    currentLap: 0,
    trackPosition: 0,
    finished: false,
    totalTime: 0,
  });
}

// Starte das Rennen mit z. B. 10 Runden
const race = new Race(drivers, 3, '1234');
race.simulateRace();

// Gib das Log in der Konsole aus
console.log('Renn-Log:');
race.log.forEach((entry: string) => console.log(entry));

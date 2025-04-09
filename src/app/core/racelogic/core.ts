import Rand from 'rand-seed';
import { RaceDriver } from '../models/race.model';
import { DAMAGE_PENALTY } from './damage';

/**
 * Die Race-Klasse simuliert das Rennen in kleinen Zeitschritten (ticks).
 * Die Fahrer fahren ideal (basierend auf ihrer effektiven Rundenzeit) und
 * werden durch den vorderen Wagen gebremst, wenn sie zu nah auffahren.
 * Außerdem wird in jedem Tick geprüft, ob ein Fehler (und damit Schaden) oder
 * ein Überholversuch ausgelöst wird.
 */
export class Race {
  rng: Rand;
  drivers: RaceDriver[] = [];
  numLaps: number;
  log: string[] = [];
  debugMode: boolean = false;

  // Simulationseinstellungen:
  readonly dt: number = 0.5; // Zeitschritt (Sekunden)
  readonly trackLength: number = 3500; // Länge einer Runde in Metern
  readonly errorBaseChance: number = 0.005; // Basiswahrscheinlichkeit für einen Fehler pro Sekunde
  readonly overtakeBaseChance: number = 0.01; // Basischance, dass ein Überholversuch initiiert wird, wenn gedrängt

  constructor(
    drivers: RaceDriver[],
    numLaps: number,
    seed: string | undefined,
    debugMode: boolean = false
  ) {
    this.debugMode = debugMode;
    this.rng = new Rand(seed);
    // Fahrer werden in Startreihenfolge im Array geliefert.
    this.drivers = drivers;
    this.numLaps = numLaps;
    // Initialisiere die Simulationstate der Fahrer:
    this.drivers.forEach((driver) => {
      driver.currentLap = 1;
      driver.trackPosition = 0;
      driver.finished = false;
      driver.totalTime = 0;
    });
  }
  private addToLog(message: string, isDebug: boolean = false): void {
    if (!isDebug || (isDebug && this.debugMode)) {
      this.log.push(message);
    }
  }

  /**
   * Liefert die effektive Rundenzeit eines Fahrers basierend auf seinem Schaden
   * und einem kleinen Zufallsfaktor zur Variation.
   */
  getEffectiveLapTime(driver: RaceDriver): number {
    // Je mehr Schaden, desto langsamer:
    const damagePenalty = driver.damage * DAMAGE_PENALTY;
    // Der Zufallsfaktor simuliert kleine Schwankungen (z. B. -0.2 bis +0.2 Sekunden)
    const randomFactor = this.rng.next() * 0.2 - 0.1;
    return driver.baseLapTime + damagePenalty + randomFactor;
  }

  /**
   * Berechnet die ideale Geschwindigkeit in m/s des Fahrers, wenn er frei fahren könnte.
   */
  getIdealSpeed(driver: RaceDriver): number {
    const effectiveLapTime = this.getEffectiveLapTime(driver);
    return this.trackLength / effectiveLapTime;
  }

  /**
   * Führt die Rennsimulation im dt-Takt aus, bis alle Fahrer das Rennen beendet haben.
   * Währenddessen wird jedes Tick (jede Sekunde) simuliert – mit Eventprüfungen und
   * Live-Abstandsberechnungen.
   */
  simulateRace() {
    let simulationTime = 0;
    // Simulation läuft, bis alle Fahrer fertig sind.
    while (this.drivers.some((driver) => !driver.finished)) {
      simulationTime += this.dt;
      this.addToLog(' ');
      this.processSimulationTick(simulationTime);
    }

    this.addToLog(`--- Rennen beendet ---`);
    this.logFinalPositions();
  }

  /**
   * Verarbeitet einen einzelnen Simulationstick für alle Fahrer
   * @param simulationTime Die aktuelle Simulationszeit
   */
  processSimulationTick(simulationTime: number): void {
    // First collect all position updates without applying them
    const positionUpdates = this.drivers.map((driver) => {
      if (driver.finished) return null;

      // Calculate the update but don't apply it yet
      const idealSpeed = this.getIdealSpeed(driver);
      const leader = this.findImmediateLeader(driver);
      const actualSpeed = this.calculateActualSpeed(driver, idealSpeed, leader);

      // Return the update data
      return {
        driver,
        newPosition: driver.trackPosition + actualSpeed * this.dt,
        timeDelta: this.dt,
        speed: actualSpeed,
      };
    });

    // Now apply all updates simultaneously
    positionUpdates.forEach((update) => {
      if (!update) return;

      const { driver, newPosition, timeDelta, speed } = update;
      driver.trackPosition = newPosition;
      driver.totalTime += timeDelta;

      // Check for lap completion
      this.checkLapCompletion(driver, speed);
    });

    // Process events after all positions are updated
    this.drivers.forEach((driver) => {
      if (!driver.finished) {
        this.processEvents(driver, simulationTime);
      }
    });

    // Log live gaps with updated positions
    this.logLiveGaps(simulationTime);
  }

  /**
   * Berechnet die tatsächliche Geschwindigkeit eines Fahrers unter Berücksichtigung des Leaders
   * @param driver Der Fahrer
   * @param idealSpeed Die ideale Geschwindigkeit des Fahrers
   * @param leader Der führende Fahrer (oder null)
   * @returns Die tatsächliche Geschwindigkeit
   */
  calculateActualSpeed(
    driver: RaceDriver,
    idealSpeed: number,
    leader: RaceDriver | null
  ): number {
    let actualSpeed = idealSpeed;

    if (leader) {
      // Berechne den Abstand zum Führer in Metern:
      const gap = this.calculateGapToLeader(driver, leader);

      // Wenn der Abstand negativ ist (wegen Überholungen) oder sehr klein,
      // kann der Fahrer nicht schneller fahren als der Leader:
      if (gap < 10) {
        // Beispiel: Wenn Abstand unter 10 Meter liegt,
        // dann wird die Geschwindigkeit auf die des Leaders reduziert.
        actualSpeed = Math.min(actualSpeed, this.getIdealSpeed(leader));
      }

      this.addToLog(
        `[DEBUG] ${driver.driver.name} speed: ${actualSpeed.toFixed(
          2
        )} m/s (${idealSpeed.toFixed(2)} m/s id), gap to leader: ${gap.toFixed(
          2
        )} m`,
        true
      );
    } else {
      this.addToLog(
        `[DEBUG] ${driver.driver.name} speed: ${actualSpeed.toFixed(
          2
        )} m/s (${idealSpeed.toFixed(2)} m/s id), (leader)`,
        true
      );
    }

    return actualSpeed;
  }

  /**
   * Berechnet den Abstand zwischen Fahrer und Leader
   * @param driver Der Fahrer
   * @param leader Der Leader
   * @returns Abstand in Metern
   */
  calculateGapToLeader(driver: RaceDriver, leader: RaceDriver): number {
    return leader.trackPosition - driver.trackPosition;
  }

  /**
   * Prüft, ob ein Fahrer eine Runde abgeschlossen hat oder das Rennen beendet hat
   * @param driver Der zu prüfende Fahrer
   * @param actualSpeed Die aktuelle Geschwindigkeit in m/s
   */
  checkLapCompletion(driver: RaceDriver, actualSpeed: number): void {
    if (driver.trackPosition < this.trackLength) {
      return;
    }

    // Calculate the precise fraction of time it took to cross the finish line
    const overrunDistance = driver.trackPosition - this.trackLength;
    // Time adjustment = fraction of the time step that was used to reach the finish line
    const timeAdjustment = actualSpeed > 0 ? overrunDistance / actualSpeed : 0;

    // Adjust total time to represent the exact finish time
    driver.totalTime -= timeAdjustment;

    driver.currentLap++;
    // Überschüssige Strecke zum Übertrag in die nächste Runde:
    driver.trackPosition = overrunDistance;
    this.addToLog(
      `${driver.driver.name} beendete Runde ${
        driver.currentLap - 1
      } (Gesamtzeit: ${driver.totalTime.toFixed(3)}s)`
    );

    // Prüfe, ob das Rennen vorbei ist
    if (driver.currentLap > this.numLaps) {
      driver.finished = true;
      this.addToLog(
        `${
          driver.driver.name
        } hat das Rennen beendet in ${driver.totalTime.toFixed(3)} Sekunden.`
      );
    }
  }

  /**
   * Prüft für den aktuellen Fahrer, ob ein Fehler oder Überholversuch passiert.
   * Die Wahrscheinlichkeiten werden über den Aggressionslevel und die Racecraft-Werte moduliert.
   */
  processEvents(driver: RaceDriver, currentTime: number) {
    if (driver.finished) return;

    // Fehlerchance: Basischance plus ein Zuschlag je nach Aggression.
    const errorChance = this.errorBaseChance + 0.002 * driver.aggression;
    if (this.rng.next() < errorChance) {
      // Fehler-/Unfall-Ereignis:
      // Bei hoher Aggression kann es zu einem größeren Unfall kommen.
      const accidentThreshold = 3; // ab Aggression 4 steigt Unfallrisiko
      if (driver.aggression >= accidentThreshold && this.rng.next() < 0.15) {
        const damage = this.getRandomInRange(1, 3);
        driver.damage += damage;
        this.addToLog(
          `[${currentTime.toFixed(1)}s] ${
            driver.driver.name
          } hat einen schweren Fehler gemacht und Schaden +${damage.toFixed(
            1
          )} erlitten!`
        );
      } else {
        // Kleinere Fehler: leichter Schaden
        const damage = this.getRandomInRange(0.2, 1);
        driver.damage += damage;
        this.addToLog(
          `[${currentTime.toFixed(1)}s] ${
            driver.driver.name
          } macht einen Fehler und verliert etwas Tempo (Schaden +${damage.toFixed(
            1
          )}).`
        );
      }
    }

    // Überholversuch: Wenn der Fahrer dicht am Vordermann fährt,
    // kann er versuchen, diesen zu überholen.
    // Ein solcher Versuch wird nur initiiert, wenn der Abstand in Metern sehr gering ist.
    const leader = this.findImmediateLeader(driver);
    if (
      leader &&
      driver.currentLap === leader.currentLap && // Ensure they are on the same lap
      leader.trackPosition - driver.trackPosition < 20 &&
      this.getIdealSpeed(driver) > this.getIdealSpeed(leader)
    ) {
      // Berechne eine Überholchance, basierend auf Aggression und Racecraft.
      const baseOvertakeChance =
        (driver.aggression * driver.racecraft.attack) /
        leader.racecraft.defense;
      // Normalisiere in einen sinnvollen Bereich:
      const chance =
        Math.min(Math.max(baseOvertakeChance, 0.1), 0.6) +
        this.overtakeBaseChance;
      this.addToLog(
        `[DEBUG] ${driver.driver.name} attempting to overtake ${
          leader.driver.name
        } with chance ${chance.toFixed(2)}`,
        true
      );
      if (this.rng.next() < chance) {
        // Überholversuch erfolgreich: Tausche den Fortschritt der beiden Fahrer,
        // sodass der Trailing den Leader überholt.
        this.swapPositions(driver, leader);
        this.addToLog(
          `[${currentTime.toFixed(1)}s] ${driver.driver.name} überholt ${
            leader.driver.name
          }!`
        );
      } else {
        // Scheiterter Überholversuch: kleiner Fehler, der zusätzlichen Schaden einbringt.
        const damage = this.getRandomInRange(0, 0.5);
        driver.damage += damage;
        this.addToLog(
          `[${currentTime.toFixed(1)}s] ${
            driver.driver.name
          } versucht zu überholen, scheitert aber und verliert Zeit (Schaden +${damage.toFixed(
            1
          )}).`
        );
      }
    }
  }

  /**
   * Hilfsfunktion: Findet den unmittelbar vor dem gegebenen Fahrer liegenden
   * Fahrer (im Sinne des Fortschritts). Dazu wird nach Fahrern gesucht, die weiter
   * als der aktuelle Fahrer sind. Liegt keiner vor, gibt es null zurück.
   */
  findImmediateLeader(driver: RaceDriver): RaceDriver | null {
    // Filtere alle Fahrer, die noch nicht fertig sind und weiter fortgeschritten sind.
    const candidates = this.drivers.filter(
      (d) =>
        !d.finished &&
        d.totalTime >= 0 &&
        (d.totalTime > driver.totalTime ||
          d.trackPosition > driver.trackPosition)
    );
    if (candidates.length === 0) return null;
    // Sortiere nach (Laufender Gesamtfortschritt: (aktuelle Runde * Strecke + Position)).
    candidates.sort((a, b) => {
      const progressA = a.currentLap * this.trackLength + a.trackPosition;
      const progressB = b.currentLap * this.trackLength + b.trackPosition;
      return progressA - progressB;
    });
    // Der jeweils erste Kandidat ist der unmittelbar vor dem Fahrer.
    return candidates[0];
  }

  /**
   * Tauscht die Positionen (trackPosition und ggf. zusätzliche Kennwerte) zweier Fahrer
   * als Folge eines erfolgreichen Überholversuchs.
   */
  swapPositions(driverA: RaceDriver, driverB: RaceDriver) {
    const totalProgressA =
      driverA.currentLap * this.trackLength + driverA.trackPosition;
    const totalProgressB =
      driverB.currentLap * this.trackLength + driverB.trackPosition;

    // Swap their total progress
    driverA.trackPosition = totalProgressB % this.trackLength;
    driverA.currentLap = Math.floor(totalProgressB / this.trackLength);

    driverB.trackPosition = totalProgressA % this.trackLength;
    driverB.currentLap = Math.floor(totalProgressA / this.trackLength);
  }

  /**
   * Loggt live die Abstände zwischen den Fahrern in Sekunden.
   * Für jeden Fahrer (außer dem Spitzenfahrer) wird der Zeitabstand zu seinem unmittelbaren
   * Vordermann berechnet. Dabei wird der Abstand (in Metern) durch die ideale Geschwindigkeit des Vordermanns geteilt.
   */
  logLiveGaps(currentTime: number) {
    // Sortiere Fahrer nach Gesamtfortschritt:
    const sortedDrivers = [...this.drivers].sort((a, b) => {
      const progressA = a.currentLap * this.trackLength + a.trackPosition;
      const progressB = b.currentLap * this.trackLength + b.trackPosition;
      return progressB - progressA; // absteigende Reihenfolge (Führer zuerst)
    });

    let gapLog = `[${currentTime.toFixed(1)}s] Live-Abstände: `;
    gapLog += sortedDrivers
      .map((driver, i) => {
        if (i === 0) return `${driver.driver.name} (Leading)`;
        // Berechne den Abstand zwischen dem Fahrer und seinem Vordermann in Metern:
        const leader = sortedDrivers[i - 1];
        const meterGap =
          leader.currentLap * this.trackLength +
          leader.trackPosition -
          (driver.currentLap * this.trackLength + driver.trackPosition);

        // Berechne die Zeit, die der Fahrer bei seiner idealen Geschwindigkeit braucht,
        // um diesen Abstand aufzuholen
        const driverSpeed = this.getIdealSpeed(driver);
        const timeGap = driverSpeed > 0 ? meterGap / driverSpeed : 0;

        return `${driver.driver.name}: ${timeGap.toFixed(1)}s`;
      })
      .join(' | ');
    this.addToLog(gapLog);
  }

  logFinalPositions() {
    // Sortiere nach Gesamtzeit (aufsteigend)
    const sortedDrivers = [...this.drivers].sort(
      (a, b) => a.totalTime - b.totalTime
    );

    this.addToLog('Finale Platzierung:');
    const winnerTime = sortedDrivers[0].totalTime; // Zeit des ersten Fahrers (Gewinner)

    sortedDrivers.forEach((driver, index) => {
      const timeDelta = driver.totalTime - winnerTime; // Zeitdifferenz zum Gewinner
      this.addToLog(
        `${index + 1}. ${
          driver.driver.name
        } – Gesamtzeit: ${driver.totalTime.toFixed(
          1
        )}s, Schaden: ${driver.damage.toFixed(1)}, Abstand: ${
          index === 0 ? '---' : `+${timeDelta.toFixed(1)}s`
        }`
      );
    });
  }

  // Liefert eine Zufallszahl im Bereich [min, max)
  getRandomInRange(min: number, max: number): number {
    return this.rng.next() * (max - min) + min;
  }
}

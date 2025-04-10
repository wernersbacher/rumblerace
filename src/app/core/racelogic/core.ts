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
  log: string[] = []; // Add at class level:
  debugMode: boolean = false;

  // Simulationseinstellungen:
  readonly dt: number = 0.5; // Zeitschritt (Sekunden)
  readonly trackLength: number = 3500; // Länge einer Runde in Metern
  readonly errorBaseChance: number = 0.005; // Basiswahrscheinlichkeit für einen Fehler pro Sekunde
  readonly overtakeBaseChance: number = 0.003; // Basischance, dass ein Überholversuch initiiert wird, wenn gedrängt

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
    const driverProgress =
      driver.currentLap * this.trackLength + driver.trackPosition;
    const leaderProgress =
      leader.currentLap * this.trackLength + leader.trackPosition;

    return leaderProgress - driverProgress;
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

    // Handle driver errors
    this.processDriverError(driver, currentTime);

    // Handle overtaking attempts
    this.processOvertakingAttempt(driver, currentTime);
  }

  /**
   * Processes potential driver errors based on driver aggression and random chance
   */
  processDriverError(driver: RaceDriver, currentTime: number): void {
    const errorChance = this.calculateErrorChance(driver);

    if (this.rng.next() < errorChance) {
      if (this.isMajorError(driver)) {
        this.applyMajorError(driver, currentTime);
      } else {
        this.applyMinorError(driver, currentTime);
      }
    }
  }

  /**
   * Calculates the chance of a driver making an error based on their aggression
   */
  calculateErrorChance(driver: RaceDriver): number {
    return this.errorBaseChance + 0.002 * driver.aggression;
  }

  /**
   * Determines if a driver's error is major based on aggression and random chance
   */
  isMajorError(driver: RaceDriver): boolean {
    const accidentThreshold = 3;
    return driver.aggression >= accidentThreshold && this.rng.next() < 0.15;
  }

  /**
   * Applies a major error effect to the driver
   */
  applyMajorError(driver: RaceDriver, currentTime: number): void {
    const damage = this.getRandomInRange(1, 3);
    driver.damage += damage;
    this.addToLog(
      `[${currentTime.toFixed(1)}s] ${
        driver.driver.name
      } hat einen schweren Fehler gemacht und Schaden +${damage.toFixed(
        1
      )} erlitten!`
    );
  }

  /**
   * Applies a minor error effect to the driver
   */
  applyMinorError(driver: RaceDriver, currentTime: number): void {
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

  /**
   * Processes potential overtaking attempts based on driver position and skills
   */
  processOvertakingAttempt(driver: RaceDriver, currentTime: number): void {
    // Check if driver is on cooldown from previous overtake
    if (driver.overtakeCooldown > 0) {
      driver.overtakeCooldown -= this.dt;
      return;
    }

    const leader = this.findImmediateLeader(driver);

    if (!this.canAttemptOvertake(driver, leader)) {
      return;
    }

    // Get the minimum speed advantage needed to attempt an overtake
    const requiredSpeedAdvantage = 1.02; // Need to be 2% faster
    const driverIdealSpeed = this.getIdealSpeed(driver);
    const leaderIdealSpeed = this.getIdealSpeed(leader!);

    if (driverIdealSpeed < leaderIdealSpeed * requiredSpeedAdvantage) {
      return; // Not enough speed advantage
    }

    const overtakeChance = this.calculateOvertakeChance(driver, leader!);

    this.addToLog(
      `[DEBUG] ${driver.driver.name} attempting to overtake ${
        leader!.driver.name
      } with chance ${overtakeChance.toFixed(2)}`,
      true
    );

    if (this.rng.next() < overtakeChance) {
      this.applySuccessfulOvertake(driver, leader!, currentTime);
    } else {
      this.applyFailedOvertake(driver, currentTime);
    }
  }

  /**
   * Determines if a driver can attempt an overtake based on race conditions
   */
  canAttemptOvertake(driver: RaceDriver, leader: RaceDriver | null): boolean {
    return (
      leader !== null &&
      driver.currentLap === leader.currentLap && // Ensure they are on the same lap
      this.calculateGapToLeader(driver, leader) < 20 // Close enough to attempt overtake
    );
  }

  /**
   * Calculates the chance of a successful overtake based on driver skills
   */
  calculateOvertakeChance(driver: RaceDriver, leader: RaceDriver): number {
    const baseOvertakeChance =
      (driver.aggression * driver.racecraft.attack) / leader.racecraft.defense;

    // Set reasonable minimum and maximum chances
    return (
      Math.min(Math.max(baseOvertakeChance, 0.1), 0.5) + this.overtakeBaseChance
    );
  }

  /**
   * Applies effects of a successful overtake
   */
  applySuccessfulOvertake(
    driver: RaceDriver,
    leader: RaceDriver,
    currentTime: number
  ): void {
    this.swapPositions(driver, leader);
    this.addToLog(
      `[${currentTime.toFixed(1)}s] ${driver.driver.name} überholt ${
        leader.driver.name
      }!`
    );

    // Apply overtaking cooldown to prevent immediate counter-overtaking
    driver.overtakeCooldown = 5; // cooldown for successful overtake
    leader.overtakeCooldown = 3; // cooldown for overtaken driver
  }

  /**
   * Applies effects of a failed overtake attempt
   */
  applyFailedOvertake(driver: RaceDriver, currentTime: number): void {
    const damage = this.getRandomInRange(0, 0.5);
    driver.damage += damage;
    this.addToLog(
      `[${currentTime.toFixed(1)}s] ${
        driver.driver.name
      } versucht zu überholen, scheitert aber und verliert Zeit (Schaden +${damage.toFixed(
        1
      )}).`
    );

    // Apply shorter cooldown after failed attempt
    driver.overtakeCooldown = 4; // cooldown for failed overtake
  }

  findImmediateLeader(driver: RaceDriver): RaceDriver | null {
    // Calculate total progress for current driver
    const driverProgress =
      driver.currentLap * this.trackLength + driver.trackPosition;

    // Find all drivers ahead of this one (those with greater total progress)
    const candidates = this.drivers.filter(
      (d) =>
        !d.finished &&
        d !== driver && // Don't include the driver itself
        d.totalTime >= 0 &&
        (d.currentLap > driver.currentLap ||
          (d.currentLap === driver.currentLap &&
            d.trackPosition > driver.trackPosition))
    );

    if (candidates.length === 0) return null;

    // Sort by total progress to find the closest driver ahead
    candidates.sort((a, b) => {
      const progressA = a.currentLap * this.trackLength + a.trackPosition;
      const progressB = b.currentLap * this.trackLength + b.trackPosition;
      return progressA - progressB; // ascending order
    });

    // Return the driver immediately ahead (smallest progress greater than driver's)
    for (const candidate of candidates) {
      const candidateProgress =
        candidate.currentLap * this.trackLength + candidate.trackPosition;
      if (candidateProgress > driverProgress) {
        return candidate;
      }
    }

    return null;
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

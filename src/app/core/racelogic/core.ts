import Rand from 'rand-seed';
import { RaceConfig, RaceDriver } from '../models/race.model';
import { SIMCONFIG } from './simulation';
import { VEHICLE_AERO_CHARACTERISTICS } from '../data/vehicle.data';
import { RacingUtils } from './racingutils';

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
  trackLength: number;
  log: string[] = [];
  debugMode: boolean = false;
  raceConfig: RaceConfig;

  constructor(
    drivers: RaceDriver[],
    config: RaceConfig,
    debugMode: boolean = false
  ) {
    this.debugMode = debugMode;
    this.rng = new Rand(config.seed);
    // Fahrer werden in Startreihenfolge im Array geliefert.
    this.drivers = drivers;
    this.raceConfig = config;
    this.trackLength = config.track.lengthMeters;
    this.numLaps = config.numLaps;
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
    const damagePenalty = driver.damage * SIMCONFIG.DAMAGE_PENALTY;
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
      simulationTime += SIMCONFIG.DT;
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
    this.addToLog(' ');

    this.drivers.sort((a, b) => {
      const progressA = a.currentLap * this.trackLength + a.trackPosition;
      const progressB = b.currentLap * this.trackLength + b.trackPosition;
      return progressB - progressA; // Descending order (leader first)
    });

    // First collect all position updates without applying them
    const positionUpdates = this.drivers.map((driver) => {
      if (driver.finished) return null;

      // Calculate the update but don't apply it yet
      const idealSpeed = this.getIdealSpeed(driver);
      const driverAhead = this.findDriverAhead(driver);
      const actualSpeed = this.calculateActualSpeed(
        driver,
        idealSpeed,
        driverAhead
      );

      // Return the update data
      return {
        driver,
        newPosition: driver.trackPosition + actualSpeed * SIMCONFIG.DT,
        timeDelta: SIMCONFIG.DT,
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

  calculateActualSpeed(
    driver: RaceDriver,
    idealSpeed: number,
    driverAhead: RaceDriver | null
  ): number {
    let actualSpeed = idealSpeed;

    if (!driverAhead) {
      this.addToLog(
        `[DEBUG] ${driver.driver.name} - Pos: L${
          driver.currentLap
        }@${driver.trackPosition.toFixed(1)}m - ` +
          `Speed: ${actualSpeed.toFixed(2)} m/s (${idealSpeed.toFixed(
            2
          )} m/s ideal) - ` +
          `LEADER - ` +
          `Damage: ${driver.damage.toFixed(1)} - ` +
          `Time: ${driver.totalTime.toFixed(1)}s`,
        true
      );
      return actualSpeed;
    }

    // Calculate the gap to the leader in meters
    const gap = this.calculateGapToLeader(driver, driverAhead);

    // Get the vehicle aero characteristics for the current class
    const aeroCharacteristics =
      VEHICLE_AERO_CHARACTERISTICS[this.raceConfig.vehicleClass];

    // Calculate track's dirty air factor using static method
    const trackDirtyAirFactor = RacingUtils.calculateTrackDirtyAirFactor(
      this.raceConfig.track
    );

    // Calculate minimum following distance using static method
    const minTimeGap = RacingUtils.calculateMinTimeGap(
      aeroCharacteristics,
      driverAhead.racecraft.defense,
      trackDirtyAirFactor
    );

    // Convert time gap to distance
    const minDistanceGap = minTimeGap * idealSpeed;

    // Check if the driver has a significant speed advantage and is close enough
    // for a potential overtake attempt
    const driverIdealSpeed = this.getIdealSpeed(driver);
    const leaderIdealSpeed = this.getIdealSpeed(driverAhead);
    const hasSpeedAdvantage = driverIdealSpeed > leaderIdealSpeed * 1.02; // 2% faster
    const isInOvertakingRange = gap < 20; // Within reasonable range for overtaking
    const isAggressiveEnough = driver.aggression > 2; // Driver is aggressive enough to attempt it

    // If the driver has potential to overtake, allow them to get closer than normal
    if (hasSpeedAdvantage && isInOvertakingRange && isAggressiveEnough) {
      // Store that driver is in overtaking mode
      driver.isAttemptingOvertake = true;

      // Allow getting closer, but still maintain some physics constraints
      if (gap < 5) {
        // Very close: prevent collision but allow aggressive driving
        actualSpeed = Math.min(actualSpeed, leaderIdealSpeed * 0.99);
      } else {
        // Close but not dangerously so: maintain small gap but allow closing in
        actualSpeed = Math.min(
          actualSpeed,
          driverIdealSpeed * 0.98 + leaderIdealSpeed * 0.02
        );
      }
    } else {
      // Regular following behavior - maintain realistic gaps
      driver.isAttemptingOvertake = false;

      if (gap < minDistanceGap) {
        // Calculate how much to slow down based on how close we are
        const closenessRatio = Math.max(0, gap / minDistanceGap);
        const speedFactor = 0.95 + 0.03 * closenessRatio;

        // If very close, fall back slightly behind leader's speed
        if (gap < 10) {
          const leaderSpeed = this.getIdealSpeed(driverAhead);
          actualSpeed = Math.min(actualSpeed, leaderSpeed * 0.98);
        } else {
          // Otherwise apply graduated speed reduction
          actualSpeed = Math.min(actualSpeed, idealSpeed * speedFactor);
        }
      }
    }

    this.addToLog(
      `[DEBUG] ${driver.driver.name} - Pos: L${
        driver.currentLap
      }@${driver.trackPosition.toFixed(1)}m - ` +
        `Speed: ${actualSpeed.toFixed(2)} m/s (${idealSpeed.toFixed(
          2
        )} m/s ideal) - ` +
        `Gap to ${driverAhead.driver.name}: ${gap.toFixed(
          2
        )}m (Min: ${minDistanceGap.toFixed(2)}m) - ` +
        `Overtaking Mode: ${driver.isAttemptingOvertake} - ` +
        `Dirty Air Factor: ${trackDirtyAirFactor.toFixed(2)} - ` +
        `Min Time Gap: ${minTimeGap.toFixed(2)}s - ` +
        `Damage: ${driver.damage.toFixed(1)} - ` +
        `Time: ${driver.totalTime.toFixed(1)}s`,
      true
    );

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

  checkLapCompletion(driver: RaceDriver, actualSpeed: number): void {
    if (driver.trackPosition < this.trackLength) {
      return;
    }

    // Calculate the precise fraction of time it took to cross the finish line
    const overrunDistance = driver.trackPosition - this.trackLength;
    // Time adjustment = fraction of the time step that was used to reach the finish line
    const timeAdjustment = actualSpeed > 0 ? overrunDistance / actualSpeed : 0;

    // Calculate this lap's time based on whether it's the first lap or a subsequent lap
    let lapTime;
    if (driver.currentLap === 1) {
      // For the first lap, it's simply the adjusted total time
      lapTime = driver.totalTime - timeAdjustment;
    } else {
      // For subsequent laps, calculate the time since the last lap completion
      const previousLapsTotal = driver.lapTimes.reduce(
        (sum, time) => sum + time,
        0
      );
      lapTime = driver.totalTime - previousLapsTotal - timeAdjustment;
    }

    // Store lap time information
    if (driver.currentLap >= 1) {
      driver.lastLapTime = lapTime;

      // Store the lap time in the array
      driver.lapTimes.push(lapTime);

      // Update best lap time if this is faster or first lap
      if (driver.bestLapTime === undefined || lapTime < driver.bestLapTime) {
        driver.bestLapTime = lapTime;
      }

      // Update log with best lap info
      const bestLapInfo = lapTime === driver.bestLapTime ? ' (Best Lap!)' : '';
      this.addToLog(
        `${driver.driver.name} sets lap time: ${lapTime.toFixed(
          3
        )}s${bestLapInfo}`
      );
    }

    // Update log with lap time information
    const lapTimeInfo = driver.lastLapTime
      ? ` (Rundenzeit: ${driver.lastLapTime.toFixed(3)}s)`
      : '';

    this.addToLog(
      `${driver.driver.name} beendete Runde ${
        driver.currentLap - 1
      } (Gesamtzeit: ${driver.totalTime.toFixed(3)}s)${lapTimeInfo}`
    );

    // Check if this lap was last lap => finished race
    if (driver.currentLap >= this.numLaps) {
      driver.finished = true;
      const overrunDistance = driver.trackPosition - this.trackLength;
      const timeAdjustment =
        actualSpeed > 0 ? overrunDistance / actualSpeed : 0;
      driver.totalTime -= timeAdjustment;
      this.addToLog(
        `${
          driver.driver.name
        } hat das Rennen beendet in ${driver.totalTime.toFixed(3)} Sekunden.`
      );
    } else {
      // Update driver's position for the next lap
      driver.trackPosition = overrunDistance;
      driver.currentLap += 1;
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
    return SIMCONFIG.ERROR_BASE_CHANCE_PER_TICK + 0.002 * driver.aggression;
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
      driver.overtakeCooldown -= SIMCONFIG.DT;
      return;
    }

    const driverAhead = this.findDriverAhead(driver);

    if (!driverAhead) {
      return;
    }

    // Calculate gap to car ahead
    const gap = this.calculateGapToLeader(driver, driverAhead);

    // Get minimum following distance using static methods
    const aeroCharacteristics =
      VEHICLE_AERO_CHARACTERISTICS[this.raceConfig.vehicleClass];
    const trackDirtyAirFactor = RacingUtils.calculateTrackDirtyAirFactor(
      this.raceConfig.track
    );
    const minTimeGap = RacingUtils.calculateMinTimeGap(
      aeroCharacteristics,
      driverAhead.racecraft.defense,
      trackDirtyAirFactor
    );
    const idealSpeed = this.getIdealSpeed(driver);
    const minDistanceGap = minTimeGap * idealSpeed;

    // Check if driver is close enough to attempt overtake
    const isCloseEnoughForOvertake = gap < minDistanceGap * 1.2; // Within 120% of minimum distance

    var driverSpeed = this.getIdealSpeed(driver);
    var speedNeeded = this.getIdealSpeed(driverAhead) * 1.01;
    // Check speed advantage
    const hasSpeedAdvantage = driverSpeed > speedNeeded;

    if (
      !isCloseEnoughForOvertake ||
      !hasSpeedAdvantage ||
      !driver.isAttemptingOvertake
    ) {
      return;
    }

    const baseOvertakeChance = RacingUtils.calculateBaseOvertakeChance(
      driver,
      driverAhead
    );

    // Adjust overtake chance based on how close driver is - closer increases chance
    const closenessMultiplier = Math.min(1.5, minDistanceGap / gap);
    const finalOvertakeChance = baseOvertakeChance * closenessMultiplier;

    this.addToLog(
      `[DEBUG] ${driver.driver.name} attempting to overtake ${
        driverAhead.driver.name
      } with chance ${finalOvertakeChance.toFixed(
        2
      )} (closeness: ${closenessMultiplier.toFixed(2)})`,
      true
    );

    if (this.rng.next() < finalOvertakeChance) {
      this.applySuccessfulOvertake(driver, driverAhead, currentTime);
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

  findDriverAhead(driver: RaceDriver): RaceDriver | null {
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

    // Update time deltas for each driver to show in race UI
    sortedDrivers.forEach((driver, i) => {
      if (i === 0) {
        // Leader has no time delta
        driver.timeDeltaToAhead = 0;
      } else {
        const ahead = sortedDrivers[i - 1];
        const meterGap =
          ahead.currentLap * this.trackLength +
          ahead.trackPosition -
          (driver.currentLap * this.trackLength + driver.trackPosition);

        // Calculate time gap to driver ahead
        const driverSpeed = this.getIdealSpeed(driver);
        const timeGap = driverSpeed > 0 ? meterGap / driverSpeed : 0;

        // Store time delta for UI display
        driver.timeDeltaToAhead = timeGap;
      }
    });

    let gapLog = `[${currentTime.toFixed(1)}s] Live-Abstände: `;
    gapLog += sortedDrivers
      .map((driver, i) => {
        if (i === 0) return `${driver.driver.name} (Leading)`;
        // Use the correctly stored timeDeltaToAhead
        const timeGap = driver.timeDeltaToAhead ?? 0;
        return `${driver.driver.name}: +${timeGap.toFixed(1)}s`;
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

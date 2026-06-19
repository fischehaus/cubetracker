// Stackmat-Timer-Decoder (W.stackmat, 2026-06-13).
//
// Liest das Audiosignal eines Speed-Stacks-/StackMat-Timers (Gen3/4/5 mit
// Klinken-Datenausgang) und dekodiert daraus Solve-Zeiten. Das Gerät sendet
// kontinuierlich (~10 Frames/s) ein 1200-Baud-Serien-Signal über die
// Kopfhörer-/Mikrofonbuchse — dieselbe Technik nutzt csTimer.
//
// Diese Datei ist BEWUSST pur (keine DOM-/Audio-APIs): der Audio-Capture
// liegt in hooks/useStackmatTimer.ts, damit der Decoder per Encoder→Decoder-
// Roundtrip unit-testbar ist (stackmat.test.ts) — wir können das Signal nicht
// gegen echte Hardware testen, also testen wir gegen ein selbst erzeugtes,
// protokoll-konformes Signal.
//
// Frame-Format (status + 5 Ziffern + Checksum, danach CR/LF):
//   [status][min][sec10][sec1][cs10][cs1][checksum]
//   status:   Zustands-Char ('I'=reset/idle, ' '=running, 'S'=stopped,
//             'A'/'L'/'R'/'C'=Hände/Start). Wir verlassen uns NICHT allein
//             auf das Alphabet (variiert je Generation) — die Stop-Erkennung
//             hat einen Zeit-Stabilitäts-Fallback.
//   Zeit:     min*60000 + (sec10*10+sec1)*1000 + (cs10*10+cs1)*10
//   checksum: 64 + Summe der 5 Ziffern (= '@'..'m', immer druckbar)
//
// SICHERHEIT: jedes Paket wird per Checksum + Zeichen-Plausibilität validiert.
// Bei falscher Signal-Polarität / fremdem Protokoll validiert schlicht nichts
// → „kein Signal" statt Falschzeiten (fail-safe).

export const STACKMAT_BAUD = 1200;

export interface StackmatPacket {
  /** Zustands-Char des Frames (1 Zeichen). */
  status: string;
  /** Dekodierte Zeit in Millisekunden. */
  timeMs: number;
  /** Die 7 rohen Frame-Zeichen (status+5 Ziffern+checksum). */
  raw: string;
}

// ======================================================================
// Frame-Parser (status + 5 Ziffern + checksum)
// ======================================================================

/**
 * Parst genau 7 Zeichen (status + 5 Ziffern + checksum) zu einem Paket.
 * Liefert null wenn Format ODER Checksum nicht stimmen (fail-safe).
 */
export function parseStackmatFrame(chars: string): StackmatPacket | null {
  if (chars.length !== 7) return null;
  const status = chars[0];
  // Status: Großbuchstabe oder Leerzeichen (running). Alles andere = unsync.
  if (!/^[A-Z ]$/.test(status)) return null;
  const digits = chars.slice(1, 6);
  if (!/^[0-9]{5}$/.test(digits)) return null;
  const d = [0, 1, 2, 3, 4].map((i) => digits.charCodeAt(i) - 48);
  const sum = d[0] + d[1] + d[2] + d[3] + d[4];
  if (chars.charCodeAt(6) !== sum + 64) return null;

  const sec = d[1] * 10 + d[2];
  const hund = d[3] * 10 + d[4];
  if (sec > 59 || hund > 99) return null;
  const timeMs = d[0] * 60000 + sec * 1000 + hund * 10;
  return { status, timeMs, raw: chars };
}

/**
 * Baut die 7 Frame-Zeichen (status + 5 Ziffern + checksum) für eine Zeit.
 * Gegenstück zu parseStackmatFrame — primär für Tests + den Encoder.
 */
export function buildStackmatFrame(status: string, timeMs: number): string {
  const clamped = Math.max(0, Math.min(timeMs, 9 * 60000 + 59 * 1000 + 990));
  const min = Math.floor(clamped / 60000);
  const rem = clamped % 60000;
  const sec = Math.floor(rem / 1000);
  const hund = Math.round((rem % 1000) / 10);
  const d = [min, Math.floor(sec / 10), sec % 10, Math.floor(hund / 10), hund % 10];
  const sum = d.reduce((a, b) => a + b, 0);
  return status + d.join("") + String.fromCharCode(sum + 64);
}

// ======================================================================
// UART-Decoder: Audio-Samples → Frame-Zeichen → Pakete
// ======================================================================

/**
 * Dekodiert einen kontinuierlichen Float32-Sample-Strom (ein Polaritäts-
 * Kanal) zu Stackmat-Paketen. UART 8N1 @ 1200 Baud, LSB-first, Start-Bit 0,
 * Stop-Bit 1, idle = high.
 *
 * Robustheit:
 *  - Adaptive Mitte (EMA) + Skala (EMA der Abweichung) → toleriert AC-Kopplung
 *    (DC-Drift) und beliebige Lautstärke.
 *  - Hysterese-Komparator für die Flankenerkennung (kein Rauschen-Chatter).
 *  - Selbst-synchronisierend: bei Versatz wird zeichenweise nachgeschoben, bis
 *    ein checksum-gültiger 7-Zeichen-Frame greift.
 */
export class StackmatDecoder {
  private readonly bitLen: number;
  private readonly onPacket: (p: StackmatPacket) => void;
  private buf: number[] = [];
  private line = "";
  private center = 0;
  private scale = 0.05;
  private level = 1; // hysteretischer Pegel (start: idle high)
  private readonly centerAlpha: number;
  private readonly scaleAlpha: number;

  constructor(sampleRate: number, onPacket: (p: StackmatPacket) => void) {
    this.bitLen = sampleRate / STACKMAT_BAUD;
    this.onPacket = onPacket;
    // EMA über ~50 ms — folgt DC-Drift, ignoriert die 1200-Baud-Modulation.
    this.centerAlpha = 1 / Math.max(1, sampleRate * 0.05);
    this.scaleAlpha = 1 / Math.max(1, sampleRate * 0.05);
  }

  reset(): void {
    this.buf = [];
    this.line = "";
    this.level = 1;
  }

  push(samples: Float32Array | number[]): void {
    for (let i = 0; i < samples.length; i++) this.buf.push(samples[i]);
    this.decode();
  }

  /** Pegel an Sample-Index i relativ zur (langsam mitlaufenden) Mitte. */
  private bitAt(i: number): number {
    return this.buf[i] > this.center ? 1 : 0;
  }

  private decode(): void {
    const byteSamples = Math.ceil(this.bitLen * 10) + 2;
    let i = 0;
    const n = this.buf.length;

    while (i < n) {
      // EMA-Update + Hysterese-Flankenerkennung, Sample für Sample.
      const s = this.buf[i];
      this.center += (s - this.center) * this.centerAlpha;
      this.scale += (Math.abs(s - this.center) - this.scale) * this.scaleAlpha;
      const hyst = Math.max(0.003, this.scale * 0.3);
      let newLevel = this.level;
      if (s > this.center + hyst) newLevel = 1;
      else if (s < this.center - hyst) newLevel = 0;

      const fallingEdge = this.level === 1 && newLevel === 0;

      // Fallende Flanke = mögliches Start-Bit an Index i. Wenn noch nicht genug
      // Samples für ein ganzes Byte da sind: abbrechen OHNE `level` umzusetzen,
      // damit die Flanke beim nächsten push() (mit dem nachgeschobenen Tail) neu
      // erkannt wird. (Bug-Fix: vorher ging die Flanke an der Chunk-Grenze
      // verloren, weil level bereits auf 0 stand.)
      if (fallingEdge && i + byteSamples >= n) {
        break;
      }

      this.level = newLevel;

      if (!fallingEdge) {
        i++;
        continue;
      }

      const byte = this.readByte(i);
      if (byte !== null) {
        this.appendByte(byte);
        // Hinter das Stop-Bit springen; Pegel dort = high (idle/stop).
        i += Math.round(this.bitLen * 9.5);
        this.level = 1;
      } else {
        // Fehl-Start → ein Sample weiter neu suchen.
        i++;
      }
    }

    // Verbrauchte Samples vorne abschneiden.
    if (i > 0) this.buf.splice(0, i);
  }

  /** Liest 10 Bits ab Start-Index s per Mehrheitsentscheid je Bitfenster. */
  private readByte(s: number): number | null {
    const bits: number[] = [];
    for (let k = 0; k < 10; k++) {
      const from = s + (k + 0.25) * this.bitLen;
      const to = s + (k + 0.75) * this.bitLen;
      let hi = 0;
      let lo = 0;
      for (let j = Math.round(from); j < Math.round(to); j++) {
        if (this.bitAt(j) === 1) hi++;
        else lo++;
      }
      bits.push(hi >= lo ? 1 : 0);
    }
    // Start muss 0, Stop muss 1 sein — sonst Fehl-Sync.
    if (bits[0] !== 0 || bits[9] !== 1) return null;
    let byte = 0;
    for (let d = 0; d < 8; d++) byte |= bits[1 + d] << d; // LSB first
    return byte;
  }

  /** Sammelt Zeichen + extrahiert selbst-synchronisierend gültige Frames. */
  private appendByte(byte: number): void {
    // Steuerzeichen (CR/LF) trennen Frames sauber — sie lösen den Sync-Versuch
    // unten ohnehin aus (kein gültiger status), wir brauchen sie nicht extra.
    this.line += String.fromCharCode(byte & 0x7f);
    while (this.line.length >= 7) {
      const cand = this.line.slice(0, 7);
      const p = parseStackmatFrame(cand);
      if (p) {
        this.onPacket(p);
        this.line = this.line.slice(7);
      } else {
        // Ein Zeichen abwerfen und neu ausrichten.
        this.line = this.line.slice(1);
      }
    }
    // Memory-Schranke falls nie ein gültiger Frame kommt (falsche Polarität).
    if (this.line.length > 32) this.line = this.line.slice(-16);
  }
}

/**
 * Polaritäts-agnostischer Decoder: füttert die Samples in zwei
 * StackmatDecoder — einen normal, einen invertiert. Audio-Hardware kann das
 * Signal invertieren (Mic-Vorverstärker, Soundkarte); welche Polarität
 * stimmt, weiß man vorab nicht. Nur der passende Decoder liefert
 * checksum-gültige Pakete, der andere bleibt stumm (kein Doppel-Paket).
 */
export class StackmatDualDecoder {
  private readonly a: StackmatDecoder;
  private readonly b: StackmatDecoder;

  constructor(sampleRate: number, onPacket: (p: StackmatPacket) => void) {
    this.a = new StackmatDecoder(sampleRate, onPacket);
    this.b = new StackmatDecoder(sampleRate, onPacket);
  }

  push(samples: Float32Array | number[]): void {
    this.a.push(samples);
    const neg = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) neg[i] = -samples[i];
    this.b.push(neg);
  }

  reset(): void {
    this.a.reset();
    this.b.reset();
  }
}

// ======================================================================
// Solve-Tracker: Paket-Strom → genau ein Solve-Event pro Lauf
// ======================================================================

export type StackmatTimerPhase = "idle" | "running" | "stopped";

export interface StackmatTrackerEvents {
  /** Solve abgeschlossen (genau einmal pro Lauf). timeMs = finale Zeit. */
  onSolve: (timeMs: number) => void;
  /** Optional: Phasen-/Zeit-Update für die Live-Anzeige. */
  onChange?: (phase: StackmatTimerPhase, timeMs: number) => void;
}

/**
 * Verfolgt die Stackmat-Pakete und feuert genau EIN onSolve pro Lauf.
 *
 * Logik (generations-robust, primär über den Zeit-Wert statt das Status-
 * Alphabet):
 *   - Zeit 0 / status 'I'      → idle (reset; erlaubt den nächsten Solve)
 *   - Zeit ändert sich         → running
 *   - Zeit eingefroren (>0) und (status 'S' ODER N stabile Pakete) → solve,
 *     danach gesperrt bis zum nächsten Reset
 * So wird eine stehengebliebene Altzeit beim Verbinden NICHT als Solve
 * gewertet (running muss zuvor echt gelaufen sein).
 */
export class StackmatSolveTracker {
  private readonly events: StackmatTrackerEvents;
  private readonly stablePackets: number;
  private running = false;
  private emitted = false;
  private lastTime = 0;
  private stable = 0;

  constructor(events: StackmatTrackerEvents, stablePackets = 3) {
    this.events = events;
    this.stablePackets = stablePackets;
  }

  reset(): void {
    this.running = false;
    this.emitted = false;
    this.lastTime = 0;
    this.stable = 0;
  }

  onPacket(p: StackmatPacket): void {
    const { status, timeMs } = p;

    if (status === "I" || timeMs === 0) {
      if (this.running || this.emitted) {
        this.running = false;
        this.emitted = false;
        this.lastTime = 0;
        this.stable = 0;
      }
      this.events.onChange?.("idle", 0);
      return;
    }

    if (timeMs !== this.lastTime) {
      // Zeit hat sich geändert. Ob das „läuft" heißt, entscheidet der Status:
      // ' ' (oder unbekannt) = die Uhr läuft; 'S' = eine eingefrorene Altzeit,
      // die beim Verbinden erstmals gesehen wird (KEIN Lauf → nicht werten).
      this.lastTime = timeMs;
      this.stable = 0;
      if (status !== "S") this.running = true;
      this.events.onChange?.(this.running ? "running" : "stopped", timeMs);
      return;
    }

    // Zeit eingefroren.
    this.stable++;
    const stopped = status === "S" || this.stable >= this.stablePackets;
    if (this.running && stopped && !this.emitted && timeMs > 0) {
      this.emitted = true;
      this.running = false;
      this.events.onChange?.("stopped", timeMs);
      this.events.onSolve(timeMs);
    }
  }
}

// ======================================================================
// Encoder (für Tests + ggf. Diagnose) — Frame-Zeichen → Audio-Samples
// ======================================================================

export interface EncodeOptions {
  sampleRate: number;
  /** Amplitude der Bi-Level-Schwingung (0..1). Default 0.5. */
  amplitude?: number;
  /** +1 = high→positiv (Normal), -1 = invertiert. Default +1. */
  polarity?: 1 | -1;
  /** Idle-High-Bits vor dem ersten Byte. Default 4. */
  leadIdleBits?: number;
}

/**
 * Kodiert eine Byte-Folge als 1200-Baud-UART-Audiosignal (Start 0, 8 Datenbits
 * LSB-first, Stop 1, idle high). Erzeugt das Signal, das ein Stackmat-Timer
 * über die Klinke ausgibt — Basis der Roundtrip-Tests.
 */
export function encodeStackmatBytes(
  bytes: number[],
  opts: EncodeOptions,
): Float32Array {
  const { sampleRate, amplitude = 0.5, polarity = 1, leadIdleBits = 4 } = opts;
  const bitLen = sampleRate / STACKMAT_BAUD;
  const bitStream: number[] = [];
  for (let i = 0; i < leadIdleBits; i++) bitStream.push(1);
  for (const byte of bytes) {
    bitStream.push(0); // Start-Bit
    for (let d = 0; d < 8; d++) bitStream.push((byte >> d) & 1); // LSB first
    bitStream.push(1); // Stop-Bit
  }
  for (let i = 0; i < leadIdleBits; i++) bitStream.push(1);

  const total = Math.ceil(bitStream.length * bitLen);
  const out = new Float32Array(total);
  let pos = 0;
  for (const bit of bitStream) {
    const next = pos + bitLen;
    const level = bit === 1 ? amplitude : -amplitude;
    for (let j = Math.round(pos); j < Math.round(next) && j < total; j++) {
      out[j] = level * polarity;
    }
    pos = next;
  }
  return out;
}

/** Bequemer Helper: kompletten Frame (status+Zeit) inkl. CR/LF als Audio. */
export function encodeStackmatFrame(
  status: string,
  timeMs: number,
  opts: EncodeOptions,
): Float32Array {
  const frame = buildStackmatFrame(status, timeMs) + "\r\n";
  const bytes = [...frame].map((c) => c.charCodeAt(0));
  return encodeStackmatBytes(bytes, opts);
}

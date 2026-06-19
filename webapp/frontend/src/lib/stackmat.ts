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

/** Quersumme der ASCII-Ziffern (für die Checksum = Σ Ziffern + 64). */
function sumDigits(digits: string): number {
  let s = 0;
  for (let i = 0; i < digits.length; i++) s += digits.charCodeAt(i) - 48;
  return s;
}

/**
 * Parst einen Frame (Inhalt zwischen den CR/LF-Trennern, OHNE Trenner) zu
 * einem Paket. Unterstützt zwei Generationen — Checksum ist in beiden
 * `Σ Ziffern + 64`. Liefert null wenn Format ODER Checksum nicht stimmen
 * (fail-safe: falsche Polarität / Fremd-Protokoll → kein Paket).
 *
 *  - **G5 / Speed-Stacks-Gen5** (am Gerät verifiziert 2026-06-19): nur Ziffern
 *    + Checksum, KEIN Status-Char. Die Ziffern sind die Zeit in
 *    MILLISEKUNDEN: "07944" + 'X'(=24+64) → 7944 ms = 7.944 s. 5 Ziffern (bis
 *    99.999 s) oder 6 (bis ~16 min).
 *  - **Gen3/4** (klassisch): [status A-Z/space][5 Ziffern M SS CC][checksum].
 */
export function parseStackmatFrame(chars: string): StackmatPacket | null {
  if (chars.length < 6 || chars.length > 7) return null;
  const checksum = chars.charCodeAt(chars.length - 1);
  const body = chars.slice(0, chars.length - 1); // alles außer Checksum

  // G5: reiner Ziffern-Body (5 oder 6) ohne Status. Zeit = Ziffern als ms.
  if (/^[0-9]+$/.test(body)) {
    if (checksum !== sumDigits(body) + 64) return null;
    const timeMs = parseInt(body, 10);
    if (timeMs > 60 * 60 * 1000) return null; // > 1 h = unplausibel
    return { status: " ", timeMs, raw: chars };
  }

  // Gen3/4: status + 5 Ziffern + Checksum (genau 7 Zeichen).
  if (body.length === 6 && /^[A-Z ][0-9]{5}$/.test(body)) {
    const digits = body.slice(1);
    if (checksum !== sumDigits(digits) + 64) return null;
    const d = [0, 1, 2, 3, 4].map((i) => digits.charCodeAt(i) - 48);
    const sec = d[1] * 10 + d[2];
    const hund = d[3] * 10 + d[4];
    if (sec > 59 || hund > 99) return null;
    const timeMs = d[0] * 60000 + sec * 1000 + hund * 10;
    return { status: body[0], timeMs, raw: chars };
  }
  return null;
}

/**
 * Baut einen G5-Frame: Zeit als Millisekunden-Ziffern (min. 5-stellig, null-
 * gepolstert) + Checksum, KEIN Status-Char. Gegenstück zur G5-Erkennung in
 * parseStackmatFrame (am Gerät verifiziert). Für Tests + Encoder.
 */
export function buildStackmatFrameG5(timeMs: number): string {
  const clamped = Math.max(0, Math.min(Math.round(timeMs), 60 * 60 * 1000));
  const digits = String(clamped).padStart(5, "0");
  return digits + String.fromCharCode(sumDigits(digits) + 64);
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
  private readonly onByte?: (char: string) => void;

  constructor(
    sampleRate: number,
    onPacket: (p: StackmatPacket) => void,
    onByte?: (char: string) => void,
  ) {
    this.bitLen = sampleRate / STACKMAT_BAUD;
    this.onPacket = onPacket;
    // onByte (optional): feuert pro dekodiertem Roh-Zeichen VOR der Checksum-
    // Prüfung — nur für Diagnose (W.stackmat-diag): zeigt, ob überhaupt
    // UART-Bytes ankommen, auch wenn das Frame-Layout/Checksum (noch) nicht passt.
    this.onByte = onByte;
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

  /** Sammelt Zeichen bis zum CR/LF-Trenner, parst dann den Frame.
   *  Trenner-basiert (statt Sliding-Window), weil der Frame variabel lang ist
   *  (G5 6 Zeichen, Gen3/4 7) — die Länge des Laufs zwischen den Trennern sagt
   *  dem Parser, welches Format vorliegt. Beide Stackmat-Generationen senden
   *  zuverlässig CR+LF (0x0D 0x0A) am Frame-Ende. */
  private appendByte(byte: number): void {
    const code = byte & 0x7f;
    this.onByte?.(String.fromCharCode(code));
    if (code === 0x0a || code === 0x0d) {
      if (this.line.length >= 6) {
        const p = parseStackmatFrame(this.line);
        if (p) this.onPacket(p);
      }
      this.line = "";
      return;
    }
    this.line += String.fromCharCode(code);
    // Ein Frame ist max. 7 Zeichen — läuft es über (verpasster Trenner),
    // hinten beschneiden statt unbegrenzt wachsen zu lassen.
    if (this.line.length > 8) this.line = this.line.slice(-8);
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

  constructor(
    sampleRate: number,
    onPacket: (p: StackmatPacket) => void,
    onByte?: (char: string, polarity: "normal" | "inverted") => void,
  ) {
    this.a = new StackmatDecoder(
      sampleRate,
      onPacket,
      onByte ? (c) => onByte(c, "normal") : undefined,
    );
    this.b = new StackmatDecoder(
      sampleRate,
      onPacket,
      onByte ? (c) => onByte(c, "inverted") : undefined,
    );
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
  /** Solve abgeschlossen (genau einmal pro Lauf). timeMs = finale Zeit,
   *  WCA-konform auf Hundertstel abgeschnitten (truncateToWcaCentiseconds). */
  onSolve: (timeMs: number) => void;
  /** Optional: Phasen-/Zeit-Update für die Live-Anzeige (ebenfalls auf
   *  Hundertstel abgeschnitten — zeigt Hundertstel wie ein echtes
   *  Stackmat-Display). */
  onChange?: (phase: StackmatTimerPhase, timeMs: number) => void;
}

/**
 * Schneidet eine Zeit (ms) WCA-konform auf Hundertstelsekunden ab: die dritte
 * Nachkommastelle wird VERWORFEN, NICHT gerundet (WCA-Regel — nur die ersten
 * zwei Nachkommastellen zählen). Der G5 liefert echte Millisekunden, z.B.
 * 7946 ms → 7.94 s (= 7940 ms), NICHT 7.95 s. Gen3/4 senden bereits Hundertstel
 * (Vielfache von 10 ms) → hier ein No-Op. Reines Math.floor, kein Runden.
 */
export function truncateToWcaCentiseconds(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / 10) * 10;
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
 *
 * WCA-Präzision: die nach außen gegebene Zeit (onSolve + onChange) wird auf
 * Hundertstel ABGESCHNITTEN, nicht gerundet. Die interne Lauf-/Stop-Erkennung
 * vergleicht weiter die ROHEN Millisekunden — sonst zählten zwei ms in derselben
 * Hundertstel als „eingefroren" und lösten einen Fehl-Stop mitten im Solve aus.
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
      // Vergleich oben auf ROHEN ms — nach außen die WCA-abgeschnittene Zeit.
      this.events.onChange?.(
        this.running ? "running" : "stopped",
        truncateToWcaCentiseconds(timeMs),
      );
      return;
    }

    // Zeit eingefroren.
    this.stable++;
    const stopped = status === "S" || this.stable >= this.stablePackets;
    if (this.running && stopped && !this.emitted && timeMs > 0) {
      this.emitted = true;
      this.running = false;
      const finalMs = truncateToWcaCentiseconds(timeMs);
      this.events.onChange?.("stopped", finalMs);
      this.events.onSolve(finalMs);
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

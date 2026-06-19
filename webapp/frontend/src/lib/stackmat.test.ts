// Tests für den Stackmat-Decoder (W.stackmat).
//
// Da wir das Signal nicht gegen echte Hardware testen können, beweisen wir die
// Decoder-Logik per Encoder→Decoder-Roundtrip: das selbst erzeugte Signal ist
// protokoll-konform (1200 Baud UART, korrekte Checksum), und der Decoder muss
// es bit-genau zurückgewinnen — bei BEIDEN Polaritäten und mehreren Sampleraten.

import { describe, it, expect } from "vitest";
import {
  StackmatDualDecoder,
  StackmatSolveTracker,
  parseStackmatFrame,
  buildStackmatFrame,
  buildStackmatFrameG5,
  encodeStackmatFrame,
  encodeStackmatBytes,
  type StackmatPacket,
} from "./stackmat";

function collectPackets(
  samples: Float32Array,
  sampleRate: number,
  chunk = 4096,
): StackmatPacket[] {
  const out: StackmatPacket[] = [];
  // Dual-Decoder wie im Hook — handhabt beide Polaritäten.
  const dec = new StackmatDualDecoder(sampleRate, (p) => out.push(p));
  // In realistischen Chunks füttern (wie ScriptProcessor) — testet, dass der
  // Decoder Frames über Chunk-Grenzen hinweg korrekt zusammensetzt.
  for (let i = 0; i < samples.length; i += chunk) {
    dec.push(samples.subarray(i, Math.min(i + chunk, samples.length)));
  }
  return out;
}

describe("buildStackmatFrame / parseStackmatFrame", () => {
  it("baut 12.34s korrekt mit gültiger Checksum", () => {
    const frame = buildStackmatFrame("S", 12340);
    expect(frame).toBe("S01234J"); // 0+1+2+3+4=10 → 10+64=74='J'
    const p = parseStackmatFrame(frame);
    expect(p).not.toBeNull();
    expect(p!.timeMs).toBe(12340);
    expect(p!.status).toBe("S");
  });

  it("roundtrip über viele Zeiten (Minuten/Sekunden/Hundertstel)", () => {
    for (const ms of [0, 10, 990, 1000, 12340, 59990, 60000, 125450, 599990]) {
      const frame = buildStackmatFrame(" ", ms);
      const p = parseStackmatFrame(frame);
      expect(p, `parse ${ms}`).not.toBeNull();
      // Hundertstel-Granularität (Stackmat zeigt cs, nicht ms).
      expect(p!.timeMs).toBe(Math.round(ms / 10) * 10);
    }
  });

  it("weist falsche Checksum ab (fail-safe)", () => {
    expect(parseStackmatFrame("S01234K")).toBeNull(); // 'K' statt 'J'
  });

  it("G5: echte Geräte-Bytes '07944'+'X' → 7944 ms (7.944 s), kein Status", () => {
    // Verifiziert am echten G5 (2026-06-19): Anzeige 7.944 s.
    // Quersumme 0+7+9+4+4=24, +64=88=0x58='X'.
    const p = parseStackmatFrame("07944X");
    expect(p).not.toBeNull();
    expect(p!.timeMs).toBe(7944);
    expect(p!.status).toBe(" ");
  });

  it("G5: buildStackmatFrameG5 ist roundtrip-fähig", () => {
    for (const ms of [0, 7944, 12340, 82490, 99999]) {
      const frame = buildStackmatFrameG5(ms);
      const p = parseStackmatFrame(frame);
      expect(p, `parse ${ms}`).not.toBeNull();
      expect(p!.timeMs).toBe(ms);
    }
  });

  it("G5: 6-stellige ms (>99.999 s) werden geparst", () => {
    const frame = buildStackmatFrameG5(125450); // 2:05.450
    expect(frame.length).toBe(7); // 6 Ziffern + Checksum
    expect(parseStackmatFrame(frame)!.timeMs).toBe(125450);
  });

  it("G5: falsche Checksum am Ziffern-Frame → null", () => {
    expect(parseStackmatFrame("07944Y")).toBeNull(); // 'Y' statt 'X'
  });

  it("weist falsche Länge / Nicht-Ziffern / falschen Status ab", () => {
    expect(parseStackmatFrame("S0123J")).toBeNull(); // zu kurz
    expect(parseStackmatFrame("S0x234J")).toBeNull(); // Nicht-Ziffer
    expect(parseStackmatFrame("*01234J")).toBeNull(); // Status kein [A-Z ]
  });

  it("weist unplausible Sekunden/Hundertstel ab", () => {
    // 5 Ziffern '09900' → sec=99 > 59 → null (selbst wenn Checksum stimmte)
    const digits = "09900";
    const sum = [...digits].reduce((a, c) => a + (c.charCodeAt(0) - 48), 0);
    const frame = "S" + digits + String.fromCharCode(sum + 64);
    expect(parseStackmatFrame(frame)).toBeNull();
  });
});

describe("StackmatDecoder Encoder→Decoder-Roundtrip", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const polarity of [1, -1] as const) {
      it(`dekodiert ein Frame @ ${sampleRate}Hz, Polarität ${polarity}`, () => {
        const signal = encodeStackmatFrame("S", 12340, { sampleRate, polarity });
        const packets = collectPackets(signal, sampleRate);
        expect(packets.length).toBeGreaterThanOrEqual(1);
        expect(packets[0].timeMs).toBe(12340);
        expect(packets[0].status).toBe("S");
      });
    }
  }

  it("dekodiert eine Folge von Frames (Chunk-Grenzen-Test)", () => {
    const sampleRate = 44100;
    const parts: Float32Array[] = [];
    const times = [0, 1230, 4560, 7890, 7890];
    const statuses = [" ", " ", " ", " ", "S"];
    for (let i = 0; i < times.length; i++) {
      parts.push(encodeStackmatFrame(statuses[i], times[i], { sampleRate }));
    }
    const total = parts.reduce((a, p) => a + p.length, 0);
    const signal = new Float32Array(total);
    let off = 0;
    for (const p of parts) {
      signal.set(p, off);
      off += p.length;
    }
    const packets = collectPackets(signal, sampleRate, 1000);
    // Alle gültigen Frames müssen ankommen, in Reihenfolge.
    expect(packets.map((p) => p.timeMs)).toEqual(times);
  });

  it("G5: Audio-Roundtrip eines Ziffern-Frames (kein Status) @ 48000Hz", () => {
    const sampleRate = 48000;
    // Frame wie das echte G5: 5 ms-Ziffern + Checksum, Trenner CR+LF.
    const frame = buildStackmatFrameG5(7944) + "\r\n";
    const bytes = [...frame].map((c) => c.charCodeAt(0));
    const signal = encodeStackmatBytes(bytes, { sampleRate });
    const packets = collectPackets(signal, sampleRate);
    expect(packets.length).toBeGreaterThanOrEqual(1);
    expect(packets[0].timeMs).toBe(7944);
  });

  it("G5: kompletter Solve-Lauf (Audio → Tracker) = genau 1 Solve", () => {
    const sampleRate = 44100;
    // G5 sendet keine '0'-Reset-Frames im Capture; Lauf: laufende (steigende)
    // Zeiten → eingefrorene Endzeit. Tracker erkennt Stop per Stabilität.
    const msSeq = [1230, 4560, 7944, 7944, 7944, 7944];
    const parts = msSeq.map((ms) => {
      const f = buildStackmatFrameG5(ms) + "\r\n";
      return encodeStackmatBytes([...f].map((c) => c.charCodeAt(0)), { sampleRate });
    });
    const total = parts.reduce((a, p) => a + p.length, 0);
    const signal = new Float32Array(total);
    let off = 0;
    for (const p of parts) {
      signal.set(p, off);
      off += p.length;
    }
    const solves: number[] = [];
    const tracker = new StackmatSolveTracker({ onSolve: (ms) => solves.push(ms) });
    const dec = new StackmatDualDecoder(sampleRate, (p) => tracker.onPacket(p));
    const chunk = 2048;
    for (let i = 0; i < signal.length; i += chunk) {
      dec.push(signal.subarray(i, Math.min(i + chunk, signal.length)));
    }
    expect(solves).toEqual([7944]);
  });

  it("liefert KEINE Pakete bei reinem Rauschen (fail-safe)", () => {
    const sampleRate = 44100;
    const noise = new Float32Array(sampleRate); // 1s
    let seed = 42;
    for (let i = 0; i < noise.length; i++) {
      // Deterministisches Pseudo-Rauschen (kein Math.random → reproduzierbar).
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      noise[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    const packets = collectPackets(noise, sampleRate);
    expect(packets.length).toBe(0);
  });
});

describe("StackmatSolveTracker", () => {
  function feed(packets: Array<[string, number]>): number[] {
    const solves: number[] = [];
    const tracker = new StackmatSolveTracker({ onSolve: (ms) => solves.push(ms) });
    for (const [status, timeMs] of packets) {
      tracker.onPacket({ status, timeMs, raw: "" });
    }
    return solves;
  }

  it("feuert genau einen Solve: idle → running → stopped → idle", () => {
    const solves = feed([
      ["I", 0],
      ["I", 0],
      [" ", 1230],
      [" ", 4560],
      [" ", 8900],
      ["S", 8900],
      ["S", 8900],
      ["I", 0],
    ]);
    expect(solves).toEqual([8900]);
  });

  it("erkennt Stop per Zeit-Stabilität auch ohne 'S'-Status", () => {
    // Generation ohne 'S': Zeit friert ein, Status bleibt ' '.
    const solves = feed([
      ["I", 0],
      [" ", 1000],
      [" ", 5000],
      [" ", 9990],
      [" ", 9990],
      [" ", 9990],
      [" ", 9990],
    ]);
    expect(solves).toEqual([9990]);
  });

  it("wertet eine beim Verbinden stehende Altzeit NICHT als Solve", () => {
    // Direkt eingefrorene Zeit ohne vorheriges running → kein Solve.
    const solves = feed([
      ["S", 12340],
      ["S", 12340],
      ["S", 12340],
      ["S", 12340],
    ]);
    expect(solves).toEqual([]);
  });

  it("zwei aufeinanderfolgende Solves = zwei Events (Reset dazwischen)", () => {
    const solves = feed([
      ["I", 0],
      [" ", 2000],
      [" ", 6000],
      ["S", 6000],
      ["S", 6000],
      ["I", 0],
      [" ", 3000],
      [" ", 7500],
      ["S", 7500],
      ["S", 7500],
      ["I", 0],
    ]);
    expect(solves).toEqual([6000, 7500]);
  });
});

describe("End-to-End: Audio-Sequenz → Tracker", () => {
  it("ein kompletter Solve-Lauf als Audio ergibt genau einen Solve", () => {
    const sampleRate = 48000;
    const frames: Array<[string, number]> = [
      ["I", 0],
      ["I", 0],
      [" ", 530],
      [" ", 2870],
      [" ", 5550],
      [" ", 8120],
      ["S", 8120],
      ["S", 8120],
      ["I", 0],
    ];
    const parts = frames.map(([s, ms]) =>
      encodeStackmatFrame(s, ms, { sampleRate }),
    );
    const total = parts.reduce((a, p) => a + p.length, 0);
    const signal = new Float32Array(total);
    let off = 0;
    for (const p of parts) {
      signal.set(p, off);
      off += p.length;
    }

    const solves: number[] = [];
    const tracker = new StackmatSolveTracker({ onSolve: (ms) => solves.push(ms) });
    const dec = new StackmatDualDecoder(sampleRate, (p) => tracker.onPacket(p));
    const chunk = 2048;
    for (let i = 0; i < signal.length; i += chunk) {
      dec.push(signal.subarray(i, Math.min(i + chunk, signal.length)));
    }
    expect(solves).toEqual([8120]);
  });
});

describe("encodeStackmatBytes", () => {
  it("erzeugt ein nicht-leeres Signal passender Länge", () => {
    const sig = encodeStackmatBytes([0x53], { sampleRate: 44100 });
    // 1 Byte = 10 Bit + 2*4 idle = 18 Bit; ~36.75 Samples/Bit.
    expect(sig.length).toBeGreaterThan(18 * 36);
    expect(sig.length).toBeLessThan(18 * 38);
  });
});

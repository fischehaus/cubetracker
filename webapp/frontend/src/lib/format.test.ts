// Tests fuer parseTimeInput — speziell die csTimer-Stackmat-Konvention.

import { describe, expect, it } from "vitest";
import { parseTimeInput, formatTime } from "./format";

describe("parseTimeInput — klassisch mit Punkt", () => {
  it("parst '12.34' zu 12340 ms", () => {
    expect(parseTimeInput("12.34")).toBe(12340);
  });

  it("parst '9.45' zu 9450 ms", () => {
    expect(parseTimeInput("9.45")).toBe(9450);
  });

  it("parst '0.50' zu 500 ms", () => {
    expect(parseTimeInput("0.50")).toBe(500);
  });
});

describe("parseTimeInput — mit Doppelpunkt", () => {
  it("parst '1:23.45' zu 83450 ms", () => {
    expect(parseTimeInput("1:23.45")).toBe(83450);
  });

  it("parst '1:51.02' zu 111020 ms", () => {
    expect(parseTimeInput("1:51.02")).toBe(111020);
  });

  it("parst '12:34.56' zu 754560 ms", () => {
    expect(parseTimeInput("12:34.56")).toBe(754560);
  });

  it("verweigert sec >= 60 im MM:SS-Format", () => {
    expect(parseTimeInput("1:60.00")).toBeNull();
  });
});

describe("parseTimeInput — csTimer-Stackmat (nur Ziffern)", () => {
  it("parst '5' zu 50 ms (0.05s)", () => {
    expect(parseTimeInput("5")).toBe(50);
  });

  it("parst '45' zu 450 ms (0.45s)", () => {
    expect(parseTimeInput("45")).toBe(450);
  });

  it("parst '945' zu 9450 ms (9.45s)", () => {
    expect(parseTimeInput("945")).toBe(9450);
  });

  it("parst '1234' zu 12340 ms (12.34s)", () => {
    expect(parseTimeInput("1234")).toBe(12340);
  });

  it("parst '15102' zu 111020 ms (1:51.02)", () => {
    expect(parseTimeInput("15102")).toBe(111020);
  });

  it("parst '123456' zu 754560 ms (12:34.56)", () => {
    expect(parseTimeInput("123456")).toBe(754560);
  });

  it("parst '0' zu 0 ms", () => {
    expect(parseTimeInput("0")).toBe(0);
  });

  it("parst '100' zu 1000 ms (1.00s)", () => {
    expect(parseTimeInput("100")).toBe(1000);
  });
});

describe("parseTimeInput — Roundtrip mit formatTime", () => {
  // Wichtigste Eigenschaft: parse(format(x)) === x fuer typische Zeiten
  it.each([
    [9450, "9.45"],
    [12340, "12.34"],
    [111020, "1:51.02"],
    [754560, "12:34.56"],
  ])("formatTime(%i) === %s und parseTimeInput davon gibt %i zurueck", (ms, str) => {
    expect(formatTime(ms)).toBe(str);
    expect(parseTimeInput(str)).toBe(ms);
  });
});

describe("parseTimeInput — Edge Cases", () => {
  it("liefert null bei leerem String", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("   ")).toBeNull();
  });

  it("liefert null bei reinem Buchstaben-Quatsch", () => {
    expect(parseTimeInput("abc")).toBeNull();
  });

  it("trimmt Whitespace", () => {
    expect(parseTimeInput("  945  ")).toBe(9450);
    expect(parseTimeInput(" 12.34 ")).toBe(12340);
  });
});

// Audio-Beeps fuer den Spacebar-Timer (Phase 8.2).
//
// Web Audio API mit Sinus-Toenen — kein File-Asset noetig, klein und
// verstandlich. Drei Sound-Typen:
//   - inspection-warn-8s : kurzer mid-frequency beep (Vorwarnung)
//   - inspection-warn-12s: zwei beeps in Folge (dringende Warnung)
//   - solve-stop         : kein default — hier nur als Hook fuer spaetere
//                          Erweiterung dokumentiert (z.B. PB-Sound)
//
// Implementation: lazy AudioContext (User-Gesture-Anforderung). Ein
// AudioContext pro Tab-Lifetime, recycled. Fehler still — wenn Audio
// blockiert ist (Autoplay-Policy), Solve-Flow funktioniert weiter.

let _ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx === null) {
    try {
      const Ctx =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      _ctx = new Ctx();
    } catch {
      return null;
    }
  }
  // Resume falls suspended (manche Browser starten suspended bis User-Gesture)
  if (_ctx && _ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

/**
 * Spielt einen einzelnen Sinus-Beep mit ramped envelope.
 * Default-Envelope: 10ms attack + sustain + 50ms release = klick-frei.
 */
function beep(frequency_hz: number, duration_ms: number, volume: number = 0.15): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency_hz;
    // Envelope: schneller attack, sustain, weicher release
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.setValueAtTime(volume, now + duration_ms / 1000 - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + duration_ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration_ms / 1000);
  } catch {
    // ignore — Sound ist nice-to-have, kein Crash erlaubt
  }
}

/** WCA: Vorwarnung bei Sekunde 8 der Inspection. */
export function playInspectionWarn8s(): void {
  beep(660, 200);
}

/** WCA: Dringende Warnung bei Sekunde 12 der Inspection (zwei Toene). */
export function playInspectionWarn12s(): void {
  beep(880, 150);
  setTimeout(() => beep(880, 150), 200);
}

// ============================================================
// Voice-Alert via Web Speech API (Phase W.voice-alert, 2026-05-17)
// ============================================================
// csTimer-aequivalent: spricht "8" / "12" statt Sinus-Beep. Nutzt das
// im Browser verbaute speechSynthesis-API (kein Asset, keine Network-
// Roundtrip). Fail-soft: wenn API nicht da oder TTS-Voice fehlt,
// stiller Fallback (Beep wird vom Caller separat entschieden).

/** Sprache + Text der Voice-Calls. de = deutsch, en = englisch. */
const VOICE_PHRASES: Record<"de" | "en", { warn8: string; warn12: string }> = {
  de: { warn8: "acht", warn12: "zwoelf" },
  en: { warn8: "eight", warn12: "twelve" },
};

function speak(text: string, lang: "de" | "en"): void {
  if (typeof window === "undefined") return;
  const synth = (window as unknown as { speechSynthesis?: SpeechSynthesis })
    .speechSynthesis;
  if (!synth) return;
  try {
    // Cancel ggf. laufende Utterance — bei dichter Folge (8s → 12s = 4s
    // Abstand) ist 12s wichtiger als ein noch nicht beendetes "acht".
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "de" ? "de-DE" : "en-US";
    utter.volume = 1.0;
    utter.rate = 1.1;
    utter.pitch = 1.0;
    synth.speak(utter);
  } catch {
    // ignore — Voice ist nice-to-have
  }
}

/** Voice-Variante der 8s-Warnung. */
export function speakInspectionWarn8s(lang: "de" | "en"): void {
  speak(VOICE_PHRASES[lang].warn8, lang);
}

/** Voice-Variante der 12s-Warnung. */
export function speakInspectionWarn12s(lang: "de" | "en"): void {
  speak(VOICE_PHRASES[lang].warn12, lang);
}

/**
 * Initialisiert AudioContext bei einem User-Gesture.
 * Wird aufgerufen bei erstem Spacebar-Press, damit spaetere Beeps
 * nicht von Browser-Autoplay-Policy blockiert werden.
 */
export function primeAudio(): void {
  getContext();
}

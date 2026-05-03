// Type-Stub fuer den lokalen patched scrambow-Bundle.
// Re-exports von scrambow's eigenen Types (im node_modules), das Bundle
// hier ist nur die Implementierung mit gefixtem `f`-Identifier-Konflikt.
//
// Hintergrund: Vite 8 / Rolldown akzeptiert scrambow's UMD-Bundle nicht
// (zwei `f`-Variablen in scope-uebergreifender Position, Rolldown's
// strikter Top-Level-Parser fehlinterpretiert das). Patch: zweites `f`
// in skewb-Scrambler zu `_F` umbenannt — semantisch identisch, sauber.

export { Scramble, Scrambler, Seed } from "scrambow";
export { Scrambow } from "scrambow";

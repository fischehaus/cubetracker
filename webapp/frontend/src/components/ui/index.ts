// UI-Primitive-Barrel (W.design-system, 2026-05-30).
//
// Zentrale Design-System-Komponenten. Import-Konvention:
//   import { Card, CardTitle, Button, EmptyState } from "../components/ui";
//
// Diese Schicht ist die EINE Quelle für Card-Container, Headings, Buttons
// und Empty-States. Bestehende Feature-Komponenten werden schrittweise
// (tab-weise) hierauf migriert — siehe docs/ux-audit-2026-05-30.md.

export { Card, type CardProps } from "./Card";
export { CardTitle, SectionLabel, SubTitle } from "./Heading";
export { Button, type ButtonProps } from "./Button";
export { EmptyState } from "./EmptyState";

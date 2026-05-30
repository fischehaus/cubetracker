// Button-Primitive (W.design-system, 2026-05-30).
//
// Ersetzt 74× handgeschriebenes `bg-purple-600 …` mit Padding-/Hover-/
// Radius-Drift (Audit P7). Vier Varianten, zwei Größen, einheitlicher
// Focus-Ring (a11y).
//
// Varianten:
//   primary    — gefüllt purple. Die EINE Haupt-Aktion pro Kontext.
//                Sparsam einsetzen (ruhige Richtung: nicht jeder Button
//                ist primary).
//   secondary  — dezent gefüllt grau. Standard für die meisten Aktionen.
//   danger     — rot. Löschen / Zurücksetzen / destruktiv.
//   ghost      — randlos, nur Hover-Fläche. Für tertiäre / Inline-Aktionen.
//
// Größen: md (Default), sm (kompakt, z.B. in Card-Headern / Tabellen).

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  // primary: gefüllt, aber nicht grell — purple-600 mit ruhigem Hover.
  primary:
    "bg-purple-600 text-white hover:bg-purple-500 focus-visible:ring-purple-400",
  // secondary: dezent gefüllt, der „leise" Standard-Button.
  secondary:
    "bg-gray-700/70 text-gray-100 hover:bg-gray-700 focus-visible:ring-gray-400",
  // danger: destruktiv.
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400",
  // ghost: randlos, nur Text + Hover-Fläche.
  ghost:
    "bg-transparent text-gray-300 hover:bg-gray-800 hover:text-gray-100 focus-visible:ring-gray-500",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Streckt den Button auf volle Breite (w-full). */
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

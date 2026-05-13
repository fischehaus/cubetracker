// useIsTouchDevice — Touch-Device-Detection via matchMedia("(pointer: coarse)")
//
// Liefert true wenn primary pointer-input grob (Finger/Stift) ist. Auf
// Tablet mit Bluetooth-Keyboard: kann dynamisch wechseln, deshalb mit
// matchMedia-Listener.

import { useEffect, useState } from "react";

export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const onChange = () => setIsTouch(mq.matches);
    // Modern: addEventListener; alt: addListener
    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, []);

  return isTouch;
}

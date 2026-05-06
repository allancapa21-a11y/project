import { useEffect } from "react";
import { hexToHsl } from "@/lib/hex-to-hsl";
import type { Settings } from "@/lib/api";

export function useApplyTheme(settings: Settings | undefined) {
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const primary = hexToHsl(settings.primaryColor);
    const secondary = hexToHsl(settings.secondaryColor);
    if (primary) root.style.setProperty("--primary", primary);
    if (secondary) root.style.setProperty("--secondary", secondary);
    if (settings.fontFamily) {
      root.style.setProperty("--app-font-serif", settings.fontFamily);
    }
  }, [settings]);
}

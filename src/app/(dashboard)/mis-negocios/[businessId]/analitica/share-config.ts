export const THEME_NAMES = ["Melon", "Peach", "Plum", "Apple"] as const;
export const PATTERN_NAMES = ["Ninguno", "Puntos", "Cuadrícula", "Diagonales", "Verticales", "Círculos"] as const;

export type ThemeName = (typeof THEME_NAMES)[number];
export type PatternName = (typeof PATTERN_NAMES)[number];

export interface SharePreferences {
  theme: string;
  pattern: string;
  showLogo: boolean;
}

export const DEFAULT_SHARE_PREFS: SharePreferences = { theme: "Melon", pattern: "Ninguno", showLogo: true };

export function normalizeSharePrefs(p: Partial<SharePreferences> | null | undefined): SharePreferences {
  return {
    theme: p?.theme && (THEME_NAMES as readonly string[]).includes(p.theme) ? p.theme : DEFAULT_SHARE_PREFS.theme,
    pattern: p?.pattern && (PATTERN_NAMES as readonly string[]).includes(p.pattern) ? p.pattern : DEFAULT_SHARE_PREFS.pattern,
    showLogo: typeof p?.showLogo === "boolean" ? p.showLogo : DEFAULT_SHARE_PREFS.showLogo,
  };
}

/**
 * Personal appearance: colour theme, light/dark mode, font, text size, corners.
 * Everything is applied as CSS variables on <html>, so every component that
 * uses the design tokens (bg-primary, text-sidebar-foreground…) follows along.
 */

export type Mode = "light" | "dark" | "system";
export type Radius = "sharp" | "default" | "round";

export type Appearance = {
  mode: Mode;
  theme: string; // preset id, or "custom"
  customAccent: string;
  customSidebar: string;
  sidebarStyle: "themed" | "plain";
  font: string;
  fontSize: number; // px size of 1rem
  radius: Radius;
  reduceMotion: boolean;
  updatedAt: number; // last change made by the user (0 = never)
};

export const DEFAULT_APPEARANCE: Appearance = {
  mode: "system",
  theme: "teamtask",
  customAccent: "#7C5CF6",
  customSidebar: "#1E1B3A",
  sidebarStyle: "themed",
  font: "default",
  fontSize: 16,
  radius: "default",
  reduceMotion: false,
  updatedAt: 0,
};

export type ThemePreset = {
  id: string;
  name: string;
  accent: string;
  accent2: string;
  /** null = the neutral sidebar */
  sidebar: string | null;
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "teamtask", name: "Team Task", accent: "#7C5CF6", accent2: "#2563EB", sidebar: null },
  { id: "plum", name: "Plum", accent: "#D946EF", accent2: "#8B5CF6", sidebar: "#3B0F3F" },
  { id: "midnight", name: "Midnight", accent: "#6366F1", accent2: "#3B82F6", sidebar: "#0F1226" },
  { id: "ocean", name: "Ocean", accent: "#0EA5E9", accent2: "#2563EB", sidebar: "#0B2540" },
  { id: "forest", name: "Forest", accent: "#10B981", accent2: "#0D9488", sidebar: "#10291F" },
  { id: "ember", name: "Ember", accent: "#F97316", accent2: "#E11D48", sidebar: "#3A160B" },
  { id: "rose", name: "Rose", accent: "#F43F5E", accent2: "#D946EF", sidebar: "#3B0B1F" },
  { id: "sunflower", name: "Sunflower", accent: "#D97706", accent2: "#EA580C", sidebar: "#FBEFC4" },
  { id: "mint", name: "Mint", accent: "#059669", accent2: "#0891B2", sidebar: "#DDF4EA" },
  { id: "graphite", name: "Graphite", accent: "#52525B", accent2: "#27272A", sidebar: "#1C1C1F" },
];

export type FontOption = {
  id: string;
  name: string;
  note?: string;
  body: string; // CSS font-family stack
  display: string;
  /** Google Fonts family spec ("Inter:wght@400;500;600;700"); none for built-in fonts */
  google?: string;
};

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const FONT_OPTIONS: FontOption[] = [
  { id: "default", name: "Nunito + DM Sans", note: "Default", body: `"Nunito", ${SANS}`, display: `"DM Sans", ${SANS}` },
  { id: "inter", name: "Inter", body: `"Inter", ${SANS}`, display: `"Inter", ${SANS}`, google: "Inter:wght@400;500;600;700" },
  { id: "lato", name: "Lato", body: `"Lato", ${SANS}`, display: `"Lato", ${SANS}`, google: "Lato:wght@400;700;900" },
  { id: "jakarta", name: "Plus Jakarta Sans", body: `"Plus Jakarta Sans", ${SANS}`, display: `"Plus Jakarta Sans", ${SANS}`, google: "Plus+Jakarta+Sans:wght@400;500;600;700" },
  { id: "manrope", name: "Manrope", body: `"Manrope", ${SANS}`, display: `"Manrope", ${SANS}`, google: "Manrope:wght@400;500;600;700" },
  { id: "plex", name: "IBM Plex Sans", body: `"IBM Plex Sans", ${SANS}`, display: `"IBM Plex Sans", ${SANS}`, google: "IBM+Plex+Sans:wght@400;500;600;700" },
  { id: "source", name: "Source Sans 3", body: `"Source Sans 3", ${SANS}`, display: `"Source Sans 3", ${SANS}`, google: "Source+Sans+3:wght@400;500;600;700" },
  { id: "space", name: "Space Grotesk", body: `"Space Grotesk", ${SANS}`, display: `"Space Grotesk", ${SANS}`, google: "Space+Grotesk:wght@400;500;600;700" },
  { id: "atkinson", name: "Atkinson Hyperlegible", note: "Easier to read", body: `"Atkinson Hyperlegible", ${SANS}`, display: `"Atkinson Hyperlegible", ${SANS}`, google: "Atkinson+Hyperlegible:wght@400;700" },
  { id: "lexend", name: "Lexend", note: "Easier to read", body: `"Lexend", ${SANS}`, display: `"Lexend", ${SANS}`, google: "Lexend:wght@400;500;600;700" },
  { id: "system", name: "System font", note: "Fastest", body: SANS, display: SANS },
];

export const FONT_SIZES = [14, 15, 16, 17, 18] as const;
export const RADIUS_VALUES: Record<Radius, string> = { sharp: "0.25rem", default: "0.5rem", round: "0.9rem" };

export const getPreset = (id: string) => THEME_PRESETS.find((p) => p.id === id);
export const getFont = (id: string) => FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];

/* ---------------------------------------------------------------- colour maths */

type HSL = { h: number; s: number; l: number };

export const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

export function hexToHsl(hex: string): HSL {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb({ h, s, l }: HSL): [number, number, number] {
  const S = s / 100, L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/** WCAG relative luminance (0 black … 1 white) */
export function luminance(c: HSL) {
  const [r, g, b] = hslToRgb(c).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const css = ({ h, s, l }: HSL) => `${h} ${s}% ${l}%`;
const WHITE = "0 0% 100%";

/** White or near-black text, whichever reads better on this colour */
function textOn(bg: HSL) {
  const lum = luminance(bg);
  return contrast(1, lum) >= 3 || contrast(1, lum) >= contrast(lum, 0.012) ? WHITE : css({ h: bg.h, s: Math.min(bg.s, 40), l: 10 });
}

export type ThemeColors = { accent: string; accent2: string; sidebar: string | null };

export function themeColors(a: Appearance): ThemeColors {
  if (a.theme === "custom") {
    const accent = isHex(a.customAccent) ? a.customAccent : DEFAULT_APPEARANCE.customAccent;
    const base = hexToHsl(accent);
    const second = { h: (base.h + 325) % 360, s: base.s, l: clamp(base.l - 4, 20, 70) };
    const [r, g, b] = hslToRgb(second).map((v) => Math.round(v * 255));
    const accent2 = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return { accent, accent2, sidebar: isHex(a.customSidebar) ? a.customSidebar : null };
  }
  const p = getPreset(a.theme) ?? THEME_PRESETS[0];
  return { accent: p.accent, accent2: p.accent2, sidebar: p.sidebar };
}

/** The CSS variables for a theme in light or dark mode */
export function computeThemeVars(a: Appearance, dark: boolean): Record<string, string> {
  const colors = themeColors(a);
  const acc = hexToHsl(colors.accent);
  const acc2 = hexToHsl(colors.accent2);

  // Keep the accent readable on the page background
  const primary: HSL = dark
    ? { h: acc.h, s: Math.min(acc.s, 90), l: clamp(acc.l, 58, 72) }
    : { h: acc.h, s: acc.s, l: clamp(acc.l, 30, 56) };
  const primary2: HSL = dark
    ? { h: acc2.h, s: Math.min(acc2.s, 90), l: clamp(acc2.l, 52, 66) }
    : { h: acc2.h, s: acc2.s, l: clamp(acc2.l, 28, 54) };

  const vars: Record<string, string> = {
    "--primary": css(primary),
    "--primary-foreground": textOn(primary),
    "--primary-2": css(primary2),
    "--ring": css(primary),
    "--chart-1": css(primary),
    "--chart-2": css(primary2),
    "--radius": RADIUS_VALUES[a.radius] ?? RADIUS_VALUES.default,
  };

  const themedSidebar = a.sidebarStyle === "themed" && colors.sidebar;
  if (themedSidebar) {
    const base = hexToHsl(colors.sidebar!);
    // In dark mode, light sidebars become a deep version of the same hue
    const bg: HSL = dark ? { h: base.h, s: Math.min(base.s, 60), l: Math.min(base.l, 13) } : base;
    const darkBg = luminance(bg) < 0.25;
    const step = darkBg ? 1 : -1;
    const active: HSL = darkBg
      ? { h: acc.h, s: Math.min(acc.s, 85), l: clamp(acc.l, 42, 56) }
      : { h: acc.h, s: acc.s, l: clamp(acc.l, 30, 42) };
    Object.assign(vars, {
      "--sidebar-background": css(bg),
      "--sidebar-foreground": darkBg ? css({ h: bg.h, s: 20, l: 94 }) : css({ h: bg.h, s: 35, l: 14 }),
      "--sidebar-muted": darkBg ? css({ h: bg.h, s: 15, l: 70 }) : css({ h: bg.h, s: 20, l: 36 }),
      "--sidebar-accent": css({ h: bg.h, s: bg.s, l: clamp(bg.l + 7 * step, 4, 96) }),
      "--sidebar-accent-foreground": darkBg ? WHITE : css({ h: bg.h, s: 35, l: 10 }),
      "--sidebar-border": css({ h: bg.h, s: bg.s, l: clamp(bg.l + 10 * step, 4, 96) }),
      "--sidebar-active": css(active),
      "--sidebar-active-foreground": textOn(active),
      "--sidebar-primary": css(active),
      "--sidebar-primary-foreground": textOn(active),
      "--sidebar-ring": css(active),
    });
  } else {
    Object.assign(vars, {
      "--sidebar-active": dark ? css({ h: acc.h, s: 35, l: 17 }) : css({ h: acc.h, s: Math.min(acc.s, 80), l: 95 }),
      "--sidebar-active-foreground": dark ? css({ h: acc.h, s: 90, l: 80 }) : css({ h: acc.h, s: Math.min(acc.s, 75), l: 38 }),
      "--sidebar-primary": css(primary),
      "--sidebar-primary-foreground": textOn(primary),
      "--sidebar-ring": css(primary),
    });
  }
  return vars;
}

/* ---------------------------------------------------------------- applying */

const VAR_SNAPSHOT_KEY = "tt-appearance-snapshot";
let appliedVars: string[] = [];

export function prefersDark() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export const resolveDark = (mode: Mode) => mode === "dark" || (mode === "system" && prefersDark());

export function fontStylesheetHref(font: FontOption, text?: string) {
  if (!font.google) return null;
  return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap${text ? `&text=${encodeURIComponent(text)}` : ""}`;
}

/** Load a Google font once (no-op for built-in fonts) */
export function loadFont(font: FontOption, text?: string) {
  const href = fontStylesheetHref(font, text);
  if (!href || typeof document === "undefined") return;
  const id = `tt-font-${font.id}${text ? "-sample" : ""}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  const dark = resolveDark(a.mode);
  const font = getFont(a.font);
  loadFont(font);

  root.classList.toggle("dark", dark);
  root.classList.toggle("reduce-motion", a.reduceMotion);
  root.style.colorScheme = dark ? "dark" : "light";

  const vars: Record<string, string> = {
    ...computeThemeVars(a, dark),
    "--font-sans": font.body,
    "--font-display": font.display,
  };
  appliedVars.forEach((name) => !(name in vars) && root.style.removeProperty(name));
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  appliedVars = Object.keys(vars);
  root.style.fontSize = `${a.fontSize}px`;
  root.dataset.sidebar = vars["--sidebar-background"] ? "themed" : "plain";

  // Lets index.html paint the right colours before the app loads (no flash)
  try {
    localStorage.setItem(
      VAR_SNAPSHOT_KEY,
      JSON.stringify({ dark, reduceMotion: a.reduceMotion, vars, fontSize: a.fontSize, fontHref: fontStylesheetHref(font), sidebar: root.dataset.sidebar })
    );
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

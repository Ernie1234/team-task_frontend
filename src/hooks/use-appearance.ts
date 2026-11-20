import { useEffect, useRef, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Appearance, DEFAULT_APPEARANCE, prefersDark } from "@/lib/appearance";
import { saveAppearanceMutationFn } from "@/lib/api";

export type SettingsSection = "account" | "appearance" | "text" | "notifications" | "calendar";

type AppearanceStore = {
  appearance: Appearance;
  /** A change made by this user (stamped, then saved to their account) */
  update: (patch: Partial<Appearance>) => void;
  /** Adopt settings saved on the account (from another device) */
  replace: (appearance: Appearance) => void;
  reset: () => void;
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
  /** Which page of the Settings window is showing */
  settingsSection: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
};

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      appearance: DEFAULT_APPEARANCE,
      update: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch, updatedAt: Date.now() } })),
      replace: (appearance) => set({ appearance: { ...DEFAULT_APPEARANCE, ...appearance } }),
      reset: () => set({ appearance: { ...DEFAULT_APPEARANCE, updatedAt: Date.now() } }),
      preferencesOpen: false,
      setPreferencesOpen: (preferencesOpen) => set({ preferencesOpen }),
      settingsSection: "account",
      openSettings: (section) => set((s) => ({ preferencesOpen: true, settingsSection: section ?? s.settingsSection })),
    }),
    {
      name: "tt-appearance",
      version: 1,
      partialize: (s) => ({ appearance: s.appearance }),
      merge: (persisted, current) => {
        const saved = (persisted as { appearance?: Partial<Appearance> } | undefined)?.appearance;
        if (saved) return { ...current, appearance: { ...DEFAULT_APPEARANCE, ...saved } };
        // First visit after the old theme picker: keep the user's light/dark choice
        const legacy = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
        if (legacy === "light" || legacy === "dark") return { ...current, appearance: { ...current.appearance, mode: legacy } };
        return current;
      },
    }
  )
);

export const useAppearance = () => useAppearanceStore((s) => s.appearance);

const subscribeSystem = (onChange: () => void) => {
  const query = window.matchMedia?.("(prefers-color-scheme: dark)");
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
};

/** Whether the OS is in dark mode right now (live) */
export const useSystemDark = () => useSyncExternalStore(subscribeSystem, prefersDark, () => false);

/** "light" or "dark", after resolving "system" */
export function useResolvedMode() {
  const mode = useAppearanceStore((s) => s.appearance.mode);
  const systemDark = useSystemDark();
  return mode === "dark" || (mode === "system" && systemDark) ? "dark" : "light";
}

/**
 * Keep appearance in sync with the user's account: adopt newer settings saved
 * from another device, and save local changes (debounced).
 */
export function useAppearanceSync(userId: string | undefined, serverAppearance: Appearance | null | undefined) {
  const appearance = useAppearance();
  const replace = useAppearanceStore((s) => s.replace);
  const syncedAt = useRef<number | null>(null);

  // On sign-in: whichever copy was changed last wins
  useEffect(() => {
    if (!userId) return;
    const local = useAppearanceStore.getState().appearance;
    const remoteAt = serverAppearance?.updatedAt ?? 0;
    if (serverAppearance && remoteAt > local.updatedAt) replace(serverAppearance);
    // What the account already has; anything newer locally gets saved below
    syncedAt.current = remoteAt;
    // Only on sign-in / account switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || syncedAt.current === null) return;
    if (!appearance.updatedAt || appearance.updatedAt <= syncedAt.current) return;
    const timer = setTimeout(() => {
      saveAppearanceMutationFn(appearance)
        .then(() => (syncedAt.current = appearance.updatedAt))
        .catch(() => {
          /* stays local; retried on the next change */
        });
    }, 800);
    return () => clearTimeout(timer);
  }, [userId, appearance]);
}

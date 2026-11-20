import { useEffect, type ReactNode } from "react";
import { applyAppearance } from "@/lib/appearance";
import { useAppearance, useAppearanceStore, useSystemDark } from "@/hooks/use-appearance";

/** Applies the user's appearance to the page; ⌘/Ctrl + , opens Settings (rendered in the app layout). */
export default function AppearanceProvider({ children }: { children: ReactNode }) {
  const appearance = useAppearance();
  const systemDark = useSystemDark();

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance, systemDark]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        const { preferencesOpen, setPreferencesOpen } = useAppearanceStore.getState();
        setPreferencesOpen(!preferencesOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <>{children}</>;
}

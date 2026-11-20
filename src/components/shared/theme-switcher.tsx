import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppearance, useAppearanceStore } from "@/hooks/use-appearance";
import type { Mode } from "@/lib/appearance";

const MODES: { value: Mode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** User-menu items: a quick light/dark/system switch and the Preferences dialog */
export function ThemeSwitcher() {
  const { mode } = useAppearance();
  const update = useAppearanceStore((s) => s.update);
  const openSettings = useAppearanceStore((s) => s.openSettings);

  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Colour mode</DropdownMenuLabel>
      <div role="radiogroup" aria-label="Colour mode" className="mx-1 mb-1 grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => update({ mode: value })}
            className={cn(
              "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-xs transition-colors",
              mode === value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {mode === value && <Check className="sr-only" />}
          </button>
        ))}
      </div>
      <DropdownMenuItem onSelect={() => openSettings("appearance")}>
        <Palette className="mr-2 h-4 w-4" />
        Appearance
      </DropdownMenuItem>
    </>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { Group, Switch } from "@/components/settings/settings-ui";
import { ArrowUpRight, Bell, CalendarDays, Check, ClipboardCopy, Monitor, Moon, Palette, RotateCcw, Settings, Sun, Type, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/context/auth-provider";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { Permissions } from "@/constant";
import { getAvatarFallbackText } from "@/lib/helper";
import AccountSection from "@/components/settings/account-section";
import NotificationsSection from "@/components/settings/notifications-section";
import CalendarSection from "@/components/settings/calendar-section";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAppearance, useAppearanceStore, type SettingsSection } from "@/hooks/use-appearance";
import {
  FONT_OPTIONS,
  FONT_SIZES,
  THEME_PRESETS,
  isHex,
  loadFont,
  themeColors,
  type Appearance,
  type Mode,
  type Radius,
} from "@/lib/appearance";

type NavItem = { id: SettingsSection; label: string; icon: typeof Palette };

const PERSONAL: NavItem[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "text", label: "Font & text", icon: Type },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
];

/**
 * Notion-style Settings window: your account, appearance, notifications and
 * calendar, plus shortcuts to the workspace's settings and people.
 */
export default function SettingsDialog() {
  const open = useAppearanceStore((s) => s.preferencesOpen);
  const setOpen = useAppearanceStore((s) => s.setPreferencesOpen);
  const reset = useAppearanceStore((s) => s.reset);
  const section = useAppearanceStore((s) => s.settingsSection);
  const openSettings = useAppearanceStore((s) => s.openSettings);
  const { user, hasPermission } = useAuthContext();
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  // Links from emails (…?settings=notifications) open the matching page
  const [params, setParams] = useSearchParams();
  const linked = params.get("settings");
  useEffect(() => {
    if (!linked) return;
    const sections = ["account", "appearance", "text", "notifications", "calendar"] as const;
    const target = sections.find((s) => s === linked);
    if (target) openSettings(target);
    params.delete("settings");
    setParams(params, { replace: true });
  }, [linked, params, setParams, openSettings]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const navButton = (active: boolean) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
      active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        overlayClassName="bg-black/20 backdrop-blur-none"
        className="flex h-[min(760px,92vh)] max-w-[960px] gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <nav className="hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r bg-muted/40 p-3 sm:flex" aria-label="Settings">
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <p className="px-2.5 pb-1 pt-1 text-xs font-medium text-muted-foreground">Account</p>
          <button type="button" onClick={() => openSettings("account")} className={navButton(section === "account")}>
            <Avatar className="h-5 w-5">
              <AvatarImage src={user?.profilePicture || ""} alt="" />
              <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">{getAvatarFallbackText(user?.name)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{user?.name ?? "My account"}</span>
          </button>
          {PERSONAL.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => openSettings(id)} className={navButton(section === id)}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}

          {workspaceId && (
            <>
              <p className="px-2.5 pb-1 pt-4 text-xs font-medium text-muted-foreground">Workspace</p>
              {hasPermission(Permissions.MANAGE_WORKSPACE_SETTINGS) && (
                <button type="button" onClick={() => go(`/workspace/${workspaceId}/settings`)} className={navButton(false)}>
                  <Settings className="h-4 w-4" />
                  General
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60" />
                </button>
              )}
              <button type="button" onClick={() => go(`/workspace/${workspaceId}/members`)} className={navButton(false)}>
                <Users className="h-4 w-4" />
                People
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </button>
            </>
          )}

          <p className="mt-auto px-2.5 pt-4 text-xs text-muted-foreground">
            Open anytime with <kbd className="rounded border bg-background px-1 font-sans">Ctrl</kbd>{" "}
            <kbd className="rounded border bg-background px-1 font-sans">,</kbd>
          </p>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Small screens: tabs instead of the side nav */}
          <div className="flex gap-1 overflow-x-auto border-b p-2 sm:hidden">
            {[{ id: "account" as const, label: "Account" }, ...PERSONAL].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => openSettings(id)}
                className={cn("shrink-0 rounded-md px-3 py-1.5 text-sm", section === id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          <DialogDescription className="sr-only">Your account and personal settings</DialogDescription>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-6 sm:px-10">
            <div className="mx-auto max-w-2xl">
              {section === "account" && <AccountSection />}
              {section === "appearance" && <AppearanceSection />}
              {section === "text" && <TextSection />}
              {section === "notifications" && <NotificationsSection />}
              {section === "calendar" && <CalendarSection />}
            </div>
          </div>
          <div className="flex items-center justify-between border-t px-6 py-3 sm:px-10">
            {section === "appearance" || section === "text" ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  reset();
                  toast({ title: "Appearance reset to the defaults" });
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset appearance
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- building blocks */

function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border bg-muted/50 p-1">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex min-w-[72px] items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            value === option.value ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- appearance */

/** A miniature of the app in the current theme: changes as you pick */
function LivePreview() {
  return (
    <div aria-hidden className="flex h-40 overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex w-[34%] flex-col gap-1.5 bg-sidebar p-3 text-sidebar-foreground">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">U</span>
          <span className="truncate text-xs font-semibold">Ura Studio</span>
        </div>
        <span className="rounded-md px-2 py-1 text-[11px] text-sidebar-muted">Dashboard</span>
        <span className="rounded-md bg-sidebar-active px-2 py-1 text-[11px] font-medium text-sidebar-active-foreground">Tasks</span>
        <span className="flex items-center justify-between rounded-md px-2 py-1 text-[11px] text-sidebar-muted">
          Chat <span className="rounded-full bg-sidebar-primary px-1.5 text-[9px] font-semibold text-sidebar-primary-foreground">3</span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold">Design review</span>
          <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">+ New task</span>
        </div>
        <div className="max-w-[75%] self-start rounded-2xl rounded-bl-md bg-muted px-3 py-1.5 text-[11px]">Can you check the new board?</div>
        <div className="max-w-[75%] self-end rounded-2xl rounded-br-md bg-gradient-to-br from-primary to-primary-2 px-3 py-1.5 text-[11px] text-primary-foreground">
          On it — looks great so far
        </div>
        <div className="mt-auto flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px]">
          <span className="h-3 w-3 rounded-full border-2 border-primary" />
          <span className="truncate">Polish onboarding flow</span>
          <span className="ml-auto h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-primary-2" />
          </span>
        </div>
      </div>
    </div>
  );
}

const MODES: { value: Mode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
];

function ModePicker({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="Colour mode" className="grid grid-cols-3 gap-3">
      {MODES.map(({ value: mode, label, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "group overflow-hidden rounded-xl border-2 text-left transition-colors",
            value === mode ? "border-primary" : "border-transparent ring-1 ring-border hover:ring-muted-foreground/40"
          )}
        >
          <div
            className={cn(
              "flex h-16 items-end gap-1.5 p-2",
              mode === "light" && "bg-zinc-100",
              mode === "dark" && "bg-zinc-900",
              mode === "system" && "bg-[linear-gradient(135deg,#f4f4f5_50%,#18181b_50%)]"
            )}
          >
            <span className={cn("h-full w-1/4 rounded-md", mode === "dark" ? "bg-zinc-800" : "bg-white")} />
            <span className="flex flex-1 flex-col gap-1">
              <span className="h-1.5 w-3/4 rounded-full bg-primary" />
              <span className={cn("h-1.5 w-1/2 rounded-full", mode === "light" ? "bg-zinc-300" : "bg-zinc-600")} />
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-2 text-sm">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
            {value === mode && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
          </div>
        </button>
      ))}
    </div>
  );
}

function ThemeSwatch({ name, accent, sidebar, selected, onClick }: { name: string; accent: string; sidebar: string | null; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className="group flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all",
          selected ? "ring-2 ring-primary" : "ring-1 ring-border group-hover:ring-muted-foreground/50"
        )}
        style={{ background: `linear-gradient(135deg, ${sidebar ?? "#e4e4e7"} 0 50%, ${accent} 50% 100%)` }}
      >
        {selected && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/90 shadow">
            <Check className="h-3 w-3 text-foreground" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={cn("text-xs", selected ? "font-medium text-foreground" : "text-muted-foreground")}>{name}</span>
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="flex flex-1 items-center gap-2 rounded-lg border px-2 py-1.5">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        className="h-7 w-7 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
        aria-label={`${label} colour picker`}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <input
          value={draft}
          onChange={(event) => {
            const next = event.target.value.trim();
            setDraft(next);
            const hex = next.startsWith("#") ? next : `#${next}`;
            if (isHex(hex)) onChange(hex.toUpperCase());
          }}
          className="w-full bg-transparent font-mono text-sm uppercase outline-none"
          aria-label={`${label} hex value`}
          spellCheck={false}
        />
      </span>
    </label>
  );
}

function AppearanceSection() {
  const appearance = useAppearance();
  const update = useAppearanceStore((s) => s.update);
  const colors = themeColors(appearance);
  const [paste, setPaste] = useState("");

  const setCustom = (patch: Partial<Pick<Appearance, "customAccent" | "customSidebar">>) =>
    update({
      theme: "custom",
      customAccent: patch.customAccent ?? colors.accent.toUpperCase(),
      customSidebar: patch.customSidebar ?? (colors.sidebar ?? appearance.customSidebar).toUpperCase(),
    });

  const share = `${colors.accent.toUpperCase()},${(colors.sidebar ?? appearance.customSidebar).toUpperCase()}`;

  return (
    <div>
      <div className="pb-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only you see these. They follow you to any device you sign in on.</p>
      </div>
      <Group title="Preview" description="Changes apply straight away, everywhere in the app.">
        <LivePreview />
      </Group>

      <Group title="Colour mode">
        <ModePicker value={appearance.mode} onChange={(mode) => update({ mode })} />
      </Group>

      <Group title="Theme" description="Sets the accent colour for buttons, highlights and your chat bubbles, and colours the sidebar.">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-5 gap-x-2 gap-y-4 sm:grid-cols-6">
          {THEME_PRESETS.map((preset) => (
            <ThemeSwatch
              key={preset.id}
              name={preset.name}
              accent={preset.accent}
              sidebar={preset.sidebar}
              selected={appearance.theme === preset.id}
              onClick={() => update({ theme: preset.id })}
            />
          ))}
          <ThemeSwatch
            name="Custom"
            accent={appearance.customAccent}
            sidebar={appearance.customSidebar}
            selected={appearance.theme === "custom"}
            onClick={() => update({ theme: "custom" })}
          />
        </div>
      </Group>

      <Group
        title="Custom theme"
        description="Pick your own colours, or paste a theme someone shared with you."
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5"
            onClick={() => {
              navigator.clipboard?.writeText(share).then(
                () => toast({ title: "Theme copied", description: share }),
                () => toast({ title: "Couldn't copy the theme", description: share, variant: "destructive" })
              );
            }}
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            Copy theme
          </Button>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ColorField label="Accent" value={colors.accent.toUpperCase()} onChange={(customAccent) => setCustom({ customAccent })} />
          <ColorField
            label="Sidebar"
            value={(colors.sidebar ?? appearance.customSidebar).toUpperCase()}
            onChange={(customSidebar) => setCustom({ customSidebar })}
          />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const [accent, sidebar] = paste.match(/#[0-9a-fA-F]{6}/g) ?? [];
            if (!accent) {
              toast({ title: "That isn't a theme", description: "Paste two colours like #7C5CF6,#1E1B3A", variant: "destructive" });
              return;
            }
            update({ theme: "custom", customAccent: accent.toUpperCase(), customSidebar: (sidebar ?? appearance.customSidebar).toUpperCase() });
            setPaste("");
            toast({ title: "Theme applied" });
          }}
        >
          <Input value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Paste a theme, e.g. #7C5CF6,#1E1B3A" className="h-9 font-mono text-sm" />
          <Button type="submit" variant="secondary" size="sm" className="h-9" disabled={!paste.trim()}>
            Apply
          </Button>
        </form>
      </Group>

      <Group
        title="Colour the sidebar"
        description="Use the theme's sidebar colour. Turn off for a plain sidebar."
        action={
          <Switch
            label="Colour the sidebar"
            checked={appearance.sidebarStyle === "themed"}
            onChange={(on) => update({ sidebarStyle: on ? "themed" : "plain" })}
          />
        }
      >
        {null}
      </Group>

      <Group title="Corners" description="How rounded buttons, cards and fields are.">
        <Segmented<Radius>
          label="Corners"
          value={appearance.radius}
          onChange={(radius) => update({ radius })}
          options={[
            { value: "sharp", label: <><span className="h-3 w-3 rounded-[2px] border-2 border-current" /> Sharp</> },
            { value: "default", label: <><span className="h-3 w-3 rounded-[4px] border-2 border-current" /> Default</> },
            { value: "round", label: <><span className="h-3 w-3 rounded-full border-2 border-current" /> Round</> },
          ]}
        />
      </Group>
    </div>
  );
}

/* ----------------------------------------------------------------- font & text */

function TextSection() {
  const appearance = useAppearance();
  const update = useAppearanceStore((s) => s.update);

  // Load just the letters each tile needs, so the picker shows every font
  useEffect(() => {
    FONT_OPTIONS.forEach((font) => loadFont(font, `Aa${font.name}`));
  }, []);

  return (
    <div>
      <div className="pb-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">Font & text</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick what's comfortable to read all day.</p>
      </div>
      <Group title="Font" description="Used for all text in the app.">
        <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {FONT_OPTIONS.map((font) => {
            const selected = appearance.font === font.id;
            return (
              <button
                key={font.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ font: font.id })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
                  selected ? "border-primary bg-primary/5" : "border-transparent ring-1 ring-border hover:ring-muted-foreground/40"
                )}
              >
                <span className="w-9 shrink-0 text-2xl leading-none" style={{ fontFamily: font.display }}>
                  Aa
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm" style={{ fontFamily: font.body }}>
                    {font.name}
                  </span>
                  {font.note && <span className="block text-[11px] text-muted-foreground">{font.note}</span>}
                </span>
                {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Text size" description="Scales text and spacing across the app.">
        <Segmented<number>
          label="Text size"
          value={appearance.fontSize}
          onChange={(fontSize) => update({ fontSize })}
          options={FONT_SIZES.map((size) => ({
            value: size,
            label: (
              <span className="flex flex-col items-center leading-none">
                <span style={{ fontSize: size - 2 }}>A</span>
                <span className="mt-1 text-[10px] text-muted-foreground">{size === 16 ? "Default" : `${size}px`}</span>
              </span>
            ),
          }))}
        />
        <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
          Sprint review moved to Thursday — bring the updated board and your notes on the onboarding flow.
        </p>
      </Group>

      <Group
        title="Reduce motion"
        description="Turn off animations and transitions."
        action={<Switch label="Reduce motion" checked={appearance.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} />}
      >
        {null}
      </Group>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BellRing, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/auth-provider";
import { browserTimeZone, emailPrefsOf, useUpdateEmailPrefs } from "@/hooks/api/use-email-prefs";
import { sendTestDigestMutationFn } from "@/lib/api";
import type { EmailPrefs } from "@/types/api.type";
import { Group, SettingRow, Switch } from "./settings-ui";

const EMAIL_KINDS: { key: keyof EmailPrefs; title: string; description: string }[] = [
  { key: "taskAssigned", title: "Tasks assigned to me", description: "When someone gives you a task." },
  { key: "taskUpdated", title: "Changes to my tasks", description: "When someone moves one of your tasks to another status." },
  { key: "eventReminder", title: "Event reminders", description: "Only when Team Task isn't open, so you don't get both." },
  { key: "memberJoined", title: "People joining my workspaces", description: "When someone accepts an invite." },
];

const hourLabel = (hour: number) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hour));

/** Settings → Notifications → Email: which updates arrive by email, and the daily summary */
function EmailSettings() {
  const { user } = useAuthContext();
  const prefs = emailPrefsOf(user);
  const update = useUpdateEmailPrefs();
  const test = useMutation({
    mutationFn: sendTestDigestMutationFn,
    onSuccess: ({ sent, message }) => toast({ title: sent ? `Sent to ${user?.email}` : "Summary not emailed", description: sent ? "It may take a minute to arrive." : message }),
    onError: (error) => toast({ title: "Couldn't send the summary", description: error.message, variant: "destructive" }),
  });
  const save = (changes: Partial<EmailPrefs>) =>
    update.mutate(changes, {
      onError: (error) => toast({ title: "Couldn't save", description: error.message, variant: "destructive" }),
    });

  return (
    <>
      <Group
        title="Email"
        description="Updates you haven't seen after 10 minutes are emailed to you, grouped into one message. Read them in the app and no email is sent."
      >
        <div className="divide-y">
          {EMAIL_KINDS.map(({ key, title, description }) => (
            <SettingRow key={key} title={title} description={description}>
              <Switch checked={!!prefs[key]} onChange={(value) => save({ [key]: value })} label={title} />
            </SettingRow>
          ))}
        </div>
      </Group>
      <Group title="Daily summary" description="One email each morning with what's due, what's overdue and what's on your calendar. Skipped on days with nothing in it.">
        <div className="divide-y">
          <SettingRow title="Send me a daily summary">
            <Switch checked={prefs.digest} onChange={(value) => save({ digest: value })} label="Daily summary" />
          </SettingRow>
          {prefs.digest && (
            <SettingRow title="Arrives at" description={`Your time zone: ${prefs.timeZone === "UTC" ? browserTimeZone() : prefs.timeZone}`}>
              <Select value={String(prefs.digestHour)} onValueChange={(value) => save({ digestHour: Number(value) })}>
                <SelectTrigger className="h-8 w-[120px]" aria-label="Time the summary arrives">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {hourLabel(hour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          )}
          <SettingRow title="Send me today's summary now" description={`To ${user?.email ?? "your email"}, so you can see what it looks like.`}>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Send
            </Button>
          </SettingRow>
        </div>
      </Group>
    </>
  );
}

/** Settings → Notifications: desktop alerts for reminders and messages */
export default function NotificationsSection() {
  const supported = typeof Notification !== "undefined";
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : "denied");

  const test = () => {
    if (permission === "granted") {
      new Notification("Team Task", { body: "Desktop alerts are working. Reminders will look like this." });
    }
    toast({ title: "⏰ Test reminder", description: "Starts in 10 min · this is how event reminders appear in the app" });
  };

  return (
    <div>
      <div className="pb-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose how Team Task gets your attention: on this device, by email, or both.</p>
      </div>
      <Group title="Desktop alerts">
        <div className="divide-y">
          <SettingRow
            title="Alerts on this device"
            description={
              !supported
                ? "This browser doesn't support desktop alerts."
                : permission === "granted"
                  ? "On. Event reminders show up even when Team Task is in another tab."
                  : permission === "denied"
                    ? "Blocked in your browser. Allow notifications for this site in the browser's site settings."
                    : "Get event reminders even when Team Task is in another tab."
            }
          >
            {supported && permission === "default" && (
              <Button size="sm" className="h-8" onClick={() => Notification.requestPermission().then(setPermission)}>
                Turn on
              </Button>
            )}
            {permission === "granted" && <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">On</span>}
          </SettingRow>
          <SettingRow title="Send a test" description="See what a reminder looks like.">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={test}>
              <BellRing className="h-3.5 w-3.5" /> Test
            </Button>
          </SettingRow>
        </div>
      </Group>
      <EmailSettings />
      <Group title="In the app">
        <p className="text-sm text-muted-foreground">
          Task assignments, mentions and event reminders appear under the bell at the top right, with a short pop-up when they arrive. Set a reminder for each event
          when you create it (10 minutes before by default).
        </p>
      </Group>
    </div>
  );
}

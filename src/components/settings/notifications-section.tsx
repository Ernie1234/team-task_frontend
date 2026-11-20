import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Group, SettingRow } from "./settings-ui";

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
        <p className="mt-1 text-sm text-muted-foreground">Choose how Team Task gets your attention.</p>
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
      <Group title="In the app">
        <p className="text-sm text-muted-foreground">
          Task assignments, mentions and event reminders appear under the bell at the top right, with a short pop-up when they arrive. Set a reminder for each event
          when you create it (10 minutes before by default).
        </p>
      </Group>
    </div>
  );
}

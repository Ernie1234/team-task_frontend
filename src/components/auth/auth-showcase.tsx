import { Bell, CheckCircle2, Circle, MessageSquare } from "lucide-react";

/** Right-hand panel on the sign-in and sign-up pages: the desk photo with a peek at the app */
const AuthShowcase = () => (
  <div className="relative hidden overflow-hidden bg-muted lg:block" aria-hidden="true">
    <img
      src="/images/workspace-auth.webp"
      alt=""
      className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.45]"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

    <div className="absolute left-10 top-12 flex w-72 flex-col gap-3 text-sm">
      {/* A task */}
      <div className="rounded-xl border border-white/40 bg-background/85 p-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Website relaunch</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">In progress</span>
        </div>
        <p className="font-medium text-foreground">Ship the new pricing page</p>
        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-primary" />
            <span className="line-through">Copy review</span>
          </li>
          <li className="flex items-center gap-2">
            <Circle className="size-3.5" />
            Final design QA
          </li>
        </ul>
      </div>

      {/* A chat message */}
      <div className="ml-10 flex items-start gap-2.5 rounded-xl border border-white/40 bg-background/85 p-3 shadow-lg backdrop-blur-md">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          AO
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="size-3" /> #design
          </p>
          <p className="text-foreground">Pushed the last fixes. Ready for review?</p>
        </div>
      </div>

      {/* A calendar reminder */}
      <div className="flex items-center gap-2.5 rounded-xl border border-white/40 bg-background/85 px-3 py-2.5 shadow-lg backdrop-blur-md">
        <Bell className="size-4 text-primary" />
        <span className="text-foreground">Team standup</span>
        <span className="ml-auto text-xs text-muted-foreground">in 10 min</span>
      </div>
    </div>

    <div className="absolute inset-x-10 bottom-12 text-white">
      <p className="max-w-md text-2xl font-semibold leading-snug">Tasks, chat, notes and your calendar in one workspace.</p>
      <p className="mt-2 text-sm text-white/75">Sign in once and stay signed in for 30 days.</p>
    </div>
  </div>
);

export default AuthShowcase;

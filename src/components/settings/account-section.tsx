import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Camera, Check, Copy, Laptop, Loader2, Smartphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { getAvatarFallbackText } from "@/lib/helper";
import { fileUrl } from "@/lib/chat-files";
import {
  changePasswordMutationFn,
  deleteAccountMutationFn,
  getAccountQueryFn,
  getSessionsQueryFn,
  revokeOtherSessionsMutationFn,
  revokeSessionMutationFn,
  updateProfileMutationFn,
  uploadChatFilesMutationFn,
} from "@/lib/api";
import { useAppearanceStore } from "@/hooks/use-appearance";
import { Group, SettingRow } from "./settings-ui";

const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (error as Error)?.message ?? "Something went wrong";

/** Settings → Account: profile, sign-in, devices, delete account */
export default function AccountSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["account"], queryFn: getAccountQueryFn, select: (d) => d.account });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["account"] });
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  };

  if (isLoading || !data) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="pb-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, how you sign in, and your devices.</p>
      </div>
      <Profile account={data} onSaved={refresh} />
      <Security account={data} onSaved={refresh} />
      <Devices />
      <Group title="User ID">
        <CopyRow value={data.userId} />
      </Group>
      <DangerZone email={data.email} />
    </div>
  );
}

function Profile({ account, onSaved }: { account: Awaited<ReturnType<typeof getAccountQueryFn>>["account"]; onSaved: () => void }) {
  const [name, setName] = useState(account.name);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => setName(account.name), [account.name]);

  const save = useMutation({
    mutationFn: updateProfileMutationFn,
    onSuccess: () => {
      onSaved();
      toast({ title: "Profile updated" });
    },
    onError: (error) => toast({ title: "Couldn't update your profile", description: errorMessage(error), variant: "destructive" }),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const [attachment] = await uploadChatFilesMutationFn([file]);
      return updateProfileMutationFn({ profilePicture: fileUrl(attachment.url) });
    },
    onSuccess: () => {
      onSaved();
      toast({ title: "Photo updated" });
    },
    onError: (error) => toast({ title: "Couldn't upload the photo", description: errorMessage(error), variant: "destructive" }),
  });

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) return setName(account.name);
    if (trimmed !== account.name) save.mutate({ name: trimmed });
  };

  return (
    <Group title="Profile">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Change photo"
        >
          <Avatar className="h-20 w-20">
            <AvatarImage src={account.profilePicture ?? ""} alt="" className="object-cover" />
            <AvatarFallback className="bg-primary/15 text-2xl font-semibold text-primary">{getAvatarFallbackText(account.name)}</AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
            {upload.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) return toast({ title: "Pick an image under 5 MB", variant: "destructive" });
            upload.mutate(file);
          }}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="profile-name" className="text-xs text-muted-foreground">
            Preferred name
          </label>
          <Input
            id="profile-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="h-9 max-w-sm"
          />
          <div className="flex gap-3 text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => fileInput.current?.click()}>
              {account.profilePicture ? "Change photo" : "Add a photo"}
            </button>
            {account.profilePicture && (
              <button type="button" className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => save.mutate({ profilePicture: null })}>
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>
    </Group>
  );
}

function Security({ account, onSaved }: { account: Awaited<ReturnType<typeof getAccountQueryFn>>["account"]; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useMutation({
    mutationFn: changePasswordMutationFn,
    onSuccess: () => {
      onSaved();
      setEditing(false);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast({ title: account.hasPassword ? "Password changed" : "Password set", description: "You can now sign in with your email and password." });
    },
    onError: (error) => toast({ title: "Couldn't save your password", description: errorMessage(error), variant: "destructive" }),
  });
  const mismatch = confirm.length > 0 && confirm !== next;
  const google = account.providers.includes("GOOGLE");

  return (
    <Group title="Sign-in & security">
      <div className="divide-y">
        <SettingRow
          title="Email"
          description={
            <>
              {account.email}
              {google && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Google</span>}
            </>
          }
        />
        <SettingRow
          title="Password"
          description={account.hasPassword ? "Sign in with your email and password" : "You sign in with Google. Add a password to also sign in with your email."}
        >
          {!editing && (
            <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>
              {account.hasPassword ? "Change password" : "Add password"}
            </Button>
          )}
        </SettingRow>
        {editing && (
          <form
            className="grid max-w-sm gap-2 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (mismatch) return;
              change.mutate({ currentPassword: account.hasPassword ? current : undefined, newPassword: next });
            }}
          >
            {account.hasPassword && (
              <Input type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-9" required />
            )}
            <Input type="password" autoComplete="new-password" placeholder="New password (8+ characters, with a number)" value={next} onChange={(e) => setNext(e.target.value)} className="h-9" minLength={8} required />
            <Input type="password" autoComplete="new-password" placeholder="Repeat new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-9" required />
            {mismatch && <p className="text-xs text-destructive">The passwords don't match</p>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" className="h-8" disabled={change.isPending || mismatch}>
                {change.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save password"}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </Group>
  );
}

function Devices() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ["sessions"], queryFn: getSessionsQueryFn, select: (d) => d.sessions });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sessions"] });
  const revoke = useMutation({
    mutationFn: revokeSessionMutationFn,
    onSuccess: () => {
      refresh();
      toast({ title: "Logged out of that device" });
    },
    onError: (error) => toast({ title: "Couldn't log out that device", description: errorMessage(error), variant: "destructive" }),
  });
  const revokeAll = useMutation({
    mutationFn: revokeOtherSessionsMutationFn,
    onSuccess: (res) => {
      refresh();
      toast({ title: res.message });
    },
    onError: (error) => toast({ title: "Couldn't log out other devices", description: errorMessage(error), variant: "destructive" }),
  });
  const others = sessions.filter((s) => !s.current).length;

  return (
    <Group
      title="Devices"
      description="Where you're signed in."
      action={
        <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" disabled={!others || revokeAll.isPending} onClick={() => revokeAll.mutate()}>
          Log out of all other devices
        </Button>
      }
    >
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_120px_110px_80px] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Device</span>
          <span>Last active</span>
          <span>IP address</span>
          <span />
        </div>
        {isLoading && <div className="px-4 py-4 text-sm text-muted-foreground">Loading…</div>}
        {sessions.map((s) => {
          const Icon = s.os === "iOS" || s.os === "Android" ? Smartphone : Laptop;
          return (
            <div key={s._id} className="grid grid-cols-[1fr_120px_110px_80px] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate">
                    {s.os}
                    {s.browser && ` · ${s.browser}`}
                  </span>
                  {s.current && <span className="block text-xs text-primary">This device</span>}
                </span>
              </span>
              <span className="text-muted-foreground">{s.current ? "Now" : formatDistanceToNow(new Date(s.lastActiveAt), { addSuffix: true })}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">{s.ip.replace(/^::ffff:/, "") || "—"}</span>
              <span className="text-right">
                {!s.current && (
                  <Button variant="outline" size="sm" className="h-7" disabled={revoke.isPending} onClick={() => revoke.mutate(s._id)}>
                    Log out
                  </Button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Group>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
      <code className="truncate font-mono text-sm">{value}</code>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5"
        onClick={() =>
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function DangerZone({ email }: { email: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const close = useAppearanceStore((s) => s.setPreferencesOpen);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const remove = useMutation({
    mutationFn: () => deleteAccountMutationFn(typed.trim().toLowerCase()),
    onSuccess: () => {
      close(false);
      queryClient.clear();
      navigate("/", { replace: true });
      toast({ title: "Your account was deleted" });
    },
    onError: (error) => toast({ title: "Couldn't delete your account", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <Group title="Delete account">
      <SettingRow
        title="Delete my account"
        description="Permanently removes your account, private notes and calendar. Workspaces only you are in are deleted too. Your messages stay, shown as from a deleted user."
      >
        <Button variant="outline" size="sm" className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </SettingRow>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>This can't be undone. Type your email to confirm.</DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={email} autoComplete="off" className="h-9" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={typed.trim().toLowerCase() !== email.toLowerCase() || remove.isPending} onClick={() => remove.mutate()}>
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Group>
  );
}

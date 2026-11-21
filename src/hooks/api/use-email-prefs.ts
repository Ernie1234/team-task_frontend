import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEmailPrefsMutationFn } from "@/lib/api";
import { DEFAULT_EMAIL_PREFS, type CurrentUserResponseType, type EmailPrefs, type UserType } from "@/types/api.type";

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const emailPrefsOf = (user?: UserType) => ({ ...DEFAULT_EMAIL_PREFS, ...(user?.emailPrefs ?? {}) });

/** Saves email settings; the switch moves at once and moves back if saving fails */
export function useUpdateEmailPrefs() {
  const queryClient = useQueryClient();
  const setPrefs = (prefs: Partial<EmailPrefs>) =>
    queryClient.setQueryData<CurrentUserResponseType>(["authUser"], (old) =>
      old ? { ...old, user: { ...old.user, emailPrefs: { ...old.user.emailPrefs, ...prefs } } } : old
    );
  return useMutation({
    mutationFn: updateEmailPrefsMutationFn,
    onMutate: (changes) => {
      const previous = queryClient.getQueryData<CurrentUserResponseType>(["authUser"])?.user.emailPrefs;
      setPrefs(changes);
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context) setPrefs(context.previous ?? {});
    },
    onSuccess: ({ emailPrefs }) => setPrefs(emailPrefs),
  });
}

/** The daily summary goes out in the morning of wherever the person is */
export function useTimeZoneSync(user?: UserType) {
  const { mutate } = useUpdateEmailPrefs();
  const synced = useRef<string | null>(null);
  useEffect(() => {
    if (!user?._id) return;
    const zone = browserTimeZone();
    if (synced.current === zone || emailPrefsOf(user).timeZone === zone) return;
    synced.current = zone;
    mutate({ timeZone: zone });
  }, [user, mutate]);
}

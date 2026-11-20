import { create } from "zustand";
import type { CalendarEventType } from "@/types/api.type";

export type EventDraft = Partial<Pick<CalendarEventType, "title" | "start" | "end" | "allDay">>;

/** One event editor for the whole app (sidebar, calendar page, reminders) */
const useEventDialog = create<{
  open: boolean;
  event: CalendarEventType | null;
  draft: EventDraft | null;
  openNew: (draft?: EventDraft) => void;
  openEvent: (event: CalendarEventType) => void;
  close: () => void;
}>((set) => ({
  open: false,
  event: null,
  draft: null,
  openNew: (draft) => set({ open: true, event: null, draft: draft ?? {} }),
  openEvent: (event) => set({ open: true, event, draft: null }),
  close: () => set({ open: false }),
}));

export default useEventDialog;

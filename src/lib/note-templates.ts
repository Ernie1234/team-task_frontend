import type { PartialBlock } from "@blocknote/core";
import { format } from "date-fns";

export type NoteTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string | null;
  title: string;
  blocks: () => PartialBlock[];
};

const h = (text: string, level: 1 | 2 | 3 = 2): PartialBlock => ({ type: "heading", props: { level }, content: text });
const p = (text = ""): PartialBlock => ({ type: "paragraph", content: text });
const todo = (text: string, checked = false): PartialBlock => ({ type: "checkListItem", props: { checked }, content: text });
const bullet = (text: string): PartialBlock => ({ type: "bulletListItem", content: text });
const num = (text: string): PartialBlock => ({ type: "numberedListItem", content: text });

/** Starting points offered on the Notes home screen */
export const NOTE_TEMPLATES: NoteTemplate[] = [
  { id: "blank", name: "Blank page", description: "Start from nothing", emoji: null, title: "", blocks: () => [] },
  {
    id: "meeting",
    name: "Meeting notes",
    description: "Agenda, notes and action items",
    emoji: "🗓️",
    title: `Meeting · ${format(new Date(), "MMM d")}`,
    blocks: () => [h("Attendees"), bullet(""), h("Agenda"), num(""), h("Notes"), p(), h("Action items"), todo("")],
  },
  {
    id: "todo",
    name: "To-do list",
    description: "A simple checklist",
    emoji: "✅",
    title: "To-do",
    blocks: () => [todo("Wake up and plan the day"), todo("Review open tasks"), todo("")],
  },
  {
    id: "brief",
    name: "Project brief",
    description: "Goal, scope and timeline",
    emoji: "🎯",
    title: "Project brief",
    blocks: () => [
      h("Goal"),
      p("What does success look like?"),
      h("Scope"),
      bullet("In scope: "),
      bullet("Out of scope: "),
      h("Timeline"),
      num("Kick-off — "),
      num("First review — "),
      num("Launch — "),
      h("Open questions"),
      todo(""),
    ],
  },
  {
    id: "journal",
    name: "Daily journal",
    description: "Reflect on the day",
    emoji: "📓",
    title: format(new Date(), "EEEE, MMMM d"),
    blocks: () => [h("What went well", 3), p(), h("What I learned", 3), p(), h("Tomorrow", 3), todo("")],
  },
];

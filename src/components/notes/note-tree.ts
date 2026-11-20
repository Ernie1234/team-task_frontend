import type { NoteSummaryType } from "@/types/api.type";

export const noteTitle = (note: Pick<NoteSummaryType, "title">) => note.title.trim() || "Untitled";

/** Children by parent id; a note whose parent isn't visible to you is shown at the top level */
export function buildTree(notes: NoteSummaryType[]) {
  const ids = new Set(notes.map((n) => n._id));
  const children = new Map<string, NoteSummaryType[]>();
  const roots: NoteSummaryType[] = [];
  const byTitle = (a: NoteSummaryType, b: NoteSummaryType) => noteTitle(a).localeCompare(noteTitle(b));
  for (const note of notes) {
    if (note.parentNote && ids.has(note.parentNote)) {
      const list = children.get(note.parentNote) ?? [];
      list.push(note);
      children.set(note.parentNote, list);
    } else {
      roots.push(note);
    }
  }
  children.forEach((list) => list.sort(byTitle));
  roots.sort(byTitle);
  return { roots, children };
}

/** The pages above a note, top first */
export function ancestorsOf(noteId: string, notes: NoteSummaryType[]) {
  const byId = new Map(notes.map((n) => [n._id, n]));
  const chain: NoteSummaryType[] = [];
  let current = byId.get(noteId)?.parentNote;
  while (current && byId.has(current) && chain.length < 20) {
    const parent = byId.get(current)!;
    chain.unshift(parent);
    current = parent.parentNote;
  }
  return chain;
}

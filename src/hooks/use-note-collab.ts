import { useEffect, useState, useSyncExternalStore } from "react";
import * as Y from "yjs";
import { NoteCollabProvider, type CollabStatus } from "@/lib/note-collab";

/** The fragment name BlockNote's collaboration uses */
export const NOTE_FRAGMENT = "document-store";

export type NotePeer = { clientId: number; name: string; color: string };

/** Turns a note's saved blocks into the first version of its shared document */
const seedFromBlocks = async (blocks: unknown[]) => {
  const [{ BlockNoteEditor }, { blocksToYDoc }] = await Promise.all([import("@blocknote/core"), import("@blocknote/core/yjs")]);
  const editor = BlockNoteEditor.create();
  const content = blocks.length ? blocks : [{ type: "paragraph" }];
  const doc = blocksToYDoc(editor, content as never, NOTE_FRAGMENT);
  const update = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return update;
};

const noop = () => () => {};

/** Opens a note for live editing; one provider per open note */
export function useNoteCollab(workspaceId: string, noteId: string, savedBlocks: unknown[]) {
  const [provider, setProvider] = useState<NoteCollabProvider | null>(null);

  useEffect(() => {
    const instance = new NoteCollabProvider(workspaceId, noteId, () => seedFromBlocks(savedBlocks));
    setProvider(instance);
    return () => instance.destroy();
    // savedBlocks only matter for the first conversion of an older note
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, noteId]);

  const status: CollabStatus = useSyncExternalStore(provider?.subscribe ?? noop, () => provider?.getStatus() ?? "connecting");
  const peers = useNotePeers(provider);
  return { provider, status, closedReason: provider?.closedReason ?? null, peers };
}

/** Other people on the page right now (from their cursors) */
function useNotePeers(provider: NoteCollabProvider | null) {
  const [peers, setPeers] = useState<NotePeer[]>([]);
  useEffect(() => {
    if (!provider) return;
    const { awareness, doc } = provider;
    let lastKey = "";
    const read = () => {
      const seen = new Set<string>();
      const list: NotePeer[] = [];
      awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: { name?: string; color?: string } }).user;
        if (clientId === doc.clientID || !user?.name) return;
        const key = `${user.name}|${user.color}`; // one avatar per person, even with several tabs
        if (seen.has(key)) return;
        seen.add(key);
        list.push({ clientId, name: user.name, color: user.color ?? "#7c3aed" });
      });
      // Cursor moves fire constantly; only re-render when the people change
      const key = list.map((p) => `${p.clientId}:${p.name}:${p.color}`).join(",");
      if (key === lastKey) return;
      lastKey = key;
      setPeers(list);
    };
    // The editor sets my own cursor while it renders; read after that render
    const onChange = () => queueMicrotask(read);
    read();
    awareness.on("change", onChange);
    return () => awareness.off("change", onChange);
  }, [provider]);
  return peers;
}

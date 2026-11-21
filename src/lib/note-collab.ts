import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import socketService from "@/lib/socket";

/*
 * Connects one note's shared Yjs document to the server over the app's
 * Socket.IO connection (see the backend's note-collab-service.ts).
 *
 *  connecting → ready         the server sent the document; editing is live
 *  connecting → seeding       first to open an older note: convert it, then ready
 *  ready      → offline       connection lost: keep editing, changes merge on reconnect
 *  any        → closed        the note was deleted or made private
 */

export type CollabStatus = "connecting" | "seeding" | "ready" | "offline" | "closed";
export type ClosedReason = "deleted" | "private" | "unavailable";

type Bytes = ArrayBuffer | Uint8Array;
type ReadyPayload = { update: Bytes; stateVector: Bytes; awareness: Bytes | null };
type JoinResponse = ({ status: "ready" } & ReadyPayload) | { status: "seed" } | { status: "wait" };

const bytes = (data: Bytes) => (data instanceof Uint8Array ? data : new Uint8Array(data));
const WAIT_RETRY_MS = 6000;
const ERROR_RETRY_MS = 3000;

export class NoteCollabProvider {
  readonly doc = new Y.Doc();
  readonly awareness = new awarenessProtocol.Awareness(this.doc);
  status: CollabStatus = "connecting";
  closedReason: ClosedReason | null = null;

  private listeners = new Set<() => void>();
  private cleanups: (() => void)[] = [];
  private synced = false;
  private joining = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;

  constructor(
    private readonly workspaceId: string,
    private readonly noteId: string,
    /** Builds the first version of the shared document from the note's saved blocks */
    private readonly createSeed: () => Promise<Uint8Array>
  ) {
    this.doc.on("update", this.onLocalUpdate);
    this.awareness.on("update", this.onLocalAwareness);

    const mine = (data: { noteId?: string }) => data?.noteId === this.noteId;
    this.cleanups.push(
      socketService.on("note:update", (data) => mine(data) && Y.applyUpdate(this.doc, bytes(data.update), this)),
      socketService.on("note:awareness", (data) => mine(data) && awarenessProtocol.applyAwarenessUpdate(this.awareness, bytes(data.update), this)),
      socketService.on("note:ready", (data) => mine(data) && !this.synced && this.becomeReady(data)),
      socketService.on("note:reseed", (data) => mine(data) && !this.synced && void this.join()),
      socketService.on("note:resync", (data) => mine(data) && void this.join()),
      socketService.on("note:closed", (data) => mine(data) && this.close(data.reason === "deleted" ? "deleted" : "private")),
      socketService.on("connection:status", ({ connected }) => {
        if (connected) void this.join();
        else if (this.status !== "closed") this.setStatus(this.synced ? "offline" : "connecting");
      })
    );
    window.addEventListener("beforeunload", this.removeMyCursor);
    void this.join();
  }

  /** For useSyncExternalStore */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getStatus = () => this.status;

  private setStatus(status: CollabStatus) {
    if (this.status === status) return;
    this.status = status;
    this.listeners.forEach((l) => l());
  }

  private onLocalUpdate = (update: Uint8Array, origin: unknown) => {
    // Remote and seed updates already exist on the server
    if (origin === this || !this.synced) return;
    socketService.noteSend("note:update", { noteId: this.noteId, update });
  };

  private onLocalAwareness = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return;
    const changed = [...added, ...updated, ...removed];
    socketService.noteSend("note:awareness", {
      noteId: this.noteId,
      update: awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
    });
  };

  private becomeReady({ update, stateVector, awareness }: ReadyPayload) {
    Y.applyUpdate(this.doc, bytes(update), this);
    if (awareness) awarenessProtocol.applyAwarenessUpdate(this.awareness, bytes(awareness), this);
    if (this.synced) {
      // Back after a dropped connection: send what was typed while offline
      const missing = Y.encodeStateAsUpdate(this.doc, bytes(stateVector));
      if (missing.byteLength > 2) socketService.noteSend("note:update", { noteId: this.noteId, update: missing });
    }
    this.synced = true;
    // Show my cursor to the others again
    if (this.awareness.getLocalState()) {
      socketService.noteSend("note:awareness", {
        noteId: this.noteId,
        update: awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]),
      });
    }
    this.setStatus("ready");
  }

  private async join() {
    if (this.destroyed || this.joining || this.status === "closed") return;
    clearTimeout(this.retryTimer);
    if (!socketService.isConnected()) {
      this.setStatus(this.synced ? "offline" : "connecting");
      return; // connection:status will call join() again
    }
    this.joining = true;
    try {
      const res = await socketService.noteRequest<JoinResponse>("note:join", { workspaceId: this.workspaceId, noteId: this.noteId });
      if (this.destroyed) return;
      if (res.status === "ready") this.becomeReady(res);
      else if (res.status === "seed") await this.seed();
      else this.retryTimer = setTimeout(() => void this.join(), WAIT_RETRY_MS); // someone else is converting it
    } catch (error) {
      if (this.destroyed) return;
      if (/not found|access/i.test((error as Error).message)) this.close("unavailable");
      else this.retryTimer = setTimeout(() => void this.join(), ERROR_RETRY_MS);
    } finally {
      this.joining = false;
    }
  }

  private async seed() {
    this.setStatus("seeding");
    const update = await this.createSeed();
    const res = await socketService.noteRequest<{ status: "ready" } & ReadyPayload>("note:seed", { noteId: this.noteId, update });
    if (!this.destroyed) this.becomeReady(res);
  }

  private close(reason: ClosedReason) {
    this.closedReason = reason;
    this.removeMyCursor();
    this.setStatus("closed");
  }

  private removeMyCursor = () => {
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], "local");
  };

  destroy() {
    if (this.destroyed) return;
    this.removeMyCursor();
    this.destroyed = true;
    clearTimeout(this.retryTimer);
    socketService.noteSend("note:leave", { noteId: this.noteId });
    this.cleanups.forEach((off) => off());
    window.removeEventListener("beforeunload", this.removeMyCursor);
    this.awareness.destroy();
    this.doc.destroy();
  }
}

/** A stable colour per person, for their cursor and avatar */
const CURSOR_COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#ca8a04", "#ea580c", "#dc2626", "#db2777"];
export const cursorColor = (userId: string) => {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

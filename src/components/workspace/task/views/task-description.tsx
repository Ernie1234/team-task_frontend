import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const RichEditor = lazy(() => import("@/components/editor/rich-editor"));

/**
 * ClickUp-style description: a rich editor (type "/" for blocks, select text to format,
 * Markdown shortcuts). Stored as Markdown, so older plain-text descriptions still work.
 */
export default function TaskDescription({
  value,
  onSave,
  editable = true,
}: {
  value: string | null | undefined;
  onSave: (markdown: string | null) => void;
  editable?: boolean;
}) {
  const saved = useRef((value ?? "").trim());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef<BlockNoteEditor | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [focused, setFocused] = useState(false);

  const commit = useCallback(() => {
    clearTimeout(timer.current);
    const editor = latest.current;
    if (!editor) return;
    const markdown = editor.blocksToMarkdownLossy(editor.document).trim();
    if (markdown === saved.current) {
      setStatus((s) => (s === "saving" ? "saved" : s));
      return;
    }
    saved.current = markdown;
    onSave(markdown || null);
    setStatus("saved");
  }, [onSave]);

  // Save anything pending when the task closes
  useEffect(() => () => commit(), [commit]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold">Description</h4>
        {status === "saving" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
        {status === "saved" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
          Type <kbd className="rounded border bg-muted px-1 font-mono">/</kbd> for headings, lists, to-dos and more
        </span>
      </div>
      <div
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setFocused(false);
            commit();
          }
        }}
        className={cn(
          "rounded-xl border transition-colors",
          focused ? "border-primary/40 bg-background shadow-sm" : "bg-muted/20 hover:bg-muted/40"
        )}
      >
        <Suspense fallback={<div className="space-y-2 p-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>}>
          <RichEditor
            compact
            editable={editable}
            initialMarkdown={value}
            placeholder="Add details, links or acceptance criteria… Type '/' for commands"
            editorRef={(editor) => (latest.current = editor)}
            onChange={() => {
              setStatus("saving");
              clearTimeout(timer.current);
              timer.current = setTimeout(commit, 1200);
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

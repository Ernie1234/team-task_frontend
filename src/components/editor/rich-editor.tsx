import { useEffect, useRef } from "react";
import "@blocknote/mantine/style.css";
import "./editor.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { en } from "@blocknote/core/locales";
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { CollaborationExtension, type CollaborationOptions } from "@blocknote/core/yjs";
import { cn } from "@/lib/utils";
import { useResolvedMode } from "@/hooks/use-appearance";
import { uploadChatFilesMutationFn } from "@/lib/api";
import { fileUrl } from "@/lib/chat-files";


type RichEditorProps = {
  /** Editor JSON (notes) */
  initialBlocks?: PartialBlock[];
  /** Markdown (task descriptions); ignored when initialBlocks is set */
  initialMarkdown?: string | null;
  /** remote = the change came only from other people (live editing) */
  onChange?: (editor: BlockNoteEditor, info: { remote: boolean }) => void;
  onBlur?: (editor: BlockNoteEditor) => void;
  editable?: boolean;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** Lets the page put the cursor in the document (e.g. Enter in the title) */
  editorRef?: (editor: BlockNoteEditor | null) => void;
  /** Live editing: the shared document, the connection (for cursors) and who I am */
  collaboration?: Pick<CollaborationOptions, "fragment" | "provider" | "user">;
};

// Images and files dropped or pasted into a document use the same storage as chat attachments
const uploadFile = async (file: File) => {
  const [attachment] = await uploadChatFilesMutationFn([file]);
  return fileUrl(attachment.url);
};

/**
 * Notion-style block editor: type "/" for blocks, select text for formatting,
 * Markdown shortcuts (#, -, [], >, ```, **bold**), drag handles to reorder.
 */
export default function RichEditor({
  initialBlocks,
  initialMarkdown,
  onChange,
  onBlur,
  editable = true,
  placeholder = "Type '/' for commands, or just start writing",
  compact,
  autoFocus,
  className,
  editorRef,
  collaboration,
}: RichEditorProps) {
  const mode = useResolvedMode();
  const ready = useRef(false);

  const editor = useCreateBlockNote({
    // With live editing the content comes from the shared document instead
    initialContent: !collaboration && initialBlocks?.length ? initialBlocks : undefined,
    extensions: collaboration ? [CollaborationExtension({ ...collaboration, showCursorLabels: "activity" })] : undefined,
    uploadFile,
    dictionary: { ...en, placeholders: { ...en.placeholders, emptyDocument: placeholder, default: compact ? "Type '/' for commands" : placeholder } },
    animations: true,
  });

  // Markdown is converted after creation (BlockNote's parser runs on the editor)
  useEffect(() => {
    if (!collaboration && !initialBlocks?.length && initialMarkdown?.trim()) {
      const blocks = editor.tryParseMarkdownToBlocks(initialMarkdown);
      editor.replaceBlocks(editor.document, blocks);
    }
    ready.current = true;
    editorRef?.(editor);
    if (autoFocus) editor.focus();
    return () => editorRef?.(null);
    // Only on mount: later prop changes must not reset what the user is typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={mode}
      onChange={(_editor, { getChanges }) => {
        if (!ready.current) return;
        const changes = getChanges();
        const remote = changes.length > 0 && changes.every((change) => change.source.type === "yjs-remote");
        onChange?.(editor, { remote });
      }}
      onBlur={() => onBlur?.(editor)}
      className={cn("tt-editor", compact && "tt-editor-compact", className)}
    />
  );
}

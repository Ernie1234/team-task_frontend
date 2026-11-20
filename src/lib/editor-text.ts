import type { Block } from "@blocknote/core";

/** Plain text of a document, for previews and search */
export function blocksToPlainText(blocks: Block[], limit = 300): string {
  const parts: string[] = [];
  const walk = (list: Block[]) => {
    for (const block of list) {
      if (parts.join(" ").length > limit) return;
      const content = (block as { content?: unknown }).content;
      if (Array.isArray(content)) {
        const text = content
          .map((item: { type?: string; text?: string; content?: { text?: string }[] }) =>
            item.type === "text" ? item.text ?? "" : item.type === "link" ? (item.content ?? []).map((c) => c.text ?? "").join("") : ""
          )
          .join("")
          .trim();
        if (text) parts.push(text);
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(blocks);
  return parts.join(" ").replace(/\s+/g, " ").slice(0, limit);
}

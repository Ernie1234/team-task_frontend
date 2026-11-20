import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useResolvedMode } from "@/hooks/use-appearance";
import type { ReactNode } from "react";

const RANDOM = ["📝", "💡", "📚", "🎯", "🚀", "🧠", "📌", "🌱", "🗂️", "✨", "🧪", "📈", "🎨", "🛠️", "☕"];

/** Emoji picker for a page icon */
export default function IconPicker({ children, onSelect, hasIcon }: { children: ReactNode; onSelect: (emoji: string | null) => void; hasIcon: boolean }) {
  const mode = useResolvedMode();
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-auto overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
          <span className="px-1 text-xs font-medium text-muted-foreground">Page icon</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSelect(RANDOM[Math.floor(Math.random() * RANDOM.length)])}>
              Random
            </Button>
            {hasIcon && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onSelect(null)}>
                Remove
              </Button>
            )}
          </div>
        </div>
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
          theme={mode}
          previewPosition="none"
          skinTonePosition="none"
          navPosition="top"
          perLine={8}
          emojiSize={22}
          maxFrequentRows={1}
        />
      </PopoverContent>
    </Popover>
  );
}

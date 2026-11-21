import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuthContext } from "@/context/auth-provider";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useTourStore } from "@/hooks/use-tour";
import { updateTourMutationFn } from "@/lib/api";
import type { CurrentUserResponseType } from "@/types/api.type";
import { cn } from "@/lib/utils";
import { TOUR_STEPS, type TourStep } from "./tour-steps";

const CARD_WIDTH = 320;
const GAP = 14; // space between the highlight and the card
const PAD = 6; // space around the highlighted element
const EDGE = 12; // keep the card this far from the window edge

type Rect = { top: number; left: number; width: number; height: number };

const findTarget = (step: TourStep) => {
  if (!step.target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Hidden (collapsed sidebar, closed mobile sheet): fall back to a centred card
  if (r.width < 4 || r.height < 4) return null;
  return el;
};

const sameRect = (a: Rect | null | undefined, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/** Places the card beside the highlight on the preferred side, falling back to whichever side fits */
const placeCard = (target: Rect, cardHeight: number, preferred: TourStep["side"] = "right") => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - CARD_WIDTH - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - cardHeight - EDGE);
  const fits = {
    right: target.left + target.width + GAP + CARD_WIDTH <= vw - EDGE,
    left: target.left - GAP - CARD_WIDTH >= EDGE,
    bottom: target.top + target.height + GAP + cardHeight <= vh - EDGE,
    top: target.top - GAP - cardHeight >= EDGE,
  };
  const order = [preferred, "right", "bottom", "top", "left"] as const;
  const side = order.find((s) => s && fits[s]) ?? "bottom";
  switch (side) {
    case "right":
      return { left: target.left + target.width + GAP, top: clampY(target.top + target.height / 2 - 40) };
    case "left":
      return { left: target.left - GAP - CARD_WIDTH, top: clampY(target.top + target.height / 2 - 40) };
    case "top":
      return { left: clampX(target.left + target.width / 2 - CARD_WIDTH / 2), top: target.top - GAP - cardHeight };
    default:
      return { left: clampX(target.left + target.width - CARD_WIDTH), top: clampY(target.top + target.height + GAP) };
  }
};

const ProductTour = () => {
  const { open, step, start, setStep, close } = useTourStore();
  const { user } = useAuthContext();
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMobile, setOpen: setSidebarOpen } = useSidebar();
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(180);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;

  const { mutate: saveTour } = useMutation({
    mutationFn: updateTourMutationFn,
    onSuccess: ({ tour }) =>
      queryClient.setQueryData<CurrentUserResponseType>(["authUser"], (old) =>
        old ? { ...old, user: { ...old.user, tour } } : old
      ),
  });

  const finish = useCallback(
    (status: "completed" | "skipped") => {
      close();
      saveTour(status);
    },
    [close, saveTour]
  );

  // New accounts see the tour once, shortly after their workspace loads
  useEffect(() => {
    if (autoStarted.current || !workspaceId || user?.tour?.status !== "pending") return;
    autoStarted.current = true;
    const timer = setTimeout(start, 700);
    return () => clearTimeout(timer);
  }, [user?.tour?.status, workspaceId, start]);

  // The highlights point at sidebar items, so expand the sidebar on desktop
  useEffect(() => {
    if (open && !isMobile) setSidebarOpen(true);
  }, [open, isMobile, setSidebarOpen]);

  // Follow the highlighted element while it moves (sidebar opening, scrolling, resizing)
  useLayoutEffect(() => {
    if (!open || !current) return;
    findTarget(current)?.scrollIntoView({ block: "nearest" });
    let frame = 0;
    // undefined = not measured yet, so a step with no target still clears the old highlight
    let last: Rect | null | undefined = undefined;
    const measure = () => {
      const el = findTarget(current);
      const r = el?.getBoundingClientRect();
      const next = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      if (!sameRect(last, next)) {
        last = next;
        setRect(next);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [open, current]);

  const centred = rect === null;
  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [open, step, centred]);

  // Move focus to the card on each step so screen readers announce it
  useEffect(() => {
    if (open) cardRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  const next = useCallback(() => (isLast ? finish("completed") : setStep(step + 1)), [isLast, finish, setStep, step]);
  const back = useCallback(() => !isFirst && setStep(step - 1), [isFirst, setStep, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish("skipped");
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, finish]);

  if (!open || !current) return null;

  const highlight = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const cardPosition = highlight ? placeCard(highlight, cardHeight, current.side) : null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Blocks the app behind the tour; the highlight cuts a hole in the dimmed layer */}
      <div className={cn("absolute inset-0", !highlight && "bg-black/55")} onClick={() => undefined} />
      {highlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg transition-all duration-300 ease-out"
          // Outline in the theme colour, then the dimmed page around it
          style={{ ...highlight, boxShadow: "0 0 0 2px hsl(var(--primary)), 0 0 0 9999px rgb(0 0 0 / 0.55)" }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className={cn(
          "absolute rounded-xl border bg-popover p-5 text-popover-foreground shadow-2xl outline-none",
          "transition-[top,left] duration-300 ease-out",
          !cardPosition && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={{ width: CARD_WIDTH, maxWidth: `calc(100vw - ${EDGE * 2}px)`, ...(cardPosition ?? {}) }}
      >
        <button
          type="button"
          onClick={() => finish("skipped")}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close the tour"
        >
          <X className="size-4" />
        </button>

        <p className="text-xs font-medium text-primary">
          {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 pr-6 text-base font-semibold">
          {isFirst && user?.name ? `Welcome to Team Task, ${user.name.split(" ")[0]}` : current.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {current.body}
        </p>

        {/* Progress */}
        <div className="mt-4 flex gap-1" aria-hidden="true">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {isFirst ? (
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => finish("skipped")}>
              Skip tour
            </Button>
          ) : isLast ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                finish("completed");
                navigate(`/workspace/${workspaceId}/members`);
              }}
            >
              Invite your team
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="-ml-2" onClick={back}>
              Back
            </Button>
          )}
          <Button size="sm" className="ml-auto" onClick={next}>
            {isFirst ? "Show me around" : isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductTour;

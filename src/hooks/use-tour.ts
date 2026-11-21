import { create } from "zustand";

type TourStore = {
  open: boolean;
  step: number;
  start: () => void;
  setStep: (step: number) => void;
  close: () => void;
};

/** Guided tour state; started automatically for new accounts or from the account menu */
export const useTourStore = create<TourStore>()((set) => ({
  open: false,
  step: 0,
  start: () => set({ open: true, step: 0 }),
  setStep: (step) => set({ step }),
  close: () => set({ open: false, step: 0 }),
}));

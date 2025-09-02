import {
  createContext,
  useState,
  useContext,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";

interface ThemeContextType {
  theme: string;
  setTheme: Dispatch<SetStateAction<string>>;
  togglePosition: string;
  setTogglePosition: Dispatch<SetStateAction<string>>;
}

// Create the context with an initial value of `undefined`
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const getInitialTheme = () => {
    // Check for a saved theme in localStorage first
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme;
    }

    // If no theme is saved, check the system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    // Default to 'light' if no preference is found
    return "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [togglePosition, setTogglePosition] = useState(
    () => localStorage.getItem("togglePosition") || "bottom-right"
  );

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("togglePosition", togglePosition);
  }, [togglePosition]);

  const value = { theme, setTheme, togglePosition, setTogglePosition };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

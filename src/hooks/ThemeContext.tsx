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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// List of valid themes for validation
const VALID_THEMES = [
  "light",
  "dark",
  "orange",
  "blue",
  "green",
  "red",
  "purple",
];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme && VALID_THEMES.includes(savedTheme)) {
      return savedTheme;
    }

    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [togglePosition, setTogglePosition] = useState(
    () => localStorage.getItem("togglePosition") || "bottom-right"
  );

  useEffect(() => {
    // Validate theme before applying
    const validTheme = VALID_THEMES.includes(theme) ? theme : "light";
    document.body.className = validTheme;
    localStorage.setItem("theme", validTheme);
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
